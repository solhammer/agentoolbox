import { EventEmitter } from "node:events";
import { Redis } from "ioredis";
import type { OverviewStats, RequestLogEntry } from "./types.js";

/** Redis list key holding the most recent request log entries. */
export const REDIS_LOG_KEY = "atb:requests";

/** Maximum number of entries retained in the Redis circular buffer. */
export const MAX_LOG_ENTRIES = 10_000;

/** Maximum number of entries retained in the in-memory fallback buffer. */
const MAX_MEM_ENTRIES = 1000;

/**
 * Singleton emitter broadcasting `"entry"` events with a {@link RequestLogEntry}
 * payload. The SSE live feed subscribes to this emitter.
 */
export const requestLogger = new EventEmitter();
// SSE connections + internal listeners can accumulate; avoid the default warning.
requestLogger.setMaxListeners(0);

/**
 * Module-level Redis connection. `CreditLedger.redis` is private, so we build a
 * dedicated connection here from `REDIS_URL` rather than reaching into it.
 */
let redisClient: Redis | null | undefined;

/** Returns a shared Redis instance, or `null` when `REDIS_URL` is unset. */
export function getRedis(): Redis | null {
  if (redisClient === undefined) {
    const url = process.env["REDIS_URL"];
    redisClient = url != null && url !== "" ? new Redis(url) : null;
  }
  return redisClient;
}

/** In-memory circular buffer used when Redis is unavailable. Newest first. */
const memBuffer: RequestLogEntry[] = [];

function pushMem(entry: RequestLogEntry): void {
  memBuffer.unshift(entry);
  if (memBuffer.length > MAX_MEM_ENTRIES) {
    memBuffer.length = MAX_MEM_ENTRIES;
  }
}

/**
 * Emits the entry to subscribers and persists it to the log buffer (Redis when
 * available, otherwise the in-memory circular buffer).
 */
export async function appendLog(entry: RequestLogEntry): Promise<void> {
  requestLogger.emit("entry", entry);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush(REDIS_LOG_KEY, JSON.stringify(entry));
      await redis.ltrim(REDIS_LOG_KEY, 0, MAX_LOG_ENTRIES - 1);
      return;
    } catch (err) {
      console.error("appendLog: Redis write failed, using memory buffer", err);
    }
  }
  pushMem(entry);
}

function parseEntry(raw: string): RequestLogEntry | null {
  try {
    return JSON.parse(raw) as RequestLogEntry;
  } catch {
    return null;
  }
}

/**
 * Returns recent log entries (newest first) from Redis, falling back to the
 * in-memory buffer when Redis is unavailable.
 */
export async function getRecentLogs(
  limit = 100,
  offset = 0
): Promise<RequestLogEntry[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const start = offset;
      const stop = offset + limit - 1;
      const raws = await redis.lrange(REDIS_LOG_KEY, start, stop);
      return raws
        .map(parseEntry)
        .filter((e): e is RequestLogEntry => e !== null);
    } catch (err) {
      console.error("getRecentLogs: Redis read failed, using memory buffer", err);
    }
  }
  return memBuffer.slice(offset, offset + limit);
}

/**
 * Reads all recent logs within `windowMs` and computes aggregate overview stats.
 */
export async function getLogStats(
  windowMs = 24 * 60 * 60 * 1000
): Promise<OverviewStats> {
  const all = await getRecentLogs(MAX_LOG_ENTRIES, 0);
  const since = Date.now() - windowMs;
  const logs = all.filter((e) => e.timestamp >= since);

  const activeKeys = new Set<string>();
  const verdictDistribution = { PASS: 0, FLAG: 0, BLOCK: 0 };
  const callsByEndpoint: Record<string, number> = {};
  const hourCounts = new Map<string, number>();
  const packageCounts = new Map<string, { name: string; language: string; count: number }>();
  let errors = 0;

  for (const entry of logs) {
    if (entry.apiKey != null) activeKeys.add(entry.apiKey);
    if (entry.statusCode >= 400) errors += 1;

    if (entry.verdict != null) {
      verdictDistribution[entry.verdict] += 1;
    }

    callsByEndpoint[entry.path] = (callsByEndpoint[entry.path] ?? 0) + 1;

    const hour = new Date(entry.timestamp).toISOString().slice(0, 13) + ":00";
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    if (entry.hallucinatedPackages) {
      const language = entry.language ?? "unknown";
      for (const name of entry.hallucinatedPackages) {
        const key = `${language}:${name}`;
        const existing = packageCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          packageCounts.set(key, { name, language, count: 1 });
        }
      }
    }
  }

  const callsOverTime = [...hourCounts.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const topHallucinatedPackages = [...packageCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    period: "24h",
    totalCalls: logs.length,
    activeKeys: activeKeys.size,
    errorRate: logs.length > 0 ? errors / logs.length : 0,
    verdictDistribution,
    callsByEndpoint,
    callsOverTime,
    topHallucinatedPackages,
  };
}
