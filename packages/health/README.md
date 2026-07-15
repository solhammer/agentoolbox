# @agentoolbox/health — Medication Safety Gate

A pure, deterministic, offline medication safety checker for AI agents.

No network calls · No state · No external dependencies

## Quick start

```ts
import { rxCheck } from "@agentoolbox/health";

const result = rxCheck({
  medications: [
    { name: "warfarin", dose: 5, unit: "mg", frequencyPerDay: 1 },
    { name: "ibuprofen", dose: 400, unit: "mg", frequencyPerDay: 3 },
  ],
});

console.log(result.verdict);      // "BLOCK"
console.log(result.disclaimer);   // informational disclaimer
console.log(result.certificate);  // "sha256:..."
```

## API

### `rxCheck(input: RxCheckInput): RxCheckResult`

| Field | Type | Description |
|---|---|---|
| `medications` | `MedicationInput[]` | List of medications to evaluate |
| `patient?` | `PatientInput` | Optional patient context (weight for paediatric checks) |
| `policy?` | `PolicyInput` | Optional enforcement policy |

#### `MedicationInput`

| Field | Description |
|---|---|
| `name` | Generic or brand name (brand names are resolved to generics) |
| `dose?` | Dose per administration |
| `unit?` | Unit string (`"mg"`, `"mcg"`, `"ml"`, `"units"`, etc.) |
| `frequencyPerDay?` | Number of administrations per day |
| `route?` | Route of administration (informational, not checked) |

#### `PolicyInput`

| Field | Default | Description |
|---|---|---|
| `blockSeverityAtOrAbove` | `"major"` | Minimum severity that yields a BLOCK verdict |

### `RxCheckResult`

| Field | Type | Description |
|---|---|---|
| `verdict` | `"PASS" \| "FLAG" \| "BLOCK"` | Safety verdict |
| `findings` | `RxFinding[]` | Individual safety issues detected |
| `counts` | `Record<Severity, number>` | Finding counts per severity level |
| `certificate` | `string` | Tamper-evident `sha256:<hex>` certificate |
| `latencyMs` | `number` | Wall-clock time (ms) |
| `disclaimer` | `string` | Mandatory disclaimer |

## Checks performed

### Unit check
Detects unit inconsistencies against the drug's canonical unit (e.g. prescribing
levothyroxine in "mg" when the canonical unit is "mcg" — a 1000× magnitude error).

**Severity:** `major` for known-unit mismatches; `moderate` for completely unknown units.

### Dose check
Compares `dose × frequencyPerDay` against the drug's maximum recommended daily dose:
- `> maxDailyDose` → `major`
- `≥ 2 × maxDailyDose` → `contraindicated`

Weight-based paediatric dose checks are also performed when `patient.weightKg` is
provided and the drug has paediatric data.

### Interaction check
Pairwise screening of all medications against ~90 well-established drug interaction pairs
(derived from FDA drug labelling and FDA Safety Communications).

## Datasets

| File | Records | Description |
|---|---|---|
| `src/data/medications.ts` | ~80 | Common medications with canonical units, max daily doses, and paediatric dosing ranges |
| `src/data/interactions.ts` | ~90 | Well-established drug-drug interaction pairs |

## Verdict logic

| Max finding severity | Default policy | Verdict |
|---|---|---|
| None | — | PASS |
| `low` or `moderate` | `blockSeverityAtOrAbove: "major"` | FLAG |
| `major` | `blockSeverityAtOrAbove: "major"` | BLOCK |
| `contraindicated` | any | BLOCK |

## DISCLAIMER

> **This package is informational only and does NOT constitute medical advice.**
> Dataset values are derived from publicly available FDA labelling and clinical
> references but may be incomplete, out of date, or inapplicable to specific
> patient populations. Always consult a qualified healthcare professional before
> making any medication decision. The authors assume no liability for clinical
> outcomes.
