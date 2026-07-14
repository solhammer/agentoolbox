/**
 * Prompt Injection Detector.
 *
 * Scans user-supplied input for prompt injection attacks before it is passed
 * to an LLM. Each matched pattern contributes a weight to an overall risk
 * score in the range 0.0-1.0.
 */

export interface InjectionResult {
  risk: "safe" | "suspicious" | "injection";
  score: number;
  patterns: string[];
  advice: string;
}

interface InjectionPattern {
  /** Human-readable label reported in `patterns`. */
  label: string;
  regex: RegExp;
  weight: number;
}

const PATTERNS: InjectionPattern[] = [
  // ── Instruction override ────────────────────────────────────────────────────
  {
    label: "instruction_override",
    regex: /ignore (all |previous |above |prior )?instructions?/i,
    weight: 0.5,
  },
  {
    label: "instruction_override",
    regex: /forget (everything|all)/i,
    weight: 0.5,
  },
  {
    label: "instruction_override",
    regex: /disregard (the above|previous)/i,
    weight: 0.5,
  },
  {
    label: "instruction_override",
    regex: /new instructions:/i,
    weight: 0.4,
  },
  {
    label: "instruction_override",
    regex: /^system:/im,
    weight: 0.4,
  },
  // ── Role hijacking ───────────────────────────────────────────────────────────
  {
    label: "role_hijacking",
    regex: /you are now/i,
    weight: 0.35,
  },
  {
    label: "role_hijacking",
    regex: /act as/i,
    weight: 0.3,
  },
  {
    label: "role_hijacking",
    regex: /pretend (you are|to be)/i,
    weight: 0.35,
  },
  {
    label: "role_hijacking",
    regex: /roleplay as/i,
    weight: 0.35,
  },
  {
    label: "role_hijacking",
    regex: /your new (role|persona|instructions)/i,
    weight: 0.4,
  },
  // ── Jailbreak ────────────────────────────────────────────────────────────────
  {
    label: "jailbreak",
    regex: /DAN mode/i,
    weight: 0.5,
  },
  {
    label: "jailbreak",
    regex: /developer mode/i,
    weight: 0.45,
  },
  {
    label: "jailbreak",
    regex: /jailbreak/i,
    weight: 0.5,
  },
  {
    label: "jailbreak",
    regex: /no restrictions/i,
    weight: 0.45,
  },
  {
    label: "jailbreak",
    regex: /without (any )?restrictions/i,
    weight: 0.45,
  },
  {
    label: "jailbreak",
    regex: /bypass (your )?(safety|filter|restriction|guideline)/i,
    weight: 0.5,
  },
  // ── Data exfiltration ────────────────────────────────────────────────────────
  {
    label: "data_exfiltration",
    regex: /print (your |the |all |system )?(instructions|prompt|system prompt)/i,
    weight: 0.5,
  },
  {
    label: "data_exfiltration",
    regex: /reveal (your|the) (system prompt|instructions)/i,
    weight: 0.5,
  },
  {
    label: "data_exfiltration",
    regex: /what (are|were) (your|the) (instructions|system prompt)/i,
    weight: 0.45,
  },
  // ── Encoding tricks ──────────────────────────────────────────────────────────
  {
    label: "encoding_base64",
    regex: /[A-Za-z0-9+/]{50,}={0,2}/,
    weight: 0.3,
  },
  {
    label: "unicode_direction_override",
    regex: /[\u202e\u200f]/,
    weight: 0.4,
  },
];

/**
 * Detects prompt injection attempts in a piece of user input.
 *
 * Sums the weights of every matched pattern (capped at 1.0) and maps the score
 * onto a risk band:
 *   - safe        (< 0.3)
 *   - suspicious  (0.3 - 0.6)
 *   - injection   (> 0.6)
 */
export function detectPromptInjection(input: string): InjectionResult {
  const matched = new Set<string>();
  let score = 0;

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(input)) {
      matched.add(pattern.label);
      score += pattern.weight;
    }
  }

  score = Math.min(1, Number(score.toFixed(2)));

  let risk: InjectionResult["risk"];
  let advice: string;
  if (score > 0.6) {
    risk = "injection";
    advice =
      "High-confidence prompt injection detected. Do not forward this input to the LLM without sanitisation.";
  } else if (score >= 0.3) {
    risk = "suspicious";
    advice =
      "Input contains suspicious patterns. Review or sandbox before passing it to the LLM.";
  } else {
    risk = "safe";
    advice = "No prompt injection patterns detected.";
  }

  return {
    risk,
    score,
    patterns: [...matched],
    advice,
  };
}
