import { loadCatalogSnapshot } from "@voidtrace/catalog";
import {
  attachArtifactContentHash,
  canonicalizeJson,
  verifyArtifactContentHash,
  verifyResultTraceIntegrity,
} from "@voidtrace/contracts";
import { loadCoreRuleset } from "@voidtrace/rules";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import tier2CatalogFixture from "../../../data/fixtures/catalog-mini/catalog-tier-2.json" with {
  type: "json",
};
import expectedFixture from "../../../data/fixtures/golden/direct-critical-armor.expected.json" with {
  type: "json",
};
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import expectedExpectedFixture from "../../../data/fixtures/golden/expected-critical-armor.expected.json" with {
  type: "json",
};
import expectedScenarioFixture from "../../../data/fixtures/golden/expected-critical-armor.scenario.json" with {
  type: "json",
};
import multishotExpectedFixture from "../../../data/fixtures/golden/multishot-critical-armor.expected.json" with {
  type: "json",
};
import multishotScenarioFixture from "../../../data/fixtures/golden/multishot-critical-armor.scenario.json" with {
  type: "json",
};
import probabilityExpectedFixture from "../../../data/fixtures/golden/probability-critical-armor.expected.json" with {
  type: "json",
};
import probabilityScenarioFixture from "../../../data/fixtures/golden/probability-critical-armor.scenario.json" with {
  type: "json",
};
import tier2ExpectedFixture from "../../../data/fixtures/golden/tier-2-critical-armor.expected.json" with {
  type: "json",
};
import tier2ScenarioFixture from "../../../data/fixtures/golden/tier-2-critical-armor.scenario.json" with {
  type: "json",
};
import { evaluateScenario } from "./evaluate.ts";
import { SUPPORTED_METRIC_IDS } from "./scenario-domain.ts";
import { replayTraceDamage, replayTraceState, type TraceReplayError } from "./trace-replay.ts";

