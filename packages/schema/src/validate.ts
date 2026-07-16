import type { SchemaError } from "./types.js";
import { validateFormat } from "./data/formats.js";

// ---------------------------------------------------------------------------
// Guard constants
// ---------------------------------------------------------------------------
const MAX_DEPTH = 64;
const MAX_NODES = 100_000;

// ---------------------------------------------------------------------------
// Internal context (mutable per-run)
// ---------------------------------------------------------------------------
interface Ctx {
  errors: SchemaError[];
  nodeCount: number;
  guarded: boolean;
  rootSchema: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asSchema(v: unknown): Record<string, unknown> | null {
  if (isObject(v)) return v;
  // boolean schemas: true = always valid, false = always invalid
  if (v === true) return {};
  if (v === false) return { _alwaysFail: true };
  return null;
}

function pushError(
  ctx: Ctx,
  path: string,
  keyword: string,
  message: string,
  extra?: { expected?: unknown; actual?: unknown }
): void {
  const err: SchemaError = {
    path,
    keyword,
    message,
    ...(extra?.expected !== undefined ? { expected: extra.expected } : {}),
    ...(extra?.actual !== undefined ? { actual: extra.actual } : {}),
  };
  ctx.errors.push(err);
}

// ---------------------------------------------------------------------------
// $ref resolution (local only: #/$defs/... or #/definitions/...)
// ---------------------------------------------------------------------------

function resolveRef(ref: unknown, rootSchema: Record<string, unknown>): Record<string, unknown> | null {
  if (typeof ref !== "string") return null;
  if (!ref.startsWith("#/")) return null; // remote refs not supported

  const parts = ref.slice(2).split("/").map(decodeRefToken);
  let node: unknown = rootSchema;
  for (const part of parts) {
    if (!isObject(node)) return null;
    node = node[part];
  }
  return asSchema(node);
}

function decodeRefToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

// ---------------------------------------------------------------------------
// Core recursive validator
// ---------------------------------------------------------------------------

function validateNode(
  data: unknown,
  schema: Record<string, unknown>,
  path: string,
  depth: number,
  ctx: Ctx
): void {
  // Depth guard
  if (depth > MAX_DEPTH) {
    if (!ctx.guarded) {
      ctx.guarded = true;
      pushError(ctx, path, "depth", `Recursion depth exceeded limit of ${MAX_DEPTH}`);
    }
    return;
  }

  // Node count guard
  ctx.nodeCount++;
  if (ctx.nodeCount > MAX_NODES) {
    if (!ctx.guarded) {
      ctx.guarded = true;
      pushError(ctx, path, "size", `Validated node count exceeded limit of ${MAX_NODES}`);
    }
    return;
  }

  // Boolean schema short-circuit
  if ((schema as { _alwaysFail?: boolean })._alwaysFail === true) {
    pushError(ctx, path, "false schema", "Schema is boolean false — always invalid");
    return;
  }

  // $ref — resolve and validate, then stop processing further keywords per Draft-07
  if (typeof schema["$ref"] === "string") {
    const resolved = resolveRef(schema["$ref"], ctx.rootSchema);
    if (resolved === null) {
      pushError(ctx, path, "$ref", `Cannot resolve $ref: ${String(schema["$ref"])}`);
    } else {
      validateNode(data, resolved, path, depth + 1, ctx);
    }
    return;
  }

  // nullable — treat null as valid regardless of type constraint
  const nullable = schema["nullable"] === true;

  // type
  if (schema["type"] !== undefined) {
    validateType(data, schema["type"], nullable, path, ctx);
  }

  // If data is null and nullable, skip remaining structural checks
  if (data === null && nullable) return;

  // enum
  if (schema["enum"] !== undefined) {
    validateEnum(data, schema["enum"], path, ctx);
  }

  // const
  if (Object.prototype.hasOwnProperty.call(schema, "const")) {
    validateConst(data, schema["const"], path, ctx);
  }

  // String keywords
  if (typeof data === "string") {
    validateStringKeywords(data, schema, path, ctx);
  }

  // Numeric keywords
  if (typeof data === "number") {
    validateNumericKeywords(data, schema, path, ctx);
  }

  // Array keywords
  if (Array.isArray(data)) {
    validateArrayKeywords(data, schema, path, depth, ctx);
  }

  // Object keywords
  if (isObject(data)) {
    validateObjectKeywords(data, schema, path, depth, ctx);
  }

  // Composition keywords
  if (schema["allOf"] !== undefined) validateAllOf(data, schema["allOf"], path, depth, ctx);
  if (schema["anyOf"] !== undefined) validateAnyOf(data, schema["anyOf"], path, depth, ctx);
  if (schema["oneOf"] !== undefined) validateOneOf(data, schema["oneOf"], path, depth, ctx);
  if (schema["not"] !== undefined) validateNot(data, schema["not"], path, depth, ctx);
}

// ---------------------------------------------------------------------------
// type validation
// ---------------------------------------------------------------------------

function getJsType(data: unknown): string {
  if (data === null) return "null";
  if (Array.isArray(data)) return "array";
  return typeof data;
}

function jsonSchemaTypeMatches(data: unknown, t: string): boolean {
  const js = getJsType(data);
  if (t === "integer") return js === "number" && Number.isInteger(data as number);
  if (t === "number") return js === "number";
  return js === t;
}

function validateType(
  data: unknown,
  typeConstraint: unknown,
  nullable: boolean,
  path: string,
  ctx: Ctx
): void {
  if (data === null && nullable) return;

  const types = Array.isArray(typeConstraint) ? typeConstraint : [typeConstraint];
  const valid = types.some((t) => typeof t === "string" && jsonSchemaTypeMatches(data, t));
  if (!valid) {
    pushError(ctx, path, "type", `Expected type ${JSON.stringify(typeConstraint)} but got ${getJsType(data)}`, {
      expected: typeConstraint,
      actual: getJsType(data),
    });
  }
}

// ---------------------------------------------------------------------------
// enum / const
// ---------------------------------------------------------------------------

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

function validateEnum(data: unknown, enumValues: unknown, path: string, ctx: Ctx): void {
  if (!Array.isArray(enumValues)) return;
  const valid = enumValues.some((v) => deepEqual(data, v));
  if (!valid) {
    pushError(ctx, path, "enum", `Value must be one of the allowed enum values`, {
      expected: enumValues,
      actual: data,
    });
  }
}

function validateConst(data: unknown, constValue: unknown, path: string, ctx: Ctx): void {
  if (!deepEqual(data, constValue)) {
    pushError(ctx, path, "const", `Value must equal the const value`, {
      expected: constValue,
      actual: data,
    });
  }
}

// ---------------------------------------------------------------------------
// String keywords
// ---------------------------------------------------------------------------

function validateStringKeywords(
  data: string,
  schema: Record<string, unknown>,
  path: string,
  ctx: Ctx
): void {
  if (schema["minLength"] !== undefined) {
    const min = schema["minLength"];
    if (typeof min === "number" && data.length < min) {
      pushError(ctx, path, "minLength", `String length ${data.length} is less than minLength ${min}`, {
        expected: min,
        actual: data.length,
      });
    }
  }

  if (schema["maxLength"] !== undefined) {
    const max = schema["maxLength"];
    if (typeof max === "number" && data.length > max) {
      pushError(ctx, path, "maxLength", `String length ${data.length} exceeds maxLength ${max}`, {
        expected: max,
        actual: data.length,
      });
    }
  }

  if (schema["pattern"] !== undefined) {
    const pat = schema["pattern"];
    if (typeof pat === "string") {
      let re: RegExp;
      try {
        re = new RegExp(pat, "u");
      } catch {
        pushError(ctx, path, "pattern", `Invalid regex pattern: ${pat}`);
        return;
      }
      if (!re.test(data)) {
        pushError(ctx, path, "pattern", `String does not match pattern /${pat}/`, {
          expected: pat,
          actual: data,
        });
      }
    }
  }

  if (schema["format"] !== undefined) {
    if (!validateFormat(schema["format"], data)) {
      pushError(ctx, path, "format", `String does not match format "${String(schema["format"])}"`, {
        expected: schema["format"],
        actual: data,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Numeric keywords
// ---------------------------------------------------------------------------

function validateNumericKeywords(
  data: number,
  schema: Record<string, unknown>,
  path: string,
  ctx: Ctx
): void {
  if (schema["minimum"] !== undefined) {
    const min = schema["minimum"];
    if (typeof min === "number" && data < min) {
      pushError(ctx, path, "minimum", `Value ${data} is less than minimum ${min}`, {
        expected: min,
        actual: data,
      });
    }
  }

  if (schema["maximum"] !== undefined) {
    const max = schema["maximum"];
    if (typeof max === "number" && data > max) {
      pushError(ctx, path, "maximum", `Value ${data} exceeds maximum ${max}`, {
        expected: max,
        actual: data,
      });
    }
  }

  if (schema["exclusiveMinimum"] !== undefined) {
    const exMin = schema["exclusiveMinimum"];
    if (typeof exMin === "number" && data <= exMin) {
      pushError(ctx, path, "exclusiveMinimum", `Value ${data} must be greater than ${exMin}`, {
        expected: exMin,
        actual: data,
      });
    }
  }

  if (schema["exclusiveMaximum"] !== undefined) {
    const exMax = schema["exclusiveMaximum"];
    if (typeof exMax === "number" && data >= exMax) {
      pushError(ctx, path, "exclusiveMaximum", `Value ${data} must be less than ${exMax}`, {
        expected: exMax,
        actual: data,
      });
    }
  }

  if (schema["multipleOf"] !== undefined) {
    const mul = schema["multipleOf"];
    if (typeof mul === "number" && mul > 0) {
      // Use modulo with epsilon to handle floating-point imprecision
      const remainder = data % mul;
      const eps = 1e-10 * Math.abs(mul);
      if (Math.abs(remainder) > eps && Math.abs(remainder - mul) > eps) {
        pushError(ctx, path, "multipleOf", `Value ${data} is not a multiple of ${mul}`, {
          expected: mul,
          actual: data,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Array keywords
// ---------------------------------------------------------------------------

function validateArrayKeywords(
  data: unknown[],
  schema: Record<string, unknown>,
  path: string,
  depth: number,
  ctx: Ctx
): void {
  if (schema["minItems"] !== undefined) {
    const min = schema["minItems"];
    if (typeof min === "number" && data.length < min) {
      pushError(ctx, path, "minItems", `Array has ${data.length} items, minimum is ${min}`, {
        expected: min,
        actual: data.length,
      });
    }
  }

  if (schema["maxItems"] !== undefined) {
    const max = schema["maxItems"];
    if (typeof max === "number" && data.length > max) {
      pushError(ctx, path, "maxItems", `Array has ${data.length} items, maximum is ${max}`, {
        expected: max,
        actual: data.length,
      });
    }
  }

  if (schema["uniqueItems"] === true) {
    const seen: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (seen.some((s) => deepEqual(s, item))) {
        pushError(ctx, path, "uniqueItems", `Array items are not unique (duplicate at index ${i})`, {
          actual: item,
        });
        break; // report once per array
      }
      seen.push(item);
    }
  }

  if (schema["items"] !== undefined) {
    const items = schema["items"];

    if (Array.isArray(items)) {
      // Tuple validation
      for (let i = 0; i < items.length; i++) {
        const itemSchema = asSchema(items[i]);
        if (itemSchema !== null && i < data.length) {
          validateNode(data[i], itemSchema, `${path}/${i}`, depth + 1, ctx);
        }
      }
      // additionalItems is not in scope — ignore
    } else {
      // Single-schema validation for all items
      const itemSchema = asSchema(items);
      if (itemSchema !== null) {
        for (let i = 0; i < data.length; i++) {
          validateNode(data[i], itemSchema, `${path}/${i}`, depth + 1, ctx);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Object keywords
// ---------------------------------------------------------------------------

function validateObjectKeywords(
  data: Record<string, unknown>,
  schema: Record<string, unknown>,
  path: string,
  depth: number,
  ctx: Ctx
): void {
  const keys = Object.keys(data);

  if (schema["minProperties"] !== undefined) {
    const min = schema["minProperties"];
    if (typeof min === "number" && keys.length < min) {
      pushError(ctx, path, "minProperties", `Object has ${keys.length} properties, minimum is ${min}`, {
        expected: min,
        actual: keys.length,
      });
    }
  }

  if (schema["maxProperties"] !== undefined) {
    const max = schema["maxProperties"];
    if (typeof max === "number" && keys.length > max) {
      pushError(ctx, path, "maxProperties", `Object has ${keys.length} properties, maximum is ${max}`, {
        expected: max,
        actual: keys.length,
      });
    }
  }

  // required
  if (schema["required"] !== undefined) {
    const required = schema["required"];
    if (Array.isArray(required)) {
      for (const req of required) {
        if (typeof req === "string" && !Object.prototype.hasOwnProperty.call(data, req)) {
          pushError(ctx, path, "required", `Missing required property "${req}"`, {
            expected: req,
          });
        }
      }
    }
  }

  // Determine which keys are matched by properties/patternProperties
  const propertiesSchema = schema["properties"];
  const definedKeys = new Set<string>();

  // properties
  if (isObject(propertiesSchema)) {
    for (const key of Object.keys(propertiesSchema)) {
      definedKeys.add(key);
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const propSchema = asSchema(propertiesSchema[key]);
        if (propSchema !== null) {
          validateNode(data[key], propSchema, `${path}/${escapeJsonPointer(key)}`, depth + 1, ctx);
        }
      }
    }
  }

  // additionalProperties
  if (schema["additionalProperties"] !== undefined) {
    const ap = schema["additionalProperties"];
    for (const key of keys) {
      if (!definedKeys.has(key)) {
        if (ap === false) {
          pushError(
            ctx,
            `${path}/${escapeJsonPointer(key)}`,
            "additionalProperties",
            `Additional property "${key}" is not allowed`
          );
        } else {
          const apSchema = asSchema(ap);
          if (apSchema !== null) {
            validateNode(data[key], apSchema, `${path}/${escapeJsonPointer(key)}`, depth + 1, ctx);
          }
        }
      }
    }
  }
}

function escapeJsonPointer(key: string): string {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}

// ---------------------------------------------------------------------------
// Composition keywords
// ---------------------------------------------------------------------------

function subValidate(data: unknown, schemaNode: unknown, path: string, depth: number, ctx: Ctx): SchemaError[] {
  const s = asSchema(schemaNode);
  if (s === null) return [];
  const subCtx: Ctx = {
    errors: [],
    nodeCount: ctx.nodeCount,
    guarded: ctx.guarded,
    rootSchema: ctx.rootSchema,
  };
  validateNode(data, s, path, depth + 1, subCtx);
  // Propagate node count and guard state
  ctx.nodeCount = subCtx.nodeCount;
  ctx.guarded = subCtx.guarded;
  return subCtx.errors;
}

function validateAllOf(
  data: unknown,
  allOf: unknown,
  path: string,
  depth: number,
  ctx: Ctx
): void {
  if (!Array.isArray(allOf)) return;
  for (let i = 0; i < allOf.length; i++) {
    const errs = subValidate(data, allOf[i], path, depth, ctx);
    for (const e of errs) ctx.errors.push(e);
  }
}

function validateAnyOf(
  data: unknown,
  anyOf: unknown,
  path: string,
  depth: number,
  ctx: Ctx
): void {
  if (!Array.isArray(anyOf)) return;
  let anyPassed = false;
  for (const sub of anyOf) {
    const errs = subValidate(data, sub, path, depth, ctx);
    if (errs.length === 0) {
      anyPassed = true;
      break;
    }
  }
  if (!anyPassed) {
    pushError(ctx, path, "anyOf", `Value does not match any of the anyOf schemas`);
  }
}

function validateOneOf(
  data: unknown,
  oneOf: unknown,
  path: string,
  depth: number,
  ctx: Ctx
): void {
  if (!Array.isArray(oneOf)) return;
  let passCount = 0;
  for (const sub of oneOf) {
    const errs = subValidate(data, sub, path, depth, ctx);
    if (errs.length === 0) passCount++;
  }
  if (passCount !== 1) {
    pushError(
      ctx,
      path,
      "oneOf",
      `Value must match exactly one of the oneOf schemas, but matched ${passCount}`,
      { expected: 1, actual: passCount }
    );
  }
}

function validateNot(
  data: unknown,
  notSchema: unknown,
  path: string,
  depth: number,
  ctx: Ctx
): void {
  const errs = subValidate(data, notSchema, path, depth, ctx);
  if (errs.length === 0) {
    pushError(ctx, path, "not", `Value must not match the "not" schema`);
  }
}

// ---------------------------------------------------------------------------
// Public entry point (exported for testing)
// ---------------------------------------------------------------------------

export function runValidator(
  data: unknown,
  schema: Record<string, unknown>
): SchemaError[] {
  const ctx: Ctx = {
    errors: [],
    nodeCount: 0,
    guarded: false,
    rootSchema: schema,
  };
  validateNode(data, schema, "", 0, ctx);
  return ctx.errors;
}
