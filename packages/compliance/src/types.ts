export type Verdict = "PASS" | "FLAG" | "BLOCK";

/** The kind of party a listed record represents. */
export type EntityType = "individual" | "entity" | "vessel" | "aircraft" | "unknown";

/** How a match was produced. */
export type MatchType = "exact" | "alias" | "fuzzy";

/** A single restricted-party record in the bundled snapshot. */
export interface SanctionRecord {
  /** Stable identifier (e.g. OFAC SDN UID) when available. */
  id?: string;
  /** Primary listed name. */
  name: string;
  /** Known aliases / a.k.a. names (may be empty). */
  aliases: string[];
  /** Sanctions program code(s), e.g. "SDGT", "IRAN", "RUSSIA". */
  program?: string;
  /** Party type. */
  entityType: EntityType;
  /** Source list, e.g. "OFAC-SDN" or "OFAC-CONSOLIDATED". */
  list: string;
  /** ISO-3166 country / jurisdiction when known. */
  jurisdiction?: string;
}

export interface SanctionsInput {
  /** A single name to screen. */
  name?: string;
  /** Multiple names to screen in one call. */
  names?: string[];
  /**
   * Minimum fuzzy score (0..1) required to report a match.
   * Overrides the default reporting floor (0.85). Exact/alias matches
   * (score 1.0) are always reported.
   */
  minScore?: number;
  /** Restrict screening to these source lists (e.g. ["OFAC-SDN"]). */
  lists?: string[];
  /** Restrict screening to these entity types. */
  entityTypes?: EntityType[];
  /** Enable fuzzy matching. Default true. Set false for exact/alias only. */
  fuzzy?: boolean;
}

export interface SanctionMatch {
  /** The input name that produced this match. */
  query: string;
  /** The primary listed name of the matched record. */
  listedName: string;
  /** The specific alias that matched, when the match was on an alias. */
  matchedAlias?: string;
  /** Match score, 0..1 (1 = exact). */
  score: number;
  /** How the match was produced. */
  matchType: MatchType;
  /** Source list of the matched record. */
  list: string;
  /** Sanctions program code(s) of the matched record. */
  program?: string;
  /** Party type of the matched record. */
  entityType: EntityType;
  /** Record identifier of the matched record when available. */
  id?: string;
  /** Jurisdiction of the matched record when known. */
  jurisdiction?: string;
}

export interface SanctionsResult {
  /** PASS — no matches; FLAG — only sub-block fuzzy matches; BLOCK — a block-grade match. */
  verdict: Verdict;
  /** All matches across every screened name, sorted by score descending. */
  matches: SanctionMatch[];
  /** Match tallies. */
  counts: { total: number; block: number; flag: number };
  /** Number of records screened against, after list/entityType filters. */
  screened: number;
  /** Snapshot date (ISO) of the bundled dataset. */
  datasetDate: string;
  /** Tamper-evident certificate: `sha256:<hex>` bound to the queries, verdict, match count, and timestamp. */
  certificate: string;
  latencyMs: number;
}
