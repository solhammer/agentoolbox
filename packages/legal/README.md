# @agentoolbox/legal

Deterministic, offline legal-suite tools for AI agents.

## Functions

### `checkCitation(input: CitationInput): CitationResult`

Validates one or more US case citations and optionally checks quote fidelity.

- Parses citations of the form `"<volume> <reporter> <page> (<year>)"`  
  (e.g. `"347 U.S. 483 (1954)"`)
- Validates reporter against a bundled table of 150+ known Bluebook abbreviations
- Flags implausible years (< 1754 or > current year)
- Flags non-numeric or missing volume/page/year as malformed
- Optionally checks whether a `quote` appears verbatim in `sourceText` (normalised
  case- and whitespace-insensitive substring match)

**Verdict logic:**
| Condition | Verdict |
|---|---|
| Malformed structure or implausible year | BLOCK |
| Quote not found in source text | BLOCK |
| Unknown but well-formed reporter | FLAG |
| All checks pass | PASS |

### `computeDeadline(input: DeadlineInput): DeadlineResult`

Counts court or calendar days from a start date and returns the resolved deadline.

- **`calendar`** mode counts every calendar day (default)
- **`court`** mode skips weekends and US federal holidays (bundled dataset 2020–2035)
- `direction` can be `"after"` (default) or `"before"`
- Returns `BLOCK` on invalid dates, negative days, or out-of-range start year
  (court mode only)

## Bundled data

- **Reporter table** (`src/data/reporters.ts`): 150+ known Bluebook abbreviations
  (federal, regional, and state reporters)
- **Holiday dataset** (`src/data/holidays.ts`): US federal holidays 2020–2035,
  generated deterministically with Saturday → Friday / Sunday → Monday observed-day
  rules; includes Juneteenth from 2021 onward

## Certificate format

Every result includes a tamper-evident `certificate` field:

```
sha256:<hex(sha256(sha256(subject):verdict:findings:timestamp))>
```

## Usage

```typescript
import { checkCitation, computeDeadline } from "@agentoolbox/legal";

// Citation validation
const citResult = checkCitation({ citation: "347 U.S. 483 (1954)" });
// { verdict: "PASS", citations: [...], counts: { total: 1, invalid: 0 }, ... }

// Quote-fidelity check
const qResult = checkCitation({
  citation: "347 U.S. 483 (1954)",
  sourceText: "...separate but equal has no place...",
  quote: "separate but equal has no place",
});

// Deadline computation
const deadline = computeDeadline({
  start: "2025-01-17",
  days: 1,
  mode: "court",
  direction: "after",
});
// { verdict: "PASS", deadline: "2025-01-21", ... }
```

## Development

```bash
pnpm build      # compile to dist/
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
```
