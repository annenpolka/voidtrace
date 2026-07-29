import { describe, expect, it } from "vitest";
import { parseSemanticVersion, satisfies } from "./toolchain.ts";

describe("toolchain version checks", () => {
  it("parses the supported command output shapes", () => {
    expect(parseSemanticVersion("v24.13.0")).toEqual({
      major: 24,
      minor: 13,
      patch: 0,
    });
    expect(parseSemanticVersion("Pkl 0.32.1 (linux, native)")).toEqual({
      major: 0,
      minor: 32,
      patch: 1,
    });
    expect(parseSemanticVersion("just 1.51.0")).toEqual({
      major: 1,
      minor: 51,
      patch: 0,
    });
  });

  it("uses an inclusive minimum and exclusive maximum", () => {
    const range = {
      minimum: { major: 24, minor: 0, patch: 0 },
      maximumExclusive: { major: 27, minor: 0, patch: 0 },
    };

    expect(satisfies({ major: 24, minor: 0, patch: 0 }, range)).toBe(true);
    expect(satisfies({ major: 26, minor: 99, patch: 0 }, range)).toBe(true);
    expect(satisfies({ major: 27, minor: 0, patch: 0 }, range)).toBe(false);
  });
});
