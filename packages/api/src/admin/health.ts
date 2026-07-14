import { getRedis } from "./logger.js";
import type { HealthStatus } from "./types.js";

const TIMEOUT_MS = 3000;

/** Classifies a latency measurement into a health status tier. */
function tierByLatency(latencyMs: number): HealthStatus["status"] {
  if (latencyMs < 200) return "ok";   // raised from 50ms — remote services are fine at <200ms
  if (latencyMs < 1000) return "degraded";
  return "down";
}

function status(
  service: string,
  s: HealthStatus["status"],
  latencyMs: number | null,
  detail?: string
): HealthStatus {
  const base: HealthStatus = {
    service,
    status: s,
    latencyMs,
    lastChecked: new Date().toISOString(),
  };
  return detail !== undefined ? { ...base, detail } : base;
}

/** Pings Redis and grades the response by latency. */
async function checkRedis(): Promise<HealthStatus> {
  const redis = getRedis();
  if (!redis) {
    return status("redis", "down", null, "REDIS_URL not set");
  }
  const start = Date.now();
  try {
    await redis.ping();
    const latency = Date.now() - start;
    return status("redis", tierByLatency(latency), latency);
  } catch (err) {
    return status("redis", "down", null, err instanceof Error ? err.message : String(err));
  }
}

/** Checks Solana RPC health via the `getHealth` JSON-RPC method. */
async function checkSolana(): Promise<HealthStatus> {
  const url = process.env["SOL_RPC_URL"] ?? "https://api.mainnet-beta.solana.com";
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      return status("solana-rpc", "down", latency, `HTTP ${res.status}`);
    }
    const body = (await res.json()) as { result?: unknown };
    if (body.result === "ok") {
      return status("solana-rpc", tierByLatency(latency), latency);
    }
    return status("solana-rpc", "degraded", latency, `Unexpected result: ${JSON.stringify(body.result)}`);
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return status("solana-rpc", "down", null, timedOut ? "timeout" : err instanceof Error ? err.message : String(err));
  }
}

/** Performs a GET request and grades reachability. */
async function checkHttp(
  service: string,
  url: string,
  headers?: Record<string, string>
): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "agent-toolbox.ai/1.0 (admin@agent-toolbox.ai)",
        ...headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency = Date.now() - start;
    if (res.status >= 200 && res.status < 400) {
      return status(service, tierByLatency(latency), latency);
    }
    return status(service, "degraded", latency, `HTTP ${res.status}`);
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return status(service, "down", null, timedOut ? "timeout" : err instanceof Error ? err.message : String(err));
  }
}

/** Checks Vectara: if no API key, reports not_configured. */
async function checkVectara(): Promise<HealthStatus> {
  const key = process.env["VECTARA_API_KEY"];
  if (!key) {
    return status("vectara", "degraded", null, "VECTARA_API_KEY not configured — NLI layer disabled");
  }
  return checkHttp("vectara", "https://api.vectara.io", { "x-api-key": key });
}

/**
 * Runs all dependency health checks in parallel and returns a status for each.
 * Never rejects: a failed check is reported as `down`.
 */
export async function checkAllServices(): Promise<HealthStatus[]> {
  const checks: Array<() => Promise<HealthStatus>> = [
    checkRedis,
    checkSolana,
    checkVectara,
    () => checkHttp("pypi", "https://pypi.org/pypi/numpy/json"),
    () => checkHttp("npm", "https://registry.npmjs.org/express"),
    // crates.io requires User-Agent + GET to their API, not bare HEAD to root
    () => checkHttp("crates.io", "https://crates.io/api/v1/crates/tokio"),
  ];

  const results = await Promise.allSettled(checks.map((fn) => fn()));
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const name = ["redis", "solana-rpc", "vectara", "pypi", "npm", "crates.io"][i] ?? "unknown";
    return status(name, "down", null, r.reason instanceof Error ? r.reason.message : String(r.reason));
  });
}
