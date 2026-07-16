# SPEC — @agentoolbox/agent (Tool-Argument / Business-Policy Firewall)

## Purpose

Provides a single deterministic, offline validation gate for proposed AI agent
tool calls. Given an argument map, a typed `ArgSchema`, and an optional `Policy`,
`checkToolArgs` returns a signed verdict that can be logged, forwarded, or acted
upon by an orchestrator.

## Design constraints

- **Pure function**: no side effects, no I/O, no global state.
- **Offline**: no network calls, no file system reads at call time.
- **Deterministic**: identical inputs + timestamp → identical outputs.
- **Strict TypeScript**: `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess` — all compile-time guards engaged.

## Checks performed (in order)

### 1. Required-field presence (severity: `critical`)

For each field in `schema.fields` where `required === true`:
- If the field key is absent from `args` → `critical` violation, rule `"required"`.
- If the field value is `undefined` → treated the same as absent.

### 2. Per-field validation

For each field present in `args` that is declared in `schema.fields`:

#### 2a. Null-safety (severity: `high`)

- If value is `null` and `spec.nullable !== true` → `high` violation, rule `"null"`.
- If value is `null` and `spec.nullable === true` → skip all further checks.

#### 2b. Type check (severity: `high`)

Checked types and their JS equivalents:

| `FieldSpec.type` | Accepted JS value           |
|------------------|-----------------------------|
| `"string"`       | `typeof x === "string"`     |
| `"number"`       | `typeof x === "number" && isFinite(x)` |
| `"integer"`      | `Number.isInteger(x)`       |
| `"boolean"`      | `typeof x === "boolean"`    |
| `"array"`        | `Array.isArray(x)`          |
| `"object"`       | plain object (not null, not array) |

On type mismatch → `high` violation, rule `"type"`. Further per-field checks
are skipped for that field (they would be noise).

#### 2c. Enum membership (severity: `high`)

If `spec.enum` is non-empty and the value is not in the list → `high` violation,
rule `"enum"`.

#### 2d. Numeric range (severity: `medium`)

For `"number"` or `"integer"` fields:
- `value < spec.min` → `medium` violation, rule `"min"`.
- `value > spec.max` → `medium` violation, rule `"max"`.

#### 2e. String constraints (severity: `medium`)

For `"string"` fields:
- `value.length < spec.minLength` → `medium`, rule `"minLength"`.
- `value.length > spec.maxLength` → `medium`, rule `"maxLength"`.
- `!new RegExp(spec.pattern).test(value)` → `medium`, rule `"pattern"`.
  - Invalid regex → `low` violation, rule `"pattern"`.

#### 2f. Unit-coercion heuristics (severity: `medium`)

For numeric fields with a `spec.unit` hint:

| Unit      | Heuristic                                   | Rationale                           |
|-----------|---------------------------------------------|-------------------------------------|
| `"cents"` | Fractional value → violation                | Cents must be integers              |
| `"cents"` | `0 < value < 1` → violation                 | Likely a dollar amount              |
| `"usd"`   | Integer value ≥ 10 000 → violation          | Suspiciously large; likely cents    |
| `"bps"`   | Value > 10 000 → violation                  | > 100% in basis-point space         |
| `"percent"` | Value > 100 → violation                   | Exceeds 100 %                       |

### 3. Unknown argument check (severity: `low`)

If `schema.allowUnknown !== true`:
- For each key in `args` not declared in `schema.fields` → `low` violation,
  rule `"unknown"`.

### 4. Cross-field rules (severity: `high`)

For each rule in `schema.rules`:
- Resolve `left` and `right` field paths via dot-notation lookup.
- `right` may be a constant `{ const: number|string }`.
- If either side resolves to `undefined` → rule is skipped.
- If `compareValues(leftVal, op, rightVal)` is `false` → `high` violation,
  rule `"cross-field.<op>"`, path `"__cross__.<left>"`.
- Custom `message` is used if provided; otherwise a default is generated.
- Mixed-type comparisons (number vs. string) are silently skipped.

## Verdict derivation

```
threshold = policy.blockSeverityAtOrAbove ?? "high"
hasBlock  = violations.some(v => SEVERITY_ORDER[v.severity] >= SEVERITY_ORDER[threshold])

if policy.mode === "audit"  → "PASS"  (violations still listed)
if hasBlock:
  if policy.mode === "flag" → "FLAG"  (downgrade)
  else                      → "BLOCK"
if !hasBlock && violations.length > 0 → "FLAG"
else                                  → "PASS"
```

## Certificate

```
subject   = `${toolName}:${JSON.stringify(args)}:${JSON.stringify(schema)}`
preimage  = `${sha256Hex(subject)}:${verdict}:${findings}:${timestamp}`
cert      = `sha256:${sha256Hex(preimage)}`
```

The certificate binds:
- a one-way hash of the subject (tool name + args + schema)
- the verdict string
- the total violation count
- the Unix-millisecond timestamp of the call

## Output shape

```ts
{
  verdict:     "PASS" | "FLAG" | "BLOCK",
  violations:  Violation[],
  counts:      { low: number; medium: number; high: number; critical: number },
  certificate: string,   // sha256:<64-hex>
  latencyMs:   number,
}
```
