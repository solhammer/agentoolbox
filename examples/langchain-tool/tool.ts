/**
 * Agent Toolbox — LangChain pre-action gate tools
 *
 * Drop these three tools into any LangChain agent to add a deterministic
 * firewall before shell execution, outbound HTTP, and SQL queries.
 *
 * Each tool calls the Agent Toolbox REST API, returns the structured verdict,
 * and throws an error on BLOCK so the agent cannot proceed with the action.
 *
 * Dependencies: @langchain/core, zod (both are standard LangChain deps).
 * No other packages required — uses Node.js built-in fetch (Node >= 18).
 *
 * Usage:
 *   import { scanCommandTool, scanUrlTool, scanSqlTool } from "./tool.js";
 *   const agent = createToolCallingAgent({ tools: [scanCommandTool, scanUrlTool, scanSqlTool, ...yourOtherTools] });
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.ATB_API_URL ?? "https://api.agent-toolbox.ai";

function authHeaders(): Record<string, string> {
  const token = process.env.ATB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

interface AtbResponse {
  verdict: "PASS" | "FLAG" | "BLOCK" | string;
  reason?: string;
  message?: string;
  certificate?: { sha256?: string };
}

async function callAtb(
  endpoint: string,
  body: Record<string, unknown>
): Promise<AtbResponse> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`Agent Toolbox API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<AtbResponse>;
}

/**
 * Format a verdict result as a string for the agent's observation.
 * Throws on BLOCK so the agent cannot continue with the blocked action.
 */
function handleVerdict(result: AtbResponse, label: string): string {
  const verdict = (result.verdict ?? "").toUpperCase();
  const reason = result.reason ?? result.message ?? "(no reason provided)";
  const cert = result.certificate?.sha256 ?? "";

  if (verdict === "BLOCK") {
    throw new Error(
      `[agentoolbox] BLOCK — ${label} rejected.\nReason: ${reason}` +
        (cert ? `\nCert: ${cert}` : "")
    );
  }

  const certNote = cert ? ` | cert: ${cert}` : "";
  if (verdict === "FLAG") {
    return `VERDICT: FLAG — ${label} flagged (you may proceed, but note the risk).\nReason: ${reason}${certNote}`;
  }

  return `VERDICT: PASS — ${label} cleared.${certNote}`;
}

// ---------------------------------------------------------------------------
// scanCommand — gate shell commands before execution
// ---------------------------------------------------------------------------

/**
 * Call this tool BEFORE running any shell command.
 * Returns PASS/FLAG on safe commands; throws on BLOCK.
 *
 * Motivation: a Claude Code agent made a $1,446 unauthorized sweep by running
 * unreviewed shell commands. This tool adds a deterministic gate before exec.
 */
export const scanCommandTool = new DynamicStructuredTool({
  name: "scan_command",
  description:
    "Check a shell command against Agent Toolbox before executing it. " +
    "MUST be called before any shell exec, subprocess, or terminal command. " +
    "Returns PASS, FLAG (allowed with warning), or throws on BLOCK.",
  schema: z.object({
    command: z
      .string()
      .describe("The exact shell command string you are about to execute."),
  }),
  func: async ({ command }) => {
    const result = await callAtb("/v1/scan/command", { command });
    return handleVerdict(result, `command "${command}"`);
  },
});

// ---------------------------------------------------------------------------
// scanUrl — gate outbound URLs before fetch/request
// ---------------------------------------------------------------------------

/**
 * Call this tool BEFORE fetching any external URL.
 * Detects SSRF targets (169.254.169.254, private IP ranges, etc.).
 *
 * Motivation: SSRF to 169.254.169.254 (cloud metadata endpoint) is one of
 * the most common agent exploit vectors.
 */
export const scanUrlTool = new DynamicStructuredTool({
  name: "scan_url",
  description:
    "Check an outbound URL against Agent Toolbox before fetching it. " +
    "MUST be called before any HTTP request to an external URL. " +
    "Detects SSRF, private IP ranges, and known malicious domains. " +
    "Returns PASS, FLAG (allowed with warning), or throws on BLOCK.",
  schema: z.object({
    url: z
      .string()
      .url()
      .describe("The exact URL you are about to fetch or redirect to."),
  }),
  func: async ({ url }) => {
    const result = await callAtb("/v1/scan/url", { url });
    return handleVerdict(result, `URL "${url}"`);
  },
});

// ---------------------------------------------------------------------------
// scanSql — gate SQL queries before execution
// ---------------------------------------------------------------------------

/**
 * Call this tool BEFORE executing any SQL query.
 * Detects injection patterns, destructive statements, and policy violations.
 */
export const scanSqlTool = new DynamicStructuredTool({
  name: "scan_sql",
  description:
    "Check a SQL query against Agent Toolbox before executing it. " +
    "MUST be called before any database query execution. " +
    "Detects SQL injection patterns and destructive statements (DROP, TRUNCATE, etc.). " +
    "Returns PASS, FLAG (allowed with warning), or throws on BLOCK.",
  schema: z.object({
    query: z
      .string()
      .describe("The exact SQL query string you are about to execute."),
    dialect: z
      .enum(["postgres", "mysql", "sqlite", "mssql", "generic"])
      .optional()
      .describe("SQL dialect, if known."),
  }),
  func: async ({ query, dialect }) => {
    const body: Record<string, unknown> = { query };
    if (dialect) body.dialect = dialect;
    const result = await callAtb("/v1/scan/sql", body);
    return handleVerdict(result, `SQL query`);
  },
});
