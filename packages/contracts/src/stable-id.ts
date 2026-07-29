const STABLE_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

export function isStableId(value: unknown): value is string {
  return typeof value === "string" && STABLE_ID.test(value);
}

export function assertStableId(value: unknown): asserts value is string {
  if (!isStableId(value)) {
    throw new TypeError(`Invalid stable ID: ${String(value)}`);
  }
}
