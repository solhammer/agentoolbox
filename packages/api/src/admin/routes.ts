import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ledger } from "../ledger.js";
import type { LedgerEntry } from "../ledger.js";
import { getLogStats, getRecentLogs, getRedis, requestLogger } from "./logger.js";
import { checkAllServices } from "./health.js";
import type { RequestLogEntry } from "./types.js";

const CREDIT_PREFIX = "atb:credit:";

const admin = new Hono();

// ── GET /overview ─────────────────────────────────────────────────────────────
admin.get("/overview", async (c) => {
  const [stats, ledgerStats] = await Promise.all([getLogStats(), ledger.stats()]);
  return c.json({
    ...stats,
    ledgerKeys: ledgerStats.keys,
    ledgerTotalCalls: ledgerStats.totalCalls,
  });
});

// ── GET /requests ─────────────────────────────────────────────────────────────
admin.get("/requests", async (c) => {
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") ?? "100", 10) || 100, 1), 1000);
  const offset = Math.max(parseInt(c.req.query("offset") ?? "0", 10) || 0, 0);
  const pathFilter = c.req.query("path");
  const verdictFilter = c.req.query("verdict");

  let entries = await getRecentLogs(limit, offset);
  if (pathFilter != null) {
    entries = entries.filter((e) => e.path === pathFilter);
  }
  if (verdictFilter != null) {
    entries = entries.filter((e) => e.verdict === verdictFilter);
  }

  return c.json({ entries, total: entries.length, limit, offset });
});

// ── GET /ledger ───────────────────────────────────────────────────────────────
admin.get("/ledger", async (c) => {
  const aggregate = await ledger.stats();
  const accounts: Array<LedgerEntry & { key: string }> = [];

  const redis = getRedis();
  if (redis) {
    const keys = await redis.keys(`${CREDIT_PREFIX}*`);
    for (const fullKey of keys) {
      const raw = await redis.get(fullKey);
      if (!raw) continue;
      try {
        const entry = JSON.parse(raw) as LedgerEntry;
        accounts.push({ key: fullKey.slice(CREDIT_PREFIX.length), ...entry });
      } catch {
        // Skip malformed entries.
      }
    }
  }

  return c.json({ accounts, total: accounts.length, aggregate });
});

// ── POST /ledger/:key/credit ──────────────────────────────────────────────────
admin.post("/ledger/:key/credit", async (c) => {
  const key = c.req.param("key");
  const body = (await c.req.json().catch(() => ({}))) as { delta?: unknown; reason?: unknown };
  const delta = typeof body.delta === "number" ? body.delta : NaN;
  if (!Number.isFinite(delta)) {
    return c.json({ error: "invalid_request", message: "`delta` must be a number" }, 400);
  }
  const reason = typeof body.reason === "string" ? body.reason : null;

  if (delta >= 0) {
    await ledger.addCredits(key, delta);
  } else {
    const existing = await ledger.getEntry(key);
    const now = Date.now();
    await ledger.setEntry(key, {
      credits: Math.max(0, (existing?.credits ?? 0) + delta),
      totalCalls: existing?.totalCalls ?? 0,
      createdAt: existing?.createdAt ?? now,
      lastSeen: now,
    });
  }

  const updated = await ledger.getEntry(key);
  return c.json({ key, entry: updated, delta, reason });
});

// ── GET /hallucinations ───────────────────────────────────────────────────────
admin.get("/hallucinations", async (c) => {
  const logs = await getRecentLogs(10_000, 0);
  const packageCounts = new Map<string, { name: string; language: string; count: number }>();
  const checkTypeCounts = new Map<string, number>();

  for (const entry of logs) {
    if (entry.hallucinatedPackages) {
      const language = entry.language ?? "unknown";
      for (const name of entry.hallucinatedPackages) {
        const k = `${language}:${name}`;
        const existing = packageCounts.get(k);
        if (existing) existing.count += 1;
        else packageCounts.set(k, { name, language, count: 1 });
      }
    }
    if (entry.checkTypes) {
      for (const ct of entry.checkTypes) {
        checkTypeCounts.set(ct, (checkTypeCounts.get(ct) ?? 0) + 1);
      }
    }
  }

  const topPackages = [...packageCounts.values()].sort((a, b) => b.count - a.count).slice(0, 50);
  const checkTypeBreakdown = Object.fromEntries(
    [...checkTypeCounts.entries()].sort((a, b) => b[1] - a[1])
  );

  return c.json({ topPackages, checkTypeBreakdown });
});

// ── GET /health ───────────────────────────────────────────────────────────────
admin.get("/health", async (c) => c.json(await checkAllServices()));

// ── GET /stream (Server-Sent Events live feed) ────────────────────────────────
admin.get("/stream", (c) => {
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  return streamSSE(c, async (stream) => {
    const onEntry = (entry: RequestLogEntry): void => {
      void stream.writeSSE({ data: JSON.stringify(entry) });
    };
    requestLogger.on("entry", onEntry);

    let closed = false;
    stream.onAbort(() => {
      closed = true;
      requestLogger.off("entry", onEntry);
    });

    // Hold the connection open, emitting periodic keepalive comments.
    while (!closed) {
      await stream.sleep(30_000);
      if (!closed) {
        await stream.writeSSE({ event: "ping", data: "keepalive" });
      }
    }
  });
});

export { admin };
