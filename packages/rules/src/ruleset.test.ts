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
    expect(loaded.snapshot.schemaVersion).toBe("0.6.0");
    expect(loaded.snapshot.revision).toBe(1);
    expect(loaded.snapshot.rules).toHaveLength(11);
    expect(loaded.snapshot.rules.map((rule) => rule.id)).toEqual([
      "rule.multishot.emit-fixed-hits",
      "rule.pellet.emit-fixed-hits",
      "rule.critical.resolve-expected-branches",
      "rule.damage.direct-hit",
      "rule.critical.resolve-tier-roll",
      "rule.critical.scale-tier",
      "rule.defense.standard-armor",
      "rule.damage.commit-health",
      "rule.critical.aggregate-expected-branches",
      "rule.multishot.aggregate-fixed-hits",
      "rule.pellet.aggregate-fixed-hits",
    ]);
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.snapshot)).toBe(true);
    expect(Object.isFrozen(loaded.snapshot.rules)).toBe(true);
    expect(Object.isFrozen(loaded.snapshot.rules[0]?.operation)).toBe(true);
    expect(loaded.resolveRule("rule.multishot.emit-fixed-hits")).toMatchObject({
      phase: "attack.emit",
      reads: ["action.multishot-hit-count"],
      writes: ["event.direct-hit-count"],
      operation: { kind: "event.expand-fixed-multishot", maximumHits: 64 },
    });
    expect(loaded.resolveRule("rule.pellet.emit-fixed-hits")).toMatchObject({
      phase: "attack.emit",
      reads: ["action.pellet-count"],
      writes: ["event.direct-hit-count"],
      operation: { kind: "event.expand-fixed-pellets", maximumPellets: 64 },
    });
    expect(loaded.resolveRule("rule.critical.resolve-tier-roll")).toMatchObject({
      phase: "critical.roll",
      reads: ["attack.critical-chance", "event.critical-roll"],
      writes: [
        "event.critical-tier",
        "event.critical-base-tier",
        "event.critical-next-tier",
        "event.critical-fraction",
        "event.critical-base-tier-probability",
        "event.critical-next-tier-probability",
      ],
      operation: { kind: "critical-tier.resolve-tier-roll" },
    });
    expect(loaded.resolveRule("rule.critical.scale-tier")).toMatchObject({
      phase: "critical.resolve",
      operation: { kind: "damage-vector.scale-critical-tier" },
    });
    expect(loaded.resolveRule("rule.critical.resolve-expected-branches")).toMatchObject({
      phase: "critical.expected",
      reads: ["attack.critical-chance"],
      operation: { kind: "critical-tier.resolve-expected-branches" },
    });
    expect(loaded.resolveRule("rule.critical.aggregate-expected-branches")).toMatchObject({
      phase: "result.aggregate",
      reads: ["branch.damage", "branch.health", "branch.weight"],
      operation: { kind: "damage-vector.aggregate-weighted-branches" },
    });
    expect(loaded.resolveRule("rule.multishot.aggregate-fixed-hits")).toMatchObject({
      phase: "result.aggregate",
      reads: ["hit.damage", "hit.health-before", "hit.health-after"],
      operation: { kind: "damage-vector.aggregate-sequential-hits" },
    });
    expect(loaded.resolveRule("rule.pellet.aggregate-fixed-hits")).toMatchObject({
      phase: "result.aggregate",
      reads: ["hit.damage", "hit.health-before", "hit.health-after"],
      operation: { kind: "damage-vector.aggregate-sequential-pellets" },
    });
    expect(loaded.resolveRule("rule.defense.standard-armor").phase).toBe("target.mitigate");
  });

  it("exposes the separate expected aggregate executor without weakening executeRule context", async () => {
    const loaded = await loadRuleset();
    const result = loaded.executeExpectedAggregateRule(
      "rule.critical.aggregate-expected-branches",
      {
        initialHealth: 100,
        branches: [
          {
            id: "branch.critical-tier-0",
            tier: 0,
            weight: 1,
            damage: { "damage.synthetic": 25 },
            health: 75,
          },
        ],
      },
    );

    expect(result.after).toEqual({
      damage: { "damage.synthetic": 25 },
      damageTotal: 25,
      health: 75,
    });
  });

  it("exposes fixed Multishot expansion through its dedicated context", async () => {
    const loaded = await loadRuleset();
    const result = loaded.executeFixedMultishotRule("rule.multishot.emit-fixed-hits", {
      hitCount: 3,
      initialHealth: 1000,
      zeroDamage: { "damage.synthetic": 0 },
    });

    expect(result).toMatchObject({
      operationKind: "event.expand-fixed-multishot",
      parameters: {
        factor: 1,
        hitCount: 3,
        maximumHits: 64,
      },
      before: {
        damage: { "damage.synthetic": 0 },
        health: 1000,
      },
      after: {
        damage: { "damage.synthetic": 0 },
        health: 1000,
      },
    });
  });

  it("exposes fixed pellet expansion through its dedicated context", async () => {
    const loaded = await loadRuleset();
    const result = loaded.executeFixedPelletRule("rule.pellet.emit-fixed-hits", {
      pelletCount: 4,
      initialHealth: 1000,
      zeroDamage: { "damage.synthetic": 0 },
    });

    expect(result).toMatchObject({
      operationKind: "event.expand-fixed-pellets",
      parameters: {
        factor: 1,
        maximumPellets: 64,
        pelletCount: 4,
      },
      before: {
        damage: { "damage.synthetic": 0 },
        health: 1000,
      },
      after: {
        damage: { "damage.synthetic": 0 },
        health: 1000,
      },
    });
  });

  it("exposes sequential-hit aggregation through its dedicated context", async () => {
    const loaded = await loadRuleset();
    const result = loaded.executeSequentialHitAggregateRule("rule.multishot.aggregate-fixed-hits", {
      initialHealth: 250,
      hits: [
        {
          id: "hit.multishot-0",
          index: 0,
          damage: { "damage.synthetic": 100 },
          healthBefore: 250,
          healthAfter: 150,
        },
        {
          id: "hit.multishot-1",
          index: 1,
          damage: { "damage.synthetic": 100 },
          healthBefore: 150,
          healthAfter: 50,
        },
      ],
    });

    expect(result.after).toEqual({
      damage: { "damage.synthetic": 200 },
      damageTotal: 200,
      health: 50,
    });
  });

  it("exposes sequential-pellet aggregation through its dedicated context", async () => {
    const loaded = await loadRuleset();
    const result = loaded.executeSequentialPelletAggregateRule("rule.pellet.aggregate-fixed-hits", {
      initialHealth: 250,
      hits: [
        {
          id: "pellet.shot-0",
          index: 0,
          damage: { "damage.synthetic": 100 },
          healthBefore: 250,
          healthAfter: 150,
        },
        {
          id: "pellet.shot-1",
          index: 1,
          damage: { "damage.synthetic": 100 },
          healthBefore: 150,
          healthAfter: 50,
        },
      ],
    });

    expect(result.after).toEqual({
      damage: { "damage.synthetic": 200 },
      damageTotal: 200,
      health: 50,
    });
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
        rule.id === "rule.critical.resolve-tier-roll"
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

    const aggregateDeclarationMismatch = await attachArtifactContentHash({
      ...withoutHash,
      rules: coreRuleset.rules.map((rule) =>
        rule.id === "rule.critical.aggregate-expected-branches"
          ? {
              ...rule,
              writes: ["event.damage"],
            }
          : rule,
      ),
    });

    await expect(loadRuleset(aggregateDeclarationMismatch)).rejects.toThrowError(
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
