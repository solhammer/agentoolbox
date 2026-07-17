import { describe, it, expect, vi } from "vitest";
import { applyCheckoutSession, PACKAGES } from "./billing-routes.js";

// ---------------------------------------------------------------------------
// PACKAGES catalog
// ---------------------------------------------------------------------------
describe("PACKAGES catalog", () => {
  it("contains exactly starter, builder, and scale", () => {
    expect(Object.keys(PACKAGES).sort()).toEqual(["builder", "scale", "starter"]);
  });

  it("starter has correct economics", () => {
    const p = PACKAGES["starter"]!;
    expect(p.credits).toBe(1_000);
    expect(p.amountCents).toBe(1_500);   // $15.00
    expect(p.usd).toBe("$15.00");
  });

  it("builder has correct economics", () => {
    const p = PACKAGES["builder"]!;
    expect(p.credits).toBe(5_000);
    expect(p.amountCents).toBe(6_000);   // $60.00
    expect(p.usd).toBe("$60.00");
  });

  it("scale has correct economics", () => {
    const p = PACKAGES["scale"]!;
    expect(p.credits).toBe(25_000);
    expect(p.amountCents).toBe(25_000);  // $250.00
    expect(p.usd).toBe("$250.00");
  });

  it("all packages have positive credits and amountCents", () => {
    for (const pkg of Object.values(PACKAGES)) {
      expect(pkg.credits).toBeGreaterThan(0);
      expect(pkg.amountCents).toBeGreaterThan(0);
    }
  });

  it("scale offers the best credits-per-dollar ratio", () => {
    const ratios = Object.values(PACKAGES).map(
      (p) => p.credits / (p.amountCents / 100)
    );
    const scaleRatio = PACKAGES["scale"]!.credits / (PACKAGES["scale"]!.amountCents / 100);
    for (const r of ratios) {
      expect(scaleRatio).toBeGreaterThanOrEqual(r);
    }
  });
});

// ---------------------------------------------------------------------------
// applyCheckoutSession
// ---------------------------------------------------------------------------
describe("applyCheckoutSession", () => {
  it("credits the ledger and marks the event as processed on first call", async () => {
    const addCreditsFn = vi.fn().mockResolvedValue(undefined);
    const markProcessedFn = vi.fn().mockResolvedValue(undefined);

    const result = await applyCheckoutSession({
      apiKey: "atb_test123",
      credits: 1_000,
      eventId: "evt_abc",
      isAlreadyProcessed: false,
      addCreditsFn,
      markProcessedFn,
    });

    expect(result).toEqual({ credited: true });
    expect(addCreditsFn).toHaveBeenCalledOnce();
    expect(addCreditsFn).toHaveBeenCalledWith("atb_test123", 1_000);
    expect(markProcessedFn).toHaveBeenCalledOnce();
    expect(markProcessedFn).toHaveBeenCalledWith("evt_abc");
  });

  it("is idempotent: skips ledger update when event already processed", async () => {
    const addCreditsFn = vi.fn().mockResolvedValue(undefined);
    const markProcessedFn = vi.fn().mockResolvedValue(undefined);

    const result = await applyCheckoutSession({
      apiKey: "atb_test456",
      credits: 5_000,
      eventId: "evt_duplicate",
      isAlreadyProcessed: true,
      addCreditsFn,
      markProcessedFn,
    });

    expect(result).toEqual({ credited: false });
    expect(addCreditsFn).not.toHaveBeenCalled();
    expect(markProcessedFn).not.toHaveBeenCalled();
  });

  it("passes the correct credit count to addCreditsFn for builder package", async () => {
    const addCreditsFn = vi.fn().mockResolvedValue(undefined);
    const markProcessedFn = vi.fn().mockResolvedValue(undefined);

    await applyCheckoutSession({
      apiKey: "atb_builder_key",
      credits: PACKAGES["builder"]!.credits,
      eventId: "evt_builder",
      isAlreadyProcessed: false,
      addCreditsFn,
      markProcessedFn,
    });

    expect(addCreditsFn).toHaveBeenCalledWith("atb_builder_key", 5_000);
  });

  it("passes the correct credit count to addCreditsFn for scale package", async () => {
    const addCreditsFn = vi.fn().mockResolvedValue(undefined);
    const markProcessedFn = vi.fn().mockResolvedValue(undefined);

    await applyCheckoutSession({
      apiKey: "atb_scale_key",
      credits: PACKAGES["scale"]!.credits,
      eventId: "evt_scale",
      isAlreadyProcessed: false,
      addCreditsFn,
      markProcessedFn,
    });

    expect(addCreditsFn).toHaveBeenCalledWith("atb_scale_key", 25_000);
  });

  it("calls markProcessedFn with the exact event ID", async () => {
    const addCreditsFn = vi.fn().mockResolvedValue(undefined);
    const markProcessedFn = vi.fn().mockResolvedValue(undefined);

    const eventId = "evt_unique_stripe_id_xyz";
    await applyCheckoutSession({
      apiKey: "atb_any_key",
      credits: 1_000,
      eventId,
      isAlreadyProcessed: false,
      addCreditsFn,
      markProcessedFn,
    });

    expect(markProcessedFn).toHaveBeenCalledWith(eventId);
  });
});
