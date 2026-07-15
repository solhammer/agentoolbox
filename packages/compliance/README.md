# @agentoolbox/compliance

Deterministic **sanctions / restricted-party screening** for AI agents. Screens
names against a bundled snapshot of OFAC lists using exact, alias, and fuzzy
(token-sorted Jaro-Winkler) matching, and returns a `PASS` / `FLAG` / `BLOCK`
verdict with a signed certificate. No network calls, no state.

```ts
import { screenSanctions } from "@agentoolbox/compliance";

const r = screenSanctions({ name: "Wagner Group" });
// r.verdict === "BLOCK"
// r.matches[0] === { listedName: "Wagner Group", score: 1, matchType: "exact", list: "OFAC-SDN", ... }
```

## Verdicts

- **BLOCK** — an exact/alias match, or a fuzzy match scoring ≥ 0.92.
- **FLAG** — a fuzzy match scoring ≥ 0.85 and < 0.92 (review recommended).
- **PASS** — no match at or above the reporting floor.

## Options

- `name` / `names` — one or more names to screen (at least one required).
- `minScore` — reporting floor for fuzzy matches (default 0.85). Exact/alias always report at 1.0.
- `lists` — restrict to source lists (e.g. `["OFAC-SDN"]`).
- `entityTypes` — restrict to `individual` / `entity` / `vessel` / `aircraft`.
- `fuzzy` — set `false` for exact/alias only.

## Data

The bundled dataset (`src/data/ofac.ts`) is a **curated, representative sample**
of well-known OFAC designations for offline, deterministic operation and tests —
it is **not** the complete authoritative list. Regenerate a full normalized
snapshot from the official OFAC sources with `scripts/refresh-sanctions.ts`
(see `SPEC.md`).

> This tool is an aid, not legal advice. Always confirm potential matches against
> the official OFAC records before acting.
