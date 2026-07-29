export type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue };

function assertValidUnicode(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError(`Invalid lone high surrogate at ${path}`);
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError(`Invalid lone low surrogate at ${path}`);
    }
  }
}

function defineJsonProperty(
  target: Record<string, JsonValue>,
  key: string,
  value: JsonValue,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function snapshot(value: unknown, path: string, ancestors: Set<object>): JsonValue {
  if (value === null) {
    return null;
  }

  switch (typeof value) {
    case "string":
      assertValidUnicode(value, path);
      return value;
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError(`Non-finite number is not valid JSON at ${path}`);
      }
      return value;
    case "object":
      break;
    default:
      throw new TypeError(`Non-JSON value at ${path}: ${typeof value}`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Cyclic value is not valid JSON at ${path}`);
  }
  ancestors.add(value);

  try {
    const prototype = Object.getPrototypeOf(value);
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype && prototype !== null) {
        throw new TypeError(`Non-plain array is not valid JSON at ${path}`);
      }
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) => typeof key !== "string")) {
        throw new TypeError(`Array has non-index properties at ${path}`);
      }
      const keys = ownKeys as string[];
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        !lengthDescriptor ||
        !Object.hasOwn(lengthDescriptor, "value") ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        throw new TypeError(`Array has an invalid length at ${path}`);
      }
      const length = lengthDescriptor.value as number;
      const keySet = new Set(keys);
      if (keys.length !== length + 1 || !keySet.has("length")) {
        throw new TypeError(`Sparse array or non-index property at ${path}`);
      }

      const result: JsonValue[] = new Array(length);
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        if (!keySet.has(key)) {
          throw new TypeError(`Sparse array is not valid JSON at ${path}`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
          throw new TypeError(`Accessor or hidden property is not valid JSON at ${path}[${key}]`);
        }
        result[index] = snapshot(descriptor.value, `${path}[${key}]`, ancestors);
      }
      return result;
    }

    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain object is not valid JSON at ${path}`);
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new TypeError(`Object has non-JSON properties at ${path}`);
    }

    const result: Record<string, JsonValue> = {};
    for (const key of ownKeys as string[]) {
      assertValidUnicode(key, `${path} key`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError(`Accessor or hidden property is not valid JSON at ${path}.${key}`);
      }
      defineJsonProperty(result, key, snapshot(descriptor.value, `${path}.${key}`, ancestors));
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Captures one descriptor-based, behavior-free snapshot of an I-JSON value.
 */
export function snapshotJsonValue(value: unknown): JsonValue {
  return snapshot(value, "$", new Set());
}

export function snapshotJsonObject(value: unknown): Record<string, JsonValue> {
  const result = snapshotJsonValue(value);
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new TypeError("Expected a plain JSON object");
  }
  return result as Record<string, JsonValue>;
}

function assertDataProperties(value: object, keys: string[], path: string): void {
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`Accessor or hidden property is not valid JSON at ${path}.${key}`);
    }
  }
}

function serialize(value: unknown, path: string, ancestors: Set<object>): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "string":
      assertValidUnicode(value, path);
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError(`Non-finite number is not valid JSON at ${path}`);
      }
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new TypeError(`Non-JSON value at ${path}: ${typeof value}`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Cyclic value is not valid JSON at ${path}`);
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const keys = Object.keys(value);
      const ownKeys = Reflect.ownKeys(value).filter((key) => key !== "length");
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError(`Sparse array is not valid JSON at ${path}`);
        }
      }
      if (
        ownKeys.length !== keys.length ||
        ownKeys.some((key) => typeof key !== "string") ||
        keys.some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
      ) {
        throw new TypeError(`Array has non-index properties at ${path}`);
      }
      assertDataProperties(value, keys, path);
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) {
          throw new TypeError(`Array changed during canonicalization at ${path}`);
        }
        items.push(serialize(descriptor.value, `${path}[${index}]`, ancestors));
      }
      return `[${items.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain object is not valid JSON at ${path}`);
    }

    const keys = Object.keys(value);
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== keys.length ||
      ownKeys.some((key) => typeof key !== "string" || !Object.hasOwn(value, key))
    ) {
      throw new TypeError(`Object has non-JSON properties at ${path}`);
    }
    assertDataProperties(value, keys, path);

    keys.sort();
    const properties = keys.map((key) => {
      assertValidUnicode(key, `${path} key`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError(`Object changed during canonicalization at ${path}.${key}`);
      }
      return `${JSON.stringify(key)}:${serialize(descriptor.value, `${path}.${key}`, ancestors)}`;
    });
    return `{${properties.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Serializes an I-JSON value using the JSON Canonicalization Scheme (RFC 8785).
 */
export function canonicalizeJson(value: unknown): string {
  return serialize(snapshotJsonValue(value), "$", new Set());
}

/**
 * Copies a plain JSON object while omitting selected top-level properties.
 *
 * The complete source object is validated before any property is omitted so
 * excluded fields cannot hide accessors, inherited state, or non-JSON values.
 */
export function cloneJsonObjectOmitting(
  value: unknown,
  omittedProperties: readonly string[],
): Record<string, JsonValue> {
  const snapshot = snapshotJsonObject(value);
  const omitted = new Set(omittedProperties);
  const clone: Record<string, JsonValue> = Object.create(null);
  for (const key of Object.keys(snapshot)) {
    if (omitted.has(key)) {
      continue;
    }
    clone[key] = snapshot[key] as JsonValue;
  }
  return clone;
}
