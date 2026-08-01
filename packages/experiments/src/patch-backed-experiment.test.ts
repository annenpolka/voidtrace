import {
  type ArtifactRef,
  attachArtifactContentHash,
  attachResultHash,
  canonicalizeJson,
  type CatalogSnapshot,
  type Experiment,
  type Result,
  type Ruleset,
  type Scenario,
  type ScenarioPatch,
  type Trace,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import rulesetFixture from "../../spec-artifacts/src/rulesets/core.generated.json" with {
  type: "json",
};
import { createExperimentRunner, type ExperimentOutcome, type ScenarioEvaluator } from "./index.ts";
import { materializeScenarioPatch } from "./scenario-patch.ts";

const PRIMARY_METRIC = "damage.health.total";
const PRODUCT_VERSION = "0.0.0";
const DIFFERENT_HASH = `sha256:${"f".repeat(64)}`;
const SECRET = "PRIVATE patch materializer or evaluator detail";
const PROPERTY_RUNS = 15;

type ArtifactIdentity = {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

type PatchFixture = {
  readonly catalog: CatalogSnapshot;
  readonly ruleset: Ruleset;
  readonly base: Scenario;
  readonly patches: ReadonlyArray<ScenarioPatch>;
  readonly experiment: Experiment;
};

type PatchOptions = {
  readonly id?: string;
  readonly revision?: number;
  readonly gameBuild?: string;
  readonly baseScenarioRef?: ArtifactRef & { readonly kind: "voidtrace.scenario" };
  readonly resultId?: string;
  readonly resultRevision?: number;
  readonly replacement?: number;
  readonly operation?: ScenarioPatch["operations"][number];
};

type MutablePatch = {
  contentHash: string;
  operations: Array<{ value: string | number | boolean | null }>;
};

function artifactRef<TArtifact extends ArtifactIdentity>(
  artifact: TArtifact,
): ArtifactRef & { readonly kind: TArtifact["kind"] } {
  return {
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  };
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

function checkedExperiment(value: unknown): Experiment {
  const validation = validateContract("experiment", value);
  if (!validation.ok) {
    throw new Error(`Invalid test Experiment: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedResult(value: unknown): Result {
  const validation = validateContract("result", value);
  if (!validation.ok) {
    throw new Error(`Invalid test Result: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedTrace(value: unknown): Trace {
  const validation = validateContract("trace", value);
  if (!validation.ok) {
    throw new Error(`Invalid test Trace: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

const baseScenario = checkedScenario(scenarioFixture);
const catalog = structuredClone(catalogFixture) as CatalogSnapshot;
const ruleset = structuredClone(rulesetFixture) as Ruleset;

function criticalTier(scenario: Scenario): number {
  const value = scenario.actionPlan[0]?.parameters.criticalTier;
  if (typeof value !== "number") {
    throw new Error("Expected the Direct fixture to have a numeric criticalTier");
  }
  return value;
}

async function makePatch(index: number, options: PatchOptions = {}): Promise<ScenarioPatch> {
  return checkedPatch(
    await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:scenario-patch:0.1.0",
      kind: "voidtrace.scenario-patch",
      schemaVersion: "0.1.0",
      id: options.id ?? `scenario-patch.patch-backed-${index}`,
      revision: options.revision ?? 0,
      gameBuild: options.gameBuild ?? baseScenario.gameBuild,
      baseScenarioRef: options.baseScenarioRef ?? artifactRef(baseScenario),
      resultScenario: {
        id: options.resultId ?? `scenario.patch-backed-variant-${index}`,
        revision: options.resultRevision ?? index,
      },
      operations: [
        options.operation ?? {
          op: "replace",
          path: "/actionPlan/0/parameters/criticalTier",
          value: options.replacement ?? index + 2,
        },
      ],
    } as const),
  );
}

async function makeExperiment(
  variants: Experiment["variants"],
  options: { readonly id?: string; readonly base?: Scenario } = {},
): Promise<Experiment> {
  const base = options.base ?? baseScenario;
  return checkedExperiment(
    await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:experiment:0.3.0",
      kind: "voidtrace.experiment",
      schemaVersion: "0.3.0",
      id: options.id ?? "experiment.patch-backed",
      revision: 0,
      gameBuild: base.gameBuild,
      catalogRef: artifactRef(catalog),
      rulesetRef: artifactRef(ruleset),
      baseScenarioRef: artifactRef(base),
      variants,
      primaryMetric: PRIMARY_METRIC,
    } as const),
  );
}

async function makeUncheckedExperiment(
  variants: ReadonlyArray<Readonly<Record<string, unknown>>>,
): Promise<unknown> {
  return attachArtifactContentHash({
    $schema: "urn:voidtrace:schema:experiment:0.3.0",
    kind: "voidtrace.experiment",
    schemaVersion: "0.3.0",
    id: "experiment.patch-backed-mixed",
    revision: 0,
    gameBuild: baseScenario.gameBuild,
    catalogRef: artifactRef(catalog),
    rulesetRef: artifactRef(ruleset),
    baseScenarioRef: artifactRef(baseScenario),
    variants,
    primaryMetric: PRIMARY_METRIC,
  } as const);
}

async function makeFixture(variantCount: number): Promise<PatchFixture> {
  const patches = await Promise.all(
    Array.from({ length: variantCount }, (_, index) => makePatch(index)),
  );
  const experiment = await makeExperiment(
    patches.map((patch, index) => ({
      id: `variant.patch-backed-${index}`,
      patchRef: artifactRef(patch),
    })),
  );
  return { catalog, ruleset, base: baseScenario, patches, experiment };
}

function requestFor(
  fixture: PatchFixture,
  options: {
    readonly experiment?: unknown;
    readonly scenarios?: ReadonlyArray<unknown>;
    readonly patches?: ReadonlyArray<unknown>;
  } = {},
) {
  return {
    experiment: options.experiment ?? fixture.experiment,
    scenarios: options.scenarios ?? [fixture.base],
    patches: options.patches ?? fixture.patches,
    catalog: fixture.catalog,
    ruleset: fixture.ruleset,
    productVersion: PRODUCT_VERSION,
  };
}

async function makeEvaluationOutcome(
  scenario: Scenario,
  metricValue: number,
): Promise<Extract<Awaited<ReturnType<ScenarioEvaluator>>, { readonly ok: true }>> {
  const fingerprint = await attachResultHash({
    productVersion: PRODUCT_VERSION,
    engineVersion: "0.0.0",
    scenarioSchemaVersion: scenario.schemaVersion,
    catalogHash: scenario.catalogRef.contentHash,
    rulesetHash: scenario.rulesetRef.contentHash,
    scenarioHash: scenario.contentHash,
    seed: 0,
  });
  const trace = checkedTrace(
    await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:trace:0.1.0",
      kind: "voidtrace.trace",
      schemaVersion: "0.1.0",
      id: `trace.${scenario.id}.revision-${scenario.revision}`,
      revision: scenario.revision,
      gameBuild: scenario.gameBuild,
      scenarioRef: artifactRef(scenario),
      fingerprint,
      level: "rules",
      decisions: [],
    } as const),
  );
  const result = checkedResult(
    await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:result:0.2.0",
      kind: "voidtrace.result",
      schemaVersion: "0.2.0",
      id: `result.${scenario.id}.revision-${scenario.revision}`,
      revision: scenario.revision,
      gameBuild: scenario.gameBuild,
      scenarioRef: artifactRef(scenario),
      fingerprint,
      traceRef: artifactRef(trace),
      coverage: {
        verified: [],
        experimental: [],
        disputed: [],
        unsupported: [],
        approximated: [],
      },
      metrics: { [PRIMARY_METRIC]: metricValue },
      damageBySource: {},
      damageByType: {},
      targetStates: {},
      resolvedDefaults: {},
      assumptions: [],
      warnings: [],
    } as const),
  );
  return { ok: true, result, trace };
}

function metricEvaluator(
  calls: Scenario[] = [],
  onCall: (scenario: Scenario, index: number) => void = () => {},
): ScenarioEvaluator {
  return async ({ scenario }) => {
    const member = checkedScenario(scenario);
    onCall(member, calls.length);
    calls.push(member);
    return makeEvaluationOutcome(member, criticalTier(member) * 10);
  };
}

function expectAtomicFailure(outcome: ExperimentOutcome): void {
  expect(outcome.ok).toBe(false);
  if (outcome.ok) {
    throw new Error("Expected a Patch-backed Experiment failure");
  }
  expect(Object.keys(outcome).toSorted()).toEqual(["error", "ok"]);
  expect(outcome).not.toHaveProperty("comparison");
  expect(outcome).not.toHaveProperty("base");
  expect(outcome).not.toHaveProperty("variants");
}

describe("ScenarioPatch-backed Experiment comparison", () => {
  it("resolves permuted supplied Patches, then evaluates base and declared variants exactly once", async () => {
    const fixture = await makeFixture(3);
    const suppliedPatches = [
      fixture.patches[2] as ScenarioPatch,
      fixture.patches[0] as ScenarioPatch,
      fixture.patches[1] as ScenarioPatch,
    ];
    const request = requestFor(fixture, { patches: suppliedPatches });
    const before = canonicalizeJson(request);
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      request,
    );

    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.ok).toBe(true);
    expect(canonicalizeJson(request)).toBe(before);
    expect(calls.map(({ id }) => id)).toEqual([
      fixture.base.id,
      "scenario.patch-backed-variant-0",
      "scenario.patch-backed-variant-1",
      "scenario.patch-backed-variant-2",
    ]);
    expect(calls.map(criticalTier)).toEqual([1, 2, 3, 4]);
    for (const scenario of calls.slice(1)) {
      expect(scenario.createdFrom).toEqual(artifactRef(fixture.base));
      await expect(verifyArtifactContentHash(scenario)).resolves.toBe(true);
    }
    expect(outcome.variants.map(({ id }) => id)).toEqual([
      "variant.patch-backed-0",
      "variant.patch-backed-1",
      "variant.patch-backed-2",
    ]);
    expect(outcome.comparison).toMatchObject({
      experimentRef: artifactRef(fixture.experiment),
      primaryMetric: PRIMARY_METRIC,
      base: {
        scenarioRef: artifactRef(fixture.base),
        metricValue: 10,
        deltaFromBase: 0,
      },
      variants: [
        { id: "variant.patch-backed-0", metricValue: 20, deltaFromBase: 10 },
        { id: "variant.patch-backed-1", metricValue: 30, deltaFromBase: 20 },
        { id: "variant.patch-backed-2", metricValue: 40, deltaFromBase: 30 },
      ],
    });
    expect(outcome.comparison.variants.map(({ scenarioRef }) => scenarioRef)).toEqual(
      calls.slice(1).map(artifactRef),
    );
    await expect(verifyArtifactContentHash(outcome.comparison)).resolves.toBe(true);
  });

  it("preserves 1 to 15 declared variants under arbitrary supplied-Patch permutations", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 15 }),
        fc.uniqueArray(fc.integer({ min: 0, max: 14 }), {
          minLength: 15,
          maxLength: 15,
        }),
        async (variantCount, permutation) => {
          const fixture = await makeFixture(variantCount);
          const suppliedPatches = permutation
            .filter((index) => index < variantCount)
            .map((index) => fixture.patches[index] as ScenarioPatch);
          const calls: Scenario[] = [];

          const outcome = await createExperimentRunner({
            evaluateScenario: metricEvaluator(calls),
          })(requestFor(fixture, { patches: suppliedPatches }));

          if (!outcome.ok) {
            throw new Error(JSON.stringify(outcome.error));
          }
          expect(outcome.ok).toBe(true);
          expect(calls.map(({ id, revision }) => `${id}\0${revision}`)).toEqual([
            `${fixture.base.id}\0${fixture.base.revision}`,
            ...fixture.patches.map(
              ({ resultScenario }) => `${resultScenario.id}\0${resultScenario.revision}`,
            ),
          ]);
          expect(outcome.variants.map(({ id }) => id)).toEqual(
            fixture.experiment.variants.map(({ id }) => id),
          );
          expect(outcome.comparison.base.metricValue).toBe(10);
          expect(outcome.comparison.variants.map(({ metricValue }) => metricValue)).toEqual(
            Array.from({ length: variantCount }, (_, index) => (index + 2) * 10),
          );
          expect(outcome.comparison.variants.map(({ deltaFromBase }) => deltaFromBase)).toEqual(
            Array.from({ length: variantCount }, (_, index) => (index + 1) * 10),
          );
          await expect(verifyArtifactContentHash(outcome.comparison)).resolves.toBe(true);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("rejects missing, extra, duplicate, and stale supplied Patch sets before evaluation", async () => {
    const fixture = await makeFixture(3);
    const extra = await makePatch(99, { replacement: 99 });
    const stale = structuredClone(fixture.patches[0]) as unknown as MutablePatch;
    const staleOperation = stale.operations[0];
    if (staleOperation === undefined) {
      throw new Error("Expected one Patch operation");
    }
    staleOperation.value = 99;
    const malformedSets: ReadonlyArray<ReadonlyArray<unknown>> = [
      fixture.patches.slice(0, 2),
      [...fixture.patches, extra],
      [fixture.patches[0], fixture.patches[1], fixture.patches[1]],
      [stale, fixture.patches[1], fixture.patches[2]],
    ];

    for (const patches of malformedSets) {
      let evaluatorCalls = 0;
      const outcome = await createExperimentRunner({
        evaluateScenario: metricEvaluator([], () => {
          evaluatorCalls += 1;
        }),
      })(requestFor(fixture, { patches }));

      expectAtomicFailure(outcome);
      expect(evaluatorCalls).toBe(0);
    }
  });

  it("rejects a declared Patch whose exact base reference is not the Experiment base", async () => {
    const wrongBasePatch = await makePatch(0, {
      baseScenarioRef: { ...artifactRef(baseScenario), contentHash: DIFFERENT_HASH },
    });
    const fixture: PatchFixture = {
      catalog,
      ruleset,
      base: baseScenario,
      patches: [wrongBasePatch],
      experiment: await makeExperiment([
        { id: "variant.wrong-base", patchRef: artifactRef(wrongBasePatch) },
      ]),
    };
    let evaluatorCalls = 0;

    const outcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator([], () => {
        evaluatorCalls += 1;
      }),
    })(requestFor(fixture));

    expectAtomicFailure(outcome);
    expect(evaluatorCalls).toBe(0);
  });

  it("rejects Patch game-build drift before evaluation", async () => {
    const wrongBuildPatch = await makePatch(0, { gameBuild: "synthetic-other-build" });
    const fixture: PatchFixture = {
      catalog,
      ruleset,
      base: baseScenario,
      patches: [wrongBuildPatch],
      experiment: await makeExperiment([
        { id: "variant.wrong-game-build", patchRef: artifactRef(wrongBuildPatch) },
      ]),
    };
    let evaluatorCalls = 0;

    const outcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator([], () => {
        evaluatorCalls += 1;
      }),
    })(requestFor(fixture));

    expectAtomicFailure(outcome);
    expect(evaluatorCalls).toBe(0);
    if (!outcome.ok) {
      expect(outcome.error).toMatchObject({
        code: "patch-reference-mismatch",
        memberId: "variant.wrong-game-build",
        causeCode: "provenance-mismatch",
      });
    }
  });

  it("requires supplied Patch content to match the exact declared hash", async () => {
    const declared = await makePatch(0, { replacement: 2 });
    const sameIdentityDifferentContent = await makePatch(0, { replacement: 3 });
    expect(sameIdentityDifferentContent.id).toBe(declared.id);
    expect(sameIdentityDifferentContent.revision).toBe(declared.revision);
    expect(sameIdentityDifferentContent.contentHash).not.toBe(declared.contentHash);
    const fixture: PatchFixture = {
      catalog,
      ruleset,
      base: baseScenario,
      patches: [declared],
      experiment: await makeExperiment([
        { id: "variant.exact-hash", patchRef: artifactRef(declared) },
      ]),
    };
    let evaluatorCalls = 0;

    const outcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator([], () => {
        evaluatorCalls += 1;
      }),
    })(requestFor(fixture, { patches: [sameIdentityDifferentContent] }));

    expectAtomicFailure(outcome);
    expect(evaluatorCalls).toBe(0);
    if (!outcome.ok) {
      expect(outcome.error).toMatchObject({
        code: "patch-reference-mismatch",
        memberId: "variant.exact-hash",
      });
    }
  });

  it("rejects Patch-derived Scenarios with missing or duplicated primaryMetric membership", async () => {
    const primaryMetricIndex = baseScenario.metrics.indexOf(PRIMARY_METRIC);
    if (primaryMetricIndex < 0) {
      throw new Error("Expected the base fixture to declare the primary metric");
    }
    const missingMetricPatch = await makePatch(0, {
      operation: {
        op: "replace",
        path: `/metrics/${primaryMetricIndex}`,
        value: "metric.synthetic-other",
      },
    });
    const duplicatedMetricPatch = await makePatch(1, {
      operation: {
        op: "replace",
        path: "/metrics/0",
        value: PRIMARY_METRIC,
      },
    });
    const cases = [
      { id: "variant.metric-missing", patch: missingMetricPatch },
      { id: "variant.metric-duplicated", patch: duplicatedMetricPatch },
    ] as const;

    for (const testCase of cases) {
      const fixture: PatchFixture = {
        catalog,
        ruleset,
        base: baseScenario,
        patches: [testCase.patch],
        experiment: await makeExperiment([
          { id: testCase.id, patchRef: artifactRef(testCase.patch) },
        ]),
      };
      let evaluatorCalls = 0;
      const outcome = await createExperimentRunner({
        evaluateScenario: metricEvaluator([], () => {
          evaluatorCalls += 1;
        }),
      })(requestFor(fixture));

      expectAtomicFailure(outcome);
      expect(evaluatorCalls).toBe(0);
      if (!outcome.ok) {
        expect(outcome.error).toMatchObject({
          code: "comparison-metric-missing",
          memberId: testCase.id,
          causeCode: "scenario-metric-membership",
        });
      }
    }
  });

  it("accepts shared Patch and result IDs when their exact revisions remain distinct", async () => {
    const first = await makePatch(0, {
      id: "scenario-patch.shared-revisions",
      revision: 4,
      resultId: "scenario.shared-patch-result",
      resultRevision: 8,
      replacement: 2,
    });
    const second = await makePatch(1, {
      id: "scenario-patch.shared-revisions",
      revision: 5,
      resultId: "scenario.shared-patch-result",
      resultRevision: 9,
      replacement: 3,
    });
    const fixture: PatchFixture = {
      catalog,
      ruleset,
      base: baseScenario,
      patches: [first, second],
      experiment: await makeExperiment([
        { id: "variant.shared-revision-first", patchRef: artifactRef(first) },
        { id: "variant.shared-revision-second", patchRef: artifactRef(second) },
      ]),
    };
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      requestFor(fixture, { patches: [second, first] }),
    );

    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.variants.map(({ scenario }) => [scenario.id, scenario.revision])).toEqual([
      ["scenario.shared-patch-result", 8],
      ["scenario.shared-patch-result", 9],
    ]);
    expect(calls.map(criticalTier)).toEqual([1, 2, 3]);
    expect(
      outcome.comparison.variants.map(({ metricValue, deltaFromBase }) => ({
        metricValue,
        deltaFromBase,
      })),
    ).toEqual([
      { metricValue: 20, deltaFromBase: 10 },
      { metricValue: 30, deltaFromBase: 20 },
    ]);
  });

  it("rejects colliding result Scenario identities, including the base identity", async () => {
    const duplicateFirst = await makePatch(0, {
      resultId: "scenario.patch-backed-collision",
      resultRevision: 7,
    });
    const duplicateSecond = await makePatch(1, {
      resultId: "scenario.patch-backed-collision",
      resultRevision: 7,
    });
    const baseCollision = await makePatch(2, {
      resultId: baseScenario.id,
      resultRevision: baseScenario.revision,
    });
    const fixtures: PatchFixture[] = [
      {
        catalog,
        ruleset,
        base: baseScenario,
        patches: [duplicateFirst, duplicateSecond],
        experiment: await makeExperiment([
          { id: "variant.collision-first", patchRef: artifactRef(duplicateFirst) },
          { id: "variant.collision-second", patchRef: artifactRef(duplicateSecond) },
        ]),
      },
      {
        catalog,
        ruleset,
        base: baseScenario,
        patches: [baseCollision],
        experiment: await makeExperiment([
          { id: "variant.base-collision", patchRef: artifactRef(baseCollision) },
        ]),
      },
    ];

    for (const fixture of fixtures) {
      let evaluatorCalls = 0;
      const outcome = await createExperimentRunner({
        evaluateScenario: metricEvaluator([], () => {
          evaluatorCalls += 1;
        }),
      })(requestFor(fixture));

      expectAtomicFailure(outcome);
      expect(evaluatorCalls).toBe(0);
    }
  });

  it("rejects duplicate declared Patch identities and mixed resolved/Patch variants", async () => {
    const patch = await makePatch(0);
    const materialized = await materializeScenarioPatch({ patch, scenario: baseScenario });
    expect(materialized.ok).toBe(true);
    if (!materialized.ok) {
      throw new Error(materialized.error.message);
    }
    const duplicateDeclaration = await makeExperiment([
      { id: "variant.duplicate-first", patchRef: artifactRef(patch) },
      { id: "variant.duplicate-second", patchRef: artifactRef(patch) },
    ]);
    const mixedDeclaration = await makeUncheckedExperiment([
      { id: "variant.patch", patchRef: artifactRef(patch) },
      { id: "variant.resolved", scenarioRef: artifactRef(materialized.scenario) },
    ]);
    const cases = [
      {
        experiment: duplicateDeclaration,
        scenarios: [baseScenario],
        patches: [patch],
      },
      {
        experiment: mixedDeclaration,
        scenarios: [baseScenario, materialized.scenario],
        patches: [patch],
      },
    ];

    for (const testCase of cases) {
      let evaluatorCalls = 0;
      const fixture: PatchFixture = {
        catalog,
        ruleset,
        base: baseScenario,
        patches: [patch],
        experiment: duplicateDeclaration,
      };
      const outcome = await createExperimentRunner({
        evaluateScenario: metricEvaluator([], () => {
          evaluatorCalls += 1;
        }),
      })(
        requestFor(fixture, {
          experiment: testCase.experiment,
          scenarios: testCase.scenarios,
          patches: testCase.patches,
        }),
      );

      expectAtomicFailure(outcome);
      expect(evaluatorCalls).toBe(0);
    }
  });

  it("materializes every declared variant before the first evaluator call", async () => {
    const valid = await makePatch(0);
    const lateNoOp = await makePatch(1, { replacement: criticalTier(baseScenario) });
    const fixture: PatchFixture = {
      catalog,
      ruleset,
      base: baseScenario,
      patches: [valid, lateNoOp],
      experiment: await makeExperiment([
        { id: "variant.valid", patchRef: artifactRef(valid) },
        { id: "variant.late-materializer-failure", patchRef: artifactRef(lateNoOp) },
      ]),
    };
    let evaluatorCalls = 0;

    const outcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator([], () => {
        evaluatorCalls += 1;
      }),
    })(requestFor(fixture));

    expectAtomicFailure(outcome);
    expect(evaluatorCalls).toBe(0);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("scenario-patch-materialization-failed");
      expect(outcome.error.causeCode).toBe("scenario-patch-no-op");
      expect(outcome.error.memberId).toBe("variant.late-materializer-failure");
    }
  });

  it("fails closed at arbitrary evaluator positions without partial rows", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 15 }),
        fc.nat(15),
        async (variantCount, failureSeed) => {
          const fixture = await makeFixture(variantCount);
          const memberCount = variantCount + 1;
          const failureIndex = failureSeed % memberCount;
          let calls = 0;
          const evaluator: ScenarioEvaluator = async ({ scenario }) => {
            const member = checkedScenario(scenario);
            const callIndex = calls;
            calls += 1;
            if (callIndex === failureIndex) {
              return {
                ok: false,
                error: {
                  code: "scenario-invalid",
                  message: "Injected evaluator failure",
                },
              };
            }
            return makeEvaluationOutcome(member, criticalTier(member) * 10);
          };

          const outcome = await createExperimentRunner({ evaluateScenario: evaluator })(
            requestFor(fixture, { patches: fixture.patches.toReversed() }),
          );

          expectAtomicFailure(outcome);
          expect(calls).toBe(failureIndex + 1);
          if (!outcome.ok) {
            expect(outcome.error.code).toBe("scenario-evaluation-failed");
            expect(outcome.error.causeCode).toBe("evaluator-reported-failure");
          }
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("isolates Patch-backed execution from caller mutation immediately after invocation", async () => {
    const fixture = await makeFixture(2);
    const mutableRequest = structuredClone(requestFor(fixture));
    const calls: Scenario[] = [];
    const pending = createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      mutableRequest,
    );
    (mutableRequest.experiment as unknown as { id: string }).id = "experiment.caller-mutated";
    (mutableRequest.scenarios[0] as unknown as { contentHash: string }).contentHash =
      DIFFERENT_HASH;
    const mutablePatch = mutableRequest.patches[0] as unknown as MutablePatch;
    const mutableOperation = mutablePatch.operations[0];
    if (mutableOperation === undefined) {
      throw new Error("Expected one Patch operation");
    }
    mutableOperation.value = 63;
    (mutableRequest.patches as ScenarioPatch[]).reverse();

    const outcome = await pending;

    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.ok).toBe(true);
    expect(outcome.comparison.experimentRef.id).toBe(fixture.experiment.id);
    expect(calls.map(criticalTier)).toEqual([1, 2, 3]);
    expect(outcome.comparison.variants.map(({ metricValue }) => metricValue)).toEqual([20, 30]);
  });

  it("rejects accessors and structural Proxy failures without invoking them or leaking details", async () => {
    const fixture = await makeFixture(1);
    let evaluatorCalls = 0;
    const runner = createExperimentRunner({
      evaluateScenario: metricEvaluator([], () => {
        evaluatorCalls += 1;
      }),
    });
    let accessorReads = 0;
    const accessorRequest = { ...requestFor(fixture) };
    Object.defineProperty(accessorRequest, "patches", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error(SECRET);
      },
    });

    const accessorOutcome = await runner(accessorRequest);
    const proxyOutcome = await runner({
      ...requestFor(fixture),
      patches: [
        new Proxy(fixture.patches[0] as ScenarioPatch, {
          ownKeys() {
            throw new Error(SECRET);
          },
        }),
      ],
    });

    expectAtomicFailure(accessorOutcome);
    expectAtomicFailure(proxyOutcome);
    expect(accessorReads).toBe(0);
    expect(evaluatorCalls).toBe(0);
    expect(JSON.stringify(accessorOutcome)).not.toContain(SECRET);
    expect(JSON.stringify(proxyOutcome)).not.toContain(SECRET);
  });

  it("does not expose an evaluator exception after successful Patch materialization", async () => {
    const fixture = await makeFixture(1);
    const outcome = await createExperimentRunner({
      evaluateScenario: async () => {
        throw new Error(SECRET);
      },
    })(requestFor(fixture));

    expectAtomicFailure(outcome);
    expect(JSON.stringify(outcome)).not.toContain(SECRET);
    if (!outcome.ok) {
      expect(outcome.error).toMatchObject({
        code: "scenario-evaluation-failed",
        causeCode: "evaluator-threw",
      });
    }
  });
});
