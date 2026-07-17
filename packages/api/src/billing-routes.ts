/**
 * Stripe card-payment routes (env-guarded — dormant until STRIPE_SECRET_KEY is set).
 *
 * Credit economics:
 *   1 credit ≈ 0.0001 SOL ≈ $0.015 USD (matching the SOL micropayment ledger)
 *
 * Package mapping (server-side only — amounts NEVER come from the client):
 *   starter  →  1,000 credits / $15   ($0.015/credit, no discount)
 *   builder  →  5,000 credits / $60   ($0.012/credit, 20% discount)
 *   scale    → 25,000 credits / $250  ($0.010/credit, 33% discount)
 *
 * Mounted at /billing (outside /v1/* so the payment middleware never fires here).
 *
 * Security requirements met:
 *   ✓ Raw-body webhook signature verification (stripe.webhooks.constructEvent)
 *   ✓ Server-side price→credit mapping (client never sets amount)
 *   ✓ Idempotency on Stripe event id (Redis key atb:stripe:evt:<id>)
 *   ✓ No secret logging
 *   ✓ Env-guarded: all routes return 501 when STRIPE_SECRET_KEY is absent
 */

import { Hono } from "hono";
import Stripe from "stripe";
import { ledger } from "./ledger.js";

// ── Package catalog (server-side source of truth) ─────────────────────────────

export interface CreditPackage {
  name: "starter" | "builder" | "scale";
  credits: number;
  /** USD price in cents (for Stripe unit_amount). */
  amountCents: number;
  /** USD price as a human-readable string. */
  usd: string;
}

export const PACKAGES: Record<string, CreditPackage> = {
  starter: { name: "starter", credits: 1_000, amountCents: 1_500, usd: "$15.00" },
  builder: { name: "builder", credits: 5_000, amountCents: 6_000, usd: "$60.00" },
  scale:   { name: "scale",   credits: 25_000, amountCents: 25_000, usd: "$250.00" },
} as const;

// ── Redis idempotency key prefix ──────────────────────────────────────────────

const STRIPE_EVT_PREFIX = "atb:stripe:evt:";

// ── Pure helper — exported for unit tests ─────────────────────────────────────

/**
 * Applies a completed Stripe Checkout session to the ledger.
 *
 * Extracted as a pure, testable function that accepts explicit parameters
 * (no Stripe SDK or real Redis required in tests).
 *
 * @param apiKey   - The API key stored in the session metadata.
 * @param credits  - The credit count stored in the session metadata.
 * @param eventId  - The Stripe event ID (for idempotency).
 * @param isAlreadyProcessed - Whether this event has already been recorded.
 * @param addCreditsFn - Injected ledger function (defaults to real ledger).
 * @param markProcessedFn - Injected idempotency recorder (defaults to Redis).
 * @returns `{ credited: true }` when credits were added, `{ credited: false }` if already processed.
 */
export async function applyCheckoutSession(opts: {
  apiKey: string;
  credits: number;
  eventId: string;
  isAlreadyProcessed: boolean;
  addCreditsFn?: (key: string, credits: number) => Promise<void>;
  markProcessedFn?: (eventId: string) => Promise<void>;
}): Promise<{ credited: boolean }> {
  if (opts.isAlreadyProcessed) {
    return { credited: false };
  }

  const addCredits = opts.addCreditsFn ?? ((k, c) => ledger.addCredits(k, c));
  const markProcessed = opts.markProcessedFn ?? defaultMarkProcessed;

  await addCredits(opts.apiKey, opts.credits);
  await markProcessed(opts.eventId);
  return { credited: true };
}

async function defaultMarkProcessed(eventId: string): Promise<void> {
  // Access the ledger's internal Redis client via the singleton.
  // We piggyback on the same Redis connection to avoid a second client.
  const r = (ledger as unknown as { redis: import("ioredis").Redis | null }).redis;
  if (r) {
    // Expire after 30 days — well beyond any Stripe retry window.
    await r.set(`${STRIPE_EVT_PREFIX}${eventId}`, "1", "EX", 60 * 60 * 24 * 30);
  }
  // In-memory fallback: skip (single-process restarts can replay; acceptable
  // without Redis since the ledger itself is also in-memory in that case).
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const r = (ledger as unknown as { redis: import("ioredis").Redis | null }).redis;
  if (!r) return false;
  const val = await r.get(`${STRIPE_EVT_PREFIX}${eventId}`);
  return val !== null;
}

