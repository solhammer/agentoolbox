/**
 * Well-established drug-drug interaction pairs.
 *
 * Both `a` and `b` are lowercase generic (INN) names that correspond to
 * entries in medications.ts. The pair is order-independent (checked both ways).
 *
 * Sources: FDA drug labeling, FDA Safety Communications, standard clinical
 * drug interaction databases (Drugs@FDA, NLM DailyMed), public medical literature.
 * This dataset is informational only. See package README for full disclaimer.
 */

export interface InteractionRecord {
  /** Lowercase generic name of the first drug. */
  a: string;
  /** Lowercase generic name of the second drug. */
  b: string;
  /** Clinical severity of the interaction. */
  severity: "moderate" | "major" | "contraindicated";
  /** Plain-language mechanism / clinical consequence. */
  mechanism: string;
  /** Primary reference (FDA label, safety communication, etc.). */
  reference?: string;
}

export const INTERACTIONS: InteractionRecord[] = [
  // ── Contraindicated interactions ──────────────────────────────────────

  // MAOIs + SSRIs — fatal serotonin syndrome risk
  {
    a: "phenelzine",
    b: "fluoxetine",
    severity: "contraindicated",
    mechanism:
      "Combined monoamine oxidase inhibition and serotonin reuptake inhibition causes potentially fatal serotonin syndrome characterized by hyperthermia, rigidity, and cardiovascular instability.",
    reference: "FDA labeling — Nardil / Prozac",
  },
  {
    a: "phenelzine",
    b: "sertraline",
    severity: "contraindicated",
    mechanism:
      "MAOI + SSRI combination causes potentially fatal serotonin syndrome. Washout of at least 14 days required between these agents.",
    reference: "FDA labeling — Nardil / Zoloft",
  },
  {
    a: "phenelzine",
    b: "paroxetine",
    severity: "contraindicated",
    mechanism:
      "MAOI + SSRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },
  {
    a: "phenelzine",
    b: "citalopram",
    severity: "contraindicated",
    mechanism:
      "MAOI + SSRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },
  {
    a: "phenelzine",
    b: "escitalopram",
    severity: "contraindicated",
    mechanism:
      "MAOI + SSRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },

  // MAOIs + SNRIs — fatal serotonin syndrome risk
  {
    a: "phenelzine",
    b: "venlafaxine",
    severity: "contraindicated",
    mechanism:
      "MAOI + SNRI combination causes potentially fatal serotonin syndrome. Washout of at least 14 days required.",
    reference: "FDA labeling — Nardil / Effexor",
  },
  {
    a: "phenelzine",
    b: "duloxetine",
    severity: "contraindicated",
    mechanism:
      "MAOI + SNRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },

  // MAOIs + other serotonergic/dopaminergic agents
  {
    a: "phenelzine",
    b: "tramadol",
    severity: "contraindicated",
    mechanism:
      "MAOI + tramadol combination causes severe serotonin syndrome and/or hypertensive crisis. Tramadol inhibits serotonin and norepinephrine reuptake.",
    reference: "FDA labeling",
  },
  {
    a: "phenelzine",
    b: "bupropion",
    severity: "contraindicated",
    mechanism:
      "MAOI + bupropion causes severe hypertensive reactions and risk of serotonin syndrome. Bupropion is a dopamine and norepinephrine reuptake inhibitor.",
    reference: "FDA labeling",
  },

  // Tranylcypromine + SSRIs/SNRIs
  {
    a: "tranylcypromine",
    b: "fluoxetine",
    severity: "contraindicated",
    mechanism:
      "MAOI + SSRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling — Parnate / Prozac",
  },
  {
    a: "tranylcypromine",
    b: "sertraline",
    severity: "contraindicated",
    mechanism:
      "MAOI + SSRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },
  {
    a: "tranylcypromine",
    b: "paroxetine",
    severity: "contraindicated",
    mechanism:
      "MAOI + SSRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },
  {
    a: "tranylcypromine",
    b: "venlafaxine",
    severity: "contraindicated",
    mechanism:
      "MAOI + SNRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },
  {
    a: "tranylcypromine",
    b: "duloxetine",
    severity: "contraindicated",
    mechanism:
      "MAOI + SNRI combination causes potentially fatal serotonin syndrome.",
    reference: "FDA labeling",
  },
  {
    a: "tranylcypromine",
    b: "tramadol",
    severity: "contraindicated",
    mechanism:
      "MAOI + tramadol causes severe serotonin syndrome and/or hypertensive crisis.",
    reference: "FDA labeling",
  },
  {
    a: "tranylcypromine",
    b: "bupropion",
    severity: "contraindicated",
    mechanism:
      "MAOI + bupropion causes severe hypertensive reactions and serotonin syndrome risk.",
    reference: "FDA labeling",
  },

  // ── Major interactions ─────────────────────────────────────────────────

  // Warfarin + NSAIDs (bleeding risk)
  {
    a: "warfarin",
    b: "ibuprofen",
    severity: "major",
    mechanism:
      "NSAIDs inhibit platelet aggregation and displace warfarin from plasma protein binding sites, significantly increasing risk of serious or fatal GI and intracranial bleeding.",
    reference: "FDA labeling — Coumadin",
  },
  {
    a: "warfarin",
    b: "naproxen",
    severity: "major",
    mechanism:
      "NSAIDs inhibit platelet aggregation and can cause GI ulceration, markedly increasing bleeding risk in anticoagulated patients.",
    reference: "FDA labeling",
  },
  {
    a: "warfarin",
    b: "aspirin",
    severity: "major",
    mechanism:
      "Aspirin irreversibly inhibits platelet aggregation and increases risk of GI bleeding, significantly amplifying warfarin's anticoagulant effect.",
    reference: "FDA labeling",
  },

  // Warfarin + CYP inhibitors / other interactions
  {
    a: "warfarin",
    b: "ciprofloxacin",
    severity: "major",
    mechanism:
      "Fluoroquinolones inhibit CYP1A2 and alter gut flora (reducing vitamin K production), increasing warfarin levels and risk of serious bleeding.",
    reference: "FDA labeling",
  },
  {
    a: "warfarin",
    b: "amiodarone",
    severity: "major",
    mechanism:
      "Amiodarone strongly inhibits CYP2C9 (primary warfarin-metabolizing enzyme), markedly elevating warfarin plasma levels and bleeding risk. INR monitoring is essential.",
    reference: "FDA labeling — Cordarone",
  },
  {
    a: "warfarin",
    b: "fluoxetine",
    severity: "major",
    mechanism:
      "SSRIs inhibit CYP2C9 and impair platelet serotonin-mediated aggregation, increasing bleeding risk in warfarin-treated patients.",
    reference: "FDA labeling",
  },
  {
    a: "warfarin",
    b: "sertraline",
    severity: "major",
    mechanism:
      "SSRIs inhibit CYP2C9 and impair platelet function, increasing bleeding risk with warfarin.",
    reference: "FDA labeling",
  },
  {
    a: "warfarin",
    b: "metronidazole",
    severity: "major",
    mechanism:
      "Metronidazole strongly inhibits CYP2C9, markedly elevating warfarin plasma levels and risk of serious bleeding.",
    reference: "FDA labeling",
  },
  {
    a: "warfarin",
    b: "carbamazepine",
    severity: "major",
    mechanism:
      "Carbamazepine is a potent CYP2C9 and CYP3A4 inducer; it significantly reduces warfarin exposure and may lead to thromboembolic events.",
    reference: "FDA labeling",
  },
  {
    a: "warfarin",
    b: "phenytoin",
    severity: "major",
    mechanism:
      "Phenytoin can initially inhibit warfarin metabolism (increasing INR) then induce it (decreasing INR), making anticoagulation management hazardous.",
    reference: "FDA labeling",
  },
  {
    a: "warfarin",
    b: "celecoxib",
    severity: "moderate",
    mechanism:
      "COX-2 inhibitors may modestly elevate INR in warfarin-treated patients; closer monitoring is warranted.",
  },

  // ACEi/ARB + potassium-sparing diuretics (hyperkalemia)
  {
    a: "lisinopril",
    b: "spironolactone",
    severity: "major",
    mechanism:
      "Combined ACE inhibitor and potassium-sparing diuretic causes severe, potentially life-threatening hyperkalemia through additive potassium retention.",
    reference: "FDA labeling — dual RAAS blockade",
  },
  {
    a: "losartan",
    b: "spironolactone",
    severity: "major",
    mechanism:
      "Combined ARB and potassium-sparing diuretic causes severe hyperkalemia through additive potassium retention.",
  },
  {
    a: "valsartan",
    b: "spironolactone",
    severity: "major",
    mechanism:
      "Combined ARB and potassium-sparing diuretic causes severe hyperkalemia through additive potassium retention.",
  },

  // ACEi + ARB (dual RAAS blockade)
  {
    a: "lisinopril",
    b: "losartan",
    severity: "major",
    mechanism:
      "Dual renin-angiotensin system blockade increases the risk of hypotension, hyperkalemia, and acute kidney injury without additional cardiovascular benefit.",
    reference: "FDA Safety Communication — ONTARGET",
  },
  {
    a: "lisinopril",
    b: "valsartan",
    severity: "major",
    mechanism:
      "Dual RAAS blockade increases risk of hypotension, hyperkalemia, and acute kidney injury.",
    reference: "FDA Safety Communication",
  },

  // ACEi/ARB + NSAIDs (renal failure risk)
  {
    a: "lisinopril",
    b: "ibuprofen",
    severity: "major",
    mechanism:
      "NSAIDs blunt the antihypertensive effect of ACE inhibitors and can precipitate acute kidney injury, particularly in volume-depleted or elderly patients.",
  },
  {
    a: "lisinopril",
    b: "naproxen",
    severity: "major",
    mechanism:
      "NSAIDs blunt the antihypertensive effect of ACE inhibitors and increase risk of acute kidney injury.",
  },

  // Digoxin interactions
  {
    a: "digoxin",
    b: "amiodarone",
    severity: "major",
    mechanism:
      "Amiodarone inhibits P-glycoprotein and CYP3A4, significantly increasing digoxin plasma levels and risk of life-threatening toxicity (bradyarrhythmia, heart block).",
    reference: "FDA labeling — Cordarone / Lanoxin",
  },
  {
    a: "digoxin",
    b: "metoclopramide",
    severity: "moderate",
    mechanism:
      "Metoclopramide accelerates gastric motility, reducing digoxin absorption from the GI tract and lowering plasma levels.",
  },

  // Lithium interactions
  {
    a: "lithium",
    b: "ibuprofen",
    severity: "major",
    mechanism:
      "NSAIDs reduce renal prostaglandin synthesis, impairing lithium excretion and raising plasma lithium to potentially toxic levels.",
    reference: "FDA labeling",
  },
  {
    a: "lithium",
    b: "naproxen",
    severity: "major",
    mechanism:
      "NSAIDs reduce renal lithium excretion, increasing plasma lithium levels and risk of toxicity (tremor, confusion, seizure).",
  },
  {
    a: "lithium",
    b: "hydrochlorothiazide",
    severity: "major",
    mechanism:
      "Thiazide diuretics induce sodium depletion, causing compensatory proximal tubule reabsorption of lithium and a clinically significant rise in plasma lithium.",
    reference: "FDA labeling",
  },
  {
    a: "lithium",
    b: "furosemide",
    severity: "major",
    mechanism:
      "Loop diuretics cause sodium depletion that can impair renal lithium excretion, increasing plasma lithium and risk of toxicity.",
  },
  {
    a: "lithium",
    b: "lisinopril",
    severity: "major",
    mechanism:
      "ACE inhibitors reduce renal lithium excretion, potentially raising plasma lithium concentrations to toxic levels.",
    reference: "FDA labeling",
  },

  // Statins — myopathy/rhabdomyolysis risk
  {
    a: "simvastatin",
    b: "amiodarone",
    severity: "major",
    mechanism:
      "Amiodarone inhibits CYP3A4, substantially increasing simvastatin plasma levels and risk of myopathy and rhabdomyolysis. Simvastatin doses >20 mg are contraindicated with amiodarone.",
    reference: "FDA Drug Safety Communication 2011",
  },
  {
    a: "simvastatin",
    b: "diltiazem",
    severity: "major",
    mechanism:
      "Diltiazem inhibits CYP3A4, increasing simvastatin levels and risk of myopathy and rhabdomyolysis. Simvastatin doses should not exceed 10 mg when combined with diltiazem.",
    reference: "FDA labeling",
  },
  {
    a: "colchicine",
    b: "simvastatin",
    severity: "major",
    mechanism:
      "Additive risk of myopathy and rhabdomyolysis when colchicine is combined with statins, particularly in patients with renal impairment.",
  },
  {
    a: "colchicine",
    b: "atorvastatin",
    severity: "major",
    mechanism:
      "Additive risk of myopathy and rhabdomyolysis when colchicine is combined with statins.",
  },

  // Benzodiazepines + opioids (respiratory depression — FDA Black Box)
  {
    a: "alprazolam",
    b: "morphine",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression from benzodiazepine and opioid greatly increases risk of life-threatening respiratory depression, sedation, coma, and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "alprazolam",
    b: "oxycodone",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "alprazolam",
    b: "hydrocodone",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "diazepam",
    b: "morphine",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "diazepam",
    b: "oxycodone",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "lorazepam",
    b: "morphine",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "lorazepam",
    b: "oxycodone",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "lorazepam",
    b: "hydrocodone",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "clonazepam",
    b: "oxycodone",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },
  {
    a: "clonazepam",
    b: "morphine",
    severity: "major",
    mechanism:
      "Combined CNS/respiratory depression greatly increases risk of life-threatening respiratory depression and death.",
    reference: "FDA Black Box Warning",
  },

  // Gabapentinoids + opioids (respiratory depression)
  {
    a: "gabapentin",
    b: "oxycodone",
    severity: "major",
    mechanism:
      "Gabapentinoids combined with opioids significantly increase risk of serious CNS depression and potentially fatal respiratory depression.",
    reference: "FDA Drug Safety Communication 2019",
  },
  {
    a: "gabapentin",
    b: "morphine",
    severity: "major",
    mechanism:
      "Gabapentinoids combined with opioids significantly increase risk of serious CNS depression and potentially fatal respiratory depression.",
    reference: "FDA Drug Safety Communication 2019",
  },
  {
    a: "gabapentin",
    b: "hydrocodone",
    severity: "major",
    mechanism:
      "Gabapentinoids combined with opioids significantly increase risk of serious CNS depression and potentially fatal respiratory depression.",
    reference: "FDA Drug Safety Communication 2019",
  },
  {
    a: "pregabalin",
    b: "oxycodone",
    severity: "major",
    mechanism:
      "Gabapentinoids combined with opioids significantly increase risk of serious CNS depression and potentially fatal respiratory depression.",
    reference: "FDA Drug Safety Communication 2019",
  },
  {
    a: "pregabalin",
    b: "morphine",
    severity: "major",
    mechanism:
      "Gabapentinoids combined with opioids significantly increase risk of serious CNS depression and potentially fatal respiratory depression.",
    reference: "FDA Drug Safety Communication 2019",
  },
  {
    a: "pregabalin",
    b: "hydrocodone",
    severity: "major",
    mechanism:
      "Gabapentinoids combined with opioids significantly increase risk of serious CNS depression and potentially fatal respiratory depression.",
  },

  // Methotrexate + NSAIDs (severe toxicity)
  {
    a: "methotrexate",
    b: "ibuprofen",
    severity: "major",
    mechanism:
      "NSAIDs inhibit renal tubular secretion of methotrexate, causing life-threatening plasma level elevation (myelosuppression, mucositis, nephrotoxicity).",
    reference: "FDA labeling — Trexall",
  },
  {
    a: "methotrexate",
    b: "naproxen",
    severity: "major",
    mechanism:
      "NSAIDs inhibit renal clearance of methotrexate, leading to potentially fatal methotrexate toxicity.",
    reference: "FDA labeling",
  },
  {
    a: "methotrexate",
    b: "aspirin",
    severity: "major",
    mechanism:
      "Salicylates reduce renal clearance of methotrexate, potentially leading to life-threatening toxicity.",
    reference: "FDA labeling",
  },

  // Carbamazepine interactions
  {
    a: "carbamazepine",
    b: "quetiapine",
    severity: "major",
    mechanism:
      "Carbamazepine markedly reduces quetiapine plasma exposure through potent CYP3A4 induction, risking therapeutic failure.",
    reference: "FDA labeling",
  },
  {
    a: "carbamazepine",
    b: "lamotrigine",
    severity: "major",
    mechanism:
      "Carbamazepine induces CYP3A4 and UGT1A4, significantly reducing lamotrigine plasma levels and risking loss of seizure control.",
    reference: "FDA labeling",
  },
  {
    a: "carbamazepine",
    b: "valproic acid",
    severity: "moderate",
    mechanism:
      "Carbamazepine induces CYP3A4 (reducing valproate levels) while valproate inhibits carbamazepine epoxide hydrolase (increasing the active 10,11-epoxide), creating complex bidirectional toxicity risk.",
  },
  {
    a: "phenytoin",
    b: "carbamazepine",
    severity: "moderate",
    mechanism:
      "Complex pharmacokinetic interaction: both drugs induce CYP enzymes; plasma levels of either may be altered unpredictably, requiring close monitoring.",
  },

  // Tramadol + SSRIs (serotonin syndrome / lowered seizure threshold)
  {
    a: "tramadol",
    b: "fluoxetine",
    severity: "major",
    mechanism:
      "Combined tramadol and SSRI increases risk of serotonin syndrome and tramadol-induced seizures through additive serotonergic activity and CYP2D6 inhibition by fluoxetine.",
    reference: "FDA labeling",
  },
  {
    a: "tramadol",
    b: "sertraline",
    severity: "major",
    mechanism:
      "Combined tramadol and SSRI increases risk of serotonin syndrome and seizures.",
    reference: "FDA labeling",
  },
  {
    a: "tramadol",
    b: "paroxetine",
    severity: "major",
    mechanism:
      "Combined tramadol and SSRI (especially strong CYP2D6 inhibitor paroxetine) increases risk of serotonin syndrome and seizures.",
    reference: "FDA labeling",
  },

  // Beta-blockers + non-DHP calcium channel blockers (heart block)
  {
    a: "metoprolol",
    b: "diltiazem",
    severity: "major",
    mechanism:
      "Combined beta-blocker and non-dihydropyridine calcium channel blocker causes additive AV node suppression, potentially resulting in severe bradycardia and high-degree heart block.",
  },
  {
    a: "atenolol",
    b: "diltiazem",
    severity: "major",
    mechanism:
      "Combined beta-blocker and non-dihydropyridine calcium channel blocker causes additive AV node suppression, potentially resulting in severe bradycardia and heart block.",
  },

  // Clopidogrel + PPI (reduced antiplatelet effect)
  {
    a: "omeprazole",
    b: "clopidogrel",
    severity: "major",
    mechanism:
      "Omeprazole is a potent CYP2C19 inhibitor; it reduces conversion of clopidogrel to its active metabolite by ~45%, substantially diminishing antiplatelet effect and increasing cardiovascular risk.",
    reference: "FDA Drug Safety Communication 2010",
  },

  // QT prolongation
  {
    a: "azithromycin",
    b: "ondansetron",
    severity: "major",
    mechanism:
      "Both azithromycin and ondansetron prolong cardiac QT interval; combined use significantly increases risk of torsades de pointes and sudden cardiac death.",
    reference: "FDA Safety Communication 2011 / 2012",
  },
  {
    a: "azithromycin",
    b: "ciprofloxacin",
    severity: "moderate",
    mechanism:
      "Both drugs have QT-prolonging potential; combined use increases risk of clinically significant QT prolongation and torsades de pointes.",
  },
  {
    a: "ondansetron",
    b: "ciprofloxacin",
    severity: "moderate",
    mechanism:
      "Both drugs have QT-prolonging potential; combined use increases risk of clinically significant QT prolongation.",
  },

  // SSRIs + NSAIDs (GI bleeding)
  {
    a: "fluoxetine",
    b: "ibuprofen",
    severity: "moderate",
    mechanism:
      "SSRIs deplete platelet serotonin needed for normal hemostasis; combined use with NSAIDs that inhibit platelet cyclooxygenase markedly increases risk of GI bleeding.",
  },
  {
    a: "sertraline",
    b: "ibuprofen",
    severity: "moderate",
    mechanism:
      "SSRIs deplete platelet serotonin; combined use with NSAIDs increases risk of GI bleeding.",
  },
  {
    a: "fluoxetine",
    b: "naproxen",
    severity: "moderate",
    mechanism:
      "SSRIs combined with NSAIDs increase risk of upper GI bleeding through complementary inhibition of platelet haemostasis.",
  },

  // Allopurinol + amoxicillin (rash)
  {
    a: "allopurinol",
    b: "amoxicillin",
    severity: "moderate",
    mechanism:
      "Allopurinol significantly increases the incidence of amoxicillin-associated skin rashes (maculopapular eruption), mechanism unclear.",
    reference: "Boston Collaborative Drug Surveillance Program",
  },

  // Metformin + furosemide
  {
    a: "metformin",
    b: "furosemide",
    severity: "moderate",
    mechanism:
      "Furosemide may increase metformin plasma concentrations by competing for renal tubular secretion; metformin may also reduce furosemide plasma levels.",
    reference: "FDA labeling — Glucophage",
  },
];