async function evaluateGolden() {
  return evaluateScenario({
    scenario: structuredClone(scenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateProbabilityGolden() {
  return evaluateScenario({
    scenario: structuredClone(probabilityScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateTier2Golden() {
  return evaluateScenario({
    scenario: structuredClone(tier2ScenarioFixture),
    catalog: structuredClone(tier2CatalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateExpectedGolden() {
  return evaluateScenario({
    scenario: structuredClone(expectedScenarioFixture),
    catalog: structuredClone(tier2CatalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateMultishotGolden() {
  return evaluateScenario({
    scenario: structuredClone(multishotScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function rehash<T extends { contentHash: string }>(
  value: T,
): Promise<Omit<T, "contentHash"> & { readonly contentHash: string }> {
  const { contentHash: _contentHash, ...withoutHash } = value;
  return attachArtifactContentHash(withoutHash);
}

describe("evaluateScenario", () => {
  it("matches the independently authored golden Result and Trace expectations", async () => {
    const outcome = await evaluateGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }

    for (const [metricId, expected] of Object.entries(expectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(expectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(expectedFixture.damageByType);
    expect(outcome.result.coverage).toEqual({
      verified: [],
      experimental: [
        "mechanic.critical.tier-multiplier",
        "mechanic.damage.direct-hit",
        "mechanic.damage.health-commit",
        "mechanic.defense.standard-armor",
      ],
      disputed: [],
      unsupported: ["mechanic.critical.probability"],
      approximated: [],
    });

    const appliedRuleIds = outcome.trace.decisions
      .filter((decision) => decision.outcome === "applied")
      .map((decision) => decision.ruleId);
    const rejectedRules = outcome.trace.decisions
      .filter((decision) => decision.outcome === "rejected")
      .map((decision) => ({
        ruleId: decision.ruleId,
        stage: decision.rejectionStage,
        code: decision.rejectionReason.code,
      }));
    expect(appliedRuleIds).toEqual(expectedFixture.appliedRuleIds);
    expect(rejectedRules).toEqual(expectedFixture.rejectedRules);
    expect(outcome.trace.decisions.map((decision) => decision.sequence)).toEqual([0, 1, 2, 3]);
    expect(outcome.trace.decisions.every((decision) => decision.eventTimeMs === 0)).toBe(true);

    expect(await replayTraceDamage(outcome.trace)).toEqual(outcome.result.damageByType);
    expect(await replayTraceState(outcome.trace, 1_000)).toEqual({
      damage: outcome.result.damageByType,
      health: 900,
    });
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(await verifyResultTraceIntegrity(outcome.result, outcome.trace, scenarioFixture)).toBe(
      true,
    );
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.metrics)).toBe(true);
    expect(Object.isFrozen(outcome.trace.decisions)).toBe(true);
  });

  it("matches the independently authored explicit-roll Critical golden", async () => {
    const outcome = await evaluateProbabilityGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }

    for (const [metricId, expected] of Object.entries(probabilityExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(probabilityExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(probabilityExpectedFixture.damageByType);
    expect(outcome.result.coverage).toEqual({
      verified: [],
      experimental: [
        "mechanic.critical.probability",
        "mechanic.critical.tier-multiplier",
        "mechanic.damage.direct-hit",
        "mechanic.damage.health-commit",
        "mechanic.defense.standard-armor",
      ],
      disputed: [],
      unsupported: [],
      approximated: [],
    });

    const appliedRuleIds = outcome.trace.decisions
      .filter((decision) => decision.outcome === "applied")
      .map((decision) => decision.ruleId);
    const rejectedRules = outcome.trace.decisions
      .filter((decision) => decision.outcome === "rejected")
      .map((decision) => ({
        ruleId: decision.ruleId,
        stage: decision.rejectionStage,
        code: decision.rejectionReason.code,
      }));
    expect(appliedRuleIds).toEqual(probabilityExpectedFixture.appliedRuleIds);
    expect(rejectedRules).toEqual(probabilityExpectedFixture.rejectedRules);
    expect(outcome.trace.decisions.map((decision) => decision.sequence)).toEqual([0, 1, 2, 3, 4]);
    expect(outcome.trace.decisions[1]).toMatchObject({
      outcome: "applied",
      phase: "critical.roll",
      ruleId: "rule.critical.resolve-tier-roll",
      reads: {
        "attack.critical-chance": 0.25,
        "event.critical-roll": 0.2,
      },
      operations: [
        {
          kind: "critical-tier.resolve-tier-roll",
          parameters: {
            criticalChance: 0.25,
            criticalRoll: 0.2,
            baseTier: 0,
            nextTier: 1,
            fraction: 0.25,
            baseTierProbability: 0.75,
            nextTierProbability: 0.25,
            tier0Probability: 0.75,
            tier1Probability: 0.25,
            resolvedTier: 1,
            factor: 1,
          },
        },
      ],
    });

    expect(await replayTraceDamage(outcome.trace)).toEqual(outcome.result.damageByType);
    expect(await replayTraceState(outcome.trace, 1_000)).toEqual({
      damage: outcome.result.damageByType,
      health: 900,
    });
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, probabilityScenarioFixture),
    ).toBe(true);
  });

  it("matches the independently authored tier-2 explicit-roll Critical golden", async () => {
    const outcome = await evaluateTier2Golden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }

    for (const [metricId, expected] of Object.entries(tier2ExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(tier2ExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(tier2ExpectedFixture.damageByType);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(tier2ExpectedFixture.appliedRuleIds);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "rejected")
        .map((decision) => ({
          ruleId: decision.ruleId,
          stage: decision.rejectionStage,
          code: decision.rejectionReason.code,
        })),
    ).toEqual(tier2ExpectedFixture.rejectedRules);
    expect(outcome.result.coverage).toEqual({
      verified: [],
      experimental: [
        "mechanic.critical.probability",
        "mechanic.critical.tier-multiplier",
        "mechanic.damage.direct-hit",
        "mechanic.damage.health-commit",
        "mechanic.defense.standard-armor",
      ],
      disputed: [],
      unsupported: [],
      approximated: [],
    });
    expect(outcome.trace.decisions[1]).toMatchObject({
      outcome: "applied",
      phase: "critical.roll",
      ruleId: "rule.critical.resolve-tier-roll",
      reads: {
        "attack.critical-chance": 1.25,
        "event.critical-roll": 0.2,
      },
      operations: [
        {
          kind: "critical-tier.resolve-tier-roll",
          parameters: {
            criticalChance: 1.25,
            criticalRoll: 0.2,
            baseTier: 1,
            nextTier: 2,
            fraction: 0.25,
            baseTierProbability: 0.75,
            nextTierProbability: 0.25,
            tier0Probability: 0,
            tier1Probability: 0.75,
            resolvedTier: 2,
            factor: 1,
          },
        },
      ],
      before: {
        "damage.total": 100,
        "target.health": 1000,
      },
      after: {
        "damage.total": 100,
        "target.health": 1000,
      },
    });
    expect(outcome.trace.decisions[2]).toMatchObject({
      outcome: "applied",
      phase: "critical.resolve",
      ruleId: "rule.critical.scale-tier",
      reads: {
        "attack.critical-multiplier": 2,
        "event.critical-tier": 2,
        "event.damage": 100,
      },
      operations: [
        {
          kind: "damage-vector.scale-critical-tier",
          parameters: {
            actualTier: 2,
            criticalMultiplier: 2,
            factor: 3,
          },
        },
      ],
      before: {
        "damage.total": 100,
        "target.health": 1000,
      },
      after: {
        "damage.total": 300,
        "target.health": 1000,
      },
    });
    expect(await replayTraceDamage(outcome.trace)).toEqual(outcome.result.damageByType);
    expect(await replayTraceState(outcome.trace, 1_000)).toEqual({
      damage: outcome.result.damageByType,
      health: 850,
    });
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, tier2ScenarioFixture),
    ).toBe(true);
  });

  it("matches terminal-branch expected Critical golden semantics including Health clamp", async () => {
    const outcome = await evaluateExpectedGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }

    for (const [metricId, expected] of Object.entries(expectedExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(expectedExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(expectedExpectedFixture.damageByType);
    expect(outcome.result.metrics).not.toHaveProperty("critical.roll");
    expect(outcome.result.metrics).not.toHaveProperty("critical.tier");
    expect(outcome.result.metrics).not.toHaveProperty("critical.multiplier");
    expect(outcome.result.metrics).not.toHaveProperty("target.health.remaining");
    expect(outcome.result.coverage).toEqual({
      verified: [],
      experimental: [
        "mechanic.critical.expected-value",
        "mechanic.critical.tier-multiplier",
        "mechanic.damage.direct-hit",
        "mechanic.damage.health-commit",
        "mechanic.defense.standard-armor",
      ],
      disputed: [],
      unsupported: [],
      approximated: [],
    });

    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(expectedExpectedFixture.appliedRuleIds);
    expect(outcome.trace.decisions.map((decision) => decision.sequence)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(outcome.trace.decisions[0]).toMatchObject({
      phase: "critical.expected",
      ruleId: "rule.critical.resolve-expected-branches",
      reads: {
        "attack.critical-chance": 1.25,
      },
      operations: [
        {
          kind: "critical-tier.resolve-expected-branches",
          parameters: {
            baseTier: 1,
            nextTier: 2,
            baseTierProbability: 0.75,
            nextTierProbability: 0.25,
          },
        },
      ],
    });
    expect(outcome.trace.decisions[4]).toMatchObject({
      ruleId: "rule.damage.commit-health",
      operations: [
        {
          parameters: {
            "branch.id": "branch.critical-tier-1",
            "branch.weight": 0.75,
            healthAfter: 25,
          },
        },
      ],
    });
    expect(outcome.trace.decisions[8]).toMatchObject({
      ruleId: "rule.damage.commit-health",
      operations: [
        {
          parameters: {
            "branch.id": "branch.critical-tier-2",
            "branch.weight": 0.25,
            healthAfter: 0,
          },
        },
      ],
    });
    expect(outcome.trace.decisions[9]).toMatchObject({
      phase: "result.aggregate",
      ruleId: "rule.critical.aggregate-expected-branches",
      reads: {
        "branch.damage": canonicalizeJson([
          {
            id: "branch.critical-tier-1",
            damage: { "damage.synthetic-kinetic": 100 },
          },
          {
            id: "branch.critical-tier-2",
            damage: { "damage.synthetic-kinetic": 150 },
          },
        ]),
        "branch.health": canonicalizeJson([
          { id: "branch.critical-tier-1", health: 25 },
          { id: "branch.critical-tier-2", health: 0 },
        ]),
        "branch.weight": canonicalizeJson([
          { id: "branch.critical-tier-1", tier: 1, weight: 0.75 },
          { id: "branch.critical-tier-2", tier: 2, weight: 0.25 },
        ]),
      },
      operations: [
        {
          parameters: {
            "branch.0.damageTotal": 100,
            "branch.0.health": 25,
            "branch.0.damage.damage.synthetic-kinetic": 100,
            "branch.1.damageTotal": 150,
            "branch.1.health": 0,
            "branch.1.damage.damage.synthetic-kinetic": 150,
          },
        },
      ],
      after: {
        "damage.total": 112.5,
        "target.health": 18.75,
      },
    });
    expect(outcome.result.metrics["target.health.expected-remaining"]).toBe(18.75);
    expect(125 - (outcome.result.metrics["damage.expected.health.total"] as number)).toBe(12.5);

    expect(await replayTraceDamage(outcome.trace)).toEqual(outcome.result.damageByType);
    expect(await replayTraceState(outcome.trace, 125)).toEqual({
      damage: outcome.result.damageByType,
      health: 18.75,
    });
    await expect(replayTraceState(outcome.trace, 126)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, expectedScenarioFixture),
    ).toBe(true);
  });

  it("matches the independently authored fixed Multishot golden and sequential Trace", async () => {
    const outcome = await evaluateMultishotGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(multishotExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(multishotExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(multishotExpectedFixture.damageByType);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(multishotExpectedFixture.appliedRuleIds);
    expect(outcome.trace.decisions).toHaveLength(14);
    expect(outcome.trace.decisions[0]).toMatchObject({
      phase: "attack.emit",
      ruleId: "rule.multishot.emit-fixed-hits",
      reads: {
        "action.multishot-hit-count": 3,
      },
      operations: [
        {
          kind: "event.expand-fixed-multishot",
          parameters: {
            hitCount: 3,
            maximumHits: 64,
          },
        },
      ],
    });
    expect(
      outcome.trace.decisions.flatMap((decision) =>
        decision.outcome === "applied" && decision.ruleId === "rule.damage.commit-health"
          ? [decision.after["target.health"]]
          : [],
      ),
    ).toEqual([150, 50, 0]);
    expect(outcome.trace.decisions.at(-1)).toMatchObject({
      phase: "result.aggregate",
      ruleId: "rule.multishot.aggregate-fixed-hits",
      after: {
        "damage.total": 300,
        "target.health": 0,
      },
    });
    expect(await replayTraceState(outcome.trace, 250)).toEqual({
      damage: multishotExpectedFixture.damageByType,
      health: 0,
    });
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, multishotScenarioFixture),
    ).toBe(true);
  });

  it("property-tests fixed Multishot expansion count, order, aggregation, and Health clamp", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 16 }),
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 2_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        async (hitCount, criticalTier, armor, health) => {
          const changed = structuredClone(multishotScenarioFixture);
          const action = changed.actionPlan[0];
          const target = changed.targets[0];
          if (action === undefined || target === undefined) {
            throw new Error("Multishot golden must contain one action and target");
          }
          action.parameters.hitCount = hitCount;
          action.parameters.criticalTier = criticalTier;
          target.configuration.resolvedArmor = armor;
          target.configuration.resolvedHealth = health;
          const scenario = await rehash(changed);
          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }

          const perHit = 100 * (1 + criticalTier) * (300 / (armor + 300));
          let remainingHealth = health;
          for (let index = 0; index < hitCount; index += 1) {
            remainingHealth = perHit >= remainingHealth ? 0 : remainingHealth - perHit;
          }
          expect(first.result.metrics["multishot.hit-count"]).toBe(hitCount);
          expect(first.result.metrics["damage.multishot.total"]).toBeCloseTo(perHit * hitCount, 6);
          expect(first.result.metrics["target.health.remaining"]).toBeCloseTo(remainingHealth, 6);
          expect(
            first.trace.decisions.filter(
              (decision) => decision.ruleId === "rule.damage.commit-health",
            ),
          ).toHaveLength(hitCount);
          expect(await replayTraceState(first.trace, health)).toEqual({
            damage: first.result.damageByType,
            health: first.result.metrics["target.health.remaining"],
          });
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
        },
      ),
      { numRuns: 50 },
    );
  });

  it("is canonically deterministic for identical Scenario, Catalog, Ruleset, and seed", async () => {
    const first = await evaluateGolden();
    const second = await evaluateGolden();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
  });

  it("resolves adjacent Critical-tier probabilities and threshold rolls deterministically", async () => {
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.integer({ min: 0, max: 999_999 }),
        async (chanceNumerator, rollNumerator) => {
          const criticalChance = chanceNumerator / 1_000_000;
          const criticalRoll = rollNumerator / 1_000_000;
          const changedCatalog = structuredClone(catalogFixture);
          const attackMode = changedCatalog.weapons[0]?.attackModes[0];
          if (attackMode === undefined) {
            throw new Error("Mini Catalog must contain an attack mode");
          }
          attackMode.criticalChance = criticalChance;
          const catalogArtifact = await rehash(changedCatalog);
          const catalog = await loadCatalogSnapshot(catalogArtifact);

          const changedScenario = structuredClone(probabilityScenarioFixture);
          const action = changedScenario.actionPlan[0];
          if (action === undefined) {
            throw new Error("Probability Scenario must contain an action");
          }
          action.parameters.criticalRoll = criticalRoll;
          changedScenario.catalogRef.contentHash = catalog.snapshot.contentHash;
          const scenario = await rehash(changedScenario);

          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }

          const baseTier = Math.floor(criticalChance);
          const fraction = criticalChance - baseTier;
          const nextTier = fraction === 0 ? baseTier : baseTier + 1;
          const baseProbability = first.result.metrics["critical.base-tier.probability"];
          const nextProbability = first.result.metrics["critical.next-tier.probability"];
          expect(first.result.metrics["critical.base-tier"]).toBe(baseTier);
          expect(first.result.metrics["critical.next-tier"]).toBe(nextTier);
          expect(first.result.metrics["critical.fraction"]).toBeCloseTo(fraction, 15);
          expect(baseProbability).toBeCloseTo(1 - fraction, 15);
          expect(nextProbability).toBeCloseTo(fraction, 15);
          expect((baseProbability as number) + (nextProbability as number)).toBeCloseTo(1, 15);
          expect(first.result.metrics["critical.tier"]).toBe(
            criticalRoll < fraction ? nextTier : baseTier,
          );
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
          expect(await replayTraceDamage(first.trace)).toEqual(first.result.damageByType);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("property-tests independent terminal-branch expected values and clamp ordering", async () => {
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1_000_000, max: 4_000_000 }),
        fc.integer({ min: 0, max: 1_000 }),
        fc.integer({ min: 0, max: 1_000 }),
        async (chanceNumerator, multiplierNumerator, armor, health) => {
          const criticalChance = chanceNumerator / 1_000_000;
          const criticalMultiplier = multiplierNumerator / 1_000_000;
          const changedCatalog = structuredClone(tier2CatalogFixture);
          const attackMode = changedCatalog.weapons[0]?.attackModes[0];
          if (attackMode === undefined) {
            throw new Error("Tier-2 Catalog must contain an attack mode");
          }
          attackMode.criticalChance = criticalChance;
          attackMode.criticalMultiplier = criticalMultiplier;
          const catalogArtifact = await rehash(changedCatalog);
          const catalog = await loadCatalogSnapshot(catalogArtifact);

          const changedScenario = structuredClone(expectedScenarioFixture);
          const target = changedScenario.targets[0];
          if (target === undefined) {
            throw new Error("Expected Scenario must contain a target");
          }
          target.configuration.resolvedArmor = armor;
          target.configuration.resolvedHealth = health;
          changedScenario.catalogRef.contentHash = catalog.snapshot.contentHash;
          const scenario = await rehash(changedScenario);

          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }

          const baseTier = Math.floor(criticalChance);
          const fraction = criticalChance - baseTier;
          const nextTier = fraction === 0 ? baseTier : baseTier + 1;
          const baseWeight = 1 - fraction;
          const nextWeight = fraction;
          const armorFactor = 300 / (armor + 300);
          const branchDamage = (tier: number) =>
            100 * (1 + tier * (criticalMultiplier - 1)) * armorFactor;
          const baseDamage = branchDamage(baseTier);
          const nextDamage = branchDamage(nextTier);
          const expectedDamage = baseWeight * baseDamage + nextWeight * nextDamage;
          const expectedHealth =
            baseWeight * Math.max(0, health - baseDamage) +
            nextWeight * Math.max(0, health - nextDamage);
          const expectedMultiplier =
            baseWeight * (1 + baseTier * (criticalMultiplier - 1)) +
            nextWeight * (1 + nextTier * (criticalMultiplier - 1));

          expect(first.result.metrics["critical.expected.multiplier"]).toBeCloseTo(
            expectedMultiplier,
            10,
          );
          expect(first.result.metrics["damage.expected.health.total"]).toBeCloseTo(
            expectedDamage,
            10,
          );
          expect(first.result.metrics["target.health.expected-remaining"]).toBeCloseTo(
            expectedHealth,
            10,
          );
          expect(first.result.damageByType["damage.synthetic-kinetic"]).toBeCloseTo(
            expectedDamage,
            10,
          );
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
          expect(await replayTraceDamage(first.trace)).toEqual(first.result.damageByType);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rebuilds executable handles from snapshots instead of invoking caller closures", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();
    let forgedCatalogClosureCalled = false;
    let forgedRulesetClosureCalled = false;

    const outcome = await evaluateScenario({
      scenario: structuredClone(scenarioFixture),
      catalog: {
        ...catalog,
        resolveReferences: () => {
          forgedCatalogClosureCalled = true;
          throw new Error("forged Catalog closure must not execute");
        },
      },
      ruleset: {
        ...ruleset,
        executeRule: () => {
          forgedRulesetClosureCalled = true;
          throw new Error("forged Ruleset closure must not execute");
        },
      },
    });

    expect(outcome.ok).toBe(true);
    expect(forgedCatalogClosureCalled).toBe(false);
    expect(forgedRulesetClosureCalled).toBe(false);
  });

  it("property-tests deterministic replay, Trace reconstruction, and rejection reasons", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();
    const fixedMetricIds = SUPPORTED_METRIC_IDS.filter(
      (metric) =>
        metric !== "critical.roll" &&
        metric !== "critical.base-tier" &&
        metric !== "critical.next-tier" &&
        metric !== "critical.fraction" &&
        metric !== "critical.base-tier.probability" &&
        metric !== "critical.next-tier.probability" &&
        metric !== "critical.tier-0.probability" &&
        metric !== "critical.tier-1.probability" &&
        metric !== "critical.expected.multiplier" &&
        metric !== "damage.expected.post-critical.total" &&
        metric !== "damage.expected.health.total" &&
        metric !== "target.health.expected-remaining" &&
        metric !== "multishot.hit-count" &&
        metric !== "damage.multishot.total",
    );
    const metricSubset = fc.uniqueArray(fc.constantFrom(...fixedMetricIds), {
      minLength: 1,
      maxLength: fixedMetricIds.length,
    });

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        metricSubset,
        async (criticalTier, armor, health, metrics) => {
          const changedScenario = structuredClone(scenarioFixture);
          const action = changedScenario.actionPlan[0];
          const target = changedScenario.targets[0];
          if (action === undefined || target === undefined) {
            throw new Error("Golden Scenario must contain one action and target");
          }
          action.parameters.criticalTier = criticalTier;
          target.configuration.resolvedArmor = armor;
          target.configuration.resolvedHealth = health;
          changedScenario.metrics = metrics;
          const scenario = await rehash(changedScenario);

          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }

          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
          expect(await replayTraceDamage(first.trace)).toEqual(first.result.damageByType);
          const rejected = first.trace.decisions.filter(
            (decision) => decision.outcome === "rejected",
          );
          expect(rejected).toEqual([]);
          expect(first.trace.decisions).toHaveLength(4);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("returns the Scenario preflight rejection without partial artifacts", async () => {
    const unsupported = structuredClone(scenarioFixture);
    const action = unsupported.actionPlan[0];
    if (action === undefined) {
      throw new Error("Golden Scenario must contain an action");
    }
    action.parameters.hitLocation = "hit-location.head";
    const changed = await rehash(unsupported);
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    const outcome = await evaluateScenario({
      scenario: changed,
      catalog,
      ruleset,
    });

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "scenario-invalid",
        causeCode: "unsupported-hit-location",
        path: "/actionPlan/0/parameters/hitLocation",
        mechanicId: "mechanic.hit-location",
        message: "Unsupported hit location: hit-location.head",
      },
    });
    expect("result" in outcome).toBe(false);
    expect("trace" in outcome).toBe(false);
  });

  it("rejects a valid but different CatalogSnapshot reference", async () => {
    const changedScenario = structuredClone(scenarioFixture);
    changedScenario.catalogRef.contentHash = `sha256:${"0".repeat(64)}`;
    const scenario = await rehash(changedScenario);
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    const outcome = await evaluateScenario({ scenario, catalog, ruleset });

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        code: "catalog-reference-mismatch",
        path: "/catalogRef",
      },
    });
  });

  it("rejects a referenced non-hitscan delivery explicitly", async () => {
    const changedCatalog = structuredClone(catalogFixture);
    const attackMode = changedCatalog.weapons[0]?.attackModes[0];
    if (attackMode === undefined) {
      throw new Error("Mini Catalog must contain an attack mode");
    }
    attackMode.delivery = "projectile";
    const catalogArtifact = await rehash(changedCatalog);
    const catalog = await loadCatalogSnapshot(catalogArtifact);

    const changedScenario = structuredClone(scenarioFixture);
    changedScenario.catalogRef.contentHash = catalog.snapshot.contentHash;
    const scenario = await rehash(changedScenario);
    const ruleset = await loadCoreRuleset();

    const outcome = await evaluateScenario({ scenario, catalog, ruleset });

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        code: "unsupported-delivery",
        mechanicId: "mechanic.delivery.projectile",
      },
    });
  });

  it("rejects Critical chance with unrepresentable tiers without partial artifacts", async () => {
    const changedCatalog = structuredClone(catalogFixture);
    const selectedWeapon = changedCatalog.weapons[0];
    if (selectedWeapon === undefined) {
      throw new Error("Mini Catalog must contain a weapon");
    }
    const decoyWeapon = structuredClone(selectedWeapon);
    decoyWeapon.id = "weapon.synthetic-decoy";
    for (const [index, attackMode] of decoyWeapon.attackModes.entries()) {
      attackMode.id = `attack-mode.synthetic-decoy.${index}`;
    }
    changedCatalog.weapons.unshift(decoyWeapon);
    const attackMode = changedCatalog.weapons[1]?.attackModes[0];
    if (attackMode === undefined) {
      throw new Error("Mini Catalog must contain an attack mode");
    }
    attackMode.criticalChance = Number.MAX_SAFE_INTEGER + 1;
    const catalogArtifact = await rehash(changedCatalog);
    const catalog = await loadCatalogSnapshot(catalogArtifact);

    const changedScenario = structuredClone(probabilityScenarioFixture);
    changedScenario.catalogRef.contentHash = catalog.snapshot.contentHash;
    const scenario = await rehash(changedScenario);
    const ruleset = await loadCoreRuleset();

    const outcome = await evaluateScenario({ scenario, catalog, ruleset });

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "unsupported-critical-chance",
        message:
          "Critical distribution resolution requires safely representable tiers; received criticalChance 9007199254740992",
        path: "/weapons/1/attackModes/0/criticalChance",
        mechanicId: "mechanic.critical.probability",
      },
    });
    expect("result" in outcome).toBe(false);
    expect("trace" in outcome).toBe(false);
  });

  it("rejects an unrepresentable Critical tier multiplier without partial artifacts", async () => {
    const changedCatalog = structuredClone(catalogFixture);
    const attackMode = changedCatalog.weapons[0]?.attackModes[0];
    if (attackMode === undefined) {
      throw new Error("Mini Catalog must contain an attack mode");
    }
    attackMode.criticalMultiplier = Number.MAX_VALUE;
    const catalogArtifact = await rehash(changedCatalog);
    const catalog = await loadCatalogSnapshot(catalogArtifact);

    const changedScenario = structuredClone(scenarioFixture);
    const action = changedScenario.actionPlan[0];
    if (action === undefined) {
      throw new Error("Golden Scenario must contain an action");
    }
    action.parameters.criticalTier = 2;
    changedScenario.catalogRef.contentHash = catalog.snapshot.contentHash;
    const scenario = await rehash(changedScenario);
    const ruleset = await loadCoreRuleset();

    const outcome = await evaluateScenario({ scenario, catalog, ruleset });

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "unsupported-critical-multiplier",
        message:
          "Critical tier multiplier is not finitely representable for tier 2 and criticalMultiplier 1.7976931348623157e+308",
        path: "/weapons/0/attackModes/0/criticalMultiplier",
        mechanicId: "mechanic.critical.tier-multiplier",
      },
    });
    expect("result" in outcome).toBe(false);
    expect("trace" in outcome).toBe(false);
  });
});

