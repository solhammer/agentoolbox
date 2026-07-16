import { generateCertificate } from "./certificate.js";
import { HOLIDAY_DATE_SET, HOLIDAY_YEAR_RANGE } from "./data/holidays.js";
import type { DeadlineInput, DeadlineResult, SkippedDays, Verdict } from "./types.js";

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Format a local Date as an ISO 8601 date string (YYYY-MM-DD). */
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse an ISO date string (YYYY-MM-DD) into a local Date.
 * Returns `null` if the string is not a valid calendar date.
 */
function parseISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m === null) return null;

  const yearStr = m[1];
  const monthStr = m[2];
  const dayStr = m[3];
  if (yearStr === undefined || monthStr === undefined || dayStr === undefined) return null;

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  // Check calendar validity (e.g. Feb 30 would roll over)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/** Advance a Date by one step in the given direction without mutating the original. */
function step(d: Date, direction: "after" | "before"): Date {
  const delta = direction === "after" ? 1 : -1;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

/** Return true if the date falls on a weekend (Saturday or Sunday). */
function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

// ── Court-day computation ─────────────────────────────────────────────────────

interface CourtResult {
  deadline: Date;
  skipped: SkippedDays;
}

/**
 * Walk forward or backward from `start`, counting only court days
 * (non-weekend, non-federal-holiday), until `days` have been counted.
 *
 * The start date itself is NOT counted — only days beyond it.
 */
function walkCourtDays(
  start: Date,
  days: number,
  direction: "after" | "before"
): CourtResult {
  if (days === 0) {
    return {
      deadline: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
      skipped: { weekends: 0, holidays: [] },
    };
  }

  let current = start;
  let counted = 0;
  let weekends = 0;
  const holidays: string[] = [];

  while (counted < days) {
    current = step(current, direction);
    if (isWeekend(current)) {
      weekends++;
      continue;
    }
    const iso = toISO(current);
    if (HOLIDAY_DATE_SET.has(iso)) {
      holidays.push(iso);
      continue;
    }
    counted++;
  }

  return {
    deadline: current,
    skipped: { weekends, holidays },
  };
}

// ── Calendar-day computation ──────────────────────────────────────────────────

function walkCalendarDays(
  start: Date,
  days: number,
  direction: "after" | "before"
): Date {
  const delta = direction === "after" ? days : -days;
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + delta);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Computes a legal deadline by counting court or calendar days from a start date.
 *
 * - **calendar** mode counts every calendar day (weekends and holidays included).
 * - **court** mode skips weekends and US federal holidays from the bundled
 *   dataset (2020–2035).  Returns BLOCK if the start date falls outside that range.
 *
 * The start date itself is never counted; only subsequent days are.
 *
 * @returns A DeadlineResult with verdict PASS (success) or BLOCK (invalid input).
 */
export function computeDeadline(input: DeadlineInput): DeadlineResult {
  const start = Date.now();
  const mode = input.mode ?? "calendar";
  const direction = input.direction ?? "after";

  // ── Input validation ──────────────────────────────────────────────────────

  const buildBlock = (startDate: string, reason: string): DeadlineResult => {
    const timestamp = Date.now();
    const subject = `${startDate}::${input.days}::${mode}::${direction}`;
    const certificate = generateCertificate(subject, "BLOCK", 1, timestamp);
    return {
      verdict: "BLOCK",
      deadline: startDate,
      startDate,
      daysRequested: input.days,
      mode,
      direction,
      skipped: { weekends: 0, holidays: [] },
      certificate,
      latencyMs: Date.now() - start,
    };
  };

  // Validate start date
  const startDate = parseISO(input.start);
  if (startDate === null) {
    return buildBlock(input.start, `invalid start date: "${input.start}"`);
  }

  // Validate days
  if (!Number.isInteger(input.days) || input.days < 0) {
    return buildBlock(input.start, `days must be a non-negative integer, got ${input.days}`);
  }

  // Court mode requires start year within the holiday dataset range
  if (mode === "court") {
    const startYear = startDate.getFullYear();
    if (startYear < HOLIDAY_YEAR_RANGE.start || startYear > HOLIDAY_YEAR_RANGE.end) {
      return buildBlock(
        input.start,
        `court mode requires a start year in ${HOLIDAY_YEAR_RANGE.start}–${HOLIDAY_YEAR_RANGE.end}; got ${startYear}`
      );
    }
  }

  // ── Computation ───────────────────────────────────────────────────────────

  let deadlineDate: Date;
  let skipped: SkippedDays;

  if (mode === "court") {
    const result = walkCourtDays(startDate, input.days, direction);
    deadlineDate = result.deadline;
    skipped = result.skipped;
  } else {
    deadlineDate = walkCalendarDays(startDate, input.days, direction);
    skipped = { weekends: 0, holidays: [] };
  }

  const verdict: Verdict = "PASS";
  const startIso = toISO(startDate);
  const deadlineIso = toISO(deadlineDate);

  const subject = `${startIso}::${input.days}::${mode}::${direction}`;
  const timestamp = Date.now();
  const certificate = generateCertificate(subject, verdict, 0, timestamp);

  return {
    verdict,
    deadline: deadlineIso,
    startDate: startIso,
    daysRequested: input.days,
    mode,
    direction,
    skipped,
    certificate,
    latencyMs: Date.now() - start,
  };
}
