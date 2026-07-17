#!/usr/bin/env node
/**
 * Agent Toolbox — Claude Code PreToolUse gate for Bash
 *
 * Reads the tool-use JSON payload from stdin (provided by Claude Code),
 * extracts the shell command, and POSTs it to /v1/scan/command.
 *
 * Exit codes:
 *   0  → PASS or FLAG  (Claude Code continues)
 *   1  → BLOCK or error (Claude Code stops the action)
 *
 * Configuration via environment variables:
 *   ATB_API_URL  — override base URL (default: https://api.agent-toolbox.ai)
 *   ATB_TOKEN    — Solana tx signature Bearer token (optional; free tier = 10 calls/IP)
 *
 * Requires Node.js >= 18 (built-in fetch). No npm install needed.
 */

const API_BASE = process.env.ATB_API_URL ?? "https://api.agent-toolbox.ai";
const TOKEN = process.env.ATB_TOKEN ?? "";

async function main() {
  // Claude Code passes the tool input as JSON on stdin.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    // Nothing on stdin — let the action proceed.
    process.exit(0);
  }

  let toolUse;
  try {
    toolUse = JSON.parse(raw);
  } catch {
    // Can't parse — fail open (don't block legitimate use).
    process.exit(0);
  }

  // Claude Code passes the Bash tool input as { command, description?, timeout? }
  // The hook payload wraps this: { tool_name, tool_input, ... }
  const command =
    toolUse?.tool_input?.command ??
    toolUse?.input?.command ??
    toolUse?.command;

  if (!command || typeof command !== "string") {
    // No command to scan — let through.
    process.exit(0);
  }

  let result;
  try {
    const headers = { "Content-Type": "application/json" };
    if (TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;

    const res = await fetch(`${API_BASE}/v1/scan/command`, {
      method: "POST",
      headers,
      body: JSON.stringify({ command }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // API error — fail open.
      console.error(`[agentoolbox] API error ${res.status}: ${await res.text()}`);
      process.exit(0);
    }

    result = await res.json();
  } catch (err) {
    // Network error — fail open so offline dev isn't blocked.
    console.error(`[agentoolbox] scan/command unreachable: ${err.message}`);
    process.exit(0);
  }

  const verdict = (result?.verdict ?? "").toUpperCase();
  const reason = result?.reason ?? result?.message ?? "(no reason returned)";
  const cert = result?.certificate?.sha256 ?? "";

  if (verdict === "BLOCK") {
    // Output to stderr — Claude Code surfaces this to the user.
    console.error(
      `[agentoolbox] BLOCK — command rejected by /v1/scan/command\n` +
        `Reason : ${reason}\n` +
        `Command: ${command}\n` +
        (cert ? `Cert   : ${cert}\n` : "")
    );
    process.exit(1); // Non-zero exit blocks the tool call.
  }

  if (verdict === "FLAG") {
    // Warn but allow.
    console.error(
      `[agentoolbox] FLAG — command flagged (proceeding)\n` +
        `Reason : ${reason}\n` +
        `Command: ${command}`
    );
  }

  // PASS (or FLAG) — exit 0 to let Claude Code continue.
  process.exit(0);
}

main().catch((err) => {
  console.error(`[agentoolbox] Unexpected error: ${err.message}`);
  process.exit(0); // Fail open.
});
