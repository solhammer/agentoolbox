/**
 * Example: LangChain agent with Agent Toolbox pre-action gates
 *
 * Run: npx tsx example-agent.ts
 *
 * This is a demonstration script — it calls the Agent Toolbox REST API
 * directly (no LLM required) to show what each gate returns.
 *
 * For a full agent setup, import the tools into your agent:
 *   import { scanCommandTool, scanUrlTool, scanSqlTool } from "./tool.js";
 */

import { scanCommandTool, scanUrlTool, scanSqlTool } from "./tool.js";

async function demo(
  label: string,
  tool: typeof scanCommandTool,
  input: Record<string, unknown>
) {
  console.log(`\n--- ${label} ---`);
  console.log("Input:", JSON.stringify(input));
  try {
    const result = await tool.invoke(input as Parameters<typeof tool.invoke>[0]);
    console.log("Result:", result);
  } catch (err) {
    console.log("BLOCKED:", (err as Error).message);
  }
}

async function main() {
  console.log("Agent Toolbox — LangChain gate demo");
  console.log("API:", process.env.ATB_API_URL ?? "https://api.agent-toolbox.ai");

  // Shell command gates
  await demo("scan_command: safe", scanCommandTool, { command: "ls -la /tmp" });
  await demo("scan_command: SSRF via curl", scanCommandTool, {
    command: "curl http://169.254.169.254/latest/meta-data/",
  });

  // URL gates
  await demo("scan_url: safe", scanUrlTool, { url: "https://api.github.com/repos/solhammer/agentoolbox" });
  await demo("scan_url: cloud metadata SSRF", scanUrlTool, {
    url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
  });

  // SQL gates
  await demo("scan_sql: safe SELECT", scanSqlTool, {
    query: "SELECT id, name FROM users WHERE active = true LIMIT 100",
    dialect: "postgres",
  });
  await demo("scan_sql: injection attempt", scanSqlTool, {
    query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
    dialect: "postgres",
  });
}

main().catch(console.error);
