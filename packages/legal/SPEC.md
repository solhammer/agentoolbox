# @agentoolbox/legal — Specification

## Overview

`@agentoolbox/legal` exposes two deterministic, offline, stateless functions with
signed verdicts.  No network calls are made at any time.

---

## 1. `checkCitation`

### Signature

```typescript
function checkCitation(input: CitationInput): CitationResult
```

### Input

```typescript
interface CitationInput {
  citation?: string;   // single citation string
  citations?: string[]; // multiple citation strings
  sourceText?: string; // document to search for the quote
  quote?: string;      // expected verbatim passage
}
```

At least one of `citation` or `citations` must be provided (throws otherwise).

### Parsing

US case citations must follow the Bluebook short-form:

```
<volume:integer> <reporter:text> <page:integer> (<year:4-digit>)
```

Examples: `347 U.S. 483 (1954)`, `56 F. Supp. 2d 789 (2001)`.

The regex used: `^(\d+)\s+(.+)\s+(\d+)\s*\(\s*(\d{4})\s*\)$` (greedy reporter).

### Validation rules

| Check | Issue text prefix | Severity |
|---|---|---|
| Regex does not match | `"malformed citation structure"` | Hard → BLOCK |
| Year < 1754 or > current year | `"implausible year"` | Hard → BLOCK |
| Reporter not in bundled table | `"unknown reporter"` | Soft → FLAG |

### Quote-fidelity check

Performed only when both `sourceText` and `quote` are provided.

Algorithm:
1. Lower-case both strings
2. Collapse whitespace runs to a single space and trim
3. Check whether the normalised quote is a substring of the normalised source

If not found: `quoteCheck.found = false` → contributes BLOCK to verdict.

### Verdict derivation

1. Any hard issue in any citation → **BLOCK**
2. Quote check failed → **BLOCK**
3. Any soft issue in any citation → **FLAG**
4. Otherwise → **PASS**

### Output

```typescript
interface CitationResult {
  verdict: "PASS" | "FLAG" | "BLOCK";
  citations: Array<{
    raw: string;
    parsed?: { volume: number; reporter: string; page: number; year: number };
    valid: boolean;
    issues: string[];
  }>;
  quoteCheck?: { found: boolean; message: string };
  counts: { total: number; invalid: number };
  certificate: string; // sha256:<hex>
  latencyMs: number;
}
```

---

## 2. `computeDeadline`

### Signature

```typescript
function computeDeadline(input: DeadlineInput): DeadlineResult
```

### Input

```typescript
interface DeadlineInput {
  start: string;          // ISO 8601 date (YYYY-MM-DD)
  days: number;           // non-negative integer
  mode?: "court" | "calendar"; // default "calendar"
  direction?: "after" | "before"; // default "after"
  jurisdiction?: string;  // reserved; currently ignored
}
```

### Counting rules

**`calendar` mode**: deadline = start ± `days` calendar days.

**`court` mode**:
- Skip every Saturday and Sunday.
- Skip every US federal holiday (observed date) from the bundled 2020–2035 dataset.
- Count only the remaining non-skipped days toward `days`.
- Holidays are sorted and deduplicated by date in `skipped.holidays`.

The start date itself is never counted; only subsequent days are.

### Bundled holidays (court mode)

Deterministically generated for 2020–2035 using standard US federal rules:

| Holiday | Rule |
|---|---|
| New Year's Day | Jan 1 (observed) |
| Martin Luther King Jr. Day | 3rd Monday, January |
| Presidents' Day | 3rd Monday, February |
| Memorial Day | Last Monday, May |
| Juneteenth | Jun 19 (observed; from 2021) |
| Independence Day | Jul 4 (observed) |
| Labor Day | 1st Monday, September |
| Columbus Day | 2nd Monday, October |
| Veterans Day | Nov 11 (observed) |
| Thanksgiving Day | 4th Thursday, November |
| Christmas Day | Dec 25 (observed) |

Observed-day rule: Saturday → preceding Friday; Sunday → following Monday.

### BLOCK conditions

| Condition | Reason |
|---|---|
| `start` not a valid YYYY-MM-DD date | bad date |
| `days` < 0 or non-integer | negative / fractional days |
| `mode = "court"` and start year outside [2020, 2035] | out-of-range year |

### Output

```typescript
interface DeadlineResult {
  verdict: "PASS" | "BLOCK";
  deadline: string;         // ISO 8601 date
  startDate: string;        // normalised ISO 8601 date
  daysRequested: number;
  mode: "court" | "calendar";
  direction: "after" | "before";
  skipped: {
    weekends: number;
    holidays: string[];     // ISO dates of skipped federal holidays
  };
  certificate: string;      // sha256:<hex>
  latencyMs: number;
}
```

---

## Certificate format

```
sha256:<sha256hex(sha256hex(subject) + ":" + verdict + ":" + findings + ":" + timestamp)>
```

Where:
- `subject`: JSON array of raw citation strings (checkCitation) or
  `"startISO::days::mode::direction"` (computeDeadline)
- `verdict`: `"PASS"`, `"FLAG"`, or `"BLOCK"`
- `findings`: count of invalid citations (checkCitation) or `1` for BLOCK / `0` for PASS (computeDeadline)
- `timestamp`: `Date.now()` at the time of signing

---

## Design constraints

- **Deterministic**: same logical input always produces the same verdict and parsed fields.
- **Offline**: no network calls, no file I/O (data is bundled as typed `.ts` modules).
- **Stateless**: no module-level mutable state beyond pre-computed constants.
- **Pure TypeScript**: compiled with `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.
