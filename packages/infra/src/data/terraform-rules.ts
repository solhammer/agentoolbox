import type { Severity } from "../types.js";

/** Metadata for a single Terraform analysis rule. */
export interface TerraformRuleSpec {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly framework: string;
}

/**
 * TF-SEC-001 — Security group ingress open to 0.0.0.0/0 or ::/0.
 * Exposes resources to any internet source.
 */
export const TF_SEC_001: TerraformRuleSpec = {
  ruleId: "TF-SEC-001",
  severity: "high",
  framework: "CIS AWS Foundations Benchmark",
};

/**
 * TF-SEC-002 — S3 bucket public ACL (public-read or public-read-write).
 * Makes bucket objects world-readable or world-writable.
 */
export const TF_SEC_002: TerraformRuleSpec = {
  ruleId: "TF-SEC-002",
  severity: "critical",
  framework: "CIS AWS Foundations Benchmark",
};

/**
 * TF-SEC-003 — RDS instance with publicly_accessible = true.
 * Exposes the database endpoint on the public internet.
 */
export const TF_SEC_003: TerraformRuleSpec = {
  ruleId: "TF-SEC-003",
  severity: "critical",
  framework: "CIS AWS Foundations Benchmark",
};

/**
 * TF-SEC-004 — Unencrypted storage (EBS volume or RDS instance with encryption disabled).
 * Data at rest is not protected against storage-level compromise.
 */
export const TF_SEC_004: TerraformRuleSpec = {
  ruleId: "TF-SEC-004",
  severity: "medium",
  framework: "CIS AWS Foundations Benchmark",
};

/**
 * TF-CHG-001 — Destroy or replace action on a stateful resource.
 * Deleting a database, disk, or bucket is irreversible and high-blast-radius.
 */
export const TF_CHG_001: TerraformRuleSpec = {
  ruleId: "TF-CHG-001",
  severity: "high",
  framework: "Change Risk Management",
};

/** All Terraform rule specs, in order. */
export const TERRAFORM_RULES: readonly TerraformRuleSpec[] = [
  TF_SEC_001,
  TF_SEC_002,
  TF_SEC_003,
  TF_SEC_004,
  TF_CHG_001,
];

/** Resource types considered stateful (databases, disks, buckets). */
export const STATEFUL_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  "aws_db_instance",
  "aws_rds_cluster",
  "aws_rds_cluster_instance",
  "aws_ebs_volume",
  "aws_s3_bucket",
  "aws_dynamodb_table",
  "aws_elasticache_cluster",
  "aws_elasticsearch_domain",
  "aws_opensearch_domain",
  "aws_redshift_cluster",
  "aws_efs_file_system",
  "aws_fsx_lustre_file_system",
  "aws_fsx_windows_file_system",
]);

/** S3 ACL values that expose bucket objects publicly. */
export const PUBLIC_ACL_VALUES: ReadonlySet<string> = new Set([
  "public-read",
  "public-read-write",
]);
