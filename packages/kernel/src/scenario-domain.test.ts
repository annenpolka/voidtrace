import { attachArtifactContentHash, canonicalizeJson } from "@voidtrace/contracts";
import { describe, expect, it } from "vitest";
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
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
          targetId: "actor.target",
          hitLocation: "hit-location.neutral-body",
          damageLayer: "health",
          criticalResolution: "fixed",
          criticalTier: 1,
          criticalRoll: null,
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

  it.each([
    ["expected", "simulation.expected"],
    ["monte-carlo", "simulation.monte-carlo"],
  ] as const)("rejects the unsupported %s simulation mode", async (mode, mechanicId) => {
    const scenario = await changedScenario((mutable) => {
      mutable.simulation =
        mode === "expected"
          ? { mode, timeLimitMs: 1 }
          : { mode, seed: 42, iterations: 10, timeLimitMs: 1 };
    });

    await expectFailure(scenario, {
      code: "unsupported-simulation-mode",
      path: "/simulation/mode",
      mechanicId,
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

  it("rejects non-Direct-Hit actions", async () => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).kind = "action.radial-hit";
    });

    await expectFailure(scenario, {
      code: "unsupported-action-kind",
      path: "/actionPlan/0/kind",
      mechanicId: "action.radial-hit",
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

  it.each([2, -1, 0.5])("rejects unsupported fixed Critical tier %s", async (tier) => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).parameters.criticalTier = tier;
    });

    await expectFailure(scenario, {
      code: "unsupported-critical-tier",
      path: "/actionPlan/0/parameters/criticalTier",
      mechanicId: "mechanic.critical.fixed-tier",
    });
  });

  it("accepts fixed Critical tier zero", async () => {
    const scenario = await changedScenario((mutable) => {
      firstAction(mutable).parameters.criticalTier = 0;
    });

    const result = await parseScenarioDomain(scenario);
    expect(result).toMatchObject({
      ok: true,
      value: {
        action: {
          criticalResolution: "fixed",
          criticalTier: 0,
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
        "critical.tier-0.probability",
        "critical.tier-1.probability",
      ];
    });
    const result = await parseScenarioDomain(rolled);
    expect(result).toMatchObject({
      ok: true,
      value: {
        metrics: ["critical.roll", "critical.tier-0.probability", "critical.tier-1.probability"],
      },
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
