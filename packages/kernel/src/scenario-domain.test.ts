import { attachArtifactContentHash, canonicalizeJson } from "@voidtrace/contracts";
import { describe, expect, it } from "vitest";
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import expectedScenarioFixture from "../../../data/fixtures/golden/expected-critical-armor.scenario.json" with {
  type: "json",
};
import { parseScenarioDomain } from "./scenario-domain.ts";

type MutableScenarioFixture = {
  contentHash: string;
  attacker: {
    configuration: Record<string, unknown>;
  };
  targets: Array<{
    id: string;
    configuration: Record<string, unknown>;
  }>;
  initialState: Record<string, unknown>;
  actionPlan: Array<{
    id: string;
    kind: string;
    parameters: Record<string, unknown>;
  }>;
  simulation:
    | {
        mode: "deterministic" | "expected";
        timeLimitMs: number;
      }
    | {
        mode: "monte-carlo";
        seed: number;
        iterations: number;
        timeLimitMs: number;
      };
  metrics: string[];
};

function firstTarget(scenario: MutableScenarioFixture): MutableScenarioFixture["targets"][number] {
  const target = scenario.targets[0];
  if (target === undefined) {
    throw new Error("Golden Scenario fixture must contain a target");
  }
  return target;
}

function firstAction(
  scenario: MutableScenarioFixture,
): MutableScenarioFixture["actionPlan"][number] {
  const action = scenario.actionPlan[0];
  if (action === undefined) {
    throw new Error("Golden Scenario fixture must contain an action");
  }
  return action;
}

async function changedScenario(
  change: (scenario: MutableScenarioFixture) => void,
): Promise<unknown> {
  const mutable = structuredClone(scenarioFixture) as MutableScenarioFixture;
  change(mutable);
  const { contentHash: _contentHash, ...withoutHash } = mutable;
  return attachArtifactContentHash(withoutHash);
}

async function changedExpectedScenario(
  change: (scenario: MutableScenarioFixture) => void,
): Promise<unknown> {
  const mutable = structuredClone(expectedScenarioFixture) as MutableScenarioFixture;
  change(mutable);
  const { contentHash: _contentHash, ...withoutHash } = mutable;
  return attachArtifactContentHash(withoutHash);
}

async function expectFailure(
  input: unknown,
  expected: {
    code: string;
    path: string;
    mechanicId?: string;
  },
): Promise<void> {
  const result = await parseScenarioDomain(input);
  expect(result).toMatchObject({
    ok: false,
    error: expected,
  });
}

