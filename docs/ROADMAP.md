# Agentoolbox Roadmap

The quality layer for AI agents: deterministic, offline, pre-action gates that any
agent can call before an irreversible step. This document is the single narrative
source of truth for what is shipped and what is planned. It complements the machine
source of truth (`openapi.json`) and the tool catalog (`packages/web/src/data/tools.ts`).

## Design contract (the invariant)

Every tool — shipped or proposed — must satisfy the same contract. Proposals that
cannot meet it do not belong on this roadmap.

- **Deterministic.** Same input → same verdict. No probabilistic "is this good?" judgments.
- **Offline by default.** No network calls on the hot path; data sets ship with the tool.
  A tool may offer an explicit opt-in networked mode (e.g. URL DNS-rebinding resolution).
- **Fast.** Sub-500ms; most gates are single-digit milliseconds.
- **Assertive of checkable facts only.** Every verdict is backed by a checksum, a
  bundled authoritative table, a grammar, or arithmetic.
- **PASS / FLAG / BLOCK** plus a SHA-256 certificate suitable for an audit trail.
- **Agent-callable** in the `propose → validate → execute` seam.
- **Priced per call in SOL** (free tier: 10 calls/IP, no auth).

## Current state

26 tools across 6 suites, delivered through Wave 4. All are exposed over REST, the
MCP server, the TypeScript SDK, and the Python SDK, with `openapi.json` as the
machine-readable contract (served at `GET /openapi.json`).

| Suite | Count | Tools |
|---|---|---|
| Core | 3 | Package Validator, Hallucination Firewall, Context Distiller |
| Security | 7 | Secret Scanner, Injection Detector, Token Counter, Vulnerability Scanner, PII/PHI/PCI Firewall, Command Safety Gate, URL/SSRF Gate |
| Finance | 7 | Units Sanity Check, Cross-Source Price Validator, Symbol/Token Resolver, Rug Pull Scanner, Slippage/Liquidity Guard, Full Order Risk Scorer, Position Guardian |
| Compliance & Health | 2 | Sanctions Screening, Medication Safety Gate |
| Agent · Infra · Legal | 4 | Tool-Argument Firewall, IaC Risk Gate, Citation Validator, Deadline Calculator |
| Data & Validation | 3 | Identifier Validator, Schema Conformance, SQL Safety Gate |

### Waves delivered

- **Waves 1–2** — Core, Security, Finance, Compliance/Health, and Agent/Infra/Legal suites.
- **Wave 3** — Data & Validation: Identifier Validator, Schema Conformance, SQL Safety Gate.
- **Wave 4** — Execution & egress gates: Command Safety Gate, URL/SSRF Gate.

## How an item graduates

`proposed → in progress → shipped`. A tool is **shipped** only when it lands across
every surface in lockstep: contract (`@agentoolbox/contracts`) → API → TypeScript SDK →
Python SDK → MCP server → website catalog → OpenAPI drift-guard green in CI.

---

## Near-term: security & supply-chain hardening

Protect what already exists before expanding the surface area. Tracked separately from
tool waves because it gates trust in every certificate the platform emits.

- **[done] `main` branch protection** — required PR + `Test & Typecheck` status check
  (strict), linear history, force-push and deletion blocked.
- **[done] Release-tag immutability** — repository ruleset over `refs/tags/*-v*`
  (`deletion` + `non_fast_forward`) so published version tags cannot be moved or deleted.
- **[owner] Two-factor authentication** — enroll on npm (`auth-and-writes` + require-2FA
  to publish), PyPI, and GitHub. Requires interactive authenticator enrollment.
- **[planned] npm OIDC / Trusted Publishing** — move the publish workflow to OIDC, drop
  the stored `NPM_TOKEN`, and add `--provenance` so releases carry signed build attestations
  (mirrors what PyPI publishing already does).
- **[owner] Rotate the previously exposed PyPI token** — then rely on the OIDC Trusted
  Publisher rather than a long-lived token.

### Certificate authenticity upgrade

Certificates are currently an **unkeyed** `SHA-256` of `subject:verdict:findings:timestamp`
— integrity-only and therefore forgeable by anyone who can reproduce the preimage. To make
them prove authenticity, not just integrity:

- Sign verdicts server-side with a keyed scheme (HMAC or Ed25519); keep a public key for
  verification.
- Add a certificate-verification path so a downstream system can confirm a certificate was
  issued by the service without handling the sensitive content.
- This work is a prerequisite for, and merges naturally into, the `attest` tool below.

---

## Wave 5 — Regulated verticals

Convert single-tool beachheads (health, finance, legal, compliance) into credible vertical
suites. Low incremental risk: each reuses existing checksum/table/grammar machinery. All
endpoints below are **proposed**.

| Tool | Proposed endpoint | Asserts (deterministic, offline) |
|---|---|---|
| `medcode` — Medical Coding Validator | `POST /v1/health/codes` | ICD-10-CM / CPT / HCPCS code existence, NPI check digit, billable + age/sex edits |
| `tax` — Tax & Invoice Sanity Gate | `POST /v1/finance/tax` | Line-item/total/rounding reconciliation, VAT/GST/sales-tax rate by jurisdiction, currency-conversion sanity |
| Trade & Customs Gate | `POST /v1/trade/screen` | HS/tariff code validity, ECCN export-control classification, denied-party screening |
| Legal citations extension | extends `/v1/legal/*` | USC / CFR / state-code validation; jurisdiction-specific court calendars beyond US Federal |

## Wave 6 — Platform moat

The differentiated, harder-to-copy layer. These are partly **stateful**, so they depend on
the certificate-authenticity upgrade and on infrastructure the earlier waves do not require.
All endpoints below are **proposed**.

| Tool | Proposed endpoint | Purpose |
|---|---|---|
| `attest` — Action Attestation + Transparency Log | `POST /v1/attest/action` | Signed, append-only, replayable record binding input hash + policy version + verdicts + timestamp; optional on-chain anchoring |
| `authz` — Agent Authorization Gate | `POST /v1/agent/authz` | Deterministic RBAC/ABAC decision: may this actor perform this action on this resource? Completes the trilogy of *safe action · reachable destination · permitted actor* |
| `budget` — Cost / Budget Kill-Switch | `POST /v1/agent/budget` | Enforces a cumulative spend cap across an agent run; hard stop on runaway cost |

---

## Per-tool enhancement tracks

Independent of new-tool waves, existing tools deepen along their own spec roadmaps. The
most developed is the PII/PHI/PCI Firewall (see `packages/privacy/SPEC.md` §10):

- Probabilistic NER for names/addresses, returned as lower-confidence entities so the
  deterministic core stays authoritative.
- More national IDs: US ITIN, AU TFN, IN Aadhaar (Verhoeff), BR CPF, EU passport MRZ.
- PHI dictionary pack (ICD-10 / diagnosis terms) behind a flag.
- Structured-payload (path-aware JSON) redaction.
- Custom enterprise policy packs.

## Sequencing rationale

1. **Hardening first.** A forgeable certificate or a hijackable release tag undermines
   every gate. Lock the supply chain and give certificates real authenticity before growing.
2. **Verticals next.** Highest ROI per unit of risk — reuses existing machinery and turns
   existing beachheads into full suites.
3. **Moat last.** `attest` / `authz` / `budget` are the durable differentiators, benefit
   from a large catalog of verdicts to attest, and require the stateful groundwork above.

## Housekeeping

- The root `README.md` service overview predates Waves 3–4 (it still describes the original
  core/finance endpoints). Refreshing it to enumerate all 26 tools is tracked as a
  documentation follow-up, separate from this roadmap.
