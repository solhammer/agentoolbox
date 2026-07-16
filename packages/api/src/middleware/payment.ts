import type { MiddlewareHandler } from "hono";
import { ledger } from "../ledger.js";
import { verifyPaymentTx } from "@agentoolbox/payments";

/**
 * SOL Payment Middleware
 *
 * Flow:
 *   1. No Authorization header → anonymous free tier (IP-based, N calls max).
 *   2. Bearer token matches Solana tx signature pattern → verify on-chain,
 *      credit the account if valid, then check / deduct credits.
 *   3. Any other Bearer token → treat as a regular API key and check credits.
 *
 * A Solana tx signature is base58-encoded, 87-88 characters:
 *   /^[1-9A-HJ-NP-Za-km-z]{87,88}$/
 */

/** Regex for a base58-encoded Solana transaction signature. */
const TX_SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

/** Cost in credits per endpoint (1 credit = 0.001 SOL). */
const ENDPOINT_COSTS: Record<string, number> = {
  "/v1/validate/imports": 1,
  "/v1/verify": 2,
  "/v1/distill": 1,
  "/v1/scan/secrets": 1,
  "/v1/scan/injection": 1,
  "/v1/scan/pii": 1,
  "/v1/tokens/count": 1,
  "/v1/scan/vulnerabilities": 2,
  "/v1/finance/units": 1,
  "/v1/finance/price": 2,
  "/v1/finance/symbol": 1,
  "/v1/finance/token/risk": 3,
  "/v1/finance/slippage": 2,
  "/v1/finance/order/risk": 5,
  "/v1/finance/position/check": 1,
  "/v1/compliance/sanctions": 1,
  "/v1/health/rx-check": 2,
  "/v1/agent/tool-args": 1,
  "/v1/infra/plan/risk": 2,
  "/v1/legal/cite": 2,
  "/v1/legal/deadline": 1,
  "/v1/validate/identifier": 1,
  "/v1/validate/schema": 1,
  "/v1/scan/sql": 1,
  "/v1/scan/command": 1,
  "/v1/scan/url": 1,
};

/** Free tier: maximum anonymous calls per IP before a paid key is required. */
const FREE_TIER_LIMIT = 10;

export const paymentMiddleware: MiddlewareHandler = async (c, next) => {
  // TEST_MODE=1 bypasses all payment checks for local integration testing.
  // Never set this in production.
  if (process.env["TEST_MODE"] === "1") {
    c.set("apiKey", "test");
    c.set("creditCost", 0);
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  const path = new URL(c.req.url).pathname;
  const cost = ENDPOINT_COSTS[path] ?? 1;

  // ── Anonymous free tier ────────────────────────────────────────────────────
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const ip = c.req.header("x-forwarded-for") ?? "anonymous";
    const ipKey = `ip:${ip}`;
    const entry = await ledger.getEntry(ipKey);
    const calls = entry?.totalCalls ?? 0;

    if (calls >= FREE_TIER_LIMIT) {
      return c.json(
        {
          error: "free_tier_exhausted",
          message: `Free tier limit (${FREE_TIER_LIMIT} calls) reached. Pass a Bearer token to continue.`,
          docs: "https://agent-toolbox.ai/docs#authentication",
        },
        402
      );
    }

    const now = Date.now();
    await ledger.setEntry(ipKey, {
      credits: 0,
      totalCalls: calls + 1,
      createdAt: entry?.createdAt ?? now,
      lastSeen: now,
    });

    c.set("apiKey", null);
    c.set("creditCost", cost);
    await next();
    return;
  }

  // ── Paid / authenticated tier ──────────────────────────────────────────────
  const apiKey = authHeader.slice("Bearer ".length).trim();
  if (!apiKey) {
    return c.json({ error: "invalid_token", message: "Empty Bearer token" }, 401);
  }

  // If the token looks like a Solana tx signature, attempt on-chain verification
  // and credit the account.  Subsequent calls with the same sig fall through to
  // the credit-balance check (verifyPaymentTx returns {valid:false,error:"already_used"}).
  if (TX_SIG_RE.test(apiKey)) {
    const verification = await verifyPaymentTx(apiKey);
    if (verification.valid && verification.credits > 0) {
      await ledger.addCredits(apiKey, verification.credits);
    }
  }

  // Check and deduct credits
  const result = await ledger.deductCredit(apiKey, cost);
  if (!result.success) {
    return c.json(
      {
        error: "insufficient_credits",
        message:
          "Not enough credits. Send SOL to the service wallet to purchase more.",
        remaining: result.remaining,
        docs: "https://agent-toolbox.ai/docs#authentication",
      },
      402
    );
  }

  c.set("apiKey", apiKey);
  c.set("creditCost", cost);
  await next();
};

/** Returns current ledger stats (for admin/debug use). */
export async function getLedgerStats(): Promise<{ keys: number; totalCalls: number }> {
  return ledger.stats();
}
