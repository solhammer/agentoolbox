/**
 * US Federal Holiday dataset for 2020–2035.
 *
 * All dates are computed deterministically using standard observed-day rules:
 *   - Saturday holiday → observed the preceding Friday
 *   - Sunday holiday   → observed the following Monday
 *
 * Fixed holidays: New Year's Day, Juneteenth (since 2021), Independence Day,
 *   Veterans Day, Christmas Day.
 * Floating holidays: MLK Jr. Day, Presidents' Day, Memorial Day, Labor Day,
 *   Columbus Day, Thanksgiving Day.
 */

export const HOLIDAY_YEAR_RANGE = { start: 2020, end: 2035 } as const;

/** A named federal holiday record (observed date). */
export interface FederalHoliday {
  /** Name of the holiday. */
  name: string;
  /** Observed date in ISO 8601 format (YYYY-MM-DD). */
  date: string;
  /** Calendar year of the holiday. */
  year: number;
}

// ── Internal helpers (not exported) ─────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Apply the observed-day rule to a fixed-date holiday. */
function observed(date: Date): Date {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  if (dow === 6) {
    // Saturday → observe Friday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  }
  if (dow === 0) {
    // Sunday → observe Monday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }
  return date;
}

/**
 * Return the Nth occurrence of a given weekday in a given month.
 * dayOfWeek: 0=Sun, 1=Mon, …, 6=Sat.  n: 1-based.
 */
function nthWeekday(year: number, month: number, dayOfWeek: number, n: number): Date {
  // month is 1-based
  const first = new Date(year, month - 1, 1);
  const firstDow = first.getDay();
  let offset = dayOfWeek - firstDow;
  if (offset < 0) offset += 7;
  const dayNum = 1 + offset + (n - 1) * 7;
  return new Date(year, month - 1, dayNum);
}

/** Return the last occurrence of a given weekday in a given month. */
function lastWeekday(year: number, month: number, dayOfWeek: number): Date {
  // Start from the last day and walk backwards
  const last = new Date(year, month, 0); // 0th day of next month = last day of this month
  const lastDow = last.getDay();
  let offset = lastDow - dayOfWeek;
  if (offset < 0) offset += 7;
  return new Date(year, month - 1, last.getDate() - offset);
}

/** Generate all US federal holidays for a single calendar year. */
function holidaysForYear(year: number): FederalHoliday[] {
  const add = (name: string, date: Date): FederalHoliday => ({
    name,
    date: toISO(date),
    year,
  });

  const fixed = (name: string, month: number, day: number): FederalHoliday =>
    add(name, observed(new Date(year, month - 1, day)));

  const floating = (name: string, date: Date): FederalHoliday =>
    add(name, date); // floating holidays are already on the right weekday

  const result: FederalHoliday[] = [
    fixed("New Year's Day", 1, 1),
    floating("Martin Luther King Jr. Day", nthWeekday(year, 1, 1, 3)),  // 3rd Monday Jan
    floating("Presidents' Day", nthWeekday(year, 2, 1, 3)),             // 3rd Monday Feb
    floating("Memorial Day", lastWeekday(year, 5, 1)),                   // Last Monday May
    ...(year >= 2021 ? [fixed("Juneteenth National Independence Day", 6, 19)] : []),
    fixed("Independence Day", 7, 4),
    floating("Labor Day", nthWeekday(year, 9, 1, 1)),                   // 1st Monday Sep
    floating("Columbus Day", nthWeekday(year, 10, 1, 2)),               // 2nd Monday Oct
    fixed("Veterans Day", 11, 11),
    floating("Thanksgiving Day", nthWeekday(year, 11, 4, 4)),           // 4th Thursday Nov
    fixed("Christmas Day", 12, 25),
  ];

  return result;
}

// ── Pre-computed dataset ─────────────────────────────────────────────────────

/**
 * All US federal holidays for 2020–2035, in chronological order.
 */
export const US_FEDERAL_HOLIDAYS: FederalHoliday[] = (() => {
  const all: FederalHoliday[] = [];
  for (let y = HOLIDAY_YEAR_RANGE.start; y <= HOLIDAY_YEAR_RANGE.end; y++) {
    for (const h of holidaysForYear(y)) {
      all.push(h);
    }
  }
  all.sort((a, b) => a.date.localeCompare(b.date));
  return all;
})();

/**
 * Fast lookup set: observed ISO dates of all US federal holidays 2020–2035.
 */
export const HOLIDAY_DATE_SET: ReadonlySet<string> = new Set(
  US_FEDERAL_HOLIDAYS.map((h) => h.date)
);
