import type { MedicationRecord } from "./data/medications.js";
import type { RxFinding } from "./types.js";
import { normalizeUnit, KNOWN_UNITS, VALID_UNITS_FOR_TYPE } from "./normalize.js";

/**
 * Checks for unit inconsistencies for a single medication.
 *
 * Returns a finding (or nothing) without modifying the unit check state.
 * A unit finding means dose checking should be skipped for that drug.
 */
export function checkUnit(
  generic: string,
  rawUnit: string,
  record: MedicationRecord
): RxFinding | undefined {
  const normalized = normalizeUnit(rawUnit);

  if (normalized === record.canonicalUnit) {
    // Unit matches canonical — no issue.
    return undefined;
  }

  // Determine the nature of the mismatch.
  const validForType = VALID_UNITS_FOR_TYPE[record.unitType];
  const isValidForType = validForType.includes(normalized);
  const isKnown = KNOWN_UNITS.has(normalized);

  if (!isKnown) {
    // Completely unrecognised unit — informational finding.
    return {
      type: "unit",
      severity: "moderate",
      drugs: [generic],
      message: `Unrecognised unit "${rawUnit}" for ${generic} (expected: ${record.canonicalUnit}). Verify the prescription before dispensing.`,
    };
  }

  // Known unit that still doesn't match canonical — potentially dangerous.
  // Special-case the most dangerous confusion: canonical is "mcg" but "mg" was
  // provided (or vice-versa), which represents a 1000× magnitude error.
  const isMagnitudeError =
    (record.canonicalUnit === "mcg" && normalized === "mg") ||
    (record.canonicalUnit === "mg" && normalized === "mcg");

  if (isMagnitudeError) {
    const factor =
      record.canonicalUnit === "mcg" && normalized === "mg" ? 1000 : "1/1000";
    return {
      type: "unit",
      severity: "major",
      drugs: [generic],
      message: `Unit "${rawUnit}" is inconsistent with the canonical unit "${record.canonicalUnit}" for ${generic}. This likely represents a ${factor}× dosing magnitude error — verify immediately.`,
    };
  }

  if (isValidForType) {
    // Same unit dimension but wrong canonical (e.g. "g" for an "mg" drug).
    return {
      type: "unit",
      severity: "major",
      drugs: [generic],
      message: `Unit "${rawUnit}" is not the canonical unit for ${generic} (expected: ${record.canonicalUnit}). Using a non-canonical unit creates ambiguity and risks dosing errors.`,
    };
  }

  // Wrong unit dimension entirely (e.g. "ml" for a solid-dose drug).
  return {
    type: "unit",
    severity: "major",
    drugs: [generic],
    message: `Unit "${rawUnit}" is incompatible with ${generic}'s dose dimension (${record.unitType}; expected: ${record.canonicalUnit}). This likely indicates a prescription error.`,
  };
}

/**
 * Checks whether the computed total daily dose exceeds the known maximum for a
 * medication.  Also performs a weight-based range check when patient weight and
 * pediatric dosing data are both available.
 *
 * Precondition: unit has already been validated against the canonical unit.
 */
export function checkDose(
  generic: string,
  dose: number,
  frequencyPerDay: number,
  record: MedicationRecord,
  weightKg: number | undefined
): RxFinding[] {
  const findings: RxFinding[] = [];
  const totalDaily = dose * frequencyPerDay;

  // --- Maximum daily dose check -------------------------------------------
  if (record.maxDailyDose !== undefined) {
    const { value: maxValue, unit: maxUnit } = record.maxDailyDose;

    if (totalDaily >= 2 * maxValue) {
      findings.push({
        type: "dose",
        severity: "contraindicated",
        drugs: [generic],
        message: `Total daily dose of ${totalDaily} ${maxUnit} is ≥ 2× the maximum recommended daily dose of ${maxValue} ${maxUnit} for ${generic}.`,
      });
    } else if (totalDaily > maxValue) {
      findings.push({
        type: "dose",
        severity: "major",
        drugs: [generic],
        message: `Total daily dose of ${totalDaily} ${maxUnit} exceeds the maximum recommended daily dose of ${maxValue} ${maxUnit} for ${generic}.`,
      });
    }
  }

  // --- Pediatric weight-based dose check -----------------------------------
  if (weightKg !== undefined && record.pediatricMgPerKgPerDay !== undefined) {
    const { max: maxPerKg } = record.pediatricMgPerKgPerDay;
    const maxPediatricDaily = maxPerKg * weightKg;

    if (totalDaily > maxPediatricDaily) {
      findings.push({
        type: "dose",
        severity: "major",
        drugs: [generic],
        message: `Total daily dose of ${totalDaily} ${record.canonicalUnit} exceeds the maximum pediatric weight-based dose of ${maxPediatricDaily.toFixed(1)} ${record.canonicalUnit} (${maxPerKg} mg/kg/day × ${weightKg} kg) for ${generic}.`,
      });
    }
  }

  return findings;
}
