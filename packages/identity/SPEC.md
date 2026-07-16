# @agentoolbox/identity — Specification

## Design Constraints

- **Deterministic**: identical inputs produce identical verdicts and checksum outcomes.
- **Offline**: no network calls, no external APIs, no state.
- **No external runtime dependencies**: all algorithms are pure TypeScript/Node.js.
- **Privacy-by-default**: credit card PANs and SSNs are always masked to last 4 digits.

## Public API

```ts
function validateIdentifier(input: IdentifierInput): IdentifierResult
```

### Input

```ts
interface IdentifierInput {
  value?: string;          // single identifier
  values?: string[];       // batch (requires at least one of value/values)
  type?: IdentifierType;   // explicit type (skips auto-detection)
  types?: IdentifierType[]; // restrict auto-detection to these types
}
```

### Output

```ts
interface IdentifierResult {
  verdict: "PASS" | "FLAG" | "BLOCK";
  results: IdentifierEntry[];
  counts: { total: number; invalid: number };
  certificate: string;   // sha256:<hex>
  latencyMs: number;
}
```

## Verdict Logic

| Condition | Verdict |
|-----------|---------|
| Any `valid: false` | BLOCK |
| Any `type: "unknown"` (no valid:false) | FLAG |
| All valid with known types | PASS |

## Algorithm Specifications

### IBAN (ISO 7064 MOD-97)

1. Normalize: uppercase, strip whitespace.
2. Validate format: `^[A-Z]{2}\d{2}[A-Z0-9]+$`.
3. Validate country code against the per-country length table (ISO 13616).
4. Validate total length matches expected length for country.
5. Rearrange: move first 4 characters to end.
6. Convert each letter to its numeric value: A=10, ..., Z=35.
7. Compute the resulting integer mod 97 using chunked arithmetic.
8. Valid if remainder == 1.

Checksum: `pass` or `fail`.

### ABA Routing Number

1. Strip spaces and dashes.
2. Validate: must be exactly 9 digits.
3. Apply weights [3,7,1,3,7,1,3,7,1] to each digit.
4. Valid if sum % 10 == 0.

Checksum: `pass` or `fail`.

### SWIFT BIC

Format: `BBBB CC LL [XXX]` where:
- BBBB = 4-letter bank code (alpha)
- CC = 2-letter ISO 3166-1 country code (alpha)
- LL = 2-char location code (alphanumeric)
- XXX = optional 3-char branch code (alphanumeric)

Total length: 8 or 11 characters. Structural validation only.
Checksum: `not_applicable` (no numeric checksum defined for BIC).

### Credit Card (Luhn + BIN)

1. Strip spaces and dashes.
2. Validate: must be 13–19 digits.
3. Detect network from BIN prefix (checked in priority order):
   - Amex: prefix 34 or 37, length 15
   - Discover: prefix 6011, 622126–622925, 644–649, 65
   - Mastercard: prefix 2221–2720 or 51–55, length 16
   - Visa: prefix 4, length 13/16/19
4. Standard Luhn check.
5. Valid if Luhn passes **and** network is not Unknown.

**Masking**: PAN is always masked to `****-****-****-XXXX` (last 4 digits). The full PAN is never echoed in `value` or `normalized`.

Checksum: `pass` or `fail`.

### EIN (Employer Identification Number)

Format: `XX-XXXXXXX` (2 digits + dash + 7 digits, or 9 digits).

1. Validate format with regex `^\d{2}-?\d{7}$`.
2. Extract prefix (first 2 digits).
3. Validate prefix against the IRS campus/online prefix set.

Invalid prefixes include: 07, 08, 09, 11, 17, 18, 19, 28, 29, 49, 69, 70, 78, 79, 89, 96, 97 and others not assigned.

Checksum: `not_applicable`.

### EU VAT Number

Format: `CC` + national number where CC is the EU country code.

Per-country format validation via regex. Checksum implemented for:
- **DE** (Germany): 9-digit iterative double-and-add MOD-11 algorithm.
- **IT** (Italy): 11-digit Luhn-style even/odd position sum.
- **NL** (Netherlands): 9-digit weighted MOD-11 (weights 9,8,7,6,5,4,3,2 on first 8 digits).
- All other EU members: format-only → checksum `not_applicable`.

