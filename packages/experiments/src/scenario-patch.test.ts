import {
  attachArtifactContentHash,
  canonicalizeJson,
  type Scenario,
  type ScenarioPatch,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import pelletAllocationScenarioFixture from "../../../data/fixtures/golden/resolved-pellet-allocation.scenario.json" with {
  type: "json",
};
import radialTargetsScenarioFixture from "../../../data/fixtures/golden/resolved-radial-targets.scenario.json" with {
  type: "json",
};
import {
  materializeScenarioPatch,
  type ScenarioPatchErrorCode,
  type ScenarioPatchOutcome,
} from "./scenario-patch.ts";

type ArtifactIdentity = {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

type Replacement = ScenarioPatch["operations"][number];

type MutableScenario = {
  id: string;
  revision: number;
  createdFrom?: ReturnType<typeof artifactRef>;
  contentHash: string;
  initialState: Record<string, string | number | boolean | null>;
  actionPlan: Array<{ parameters: Record<string, string | number | boolean | null> }>;
  targets: Array<{ configuration: Record<string, string | number | boolean | null> }>;
  simulation: { timeLimitMs: number };
  metrics: string[];
};

type MutablePatch = {
  operations: Array<{ value: string | number | boolean | null }>;
};

function artifactRef(artifact: ArtifactIdentity) {
  return {
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  } as const;
}

function checkedScenario(value: unknown): Scenario {
  const validation = validateContract("scenario", value);
  if (!validation.ok) {
    throw new Error(`Invalid test Scenario: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedPatch(value: unknown): ScenarioPatch {
  const validation = validateContract("scenario-patch", value);
  if (!validation.ok) {
    throw new Error(`Invalid test ScenarioPatch: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

const baseScenario = checkedScenario(scenarioFixture);
const radialTargetsScenario = checkedScenario(radialTargetsScenarioFixture);
const pelletAllocationScenario = checkedScenario(pelletAllocationScenarioFixture);

async function rawPatch(
  operations: ReadonlyArray<Readonly<Record<string, unknown>>>,
  options: {
    readonly base?: Scenario;
    readonly baseRef?: ReturnType<typeof artifactRef>;
    readonly gameBuild?: string;
    readonly resultId?: string;
    readonly resultRevision?: number;
  } = {},
) {
  const base = options.base ?? baseScenario;
  return attachArtifactContentHash({
    $schema: "urn:voidtrace:schema:scenario-patch:0.1.0",
    kind: "voidtrace.scenario-patch",
    schemaVersion: "0.1.0",
    id: "scenario-patch.test",
    revision: 0,
    gameBuild: options.gameBuild ?? base.gameBuild,
    baseScenarioRef: options.baseRef ?? artifactRef(base),
    resultScenario: {
      id: options.resultId ?? "scenario.materialized-test",
      revision: options.resultRevision ?? 0,
    },
    operations,
  } as const);
}

async function patch(
  operations: ReadonlyArray<Replacement>,
  options: Parameters<typeof rawPatch>[1] = {},
): Promise<ScenarioPatch> {
  return checkedPatch(await rawPatch(operations, options));
}

async function scenarioWithInitialState(
  initialState: Readonly<Record<string, string | number | boolean | null>>,
): Promise<Scenario> {
  const { contentHash: _contentHash, ...body } = structuredClone(baseScenario);
  return checkedScenario(await attachArtifactContentHash({ ...body, initialState }));
}

function allObjectsAreFrozen(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return true;
  }
  return Object.isFrozen(value) && Object.values(value).every(allObjectsAreFrozen);
}

function expectFailure(outcome: ScenarioPatchOutcome, code: ScenarioPatchErrorCode) {
  expect(outcome).toMatchObject({ ok: false, error: { code } });
  if (outcome.ok) {
    throw new Error(`Expected ${code}, received a materialized Scenario`);
  }
  expect(outcome).not.toHaveProperty("scenario");
  return outcome;
}

function restoreLiteralBaseShape(materialized: Scenario): unknown {
  const restored = structuredClone(materialized) as unknown as MutableScenario;
  restored.id = baseScenario.id;
  restored.revision = baseScenario.revision;
  if (baseScenario.createdFrom === undefined) {
    delete restored.createdFrom;
  } else {
    restored.createdFrom = structuredClone(baseScenario.createdFrom);
  }
  restored.contentHash = baseScenario.contentHash;
  const action = restored.actionPlan[0];
  if (action === undefined) {
    throw new Error("Expected one action");
  }
  action.parameters.criticalTier = 1;
  return restored;
}

describe("Scenario Patch materialization", () => {
  it("materializes one literal Critical tier replacement with exact provenance and isolation", async () => {
    const scenarioPatch = await patch(
      [{ op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: 2 }],
      { resultId: "scenario.materialized-critical-tier", resultRevision: 3 },
    );
    const request = {
      patch: structuredClone(scenarioPatch),
      scenario: structuredClone(baseScenario),
    };
    const requestBefore = canonicalizeJson(request);

    const first = await materializeScenarioPatch(request);
    const second = await materializeScenarioPatch(request);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(canonicalizeJson(request)).toBe(requestBefore);
    if (!first.ok) {
      throw new Error(first.error.message);
    }
    expect(first.scenario.id).toBe("scenario.materialized-critical-tier");
    expect(first.scenario.revision).toBe(3);
    expect(first.scenario.createdFrom).toEqual(artifactRef(baseScenario));
    expect(first.scenario.actionPlan[0]?.parameters.criticalTier).toBe(2);
    expect(first.scenario.contentHash).not.toBe(baseScenario.contentHash);
    expect(validateContract("scenario", first.scenario).ok).toBe(true);
    await expect(verifyArtifactContentHash(first.scenario)).resolves.toBe(true);
    expect(allObjectsAreFrozen(first)).toBe(true);
    expect(canonicalizeJson(restoreLiteralBaseShape(first.scenario))).toBe(
      canonicalizeJson(baseScenario),
    );
  });

  it("supports 64 unique replacements and behavior-free escaped or prototype-named keys", async () => {
    const initialState = Object.create(null) as Record<string, number>;
    for (let index = 0; index < 60; index += 1) {
      initialState[`key-${index}`] = index;
    }
    Object.defineProperty(initialState, "__proto__", {
      enumerable: true,
      value: 0,
      writable: true,
    });
    Object.defineProperty(initialState, "constructor", {
      enumerable: true,
      value: 0,
      writable: true,
    });
    initialState["slash/key"] = 0;
    initialState["tilde~key"] = 0;
    const scenario = await scenarioWithInitialState(initialState);
    const operations: Replacement[] = [
      ...Array.from({ length: 60 }, (_, index) => ({
        op: "replace" as const,
        path: `/initialState/key-${index}`,
        value: index + 100,
      })),
      { op: "replace", path: "/initialState/__proto__", value: 1 },
      { op: "replace", path: "/initialState/constructor", value: 1 },
      { op: "replace", path: "/initialState/slash~1key", value: 1 },
      { op: "replace", path: "/initialState/tilde~0key", value: 1 },
    ];

    const outcome = await materializeScenarioPatch({
      patch: await patch(operations, { base: scenario }),
      scenario,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    expect(outcome.scenario.initialState["key-0"]).toBe(100);
    expect(outcome.scenario.initialState["key-59"]).toBe(159);
    expect(Object.getOwnPropertyDescriptor(outcome.scenario.initialState, "__proto__")?.value).toBe(
      1,
    );
    expect(
      Object.getOwnPropertyDescriptor(outcome.scenario.initialState, "constructor")?.value,
    ).toBe(1);
    expect(outcome.scenario.initialState["slash/key"]).toBe(1);
    expect(outcome.scenario.initialState["tilde~key"]).toBe(1);
    expect(Object.getPrototypeOf(outcome.scenario.initialState)).toBe(Object.prototype);
  });

  it("materializes every finite allowlist path family, including resolved relation scalars", async () => {
    const cases = [
      {
        scenario: baseScenario,
        operations: [
          {
            op: "replace" as const,
            path: "/attacker/configuration/attackModeId",
            value: "attack-mode.synthetic-other",
          },
        ],
        read: (scenario: Scenario) => scenario.attacker.configuration.attackModeId,
        expected: "attack-mode.synthetic-other",
      },
      {
        scenario: radialTargetsScenario,
        operations: [
          {
            op: "replace" as const,
            path: "/targetGraph/relations/0/resolvedDistanceMeters",
            value: 1,
          },
          {
            op: "replace" as const,
            path: "/targetGraph/relations/0/lineOfSightClear",
            value: false,
          },
        ],
        read: (scenario: Scenario) => {
          const relation = scenario.targetGraph.relations[0];
          return relation?.kind === "target-relation.impact-distance"
            ? [relation.resolvedDistanceMeters, relation.lineOfSightClear]
            : undefined;
        },
        expected: [1, false],
      },
      {
        scenario: pelletAllocationScenario,
        operations: [
          {
            op: "replace" as const,
            path: "/targetGraph/relations/0/resolvedHitCount",
            value: 3,
          },
        ],
        read: (scenario: Scenario) => {
          const relation = scenario.targetGraph.relations[0];
          return relation?.kind === "target-relation.pellet-allocation"
            ? relation.resolvedHitCount
            : undefined;
        },
        expected: 3,
      },
    ];

    for (const [index, testCase] of cases.entries()) {
      const outcome = await materializeScenarioPatch({
        patch: await patch(testCase.operations, {
          base: testCase.scenario,
          resultId: `scenario.materialized-allowlist-${index}`,
        }),
        scenario: testCase.scenario,
      });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) {
        throw new Error(outcome.error.message);
      }
      expect(testCase.read(outcome.scenario)).toEqual(testCase.expected);
    }
  });

  it("rejects stale inputs, reference drift, game-build drift, and reused output identity", async () => {
    const validPatch = await patch([
      { op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: 2 },
    ]);
    const stalePatch = structuredClone(validPatch) as unknown as MutablePatch;
    const staleOperation = stalePatch.operations[0];
    if (staleOperation === undefined) {
      throw new Error("Expected one Scenario Patch operation");
    }
    staleOperation.value = 3;
    expectFailure(
      await materializeScenarioPatch({ patch: stalePatch, scenario: baseScenario }),
      "scenario-patch-invalid",
    );

    const staleScenario = structuredClone(baseScenario) as unknown as MutableScenario;
    const staleAction = staleScenario.actionPlan[0];
    if (staleAction === undefined) {
      throw new Error("Expected one Scenario action");
    }
    staleAction.parameters.criticalTier = 9;
    expectFailure(
      await materializeScenarioPatch({ patch: validPatch, scenario: staleScenario }),
      "base-scenario-invalid",
    );

    const wrongRef = {
      ...artifactRef(baseScenario),
      contentHash: `sha256:${"f".repeat(64)}`,
    };
    expectFailure(
      await materializeScenarioPatch({
        patch: await patch(validPatch.operations, { baseRef: wrongRef }),
        scenario: baseScenario,
      }),
      "base-scenario-reference-mismatch",
    );

    expectFailure(
      await materializeScenarioPatch({
        patch: await patch(validPatch.operations, { gameBuild: "synthetic-other-build" }),
        scenario: baseScenario,
      }),
      "scenario-patch-game-build-mismatch",
    );

    expectFailure(
      await materializeScenarioPatch({
        patch: await patch(validPatch.operations, {
          resultId: baseScenario.id,
          resultRevision: baseScenario.revision,
        }),
        scenario: baseScenario,
      }),
      "scenario-patch-result-identity-conflict",
    );
  });

  it.each([
    ["the base id with a new revision", baseScenario.id, baseScenario.revision + 1],
    ["a new id with the base revision", "scenario.materialized-new-id", baseScenario.revision],
  ])("accepts %s as a distinct result identity pair", async (_label, resultId, resultRevision) => {
    const outcome = await materializeScenarioPatch({
      patch: await patch(
        [{ op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: 2 }],
        { resultId, resultRevision },
      ),
      scenario: baseScenario,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    expect([outcome.scenario.id, outcome.scenario.revision]).toEqual([resultId, resultRevision]);
  });

  it("rejects duplicate, missing, kind-changing, and no-op replacements without a partial Scenario", async () => {
    const duplicate = await patch([
      { op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: 2 },
      { op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: 3 },
    ]);
    expectFailure(
      await materializeScenarioPatch({ patch: duplicate, scenario: baseScenario }),
      "scenario-patch-path-duplicate",
    );

    const missing = await patch([{ op: "replace", path: "/initialState/not-present", value: 1 }]);
    expectFailure(
      await materializeScenarioPatch({ patch: missing, scenario: baseScenario }),
      "scenario-patch-path-missing",
    );

    const kindChange = await patch([
      { op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: "2" },
    ]);
    expectFailure(
      await materializeScenarioPatch({ patch: kindChange, scenario: baseScenario }),
      "scenario-patch-value-kind-mismatch",
    );

    const noOp = await patch([
      { op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: 1 },
    ]);
    expectFailure(
      await materializeScenarioPatch({ patch: noOp, scenario: baseScenario }),
      "scenario-patch-no-op",
    );

    const orderedFailure = await patch([
      { op: "replace", path: "/simulation/timeLimitMs", value: 1 },
      { op: "replace", path: "/initialState/not-present", value: 1 },
    ]);
    const firstFailure = expectFailure(
      await materializeScenarioPatch({ patch: orderedFailure, scenario: baseScenario }),
      "scenario-patch-no-op",
    );
    expect(firstFailure.error.path).toBe("/patch/operations/0/value");
  });

  it.each([
    [[], "/patch/operations"],
    [
      Array.from({ length: 65 }, (_, index) => ({
        op: "replace",
        path: `/initialState/key-${index}`,
        value: index,
      })),
      "/patch/operations",
    ],
    [[{ op: "add", path: "/initialState/key", value: 1 }], "/patch/operations/0/op"],
    [
      [{ op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: null }],
      "/patch/operations/0/value",
    ],
    [[{ op: "replace", path: "/id", value: "scenario.changed" }], "/patch/operations/0/path"],
    [
      [{ op: "replace", path: "/targets/00/configuration/resolvedArmor", value: 0 }],
      "/patch/operations/0/path",
    ],
    [[{ op: "replace", path: "/initialState/bad~2key", value: 1 }], "/patch/operations/0/path"],
    [[{ op: "replace", path: "/actionPlan/0", value: 1 }], "/patch/operations/0/path"],
    [
      [{ op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: {} }],
      "/patch/operations/0/value",
    ],
    [
      [{ op: "replace", path: "/actionPlan/0/parameters/criticalTier", value: [] }],
      "/patch/operations/0/value",
    ],
  ])("rejects unsupported Contract input %#", async (operations, expectedPath) => {
    const outcome = expectFailure(
      await materializeScenarioPatch({ patch: await rawPatch(operations), scenario: baseScenario }),
      "scenario-patch-invalid",
    );
    expect(outcome.error.path).toBe(expectedPath);
  });

  it("rejects non-scalar base data at the Scenario Contract boundary", async () => {
    const { contentHash: _contentHash, ...body } = structuredClone(baseScenario);
    const invalidBase = await attachArtifactContentHash({
      ...body,
      initialState: { nested: { unsupported: true } },
    });
    const candidatePatch = await rawPatch(
      [{ op: "replace", path: "/initialState/nested", value: 1 }],
      { baseRef: artifactRef(invalidBase as ArtifactIdentity) },
    );

    expectFailure(
      await materializeScenarioPatch({ patch: candidatePatch, scenario: invalidBase }),
      "base-scenario-invalid",
    );
  });

  it("snapshots before awaiting, rejects accessors and sparse arrays, and never leaks exceptions", async () => {
    const secret = "PRIVATE scenario patch getter exception";
    let accessorReads = 0;
    const request: Record<string, unknown> = { scenario: baseScenario };
    Object.defineProperty(request, "patch", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error(secret);
      },
    });
    const accessorOutcome = expectFailure(
      await materializeScenarioPatch(request as never),
      "scenario-patch-request-invalid",
    );
    expect(accessorReads).toBe(0);
    expect(JSON.stringify(accessorOutcome)).not.toContain(secret);

    let proxyReads = 0;
    const proxiedPatch = new Proxy(
      await patch([{ op: "replace", path: "/simulation/timeLimitMs", value: 2 }]),
      {
        get(target, property, receiver) {
          proxyReads += 1;
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const proxiedOutcome = await materializeScenarioPatch({
      patch: proxiedPatch,
      scenario: baseScenario,
    });
    expect(proxiedOutcome.ok).toBe(true);
    expect(proxyReads).toBe(0);

    for (const trap of ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const) {
      let structuralTrapCalls = 0;
      const target = {
        patch: await patch([{ op: "replace", path: "/simulation/timeLimitMs", value: 2 }]),
        scenario: baseScenario,
      };
      const handler: ProxyHandler<typeof target> = {};
      if (trap === "getPrototypeOf") {
        handler.getPrototypeOf = () => {
          structuralTrapCalls += 1;
          throw new Error(secret);
        };
      } else if (trap === "ownKeys") {
        handler.ownKeys = () => {
          structuralTrapCalls += 1;
          throw new Error(secret);
        };
      } else {
        handler.getOwnPropertyDescriptor = () => {
          structuralTrapCalls += 1;
          throw new Error(secret);
        };
      }
      const structuralOutcome = expectFailure(
        await materializeScenarioPatch(new Proxy(target, handler)),
        "scenario-patch-request-invalid",
      );
      expect(structuralTrapCalls).toBe(1);
      expect(JSON.stringify(structuralOutcome)).not.toContain(secret);
    }

    const hiddenRequest = {
      patch: await patch([{ op: "replace", path: "/simulation/timeLimitMs", value: 2 }]),
      scenario: baseScenario,
    };
    Object.defineProperty(hiddenRequest, "hidden", { value: secret });
    const hiddenOutcome = expectFailure(
      await materializeScenarioPatch(hiddenRequest),
      "scenario-patch-request-invalid",
    );
    expect(JSON.stringify(hiddenOutcome)).not.toContain(secret);

    const sparseOperations = new Array(1);
    const sparsePatch = structuredClone(
      await patch([{ op: "replace", path: "/simulation/timeLimitMs", value: 2 }]),
    ) as unknown as Record<string, unknown>;
    sparsePatch.operations = sparseOperations;
    const sparseOutcome = expectFailure(
      await materializeScenarioPatch({
        patch: sparsePatch,
        scenario: baseScenario,
      }),
      "scenario-patch-request-invalid",
    );
    expect(sparseOutcome.error.message).not.toContain(secret);
  });

  it("property-tests deterministic same-type scalar replacement and isolation", async () => {
    const variation = fc.oneof(
      fc
        .integer({ min: 0, max: 10_000 })
        .filter((value) => value !== 1)
        .map((value) => ({
          path: "/actionPlan/0/parameters/criticalTier" as const,
          value,
          restore: 1,
        })),
      fc
        .integer({ min: 0, max: 10_000 })
        .filter((value) => value !== 300)
        .map((value) => ({
          path: "/targets/0/configuration/resolvedArmor" as const,
          value,
          restore: 300,
        })),
      fc
        .integer({ min: 1, max: 10_000 })
        .filter((value) => value !== 1)
        .map((value) => ({
          path: "/simulation/timeLimitMs" as const,
          value,
          restore: 1,
        })),
      fc
        .constantFrom("damage.health.total", "target.health.remaining", "critical.multiplier")
        .filter((value) => value !== baseScenario.metrics[0])
        .map((value) => ({
          path: "/metrics/0" as const,
          value,
          restore: baseScenario.metrics[0] as string,
        })),
    );

    await fc.assert(
      fc.asyncProperty(variation, async ({ path, value, restore }) => {
        const scenarioPatch = await patch([{ op: "replace", path, value }], {
          resultId: "scenario.materialized-property",
          resultRevision: 7,
        });
        const first = await materializeScenarioPatch({
          patch: scenarioPatch,
          scenario: baseScenario,
        });
        const second = await materializeScenarioPatch({
          patch: scenarioPatch,
          scenario: baseScenario,
        });
        expect(first).toEqual(second);
        expect(first.ok).toBe(true);
        if (!first.ok) {
          return;
        }

        const restored = structuredClone(first.scenario) as unknown as MutableScenario;
        restored.id = baseScenario.id;
        restored.revision = baseScenario.revision;
        if (baseScenario.createdFrom === undefined) {
          delete restored.createdFrom;
        } else {
          restored.createdFrom = structuredClone(baseScenario.createdFrom);
        }
        restored.contentHash = baseScenario.contentHash;
        const action = restored.actionPlan[0];
        const target = restored.targets[0];
        if (action === undefined || target === undefined) {
          throw new Error("Expected one Scenario action and target");
        }
        if (path === "/actionPlan/0/parameters/criticalTier") {
          action.parameters.criticalTier = restore;
        } else if (path === "/targets/0/configuration/resolvedArmor") {
          target.configuration.resolvedArmor = restore;
        } else if (path === "/simulation/timeLimitMs") {
          restored.simulation.timeLimitMs = restore as number;
        } else {
          restored.metrics[0] = restore as string;
        }
        expect(canonicalizeJson(restored)).toBe(canonicalizeJson(baseScenario));
      }),
      { numRuns: 50 },
    );
  });
});
