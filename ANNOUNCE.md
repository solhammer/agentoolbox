# agent-toolbox.ai — Launch Announcement Copy

Use these for posting across channels. Adjust tone per platform.

---

## Twitter / X Thread

**Tweet 1 (hook):**
19.7% of AI-generated packages don't exist.

We built a firewall for that.

agent-toolbox.ai — the quality layer for AI agents. Three APIs. No subscription. Pay per call in SOL. 🧵

**Tweet 2 (what it is):**
Three services:

🛡️ POST /v1/validate/imports — checks every import against PyPI/npm/crates.io/Go live. Catch hallucinated packages before they execute.

🔥 POST /v1/verify — PASS/FLAG/BLOCK with SHA-256 cert. URLs, citations, numeric contradictions.

✂️ POST /v1/distill — compress bloated agent contexts to a token budget.

**Tweet 3 (how agents pay):**
Agents pay autonomously in SOL. No signup. No invoice.

1. Send SOL to the service wallet
2. Use the tx signature as your Bearer token
3. GET /v1/pricing to self-discover rates

1 SOL = 10,000 calls. 0.0001 SOL each.

**Tweet 4 (MCP):**
Works as an MCP server for Claude Desktop, Warp, and Cursor.

Add it to your config. Your agent gets validate_imports, verify_output, distill_context — instantly.

**Tweet 5 (CTA):**
Try free (10 calls, no auth):

curl -X POST https://api.agent-toolbox.ai/v1/validate/imports \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"import numpy\nfrom ghostpkg import magic"}'

GitHub: github.com/solhammer/agentoolbox
Open source. Self-hostable.

---

## Hacker News — Show HN

**Title:** Show HN: agent-toolbox.ai – Hallucination firewall + package validator for AI agents, paid in SOL

**Text:**
I built a set of API services that AI agents can call to verify and improve their LLM outputs before they cause damage.

Three endpoints:
- POST /v1/validate/imports — checks every package import in AI-generated code against live registries (PyPI, npm, crates.io, Go). 19.7% of AI-generated packages don't exist (USENIX 2025).
- POST /v1/verify — hallucination firewall. Returns PASS/FLAG/BLOCK with a SHA-256 certificate. Checks packages, URLs, DOI/arXiv citations, and numeric contradictions.
- POST /v1/distill — compresses bloated agent context windows using TF-IDF importance scoring.

The interesting part: agents pay autonomously in SOL (Solana). They call GET /v1/pricing, send SOL to the service wallet, and use the transaction signature as a Bearer token. No signup, no invoices, no humans in the loop.

Works as an MCP server for Claude Desktop, Warp, and Cursor. Free tier: 10 calls/IP.

Live: https://api.agent-toolbox.ai  
Website: https://agent-toolbox.ai  
GitHub (open source): https://github.com/solhammer/agentoolbox

---

## Reddit — r/MachineLearning, r/LocalLLaMA, r/AIAgents

**Title:** I built a hallucination firewall for AI agents that accepts SOL micropayments

**Body:**
Been building AI agents and kept running into the same problems: hallucinated package names crashing code, bad URLs in citations, bloated contexts eating tokens.

Built agent-toolbox.ai — three API services specifically for agents:

**Package Validator** (`POST /v1/validate/imports`)
Checks every import against live registries before you run AI-generated code. 19.7% of AI packages are hallucinated according to USENIX 2025 research. Takes ~200ms.

**Hallucination Firewall** (`POST /v1/verify`)
Returns PASS/FLAG/BLOCK with a tamper-evident SHA-256 certificate. Detects hallucinated packages, dead URLs, malformed DOI/arXiv citations, and numeric contradictions.

**Context Distiller** (`POST /v1/distill`)
Compresses conversation history to a token budget using TF-IDF importance scoring. Keeps the system prompt and the most relevant content.

**The SOL payment model**
This is the part I found most interesting to build: agents discover pricing at `GET /v1/pricing`, send SOL to the service wallet, and use the transaction signature as a Bearer token. No human approval needed — fully autonomous.

Free tier: 10 calls/IP. Paid: 0.0001 SOL/call (about $0.015 at current prices).

Also works as an MCP server for Claude Desktop, Warp, and Cursor.

GitHub: https://github.com/solhammer/agentoolbox (MIT, self-hostable)
API: https://api.agent-toolbox.ai
Try it free: `curl -X POST https://api.agent-toolbox.ai/v1/validate/imports -H "Content-Type: application/json" -d '{"language":"python","code":"import numpy\nfrom ghostpkg import magic"}'`

---

## LinkedIn

Built and launched agent-toolbox.ai this week — an API utility designed specifically for AI agents to verify their own outputs before causing damage in production.

The problem: "vibe-coding" with AI generates hallucinated package names (19.7% of AI imports don't exist per USENIX 2025), dead URLs in citations, and bloated context windows. None of the existing tools are callable by agents themselves in a lightweight, per-call model.

Our solution: three REST endpoints + MCP server. Agents call them inline in their pipeline:
• Package validator — live registry checks against PyPI, npm, crates.io, Go
• Hallucination firewall — PASS/FLAG/BLOCK verdict with SHA-256 certificate  
• Context distiller — TF-IDF-based compression to a token budget

The payment model is the most novel part: agents pay autonomously in SOL (Solana). They query pricing, send a micropayment, and use the transaction signature as their API key. No subscription, no invoices.

Live now: agent-toolbox.ai | Free tier: 10 calls/IP

---

## Product Hunt — Launch Description

**Tagline:** The quality layer every AI agent needs

**Description:**
AI agents that write code, generate content, and make decisions need a quality check before their outputs reach production. agent-toolbox.ai is a set of API services built specifically for agents to call inline in their pipelines.

**Three services:**
- **Package Validator** — checks every import in AI-generated code against live registries (PyPI, npm, crates.io, Go) to catch hallucinated package names. Addresses the USENIX 2025 finding that 19.7% of AI-generated packages don't exist.
- **Hallucination Firewall** — returns PASS, FLAG, or BLOCK for any LLM output. Checks packages, URLs, DOI/arXiv citations, and numeric contradictions. Every verdict is SHA-256 signed.
- **Context Distiller** — compresses bloated agent context windows to a token budget using TF-IDF importance scoring.

**How it works:**
Agents call `GET /v1/pricing` to discover the service wallet and rates, send SOL to buy credits, and use the transaction signature as a Bearer token. Fully autonomous — no human approval needed.

Works as an MCP server for Claude Desktop, Warp, and Cursor. Open source on GitHub (MIT). Self-hostable.

**First 10 calls free, no signup.**

---

## Directories to submit to

- https://theresanaiforthat.com/submit
- https://aitoolsdirectory.com/submit
- https://futuretools.io/submit-a-tool
- https://toolify.ai/submit
- https://alternativeto.net/software/add/
- https://github.com/topics/ai-agents (auto-indexed via repo topics ✅)
- https://mcp.so (for MCP server listing)
- Solana ecosystem directories (solana.com/ecosystem)
