# @agentoolbox/health — Specification

## Overview

A Tier-1 Agentoolbox tool that provides deterministic, offline medication safety
checking. The function `rxCheck` accepts a list of medications with optional dose
and unit information, and returns a structured verdict (PASS / FLAG / BLOCK) along
with individual findings, counts, a signed certificate, and a mandatory disclaimer.

## Design principles

- **Pure function**: no network calls, no global state, no side effects.
- **Deterministic**: identical inputs produce structurally identical results (the
  certificate timestamp will differ per-call but the computation is not random).
- **Offline**: all reference data is bundled as typed TypeScript modules.
- **Safe by default**: unknown drugs produce informational findings rather than
  silently passing or crashing.
- **Never medical advice**: every result carries a mandatory disclaimer.

## Public API

```
rxCheck(input: RxCheckInput): RxCheckResult
```

### Input

```ts
interface RxCheckInput {
  medications: Array<{
    name: string;           // generic or brand name
    dose?: number;          // dose per administration
    unit?: string;          // e.g. "mg", "mcg", "ml", "units"
    route?: string;         // informational only
    frequencyPerDay?: number;
  }>;
  patient?: {
    weightKg?: number;      // enables paediatric weight-based dose checks
    ageYears?: number;      // reserved
  };
  policy?: {
    blockSeverityAtOrAbove?: "moderate" | "major" | "contraindicated";
    // Default: "major"
  };
}
```

### Output

```ts
interface RxCheckResult {
  verdict: "PASS" | "FLAG" | "BLOCK";
  findings: RxFinding[];
  counts: Record<"low" | "moderate" | "major" | "contraindicated", number>;
  certificate: string;   // "sha256:<64-hex-chars>"
  latencyMs: number;
  disclaimer: string;
}

interface RxFinding {
  type: "unit" | "dose" | "interaction";
  severity: "low" | "moderate" | "major" | "contraindicated";
  drugs: string[];       // generic names
  message: string;
  reference?: string;
}
```

## Checks

### 1. Unit check

For each medication where a unit is provided:

1. Normalise the unit string (e.g. "micrograms" → "mcg", "milligrams" → "mg").
2. Compare to the drug's `canonicalUnit` in the reference database.
3. If they differ:
   - Unknown unit → `moderate` severity finding.
   - Known unit, same unit type, different canonical (e.g. "g" for an "mg" drug)
     → `major` severity finding.
   - Known unit, different unit type (e.g. "ml" for a mass-dosed drug)
     → `major` severity finding.
   - mcg/mg magnitude error (1000× risk) → `major` severity finding with explicit
     "1000×" language in the message.
4. When a unit finding is emitted, dose checking is skipped for that drug.

### 2. Dose check

For each medication where `dose`, `unit` (matching canonical), and `frequencyPerDay`
are all provided:

1. Compute `totalDailyDose = dose × frequencyPerDay`.
2. Compare to `record.maxDailyDose.value` (if present):
   - `totalDailyDose > maxDailyDose` → `major`
   - `totalDailyDose ≥ 2 × maxDailyDose` → `contraindicated`
3. If `patient.weightKg` is provided and `record.pediatricMgPerKgPerDay` is present:
   - Compute `maxPediatricDose = max × weightKg`
   - `totalDailyDose > maxPediatricDose` → `major`

### 3. Interaction check

Performed after all per-drug checks:

1. Build a list of generic names (one per input medication, brand names resolved).
2. Iterate all pairs `(i, j)` where `i < j`.
3. Look up the pair in the interaction map (order-independent key).
4. For each match, emit a finding with the interaction's severity.

## Verdict logic

```
maxSeverityRank = max(severityRank(finding) for finding in findings)
blockRank       = severityRank(policy.blockSeverityAtOrAbove ?? "major")

if findings.length == 0:            verdict = "PASS"
elif maxSeverityRank >= blockRank:  verdict = "BLOCK"
else:                               verdict = "FLAG"
```

Severity ranks: low=0, moderate=1, major=2, contraindicated=3.

## Certificate

```
subject   = JSON.stringify(sorted unique generic names)
preimage  = sha256(subject) + ":" + verdict + ":" + findingCount + ":" + timestamp
cert      = "sha256:" + sha256(preimage)
```

## Reference datasets

### `src/data/medications.ts`

~80 common medications. Each record:

```ts
{ generic, brands[], unitType, canonicalUnit, maxDailyDose?, pediatricMgPerKgPerDay? }
```

Sources: FDA drug labelling, OpenFDA, standard clinical references.

### `src/data/interactions.ts`

~90 well-established drug-drug interaction pairs. Each record:

```ts
{ a, b, severity, mechanism, reference? }
```

Sources: FDA drug labelling, FDA Safety Communications, public medical literature.

## Test cases (required)

| Scenario | Expected verdict |
|---|---|
| warfarin + ibuprofen | BLOCK (major interaction) |
| phenelzine + fluoxetine (MAOI + SSRI) | BLOCK (contraindicated) |
| acetaminophen 1000 mg × 6/day | BLOCK (major dose) |
| levothyroxine 100 mg (should be mcg) | BLOCK (unit error) |
| amoxicillin 500 mg × 3/day | PASS |
| unknown drug | graceful (no crash), informational finding |
| certificate | present, `sha256:[0-9a-f]{64}` format |
| disclaimer | present, states result is not medical advice |

## Disclaimer

> This specification describes informational software only. The tool and its datasets
> do NOT constitute medical advice. All reference data may be incomplete or out of
> date. Always consult a qualified healthcare professional.
