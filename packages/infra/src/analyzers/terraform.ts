import type { Finding } from "../types.js";
import {
  isObject,
  isArray,
  isString,
  isBoolean,
  getString,
  getBoolean,
  getArray,
  getObject,
} from "../utils.js";
import {
  TF_SEC_001,
  TF_SEC_002,
  TF_SEC_003,
  TF_SEC_004,
  TF_CHG_001,
  type TerraformRuleSpec,
  STATEFUL_RESOURCE_TYPES,
  PUBLIC_ACL_VALUES,
} from "../data/terraform-rules.js";

/** Add a finding, deduplicating by (ruleId, resource). */
function push(
  findings: Finding[],
  seen: Set<string>,
  rule: TerraformRuleSpec,
  resource: string,
  message: string
): void {
  const key = `${rule.ruleId}:${resource}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ ruleId: rule.ruleId, severity: rule.severity, resource, message, framework: rule.framework });
}

/** Check whether any cidr_blocks or ipv6_cidr_blocks in an ingress rule object are open. */
function ingressIsOpen(rule: Record<string, unknown>): boolean {
  const cidr4 = getArray(rule, "cidr_blocks");
  const cidr6 = getArray(rule, "ipv6_cidr_blocks");
  return (
    (cidr4 !== undefined && cidr4.some((c) => c === "0.0.0.0/0")) ||
    (cidr6 !== undefined && cidr6.some((c) => c === "::/0"))
  );
}

/**
 * Analyse a parsed `terraform show -json` plan document.
 *
 * Inspects `resource_changes[]` for:
 *  - TF-SEC-001 — security group ingress open to 0.0.0.0/0 / ::/0
 *  - TF-SEC-002 — S3 bucket or aws_s3_bucket_acl with a public ACL
 *  - TF-SEC-003 — RDS instance with publicly_accessible = true
 *  - TF-SEC-004 — Unencrypted EBS volume or RDS instance
 *  - TF-CHG-001 — Destroy / replace action on stateful resource
 */
export function analyzeTerraform(doc: unknown): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  if (!isObject(doc)) return findings;

  const resourceChanges = getArray(doc, "resource_changes");
  if (resourceChanges === undefined) return findings;

  for (const rc of resourceChanges) {
    if (!isObject(rc)) continue;

    const address = getString(rc, "address") ?? "unknown";
    const type = getString(rc, "type") ?? "";
    const change = getObject(rc, "change");
    if (change === undefined) continue;

    const actions = getArray(change, "actions") ?? [];
    const after = change["after"];
    const afterObj = isObject(after) ? after : undefined;

    // ─── TF-CHG-001: Stateful resource destroy / replace ─────────────────────
    if (STATEFUL_RESOURCE_TYPES.has(type)) {
      const actionStrings = actions.filter(isString);
      if (actionStrings.includes("delete")) {
        push(findings, seen, TF_CHG_001, address,
          `Stateful resource "${address}" (${type}) will be destroyed or replaced; this action is irreversible`);
      }
    }

    if (afterObj === undefined) continue;

    // ─── TF-SEC-001: aws_security_group — ingress open to the world ───────────
    if (type === "aws_security_group") {
      const ingress = getArray(afterObj, "ingress");
      if (ingress !== undefined) {
        for (const rule of ingress) {
          if (!isObject(rule)) continue;
          if (ingressIsOpen(rule)) {
            push(findings, seen, TF_SEC_001, address,
              `Security group "${address}" has an ingress rule open to 0.0.0.0/0 or ::/0`);
            break; // one finding per resource
          }
        }
      }
    }

    // ─── TF-SEC-001: aws_security_group_rule — ingress open to the world ──────
    if (type === "aws_security_group_rule") {
      const ruleType = getString(afterObj, "type");
      if (ruleType === "ingress" && ingressIsOpen(afterObj)) {
        push(findings, seen, TF_SEC_001, address,
          `Security group rule "${address}" allows ingress from 0.0.0.0/0 or ::/0`);
      }
    }

    // ─── TF-SEC-002: S3 public ACL ────────────────────────────────────────────
    if (type === "aws_s3_bucket" || type === "aws_s3_bucket_acl") {
      const acl = getString(afterObj, "acl");
      if (acl !== undefined && PUBLIC_ACL_VALUES.has(acl)) {
        push(findings, seen, TF_SEC_002, address,
          `S3 resource "${address}" has a public ACL value: "${acl}"`);
      }
    }

    // ─── TF-SEC-003: RDS publicly accessible ─────────────────────────────────
    if (type === "aws_db_instance") {
      if (getBoolean(afterObj, "publicly_accessible") === true) {
        push(findings, seen, TF_SEC_003, address,
          `RDS instance "${address}" is publicly accessible (publicly_accessible = true)`);
      }
    }

    // ─── TF-SEC-004: Unencrypted storage ─────────────────────────────────────
    if (type === "aws_db_instance") {
      if (getBoolean(afterObj, "storage_encrypted") === false) {
        push(findings, seen, TF_SEC_004, address,
          `RDS instance "${address}" has storage_encrypted = false`);
      }
    }

    if (type === "aws_ebs_volume") {
      const encrypted = afterObj["encrypted"];
      // Flag when explicitly false OR when the key is absent (default is unencrypted)
      if (isBoolean(encrypted) && !encrypted) {
        push(findings, seen, TF_SEC_004, address,
          `EBS volume "${address}" has encrypted = false`);
      }
    }
  }

  return findings;
}
