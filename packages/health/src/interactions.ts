import type { RxFinding } from "./types.js";
import { INTERACTIONS, type InteractionRecord } from "./data/interactions.js";

// ---------------------------------------------------------------------------
// Build an order-independent pair lookup map at module load time.
// Key format: two generic names sorted alphabetically, joined with ":"
// ---------------------------------------------------------------------------

function pairKey(a: string, b: string): string {
  return a <= b ? `${a}:${b}` : `${b}:${a}`;
}

const interactionMap = new Map<string, InteractionRecord>();

for (const record of INTERACTIONS) {
  const key = pairKey(record.a, record.b);
  // If duplicate keys exist, keep the higher-severity entry.
  const existing = interactionMap.get(key);
  if (existing === undefined) {
    interactionMap.set(key, record);
  } else {
    const rank = (s: string): number =>
      s === "contraindicated" ? 3 : s === "major" ? 2 : 1;
    if (rank(record.severity) > rank(existing.severity)) {
      interactionMap.set(key, record);
    }
  }
}

/**
 * Performs pairwise drug-interaction checks over a list of generic drug names.
 *
 * Returns one finding per interacting pair found in the reference dataset.
 * Unknown drugs produce no interaction findings (they may have separate "unknown
 * drug" findings from the caller).
 */
export function checkInteractions(generics: string[]): RxFinding[] {
  const findings: RxFinding[] = [];

  for (let i = 0; i < generics.length; i++) {
    const a = generics[i];
    if (a === undefined) continue;

    for (let j = i + 1; j < generics.length; j++) {
      const b = generics[j];
      if (b === undefined) continue;

      const record = interactionMap.get(pairKey(a, b));
      if (record === undefined) continue;

      findings.push({
        type: "interaction",
        severity: record.severity,
        drugs: [a, b],
        message: record.mechanism,
        ...(record.reference !== undefined ? { reference: record.reference } : {}),
      });
    }
  }

  return findings;
}
