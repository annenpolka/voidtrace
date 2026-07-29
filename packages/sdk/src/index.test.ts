import generatedCapabilities from "@voidtrace/spec-artifacts/capabilities" with { type: "json" };
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import { describeCapabilities, evaluateScenario } from "./index.ts";

function allObjectsAreFrozen(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return true;
  }
  return Object.isFrozen(value) && Object.values(value).every(allObjectsAreFrozen);
}

describe("VoidTrace SDK", () => {
  it("returns a fresh, deeply frozen capability snapshot", () => {
    const first = describeCapabilities();
    const second = describeCapabilities();

    expect(first).toEqual(generatedCapabilities);
    expect(first).not.toBe(generatedCapabilities);
    expect(first).not.toBe(second);
    expect(first.capabilities).not.toBe(second.capabilities);
    expect(allObjectsAreFrozen(first)).toBe(true);
    expect(allObjectsAreFrozen(second)).toBe(true);
  });

  it("delegates evaluation with the generated core Ruleset", async () => {
    const first = await evaluateScenario({
      scenario: structuredClone(scenarioFixture),
      catalog: structuredClone(catalogFixture),
    });
    const second = await evaluateScenario({
      scenario: structuredClone(scenarioFixture),
      catalog: structuredClone(catalogFixture),
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first).toEqual(second);
    if (!first.ok) {
      throw new Error(first.error.message);
    }
    expect(first.result.kind).toBe("voidtrace.result");
    expect(first.trace.kind).toBe("voidtrace.trace");
    expect(first.result.fingerprint.rulesetHash).toBe(scenarioFixture.rulesetRef.contentHash);
  });
});
