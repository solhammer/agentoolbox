import type { AssetType, FinanceCheckResult } from "../types.js";
import { getCoinPrice } from "../providers/coingecko.js";
import { getBestPair } from "../providers/dexscreener.js";
import { getStockQuote } from "../providers/yahoo.js";

const DEFAULT_TIMEOUT_MS = 5000;

export interface PriceCheckInput {
  symbol?: string; // CoinGecko ID for crypto (e.g. "bitcoin") or stock ticker
  tokenAddress?: string; // Contract/mint address (crypto)
  assetType: AssetType;
  proposedPrice?: number; // Agent's claimed price (optional)
  maxAgeSeconds?: number; // Default: 60 for crypto, 3600 for stocks
  divergenceThresholdPct?: number; // Default: 2%
  timeoutMs?: number;
}

interface PriceSource {
  name: string;
  priceUsd: number;
  ageSeconds: number | null;
  available: boolean;
}

export interface PriceCheckResult extends FinanceCheckResult {
  sources: Array<{ name: string; priceUsd: number; ageSeconds: number | null; available: boolean }>;
  consensusPrice: number | null;
  proposedPriceDeviation: number | null; // pct from consensus, if proposedPrice given
}

function pctDiff(a: number, b: number): number {
  if (b === 0) return Infinity;
  return (Math.abs(a - b) / b) * 100;
}

export async function checkPrice(input: PriceCheckInput): Promise<PriceCheckResult> {
  const start = Date.now();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const divergenceThresholdPct = input.divergenceThresholdPct ?? 2;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const risks: FinanceCheckResult["risks"] = [];
  const sources: PriceSource[] = [];

  const isStock = input.assetType === "stock";
  const maxAgeSeconds = input.maxAgeSeconds ?? (isStock ? 3600 : 60);

  if (isStock) {
    if (input.symbol) {
      const quote = await getStockQuote(input.symbol);
      if (quote) {
        sources.push({
          name: "yahoo",
          priceUsd: quote.price,
          ageSeconds: Math.max(0, nowSeconds - Math.floor(quote.timestamp / 1000)),
          available: true,
        });
      } else {
        sources.push({ name: "yahoo", priceUsd: 0, ageSeconds: null, available: false });
      }
    }
  } else {
    // Crypto: CoinGecko + DexScreener
    if (input.symbol) {
      const cg = await getCoinPrice(input.symbol, timeoutMs);
      if (cg) {
        sources.push({
          name: "coingecko",
          priceUsd: cg.priceUsd,
          ageSeconds: cg.updatedAt > 0 ? Math.max(0, nowSeconds - cg.updatedAt) : null,
          available: true,
        });
      } else {
        sources.push({ name: "coingecko", priceUsd: 0, ageSeconds: null, available: false });
      }
    }
    if (input.tokenAddress) {
      const pair = await getBestPair(input.tokenAddress, timeoutMs);
      const priceUsd = pair?.priceUsd ? Number(pair.priceUsd) : NaN;
      if (pair && Number.isFinite(priceUsd)) {
        sources.push({
          name: "dexscreener",
          priceUsd,
          ageSeconds: null, // DexScreener price is effectively real-time
          available: true,
        });
      } else {
        sources.push({ name: "dexscreener", priceUsd: 0, ageSeconds: null, available: false });
      }
    }
  }

  const availableSources = sources.filter((s) => s.available);

  // Consensus = mean of available source prices.
  const consensusPrice =
    availableSources.length > 0
      ? availableSources.reduce((sum, s) => sum + s.priceUsd, 0) / availableSources.length
      : null;

  let verdict: FinanceCheckResult["verdict"] = "PASS";
  let score = 0;
  const escalate = (next: FinanceCheckResult["verdict"], nextScore: number) => {
    const rank = { PASS: 0, FLAG: 1, BLOCK: 2 } as const;
    if (rank[next] > rank[verdict]) verdict = next;
    if (nextScore > score) score = nextScore;
  };

  if (availableSources.length === 0) {
    risks.push({
      type: "no_price_source",
      severity: "critical",
      detail: "No price source was available to validate the price.",
    });
    escalate("BLOCK", 100);
  } else if (availableSources.length === 1) {
    risks.push({
      type: "single_price_source",
      severity: "warn",
      detail: `Only 1 price source available (${availableSources[0]!.name}); cross-source validation not possible.`,
    });
    escalate("FLAG", 40);
  }

  // Staleness check.
  for (const s of availableSources) {
    if (s.ageSeconds !== null && s.ageSeconds > maxAgeSeconds) {
      risks.push({
        type: "stale_price",
        severity: "critical",
        detail: `${s.name} price is ${s.ageSeconds}s old (max ${maxAgeSeconds}s).`,
      });
      escalate("BLOCK", 90);
    }
  }

  // Cross-source divergence (needs >= 2 sources).
  if (availableSources.length >= 2) {
    const prices = availableSources.map((s) => s.priceUsd);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const divergence = pctDiff(max, min);
    if (divergence > divergenceThresholdPct) {
      risks.push({
        type: "price_divergence",
        severity: "critical",
        detail: `Price sources diverge by ${divergence.toFixed(2)}% (threshold ${divergenceThresholdPct}%).`,
      });
      escalate("BLOCK", 85);
    }
  }

  // Proposed price deviation from consensus.
  let proposedPriceDeviation: number | null = null;
  if (input.proposedPrice !== undefined && consensusPrice !== null) {
    proposedPriceDeviation = pctDiff(input.proposedPrice, consensusPrice);
    if (proposedPriceDeviation > 5) {
      risks.push({
        type: "proposed_price_deviation",
        severity: "critical",
        detail: `Proposed price deviates ${proposedPriceDeviation.toFixed(2)}% from consensus (>5%). Possible hallucinated price.`,
      });
      escalate("BLOCK", 95);
    } else if (proposedPriceDeviation > 2) {
      risks.push({
        type: "proposed_price_deviation",
        severity: "warn",
        detail: `Proposed price deviates ${proposedPriceDeviation.toFixed(2)}% from consensus (2–5%).`,
      });
      escalate("FLAG", 50);
    }
  }

  return {
    verdict,
    score,
    risks,
    latencyMs: Date.now() - start,
    sources,
    consensusPrice,
    proposedPriceDeviation,
  };
}
