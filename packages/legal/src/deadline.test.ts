import { describe, it, expect } from "vitest";
import { computeDeadline } from "./deadline.js";
import { generateCertificate } from "./certificate.js";

const CERT_RE = /^sha256:[0-9a-f]{64}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─────────────────────────────────────────────────────────────────────────────
// Court mode — the canonical test from the spec:
//   Start on Friday 2025-01-17, 1 court day "after" → 2025-01-21 (Tuesday)
//   Because Saturday (Jan 18) and Sunday (Jan 19) are weekends, and
//   Monday (Jan 20) is Martin Luther King Jr. Day (observed).
// ─────────────────────────────────────────────────────────────────────────────

describe("computeDeadline — court mode, direction after", () => {
  it("skips weekend + Monday MLK Day: Fri 2025-01-17 + 1 court day → Tue 2025-01-21", () => {
    const r = computeDeadline({
      start: "2025-01-17",
      days: 1,
      mode: "court",
      direction: "after",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2025-01-21");
    expect(r.startDate).toBe("2025-01-17");
    expect(r.daysRequested).toBe(1);
    expect(r.mode).toBe("court");
    expect(r.direction).toBe("after");
    // 2 weekend days (Sat Jan 18 + Sun Jan 19)
    expect(r.skipped.weekends).toBe(2);
    // 1 holiday: MLK Day Jan 20
    expect(r.skipped.holidays).toContain("2025-01-20");
    expect(r.skipped.holidays).toHaveLength(1);
  });

  it("5 court days from Mon 2025-01-06 → Mon 2025-01-13 (skipping one weekend)", () => {
    const r = computeDeadline({
      start: "2025-01-06", // Monday
      days: 5,
      mode: "court",
      direction: "after",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2025-01-13"); // next Monday
    expect(r.skipped.weekends).toBe(2); // Sat Jan 11 + Sun Jan 12
  });

  it("0 court days → deadline equals start date", () => {
    const r = computeDeadline({
      start: "2025-06-02",
      days: 0,
      mode: "court",
      direction: "after",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2025-06-02");
    expect(r.skipped.weekends).toBe(0);
    expect(r.skipped.holidays).toHaveLength(0);
  });
});

describe("computeDeadline — court mode, direction before", () => {
  it("skips weekend + Monday MLK Day going backwards: Tue 2025-01-21 - 1 court day → Fri 2025-01-17", () => {
    const r = computeDeadline({
      start: "2025-01-21",
      days: 1,
      mode: "court",
      direction: "before",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2025-01-17");
    expect(r.direction).toBe("before");
    // Walked back through Mon Jan 20 (MLK), Sun Jan 19, Sat Jan 18 to Fri Jan 17
    expect(r.skipped.holidays).toContain("2025-01-20");
    expect(r.skipped.weekends).toBe(2);
  });
});

describe("computeDeadline — calendar mode", () => {
  it("calendar mode counts every day including weekends", () => {
    const r = computeDeadline({
      start: "2025-01-17", // Friday
      days: 7,
      mode: "calendar",
      direction: "after",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2025-01-24");
    expect(r.skipped.weekends).toBe(0);
    expect(r.skipped.holidays).toHaveLength(0);
  });

  it("calendar mode direction before", () => {
    const r = computeDeadline({
      start: "2025-02-01",
      days: 7,
      mode: "calendar",
      direction: "before",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2025-01-25");
  });

  it("defaults: mode=calendar, direction=after", () => {
    const r = computeDeadline({ start: "2025-03-10", days: 3 });
    expect(r.mode).toBe("calendar");
    expect(r.direction).toBe("after");
    expect(r.deadline).toBe("2025-03-13");
  });

  it("calendar mode allows dates outside court range", () => {
    const r = computeDeadline({
      start: "2019-12-01",
      days: 5,
      mode: "calendar",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2019-12-06");
  });
});

describe("computeDeadline — BLOCK on invalid input", () => {
  it("BLOCKs on invalid date string", () => {
    const r = computeDeadline({ start: "not-a-date", days: 5 });
    expect(r.verdict).toBe("BLOCK");
  });

  it("BLOCKs on a date that does not exist (Feb 30)", () => {
    const r = computeDeadline({ start: "2025-02-30", days: 1 });
    expect(r.verdict).toBe("BLOCK");
  });

  it("BLOCKs on negative days", () => {
    const r = computeDeadline({ start: "2025-01-17", days: -1 });
    expect(r.verdict).toBe("BLOCK");
  });

  it("BLOCKs court mode when start year is before 2020", () => {
    const r = computeDeadline({ start: "2019-01-17", days: 5, mode: "court" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("BLOCKs court mode when start year is after 2035", () => {
    const r = computeDeadline({ start: "2036-01-17", days: 5, mode: "court" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("still returns a valid certificate and latencyMs when BLOCKed", () => {
    const r = computeDeadline({ start: "bad", days: 1 });
    expect(r.certificate).toMatch(CERT_RE);
    expect(typeof r.latencyMs).toBe("number");
  });
});

describe("computeDeadline — specific holidays", () => {
  it("skips Independence Day 2025 (observed Fri Jul 4)", () => {
    // Jul 4 2025 is a Friday. Start on Thu Jul 3, 1 court day after → Mon Jul 7.
    // (Fri Jul 4 = Independence Day, then weekend Sat Jul 5 + Sun Jul 6)
    const r = computeDeadline({
      start: "2025-07-03",
      days: 1,
      mode: "court",
      direction: "after",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2025-07-07");
    expect(r.skipped.holidays).toContain("2025-07-04");
    expect(r.skipped.weekends).toBe(2); // Sat + Sun
  });

  it("skips Thanksgiving 2024 (Thu Nov 28)", () => {
    // Start Wed Nov 27, 1 court day after → Mon Dec 2
    // Thu Nov 28 = Thanksgiving, Fri Nov 29 (not holiday, but verify we don't double-skip)
    // Actually: Thu Nov 28 = Thanksgiving skip, Fri Nov 29 = normal day → deadline is Fri Nov 29
    const r = computeDeadline({
      start: "2024-11-27",
      days: 1,
      mode: "court",
      direction: "after",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.deadline).toBe("2024-11-29"); // Fri Nov 29 is a normal court day
    expect(r.skipped.holidays).toContain("2024-11-28");
  });
});

describe("computeDeadline — certificate & latency", () => {
  it("returns a well-formed certificate and ISO deadline", () => {
    const r = computeDeadline({ start: "2025-03-10", days: 5, mode: "court" });
    expect(r.certificate).toMatch(CERT_RE);
    expect(r.deadline).toMatch(ISO_DATE_RE);
    expect(typeof r.latencyMs).toBe("number");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("certificate is deterministic for fixed inputs (same timestamp)", () => {
    const a = generateCertificate("2025-03-10::5::court::after", "PASS", 0, 99999);
    const b = generateCertificate("2025-03-10::5::court::after", "PASS", 0, 99999);
    expect(a).toBe(b);
    expect(a).toMatch(CERT_RE);
  });
});
