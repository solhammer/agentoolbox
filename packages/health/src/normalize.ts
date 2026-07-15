import { MEDICATIONS } from "./data/medications.js";

// ---------------------------------------------------------------------------
// Brand → generic lookup map (built once at module load time)
// ---------------------------------------------------------------------------

/** Maps every lowercase brand/generic alias to its canonical generic INN name. */
const brandToGeneric = new Map<string, string>();

for (const med of MEDICATIONS) {
  brandToGeneric.set(med.generic.toLowerCase().trim(), med.generic);
  for (const brand of med.brands) {
    const key = brand.toLowerCase().trim();
    if (!brandToGeneric.has(key)) {
      brandToGeneric.set(key, med.generic);
    }
  }
}

/**
 * Resolves a drug name (generic or brand) to its canonical lowercase generic
 * INN name.  Falls back to the lowercased, trimmed input if the drug is not
 * found in the reference database.
 */
export function normalizeToGeneric(name: string): string {
  const key = name.toLowerCase().trim();
  return brandToGeneric.get(key) ?? key;
}

// ---------------------------------------------------------------------------
// Unit normalization
// ---------------------------------------------------------------------------

/**
 * Normalises a unit string to one of the canonical tokens used in the
 * medication database: "mg", "mcg", "g", "ml", "units".
 *
 * Unrecognised strings are returned lowercased and trimmed as-is.
 */
export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  switch (lower) {
    case "microgram":
    case "micrograms":
    case "μg":
    case "ug":
    case "mcg":
      return "mcg";

    case "milligram":
    case "milligrams":
    case "mg":
      return "mg";

    case "gram":
    case "grams":
    case "g":
      return "g";

    case "milliliter":
    case "milliliters":
    case "millilitre":
    case "millilitres":
    case "ml":
    case "cc":
      return "ml";

    case "unit":
    case "units":
    case "u":
    case "iu":
    case "international unit":
    case "international units":
      return "units";

    default:
      return lower;
  }
}

/** Known canonical unit tokens across all unit types. */
export const KNOWN_UNITS = new Set<string>(["mg", "mcg", "g", "ml", "units"]);

/** Valid units for each unitType dimension. */
export const VALID_UNITS_FOR_TYPE: Record<"mass" | "volume" | "unit", string[]> = {
  mass: ["mg", "mcg", "g"],
  volume: ["ml"],
  unit: ["units"],
};
