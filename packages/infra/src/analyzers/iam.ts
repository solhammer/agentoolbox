import type { Finding } from "../types.js";
import {
  isObject,
  isArray,
  isString,
  getString,
  getArray,
} from "../utils.js";
import {
  IAM_WILDCARD_ACTION,
  IAM_WILDCARD_RESOURCE,
  IAM_NOTACTION,
  IAM_WILDCARD_PRINCIPAL,
  IAM_PASSROLE_STAR,
  type IamRuleSpec,
} from "../data/iam-rules.js";

/** Add a finding, deduplicating by (ruleId, resource). */
function push(
  findings: Finding[],
  seen: Set<string>,
  rule: IamRuleSpec,
  resource: string,
  message: string
): void {
  const key = `${rule.ruleId}:${resource}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ ruleId: rule.ruleId, severity: rule.severity, resource, message, framework: rule.framework });
}

/** Normalize Action / Resource to a string[] (handles string or string[]). */
function toStringArray(val: unknown): string[] {
  if (isString(val)) return [val];
  if (isArray(val)) return val.filter(isString);
  return [];
}

/**
 * Return true if the Principal field represents a wildcard ("*").
 * Handles:
 *   Principal: "*"
 *   Principal: { AWS: "*" }
 *   Principal: { AWS: ["*", ...] }
 */
function isWildcardPrincipal(stmt: Record<string, unknown>): boolean {
  const principal = stmt["Principal"];
  if (principal === "*") return true;
  if (isObject(principal)) {
    const aws = principal["AWS"];
    if (aws === "*") return true;
    if (isArray(aws) && aws.includes("*")) return true;
    const federated = principal["Federated"];
    if (federated === "*") return true;
  }
  return false;
}

/**
 * Analyse an AWS IAM policy document.
 *
 * Evaluates each Statement for:
 *  - IAM-WILDCARD-ACTION     — Action: "*"
 *  - IAM-WILDCARD-RESOURCE   — Allow + Resource: "*"
 *  - IAM-NOTACTION           — Allow + NotAction present
 *  - IAM-WILDCARD-PRINCIPAL  — Principal: "*"
 *  - IAM-PASSROLE-STAR       — Allow + iam:PassRole + Resource: "*"
 */
export function analyzeIam(doc: unknown): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  if (!isObject(doc)) return findings;

  const rawStatements = getArray(doc, "Statement");
  if (rawStatements === undefined) return findings;

  rawStatements.forEach((raw, index) => {
    if (!isObject(raw)) return;

    const sid = getString(raw, "Sid") ?? `Statement[${index}]`;
    const effect = getString(raw, "Effect") ?? "Allow";
    const resource = `Statement:${sid}`;

    const actions = toStringArray(raw["Action"]);
    const resources = toStringArray(raw["Resource"]);

    // ─── IAM-WILDCARD-ACTION ──────────────────────────────────────────────────
    if (actions.includes("*")) {
      push(findings, seen, IAM_WILDCARD_ACTION, resource,
        `Statement "${sid}" grants Action: "*" — all API actions are permitted`);
    }

    // ─── IAM-WILDCARD-RESOURCE ────────────────────────────────────────────────
    if (effect === "Allow" && resources.includes("*")) {
      push(findings, seen, IAM_WILDCARD_RESOURCE, resource,
        `Statement "${sid}" allows Effect Allow on Resource: "*" — applies to every resource in the account`);
    }

    // ─── IAM-NOTACTION ────────────────────────────────────────────────────────
    if (effect === "Allow" && "NotAction" in raw) {
      push(findings, seen, IAM_NOTACTION, resource,
        `Statement "${sid}" uses NotAction with Effect Allow — permits all actions except those listed`);
    }

    // ─── IAM-WILDCARD-PRINCIPAL ───────────────────────────────────────────────
    if (isWildcardPrincipal(raw)) {
      push(findings, seen, IAM_WILDCARD_PRINCIPAL, resource,
        `Statement "${sid}" has Principal: "*" — any entity can assume this role or access this resource`);
    }

    // ─── IAM-PASSROLE-STAR ────────────────────────────────────────────────────
    if (effect === "Allow" && actions.includes("iam:PassRole") && resources.includes("*")) {
      push(findings, seen, IAM_PASSROLE_STAR, resource,
        `Statement "${sid}" grants iam:PassRole on Resource: "*" — enables privilege escalation to any role`);
    }
  });

  return findings;
}
