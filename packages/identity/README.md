# @agentoolbox/identity

Deterministic, offline validation of structured identifiers for AI agents.

## Supported identifier types

| Type | Algorithm | Masking |
|------|-----------|---------|
| `iban` | ISO 7064 MOD-97 | No |
| `aba_routing` | Weighted MOD-10 (3-7-1) | No |
| `swift_bic` | Structural format (BBBBCCLL[XXX]) | No |
| `credit_card` | Luhn + BIN→network | Yes (last 4) |
| `ein` | IRS campus prefix table | No |
| `vat_eu` | Per-country pattern + checksum (DE, IT, NL) | No |
| `vin` | MOD-11 transliteration + check digit | No |
| `npi` | Luhn on "80840" + 9-digit prefix | No |
| `ssn` | SSA structural rules (area/group/serial) | Yes (last 4) |
| `eth_address` | Format + EIP-55 Keccak-256 checksum | No |
| `sol_address` | Base58 decode → 32 bytes | No |

## Usage

```ts
import { validateIdentifier } from "@agentoolbox/identity";

// Single value with explicit type
const result = validateIdentifier({
  value: "DE89370400440532013000",
  type: "iban",
});
// { verdict: "PASS", results: [...], counts: {...}, certificate: "sha256:...", latencyMs: 0 }

// Auto-detection
const r2 = validateIdentifier({ value: "4111111111111111" });
// Detected as credit_card, masked to "****-****-****-1111"

// Batch
const r3 = validateIdentifier({
  values: ["021000021", "021000022"],
  type: "aba_routing",
});
// { verdict: "BLOCK", counts: { total: 2, invalid: 1 }, ... }
```

## Verdict logic

- **PASS** — all identifiers are valid with a recognized type.
- **FLAG** — at least one identifier has type `"unknown"` (unrecognized format).
- **BLOCK** — at least one identifier is structurally or checksum-invalid.

## No external dependencies

All algorithms are implemented in pure TypeScript, including Keccak-256
(for ETH EIP-55) and Base58 (for SOL). No network calls or state.