// ── Env guard ─────────────────────────────────────────────────────────────────

const UNAVAILABLE_BODY = {
  error: "card_billing_unavailable",
  message: "Card billing is not configured; use SOL micropayments.",
} as const;

function stripeUnavailable(): boolean {
  return !process.env["STRIPE_SECRET_KEY"];
}

// ── Hono sub-app ─────────────────────────────────────────────────────────────

export const billingRoutes = new Hono();

// ── GET /billing/packages ─────────────────────────────────────────────────────

billingRoutes.get("/packages", (c) => {
  if (stripeUnavailable()) return c.json(UNAVAILABLE_BODY, 501);

  const catalog = Object.values(PACKAGES).map((p) => ({
    name: p.name,
    credits: p.credits,
    usd: p.usd,
  }));
  return c.json({ packages: catalog });
});

// ── POST /billing/checkout ────────────────────────────────────────────────────

billingRoutes.post("/checkout", async (c) => {
  if (stripeUnavailable()) return c.json(UNAVAILABLE_BODY, 501);

  let body: { package?: string; email?: string; apiKey?: string };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json({ error: "bad_request", message: "Invalid JSON body" }, 400);
  }

  const pkg = PACKAGES[body.package ?? ""];
  if (!pkg) {
    return c.json(
      {
        error: "invalid_package",
        message: `Unknown package "${body.package ?? ""}". Valid options: starter, builder, scale.`,
      },
      400
    );
  }

  // If no apiKey provided, generate one with an atb_ prefix.
  const apiKey =
    (body.apiKey && body.apiKey.trim()) ||
    `atb_${Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url")}`;

  const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pkg.amountCents,
          product_data: {
            name: `agent-toolbox.ai — ${pkg.name.charAt(0).toUpperCase() + pkg.name.slice(1)} Pack (${pkg.credits.toLocaleString()} credits)`,
            description: `${pkg.credits.toLocaleString()} API credits for agent-toolbox.ai. Credits never expire.`,
          },
        },
      },
    ],
    metadata: {
      apiKey,
      credits: String(pkg.credits),
    },
    ...(body.email ? { customer_email: body.email } : {}),
    success_url: `https://agent-toolbox.ai/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://agent-toolbox.ai/billing/cancelled`,
  });

  return c.json({
    url: session.url,
    apiKey,
    credits: pkg.credits,
  });
});

// ── POST /billing/webhook ─────────────────────────────────────────────────────

billingRoutes.post("/webhook", async (c) => {
  if (stripeUnavailable()) return c.json(UNAVAILABLE_BODY, 501);

  // MUST read raw body before any JSON parsing — Stripe needs the exact bytes
  // to verify the signature.
  const rawBody = await c.req.text();
  const sig = c.req.header("stripe-signature") ?? "";

  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!webhookSecret) {
    return c.json(
      { error: "webhook_not_configured", message: "STRIPE_WEBHOOK_SECRET is not set" },
      500
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    // Never log the signature or secret.
    const msg = err instanceof Error ? err.message : "signature verification failed";
    return c.json({ error: "webhook_signature_invalid", message: msg }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const apiKey = session.metadata?.["apiKey"] ?? "";
    const creditsRaw = session.metadata?.["credits"] ?? "0";
    const credits = parseInt(creditsRaw, 10);

    if (!apiKey || isNaN(credits) || credits <= 0) {
      // Metadata missing or malformed — acknowledge to Stripe to avoid retries
      // but log the issue for ops visibility (no secret data in log).
      console.warn("[billing/webhook] Missing or invalid metadata in session", session.id);
      return c.json({ received: true });
    }

    const alreadyProcessed = await isEventProcessed(event.id);

    await applyCheckoutSession({
      apiKey,
      credits,
      eventId: event.id,
      isAlreadyProcessed: alreadyProcessed,
    });
  }

  // Always return 200 for events we don't handle, so Stripe stops retrying.
  return c.json({ received: true });
});
