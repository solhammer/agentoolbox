import type { Verdict } from "../types.js";
import { searchCoin } from "../providers/coingecko.js";
import { searchDex } from "../providers/dexscreener.js";
import { searchStock } from "../providers/yahoo.js";

export interface SymbolMatch {
  symbol: string;
  name: string;
  exchange?: string;
  liquidity?: number;
}

export interface SymbolResolveInput {
  symbol: string;
  assetType: "crypto" | "stock";
  expectedName?: string;
  chain?: string;
}

export interface SymbolResolveResult {
  found: boolean;
  matches: SymbolMatch[];
  ambiguous: boolean;
  verdict: Verdict;
}

function nameMatches(candidate: string, expected: string): boolean {
  const a = candidate.toLowerCase();
  const b = expected.toLowerCase();
  return a.includes(b) || b.includes(a);
}

/**
 * Resolves a ticker symbol / token to a confirmed identity.
 *
 * For crypto, prefer resolving by address — symbols collide (USDC has 200+
 * imposters on Solana). Returns all candidate matches ranked by liquidity, plus
 * a verdict: BLOCK when nothing is found, FLAG when ambiguous or the expected
 * name does not match, PASS on a single confident match.
 */
export async function resolveSymbol(
  input: SymbolResolveInput
): Promise<SymbolResolveResult> {
  let matches: SymbolMatch[] = [];

  if (input.assetType === "crypto") {
    const [dexPairs, coins] = await Promise.all([
      searchDex(input.symbol),
      searchCoin(input.symbol),
    ]);
    const relevantPairs = input.chain
      ? dexPairs.filter((p) => p.chainId === input.chain)
      : dexPairs;
    const dexMatches: SymbolMatch[] = relevantPairs.map((p) => ({
      symbol: p.baseToken.symbol,
      name: p.baseToken.name,
      ...(p.liquidity?.usd !== undefined ? { liquidity: p.liquidity.usd } : {}),
    }));
    const coinMatches: SymbolMatch[] = coins.map((co) => ({
      symbol: co.symbol.toUpperCase(),
      name: co.name,
    }));
    matches = [...dexMatches, ...coinMatches].sort(
      (x, y) => (y.liquidity ?? 0) - (x.liquidity ?? 0)
    );
  } else {
    const results = await searchStock(input.symbol);
    matches = results.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      ...(r.exchange ? { exchange: r.exchange } : {}),
    }));
  }

  const found = matches.length > 0;
  const ambiguous = matches.length > 1;

  let verdict: Verdict;
  if (!found) {
    verdict = "BLOCK";
  } else if (
    input.expectedName !== undefined &&
    !matches.some((m) => nameMatches(m.name, input.expectedName!))
  ) {
    verdict = "FLAG";
  } else if (ambiguous) {
    verdict = "FLAG";
  } else {
    verdict = "PASS";
  }

  return { found, matches, ambiguous, verdict };
}
