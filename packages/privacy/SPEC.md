# Technical Specification — PII/PHI/PCI Egress Firewall

**Package:** `@agentoolbox/privacy`
**Endpoint:** `POST /v1/scan/pii`
**Status:** v0.1 (deterministic core)
**Credits:** 1 · **Target latency:** < 20 ms (local, no network)

---

## 1. Problem

AI agents routinely move text across trust boundaries — writing logs, opening
tickets, calling third-party APIs, persisting transcripts, sending emails. When
that text contains regulated personal data (PII), protected health information
(PHI), or cardholder data (PCI), a single unguarded egress becomes a reportable
breach: GDPR Art. 83 fines (up to €20M / 4% of global turnover), HIPAA penalties
(up to $1.5M per violation category per year), and PCI-DSS liability.

Models cannot reliably self-police this. Structured identifiers require
**checksums** (Luhn for card PANs, ISO-7064 mod-97 for IBANs, mod-11 for UK NHS
numbers) and **jurisdiction-specific formats** that LLMs approximate but do not
verify. The result is both under-detection (missed IBANs) and over-redaction
(flagging `Paris` as a name).

This tool is the deterministic, agent-callable gate that runs in the
`propose → validate → execute` seam, mirroring the Finance Toolkit pattern.

## 2. Goals & non-goals

**Goals**
- Deterministic detection of high-confidence structured identifiers with checksum validation.
- Never echo raw personal data back to the caller (masked previews + redacted copy only).
- Emit a tamper-evident certificate suitable for a compliance audit trail.
- Configurable, policy-driven enforcement (`block` / `flag` / `audit`).
- Zero network calls; sub-20ms; safe to call on every egress.

**Non-goals (v0.1)**
- Probabilistic NER for free-text names / postal addresses (roadmap §10).
- Secret/credential detection — already covered by `POST /v1/scan/secrets`.
- Storing or transmitting the scanned content anywhere.

## 3. API

### Request

