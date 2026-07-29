import { describe, expect, it } from "vitest";
import { EMPTY_RULESET } from "./ruleset.ts";

describe("EMPTY_RULESET", () => {
  it("is an immutable, mechanics-free Ruleset", () => {
    expect(EMPTY_RULESET).toEqual({
      id: "ruleset.empty",
      version: "0.1.0",
      rules: [],
    });
    expect(Object.isFrozen(EMPTY_RULESET)).toBe(true);
    expect(Object.isFrozen(EMPTY_RULESET.rules)).toBe(true);
  });
});
