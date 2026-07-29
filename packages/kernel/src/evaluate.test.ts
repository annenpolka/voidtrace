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
import expectedFixture from "../../../data/fixtures/golden/direct-critical-armor.expected.json" with {
  type: "json",
};
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import { evaluateScenario } from "./evaluate.ts";
import { SUPPORTED_METRIC_IDS } from "./scenario-domain.ts";
import { replayTraceDamage, type TraceReplayError } from "./trace-replay.ts";

async function evaluateGolden() {
  return evaluateScenario({
    scenario: structuredClone(scenarioFixture),
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
        "mechanic.critical.fixed-tier",
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
    expect(outcome.trace.decisions.map((decision) => decision.sequence)).toEqual([0, 1, 2, 3, 4]);
    expect(outcome.trace.decisions.every((decision) => decision.eventTimeMs === 0)).toBe(true);

    expect(await replayTraceDamage(outcome.trace)).toEqual(outcome.result.damageByType);
    expect(await verifyArtifactContentHash(outcome.trace)).toBe(true);
    expect(await verifyArtifactContentHash(outcome.result)).toBe(true);
    expect(await verifyResultTraceIntegrity(outcome.result, outcome.trace, scenarioFixture)).toBe(
      true,
    );
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.metrics)).toBe(true);
    expect(Object.isFrozen(outcome.trace.decisions)).toBe(true);
  });

  it("is canonically deterministic for identical Scenario, Catalog, Ruleset, and seed", async () => {
    const first = await evaluateGolden();
    const second = await evaluateGolden();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(canonicalizeJson(first)).toBe(canonicalizeJson(second));
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
    const metricSubset = fc.uniqueArray(fc.constantFrom(...SUPPORTED_METRIC_IDS), {
      minLength: 1,
      maxLength: SUPPORTED_METRIC_IDS.length,
    });

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<0 | 1>(0, 1),
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
          expect(rejected).toHaveLength(1);
          expect(rejected[0]).toMatchObject({
            outcome: "rejected",
            rejectionStage: "predicate",
            rejectionReason: {
              code: "predicate.critical-tier-mismatch",
            },
          });
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
});

describe("replayTraceDamage", () => {
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
