import { canonicalizeJson } from "@voidtrace/contracts";

export function jsonLine(value: unknown, pretty: boolean): string {
  const canonical = canonicalizeJson(value);
  if (!pretty) {
    return `${canonical}\n`;
  }
  return `${JSON.stringify(JSON.parse(canonical), null, 2)}\n`;
}
