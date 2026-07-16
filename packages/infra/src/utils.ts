/** Returns true if v is a non-null, non-array object. */
export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Returns true if v is an array. */
export function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

/** Returns true if v is a string. */
export function isString(v: unknown): v is string {
  return typeof v === "string";
}

/** Returns true if v is a boolean. */
export function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

/** Safely reads a string property from an object. */
export function getString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const val = obj[key];
  return isString(val) ? val : undefined;
}

/** Safely reads a boolean property from an object. */
export function getBoolean(
  obj: Record<string, unknown>,
  key: string
): boolean | undefined {
  const val = obj[key];
  return isBoolean(val) ? val : undefined;
}

/** Safely reads an array property from an object. */
export function getArray(
  obj: Record<string, unknown>,
  key: string
): unknown[] | undefined {
  const val = obj[key];
  return isArray(val) ? val : undefined;
}

/** Safely reads an object property from an object. */
export function getObject(
  obj: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const val = obj[key];
  return isObject(val) ? val : undefined;
}
