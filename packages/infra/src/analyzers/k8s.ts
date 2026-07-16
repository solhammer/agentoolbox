import type { Finding } from "../types.js";
import {
  isObject,
  isArray,
  isString,
  getString,
  getBoolean,
  getArray,
  getObject,
} from "../utils.js";
import {
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
  type K8sRuleSpec,
} from "../data/k8s-rules.js";

/** Add a finding, deduplicating by (ruleId, resource). */
function push(
  findings: Finding[],
  seen: Set<string>,
  rule: K8sRuleSpec,
  resource: string,
  message: string
): void {
  const key = `${rule.ruleId}:${resource}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ ruleId: rule.ruleId, severity: rule.severity, resource, message, framework: rule.framework });
}

/**
 * Workload kinds that wrap a PodTemplateSpec under spec.template.spec.
 */
const TEMPLATE_KINDS = new Set([
  "Deployment",
  "DaemonSet",
  "StatefulSet",
  "ReplicaSet",
]);

interface PodEntry {
  /** Display name / path used as the "resource" field in findings. */
  name: string;
  /** The resolved pod spec object (spec for Pod, spec.template.spec for workloads). */
  spec: Record<string, unknown>;
}

/**
 * Recursively extract PodEntry objects from any manifest or list.
 * Handles: Pod, Deployment, DaemonSet, StatefulSet, ReplicaSet, Job, CronJob, List.
 */
function extractPodEntries(doc: unknown): PodEntry[] {
  const entries: PodEntry[] = [];
  if (!isObject(doc)) return entries;

  const kind = getString(doc, "kind") ?? "";
  const meta = getObject(doc, "metadata");
  const name = (meta !== undefined ? getString(meta, "name") : undefined) ?? "unknown";

  // ── List / any-list-like object ────────────────────────────────────────────
  if (kind === "List" || kind === "") {
    const items = getArray(doc, "items");
    if (items !== undefined) {
      for (const item of items) {
        for (const entry of extractPodEntries(item)) {
          entries.push(entry);
        }
      }
    }
    return entries;
  }

  // ── Pod ────────────────────────────────────────────────────────────────────
  if (kind === "Pod") {
    const spec = getObject(doc, "spec");
    if (spec !== undefined) {
      entries.push({ name: `Pod/${name}`, spec });
    }
    return entries;
  }

  // ── Deployment / DaemonSet / StatefulSet / ReplicaSet ─────────────────────
  if (TEMPLATE_KINDS.has(kind)) {
    const outerSpec = getObject(doc, "spec");
    const template = outerSpec !== undefined ? getObject(outerSpec, "template") : undefined;
    const podSpec = template !== undefined ? getObject(template, "spec") : undefined;
    if (podSpec !== undefined) {
      entries.push({ name: `${kind}/${name}`, spec: podSpec });
    }
    return entries;
  }

  // ── Job ────────────────────────────────────────────────────────────────────
  if (kind === "Job") {
    const outerSpec = getObject(doc, "spec");
    const template = outerSpec !== undefined ? getObject(outerSpec, "template") : undefined;
    const podSpec = template !== undefined ? getObject(template, "spec") : undefined;
    if (podSpec !== undefined) {
      entries.push({ name: `Job/${name}`, spec: podSpec });
    }
    return entries;
  }

  // ── CronJob ────────────────────────────────────────────────────────────────
  if (kind === "CronJob") {
    const outerSpec = getObject(doc, "spec");
    const jobTemplate = outerSpec !== undefined ? getObject(outerSpec, "jobTemplate") : undefined;
    const jobSpec = jobTemplate !== undefined ? getObject(jobTemplate, "spec") : undefined;
    const template = jobSpec !== undefined ? getObject(jobSpec, "template") : undefined;
    const podSpec = template !== undefined ? getObject(template, "spec") : undefined;
    if (podSpec !== undefined) {
      entries.push({ name: `CronJob/${name}`, spec: podSpec });
    }
    return entries;
  }

  return entries;
}

/**
 * Return true if the image string uses :latest or has no tag.
 * Images pinned by digest (@sha256:…) are considered safe.
 */
function isUnpinnedImage(image: string): boolean {
  if (image === "") return false;
  // Digest-pinned images are always safe
  if (image.includes("@sha256:")) return false;
  // Strip the registry + path prefix; examine only "name[:tag]" segment
  const lastSlash = image.lastIndexOf("/");
  const nameAndTag = image.slice(lastSlash + 1);
  if (!nameAndTag.includes(":")) return true; // no tag at all → implicit latest
  const tag = nameAndTag.split(":").pop() ?? "";
  return tag === "" || tag === "latest";
}

/**
 * Analyse containers and initContainers in a pod spec.
 */
function analyzeContainers(
  findings: Finding[],
  seen: Set<string>,
  podName: string,
  spec: Record<string, unknown>
): void {
  const containers = getArray(spec, "containers") ?? [];
  const initContainers = getArray(spec, "initContainers") ?? [];

  for (const raw of [...containers, ...initContainers]) {
    if (!isObject(raw)) continue;

    const cName = getString(raw, "name") ?? "unknown";
    const cResource = `${podName}/container:${cName}`;

    const image = getString(raw, "image") ?? "";
    const secCtx = getObject(raw, "securityContext");
    const resources = getObject(raw, "resources");

    // ─── K8S-LATEST-TAG ──────────────────────────────────────────────────────
    if (isUnpinnedImage(image)) {
      push(findings, seen, K8S_LATEST_TAG, cResource,
        `Container "${cName}" in "${podName}" uses an unpinned image: "${image === "" ? "(empty)" : image}"`);
    }

    // ─── K8S-NO-RESOURCE-LIMITS ──────────────────────────────────────────────
    if (resources === undefined || getObject(resources, "limits") === undefined) {
      push(findings, seen, K8S_NO_RESOURCE_LIMITS, cResource,
        `Container "${cName}" in "${podName}" has no resources.limits defined`);
    }

    if (secCtx === undefined) continue;

    // ─── K8S-PRIVILEGED ──────────────────────────────────────────────────────
    if (getBoolean(secCtx, "privileged") === true) {
      push(findings, seen, K8S_PRIVILEGED, cResource,
        `Container "${cName}" in "${podName}" runs as privileged (securityContext.privileged: true)`);
    }

    // ─── K8S-RUN-AS-NON-ROOT ─────────────────────────────────────────────────
    if (getBoolean(secCtx, "runAsNonRoot") === false) {
      push(findings, seen, K8S_RUN_AS_NON_ROOT, cResource,
        `Container "${cName}" in "${podName}" has runAsNonRoot: false`);
    }

    // ─── K8S-PRIVILEGE-ESCALATION ────────────────────────────────────────────
    if (getBoolean(secCtx, "allowPrivilegeEscalation") === true) {
      push(findings, seen, K8S_PRIVILEGE_ESCALATION, cResource,
        `Container "${cName}" in "${podName}" has allowPrivilegeEscalation: true`);
    }

    // ─── K8S-SYS-ADMIN ───────────────────────────────────────────────────────
    const capabilities = getObject(secCtx, "capabilities");
    if (capabilities !== undefined) {
      const addCaps = getArray(capabilities, "add");
      if (
        addCaps !== undefined &&
        addCaps.some((c) => c === "SYS_ADMIN" || c === "ALL")
      ) {
        push(findings, seen, K8S_SYS_ADMIN, cResource,
          `Container "${cName}" in "${podName}" adds SYS_ADMIN or ALL Linux capabilities`);
      }
    }
  }
}

/**
 * Analyse a Kubernetes manifest (Pod, Deployment, DaemonSet, StatefulSet, Job,
 * CronJob, or List) for security misconfigurations.
 *
 * Checks:
 *  - K8S-PRIVILEGED          — privileged: true
 *  - K8S-HOST-NETWORK        — hostNetwork: true
 *  - K8S-HOST-PID            — hostPID: true
 *  - K8S-HOST-IPC            — hostIPC: true
 *  - K8S-HOST-PATH           — hostPath volumes
 *  - K8S-NO-RESOURCE-LIMITS  — missing resources.limits
 *  - K8S-RUN-AS-NON-ROOT     — runAsNonRoot: false
 *  - K8S-PRIVILEGE-ESCALATION — allowPrivilegeEscalation: true
 *  - K8S-SYS-ADMIN           — CAP_ADD SYS_ADMIN or ALL
 *  - K8S-LATEST-TAG          — image with :latest or no tag
 */
export function analyzeK8s(doc: unknown): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  const entries = extractPodEntries(doc);

  for (const { name, spec } of entries) {
    // ─── Pod-level checks ─────────────────────────────────────────────────────

    if (getBoolean(spec, "hostNetwork") === true) {
      push(findings, seen, K8S_HOST_NETWORK, name,
        `"${name}" has hostNetwork: true — shares the node network namespace`);
    }

    if (getBoolean(spec, "hostPID") === true) {
      push(findings, seen, K8S_HOST_PID, name,
        `"${name}" has hostPID: true — containers can see host processes`);
    }

    if (getBoolean(spec, "hostIPC") === true) {
      push(findings, seen, K8S_HOST_IPC, name,
        `"${name}" has hostIPC: true — containers share the host IPC namespace`);
    }

    // ─── hostPath volumes ─────────────────────────────────────────────────────
    const volumes = getArray(spec, "volumes");
    if (volumes !== undefined) {
      for (const vol of volumes) {
        if (!isObject(vol)) continue;
        if ("hostPath" in vol) {
          const volName = getString(vol, "name") ?? "unknown";
          push(findings, seen, K8S_HOST_PATH, `${name}/volume:${volName}`,
            `"${name}" mounts a hostPath volume "${volName}" — exposes host filesystem paths`);
        }
      }
    }

    // ─── Container-level checks ───────────────────────────────────────────────
    analyzeContainers(findings, seen, name, spec);
  }

  return findings;
}
