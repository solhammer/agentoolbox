/** A single entry in the reporter abbreviation table. */
export interface ReporterEntry {
  /** Official abbreviation used in Bluebook-style citations. */
  abbr: string;
  /** Full human-readable name of the reporter series. */
  name: string;
  /** General category of the reporter. */
  category: "federal" | "regional" | "state" | "specialty";
}

/**
 * Bundled table of known US legal reporter abbreviations.
 *
 * Sources: Bluebook Table T1 (US jurisdictions) and T2 (federal).
 * This list is intentionally comprehensive for common citation validation.
 */
export const KNOWN_REPORTERS: ReporterEntry[] = [
  // ── Federal / SCOTUS ───────────────────────────────────────────────────────
  { abbr: "U.S.", name: "United States Reports", category: "federal" },
  { abbr: "S. Ct.", name: "Supreme Court Reporter", category: "federal" },
  { abbr: "L. Ed.", name: "Lawyers' Edition", category: "federal" },
  { abbr: "L. Ed. 2d", name: "Lawyers' Edition, Second Series", category: "federal" },

  // ── Federal Circuit / District ─────────────────────────────────────────────
  { abbr: "F.", name: "Federal Reporter", category: "federal" },
  { abbr: "F.2d", name: "Federal Reporter, Second Series", category: "federal" },
  { abbr: "F.3d", name: "Federal Reporter, Third Series", category: "federal" },
  { abbr: "F.4th", name: "Federal Reporter, Fourth Series", category: "federal" },
  { abbr: "F. Supp.", name: "Federal Supplement", category: "federal" },
  { abbr: "F. Supp. 2d", name: "Federal Supplement, Second Series", category: "federal" },
  { abbr: "F. Supp. 3d", name: "Federal Supplement, Third Series", category: "federal" },
  { abbr: "F. App'x", name: "Federal Appendix (unpublished)", category: "federal" },
  { abbr: "B.R.", name: "Bankruptcy Reporter", category: "federal" },
  { abbr: "Fed. Cl.", name: "Federal Claims Reporter", category: "federal" },
  { abbr: "Vet. App.", name: "Veterans Appeals Reports", category: "federal" },
  { abbr: "M.J.", name: "Military Justice Reporter", category: "federal" },

  // ── West Regional Reporters ────────────────────────────────────────────────
  { abbr: "A.", name: "Atlantic Reporter", category: "regional" },
  { abbr: "A.2d", name: "Atlantic Reporter, Second Series", category: "regional" },
  { abbr: "A.3d", name: "Atlantic Reporter, Third Series", category: "regional" },
  { abbr: "P.", name: "Pacific Reporter", category: "regional" },
  { abbr: "P.2d", name: "Pacific Reporter, Second Series", category: "regional" },
  { abbr: "P.3d", name: "Pacific Reporter, Third Series", category: "regional" },
  { abbr: "S.E.", name: "Southeastern Reporter", category: "regional" },
  { abbr: "S.E.2d", name: "Southeastern Reporter, Second Series", category: "regional" },
  { abbr: "S.W.", name: "Southwestern Reporter", category: "regional" },
  { abbr: "S.W.2d", name: "Southwestern Reporter, Second Series", category: "regional" },
  { abbr: "S.W.3d", name: "Southwestern Reporter, Third Series", category: "regional" },
  { abbr: "N.E.", name: "Northeastern Reporter", category: "regional" },
  { abbr: "N.E.2d", name: "Northeastern Reporter, Second Series", category: "regional" },
  { abbr: "N.E.3d", name: "Northeastern Reporter, Third Series", category: "regional" },
  { abbr: "N.W.", name: "Northwestern Reporter", category: "regional" },
  { abbr: "N.W.2d", name: "Northwestern Reporter, Second Series", category: "regional" },
  { abbr: "So.", name: "Southern Reporter", category: "regional" },
  { abbr: "So. 2d", name: "Southern Reporter, Second Series", category: "regional" },
  { abbr: "So. 3d", name: "Southern Reporter, Third Series", category: "regional" },

  // ── California ────────────────────────────────────────────────────────────
  { abbr: "Cal.", name: "California Reports", category: "state" },
  { abbr: "Cal. 2d", name: "California Reports, Second Series", category: "state" },
  { abbr: "Cal. 3d", name: "California Reports, Third Series", category: "state" },
  { abbr: "Cal. 4th", name: "California Reports, Fourth Series", category: "state" },
  { abbr: "Cal. 5th", name: "California Reports, Fifth Series", category: "state" },
  { abbr: "Cal. App.", name: "California Appellate Reports", category: "state" },
  { abbr: "Cal. App. 2d", name: "California Appellate Reports, Second Series", category: "state" },
  { abbr: "Cal. App. 3d", name: "California Appellate Reports, Third Series", category: "state" },
  { abbr: "Cal. App. 4th", name: "California Appellate Reports, Fourth Series", category: "state" },
  { abbr: "Cal. App. 5th", name: "California Appellate Reports, Fifth Series", category: "state" },
  { abbr: "Cal. Rptr.", name: "California Reporter", category: "state" },
  { abbr: "Cal. Rptr. 2d", name: "California Reporter, Second Series", category: "state" },
  { abbr: "Cal. Rptr. 3d", name: "California Reporter, Third Series", category: "state" },

  // ── New York ──────────────────────────────────────────────────────────────
  { abbr: "N.Y.", name: "New York Reports", category: "state" },
  { abbr: "N.Y.2d", name: "New York Reports, Second Series", category: "state" },
  { abbr: "N.Y.3d", name: "New York Reports, Third Series", category: "state" },
  { abbr: "A.D.", name: "New York Appellate Division Reports", category: "state" },
  { abbr: "A.D.2d", name: "New York Appellate Division Reports, Second Series", category: "state" },
  { abbr: "A.D.3d", name: "New York Appellate Division Reports, Third Series", category: "state" },
  { abbr: "Misc.", name: "New York Miscellaneous Reports", category: "state" },
  { abbr: "Misc. 2d", name: "New York Miscellaneous Reports, Second Series", category: "state" },
  { abbr: "Misc. 3d", name: "New York Miscellaneous Reports, Third Series", category: "state" },
  { abbr: "N.Y.S.", name: "New York Supplement", category: "state" },
  { abbr: "N.Y.S.2d", name: "New York Supplement, Second Series", category: "state" },
  { abbr: "N.Y.S.3d", name: "New York Supplement, Third Series", category: "state" },

  // ── Texas ─────────────────────────────────────────────────────────────────
  { abbr: "Tex.", name: "Texas Reports", category: "state" },
  { abbr: "S.W.", name: "Southwestern Reporter (Texas)", category: "state" },

  // ── Illinois ──────────────────────────────────────────────────────────────
  { abbr: "Ill.", name: "Illinois Reports", category: "state" },
  { abbr: "Ill. 2d", name: "Illinois Reports, Second Series", category: "state" },
  { abbr: "Ill. App.", name: "Illinois Appellate Court Reports", category: "state" },
  { abbr: "Ill. App. 2d", name: "Illinois Appellate Court Reports, Second Series", category: "state" },
  { abbr: "Ill. App. 3d", name: "Illinois Appellate Court Reports, Third Series", category: "state" },

  // ── Florida ───────────────────────────────────────────────────────────────
  { abbr: "Fla.", name: "Florida Reports", category: "state" },

  // ── Pennsylvania ──────────────────────────────────────────────────────────
  { abbr: "Pa.", name: "Pennsylvania State Reports", category: "state" },
  { abbr: "Pa. Super.", name: "Pennsylvania Superior Court Reports", category: "state" },
  { abbr: "Pa. Commw.", name: "Pennsylvania Commonwealth Court Reports", category: "state" },

  // ── Ohio ──────────────────────────────────────────────────────────────────
  { abbr: "Ohio St.", name: "Ohio State Reports", category: "state" },
  { abbr: "Ohio St. 2d", name: "Ohio State Reports, Second Series", category: "state" },
  { abbr: "Ohio St. 3d", name: "Ohio State Reports, Third Series", category: "state" },
  { abbr: "Ohio App.", name: "Ohio Appellate Reports", category: "state" },
  { abbr: "Ohio App. 2d", name: "Ohio Appellate Reports, Second Series", category: "state" },
  { abbr: "Ohio App. 3d", name: "Ohio Appellate Reports, Third Series", category: "state" },

  // ── Michigan ──────────────────────────────────────────────────────────────
  { abbr: "Mich.", name: "Michigan Reports", category: "state" },
  { abbr: "Mich. App.", name: "Michigan Appeals Reports", category: "state" },

  // ── Massachusetts ─────────────────────────────────────────────────────────
  { abbr: "Mass.", name: "Massachusetts Reports", category: "state" },
  { abbr: "Mass. App. Ct.", name: "Massachusetts Appeals Court Reports", category: "state" },

  // ── New Jersey ────────────────────────────────────────────────────────────
  { abbr: "N.J.", name: "New Jersey Reports", category: "state" },
  { abbr: "N.J. Super.", name: "New Jersey Superior Court Reports", category: "state" },

  // ── Virginia ──────────────────────────────────────────────────────────────
  { abbr: "Va.", name: "Virginia Reports", category: "state" },
  { abbr: "Va. App.", name: "Virginia Court of Appeals Reports", category: "state" },

  // ── Washington ────────────────────────────────────────────────────────────
  { abbr: "Wash.", name: "Washington Reports", category: "state" },
  { abbr: "Wash. 2d", name: "Washington Reports, Second Series", category: "state" },
  { abbr: "Wash. App.", name: "Washington Appellate Reports", category: "state" },

  // ── Oregon ────────────────────────────────────────────────────────────────
  { abbr: "Or.", name: "Oregon Reports", category: "state" },
  { abbr: "Or. App.", name: "Oregon Court of Appeals Reports", category: "state" },

  // ── Connecticut ───────────────────────────────────────────────────────────
  { abbr: "Conn.", name: "Connecticut Reports", category: "state" },
  { abbr: "Conn. App.", name: "Connecticut Appellate Reports", category: "state" },

  // ── Maryland ──────────────────────────────────────────────────────────────
  { abbr: "Md.", name: "Maryland Reports", category: "state" },
  { abbr: "Md. App.", name: "Maryland Appellate Reports", category: "state" },

  // ── Missouri ──────────────────────────────────────────────────────────────
  { abbr: "Mo.", name: "Missouri Reports", category: "state" },
  { abbr: "Mo. App.", name: "Missouri Court of Appeals Reports", category: "state" },

  // ── Colorado ──────────────────────────────────────────────────────────────
  { abbr: "Colo.", name: "Colorado Reports", category: "state" },
  { abbr: "Colo. App.", name: "Colorado Court of Appeals Reports", category: "state" },

  // ── Wisconsin ─────────────────────────────────────────────────────────────
  { abbr: "Wis.", name: "Wisconsin Reports", category: "state" },
  { abbr: "Wis. 2d", name: "Wisconsin Reports, Second Series", category: "state" },

  // ── Minnesota ─────────────────────────────────────────────────────────────
  { abbr: "Minn.", name: "Minnesota Reports", category: "state" },

  // ── Georgia ───────────────────────────────────────────────────────────────
  { abbr: "Ga.", name: "Georgia Reports", category: "state" },
  { abbr: "Ga. App.", name: "Georgia Appeals Reports", category: "state" },

  // ── North Carolina ────────────────────────────────────────────────────────
  { abbr: "N.C.", name: "North Carolina Reports", category: "state" },
  { abbr: "N.C. App.", name: "North Carolina Court of Appeals Reports", category: "state" },

  // ── Tennessee ─────────────────────────────────────────────────────────────
  { abbr: "Tenn.", name: "Tennessee Reports", category: "state" },
  { abbr: "Tenn. App.", name: "Tennessee Appellate Reports", category: "state" },

  // ── Alabama ───────────────────────────────────────────────────────────────
  { abbr: "Ala.", name: "Alabama Reports", category: "state" },
  { abbr: "Ala. App.", name: "Alabama Appellate Reports", category: "state" },

  // ── Louisiana ─────────────────────────────────────────────────────────────
  { abbr: "La.", name: "Louisiana Reports", category: "state" },
  { abbr: "La. App.", name: "Louisiana Appellate Reports", category: "state" },

  // ── South Carolina ────────────────────────────────────────────────────────
  { abbr: "S.C.", name: "South Carolina Reports", category: "state" },

  // ── Kentucky ──────────────────────────────────────────────────────────────
  { abbr: "Ky.", name: "Kentucky Reports", category: "state" },
  { abbr: "Ky. App.", name: "Kentucky Court of Appeals Reports", category: "state" },

  // ── Arkansas ──────────────────────────────────────────────────────────────
  { abbr: "Ark.", name: "Arkansas Reports", category: "state" },
  { abbr: "Ark. App.", name: "Arkansas Court of Appeals Reports", category: "state" },

  // ── Mississippi ───────────────────────────────────────────────────────────
  { abbr: "Miss.", name: "Mississippi Reports", category: "state" },

  // ── Iowa ──────────────────────────────────────────────────────────────────
  { abbr: "Iowa", name: "Iowa Reports", category: "state" },

  // ── Kansas ────────────────────────────────────────────────────────────────
  { abbr: "Kan.", name: "Kansas Reports", category: "state" },
  { abbr: "Kan. App. 2d", name: "Kansas Court of Appeals Reports, Second Series", category: "state" },

  // ── Nebraska ──────────────────────────────────────────────────────────────
  { abbr: "Neb.", name: "Nebraska Reports", category: "state" },

  // ── Oklahoma ──────────────────────────────────────────────────────────────
  { abbr: "Okla.", name: "Oklahoma Reports", category: "state" },

  // ── West Virginia ─────────────────────────────────────────────────────────
  { abbr: "W. Va.", name: "West Virginia Reports", category: "state" },

  // ── Delaware ──────────────────────────────────────────────────────────────
  { abbr: "Del.", name: "Delaware Reports", category: "state" },
  { abbr: "Del. Ch.", name: "Delaware Chancery Reports", category: "state" },

  // ── Hawaii ────────────────────────────────────────────────────────────────
  { abbr: "Haw.", name: "Hawaii Reports", category: "state" },

  // ── Utah ──────────────────────────────────────────────────────────────────
  { abbr: "Utah", name: "Utah Reports", category: "state" },
  { abbr: "Utah 2d", name: "Utah Reports, Second Series", category: "state" },

  // ── Nevada ────────────────────────────────────────────────────────────────
  { abbr: "Nev.", name: "Nevada Reports", category: "state" },

  // ── Arizona ───────────────────────────────────────────────────────────────
  { abbr: "Ariz.", name: "Arizona Reports", category: "state" },
  { abbr: "Ariz. App.", name: "Arizona Court of Appeals Reports", category: "state" },

  // ── New Mexico ────────────────────────────────────────────────────────────
  { abbr: "N.M.", name: "New Mexico Reports", category: "state" },

  // ── Montana ───────────────────────────────────────────────────────────────
  { abbr: "Mont.", name: "Montana Reports", category: "state" },

  // ── Idaho ─────────────────────────────────────────────────────────────────
  { abbr: "Idaho", name: "Idaho Reports", category: "state" },

  // ── Wyoming ───────────────────────────────────────────────────────────────
  { abbr: "Wyo.", name: "Wyoming Reports", category: "state" },

  // ── Alaska ────────────────────────────────────────────────────────────────
  { abbr: "Alaska", name: "Alaska Reports", category: "state" },

  // ── New Hampshire ─────────────────────────────────────────────────────────
  { abbr: "N.H.", name: "New Hampshire Reports", category: "state" },

  // ── Vermont ───────────────────────────────────────────────────────────────
  { abbr: "Vt.", name: "Vermont Reports", category: "state" },

  // ── Rhode Island ──────────────────────────────────────────────────────────
  { abbr: "R.I.", name: "Rhode Island Reports", category: "state" },

  // ── Maine ─────────────────────────────────────────────────────────────────
  { abbr: "Me.", name: "Maine Reports", category: "state" },

  // ── D.C. ──────────────────────────────────────────────────────────────────
  { abbr: "D.C.", name: "District of Columbia Appeals Reports", category: "state" },

  // ── Specialty ─────────────────────────────────────────────────────────────
  { abbr: "U.S.P.Q.", name: "United States Patent Quarterly", category: "specialty" },
  { abbr: "U.S.P.Q.2d", name: "United States Patent Quarterly, Second Series", category: "specialty" },
  { abbr: "Env't Rep.", name: "Environment Reporter Cases", category: "specialty" },
  { abbr: "T.C.", name: "United States Tax Court Reports", category: "specialty" },
  { abbr: "T.C.M.", name: "Tax Court Memorandum Decisions", category: "specialty" },
];

/**
 * Fast lookup set: all known reporter abbreviations.
 * Case-sensitive to match Bluebook style.
 */
export const REPORTER_SET: ReadonlySet<string> = new Set(
  KNOWN_REPORTERS.map((r) => r.abbr)
);
