import { generateCertificate } from "./certificate.js";
import { checkUnit, checkDose } from "./doses.js";
import { checkInteractions } from "./interactions.js";
import { normalizeToGeneric } from "./normalize.js";
import { MEDICATIONS } from "./data/medications.js";
import type {
  BlockSeverity,
  RxCheckInput,
  RxCheckResult,
  RxFinding,
  Severity,
  Verdict,
} from "./types.js";

// ---------------------------------------------------------------------------
// Medication reference lookup map (built once at module load time)
// ---------------------------------------------------------------------------

const MED_MAP = new Map(MEDICATIONS.map((m) => [m.generic, m]));

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

function severityRank(s: Severity): number {
  switch (s) {
    case "low": return 0;
    case "moderate": return 1;
    case "major": return 2;
    case "contraindicated": return 3;
  }
}

function blockThresholdRank(t: BlockSeverity): number {
  switch (t) {
    case "moderate": return 1;
    case "major": return 2;
    case "contraindicated": return 3;
  }
}

// ---------------------------------------------------------------------------
// Mandatory disclaimer
// ---------------------------------------------------------------------------

const DISCLAIMER =
  "This result is informational only and does not constitute medical advice. " +
  "Always consult a qualified healthcare professional before making any medication decisions.";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Medication Safety Gate.
 *
 * Performs deterministic, offline safety checks for a list of medications:
 *  - Unit consistency (canonical unit vs. provided unit)
 *  - Dose range (total daily dose vs. known maximum)
 *  - Drug-drug interaction screening (pairwise, ~90 well-established pairs)
 *
 * Returns a PASS / FLAG / BLOCK verdict with a signed certificate.
 * No network calls, no external state, no side effects.
 */
export function rxCheck(input: RxCheckInput): RxCheckResult {
  const start = Date.now();

  const blockThreshold: BlockSeverity =
    input.policy?.blockSeverityAtOrAbove ?? "major";
  const blockRank = blockThresholdRank(blockThreshold);
  const weightKg = input.patient?.weightKg;

  const findings: RxFinding[] = [];
  /** Generic names corresponding to input.medications (same order). */
  const generics: string[] = [];

  // ─── Per-drug checks (unit, dose) ────────────────────────────────────────

  for (const med of input.medications) {
    const generic = normalizeToGeneric(med.name);
    generics.push(generic);

    const record = MED_MAP.get(generic);

    if (record === undefined) {
      // Unknown drug — informational finding; never crash.
      findings.push({
        type: "dose",
        severity: "low",
        drugs: [generic],
        message: `Medication "${med.name}" is not in the reference database. Manual review by a pharmacist is recommended.`,
      });
      continue;
    }

    // --- Unit check ---------------------------------------------------------
    let unitOk = true;
    if (med.unit !== undefined) {
      const unitFinding = checkUnit(generic, med.unit, record);
      if (unitFinding !== undefined) {
        findings.push(unitFinding);
        unitOk = false; // Skip dose check when unit is wrong to avoid noise.
      }
    }

    // --- Dose check ---------------------------------------------------------
    // Only check dose when: dose + frequency are both provided AND unit is OK
    // (if no unit was given, assume canonical unit for the dose comparison).
    if (unitOk && med.dose !== undefined && med.frequencyPerDay !== undefined) {
      // Ensure we are comparing in the canonical unit.
      // If a unit was supplied and matched, normalizeUnit(med.unit) === canonicalUnit.
      // If no unit was supplied, we treat the dose as being in canonical units.
      const doseFindings = checkDose(
        generic,
        med.dose,
        med.frequencyPerDay,
        record,
        weightKg
      );
      for (const f of doseFindings) {
        findings.push(f);
      }
    }
  }

  // ─── Pairwise interaction checks ─────────────────────────────────────────

  const interactionFindings = checkInteractions(generics);
  for (const f of interactionFindings) {
    findings.push(f);
  }

  // ─── Verdict ──────────────────────────────────────────────────────────────

  let maxRank = -1;
  const counts: Record<Severity, number> = {
    low: 0,
    moderate: 0,
    major: 0,
    contraindicated: 0,
  };

  for (const f of findings) {
    counts[f.severity] += 1;
    const r = severityRank(f.severity);
    if (r > maxRank) maxRank = r;
  }

  let verdict: Verdict;
  if (findings.length === 0) {
    verdict = "PASS";
  } else if (maxRank >= blockRank) {
    verdict = "BLOCK";
  } else {
    verdict = "FLAG";
  }

  // ─── Certificate ─────────────────────────────────────────────────────────

  // Subject = sorted, deduplicated generic names (order-independent).
  const subject = JSON.stringify([...new Set(generics)].sort());
  const timestamp = Date.now();
  const certificate = generateCertificate(subject, verdict, findings.length, timestamp);

  return {
    verdict,
    findings,
    counts,
    certificate,
    latencyMs: Date.now() - start,
    disclaimer: DISCLAIMER,
  };
}
