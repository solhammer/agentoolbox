# Changelog

All notable changes to `agent-toolbox-sdk` are documented here.

---

## [1.0.0] — 2026-07-14

Initial release.

### Added

**Core quality services**
- `client.validateImports()` — Check AI-generated code imports against live registries (PyPI, npm, crates.io, Go). Returns hallucinated, valid, and unknown packages.
- `client.verify()` — Full hallucination firewall. Returns PASS/FLAG/BLOCK verdict with SHA-256 certificate. Checks packages, URLs, DOI/arXiv citations, numeric contradictions, and NLI consistency.
- `client.distill()` — Compress conversation context to a token budget using TF-IDF importance scoring.

**Security services**
- `client.scanSecrets()` — Detect hardcoded credentials in AI-generated code (10 detectors, redacted output).
- `client.scanInjection()` — Detect prompt injection attacks in user input before passing to an LLM.
- `client.scanVulnerabilities()` — Check packages against the OSV (Open Source Vulnerabilities) database.
- `client.countTokens()` — BPE-approximate token counting for GPT-4, Claude, and Gemini with cost estimation.

**Client**
- `AgentoolboxClient` class with configurable `baseUrl`, `apiKey`, and `timeoutMs`
- `AgentoolboxError` typed error class with `statusCode`
- Full TypeScript types for all request/response shapes

### Notes
- Free tier: 10 calls/IP, no auth required
- Paid tier: pass a Solana transaction signature as `apiKey` — credits verified on-chain
- `GET /v1/pricing` for autonomous service discovery (wallet + rates)