describe("replayTraceDamage", () => {
  it("binds branch operation metadata to aggregate topology", async () => {
    const outcome = await evaluateExpectedGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changedWithStaleHash = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) => {
        if (decision.outcome !== "applied") {
          return decision;
        }
        const isAggregate = decision.operations.some(
          (operation) => operation.kind === "damage-vector.aggregate-weighted-branches",
        );
        return {
          ...decision,
          reads: isAggregate
            ? {
                ...decision.reads,
                "branch.weight": canonicalizeJson([
                  { id: "branch.critical-tier-1", tier: 1, weight: 0.75 },
                  { id: "branch.critical-tier-2", tier: 20, weight: 0.25 },
                ]),
              }
            : decision.reads,
          operations: decision.operations.map((operation) => ({
            ...operation,
            parameters:
              operation.kind === "damage-vector.aggregate-weighted-branches"
                ? { ...operation.parameters, "branch.1.tier": 20 }
                : operation.parameters["branch.id"] === "branch.critical-tier-2"
                  ? { ...operation.parameters, "branch.tier": 10 }
                  : operation.parameters,
          })),
        };
      }),
    };
    const changed = await rehash(changedWithStaleHash);

    await expect(replayTraceState(changed, 125)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
  });

  it("rejects aggregate reads that do not describe terminal branches", async () => {
    const outcome = await evaluateExpectedGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changedWithStaleHash = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) =>
        decision.outcome === "applied" &&
        decision.operations.some(
          (operation) => operation.kind === "damage-vector.aggregate-weighted-branches",
        )
          ? {
              ...decision,
              reads: {
                ...decision.reads,
                "branch.damage": "[]",
              },
            }
          : decision,
      ),
    };
    const changed = await rehash(changedWithStaleHash);

    await expect(replayTraceState(changed, 125)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
  });

  it("rejects forged expected Health aggregation against the Scenario anchor", async () => {
    const outcome = await evaluateExpectedGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changedWithStaleHash = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) =>
        decision.outcome === "applied" &&
        decision.operations.some(
          (operation) => operation.kind === "damage-vector.aggregate-weighted-branches",
        )
          ? {
              ...decision,
              operations: decision.operations.map((operation) =>
                operation.kind === "damage-vector.aggregate-weighted-branches"
                  ? {
                      ...operation,
                      parameters: {
                        ...operation.parameters,
                        expectedHealth: 999,
                      },
                    }
                  : operation,
              ),
              after: {
                ...decision.after,
                "target.health": 999,
              },
            }
          : decision,
      ),
    };
    const changed = await rehash(changedWithStaleHash);

    await expect(replayTraceState(changed, 125)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
  });

  it("rejects duplicate expected aggregate branch identities", async () => {
    const outcome = await evaluateExpectedGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changedWithStaleHash = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) =>
        decision.outcome === "applied" &&
        decision.operations.some(
          (operation) => operation.kind === "damage-vector.aggregate-weighted-branches",
        )
          ? {
              ...decision,
              operations: decision.operations.map((operation) =>
                operation.kind === "damage-vector.aggregate-weighted-branches"
                  ? {
                      ...operation,
                      parameters: {
                        ...operation.parameters,
                        "branch.1.id": operation.parameters["branch.0.id"],
                      },
                    }
                  : operation,
              ),
            }
          : decision,
      ),
    };
    const changed = await rehash(changedWithStaleHash);

    await expect(replayTraceDamage(changed)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
  });

  it("rejects expected aggregate branches with different Damage Vector keys", async () => {
    const outcome = await evaluateExpectedGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changedWithStaleHash = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) =>
        decision.outcome === "applied"
          ? {
              ...decision,
              operations: decision.operations.map((operation) => {
                if (
                  operation.kind !== "damage-vector.copy" ||
                  operation.parameters["branch.id"] !== "branch.critical-tier-2"
                ) {
                  return operation;
                }
                const { "component.damage.synthetic-kinetic": component, ...otherParameters } =
                  operation.parameters;
                return {
                  ...operation,
                  parameters: {
                    ...otherParameters,
                    "component.damage.synthetic-other": component,
                  },
                };
              }),
            }
          : decision,
      ),
    };
    const changed = await rehash(changedWithStaleHash);

    await expect(replayTraceDamage(changed)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
  });

  it("continues replaying the historical fixed-Critical scale operation", async () => {
    const outcome = await evaluateGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changedWithStaleHash = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) =>
        decision.outcome === "applied"
          ? {
              ...decision,
              operations: decision.operations.map((operation) =>
                operation.kind === "damage-vector.scale-critical-tier"
                  ? { ...operation, kind: "damage-vector.scale-fixed-critical" }
                  : operation,
              ),
            }
          : decision,
      ),
    };
    const changed = await rehash(changedWithStaleHash);

    expect(await replayTraceDamage(changed)).toEqual(outcome.result.damageByType);
  });

  it("rejects an operation outside the finite Trace replay vocabulary", async () => {
    const outcome = await evaluateGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    let changedOperation = false;
    const changedWithStaleHash = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) => {
        if (changedOperation || decision.outcome !== "applied") {
          return decision;
        }
        changedOperation = true;
        return {
          ...decision,
          operations: decision.operations.map((operation, index) =>
            index === 0 ? { ...operation, kind: "damage-vector.unknown" } : operation,
          ),
        };
      }),
    };
    if (!changedOperation) {
      throw new Error("Golden Trace must contain an applied decision");
    }
    const { contentHash: _contentHash, ...withoutHash } = changedWithStaleHash;
    const changed = await attachArtifactContentHash(withoutHash);

    await expect(replayTraceDamage(changed)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "unsupported-operation",
      }),
    );
  });

  it("rejects a stale Trace content hash before replay", async () => {
    const outcome = await evaluateGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changed = {
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision, index) =>
        index === 0 ? { ...decision, eventTimeMs: 1 } : decision,
      ),
    };

    await expect(replayTraceDamage(changed)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "content-hash-mismatch",
      }),
    );
  });
});
