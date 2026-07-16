import type { Severity } from "../types.js";

/** Metadata for a single Kubernetes analysis rule. */
export interface K8sRuleSpec {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly framework: string;
}

/**
 * K8S-PRIVILEGED — Container runs with privileged: true.
 * Grants full host-level capabilities; equivalent to running as root on the node.
 */
export const K8S_PRIVILEGED: K8sRuleSpec = {
  ruleId: "K8S-PRIVILEGED",
  severity: "critical",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-HOST-NETWORK — Pod has hostNetwork: true.
 * Container shares the node's network namespace, bypassing network policies.
 */
export const K8S_HOST_NETWORK: K8sRuleSpec = {
  ruleId: "K8S-HOST-NETWORK",
  severity: "high",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-HOST-PID — Pod has hostPID: true.
 * Container can see and interact with all processes on the host.
 */
export const K8S_HOST_PID: K8sRuleSpec = {
  ruleId: "K8S-HOST-PID",
  severity: "high",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-HOST-IPC — Pod has hostIPC: true.
 * Container shares the host IPC namespace, enabling cross-process communication.
 */
export const K8S_HOST_IPC: K8sRuleSpec = {
  ruleId: "K8S-HOST-IPC",
  severity: "high",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-HOST-PATH — Pod mounts a hostPath volume.
 * Grants access to arbitrary host filesystem paths; can be used to escape the container.
 */
export const K8S_HOST_PATH: K8sRuleSpec = {
  ruleId: "K8S-HOST-PATH",
  severity: "medium",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-NO-RESOURCE-LIMITS — Container has no resources.limits defined.
 * Without limits the container can consume unbounded CPU/memory, causing node instability.
 */
export const K8S_NO_RESOURCE_LIMITS: K8sRuleSpec = {
  ruleId: "K8S-NO-RESOURCE-LIMITS",
  severity: "low",
  framework: "Kubernetes Best Practices",
};

/**
 * K8S-RUN-AS-NON-ROOT — Container has runAsNonRoot: false.
 * Explicitly permits the container entrypoint to run as UID 0 (root).
 */
export const K8S_RUN_AS_NON_ROOT: K8sRuleSpec = {
  ruleId: "K8S-RUN-AS-NON-ROOT",
  severity: "high",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-PRIVILEGE-ESCALATION — Container has allowPrivilegeEscalation: true.
 * Allows the container process to gain more privileges than its parent process.
 */
export const K8S_PRIVILEGE_ESCALATION: K8sRuleSpec = {
  ruleId: "K8S-PRIVILEGE-ESCALATION",
  severity: "high",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-SYS-ADMIN — Container adds SYS_ADMIN or ALL Linux capability.
 * SYS_ADMIN is equivalent to near-root on the host; ALL grants every capability.
 */
export const K8S_SYS_ADMIN: K8sRuleSpec = {
  ruleId: "K8S-SYS-ADMIN",
  severity: "critical",
  framework: "CIS Kubernetes Benchmark",
};

/**
 * K8S-LATEST-TAG — Container image uses the :latest tag or has no tag.
 * Mutable tags prevent reproducible deployments and can introduce supply-chain risk.
 */
export const K8S_LATEST_TAG: K8sRuleSpec = {
  ruleId: "K8S-LATEST-TAG",
  severity: "medium",
  framework: "Container Best Practices",
};

/** All Kubernetes rule specs, in order. */
export const K8S_RULES: readonly K8sRuleSpec[] = [
  K8S_PRIVILEGED,
  K8S_HOST_NETWORK,
  K8S_HOST_PID,
  K8S_HOST_IPC,
  K8S_HOST_PATH,
  K8S_NO_RESOURCE_LIMITS,
  K8S_RUN_AS_NON_ROOT,
  K8S_PRIVILEGE_ESCALATION,
  K8S_SYS_ADMIN,
  K8S_LATEST_TAG,
];
