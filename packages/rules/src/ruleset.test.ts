import { attachArtifactContentHash, validateContract } from "@voidtrace/contracts";
import coreRuleset from "@voidtrace/spec-artifacts/rulesets/core" with { type: "json" };
import { describe, expect, it } from "vitest";
import { EMPTY_RULESET, loadRuleset } from "./ruleset.ts";

describe("EMPTY_RULESET", () => {
  it("preserves the immutable mechanics-free Kernel bootstrap value", () => {
    expect(EMPTY_RULESET).toEqual({
      id: "ruleset.empty",
      version: "0.1.0",
      rules: [],
    });
    expect(Object.isFrozen(EMPTY_RULESET)).toBe(true);
    expect(Object.isFrozen(EMPTY_RULESET.rules)).toBe(true);
  });
});

describe("loadRuleset", () => {
  it("loads the generated core Ruleset through its contract and content hash", async () => {
    expect(validateContract("ruleset", coreRuleset).ok).toBe(true);

    const loaded = await loadRuleset();

    expect(loaded.snapshot.id).toBe("ruleset.synthetic-core");
    expect(loaded.snapshot.rules).toHaveLength(6);
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.snapshot)).toBe(true);
    expect(Object.isFrozen(loaded.snapshot.rules)).toBe(true);
    expect(Object.isFrozen(loaded.snapshot.rules[0]?.operation)).toBe(true);
    expect(loaded.resolveRule("rule.critical.resolve-binary-roll")).toMatchObject({
      phase: "critical.roll",
      reads: ["attack.critical-chance", "event.critical-roll"],
      writes: [
        "event.critical-tier",
        "event.critical-tier-0-probability",
        "event.critical-tier-1-probability",
      ],
      operation: { kind: "critical-tier.resolve-binary-roll" },
    });
    expect(loaded.resolveRule("rule.defense.standard-armor").phase).toBe("target.mitigate");
  });

  it("rejects generated-contract and content-hash failures with structured codes", async () => {
    await expect(
      loadRuleset({
        ...coreRuleset,
        revision: -1,
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "contract-invalid" }));

    await expect(
      loadRuleset({
        ...coreRuleset,
        contentHash: `sha256:${"0".repeat(64)}`,
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "content-hash-mismatch" }));
  });

  it("rejects duplicate IDs and phase-order regression before execution", async () => {
    const firstRule = coreRuleset.rules[0];
    const lastRule = coreRuleset.rules.at(-1);
    if (firstRule === undefined || lastRule === undefined) {
      throw new Error("Expected generated core rules");
    }

    await expect(
      loadRuleset({
        ...coreRuleset,
        rules: [firstRule, { ...lastRule, id: firstRule.id }],
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "duplicate-rule-id" }));

    await expect(
      loadRuleset({
        ...coreRuleset,
        rules: [lastRule, firstRule],
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "phase-order-invalid" }));
  });

  it("rejects declarations that do not exactly match their finite operation", async () => {
    const { contentHash: _contentHash, ...withoutHash } = coreRuleset;
    const ruleset = await attachArtifactContentHash({
      ...withoutHash,
      rules: coreRuleset.rules.map((rule) =>
        rule.id === "rule.damage.direct-hit"
          ? {
              ...rule,
              reads: ["event.damage"],
            }
          : rule,
      ),
    });

    await expect(loadRuleset(ruleset)).rejects.toThrowError(
      expect.objectContaining({ code: "operation-declaration-invalid" }),
    );

    const rollDeclarationMismatch = await attachArtifactContentHash({
      ...withoutHash,
      rules: coreRuleset.rules.map((rule) =>
        rule.id === "rule.critical.resolve-binary-roll"
          ? {
              ...rule,
              phase: "critical.resolve" as const,
            }
          : rule,
      ),
    });

    await expect(loadRuleset(rollDeclarationMismatch)).rejects.toThrowError(
      expect.objectContaining({ code: "operation-declaration-invalid" }),
    );
  });

  it("rejects unknown references rather than returning undefined", async () => {
    const loaded = await loadRuleset();

    expect(() => loaded.resolveRule("rule.unknown")).toThrowError(
      expect.objectContaining({ code: "invalid-reference" }),
    );
  });
});
