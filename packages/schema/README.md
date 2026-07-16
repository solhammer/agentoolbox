# @agentoolbox/schema

Dependency-free JSON Schema (Draft-07 subset) validator with signed verdicts.

**Deterministic · Offline · No ajv · No network calls · TypeScript-native**

## Installation

This is a private monorepo package. Import it via the workspace protocol.

## Usage

```ts
import { validateSchema } from "@agentoolbox/schema";

const result = validateSchema({
  data: { name: "Alice", age: 30 },
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      age:  { type: "integer", minimum: 0 },
    },
    required: ["name", "age"],
  },
  policy: { mode: "block" }, // default
});

console.log(result.verdict);     // "PASS" | "FLAG" | "BLOCK"
console.log(result.valid);       // boolean
console.log(result.errors);      // SchemaError[]
console.log(result.certificate); // "sha256:<hex>"
```

## API

### `validateSchema(input: SchemaInput): SchemaResult`

| Field | Type | Description |
|-------|------|-------------|
| `input.data` | `unknown` | The value to validate |
| `input.schema` | `Record<string, unknown>` | JSON Schema (Draft-07 subset) |
| `input.policy?.mode` | `"block" \| "flag" \| "audit"` | Verdict severity (default: `"block"`) |

### `SchemaResult`

| Field | Type | Description |
|-------|------|-------------|
| `verdict` | `"PASS" \| "FLAG" \| "BLOCK"` | Overall verdict |
| `valid` | `boolean` | `true` when no errors found |
| `errors` | `SchemaError[]` | List of validation errors |
| `counts.errors` | `number` | Total error count |
| `certificate` | `string` | `sha256:<hex>` binding data+schema+verdict |
| `latencyMs` | `number` | Wall-clock validation time |

### `SchemaError`

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | JSON Pointer path (e.g. `"/items/0/name"`) |
| `keyword` | `string` | Failing keyword (e.g. `"type"`, `"required"`) |
| `message` | `string` | Human-readable description |
| `expected?` | `unknown` | Expected value/constraint |
| `actual?` | `unknown` | Actual value |

## Policy Modes

| Mode | Valid data | Invalid data |
|------|------------|--------------|
| `"block"` (default) | `PASS` | `BLOCK` + errors listed |
| `"flag"` | `PASS` | `FLAG` + errors listed |
| `"audit"` | `PASS` | `PASS` + errors listed |

## Supported Keywords

See [SPEC.md](./SPEC.md) for the complete keyword reference.

## Guards

- **Depth**: recursion capped at 64 levels — emits a `depth` error instead of hanging.
- **Size**: node count capped at 100,000 — emits a `size` error instead of hanging.
