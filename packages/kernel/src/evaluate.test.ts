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
import pelletExpectedFixture from "../../../data/fixtures/golden/pellet-critical-armor.expected.json" with {
  type: "json",
};
import pelletScenarioFixture from "../../../data/fixtures/golden/pellet-critical-armor.scenario.json" with {
  type: "json",
};
import probabilityExpectedFixture from "../../../data/fixtures/golden/probability-critical-armor.expected.json" with {
  type: "json",
};
import probabilityScenarioFixture from "../../../data/fixtures/golden/probability-critical-armor.scenario.json" with {
  type: "json",
};
import radialExpectedFixture from "../../../data/fixtures/golden/radial-critical-armor.expected.json" with {
  type: "json",
};
import radialScenarioFixture from "../../../data/fixtures/golden/radial-critical-armor.scenario.json" with {
  type: "json",
};
import punchThroughExpectedFixture from "../../../data/fixtures/golden/resolved-punch-through.expected.json" with {
  type: "json",
};
import punchThroughScenarioFixture from "../../../data/fixtures/golden/resolved-punch-through.scenario.json" with {
  type: "json",
};
import ricochetExpectedFixture from "../../../data/fixtures/golden/resolved-ricochet.expected.json" with {
  type: "json",
};
import ricochetScenarioFixture from "../../../data/fixtures/golden/resolved-ricochet.scenario.json" with {
  type: "json",
};
import chainExpectedFixture from "../../../data/fixtures/golden/resolved-chain.expected.json" with {
  type: "json",
};
import chainScenarioFixture from "../../../data/fixtures/golden/resolved-chain.scenario.json" with {
  type: "json",
};
import radialTargetsExpectedFixture from "../../../data/fixtures/golden/resolved-radial-targets.expected.json" with {
  type: "json",
};
import radialTargetsScenarioFixture from "../../../data/fixtures/golden/resolved-radial-targets.scenario.json" with {
  type: "json",
};
import pelletAllocationExpectedFixture from "../../../data/fixtures/golden/resolved-pellet-allocation.expected.json" with {
  type: "json",
};
import pelletAllocationScenarioFixture from "../../../data/fixtures/golden/resolved-pellet-allocation.scenario.json" with {
  type: "json",
};
import directRadialImpactExpectedFixture from "../../../data/fixtures/golden/resolved-direct-radial-impact.expected.json" with {
  type: "json",
};
import directRadialImpactScenarioFixture from "../../../data/fixtures/golden/resolved-direct-radial-impact.scenario.json" with {
  type: "json",
};
import statusExpectedFixture from "../../../data/fixtures/golden/resolved-status-ticks.expected.json" with {
  type: "json",
};
import statusScenarioFixture from "../../../data/fixtures/golden/resolved-status-ticks.scenario.json" with {
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
import {
  replayTraceDamage,
  replayTraceState,
  replayTraceTargetStates,
  type TraceReplayError,
} from "./trace-replay.ts";

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

async function evaluatePelletGolden() {
  return evaluateScenario({
    scenario: structuredClone(pelletScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateRadialGolden() {
  return evaluateScenario({
    scenario: structuredClone(radialScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateStatusGolden() {
  return evaluateScenario({
    scenario: structuredClone(statusScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluatePunchThroughGolden() {
  return evaluateScenario({
    scenario: structuredClone(punchThroughScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateRicochetGolden() {
  return evaluateScenario({
    scenario: structuredClone(ricochetScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateChainGolden() {
  return evaluateScenario({
    scenario: structuredClone(chainScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateRadialTargetsGolden() {
  return evaluateScenario({
    scenario: structuredClone(radialTargetsScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluatePelletAllocationGolden() {
  return evaluateScenario({
    scenario: structuredClone(pelletAllocationScenarioFixture),
    catalog: structuredClone(catalogFixture),
    productVersion: "0.0.0",
  });
}

async function evaluateDirectRadialImpactGolden() {
  return evaluateScenario({
    scenario: structuredClone(directRadialImpactScenarioFixture),
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

function requiredAt<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing ${label} at index ${index}`);
  }
  return value;
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

  it("matches the independently authored fixed pellet golden and sequential Trace", async () => {
    const outcome = await evaluatePelletGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(pelletExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(pelletExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(pelletExpectedFixture.damageByType);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(pelletExpectedFixture.appliedRuleIds);
    expect(outcome.trace.decisions).toHaveLength(18);
    expect(outcome.trace.decisions[0]).toMatchObject({
      phase: "attack.emit",
      ruleId: "rule.pellet.emit-fixed-hits",
      reads: {
        "action.pellet-count": 4,
      },
      operations: [
        {
          kind: "event.expand-fixed-pellets",
          parameters: {
            maximumPellets: 64,
            pelletCount: 4,
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
    ).toEqual([250, 150, 50, 0]);
    expect(outcome.trace.decisions.at(-1)).toMatchObject({
      phase: "result.aggregate",
      ruleId: "rule.pellet.aggregate-fixed-hits",
      operations: [{ kind: "damage-vector.aggregate-sequential-pellets" }],
      after: {
        "damage.total": 400,
        "target.health": 0,
      },
    });
    expect(await replayTraceState(outcome.trace, 350)).toEqual({
      damage: pelletExpectedFixture.damageByType,
      health: 0,
    });
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, pelletScenarioFixture),
    ).toBe(true);
  });

  it("property-tests fixed pellet expansion count, order, aggregation, and Health clamp", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 16 }),
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 2_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        async (pelletCount, criticalTier, armor, health) => {
          const changed = structuredClone(pelletScenarioFixture);
          const action = changed.actionPlan[0];
          const target = changed.targets[0];
          if (action === undefined || target === undefined) {
            throw new Error("Pellet golden must contain one action and target");
          }
          action.parameters.pelletCount = pelletCount;
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

          const perPellet = 100 * (1 + criticalTier) * (300 / (armor + 300));
          let remainingHealth = health;
          for (let index = 0; index < pelletCount; index += 1) {
            remainingHealth = perPellet >= remainingHealth ? 0 : remainingHealth - perPellet;
          }
          expect(first.result.metrics["pellet.count"]).toBe(pelletCount);
          expect(first.result.metrics["damage.pellet.total"]).toBeCloseTo(
            perPellet * pelletCount,
            6,
          );
          expect(first.result.metrics["target.health.remaining"]).toBeCloseTo(remainingHealth, 6);
          expect(
            first.trace.decisions.filter(
              (decision) => decision.ruleId === "rule.damage.commit-health",
            ),
          ).toHaveLength(pelletCount);
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

  it("matches the independently authored resolved Radial golden and ordered Trace", async () => {
    const outcome = await evaluateRadialGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(radialExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(radialExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(radialExpectedFixture.damageByType);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(radialExpectedFixture.appliedRuleIds);
    expect(outcome.trace.decisions).toHaveLength(5);
    expect(outcome.trace.decisions.map((decision) => decision.phase)).toEqual([
      "damage.construct",
      "critical.resolve",
      "damage.radial-falloff",
      "target.mitigate",
      "damage.commit",
    ]);
    expect(outcome.trace.decisions[2]).toMatchObject({
      ruleId: "rule.radial.apply-resolved-falloff",
      reads: {
        "event.damage": 200,
        "event.radial-falloff-multiplier": 0.75,
      },
      operations: [
        {
          kind: "damage-vector.scale-resolved-radial-falloff",
          parameters: {
            factor: 0.75,
            multiplier: 0.75,
          },
        },
      ],
      after: {
        "damage.total": 150,
        "target.health": 1000,
      },
    });
    expect(await replayTraceState(outcome.trace, 1000)).toEqual({
      damage: radialExpectedFixture.damageByType,
      health: 925,
    });
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, radialScenarioFixture),
    ).toBe(true);
  });

  it("property-tests resolved Radial falloff after Critical and before Armor", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 2_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        async (falloffNumerator, criticalTier, armor, health) => {
          const multiplier = falloffNumerator / 1_000_000;
          const changed = structuredClone(radialScenarioFixture);
          const action = changed.actionPlan[0];
          const target = changed.targets[0];
          if (action === undefined || target === undefined) {
            throw new Error("Radial golden must contain one action and target");
          }
          action.parameters.resolvedFalloffMultiplier = multiplier;
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

          const postCritical = 100 * (1 + criticalTier);
          const postFalloff = postCritical * multiplier;
          const finalDamage = postFalloff * (300 / (armor + 300));
          const remainingHealth = finalDamage >= health ? 0 : health - finalDamage;
          expect(first.result.metrics["damage.post-critical.total"]).toBeCloseTo(postCritical, 6);
          expect(first.result.metrics["radial.falloff.multiplier"]).toBe(multiplier);
          expect(first.result.metrics["damage.radial.total"]).toBeCloseTo(postFalloff, 6);
          expect(first.result.metrics["damage.health.total"]).toBeCloseTo(finalDamage, 6);
          expect(first.result.metrics["target.health.remaining"]).toBeCloseTo(remainingHealth, 6);
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

  it("matches the independently authored resolved punch-through golden and target order", async () => {
    const outcome = await evaluatePunchThroughGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(punchThroughExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(punchThroughExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(punchThroughExpectedFixture.damageByType);
    expect(outcome.result.targetStates).toEqual(punchThroughExpectedFixture.targetStates);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(punchThroughExpectedFixture.appliedRuleIds);
    expect(
      outcome.trace.decisions.flatMap((decision) =>
        decision.outcome === "applied" && decision.ruleId === "rule.damage.direct-hit"
          ? [decision.operations[0]?.parameters["target.id"]]
          : [],
      ),
    ).toEqual(punchThroughExpectedFixture.targetOrder);
    expect(outcome.trace.decisions.map((decision) => decision.sequence)).toEqual(
      Array.from({ length: 14 }, (_, index) => index),
    );
    expect(outcome.result.coverage.experimental).toContain("mechanic.punch-through.resolved-path");
    expect(
      await replayTraceTargetStates(outcome.trace, {
        "actor.target-a": 150,
        "actor.target-b": 80,
        "actor.target-c": 60,
      }),
    ).toEqual({
      damage: punchThroughExpectedFixture.damageByType,
      health: 60,
      healthByTarget: {
        "actor.target-a": 50,
        "actor.target-b": 0,
        "actor.target-c": 10,
      },
    });
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, punchThroughScenarioFixture),
    ).toBe(true);
  });

  it("rejects a resolved punch-through Trace whose target identity was altered", async () => {
    const outcome = await evaluatePunchThroughGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changed = await rehash({
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) =>
        decision.outcome === "applied" &&
        decision.ruleId === "rule.damage.direct-hit" &&
        decision.operations[0]?.parameters["path.index"] === 0
          ? {
              ...decision,
              operations: decision.operations.map((operation) => ({
                ...operation,
                parameters: {
                  ...operation.parameters,
                  "target.id": "actor.target-b",
                },
              })),
            }
          : decision,
      ),
    });

    await expect(
      replayTraceTargetStates(changed, {
        "actor.target-a": 150,
        "actor.target-b": 80,
        "actor.target-c": 60,
      }),
    ).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
  });

  it("property-tests resolved punch-through per-target mitigation, Health clamp, and replay", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();
    const targetState = fc.record({
      armor: fc.integer({ min: 0, max: 10_000 }),
      health: fc.integer({ min: 0, max: 10_000 }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(targetState, targetState, targetState),
        fc.integer({ min: 0, max: 8 }),
        async (states, criticalTier) => {
          const changed = structuredClone(punchThroughScenarioFixture);
          const action = changed.actionPlan[0];
          if (action === undefined) {
            throw new Error("Resolved punch-through golden must contain one action");
          }
          action.parameters.criticalTier = criticalTier;
          for (const [index, state] of states.entries()) {
            const target = changed.targets[index];
            if (target === undefined) {
              throw new Error("Resolved punch-through golden must contain three targets");
            }
            target.configuration.resolvedArmor = state.armor;
            target.configuration.resolvedHealth = state.health;
          }
          const scenario = await rehash(changed);
          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }

          const damageByTarget = states.map(
            ({ armor }) => 100 * (1 + criticalTier) * (300 / (armor + 300)),
          ) as [number, number, number];
          const remainingByTarget = states.map(({ health }, index) => {
            const damage = requiredAt(damageByTarget, index, "target damage");
            return damage >= health ? 0 : health - damage;
          }) as [number, number, number];
          const targetIds = punchThroughExpectedFixture.targetOrder;
          const expectedTargetStates = Object.fromEntries(
            targetIds.map((targetId, index) => [
              targetId,
              { health: requiredAt(remainingByTarget, index, "remaining target Health") },
            ]),
          );
          const initialHealthByTarget = Object.fromEntries(
            targetIds.map((targetId, index) => [
              targetId,
              requiredAt(states, index, "initial target state").health,
            ]),
          );
          expect(first.result.metrics["damage.punch-through.total"]).toBeCloseTo(
            damageByTarget.reduce((sum, damage) => sum + damage, 0),
            6,
          );
          expect(first.result.metrics["targets.health.remaining-total"]).toBeCloseTo(
            remainingByTarget.reduce((sum, health) => sum + health, 0),
            6,
          );
          expect(first.result.metrics["targets.defeated-count"]).toBe(
            remainingByTarget.filter((health) => health === 0).length,
          );
          for (const targetId of targetIds) {
            const expected = expectedTargetStates[targetId];
            if (expected === undefined) {
              throw new Error(`Missing expected target state for ${targetId}`);
            }
            const actual = first.result.targetStates[targetId]?.health;
            if (actual === undefined) {
              throw new Error(`Missing Result target state for ${targetId}`);
            }
            expect(actual).toBeCloseTo(expected.health, 6);
          }
          const replayed = await replayTraceTargetStates(first.trace, initialHealthByTarget);
          expect(replayed.damage).toEqual(first.result.damageByType);
          for (const targetId of targetIds) {
            const expected = expectedTargetStates[targetId];
            if (expected === undefined) {
              throw new Error(`Missing expected target state for ${targetId}`);
            }
            const actual = replayed.healthByTarget[targetId];
            if (actual === undefined) {
              throw new Error(`Missing replayed target state for ${targetId}`);
            }
            expect(actual).toBeCloseTo(expected.health, 6);
          }
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
        },
      ),
      { numRuns: 50 },
    );
  });

  it("matches the independently authored resolved ricochet golden and relation-defined order", async () => {
    const outcome = await evaluateRicochetGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(ricochetExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(ricochetExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(ricochetExpectedFixture.damageByType);
    expect(outcome.result.targetStates).toEqual(ricochetExpectedFixture.targetStates);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(ricochetExpectedFixture.appliedRuleIds);
    expect(
      outcome.trace.decisions.flatMap((decision) =>
        decision.outcome === "applied" && decision.ruleId === "rule.damage.direct-hit"
          ? [decision.operations[0]?.parameters["target.id"]]
          : [],
      ),
    ).toEqual(ricochetExpectedFixture.targetOrder);
    expect(outcome.result.coverage.experimental).toContain("mechanic.ricochet.resolved-path");
    expect(
      await replayTraceTargetStates(outcome.trace, {
        "actor.target-a": 250,
        "actor.target-b": 80,
        "actor.target-c": 100,
      }),
    ).toEqual({
      damage: ricochetExpectedFixture.damageByType,
      health: 125,
      healthByTarget: {
        "actor.target-c": 25,
        "actor.target-a": 100,
        "actor.target-b": 0,
      },
    });
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, ricochetScenarioFixture),
    ).toBe(true);
  });

  it("property-tests resolved ricochet target order independently from targets array order", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 8 }),
        fc.tuple(
          fc.integer({ min: 0, max: 5000 }),
          fc.integer({ min: 0, max: 5000 }),
          fc.integer({ min: 0, max: 5000 }),
        ),
        async (criticalTier, healthValues) => {
          const changed = structuredClone(ricochetScenarioFixture);
          const action = changed.actionPlan[0];
          if (action === undefined) {
            throw new Error("Resolved ricochet golden must contain one action");
          }
          action.parameters.criticalTier = criticalTier;
          for (const [index, health] of healthValues.entries()) {
            const target = changed.targets[index];
            if (target === undefined) {
              throw new Error("Resolved ricochet golden must contain three targets");
            }
            target.configuration.resolvedHealth = health;
          }
          const scenario = await rehash(changed);
          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }
          expect(
            first.trace.decisions.flatMap((decision) =>
              decision.outcome === "applied" && decision.ruleId === "rule.damage.direct-hit"
                ? [decision.operations[0]?.parameters["target.id"]]
                : [],
            ),
          ).toEqual(["actor.target-c", "actor.target-a", "actor.target-b"]);
          expect(first.result.metrics["ricochet.target-count"]).toBe(3);
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
        },
      ),
      { numRuns: 50 },
    );
  });

  it("matches the independently authored resolved chain golden and relation-defined order", async () => {
    const outcome = await evaluateChainGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(chainExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(chainExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(chainExpectedFixture.damageByType);
    expect(outcome.result.targetStates).toEqual(chainExpectedFixture.targetStates);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(chainExpectedFixture.appliedRuleIds);
    expect(
      outcome.trace.decisions.flatMap((decision) =>
        decision.outcome === "applied" && decision.ruleId === "rule.damage.direct-hit"
          ? [decision.operations[0]?.parameters["target.id"]]
          : [],
      ),
    ).toEqual(chainExpectedFixture.targetOrder);
    expect(outcome.result.coverage.experimental).toContain("mechanic.chain.resolved-path");
    expect(
      await replayTraceTargetStates(outcome.trace, {
        "actor.target-a": 120,
        "actor.target-b": 60,
        "actor.target-c": 90,
      }),
    ).toEqual({
      damage: chainExpectedFixture.damageByType,
      health: 135,
      healthByTarget: {
        "actor.target-a": 70,
        "actor.target-c": 65,
        "actor.target-b": 0,
      },
    });
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, chainScenarioFixture),
    ).toBe(true);
  });

  it("property-tests deterministic resolved chain path order", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 8 }), async (criticalTier) => {
        const changed = structuredClone(chainScenarioFixture);
        const action = changed.actionPlan[0];
        if (action === undefined) {
          throw new Error("Resolved chain golden must contain one action");
        }
        action.parameters.criticalTier = criticalTier;
        const scenario = await rehash(changed);
        const first = await evaluateScenario({ scenario, catalog, ruleset });
        const second = await evaluateScenario({ scenario, catalog, ruleset });
        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        if (!first.ok || !second.ok) {
          return;
        }
        expect(
          first.trace.decisions.flatMap((decision) =>
            decision.outcome === "applied" && decision.ruleId === "rule.damage.direct-hit"
              ? [decision.operations[0]?.parameters["target.id"]]
              : [],
          ),
        ).toEqual(["actor.target-a", "actor.target-c", "actor.target-b"]);
        expect(first.result.metrics["chain.target-count"]).toBe(3);
        expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
      }),
      { numRuns: 50 },
    );
  });

  it("matches the independently authored resolved multi-target Radial golden", async () => {
    const outcome = await evaluateRadialTargetsGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(radialTargetsExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(radialTargetsExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(radialTargetsExpectedFixture.damageByType);
    expect(outcome.result.targetStates).toEqual(radialTargetsExpectedFixture.targetStates);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(radialTargetsExpectedFixture.appliedRuleIds);
    expect(
      outcome.trace.decisions.flatMap((decision) =>
        decision.outcome === "applied" && decision.ruleId === "rule.radial.construct-hit"
          ? [decision.operations[0]?.parameters["target.id"]]
          : [],
      ),
    ).toEqual(radialTargetsExpectedFixture.targetOrder);
    expect(outcome.result.coverage.experimental).toContain("mechanic.radial.resolved-targets");
    expect(
      await replayTraceTargetStates(outcome.trace, {
        "actor.target-a": 120,
        "actor.target-b": 60,
        "actor.target-c": 90,
        "actor.target-d": 40,
      }),
    ).toEqual({
      damage: radialTargetsExpectedFixture.damageByType,
      health: 242.5,
      healthByTarget: {
        "actor.target-a": 70,
        "actor.target-c": 72.5,
        "actor.target-b": 60,
        "actor.target-d": 40,
      },
    });
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, radialTargetsScenarioFixture),
    ).toBe(true);
  });

  it("matches the independently authored resolved Pellet allocation golden", async () => {
    const outcome = await evaluatePelletAllocationGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(pelletAllocationExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(pelletAllocationExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(pelletAllocationExpectedFixture.damageByType);
    expect(outcome.result.targetStates).toEqual(pelletAllocationExpectedFixture.targetStates);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(pelletAllocationExpectedFixture.appliedRuleIds);
    expect(
      outcome.trace.decisions.flatMap((decision) =>
        decision.outcome === "applied" && decision.ruleId === "rule.damage.direct-hit"
          ? [decision.operations[0]?.parameters["target.id"]]
          : [],
      ),
    ).toEqual(pelletAllocationExpectedFixture.targetOrder);
    expect(outcome.trace.decisions).toHaveLength(14);
    expect(outcome.result.coverage.experimental).toContain("mechanic.pellet.resolved-allocation");
    expect(
      await replayTraceTargetStates(outcome.trace, {
        "actor.target-a": 150,
        "actor.target-b": 80,
        "actor.target-c": 90,
      }),
    ).toEqual({
      damage: pelletAllocationExpectedFixture.damageByType,
      health: 140,
      healthByTarget: {
        "actor.target-a": 50,
        "actor.target-c": 90,
        "actor.target-b": 0,
      },
    });
    expect(
      await verifyResultTraceIntegrity(
        outcome.result,
        outcome.trace,
        pelletAllocationScenarioFixture,
      ),
    ).toBe(true);
  });

  it("matches the independently authored resolved Direct plus Radial impact golden", async () => {
    const outcome = await evaluateDirectRadialImpactGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(directRadialImpactExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(directRadialImpactExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(directRadialImpactExpectedFixture.damageByType);
    expect(outcome.result.targetStates).toEqual(directRadialImpactExpectedFixture.targetStates);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(directRadialImpactExpectedFixture.appliedRuleIds);
    const directConstruct = outcome.trace.decisions.find(
      (decision) => decision.ruleId === "rule.damage.direct-hit",
    );
    const radialConstructs = outcome.trace.decisions.filter(
      (decision) => decision.ruleId === "rule.radial.construct-hit",
    );
    expect(directConstruct?.parentEventId).toBe(
      "event.action.resolved-direct-radial-impact-1.attack.emit",
    );
    expect(radialConstructs.map((decision) => decision.parentEventId)).toEqual([
      "event.action.resolved-direct-radial-impact-1.attack.emit",
      "event.action.resolved-direct-radial-impact-1.attack.emit",
    ]);
    expect(
      radialConstructs.flatMap((decision) =>
        decision.outcome === "applied" ? [decision.operations[0]?.parameters["target.id"]] : [],
      ),
    ).toEqual(directRadialImpactExpectedFixture.radialTargetOrder);
    expect(outcome.trace.decisions).toHaveLength(16);
    expect(outcome.result.coverage.experimental).toContain(
      "mechanic.impact.resolved-direct-radial",
    );
    expect(
      await replayTraceTargetStates(outcome.trace, {
        "actor.target-a": 180,
        "actor.target-b": 60,
        "actor.target-c": 90,
      }),
    ).toEqual({
      damage: directRadialImpactExpectedFixture.damageByType,
      health: 212.5,
      healthByTarget: {
        "actor.target-a": 80,
        "actor.target-c": 72.5,
        "actor.target-b": 60,
      },
    });
    expect(
      await verifyResultTraceIntegrity(
        outcome.result,
        outcome.trace,
        directRadialImpactScenarioFixture,
      ),
    ).toBe(true);
  });

  it("property-tests Direct-before-Radial shared World State and deterministic replay", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 130, max: 260 }),
        fc.integer({ min: 2, max: 8 }),
        async (directTargetHealth, distanceMeters) => {
          const changed = structuredClone(directRadialImpactScenarioFixture);
          const directTarget = changed.targets.find((target) => target.id === "actor.target-a");
          const radialRelation = changed.targetGraph.relations[1];
          if (
            directTarget === undefined ||
            radialRelation === undefined ||
            radialRelation.kind !== "target-relation.impact-distance"
          ) {
            throw new Error("Resolved impact golden has an invalid target graph");
          }
          directTarget.configuration.resolvedHealth = directTargetHealth;
          radialRelation.resolvedDistanceMeters = distanceMeters;
          const scenario = await rehash(changed);
          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }
          const falloff = 0.4 + 0.6 * ((8 - distanceMeters) / 6);
          const radialDamage = 50 + 25 * falloff;
          expect(first.result.metrics["impact.direct.damage-total"]).toBe(50);
          expect(first.result.metrics["impact.radial.damage-total"]).toBeCloseTo(radialDamage, 6);
          expect(first.result.targetStates["actor.target-a"]?.health).toBe(
            directTargetHealth - 100,
          );
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rejects an unknown Direct target without producing partial Artifacts", async () => {
    const changed = structuredClone(directRadialImpactScenarioFixture);
    const action = changed.actionPlan[0];
    if (action === undefined) {
      throw new Error("Resolved impact golden omitted its action");
    }
    action.parameters.directTargetId = "actor.target-z";
    const scenario = await rehash(changed);
    const outcome = await evaluateScenario({
      scenario,
      catalog: structuredClone(catalogFixture),
    });

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "scenario-invalid",
        causeCode: "invalid-target-reference",
        mechanicId: "mechanic.impact.resolved-direct-radial",
        message: "Unknown Direct target",
        path: "/actionPlan/0/parameters/directTargetId",
      },
    });
  });

  it("property-tests resolved Pellet allocation counts, misses, and target Health", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.integer({ min: 0, max: 3 }),
            fc.integer({ min: 0, max: 3 }),
            fc.integer({ min: 0, max: 3 }),
            fc.integer({ min: 0, max: 3 }),
          )
          .filter((counts) => {
            const total = counts.reduce((sum, count) => sum + count, 0);
            return total >= 1 && total <= 8;
          }),
        async ([aHits, cHits, bHits, misses]) => {
          const changed = structuredClone(pelletAllocationScenarioFixture);
          const counts = new Map([
            ["actor.target-a", aHits],
            ["actor.target-c", cHits],
            ["actor.target-b", bHits],
          ]);
          for (const relation of changed.targetGraph.relations) {
            if (relation.kind !== "target-relation.pellet-allocation") {
              throw new Error("Resolved Pellet golden contains an unexpected relation");
            }
            relation.resolvedHitCount = counts.get(relation.targetId) ?? 0;
          }
          const action = changed.actionPlan[0];
          if (action === undefined) {
            throw new Error("Resolved Pellet golden omitted its action");
          }
          action.parameters.pelletCount = aHits + cHits + bHits + misses;
          const scenario = await rehash(changed);
          const outcome = await evaluateScenario({ scenario, catalog, ruleset });
          expect(outcome.ok).toBe(true);
          if (!outcome.ok) {
            return;
          }
          const expectedDamage = aHits * 50 + cHits * 25 + bHits * 100;
          const expectedHealth = {
            "actor.target-a": Math.max(0, 150 - aHits * 50),
            "actor.target-c": Math.max(0, 90 - cHits * 25),
            "actor.target-b": Math.max(0, 80 - bHits * 100),
          };
          expect(outcome.result.metrics["pellet.hit-count"]).toBe(aHits + cHits + bHits);
          expect(outcome.result.metrics["pellet.miss-count"]).toBe(misses);
          expect(outcome.result.metrics["damage.pellet.total"]).toBe(expectedDamage);
          expect(outcome.result.targetStates).toEqual(
            Object.fromEntries(
              Object.entries(expectedHealth).map(([targetId, health]) => [targetId, { health }]),
            ),
          );
          expect(
            await replayTraceTargetStates(outcome.trace, {
              "actor.target-a": 150,
              "actor.target-b": 80,
              "actor.target-c": 90,
            }),
          ).toMatchObject({
            damage: { "damage.synthetic-kinetic": expectedDamage },
            healthByTarget: expectedHealth,
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  it("property-tests resolved Radial linear falloff and LoS gating", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 8 }),
        fc.boolean(),
        async (distanceMeters, lineOfSightClear) => {
          const changed = structuredClone(radialTargetsScenarioFixture);
          const relation = changed.targetGraph.relations[1];
          if (relation === undefined || relation.kind !== "target-relation.impact-distance") {
            throw new Error("Resolved Radial golden must contain the C impact relation");
          }
          relation.resolvedDistanceMeters = distanceMeters;
          relation.lineOfSightClear = lineOfSightClear;
          const scenario = await rehash(changed);
          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }
          const falloff = 0.4 + 0.6 * ((8 - distanceMeters) / 6);
          const cDamage = lineOfSightClear ? 100 * falloff * 0.25 : 0;
          expect(first.result.metrics["radial.target-count"]).toBe(lineOfSightClear ? 2 : 1);
          expect(first.result.metrics["damage.radial.targets-total"]).toBeCloseTo(50 + cDamage, 6);
          expect(first.result.targetStates["actor.target-c"]?.health).toBeCloseTo(90 - cDamage, 6);
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
        },
      ),
      { numRuns: 50 },
    );
  });

  it("matches the independently authored resolved Status tick golden and logical times", async () => {
    const outcome = await evaluateStatusGolden();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const [metricId, expected] of Object.entries(statusExpectedFixture.metrics)) {
      expect(outcome.result.metrics[metricId]).toBeCloseTo(expected, 6);
    }
    expect(outcome.result.damageBySource).toEqual(statusExpectedFixture.damageBySource);
    expect(outcome.result.damageByType).toEqual(statusExpectedFixture.damageByType);
    expect(
      outcome.trace.decisions
        .filter((decision) => decision.outcome === "applied")
        .map((decision) => decision.ruleId),
    ).toEqual(statusExpectedFixture.appliedRuleIds);
    expect(outcome.trace.decisions.map((decision) => decision.eventTimeMs)).toEqual(
      statusExpectedFixture.eventTimesMs,
    );
    expect(
      outcome.trace.decisions.flatMap((decision) =>
        decision.outcome === "applied" &&
        decision.ruleId === "rule.status.commit-resolved-tick-health"
          ? [decision.after["target.health"]]
          : [],
      ),
    ).toEqual([60, 20, 0]);
    expect(outcome.trace.decisions[1]).toMatchObject({
      phase: "status.tick",
      ruleId: "rule.status.construct-resolved-tick",
      eventTimeMs: 1000,
      operations: [
        {
          kind: "damage-vector.copy-resolved-status-tick",
          parameters: {
            "tick.id": "tick.status-0",
            "tick.index": 0,
            "tick.count": 3,
            "tick.time-ms": 1000,
          },
        },
      ],
    });
    expect(await replayTraceState(outcome.trace, 100)).toEqual({
      damage: statusExpectedFixture.damageByType,
      health: 0,
    });
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(
      await verifyResultTraceIntegrity(outcome.result, outcome.trace, statusScenarioFixture),
    ).toBe(true);
  });

  it("rejects a resolved Status Trace whose tick logical time was altered", async () => {
    const outcome = await evaluateStatusGolden();
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const changed = await rehash({
      ...outcome.trace,
      decisions: outcome.trace.decisions.map((decision) =>
        decision.outcome === "applied" &&
        decision.ruleId === "rule.status.construct-resolved-tick" &&
        decision.eventTimeMs === 2000
          ? { ...decision, eventTimeMs: 2001 }
          : decision,
      ),
    });

    await expect(replayTraceDamage(changed)).rejects.toThrowError(
      expect.objectContaining<Partial<TraceReplayError>>({
        code: "invalid-operation-parameters",
      }),
    );
  });

  it("property-tests resolved Status tick timing, aggregation, Health clamp, and replay", async () => {
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 16 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 10_000 }),
        async (tickCount, tickIntervalMs, damagePerTick, health) => {
          const changed = structuredClone(statusScenarioFixture);
          const action = changed.actionPlan[0];
          const target = changed.targets[0];
          if (action === undefined || target === undefined) {
            throw new Error("Resolved Status golden must contain one action and target");
          }
          action.parameters.tickCount = tickCount;
          action.parameters.tickIntervalMs = tickIntervalMs;
          action.parameters.resolvedHealthDamagePerTick = damagePerTick;
          target.configuration.resolvedHealth = health;
          changed.simulation.timeLimitMs = tickCount * tickIntervalMs;
          const scenario = await rehash(changed);
          const first = await evaluateScenario({ scenario, catalog, ruleset });
          const second = await evaluateScenario({ scenario, catalog, ruleset });
          expect(first.ok).toBe(true);
          expect(second.ok).toBe(true);
          if (!first.ok || !second.ok) {
            return;
          }

          let remainingHealth = health;
          for (let index = 0; index < tickCount; index += 1) {
            remainingHealth =
              damagePerTick >= remainingHealth ? 0 : remainingHealth - damagePerTick;
          }
          expect(first.result.metrics["status.tick-count"]).toBe(tickCount);
          expect(first.result.metrics["status.tick-interval-ms"]).toBe(tickIntervalMs);
          expect(first.result.metrics["damage.status.per-tick"]).toBe(damagePerTick);
          expect(first.result.metrics["damage.status.total"]).toBe(damagePerTick * tickCount);
          expect(first.result.metrics["target.health.remaining"]).toBe(remainingHealth);
          expect(
            first.trace.decisions
              .filter(
                (decision) =>
                  decision.ruleId === "rule.status.construct-resolved-tick" ||
                  decision.ruleId === "rule.status.commit-resolved-tick-health",
              )
              .map((decision) => decision.eventTimeMs),
          ).toEqual(
            Array.from({ length: tickCount }, (_, index) => [
              (index + 1) * tickIntervalMs,
              (index + 1) * tickIntervalMs,
            ]).flat(),
          );
          expect(await replayTraceState(first.trace, health)).toEqual({
            damage: first.result.damageByType,
            health: remainingHealth,
          });
          expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rejects a resolved Status schedule above the execution limit without partial artifacts", async () => {
    const changed = structuredClone(statusScenarioFixture);
    const action = changed.actionPlan[0];
    if (action === undefined) {
      throw new Error("Resolved Status golden must contain one action");
    }
    action.parameters.tickCount = 65;
    action.parameters.tickIntervalMs = 1;
    changed.simulation.timeLimitMs = 65;
    const scenario = await rehash(changed);
    const catalog = await loadCatalogSnapshot(structuredClone(catalogFixture));
    const ruleset = await loadCoreRuleset();

    const outcome = await evaluateScenario({ scenario, catalog, ruleset });

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        code: "rule-execution-failed",
        causeCode: "execution-limit-exceeded",
      },
    });
    expect("result" in outcome).toBe(false);
    expect("trace" in outcome).toBe(false);
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
        metric !== "damage.multishot.total" &&
        metric !== "pellet.count" &&
        metric !== "pellet.hit-count" &&
        metric !== "pellet.miss-count" &&
        metric !== "damage.pellet.total" &&
        metric !== "radial.falloff.multiplier" &&
        metric !== "damage.radial.base.total" &&
        metric !== "damage.radial.total" &&
        metric !== "status.tick-count" &&
        metric !== "status.tick-interval-ms" &&
        metric !== "damage.status.per-tick" &&
        metric !== "damage.status.total" &&
        metric !== "punch-through.target-count" &&
        metric !== "damage.punch-through.total" &&
        metric !== "ricochet.target-count" &&
        metric !== "damage.ricochet.total" &&
        metric !== "chain.target-count" &&
        metric !== "damage.chain.total" &&
        metric !== "radial.target-count" &&
        metric !== "damage.radial.targets-total" &&
        metric !== "impact.direct.damage-total" &&
        metric !== "impact.radial.damage-total" &&
        metric !== "impact.damage-total" &&
        metric !== "impact.radial-target-count" &&
        metric !== "targets.health.remaining-total" &&
        metric !== "targets.defeated-count",
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
