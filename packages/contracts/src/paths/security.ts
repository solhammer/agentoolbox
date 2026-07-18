import { z } from "../openapi.js";
import {
  VerdictSchema,
  SeveritySchema,
  SeverityCountsSchema,
  LatencyMsSchema,
  CertificateSchema,
  registerTool,
} from "../shared.js";

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/scan/secrets
// ═══════════════════════════════════════════════════════════════════════════

export const ScanSecretsRequest = z.object({
  code: z.string().min(1).max(200_000),
  filename: z.string().optional(),
});

export const SecretFindingSchema = z.object({
  type: z.string(),
  match: z.string(),
  line: z.number().int(),
  severity: z.enum(["critical", "high", "medium"]),
  suggestion: z.string(),
});

export const ScanSecretsResponse = z.object({
  findings: z.array(SecretFindingSchema),
  totalFindings: z.number().int(),
  critical: z.number().int(),
  high: z.number().int(),
  safe: z.boolean(),
  filename: z.string().optional(),
});

registerTool({
  path: "/v1/scan/secrets",
  operationId: "scanSecrets",
  summary: "Scan source code for hardcoded secrets and credentials.",
  tags: ["security"],
  credits: 1,
  request: ScanSecretsRequest,
  response: ScanSecretsResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/scan/injection
// ═══════════════════════════════════════════════════════════════════════════

export const ScanInjectionRequest = z.object({
  input: z.string().min(1).max(50_000),
  context: z.string().optional(),
});

export const ScanInjectionResponse = z.object({
  risk: z.enum(["safe", "suspicious", "injection"]),
  score: z.number(),
  patterns: z.array(z.string()),
  advice: z.string(),
  context: z.string().optional(),
});

registerTool({
  path: "/v1/scan/injection",
  operationId: "scanInjection",
  summary: "Detect prompt injection attacks in user-supplied input.",
  tags: ["security"],
  credits: 1,
  request: ScanInjectionRequest,
  response: ScanInjectionResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/tokens/count
// ═══════════════════════════════════════════════════════════════════════════

export const CountTokensRequest = z
  .object({
    text: z.string().max(500_000).optional(),
    messages: z
      .array(z.object({ role: z.string(), content: z.string() }))
      .optional(),
    model: z
      .enum(["gpt-4", "gpt-3.5", "claude", "gemini", "generic"])
      .optional()
      .default("generic"),
  })
  .refine((d) => d.text || d.messages, {
    message: "Provide either text or messages",
  });

/** Single-string token count (returned when `text` is provided). */
export const TokenCountSchema = z.object({
  tokens: z.number().int(),
  characters: z.number().int(),
  words: z.number().int(),
  estimatedCostUsd: z.object({
    input: z.number(),
    output1k: z.number(),
  }),
  model: z.enum(["gpt-4", "gpt-3.5", "claude", "gemini", "generic"]),
});

/** Chat-message token count (returned when `messages` is provided). */
export const MessageTokenCountSchema = z.object({
  total: z.number().int(),
  perMessage: z.array(
    z.object({ role: z.string(), tokens: z.number().int() })
  ),
  estimatedCostUsd: z.object({
    input: z.number(),
    output1k: z.number(),
  }),
  model: z.enum(["gpt-4", "gpt-3.5", "claude", "gemini", "generic"]),
  contextWindowRemaining: z.number().int(),
});

export const CountTokensResponse = z.union([
  TokenCountSchema,
  MessageTokenCountSchema,
]);

registerTool({
  path: "/v1/tokens/count",
  operationId: "countTokens",
  summary:
    "Count approximate tokens for a string or chat message list before sending to an LLM.",
  tags: ["security"],
  credits: 1,
  request: CountTokensRequest,
  response: CountTokensResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/scan/vulnerabilities
// ═══════════════════════════════════════════════════════════════════════════

export const ScanVulnerabilitiesRequest = z.object({
  packages: z.array(z.string()).min(1).max(50),
  language: z.enum(["python", "javascript", "typescript", "rust", "go"]),
  timeoutMs: z.number().optional(),
});

export const VulnFindingSchema = z.object({
  package: z.string(),
  vulnerabilities: z.array(
    z.object({
      id: z.string(),
      summary: z.string(),
      severity: z.string(),
      aliases: z.array(z.string()),
    })
  ),
});

export const ScanVulnerabilitiesResponse = z.object({
  findings: z.array(VulnFindingSchema),
  totalPackages: z.number().int(),
  vulnerablePackages: z.number().int(),
  safe: z.boolean(),
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/scan/vulnerabilities",
  operationId: "scanVulnerabilities",
  summary: "Scan a list of package names for known vulnerabilities via OSV.",
  tags: ["security"],
  credits: 2,
  request: ScanVulnerabilitiesRequest,
  response: ScanVulnerabilitiesResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/scan/pii
// ═══════════════════════════════════════════════════════════════════════════

export const ScanPiiRequest = z.object({
  text: z.string().min(1).max(200_000),
  filename: z.string().optional(),
  policy: z
    .object({
      mode: z.enum(["block", "flag", "audit"]).optional(),
      blockSeverityAtOrAbove: z
        .enum(["low", "medium", "high", "critical"])
        .optional(),
      allowTypes: z.array(z.string()).optional(),
      jurisdictions: z.array(z.string()).optional(),
      redact: z.boolean().optional(),
    })
    .optional(),
});

export const PiiEntitySchema = z.object({
  type: z.string(),
  category: z.enum(["PII", "PHI", "PCI"]),
  severity: SeveritySchema,
  match: z.string(),
  start: z.number().int(),
  end: z.number().int(),
  line: z.number().int(),
  validated: z.boolean(),
  confidence: z.number(),
  jurisdiction: z.string().optional(),
});

export const ScanPiiResponse = z.object({
  verdict: VerdictSchema,
  safe: z.boolean(),
  score: z.number(),
  categories: z.array(z.enum(["PII", "PHI", "PCI"])),
  totalFindings: z.number().int(),
  counts: z.record(
    z.enum(["low", "medium", "high", "critical"]),
    z.number().int()
  ),
  entities: z.array(PiiEntitySchema),
  redactedText: z.string().optional(),
  certificate: CertificateSchema,
  enforcementMode: z.enum(["block", "flag", "audit"]),
  filename: z.string().optional(),
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/scan/pii",
  operationId: "scanPii",
  summary:
    "Scan text for personally identifiable information (PII/PHI/PCI) before passing it to an LLM or storing it.",
  tags: ["security"],
  credits: 1,
  request: ScanPiiRequest,
  response: ScanPiiResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/scan/command
// ═══════════════════════════════════════════════════════════════════════════

export const ScanCommandRequest = z.object({
  command: z.string().min(1).max(200_000),
  shell: z.enum(["bash", "sh", "zsh", "powershell", "generic"]).optional(),
  policy: z
    .object({
      blockSeverityAtOrAbove: z
        .enum(["low", "medium", "high", "critical"])
        .optional(),
      allow: z.array(z.string()).max(100).optional(),
      protectedRefs: z.array(z.string()).max(100).optional(),
      maxSegments: z.number().int().min(1).max(1000).optional(),
    })
    .optional(),
});

export const CommandFindingSchema = z.object({
  ruleId: z.string(),
  severity: SeveritySchema,
  segmentIndex: z.number().int(),
  message: z.string(),
  snippet: z.string(),
});

export const ScanCommandResponse = z.object({
  verdict: VerdictSchema,
  segments: z.number().int(),
  findings: z.array(CommandFindingSchema),
  counts: SeverityCountsSchema,
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/scan/command",
  operationId: "scanCommand",
  summary: "Scan a shell command for dangerous operations before execution.",
  tags: ["security"],
  credits: 1,
  request: ScanCommandRequest,
  response: ScanCommandResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/scan/url
// ═══════════════════════════════════════════════════════════════════════════

export const ScanUrlRequest = z.object({
  url: z.string().min(1).max(8_192),
  policy: z
    .object({
      allowSchemes: z.array(z.string()).max(20).optional(),
      allowHosts: z.array(z.string()).max(200).optional(),
      denyHosts: z.array(z.string()).max(200).optional(),
      denyPrivate: z.boolean().optional(),
      allowedPorts: z
        .array(z.number().int().min(0).max(65535))
        .max(50)
        .optional(),
      resolve: z.boolean().optional(),
      blockSeverityAtOrAbove: z
        .enum(["low", "medium", "high", "critical"])
        .optional(),
    })
    .optional(),
});

export const UrlTargetSchema = z.object({
  scheme: z.string(),
  host: z.string(),
  hostType: z.enum(["ipv4", "ipv6", "hostname"]),
  ipClass: z.enum([
    "public",
    "loopback",
    "private",
    "link-local",
    "reserved",
    "unknown",
  ]),
  port: z.number().int().nullable(),
  normalizedUrl: z.string(),
});

export const UrlFindingSchema = z.object({
  ruleId: z.string(),
  severity: SeveritySchema,
  message: z.string(),
});

export const ScanUrlResponse = z.object({
  verdict: VerdictSchema,
  target: UrlTargetSchema,
  findings: z.array(UrlFindingSchema),
  counts: SeverityCountsSchema,
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/scan/url",
  operationId: "scanUrl",
  summary:
    "Scan a URL for SSRF risks, private-network access, and policy violations before fetching.",
  tags: ["security"],
  credits: 1,
  request: ScanUrlRequest,
  response: ScanUrlResponse,
});
