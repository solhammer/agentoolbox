# @agentoolbox/privacy — PII/PHI/PCI Egress Firewall

The deterministic gate an agent calls **before** text crosses a trust boundary
(logs, tickets, third-party APIs, persistence). Detects and redacts regulated
personal data, returns a `PASS`/`FLAG`/`BLOCK` verdict and a signed certificate.

**Endpoint:** `POST /v1/scan/pii` · **Credits:** 1 · **Latency:** < 20 ms · No network calls.

See [`SPEC.md`](./SPEC.md) for the full technical specification.

## Why

One leaked SSN or card number can trigger a reportable breach (GDPR up to €20M,
HIPAA up to $1.5M/category/yr, PCI-DSS liability). Models can't reliably validate
structured identifiers — that needs checksums (Luhn, ISO-7064, mod-11) and
jurisdiction-specific rules. This service does it deterministically.

## Quick start

```bash
curl -X POST https://api.agent-toolbox.ai/v1/scan/pii \
  -H "Content-Type: application/json" \
  -d '{"text":"Patient SSN 219-09-9999, card 4111 1111 1111 1111."}'
```

```json
{
  "verdict": "BLOCK",
  "categories": ["PII", "PCI"],
  "redactedText": "Patient SSN [REDACTED_US_SSN], card [REDACTED_CREDIT_CARD].",
  "certificate": "sha256:…"
}
```

## SDK

```typescript
import { AgentoolboxClient } from "agent-toolbox-sdk";

const client = new AgentoolboxClient({ baseUrl: "https://api.agent-toolbox.ai" });

const { verdict, redactedText } = await client.scanPii({
  text: outboundMessage,
  policy: { mode: "block", blockSeverityAtOrAbove: "high" },
});
if (verdict === "BLOCK") return; // or send redactedText instead
```

## Direct library (no API call)

```bash
npm install @agentoolbox/privacy
```

```typescript
import { scanPii } from "@agentoolbox/privacy";
const result = scanPii({ text });
```

## Detectors

`credit_card` (PCI) · `us_ssn` (PII) · `iban` (PCI) · `uk_nhs` (PHI) ·
`ca_sin` (PII) · `email` · `phone` · `ip_address`. Checksum-gated detectors
discard matches that fail validation, keeping false positives near zero.

## Policy

| Field | Default | Purpose |
|---|---|---|
| `mode` | `block` | `block` \| `flag` (advisory) \| `audit` (log-only) |
| `blockSeverityAtOrAbove` | `high` | Minimum severity that BLOCKs |
| `allowTypes` | `[]` | Detector types to ignore |
| `jurisdictions` | all | Restrict jurisdiction-specific detectors |
| `redact` | `true` | Return `redactedText` |

MIT · [agent-toolbox.ai](https://agent-toolbox.ai)
