/**
 * Quality check pipeline for agent-generated code and content.
 *
 * Runs all agent-toolbox.ai services in the recommended order:
 *
 *   User input:  scan/injection
 *   Context:     tokens/count → distill (if needed)
 *   Code output: scan/secrets → validate/imports → scan/vulnerabilities → verify
 *   NL output:   verify (with sourceTexts if available)
 *
 * Each check is fast and cheap. The full code pipeline costs 0.0007 SOL (~$0.10).
 */

import { AgentoolboxClient } from "agent-toolbox-sdk";

export type Language = "python" | "javascript" | "typescript" | "rust" | "go";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PipelineResult {
  passed: boolean;
  blockedAt?: string;
  checks: CheckResult[];
  totalCreditsUsed: number;
}

export interface CheckResult {
  name: string;
  status: "pass" | "flag" | "block" | "skip";
  details: string;
  latencyMs?: number;
}

// ── User input guard ─────────────────────────────────────────────────────────

/**
 * Run before passing any user-supplied text to an LLM.
 * Returns false if injection detected.
 */
export async function guardUserInput(
  client: AgentoolboxClient,
  input: string,
  context?: string
): Promise<{ safe: boolean; result: CheckResult }> {
  const start = Date.now();
  const raw = await client.scanInjection({ input, context });
  // scanInjection returns raw API response — cast to expected shape
  const res = raw as unknown as { risk: string; score: number; patterns: string[]; advice: string };
  const latencyMs = Date.now() - start;

  const safe = res.risk === "safe";
  return {
    safe,
    result: {
      name: "scan/injection",
      status: res.risk === "safe" ? "pass" : res.risk === "suspicious" ? "flag" : "block",
      details: safe
        ? `No injection patterns detected (score: ${res.score.toFixed(2)})`
        : `${res.risk.toUpperCase()}: ${res.patterns.join(", ")} — ${res.advice}`,
      latencyMs,
    },
  };
}

// ── Context management ───────────────────────────────────────────────────────

const CONTEXT_WARN_TOKENS = 3000;
const CONTEXT_DISTILL_TOKENS = 4000;

/**
 * Count tokens in the current conversation and distill if over budget.
 * Returns the (possibly compressed) messages.
 */
export async function manageContext(
  client: AgentoolboxClient,
  messages: Message[],
  model: "gpt-4" | "gpt-3.5" | "claude" | "gemini" = "gpt-4"
): Promise<{ messages: Message[]; checks: CheckResult[] }> {
  const checks: CheckResult[] = [];

  // Count tokens
  const countStart = Date.now();
  const countRaw = await client.countTokens({ messages, model });
  const count = countRaw as unknown as {
    total: number;
    estimatedCostUsd: { input: number; output1k: number };
    contextWindowRemaining: number;
  };
  checks.push({
    name: "tokens/count",
    status: count.total < CONTEXT_WARN_TOKENS ? "pass" : "flag",
    details: `${count.total} tokens (~$${count.estimatedCostUsd.input.toFixed(4)} input) · ${count.contextWindowRemaining.toLocaleString()} remaining`,
    latencyMs: Date.now() - countStart,
  });

  // Distill if over budget
  if (count.total > CONTEXT_WARN_TOKENS) {
    const distillStart = Date.now();
    const distillRaw = await client.distill({ messages, targetTokens: CONTEXT_DISTILL_TOKENS });
    const distill = distillRaw as unknown as {
      messages: Message[];
      originalCount: number;
      distilledCount: number;
      compressionRatio: number;
      estimatedTokens: number;
    };
    const savings = Math.round((1 - distill.compressionRatio) * 100);
    checks.push({
      name: "distill",
      status: "pass",
      details: `Compressed ${distill.originalCount} → ${distill.distilledCount} messages (${savings}% reduction, ~${distill.estimatedTokens} tokens)`,
      latencyMs: Date.now() - distillStart,
    });
    return { messages: distill.messages, checks };
  }

  return { messages, checks };
}

// ── Code quality pipeline ────────────────────────────────────────────────────

