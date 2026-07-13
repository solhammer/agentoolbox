#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateImports } from "@agentoolbox/validator";
import { runFirewall } from "@agentoolbox/firewall";

const server = new Server(
  { name: "agent-toolbox", version: "0.1.0", description: "AI agent quality tools from agent-toolbox.ai" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "validate_imports",
      description:
        "Validates all imports/packages in AI-generated code against live registries (PyPI, npm, crates.io, Go). Returns lists of valid, hallucinated, and unknown packages. Use this before executing any AI-generated code to catch hallucinated package names ('slopsquatting').",
      inputSchema: {
        type: "object",
        properties: {
          language: {
            type: "string",
            enum: ["python", "javascript", "typescript", "rust", "go"],
            description: "The programming language of the code snippet.",
          },
          code: {
            type: "string",
            description: "The AI-generated code to validate.",
          },
          timeoutMs: {
            type: "number",
            description: "Registry request timeout in ms (default: 5000).",
          },
        },
        required: ["language", "code"],
      },
    },
    {
      name: "verify_output",
      description:
        "Runs the hallucination firewall on an LLM output. Checks for hallucinated packages (code), invalid URLs, malformed citations (DOI/arXiv), and numeric contradictions. Returns PASS, FLAG, or BLOCK verdict with a tamper-evident certificate. Use this before accepting any LLM response in a critical pipeline.",
      inputSchema: {
        type: "object",
        properties: {
          outputType: {
            type: "string",
            enum: ["code", "natural_language", "agent_action", "factual_claim"],
            description: "The type of LLM output being verified.",
          },
          llmResponse: {
            type: "string",
            description: "The LLM output to verify.",
          },
          language: {
            type: "string",
            enum: ["python", "javascript", "typescript", "rust", "go"],
            description: "Required when outputType is 'code'.",
          },
          enforcementMode: {
            type: "string",
            enum: ["block", "flag", "audit"],
            description:
              "'block' returns BLOCK verdict on failures (default). 'flag' downgrades BLOCK to FLAG. 'audit' logs only.",
          },
          timeoutMs: {
            type: "number",
            description: "Per-check timeout in ms (default: 5000).",
          },
        },
        required: ["outputType", "llmResponse"],
      },
    },
    {
      name: "distill_context",
      description:
        "Compresses a conversation context to fit within a target token budget. Use this when your context window is getting large to reduce token costs while preserving the most important content. Keeps system prompts, deduplicates consecutive identical messages, and retains the most recent messages first.",
      inputSchema: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            description: "The conversation messages to distill.",
            items: {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["system", "user", "assistant", "tool"],
                },
                content: { type: "string" },
              },
              required: ["role", "content"],
            },
          },
          targetTokens: {
            type: "number",
            description: "Desired output token budget (default: 4000).",
          },
          preserveSystemPrompt: {
            type: "boolean",
            description: "Always keep the system prompt (default: true).",
          },
        },
        required: ["messages"],
      },
    },
  ],
}));

// ── Tool call handler ─────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "validate_imports": {
        const { language, code, timeoutMs } = args as {
          language: "python" | "javascript" | "typescript" | "rust" | "go";
          code: string;
          timeoutMs?: number;
        };
        const result = await validateImports({
          language,
          code,
          ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "verify_output": {
        const { outputType, llmResponse, language, enforcementMode, timeoutMs } =
          args as {
            outputType: "code" | "natural_language" | "agent_action" | "factual_claim";
            llmResponse: string;
            language?: "python" | "javascript" | "typescript" | "rust" | "go";
            enforcementMode?: "block" | "flag" | "audit";
            timeoutMs?: number;
          };
        const result = await runFirewall({
          outputType,
          llmResponse,
          ...(language !== undefined ? { language } : {}),
          ...(enforcementMode !== undefined ? { enforcementMode } : {}),
          ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: result.verdict === "BLOCK",
        };
      }

      case "distill_context": {
        const { messages, targetTokens = 4000, preserveSystemPrompt = true } =
          args as {
            messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
            targetTokens?: number;
            preserveSystemPrompt?: boolean;
          };

        const CHARS_PER_TOKEN = 4;
        const charBudget = targetTokens * CHARS_PER_TOKEN;

        const system = preserveSystemPrompt
          ? messages.find((m) => m.role === "system")
          : undefined;
        const nonSystem = messages.filter((m) => m.role !== "system");
        const deduplicated = nonSystem.filter(
          (m, i) => i === 0 || m.content !== nonSystem[i - 1]!.content
        );

        let used = system ? system.content.length : 0;
        const kept: typeof messages = [];

        for (let i = deduplicated.length - 1; i >= 0; i--) {
          const msg = deduplicated[i]!;
          if (used + msg.content.length <= charBudget) {
            kept.unshift(msg);
            used += msg.content.length;
          } else {
            const remaining = charBudget - used;
            if (remaining > 100) {
              kept.unshift({
                ...msg,
                content: `[...truncated] ${msg.content.slice(-remaining)}`,
              });
            }
            break;
          }
        }

        const result = system ? [system, ...kept] : kept;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  messages: result,
                  originalCount: messages.length,
                  distilledCount: result.length,
                  estimatedTokens: Math.ceil(used / CHARS_PER_TOKEN),
                  compressionRatio:
                    Math.round((result.length / messages.length) * 100) / 100,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Tool error: ${message}` }],
      isError: true,
    };
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("agent-toolbox.ai MCP server running on stdio");
