const DEFAULT_TIMEOUT_MS = 5000;
const BASE_URL = "https://api.dexscreener.com/latest/dex";

export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string; // string to preserve precision
  priceNative?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h1?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  pairCreatedAt?: number; // ms epoch
  fdv?: number;
  marketCap?: number;
}

interface PairsResponse {
  pairs?: DexPair[] | null;
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetch all DEX pairs for a token address. Returns an empty array on error.
 */
export async function getTokenPairs(
  address: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<DexPair[]> {
  const url = `${BASE_URL}/tokens/${encodeURIComponent(address)}`;
  const data = await fetchJson<PairsResponse>(url, timeoutMs);
  if (!data || !Array.isArray(data.pairs)) return [];
  return data.pairs;
}

/**
 * Search DexScreener for pairs matching a free-text query.
 */
export async function searchDex(
  query: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<DexPair[]> {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
  const data = await fetchJson<PairsResponse>(url, timeoutMs);
  if (!data || !Array.isArray(data.pairs)) return [];
  return data.pairs;
}

/**
 * Returns the highest-liquidity pair for a token, or null if none found.
 */
export async function getBestPair(
  address: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<DexPair | null> {
  const pairs = await getTokenPairs(address, timeoutMs);
  if (pairs.length === 0) return null;
  return pairs.reduce((best, pair) => {
    const bestLiq = best.liquidity?.usd ?? 0;
    const pairLiq = pair.liquidity?.usd ?? 0;
    return pairLiq > bestLiq ? pair : best;
  });
}
