# Sanctions Screening — Technical Specification

## Purpose
Provide a deterministic, offline gate that screens party names against sanctions
/ restricted-party lists before an agent transacts, onboards, ships, pays, or
hires. Extends the toolbox from finance into compliance.

## API
`screenSanctions(input: SanctionsInput): SanctionsResult`

### Input
- `name?: string`, `names?: string[]` — at least one required.
- `minScore?: number` — fuzzy reporting floor (default `0.85`).
- `lists?: string[]` — source-list filter (e.g. `OFAC-SDN`, `OFAC-CONSOLIDATED`).
- `entityTypes?: EntityType[]` — `individual` | `entity` | `vessel` | `aircraft` | `unknown`.
- `fuzzy?: boolean` — default `true`.

### Output
- `verdict`: `PASS` | `FLAG` | `BLOCK`.
- `matches[]`: `{ query, listedName, matchedAlias?, score, matchType, list, program?, entityType, id?, jurisdiction? }`, sorted by score desc.
- `counts`: `{ total, block, flag }`.
- `screened`: number of records considered after filters.
- `datasetDate`: ISO snapshot date.
- `certificate`: `sha256:<hex>` binding the normalized queries + verdict + match count + timestamp.
- `latencyMs`.

## Matching
1. Normalize: NFKD → strip diacritics → uppercase → drop punctuation → collapse whitespace.
2. Exact: normalized query equals a record's normalized primary name → `exact`; equals a normalized alias → `alias`. Score `1.0`.
3. Fuzzy: token-sort both sides (drop org suffixes, sort tokens) and score with Jaro-Winkler.
   - `≥ 0.92` → block-grade.
   - `≥ max(minScore, 0.85)` and `< 0.92` → flag-grade.
4. Verdict = worst grade across all matches.

## Data pipeline
The bundled `src/data/ofac.ts` is a **curated representative sample** (public
information) so the package is deterministic and testable offline. It is **not**
the full authoritative list.

Regenerate a complete normalized snapshot:

```
# from the repo root
npx tsx scripts/refresh-sanctions.ts
```

The script fetches the official Treasury sources and rewrites `src/data/ofac.ts`:
- SDN: `https://www.treasury.gov/ofac/downloads/sdn.csv` + `.../alt.csv`
- Consolidated: `https://www.treasury.gov/ofac/downloads/consolidated/cons_prim.csv` + `.../cons_alt.csv`

Additional authorities (EU, UN, UK OFSI, BIS Entity List) can be added later
under the same `SanctionRecord` schema and surfaced via the `lists` filter.

## Determinism & limitations
- Pure function; identical inputs (excluding the certificate timestamp) yield identical verdicts/matches.
- Screening quality is bounded by the snapshot's coverage and freshness.
- Not legal advice; potential matches must be confirmed against official records.
