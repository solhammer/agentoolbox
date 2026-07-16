# @agentoolbox/agent

**Tool-Argument / Business-Policy Firewall** — deterministic, offline validator
for proposed tool/function call arguments against a caller-supplied schema and
business policy.

## Overview

`checkToolArgs` receives an argument map, a typed schema, and an optional policy
override, then returns a structured verdict (`PASS`, `FLAG`, or `BLOCK`) with a
tamper-evident certificate.

No network calls, no state, no external runtime dependencies.

## Quick start

```ts
import { checkToolArgs } from "@agentoolbox/agent";

const result = checkToolArgs({
  tool: "create_charge",
  args: { amount: 9.99, currency: "usd" },
  schema: {
    fields: {
      amount: { type: "number", required: true, unit: "cents" },
      currency: { type: "string", required: true, enum: ["usd", "eur"] },
    },
  },
});

console.log(result.verdict);     // "FLAG"
console.log(result.violations);  // [{ path: "amount", rule: "unit-coercion", ... }]
console.log(result.certificate); // "sha256:..."
```

## API

### `checkToolArgs(input: ToolArgsInput): ToolArgsResult`

#### `ToolArgsInput`

| Field    | Type        | Description                                    |
|----------|-------------|------------------------------------------------|
| `tool`   | `string?`   | Optional tool name (included in certificate)   |
| `args`   | `Record<string, unknown>` | Proposed argument map             |
| `schema` | `ArgSchema` | Validation schema                              |
| `policy` | `Policy?`   | Optional policy overrides                      |

#### `ArgSchema`

| Field          | Type                          | Description                                |
|----------------|-------------------------------|--------------------------------------------|
| `fields`       | `Record<string, FieldSpec>`   | Per-field specifications                   |
| `allowUnknown` | `boolean?`                    | Allow undeclared args (default: false)     |
| `rules`        | `CrossFieldRule[]?`           | Cross-field comparison rules               |

#### `FieldSpec`

| Field       | Type                             | Description                         |
|-------------|----------------------------------|-------------------------------------|
| `type`      | `"string"\|"number"\|"integer"\|"boolean"\|"array"\|"object"` | Field type |
| `required`  | `boolean?`                       | Must be present                     |
| `nullable`  | `boolean?`                       | Allow null                          |
| `enum`      | `Array<string\|number>?`         | Allowed discrete values             |
| `min`       | `number?`                        | Inclusive minimum (numbers)         |
| `max`       | `number?`                        | Inclusive maximum (numbers)         |
| `minLength` | `number?`                        | Minimum string length               |
| `maxLength` | `number?`                        | Maximum string length               |
| `pattern`   | `string?`                        | Regex pattern string must match     |
| `unit`      | `"usd"\|"cents"\|"percent"\|"bps"?` | Unit hint for coercion heuristics |

#### `CrossFieldRule`

```ts
{ op: "lte"|"gte"|"lt"|"gt"|"eq"|"neq"; left: string; right: string|{const: number|string}; message?: string }
```

#### `Policy`

| Field                  | Type                            | Default   |
|------------------------|---------------------------------|-----------|
| `mode`                 | `"block"\|"flag"\|"audit"`      | `"block"` |
| `blockSeverityAtOrAbove` | `"low"\|"medium"\|"high"\|"critical"` | `"high"` |

#### `ToolArgsResult`

| Field        | Type                  | Description                              |
|--------------|-----------------------|------------------------------------------|
| `verdict`    | `"PASS"\|"FLAG"\|"BLOCK"` | Overall verdict                      |
| `violations` | `Violation[]`         | Detected violations                      |
| `counts`     | `ViolationCounts`     | Counts per severity level                |
| `certificate`| `string`              | `sha256:<hex>` tamper-evident certificate|
| `latencyMs`  | `number`              | Elapsed time in ms                       |

## Violation severities

| Rule              | Severity   | Default verdict |
|-------------------|------------|-----------------|
| Required missing  | `critical` | BLOCK           |
| Type mismatch     | `high`     | BLOCK           |
| Null on non-nullable | `high`  | BLOCK           |
| Enum violation    | `high`     | BLOCK           |
| Cross-field rule  | `high`     | BLOCK           |
| Numeric min/max   | `medium`   | FLAG            |
| String length     | `medium`   | FLAG            |
| String pattern    | `medium`   | FLAG            |
| Unit coercion     | `medium`   | FLAG            |
| Unknown arg       | `low`      | FLAG            |

## Building

```sh
pnpm --filter @agentoolbox/agent build
pnpm --filter @agentoolbox/agent test
pnpm --filter @agentoolbox/agent typecheck
```
