/**
 * Secret & Credential Scanner.
 *
 * Detects hardcoded secrets in AI-generated code before it is committed or
 * executed. Each match is redacted so the raw secret is never echoed back to
 * the caller.
 */

export interface SecretFinding {
  type: string;
  match: string;
  line: number;
  severity: "critical" | "high" | "medium";
  suggestion: string;
}

interface Detector {
  type: string;
  regex: RegExp;
  severity: "critical" | "high" | "medium";
  suggestion: string;
}

/**
 * Detector definitions. Each regex uses the global flag so every occurrence in
 * the source is reported; case-insensitivity is applied where the original
 * pattern used an inline `(?i)` flag.
 */
const DETECTORS: Detector[] = [
  {
    type: "aws_access_key",
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: "critical",
    suggestion:
      "Remove the AWS access key ID and load credentials from the environment or an IAM role.",
  },
  {
    type: "aws_secret_key",
    regex: /aws.{0,20}secret.{0,20}['"]([A-Za-z0-9/+=]{40})/gi,
    severity: "critical",
    suggestion:
      "Never hardcode an AWS secret access key. Use environment variables or a secrets manager.",
  },
  {
    type: "github_token",
    regex: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/g,
    severity: "critical",
    suggestion:
      "Revoke this GitHub token immediately and store tokens in a secret manager, not source.",
  },
  {
    type: "openai_key",
    regex: /sk-[A-Za-z0-9]{48}/g,
    severity: "critical",
    suggestion:
      "Rotate this OpenAI API key and read it from an environment variable instead.",
  },
  {
    type: "anthropic_key",
    regex: /sk-ant-[A-Za-z0-9\-_]{93}/g,
    severity: "critical",
    suggestion:
      "Rotate this Anthropic API key and read it from an environment variable instead.",
  },
  {
    type: "generic_api_key",
    regex:
      /(api[_-]?key|apikey|api[_-]?secret)\s*[=:"']\s*['"]([A-Za-z0-9\-_]{20,})['"]/gi,
    severity: "high",
    suggestion:
      "Move this API key out of source and load it from configuration or the environment.",
  },
  {
    type: "generic_password",
    regex: /(password|passwd|pwd)\s*[=:"']\s*['"]([^'"\s]{8,})['"]/gi,
    severity: "high",
    suggestion:
      "Do not hardcode passwords. Use environment variables or a secrets manager.",
  },
  {
    type: "private_key",
    regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/g,
    severity: "critical",
    suggestion:
      "Remove the private key from source and store it in a secure secret store.",
  },
  {
    type: "connection_string",
    regex: /(mongodb|postgresql|mysql|redis):\/\/[^:]+:[^@]+@/gi,
    severity: "critical",
    suggestion:
      "Strip credentials from the connection string and supply them via environment variables.",
  },
  {
    type: "high_entropy_hex",
    regex: /[0-9a-fA-F]{32,}/g,
    severity: "medium",
    suggestion:
      "This high-entropy hex string may be a secret. Verify it is not a credential or token.",
  },
];

/** Redacts a secret by keeping the first and last few chars and masking the middle. */
function redact(value: string): string {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }
  const head = value.slice(0, 4);
  const tail = value.slice(-4);
  return `${head}***${tail}`;
}

/** Returns the 1-based line number for a character index within `code`. */
function lineNumberAt(code: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < code.length; i++) {
    if (code[i] === "\n") line++;
  }
  return line;
}

/**
 * Scans source code for hardcoded secrets and credentials.
 *
 * Returns a list of findings with the offending value redacted and the line
 * number on which it was found.
 */
export function scanSecrets(code: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const detector of DETECTORS) {
    // Reset lastIndex to ensure a clean scan for each detector.
    detector.regex.lastIndex = 0;
    for (const m of code.matchAll(detector.regex)) {
      if (m.index === undefined) continue;
      const raw = m[0];
      findings.push({
        type: detector.type,
        match: redact(raw),
        line: lineNumberAt(code, m.index),
        severity: detector.severity,
        suggestion: detector.suggestion,
      });
    }
  }

  return findings;
}