/**
 * Full quality pipeline for AI-generated code.
 *
 * Order matters:
 *   1. scan/secrets   (fast, <10ms — catch before any processing)
 *   2. validate/imports (registry check — catch hallucinated packages)
 *   3. scan/vulnerabilities (OSV check on valid packages)
 *   4. verify         (full firewall — final gate)
 */
export async function runCodePipeline(
  client: AgentoolboxClient,
  code: string,
  language: Language
): Promise<PipelineResult> {
  const checks: CheckResult[] = [];
  let totalCreditsUsed = 0;

  // ── Step 1: Secret scanner ────────────────────────────────────────────────
  const secretsStart = Date.now();
  const secretsRaw = await client.scanSecrets({ code });
  const secrets = secretsRaw as unknown as {
    safe: boolean;
    totalFindings: number;
    critical: number;
    high: number;
    findings: Array<{ type: string; line: number; severity: string; suggestion: string }>;
  };
  totalCreditsUsed += 1;

  checks.push({
    name: "scan/secrets",
    status: secrets.safe ? "pass" : secrets.critical > 0 ? "block" : "flag",
    details: secrets.safe
      ? "No hardcoded credentials detected"
      : `${secrets.totalFindings} finding(s): ${secrets.findings.map(f => `${f.type} on line ${f.line}`).join(", ")}`,
    latencyMs: Date.now() - secretsStart,
  });

  if (!secrets.safe && secrets.critical > 0) {
    return { passed: false, blockedAt: "scan/secrets", checks, totalCreditsUsed };
  }

  // ── Step 2: Import validator ──────────────────────────────────────────────
  const importStart = Date.now();
  const imports = await client.validateImports({ language, code });
  totalCreditsUsed += 1;

  checks.push({
    name: "validate/imports",
    status: imports.hallucinated.length === 0 ? "pass" : "block",
    details: imports.hallucinated.length === 0
      ? `All ${imports.valid.length} import(s) verified on ${imports.valid[0]?.registry ?? "registry"}`
      : `Hallucinated: ${imports.hallucinated.map(p => p.name).join(", ")} (rate: ${(imports.hallucinationRate * 100).toFixed(0)}%)`,
    latencyMs: Date.now() - importStart,
  });

  if (imports.hallucinated.length > 0) {
    return { passed: false, blockedAt: "validate/imports", checks, totalCreditsUsed };
  }

  // ── Step 3: Vulnerability scanner ────────────────────────────────────────
  const validPackages = imports.valid.map(p => p.name);
  if (validPackages.length > 0) {
    const vulnStart = Date.now();
    const vulnsRaw = await client.scanVulnerabilities({ packages: validPackages, language });
    const vulns = vulnsRaw as unknown as {
      safe: boolean;
      vulnerablePackages: number;
      findings: Array<{ package: string; vulnerabilities: Array<{ id: string; summary: string; severity: string }> }>;
    };
    totalCreditsUsed += 2;

    checks.push({
      name: "scan/vulnerabilities",
      status: vulns.safe ? "pass" : "flag",
      details: vulns.safe
        ? `No known CVEs in ${validPackages.length} package(s)`
        : `${vulns.vulnerablePackages} vulnerable: ${vulns.findings.map(f => `${f.package} (${f.vulnerabilities[0]?.id})`).join(", ")}`,
      latencyMs: Date.now() - vulnStart,
    });
  }

  // ── Step 4: Full hallucination firewall ───────────────────────────────────
  const firewallStart = Date.now();
  const firewall = await client.verify({ outputType: "code", language, llmResponse: code });
  totalCreditsUsed += 2;

  checks.push({
    name: "verify",
    status: firewall.verdict === "PASS" ? "pass" : firewall.verdict === "FLAG" ? "flag" : "block",
    details: firewall.verdict === "PASS"
      ? `PASS (score: ${firewall.overallScore.toFixed(2)}) · certificate: ${firewall.certificate.slice(0, 20)}...`
      : `${firewall.verdict}: ${firewall.claims.map(c => c.checkType).join(", ")}`,
    latencyMs: Date.now() - firewallStart,
  });

  const passed = firewall.verdict !== "BLOCK";
  return {
    passed,
    blockedAt: passed ? undefined : "verify",
    checks,
    totalCreditsUsed,
  };
}