describe("parseScenarioDomain", () => {
  it("validates, snapshots, freezes, and normalizes the supported deterministic slice", async () => {
    const callerValue = structuredClone(scenarioFixture);
    const before = canonicalizeJson(callerValue);

    const result = await parseScenarioDomain(callerValue);

    expect(result).toMatchObject({
      ok: true,
      value: {
        attacker: {
          id: "actor.attacker",
          weaponId: "weapon.synthetic-aperture",
          attackModeId: "attack-mode.synthetic-aperture.primary",
        },
        target: {
          id: "actor.target",
          catalogTargetId: "target.synthetic-calibration",
          resolvedHealth: 1000,
          resolvedShield: 0,
          resolvedArmor: 300,
          resolvedOverguard: 0,
        },
        action: {
          id: "action.direct-hit-1",
          kind: "direct-hit",
          targetId: "actor.target",
          hitLocation: "hit-location.neutral-body",
          damageLayer: "health",
          criticalResolution: "fixed",
          criticalTier: 1,
          criticalRoll: null,
          hitCount: 1,
        },
        simulation: {
          mode: "deterministic",
          timeLimitMs: 1,
        },
        metrics: scenarioFixture.metrics,
        fingerprintSeed: 0,
      },
    });
    expect(canonicalizeJson(callerValue)).toBe(before);
    expect(Object.isFrozen(callerValue)).toBe(false);
    if (result.ok) {
      expect(result.value.scenario).not.toBe(callerValue);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.scenario)).toBe(true);
      expect(Object.isFrozen(result.value.scenario.targets[0]?.configuration)).toBe(true);
      expect(Object.isFrozen(result.value.metrics)).toBe(true);
    }
  });

  it("reports generated-contract failures before domain interpretation", async () => {
    const invalid = structuredClone(scenarioFixture) as MutableScenarioFixture;
    invalid.metrics = [];

    await expectFailure(invalid, {
      code: "contract-invalid",
      path: "/metrics",
    });
  });

  it("rejects a stale Scenario content hash", async () => {
    const stale = structuredClone(scenarioFixture) as MutableScenarioFixture;
    stale.attacker.configuration.weaponId = "weapon.synthetic-other";

    await expectFailure(stale, {
      code: "content-hash-mismatch",
      path: "/contentHash",
    });
  });

  it("rejects the unsupported monte-carlo simulation mode", async () => {
    const scenario = await changedScenario((mutable) => {
      mutable.simulation = {
        mode: "monte-carlo",
        seed: 42,
        iterations: 10,
        timeLimitMs: 1,
      };
    });

    await expectFailure(scenario, {
      code: "unsupported-simulation-mode",
      path: "/simulation/mode",
      mechanicId: "simulation.monte-carlo",
    });
  });

  it("accepts expected mode only without a realized Critical input", async () => {
    const result = await parseScenarioDomain(structuredClone(expectedScenarioFixture));

    expect(result).toMatchObject({
      ok: true,
      value: {
        action: {
          criticalResolution: "expected",
          criticalTier: null,
          criticalRoll: null,
        },
        simulation: {
          mode: "expected",
          timeLimitMs: 1,
        },
        metrics: expectedScenarioFixture.metrics,
      },
    });
  });

  it.each([
    [
      "attacker",
      (scenario: MutableScenarioFixture) => {
        scenario.attacker.configuration.unexpected = true;
      },
      "/attacker/configuration/unexpected",
    ],
    [
      "target",
      (scenario: MutableScenarioFixture) => {
        firstTarget(scenario).configuration.unexpected = true;
      },
      "/targets/0/configuration/unexpected",
    ],
    [
      "action",
      (scenario: MutableScenarioFixture) => {
        firstAction(scenario).parameters.unexpected = true;
      },
      "/actionPlan/0/parameters/unexpected",
    ],
    [
      "initial state",
      (scenario: MutableScenarioFixture) => {
        scenario.initialState.unexpected = true;
      },
      "/initialState/unexpected",
    ],
  ])("rejects an unsupported %s configuration key", async (_label, change, path) => {
    const scenario = await changedScenario(change);

    await expectFailure(scenario, {
      code: "unsupported-configuration-key",
      path,
    });
  });

  it.each([
    [
      "attacker",
      (scenario: MutableScenarioFixture) => {
        delete scenario.attacker.configuration.weaponId;
      },
      "/attacker/configuration/weaponId",
    ],
    [
      "target",
      (scenario: MutableScenarioFixture) => {
        delete firstTarget(scenario).configuration.resolvedArmor;
      },
      "/targets/0/configuration/resolvedArmor",
    ],
  ])("rejects a missing %s configuration key", async (_label, change, path) => {
    const scenario = await changedScenario(change);

    await expectFailure(scenario, {
      code: "missing-configuration-key",
      path,
    });
  });

  it.each([
    [
      "target",
      (scenario: MutableScenarioFixture) => {
        scenario.targets.push(structuredClone(firstTarget(scenario)));
      },
      "/targets",
    ],
    [
      "action",
      (scenario: MutableScenarioFixture) => {
        scenario.actionPlan.push(structuredClone(firstAction(scenario)));
      },
      "/actionPlan",
    ],
  ])("requires exactly one %s", async (_label, change, path) => {
    const scenario = await changedScenario(change);

    await expectFailure(scenario, {
      code: "unsupported-scenario-shape",
      path,
    });
  });

  it.each([
    [
      "weaponId",
      (scenario: MutableScenarioFixture) => {
        scenario.attacker.configuration.weaponId = "Not Stable";
      },
      "/attacker/configuration/weaponId",
    ],
    [
      "attackModeId",
      (scenario: MutableScenarioFixture) => {
        scenario.attacker.configuration.attackModeId = "Not Stable";
      },
      "/attacker/configuration/attackModeId",
    ],
    [
      "catalogTargetId",
      (scenario: MutableScenarioFixture) => {
        firstTarget(scenario).configuration.catalogTargetId = "Not Stable";
      },
      "/targets/0/configuration/catalogTargetId",
    ],
    [
      "targetId",
      (scenario: MutableScenarioFixture) => {
        firstAction(scenario).parameters.targetId = "Not Stable";
      },
      "/actionPlan/0/parameters/targetId",
    ],
  ])("requires %s to be a stable string", async (_label, change, path) => {
    const scenario = await changedScenario(change);

    await expectFailure(scenario, {
      code: "invalid-configuration-value",
      path,
    });
  });

  it("requires the action target reference to name the configured target", async () => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).parameters.targetId = "actor.other";
    });

    await expectFailure(scenario, {
      code: "invalid-target-reference",
      path: "/actionPlan/0/parameters/targetId",
    });
  });

  it.each([
    ["resolvedHealth", "/targets/0/configuration/resolvedHealth"],
    ["resolvedShield", "/targets/0/configuration/resolvedShield"],
    ["resolvedArmor", "/targets/0/configuration/resolvedArmor"],
    ["resolvedOverguard", "/targets/0/configuration/resolvedOverguard"],
  ])("rejects a negative %s", async (key, path) => {
    const scenario = await changedScenario((mutable) => {
      firstTarget(mutable).configuration[key] = -1;
    });

    await expectFailure(scenario, {
      code: "invalid-configuration-value",
      path,
    });
  });

  it("rejects non-finite resolved defense input at the contract boundary", async () => {
    const invalid = structuredClone(scenarioFixture) as MutableScenarioFixture;
    firstTarget(invalid).configuration.resolvedArmor = Number.NaN;

    await expectFailure(invalid, {
      code: "contract-invalid",
      path: "/",
    });
  });

  it.each([
    ["resolvedShield", "mechanic.shield"],
    ["resolvedOverguard", "mechanic.overguard"],
  ])("requires unsupported %s to resolve to zero", async (key, mechanicId) => {
    const scenario = await changedScenario((mutable) => {
      firstTarget(mutable).configuration[key] = 1;
    });

    await expectFailure(scenario, {
      code: "unsupported-target-defense",
      path: `/targets/0/configuration/${key}`,
      mechanicId,
    });
  });

  it("rejects unsupported action kinds", async () => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).kind = "action.projectile-hit";
    });

    await expectFailure(scenario, {
      code: "unsupported-action-kind",
      path: "/actionPlan/0/kind",
      mechanicId: "action.projectile-hit",
    });
  });

  it("accepts a standalone Radial Hit with explicit resolved falloff", async () => {
    const scenario = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.id = "action.radial-hit-1";
      action.kind = "action.radial-hit";
      action.parameters.resolvedFalloffMultiplier = 0.75;
      mutable.metrics = [
        "damage.radial.base.total",
        "critical.tier",
        "critical.multiplier",
        "damage.post-critical.total",
        "radial.falloff.multiplier",
        "damage.radial.total",
        "armor.remaining-multiplier",
        "damage.health.total",
        "target.health.remaining",
      ];
    });

    const result = await parseScenarioDomain(scenario);
    expect(result).toMatchObject({
      ok: true,
      value: {
        action: {
          id: "action.radial-hit-1",
          kind: "radial-hit",
          criticalResolution: "fixed",
          criticalTier: 1,
          criticalRoll: null,
          hitCount: 1,
          resolvedRadialFalloffMultiplier: 0.75,
        },
      },
    });
  });

  it.each([-0.1, 1.1])(
    "rejects invalid resolved Radial falloff %s",
    async (resolvedFalloffMultiplier) => {
      const scenario = await changedScenario((mutable) => {
        const action = firstAction(mutable);
        action.kind = "action.radial-hit";
        action.parameters.resolvedFalloffMultiplier = resolvedFalloffMultiplier;
      });

      await expectFailure(scenario, {
        code: "invalid-configuration-value",
        path: "/actionPlan/0/parameters/resolvedFalloffMultiplier",
        mechanicId: "mechanic.damage.radial-falloff",
      });
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-finite resolved Radial falloff %s at the contract boundary",
    async (resolvedFalloffMultiplier) => {
      const invalid = structuredClone(scenarioFixture) as MutableScenarioFixture;
      const action = firstAction(invalid);
      action.kind = "action.radial-hit";
      action.parameters.resolvedFalloffMultiplier = resolvedFalloffMultiplier;

      await expectFailure(invalid, {
        code: "contract-invalid",
        path: "/",
      });
    },
  );

  it("rejects expected or explicit-roll Radial resolution", async () => {
    const expected = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.kind = "action.radial-hit";
      action.parameters.resolvedFalloffMultiplier = 0.75;
      delete action.parameters.criticalTier;
      mutable.simulation = { mode: "expected", timeLimitMs: 1 };
    });
    await expectFailure(expected, {
      code: "unsupported-radial-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.damage.radial",
    });

    const rolled = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.kind = "action.radial-hit";
      action.parameters.resolvedFalloffMultiplier = 0.75;
      delete action.parameters.criticalTier;
      action.parameters.criticalRoll = 0.2;
    });
    await expectFailure(rolled, {
      code: "unsupported-radial-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.damage.radial",
    });
  });

  it("accepts resolved fixed-count Multishot without inventing rolls", async () => {
    const scenario = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.id = "action.multishot-1";
      action.kind = "action.multishot-direct-hit";
      action.parameters.hitCount = 3;
      mutable.metrics.push("multishot.hit-count", "damage.multishot.total");
    });

    const result = await parseScenarioDomain(scenario);
    expect(result).toMatchObject({
      ok: true,
      value: {
        action: {
          id: "action.multishot-1",
          kind: "fixed-multishot",
          criticalResolution: "fixed",
          criticalTier: 1,
          criticalRoll: null,
          hitCount: 3,
        },
      },
    });
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid fixed Multishot hitCount %s",
    async (hitCount) => {
      const scenario = await changedScenario((mutable) => {
        const action = firstAction(mutable);
        action.kind = "action.multishot-direct-hit";
        action.parameters.hitCount = hitCount;
      });

      await expectFailure(scenario, {
        code: "invalid-configuration-value",
        path: "/actionPlan/0/parameters/hitCount",
        mechanicId: "mechanic.multishot.fixed-count",
      });
    },
  );

  it("rejects expected or explicit-roll Multishot in the fixed-count slice", async () => {
    const expected = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.kind = "action.multishot-direct-hit";
      action.parameters.hitCount = 3;
      delete action.parameters.criticalTier;
      mutable.simulation = { mode: "expected", timeLimitMs: 1 };
    });
    await expectFailure(expected, {
      code: "unsupported-multishot-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.multishot.fixed-count",
    });

    const rolled = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.kind = "action.multishot-direct-hit";
      action.parameters.hitCount = 3;
      delete action.parameters.criticalTier;
      action.parameters.criticalRoll = 0.2;
    });
    await expectFailure(rolled, {
      code: "unsupported-multishot-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.multishot.fixed-count",
    });
  });

  it("accepts resolved fixed-count pellets without inventing rolls", async () => {
    const scenario = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.id = "action.pellet-shot-1";
      action.kind = "action.pellet-direct-hit";
      action.parameters.pelletCount = 4;
      mutable.metrics.push("pellet.count", "damage.pellet.total");
    });

    const result = await parseScenarioDomain(scenario);
    expect(result).toMatchObject({
      ok: true,
      value: {
        action: {
          id: "action.pellet-shot-1",
          kind: "fixed-pellets",
          criticalResolution: "fixed",
          criticalTier: 1,
          criticalRoll: null,
          hitCount: 4,
        },
      },
    });
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid fixed pelletCount %s",
    async (pelletCount) => {
      const scenario = await changedScenario((mutable) => {
        const action = firstAction(mutable);
        action.kind = "action.pellet-direct-hit";
        action.parameters.pelletCount = pelletCount;
      });

      await expectFailure(scenario, {
        code: "invalid-configuration-value",
        path: "/actionPlan/0/parameters/pelletCount",
        mechanicId: "mechanic.pellet.fixed-count",
      });
    },
  );

  it("rejects expected or explicit-roll pellets in the fixed-count slice", async () => {
    const expected = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.kind = "action.pellet-direct-hit";
      action.parameters.pelletCount = 4;
      delete action.parameters.criticalTier;
      mutable.simulation = { mode: "expected", timeLimitMs: 1 };
    });
    await expectFailure(expected, {
      code: "unsupported-pellet-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.pellet.fixed-count",
    });

    const rolled = await changedScenario((mutable) => {
      const action = firstAction(mutable);
      action.kind = "action.pellet-direct-hit";
      action.parameters.pelletCount = 4;
      delete action.parameters.criticalTier;
      action.parameters.criticalRoll = 0.2;
    });
    await expectFailure(rolled, {
      code: "unsupported-pellet-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.pellet.fixed-count",
    });
  });

  it("rejects non-neutral hit locations", async () => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).parameters.hitLocation = "hit-location.headshot";
    });

    await expectFailure(scenario, {
      code: "unsupported-hit-location",
      path: "/actionPlan/0/parameters/hitLocation",
      mechanicId: "mechanic.hit-location",
    });
  });

  it("rejects non-Health damage layers", async () => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).parameters.damageLayer = "shield";
    });

    await expectFailure(scenario, {
      code: "unsupported-damage-layer",
      path: "/actionPlan/0/parameters/damageLayer",
      mechanicId: "mechanic.damage-layer",
    });
  });

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsupported fixed Critical tier %s",
    async (tier) => {
      const scenario = await changedScenario((mutable) => {
        firstAction(mutable).parameters.criticalTier = tier;
      });

      await expectFailure(scenario, {
        code: "unsupported-critical-tier",
        path: "/actionPlan/0/parameters/criticalTier",
        mechanicId: "mechanic.critical.fixed-tier",
      });
    },
  );

  it.each([0, 2, Number.MAX_SAFE_INTEGER])("accepts fixed Critical tier %s", async (tier) => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).parameters.criticalTier = tier;
    });

    const result = await parseScenarioDomain(scenario);
    expect(result).toMatchObject({
      ok: true,
      value: {
        action: {
          criticalResolution: "fixed",
          criticalTier: tier,
          criticalRoll: null,
        },
      },
    });
  });

  it.each([0, 0.25, 0.999_999])("accepts explicit Critical roll %s", async (roll) => {
    const scenario = await changedScenario((mutable) => {
      const parameters = firstAction(mutable).parameters;
      delete parameters.criticalTier;
      parameters.criticalRoll = roll;
    });

    const result = await parseScenarioDomain(scenario);
    expect(result).toMatchObject({
      ok: true,
      value: {
        action: {
          criticalResolution: "roll",
          criticalTier: null,
          criticalRoll: roll,
        },
      },
    });
  });

  it.each([-1, 1, 1.1, "0.5"])("rejects invalid explicit Critical roll %s", async (roll) => {
    const scenario = await changedScenario((mutable) => {
      const parameters = firstAction(mutable).parameters;
      delete parameters.criticalTier;
      parameters.criticalRoll = roll;
    });

    await expectFailure(scenario, {
      code: "invalid-configuration-value",
      path: "/actionPlan/0/parameters/criticalRoll",
      mechanicId: "mechanic.critical.probability",
    });
  });

  it("requires exactly one Critical resolution input", async () => {
    const missing = await changedScenario((mutable) => {
      delete firstAction(mutable).parameters.criticalTier;
    });
    await expectFailure(missing, {
      code: "invalid-critical-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.critical.resolution",
    });

    const conflicting = await changedScenario((mutable) => {
      firstAction(mutable).parameters.criticalRoll = 0.25;
    });
    await expectFailure(conflicting, {
      code: "invalid-critical-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.critical.resolution",
    });
  });

  it("rejects realized Critical inputs in expected mode", async () => {
    const withTier = await changedExpectedScenario((mutable) => {
      firstAction(mutable).parameters.criticalTier = 1;
    });
    await expectFailure(withTier, {
      code: "invalid-critical-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.critical.resolution",
    });

    const withRoll = await changedExpectedScenario((mutable) => {
      firstAction(mutable).parameters.criticalRoll = 0.25;
    });
    await expectFailure(withRoll, {
      code: "invalid-critical-resolution",
      path: "/actionPlan/0/parameters",
      mechanicId: "mechanic.critical.resolution",
    });
  });

  it("requires rolled Critical metrics to use criticalRoll resolution", async () => {
    const fixed = await changedScenario((mutable) => {
      mutable.metrics = ["critical.roll"];
    });
    await expectFailure(fixed, {
      code: "unsupported-metric",
      path: "/metrics/0",
      mechanicId: "critical.roll",
    });

    const rolled = await changedScenario((mutable) => {
      const parameters = firstAction(mutable).parameters;
      delete parameters.criticalTier;
      parameters.criticalRoll = 0.25;
      mutable.metrics = [
        "critical.roll",
        "critical.base-tier",
        "critical.next-tier",
        "critical.fraction",
        "critical.base-tier.probability",
        "critical.next-tier.probability",
        "critical.tier-0.probability",
        "critical.tier-1.probability",
      ];
    });
    const result = await parseScenarioDomain(rolled);
    expect(result).toMatchObject({
      ok: true,
      value: {
        metrics: [
          "critical.roll",
          "critical.base-tier",
          "critical.next-tier",
          "critical.fraction",
          "critical.base-tier.probability",
          "critical.next-tier.probability",
          "critical.tier-0.probability",
          "critical.tier-1.probability",
        ],
      },
    });
  });

  it("keeps realized and expected Critical metric namespaces separate", async () => {
    const expectedWithRealizedMetric = await changedExpectedScenario((mutable) => {
      mutable.metrics = ["critical.tier"];
    });
    await expectFailure(expectedWithRealizedMetric, {
      code: "unsupported-metric",
      path: "/metrics/0",
      mechanicId: "critical.tier",
    });

    const deterministicWithExpectedMetric = await changedScenario((mutable) => {
      mutable.metrics = ["critical.expected.multiplier"];
    });
    await expectFailure(deterministicWithExpectedMetric, {
      code: "unsupported-metric",
      path: "/metrics/0",
      mechanicId: "critical.expected.multiplier",
    });
  });

  it("rejects unsupported and duplicate metrics", async () => {
    const unsupported = await changedScenario((mutable) => {
      mutable.metrics = ["damage.unknown"];
    });
    await expectFailure(unsupported, {
      code: "unsupported-metric",
      path: "/metrics/0",
      mechanicId: "damage.unknown",
    });

    const duplicate = await changedScenario((mutable) => {
      mutable.metrics = ["damage.health.total", "damage.health.total"];
    });
    await expectFailure(duplicate, {
      code: "duplicate-metric",
      path: "/metrics/1",
      mechanicId: "damage.health.total",
    });
  });
});
