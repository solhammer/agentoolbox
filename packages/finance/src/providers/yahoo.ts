import yahooFinance from "yahoo-finance2";

/**
 * Fetch a stock quote from Yahoo Finance.
 * yahoo-finance2 is an unofficial library and can throw / rate-limit (429),
 * so all calls are wrapped in try/catch and return null on failure.
 */
export async function getStockQuote(
  symbol: string
): Promise<{ price: number; timestamp: number; name: string; currency: string } | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    if (!quote || typeof quote.regularMarketPrice !== "number") return null;

    // regularMarketTime may be a Date or a unix seconds number depending on version.
    let timestamp = Date.now();
    const rawTime: unknown = quote.regularMarketTime;
    if (rawTime instanceof Date) {
      timestamp = rawTime.getTime();
    } else if (typeof rawTime === "number") {
      timestamp = rawTime * 1000;
    }

    return {
      price: quote.regularMarketPrice,
      timestamp,
      name: quote.longName ?? quote.shortName ?? symbol,
      currency: quote.currency ?? "USD",
    };
  } catch {
    return null;
  }
}

/**
 * Search Yahoo Finance for symbols matching a free-text query.
 * Returns an empty array on error.
 */
export async function searchStock(
  query: string
): Promise<Array<{ symbol: string; name: string; exchange: string }>> {
  try {
    const result = await yahooFinance.search(query);
    if (!result || !Array.isArray(result.quotes)) return [];
    return result.quotes
      .filter(
        (q): q is typeof q & { symbol: string } =>
          typeof (q as { symbol?: unknown }).symbol === "string"
      )
      .map((q) => {
        const anyQ = q as {
          symbol: string;
          longname?: string;
          shortname?: string;
          exchange?: string;
        };
        return {
          symbol: anyQ.symbol,
          name: anyQ.longname ?? anyQ.shortname ?? anyQ.symbol,
          exchange: anyQ.exchange ?? "",
        };
      });
  } catch {
    return [];
  }
}
