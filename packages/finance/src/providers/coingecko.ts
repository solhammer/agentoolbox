const DEFAULT_TIMEOUT_MS = 5000;
const BASE_URL = "https://api.coingecko.com/api/v3";

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

interface SimplePriceResponse {
  [coinId: string]: { usd?: number; last_updated_at?: number };
}

/**
 * Fetch the current USD price for a CoinGecko coin id (e.g. "bitcoin").
 * Returns null on error or if the coin is not found.
 */
export async function getCoinPrice(
  coinId: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ priceUsd: number; updatedAt: number } | null> {
  const url = `${BASE_URL}/simple/price?ids=${encodeURIComponent(
    coinId
  )}&vs_currencies=usd&include_last_updated_at=true`;
  const data = await fetchJson<SimplePriceResponse>(url, timeoutMs);
  if (!data) return null;
  const entry = data[coinId];
  if (!entry || typeof entry.usd !== "number") return null;
  return {
    priceUsd: entry.usd,
    updatedAt: typeof entry.last_updated_at === "number" ? entry.last_updated_at : 0,
  };
}

interface SearchResponse {
  coins?: Array<{ id?: string; symbol?: string; name?: string }>;
}

/**
 * Search CoinGecko for coins matching a free-text query.
 * Returns an empty array on error.
 */
export async function searchCoin(
  query: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Array<{ id: string; symbol: string; name: string }>> {
  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}`;
  const data = await fetchJson<SearchResponse>(url, timeoutMs);
  if (!data || !Array.isArray(data.coins)) return [];
  return data.coins
    .filter(
      (c): c is { id: string; symbol: string; name: string } =>
        typeof c.id === "string" &&
        typeof c.symbol === "string" &&
        typeof c.name === "string"
    )
    .map((c) => ({ id: c.id, symbol: c.symbol, name: c.name }));
}
