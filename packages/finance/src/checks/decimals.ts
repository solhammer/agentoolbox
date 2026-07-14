import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import type { Chain, FinanceCheckResult } from "../types.js";
import { getBestPair } from "../providers/dexscreener.js";

const DEFAULT_TIMEOUT_MS = 5000;
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

export interface DecimalCheckInput {
  tokenAddress: string;
  rawAmount: string; // on-chain integer amount (BigInt as string)
  uiAmount: number; // human-readable amount
  chain: Chain;
  timeoutMs?: number;
}

export interface DecimalCheckResult extends FinanceCheckResult {
  authoritative_decimals: number | null;
  expected_raw: string | null;
  actual_raw: string;
  deviation_pct: number | null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]).catch(() => null);
}

/**
 * Try to read token decimals from a DexScreener pair. The public API may
 * include a `decimals` field on the matching token even though it is not part
 * of the documented schema, so we read it defensively.
 */
async function decimalsFromDexScreener(
  tokenAddress: string,
  timeoutMs: number
): Promise<number | null> {
  const pair = await getBestPair(tokenAddress, timeoutMs);
  if (!pair) return null;
  const lowered = tokenAddress.toLowerCase();
  const candidates = [pair.baseToken, pair.quoteToken];
  for (const token of candidates) {
    if (token.address.toLowerCase() !== lowered) continue;
    const decimals = (token as { decimals?: unknown }).decimals;
    if (typeof decimals === "number" && Number.isInteger(decimals)) return decimals;
  }
  return null;
}

/** Read authoritative decimals for an SPL token mint via Solana RPC. */
async function decimalsFromSolanaRpc(
  mint: string,
  timeoutMs: number
): Promise<number | null> {
  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const mintInfo = await withTimeout(getMint(connection, new PublicKey(mint)), timeoutMs);
    if (!mintInfo) return null;
    return mintInfo.decimals;
  } catch {
    return null;
  }
}

/**
 * Guards against decimal-scaling errors (the "Lobstar-class $440k" bug) by
 * comparing the caller's raw on-chain amount to the amount implied by the
 * UI amount and the token's authoritative decimals.
 */
export async function checkDecimals(input: DecimalCheckInput): Promise<DecimalCheckResult> {
  const start = Date.now();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const risks: FinanceCheckResult["risks"] = [];

  // Step 1: DexScreener (fast). Step 2: Solana RPC fallback (SPL mint).
  let decimals = await decimalsFromDexScreener(input.tokenAddress, timeoutMs);
  if (decimals === null && input.chain === "solana") {
    decimals = await decimalsFromSolanaRpc(input.tokenAddress, timeoutMs);
  }

  if (decimals === null) {
    risks.push({
      type: "decimals_unavailable",
      severity: "warn",
      detail: "Could not resolve authoritative token decimals from any source.",
    });
    return {
      verdict: "FLAG",
      score: 50,
      risks,
      latencyMs: Date.now() - start,
      authoritative_decimals: null,
      expected_raw: null,
      actual_raw: input.rawAmount,
      deviation_pct: null,
    };
  }

  const expectedRaw = BigInt(Math.round(input.uiAmount * 10 ** decimals));
  let actualRaw: bigint;
  try {
    actualRaw = BigInt(input.rawAmount);
  } catch {
    risks.push({
      type: "invalid_raw_amount",
      severity: "critical",
      detail: `rawAmount "${input.rawAmount}" is not a valid integer.`,
    });
    return {
      verdict: "BLOCK",
      score: 100,
      risks,
      latencyMs: Date.now() - start,
      authoritative_decimals: decimals,
      expected_raw: expectedRaw.toString(),
      actual_raw: input.rawAmount,
      deviation_pct: null,
    };
  }

  // deviation = abs(expected - actual) / actual, expressed as a percentage.
  let deviationPct: number;
  if (actualRaw === 0n) {
    deviationPct = expectedRaw === 0n ? 0 : Infinity;
  } else {
    const diff = expectedRaw > actualRaw ? expectedRaw - actualRaw : actualRaw - expectedRaw;
    deviationPct = (Number(diff) / Number(actualRaw < 0n ? -actualRaw : actualRaw)) * 100;
  }

  let verdict: FinanceCheckResult["verdict"];
  let score: number;
  if (deviationPct > 1) {
    verdict = "BLOCK";
    score = 100;
    risks.push({
      type: "decimal_scaling_error",
      severity: "critical",
      detail: `Raw amount deviates ${deviationPct.toFixed(2)}% from the value implied by uiAmount at ${decimals} decimals. Likely a decimal-scaling error.`,
    });
  } else if (deviationPct > 0.1) {
    verdict = "FLAG";
    score = 40;
    risks.push({
      type: "decimal_rounding",
      severity: "warn",
      detail: `Raw amount deviates ${deviationPct.toFixed(3)}% from expected — minor rounding.`,
    });
  } else {
    verdict = "PASS";
    score = 0;
  }

  return {
    verdict,
    score,
    risks,
    latencyMs: Date.now() - start,
    authoritative_decimals: decimals,
    expected_raw: expectedRaw.toString(),
    actual_raw: input.rawAmount,
    deviation_pct: Number.isFinite(deviationPct) ? deviationPct : null,
  };
}
