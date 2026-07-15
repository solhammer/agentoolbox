import { generateCertificate } from "./certificate.js";
import { jaroWinkler } from "./match.js";
import { normalizeName, tokenSortKey } from "./normalize.js";
import { OFAC_RECORDS, OFAC_SNAPSHOT_DATE } from "./data/ofac.js";
import type {
  EntityType,
  MatchType,
  SanctionMatch,
  SanctionRecord,
  SanctionsInput,
  SanctionsResult,
  Verdict,
} from "./types.js";

/** Fuzzy score at or above which a match is treated as block-grade. */
const BLOCK_AT = 0.92;
/** Default reporting floor for fuzzy matches. */
const DEFAULT_FLAG_FLOOR = 0.85;

interface PreparedName {
  raw: string;
  norm: string;
  sortKey: string;
  isAlias: boolean;
}

interface PreparedRecord {
  record: SanctionRecord;
  names: PreparedName[];
}

/** Precompute normalized forms of every record once at module load. */
const PREPARED: PreparedRecord[] = OFAC_RECORDS.map((record) => {
  const names: PreparedName[] = [];
  const primaryNorm = normalizeName(record.name);
  names.push({ raw: record.name, norm: primaryNorm, sortKey: tokenSortKey(primaryNorm), isAlias: false });
  for (const alias of record.aliases) {
    const aliasNorm = normalizeName(alias);
    names.push({ raw: alias, norm: aliasNorm, sortKey: tokenSortKey(aliasNorm), isAlias: true });
  }
  return { record, names };
});

function passesFilters(
  record: SanctionRecord,
  listFilter: Set<string> | null,
  typeFilter: Set<EntityType> | null
): boolean {
  if (listFilter !== null && !listFilter.has(record.list)) return false;
  if (typeFilter !== null && !typeFilter.has(record.entityType)) return false;
  return true;
}

function buildMatch(
  query: string,
  record: SanctionRecord,
  score: number,
  matchType: MatchType,
  matchedAlias: string | undefined
): SanctionMatch {
  return {
    query,
    listedName: record.name,
    score: Number(score.toFixed(4)),
    matchType,
    list: record.list,
    entityType: record.entityType,
    ...(matchedAlias !== undefined ? { matchedAlias } : {}),
    ...(record.program !== undefined ? { program: record.program } : {}),
    ...(record.id !== undefined ? { id: record.id } : {}),
    ...(record.jurisdiction !== undefined ? { jurisdiction: record.jurisdiction } : {}),
  };
}

function screenOne(
  query: string,
  fuzzy: boolean,
  flagFloor: number,
  listFilter: Set<string> | null,
  typeFilter: Set<EntityType> | null
): SanctionMatch[] {
  const qNorm = normalizeName(query);
  if (qNorm.length === 0) return [];
  const qSort = tokenSortKey(qNorm);
  const matches: SanctionMatch[] = [];

  for (const prep of PREPARED) {
    if (!passesFilters(prep.record, listFilter, typeFilter)) continue;

    // Exact (or alias-exact) match wins outright.
    let exact: PreparedName | undefined;
    for (const n of prep.names) {
      if (n.norm === qNorm) {
        exact = n;
        break;
      }
    }
    if (exact !== undefined) {
      matches.push(
        buildMatch(query, prep.record, 1, exact.isAlias ? "alias" : "exact", exact.isAlias ? exact.raw : undefined)
      );
      continue;
    }

    if (!fuzzy) continue;

    // Otherwise take the best fuzzy score across name + aliases.
    let bestScore = 0;
    let bestName: PreparedName | undefined;
    for (const n of prep.names) {
      const s = jaroWinkler(qSort, n.sortKey);
      if (s > bestScore) {
        bestScore = s;
        bestName = n;
      }
    }
    if (bestName !== undefined && bestScore >= flagFloor) {
      matches.push(
        buildMatch(query, prep.record, bestScore, "fuzzy", bestName.isAlias ? bestName.raw : undefined)
      );
    }
  }

  return matches;
}

/**
 * Sanctions / restricted-party screening.
 *
 * Deterministically screens one or more names against the bundled OFAC
 * snapshot using exact, alias-exact, and fuzzy (token-sorted Jaro-Winkler)
 * matching, and returns a PASS/FLAG/BLOCK verdict with a signed certificate.
 * No network calls and no state.
 */
export function screenSanctions(input: SanctionsInput): SanctionsResult {
  const start = Date.now();

  const queries: string[] = [];
  if (input.name !== undefined) queries.push(input.name);
  if (input.names !== undefined) queries.push(...input.names);
  if (queries.length === 0) {
    throw new Error("screenSanctions: provide `name` or `names`.");
  }

  const fuzzy = input.fuzzy !== false;
  const flagFloor = input.minScore ?? DEFAULT_FLAG_FLOOR;
  const listFilter = input.lists !== undefined && input.lists.length > 0 ? new Set(input.lists) : null;
  const typeFilter =
    input.entityTypes !== undefined && input.entityTypes.length > 0 ? new Set(input.entityTypes) : null;

  let screened = 0;
  for (const prep of PREPARED) {
    if (passesFilters(prep.record, listFilter, typeFilter)) screened++;
  }

  const matches: SanctionMatch[] = [];
  for (const q of queries) {
    for (const m of screenOne(q, fuzzy, flagFloor, listFilter, typeFilter)) {
      matches.push(m);
    }
  }
  matches.sort((a, b) => b.score - a.score);

  let block = 0;
  let flag = 0;
  for (const m of matches) {
    if (m.score >= BLOCK_AT) block++;
    else flag++;
  }

  let verdict: Verdict = "PASS";
  if (block > 0) verdict = "BLOCK";
  else if (flag > 0) verdict = "FLAG";

  const timestamp = Date.now();
  const subject = JSON.stringify(queries.map((q) => normalizeName(q)).sort());
  const certificate = generateCertificate(subject, verdict, matches.length, timestamp);

  return {
    verdict,
    matches,
    counts: { total: matches.length, block, flag },
    screened,
    datasetDate: OFAC_SNAPSHOT_DATE,
    certificate,
    latencyMs: Date.now() - start,
  };
}
