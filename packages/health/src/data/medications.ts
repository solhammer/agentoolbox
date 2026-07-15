/**
 * Reference medication records.
 *
 * Sources: FDA drug labeling, OpenFDA, standard clinical references.
 * This dataset is informational and must not be used as the sole basis for
 * clinical decisions. See package README for full disclaimer.
 */

export interface MedicationRecord {
  /** Lowercase generic (INN) name. */
  generic: string;
  /** Lowercase brand/trade names (aliases). */
  brands: string[];
  /** Measurement dimension the drug is dosed in. */
  unitType: "mass" | "volume" | "unit";
  /** The canonical clinical unit for this drug (e.g. "mg", "mcg", "units"). */
  canonicalUnit: string;
  /** Maximum recommended total daily dose. Unit must equal canonicalUnit. */
  maxDailyDose?: { value: number; unit: string };
  /**
   * Pediatric weight-based dose range in mg/kg/day.
   * Only present for drugs with well-established pediatric dosing.
   */
  pediatricMgPerKgPerDay?: { min: number; max: number };
}

export const MEDICATIONS: MedicationRecord[] = [
  // ── Analgesics / Antipyretics ──────────────────────────────────────────
  {
    generic: "acetaminophen",
    brands: ["tylenol", "paracetamol", "panadol", "tempra", "feverall"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 4000, unit: "mg" },
    pediatricMgPerKgPerDay: { min: 40, max: 75 },
  },
  {
    generic: "ibuprofen",
    brands: ["advil", "motrin", "nurofen", "brufen"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 3200, unit: "mg" },
    pediatricMgPerKgPerDay: { min: 20, max: 40 },
  },
  {
    generic: "naproxen",
    brands: ["aleve", "naprosyn", "anaprox"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 1500, unit: "mg" },
  },
  {
    generic: "aspirin",
    brands: ["bayer", "ecotrin", "bufferin"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 4000, unit: "mg" },
  },
  {
    generic: "celecoxib",
    brands: ["celebrex"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 400, unit: "mg" },
  },
  {
    generic: "tramadol",
    brands: ["ultram", "conzip", "ryzolt"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 400, unit: "mg" },
  },
  {
    generic: "morphine",
    brands: ["ms contin", "roxanol", "kadian", "avinza"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 120, unit: "mg" },
  },
  {
    generic: "oxycodone",
    brands: ["oxycontin", "percocet", "roxicodone", "oxaydo"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 320, unit: "mg" },
  },
  {
    generic: "hydrocodone",
    brands: ["norco", "vicodin", "zohydro", "hysingla"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 90, unit: "mg" },
  },
  {
    generic: "codeine",
    brands: ["tylenol with codeine", "codeine phosphate"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 360, unit: "mg" },
  },

  // ── Antibiotics ────────────────────────────────────────────────────────
  {
    generic: "amoxicillin",
    brands: ["amoxil", "trimox", "moxatag"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 4000, unit: "mg" },
    pediatricMgPerKgPerDay: { min: 25, max: 90 },
  },
  {
    generic: "azithromycin",
    brands: ["zithromax", "z-pak", "zmax"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 500, unit: "mg" },
  },
  {
    generic: "ciprofloxacin",
    brands: ["cipro", "cipro xr"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 1500, unit: "mg" },
  },
  {
    generic: "doxycycline",
    brands: ["vibramycin", "doryx", "monodox", "oracea"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 200, unit: "mg" },
  },
  {
    generic: "metronidazole",
    brands: ["flagyl", "metrogel", "metrocream"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 4000, unit: "mg" },
  },
  {
    generic: "clindamycin",
    brands: ["cleocin", "clindagel"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 4800, unit: "mg" },
  },
  {
    generic: "trimethoprim-sulfamethoxazole",
    brands: ["bactrim", "septra", "cotrimoxazole", "tmp-smx"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 1600, unit: "mg" },
  },

  // ── Cardiovascular / Anticoagulants ───────────────────────────────────
  {
    generic: "warfarin",
    brands: ["coumadin", "jantoven"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 15, unit: "mg" },
  },
  {
    generic: "clopidogrel",
    brands: ["plavix"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 75, unit: "mg" },
  },
  {
    generic: "rivaroxaban",
    brands: ["xarelto"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 20, unit: "mg" },
  },
  {
    generic: "apixaban",
    brands: ["eliquis"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 20, unit: "mg" },
  },
  {
    generic: "digoxin",
    brands: ["lanoxin", "digitek"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 0.5, unit: "mg" },
  },
  {
    generic: "amiodarone",
    brands: ["cordarone", "pacerone", "nexterone"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 400, unit: "mg" },
  },
  {
    generic: "lisinopril",
    brands: ["prinivil", "zestril", "qbrelis"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 80, unit: "mg" },
  },
  {
    generic: "losartan",
    brands: ["cozaar"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 100, unit: "mg" },
  },
  {
    generic: "valsartan",
    brands: ["diovan"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 320, unit: "mg" },
  },
  {
    generic: "metoprolol",
    brands: ["lopressor", "toprol-xl", "toprol xl"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 400, unit: "mg" },
  },
  {
    generic: "atenolol",
    brands: ["tenormin"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 200, unit: "mg" },
  },
  {
    generic: "amlodipine",
    brands: ["norvasc"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 10, unit: "mg" },
  },
  {
    generic: "diltiazem",
    brands: ["cardizem", "tiazac", "cartia xt", "dilacor xr"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 480, unit: "mg" },
  },
  {
    generic: "hydrochlorothiazide",
    brands: ["microzide", "hctz", "esidrix"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 50, unit: "mg" },
  },
  {
    generic: "furosemide",
    brands: ["lasix"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 600, unit: "mg" },
  },
  {
    generic: "spironolactone",
    brands: ["aldactone", "carospir"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 400, unit: "mg" },
  },

  // ── Endocrine / Metabolic ──────────────────────────────────────────────
  {
    generic: "levothyroxine",
    brands: ["synthroid", "levoxyl", "tirosint", "unithroid", "euthyrox"],
    unitType: "mass",
    canonicalUnit: "mcg",
    maxDailyDose: { value: 300, unit: "mcg" },
  },
  {
    generic: "metformin",
    brands: ["glucophage", "fortamet", "glumetza", "riomet"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 2550, unit: "mg" },
  },
  {
    generic: "glipizide",
    brands: ["glucotrol", "glucotrol xl"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },
  {
    generic: "insulin glargine",
    brands: ["lantus", "basaglar", "toujeo", "semglee"],
    unitType: "unit",
    canonicalUnit: "units",
    maxDailyDose: { value: 100, unit: "units" },
  },
  {
    generic: "insulin",
    brands: ["humulin", "novolin", "humulin n", "humulin r", "novolin n", "novolin r"],
    unitType: "unit",
    canonicalUnit: "units",
  },
  {
    generic: "prednisone",
    brands: ["deltasone", "rayos", "prednisone intensol"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 80, unit: "mg" },
  },
  {
    generic: "methylprednisolone",
    brands: ["medrol", "solu-medrol", "depo-medrol"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 1000, unit: "mg" },
  },
  {
    generic: "allopurinol",
    brands: ["zyloprim", "aloprim"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 800, unit: "mg" },
  },
  {
    generic: "colchicine",
    brands: ["colcrys", "mitigare", "gloperba"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 1.8, unit: "mg" },
  },

  // ── Lipid-lowering ─────────────────────────────────────────────────────
  {
    generic: "simvastatin",
    brands: ["zocor"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },
  {
    generic: "atorvastatin",
    brands: ["lipitor"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 80, unit: "mg" },
  },
  {
    generic: "rosuvastatin",
    brands: ["crestor", "ezallor"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },

  // ── Gastrointestinal ───────────────────────────────────────────────────
  {
    generic: "omeprazole",
    brands: ["prilosec", "zegerid"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },
  {
    generic: "pantoprazole",
    brands: ["protonix"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 80, unit: "mg" },
  },
  {
    generic: "metoclopramide",
    brands: ["reglan", "metozolv"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },
  {
    generic: "ondansetron",
    brands: ["zofran", "zuplenz"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 32, unit: "mg" },
  },

  // ── Antidepressants / Psychiatric ─────────────────────────────────────
  {
    generic: "fluoxetine",
    brands: ["prozac", "sarafem", "selfemra"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 80, unit: "mg" },
  },
  {
    generic: "sertraline",
    brands: ["zoloft"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 200, unit: "mg" },
  },
  {
    generic: "paroxetine",
    brands: ["paxil", "pexeva", "brisdelle"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 60, unit: "mg" },
  },
  {
    generic: "citalopram",
    brands: ["celexa"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },
  {
    generic: "escitalopram",
    brands: ["lexapro"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 20, unit: "mg" },
  },
  {
    generic: "phenelzine",
    brands: ["nardil"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 90, unit: "mg" },
  },
  {
    generic: "tranylcypromine",
    brands: ["parnate"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 60, unit: "mg" },
  },
  {
    generic: "bupropion",
    brands: ["wellbutrin", "zyban", "aplenzin", "forfivo xl"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 450, unit: "mg" },
  },
  {
    generic: "venlafaxine",
    brands: ["effexor", "effexor xr"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 225, unit: "mg" },
  },
  {
    generic: "duloxetine",
    brands: ["cymbalta", "irenka"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 120, unit: "mg" },
  },
  {
    generic: "amitriptyline",
    brands: ["elavil"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 300, unit: "mg" },
  },
  {
    generic: "quetiapine",
    brands: ["seroquel", "seroquel xr"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 800, unit: "mg" },
  },
  {
    generic: "risperidone",
    brands: ["risperdal", "risperdal consta"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 16, unit: "mg" },
  },
  {
    generic: "olanzapine",
    brands: ["zyprexa", "zyprexa zydis"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 20, unit: "mg" },
  },
  {
    generic: "lithium",
    brands: ["lithobid", "eskalith", "lithium carbonate"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 2400, unit: "mg" },
  },

  // ── Anxiolytics / Sedative-Hypnotics ──────────────────────────────────
  {
    generic: "alprazolam",
    brands: ["xanax", "xanax xr", "niravam"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 10, unit: "mg" },
  },
  {
    generic: "diazepam",
    brands: ["valium", "diastat"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },
  {
    generic: "clonazepam",
    brands: ["klonopin"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 20, unit: "mg" },
  },
  {
    generic: "lorazepam",
    brands: ["ativan"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 10, unit: "mg" },
  },
  {
    generic: "zolpidem",
    brands: ["ambien", "ambien cr", "edluar", "intermezzo"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 10, unit: "mg" },
  },

  // ── Anticonvulsants ────────────────────────────────────────────────────
  {
    generic: "carbamazepine",
    brands: ["tegretol", "equetro", "carbatrol"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 1600, unit: "mg" },
  },
  {
    generic: "phenytoin",
    brands: ["dilantin", "phenytek"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 600, unit: "mg" },
  },
  {
    generic: "valproic acid",
    brands: ["depakote", "depakene", "depacon", "valproate", "divalproex"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 3000, unit: "mg" },
  },
  {
    generic: "gabapentin",
    brands: ["neurontin", "gralise", "horizant"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 3600, unit: "mg" },
  },
  {
    generic: "pregabalin",
    brands: ["lyrica", "lyrica cr"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 600, unit: "mg" },
  },
  {
    generic: "lamotrigine",
    brands: ["lamictal", "lamictal xr"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 700, unit: "mg" },
  },
  {
    generic: "levetiracetam",
    brands: ["keppra", "keppra xr", "spritam"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 3000, unit: "mg" },
  },
  {
    generic: "topiramate",
    brands: ["topamax", "trokendi xr", "qudexy xr"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 1600, unit: "mg" },
  },

  // ── Other / Oncology / Urology ─────────────────────────────────────────
  {
    generic: "methotrexate",
    brands: ["trexall", "rheumatrex", "otrexup", "rasuvo"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 20, unit: "mg" },
  },
  {
    generic: "sildenafil",
    brands: ["viagra", "revatio"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 100, unit: "mg" },
  },
  {
    generic: "tadalafil",
    brands: ["cialis", "adcirca", "alyq"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 20, unit: "mg" },
  },
  {
    generic: "tamoxifen",
    brands: ["nolvadex", "soltamox"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 40, unit: "mg" },
  },
  {
    generic: "finasteride",
    brands: ["proscar", "propecia"],
    unitType: "mass",
    canonicalUnit: "mg",
    maxDailyDose: { value: 5, unit: "mg" },
  },
];