```json
{
  "text": "Patient SSN 219-09-9999, card 4111 1111 1111 1111.",
  "filename": "ticket-8412.txt",
  "policy": {
    "mode": "block",
    "blockSeverityAtOrAbove": "high",
    "allowTypes": ["ip_address"],
    "jurisdictions": ["US", "UK", "CA"],
    "redact": true
  }
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `text` | string (1–200,000 chars) | yes | — | Content to scan before egress. |
| `filename` | string | no | — | Source identifier, echoed back. |
| `policy.mode` | `block` \| `flag` \| `audit` | no | `block` | Enforcement mode (see §5). |
| `policy.blockSeverityAtOrAbove` | `low` \| `medium` \| `high` \| `critical` | no | `high` | Minimum severity that yields BLOCK. |
| `policy.allowTypes` | string[] | no | `[]` | Detector types to ignore. |
| `policy.jurisdictions` | string[] | no | all | Restrict jurisdiction-specific detectors. |
| `policy.redact` | boolean | no | `true` | Whether to return `redactedText`. |

### Response

```json
{
  "verdict": "BLOCK",
  "safe": false,
  "score": 100,
  "categories": ["PII", "PCI"],
  "totalFindings": 2,
  "counts": { "low": 0, "medium": 0, "high": 0, "critical": 2 },
  "entities": [
    {
      "type": "us_ssn", "category": "PII", "severity": "critical",
      "match": "***-**-****", "start": 12, "end": 23, "line": 1,
      "validated": true, "confidence": 0.9, "jurisdiction": "US"
    },
    {
      "type": "credit_card", "category": "PCI", "severity": "critical",
      "match": "**** **** **** ****", "start": 30, "end": 49, "line": 1,
      "validated": true, "confidence": 0.99
    }
  ],
  "redactedText": "Patient SSN [REDACTED_US_SSN], card [REDACTED_CREDIT_CARD].",
  "certificate": "sha256:1cea7cf6...",
  "enforcementMode": "block",
  "filename": "ticket-8412.txt",
  "latencyMs": 3
}
```

`entities[].match` is a **format-preserving mask** — every alphanumeric is
replaced with `*`; separators are preserved. The raw value is never returned.

## 4. Detectors (v0.1)

| Type | Category | Severity | Validation | Jurisdiction |
|---|---|---|---|---|
| `credit_card` | PCI | critical | Luhn mod-10 + length 13–19 | — |
| `us_ssn` | PII | critical | SSA structural rules (area/group/serial) | US |
| `iban` | PCI | high | ISO 7064 mod-97-10 | — |
| `uk_nhs` | PHI | high | mod-11 check digit | UK |
| `ca_sin` | PII | high | Luhn mod-10 | CA |
| `email` | PII | medium | RFC-ish structural | — |
| `phone` | PII | low | NANP structural (separator required) | — |
| `ip_address` | PII | low | IPv4 octet range | — |

**Checksum-gated detectors** (`credit_card`, `iban`, `uk_nhs`, `ca_sin`) discard
any match that fails its checksum, driving structured-identifier false positives
to near zero. Overlapping matches are resolved by preferring higher severity,
then checksum-validated, then longer spans — so the same digits are never
double-counted (e.g. a card fragment also matching a phone pattern).

## 5. Verdict logic

1. **Base verdict** from the most severe entity:
   - no entities → `PASS`
   - `maxSeverity >= blockSeverityAtOrAbove` → `BLOCK`
   - otherwise → `FLAG`
2. **Enforcement mode** transforms the base verdict:
   - `block` → returns the base verdict unchanged
   - `flag` → any `BLOCK` is downgraded to `FLAG` (advisory)
   - `audit` → verdict is always `PASS`; entities are still reported (log-only)
3. `score` = severity score of the most sensitive entity (`critical`=100,
   `high`=70, `medium`=40, `low`=15; `0` when clean). `safe` = no entities found.

## 6. Certificate

```
sha256:<hex( sha256(text) : verdict : totalFindings : timestamp )>
```

The preimage binds a **one-way hash of the input** (never the raw text) to the
verdict, finding count, and timestamp, so a downstream system can require and
re-verify a certificate without ever handling the sensitive content.

## 7. Privacy guarantees
- No raw personal data appears in the response — only masked previews and a redacted copy.
- No network calls; input is never transmitted off-box.
- No persistence — the scan is a pure function of its input.
- Certificates are bound to the input hash, not its plaintext.

## 8. Errors

Inherits the standard API contract:

| HTTP | `error` | Meaning |
|---|---|---|
| `400` | validation error | Body failed schema (e.g. `text` empty or > 200k chars). |
| `402` | `free_tier_exhausted` / `insufficient_credits` | Send SOL to the service wallet. |
| `401` | `invalid_token` | Malformed Bearer token. |

## 9. Performance
- Pure CPU, no I/O. Linear in input length across a fixed detector set.
- Target < 20 ms for typical payloads (< 50 KB); hard input cap 200 KB.

## 10. Roadmap
- Probabilistic NER for names / postal addresses (with calibrated thresholds), returned as lower-confidence `medium` entities so the deterministic core stays authoritative.
- Additional national IDs: US ITIN, AU TFN, IN Aadhaar (Verhoeff), BR CPF, EU passport MRZ.
- PHI dictionary pack (ICD-10 / diagnosis terms) behind a `phiDictionary` flag.
- Structured-payload mode: redact within JSON without breaking syntax (path-aware).
- Custom enterprise policy packs (upload dictionaries + per-destination rules).

## 11. Library usage

```typescript
import { scanPii } from "@agentoolbox/privacy";

const result = scanPii({
  text: outboundMessage,
  policy: { mode: "block", blockSeverityAtOrAbove: "high" },
});

if (result.verdict === "BLOCK") {
  // stop egress; optionally send result.redactedText instead
  throw new Error(`PII egress blocked: ${result.categories.join(", ")}`);
}
```