Checksum: `pass`, `fail`, or `not_applicable`.

### VIN (Vehicle Identification Number)

1. Normalize: uppercase.
2. Validate length: exactly 17 characters.
3. Validate charset: `[A-HJ-NPR-Z0-9]` (I, O, Q are excluded).
4. Transliterate using the standard VIN lookup table (A=1, B=2, ..., Z=9, with gaps).
5. Apply position weights: [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2].
6. Compute weighted sum mod 11.
7. Check digit at position 9 (0-indexed: 8): remainder 10 → `'X'`, else the digit.

Checksum: `pass` or `fail`.

### NPI (National Provider Identifier)

CMS algorithm:
1. Validate: must be exactly 10 digits.
2. Construct: `"80840" + NPI[0..9]` (15-digit string).
3. Apply standard Luhn check to the 15-digit number.
4. Valid if Luhn passes.

Checksum: `pass` or `fail`.

### SSN (Social Security Number)

**Masking**: SSN is always masked to `***-**-XXXX`. The full SSN is never echoed.

SSA structural rules:
- Area (first 3 digits): not `000`, not `666`, not `900–999` (ITIN range).
- Group (digits 4–5): not `00`.
- Serial (digits 6–9): not `0000`.

Checksum: `not_applicable` (no numeric checksum defined).

### ETH Address (EIP-55)

1. Validate format: `0x` + exactly 40 hex characters.
2. If all-lowercase or all-uppercase: `checksum: "not_applicable"`, valid.
3. If mixed-case: verify EIP-55 checksum:
   - Compute Keccak-256 of the lowercase address (ASCII bytes).
   - For each character at position i: if letter, the i-th nibble of the hash
     determines the expected case (≥8 → uppercase, <8 → lowercase).

**Keccak-256 implementation**: Pure TypeScript, no external dependencies.
Uses BigInt for 64-bit lane operations. Implements the original Keccak specification
(0x01 padding), which is what Ethereum uses (distinct from NIST SHA-3 which uses 0x06 padding).

Verified against test vectors:
- `keccak256("")` = `c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470`
- `keccak256("abc")` = `4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45`

Checksum: `pass`, `fail`, or `not_applicable`.

### Solana Address

A Solana address is a Base58-encoded 32-byte Ed25519 public key.

1. Validate charset: Base58 alphabet (`123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`).
2. Validate length: 32–44 characters.
3. Decode Base58 to bytes (pure TypeScript implementation, no external libraries).
4. Valid if decoded byte length == 32.

**Base58 decode implementation**: Uses lookup table for O(1) character → value mapping,
then iterates the output byte array with carry propagation.

Checksum: `not_applicable` (Solana addresses have no embedded checksum beyond the Ed25519 key format).

## Certificate Format

```
sha256:<hex( sha256(subject) : verdict : invalidCount : timestamp )>
```

Where `subject = JSON.stringify(inputValues)`.

## Auto-Detection Priority

When no explicit `type` is provided, the detector tries patterns in this order:

1. ETH address: starts with `0x` + 40 hex chars
2. IBAN: 2-alpha + 2-digit prefix matching known country
3. EIN: `XX-XXXXXXX` (with literal dash)
4. SSN: `XXX-XX-XXXX` (with literal dashes)
5. ABA routing: exactly 9 digits
6. NPI: exactly 10 digits
7. Credit card: 13–19 digits (with optional spaces/dashes)
8. SWIFT BIC: 8 or 11 alphanumeric chars matching `AAAA BB CC [XXX]`
9. VIN: exactly 17 chars from VIN charset
10. EU VAT: 2-alpha country code matching EU member + national pattern
11. SOL address: 32–44 base58 chars

Ambiguous patterns (e.g. 9-digit ABA vs. 9-digit SSN) are resolved by priority.
Raw 9-digit SSNs are not auto-detected (ABA wins at priority 5).
