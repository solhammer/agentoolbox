# @agentoolbox/schema — Specification

JSON Schema Draft-07 subset validator. Deterministic, offline, no external dependencies.

## Keyword Reference

### Core Keywords

| Keyword | Description |
|---------|-------------|
| `type` | Value type: `"string"`, `"number"`, `"integer"`, `"boolean"`, `"object"`, `"array"`, `"null"`. Also accepts an array of types. |
| `enum` | Value must be deeply equal to one of the listed values. |
| `const` | Value must be deeply equal to the given constant. |
| `nullable` | If `true`, `null` is accepted regardless of `type`. |

### String Keywords

| Keyword | Description |
|---------|-------------|
| `minLength` | Minimum string length (inclusive). |
| `maxLength` | Maximum string length (inclusive). |
| `pattern` | ECMAScript regex the string must match. |
| `format` | Deterministic format check. See Formats below. |

### Numeric Keywords

| Keyword | Description |
|---------|-------------|
| `minimum` | Inclusive lower bound. |
| `maximum` | Inclusive upper bound. |
| `exclusiveMinimum` | Exclusive lower bound (Draft-07 numeric form). |
| `exclusiveMaximum` | Exclusive upper bound (Draft-07 numeric form). |
| `multipleOf` | Value must be a multiple of this number. |

### Array Keywords

| Keyword | Description |
|---------|-------------|
| `items` | Single schema (applied to all items) or array of schemas (tuple validation). |
| `minItems` | Minimum number of items (inclusive). |
| `maxItems` | Maximum number of items (inclusive). |
| `uniqueItems` | If `true`, all items must be deeply unique. |

### Object Keywords

| Keyword | Description |
|---------|-------------|
| `properties` | Map of property name → sub-schema. |
| `required` | Array of property names that must be present. |
| `additionalProperties` | `false` to disallow extra properties, or a schema to validate them. |
| `minProperties` | Minimum number of properties (inclusive). |
| `maxProperties` | Maximum number of properties (inclusive). |

### Composition Keywords

| Keyword | Description |
|---------|-------------|
| `allOf` | All sub-schemas must match. |
| `anyOf` | At least one sub-schema must match. |
| `oneOf` | Exactly one sub-schema must match. |
| `not` | Sub-schema must NOT match. |

### Reference

| Keyword | Description |
|---------|-------------|
| `$ref` | Local reference only. Resolves `#/$defs/...` and `#/definitions/...` paths within the same document. Remote/network refs are not supported and produce an error. |

## Supported Formats

| Format | Description |
|--------|-------------|
| `date` | `YYYY-MM-DD` |
| `date-time` | ISO 8601 date-time with timezone (`Z` or `±HH:MM`) |
| `email` | Simplified RFC-5322 email address |
| `uuid` | RFC 4122 UUID |
| `uri` | URI with scheme |
| `ipv4` | IPv4 dotted-decimal |

Unknown format values are silently ignored (passes).

## Error Paths

All error `path` values are JSON Pointers (RFC 6901):

- Root: `""`
- Property: `"/name"`
- Nested: `"/user/address/city"`
- Array item: `"/items/0"`
- Escaped slash: `"/a~1b"` (for property `"a/b"`)
- Escaped tilde: `"/a~0b"` (for property `"a~b"`)

## Guards

- **Depth limit**: 64 recursive schema levels. Exceeded → `depth` error, validation stops.
- **Node limit**: 100,000 validated nodes per call. Exceeded → `size` error, validation stops.

## Verdict Logic

```
errors.length === 0                    → PASS
errors.length > 0 && mode === "audit"  → PASS  (errors still listed)
errors.length > 0 && mode === "flag"   → FLAG
errors.length > 0 && mode === "block"  → BLOCK  (default)
```

## Certificate

The certificate is computed as:

```
subject  = sha256(JSON.stringify(data)) + ":" + sha256(JSON.stringify(schema))
preimage = sha256(subject) + ":" + verdict + ":" + errorCount + ":" + timestamp
cert     = "sha256:" + sha256(preimage)
```

This binds the data, schema, verdict, error count, and timestamp into a
tamper-evident token that can be independently re-verified.

## Out of Scope

- Remote `$ref` resolution (no network access)
- `patternProperties`
- `dependencies` / `dependentSchemas` / `dependentRequired`
- `if` / `then` / `else`
- `unevaluatedProperties` / `unevaluatedItems`
- `$schema` / `$id` / `$anchor` meta keywords
- Draft-04 boolean-form `exclusiveMinimum` / `exclusiveMaximum`
