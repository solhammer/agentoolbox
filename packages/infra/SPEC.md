# @agentoolbox/infra — Rule Specification

## Verdict Logic

| Condition | Verdict |
|---|---|
| Any finding with severity ≥ `blockSeverityAtOrAbove` (default `high`) | `BLOCK` |
| Findings exist but all are below the threshold | `FLAG` |
| No findings | `PASS` |

Severity order: `low` < `medium` < `high` < `critical`

---

## Terraform Rules (`format: "terraform"`)

Input: the parsed JSON output of `terraform show -json`. The analyser inspects `resource_changes[]`.

### TF-SEC-001 — Open Ingress (severity: **high**)
**Framework**: CIS AWS Foundations Benchmark

Triggered when an `aws_security_group` or `aws_security_group_rule` resource contains an ingress rule with `cidr_blocks` including `0.0.0.0/0` or `ipv6_cidr_blocks` including `::/0`. Exposes the resource to the entire internet.

### TF-SEC-002 — S3 Public ACL (severity: **critical**)
**Framework**: CIS AWS Foundations Benchmark

Triggered when an `aws_s3_bucket` or `aws_s3_bucket_acl` resource has an `acl` value of `public-read` or `public-read-write`. Makes bucket objects world-readable or world-writable.

### TF-SEC-003 — RDS Publicly Accessible (severity: **critical**)
**Framework**: CIS AWS Foundations Benchmark

Triggered when an `aws_db_instance` has `publicly_accessible: true`. Exposes the database endpoint on the public internet.

### TF-SEC-004 — Unencrypted Storage (severity: **medium**)
**Framework**: CIS AWS Foundations Benchmark

Triggered when:
- `aws_db_instance` has `storage_encrypted: false`
- `aws_ebs_volume` has `encrypted: false`

Data at rest is not protected against storage-level compromise.

### TF-CHG-001 — Stateful Resource Destroy/Replace (severity: **high**)
**Framework**: Change Risk Management

Triggered when `change.actions` includes `"delete"` for any stateful resource type:
`aws_db_instance`, `aws_rds_cluster`, `aws_rds_cluster_instance`, `aws_ebs_volume`, `aws_s3_bucket`, `aws_dynamodb_table`, `aws_elasticache_cluster`, `aws_elasticsearch_domain`, `aws_opensearch_domain`, `aws_redshift_cluster`, `aws_efs_file_system`, `aws_fsx_lustre_file_system`, `aws_fsx_windows_file_system`.

Deleting a database, disk, or bucket is irreversible and high-blast-radius.

---

## IAM Rules (`format: "iam"`)

Input: a parsed AWS IAM policy document JSON with a `Statement` array.

### IAM-WILDCARD-ACTION — Wildcard Action (severity: **critical**)
**Framework**: AWS IAM Best Practices

Triggered when any statement has `Action: "*"`. All API actions including administrative and destructive operations are permitted.

### IAM-WILDCARD-RESOURCE — Wildcard Resource with Allow (severity: **high**)
**Framework**: AWS IAM Best Practices

Triggered when any Allow statement has `Resource: "*"`. Permissions apply to every resource in the account.

### IAM-NOTACTION — NotAction with Allow (severity: **high**)
**Framework**: AWS IAM Best Practices

Triggered when any Allow statement uses `NotAction`. Permits every action except those listed — typically far broader than intended.

### IAM-WILDCARD-PRINCIPAL — Wildcard Principal (severity: **critical**)
**Framework**: AWS IAM Best Practices

Triggered when any statement has `Principal: "*"` (or `Principal.AWS: "*"`). Any unauthenticated or authenticated entity can assume the role or access the resource.

### IAM-PASSROLE-STAR — iam:PassRole on All Resources (severity: **high**)
**Framework**: AWS IAM Best Practices

Triggered when an Allow statement explicitly lists `iam:PassRole` as an Action and `Resource: "*"`. Enables privilege escalation by allowing the caller to pass any role in the account to any service.

---

## Kubernetes Rules (`format: "k8s"`)

Input: a parsed Kubernetes manifest JSON. Supports `Pod`, `Deployment`, `DaemonSet`, `StatefulSet`, `ReplicaSet`, `Job`, `CronJob`, and `List`.

### K8S-PRIVILEGED — Privileged Container (severity: **critical**)
**Framework**: CIS Kubernetes Benchmark

Triggered when a container has `securityContext.privileged: true`. Grants full host-level capabilities; equivalent to running as root on the node.

### K8S-HOST-NETWORK — Host Network Namespace (severity: **high**)
**Framework**: CIS Kubernetes Benchmark

Triggered when `spec.hostNetwork: true`. The container shares the node's network namespace, bypassing Kubernetes network policies.

### K8S-HOST-PID — Host PID Namespace (severity: **high**)
**Framework**: CIS Kubernetes Benchmark

Triggered when `spec.hostPID: true`. Containers can see and signal all processes on the host.

### K8S-HOST-IPC — Host IPC Namespace (severity: **high**)
**Framework**: CIS Kubernetes Benchmark

Triggered when `spec.hostIPC: true`. Containers share the host's IPC namespace, enabling cross-process communication attacks.

### K8S-HOST-PATH — hostPath Volume (severity: **medium**)
**Framework**: CIS Kubernetes Benchmark

Triggered when any `spec.volumes[]` entry contains a `hostPath` key. Mounts arbitrary host filesystem paths into the container, enabling container escape vectors.

### K8S-NO-RESOURCE-LIMITS — Missing Resource Limits (severity: **low**)
**Framework**: Kubernetes Best Practices

Triggered when a container has no `resources.limits` defined. Without CPU/memory limits the container can starve other workloads, causing node instability.

### K8S-RUN-AS-NON-ROOT — runAsNonRoot: false (severity: **high**)
**Framework**: CIS Kubernetes Benchmark

Triggered when a container has `securityContext.runAsNonRoot: false`. Explicitly permits the container entrypoint to run as UID 0 (root).

### K8S-PRIVILEGE-ESCALATION — allowPrivilegeEscalation: true (severity: **high**)
**Framework**: CIS Kubernetes Benchmark

Triggered when a container has `securityContext.allowPrivilegeEscalation: true`. Allows the container process to gain more privileges than its parent.

### K8S-SYS-ADMIN — SYS_ADMIN Capability (severity: **critical**)
**Framework**: CIS Kubernetes Benchmark

Triggered when `securityContext.capabilities.add` includes `SYS_ADMIN` or `ALL`. SYS_ADMIN grants near-root access on the host node.

### K8S-LATEST-TAG — Unpinned Image Tag (severity: **medium**)
**Framework**: Container Best Practices

Triggered when a container's `image` field uses the `:latest` tag or has no tag at all (implicit latest). Images pinned by digest (`@sha256:…`) are exempt. Mutable image tags prevent reproducible deployments and introduce supply-chain risk.

---

## Certificate Schema

```
certificate = "sha256:" + hex( sha256( sha256(subject) + ":" + verdict + ":" + findingCount + ":" + timestamp ) )
subject     = format + ":" + JSON.stringify(document)
```

The certificate binds the analysed document (via its hash), the verdict, the number of findings, and the Unix timestamp (ms) of the call. Any change to the document, verdict, or finding count will produce a different certificate.
