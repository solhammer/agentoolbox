import type { Severity } from "../types.js";

/** Metadata for a single IAM analysis rule. */
export interface IamRuleSpec {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly framework: string;
}

/**
 * IAM-WILDCARD-ACTION — Statement grants Action: "*".
 * All API actions are permitted, including administrative and destructive ones.
 */
export const IAM_WILDCARD_ACTION: IamRuleSpec = {
  ruleId: "IAM-WILDCARD-ACTION",
  severity: "critical",
  framework: "AWS IAM Best Practices",
};

/**
 * IAM-WILDCARD-RESOURCE — Allow statement targets Resource: "*".
 * Permissions apply to every resource in the account, not just intended targets.
 */
export const IAM_WILDCARD_RESOURCE: IamRuleSpec = {
  ruleId: "IAM-WILDCARD-RESOURCE",
  severity: "high",
  framework: "AWS IAM Best Practices",
};

/**
 * IAM-NOTACTION — Allow statement uses NotAction.
 * Permits every action EXCEPT the listed ones — typically far broader than intended.
 */
export const IAM_NOTACTION: IamRuleSpec = {
  ruleId: "IAM-NOTACTION",
  severity: "high",
  framework: "AWS IAM Best Practices",
};

/**
 * IAM-WILDCARD-PRINCIPAL — Statement has Principal: "*".
 * Any unauthenticated or authenticated entity in the world can assume the role/access
 * the resource.
 */
export const IAM_WILDCARD_PRINCIPAL: IamRuleSpec = {
  ruleId: "IAM-WILDCARD-PRINCIPAL",
  severity: "critical",
  framework: "AWS IAM Best Practices",
};

/**
 * IAM-PASSROLE-STAR — Allow statement grants iam:PassRole on Resource: "*".
 * Allows privilege escalation by passing any role in the account to any service.
 */
export const IAM_PASSROLE_STAR: IamRuleSpec = {
  ruleId: "IAM-PASSROLE-STAR",
  severity: "high",
  framework: "AWS IAM Best Practices",
};

/** All IAM rule specs, in order. */
export const IAM_RULES: readonly IamRuleSpec[] = [
  IAM_WILDCARD_ACTION,
  IAM_WILDCARD_RESOURCE,
  IAM_NOTACTION,
  IAM_WILDCARD_PRINCIPAL,
  IAM_PASSROLE_STAR,
];
