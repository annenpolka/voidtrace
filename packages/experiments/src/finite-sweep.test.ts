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

const PRIMARY_METRIC = "damage.health.total";
const PRODUCT_VERSION = "0.0.0";
const SWEEP_PATH = "/actionPlan/0/parameters/criticalTier";
const SECOND_PATH = "/targets/0/configuration/resolvedArmor";
const SECRET = "PRIVATE finite Sweep caller or evaluator detail";
const PROPERTY_RUNS = 15;

type SweepScalar = string | number | boolean;
type PatchOperation = ScenarioPatch["operations"][number];

type ArtifactIdentity = {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

type SweepPointSpec = {
  readonly value: SweepScalar;
  readonly id?: string;
  readonly patchPath?: string;
  readonly patchValue?: SweepScalar;
  readonly pointPath?: string;
  readonly pointValue?: SweepScalar;
  readonly operations?: ReadonlyArray<PatchOperation>;
};

type SweepFixture = {
  readonly catalog: CatalogSnapshot;
  readonly ruleset: Ruleset;
  readonly base: Scenario;
  readonly patches: ReadonlyArray<ScenarioPatch>;
  readonly experiment: Experiment;
};

type MutableSweepRequest = {
  experiment: {
    id: string;
    variants: Array<{
      id: string;
      sweepPoint: { path: string; value: SweepScalar };
    }>;
  };
  scenarios: Array<{ contentHash: string }>;
  patches: Array<{
    operations: Array<{ path: string; value: SweepScalar }>;
  }>;
};

type FailureCode = Extract<ExperimentOutcome, { readonly ok: false }>["error"]["code"];

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
    throw new Error(`Invalid finite Sweep Scenario: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedPatch(value: unknown): ScenarioPatch {
  const validation = validateContract("scenario-patch", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Sweep ScenarioPatch: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedExperiment(value: unknown): Experiment {
  const validation = validateContract("experiment", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Sweep Experiment: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedResult(value: unknown): Result {
  const validation = validateContract("result", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Sweep Result: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedTrace(value: unknown): Trace {
  const validation = validateContract("trace", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Sweep Trace: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

const baseScenario = checkedScenario(scenarioFixture);
const catalog = structuredClone(catalogFixture) as CatalogSnapshot;
const ruleset = structuredClone(rulesetFixture) as Ruleset;

function criticalTier(scenario: Scenario): number {
  const value = scenario.actionPlan[0]?.parameters.criticalTier;
  if (typeof value !== "number") {
    throw new Error("Expected the finite Sweep fixture to have a numeric criticalTier");
  }
  return value;
}

async function makePatch(index: number, spec: SweepPointSpec): Promise<ScenarioPatch> {
  const patchValue = spec.patchValue ?? spec.value;
  const operations =
    spec.operations ??
    ([
      {
        op: "replace",
        path: spec.patchPath ?? SWEEP_PATH,
        value: patchValue,
      },
    ] as const);
  return checkedPatch(
    await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:scenario-patch:0.1.0",
      kind: "voidtrace.scenario-patch",
      schemaVersion: "0.1.0",
      id: `scenario-patch.finite-sweep-${index}`,
      revision: index,
      gameBuild: baseScenario.gameBuild,
      baseScenarioRef: artifactRef(baseScenario),
      resultScenario: {
        id: `scenario.finite-sweep-${index}`,
        revision: index,
      },
      operations,
    } as const),
  );
}

async function makeFixture(specs: ReadonlyArray<SweepPointSpec>): Promise<SweepFixture> {
  const patches = await Promise.all(specs.map((spec, index) => makePatch(index, spec)));
  const experiment = checkedExperiment(
    await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:experiment:0.3.0",
      kind: "voidtrace.experiment",
      schemaVersion: "0.3.0",
      id: "experiment.finite-sweep",
      revision: 0,
      gameBuild: baseScenario.gameBuild,
      catalogRef: artifactRef(catalog),
      rulesetRef: artifactRef(ruleset),
      baseScenarioRef: artifactRef(baseScenario),
      variants: patches.map((patch, index) => {
        const spec = specs[index];
        if (spec === undefined) {
          throw new Error("Finite Sweep fixture lost a point specification");
        }
        return {
          id: spec.id ?? `variant.finite-sweep-${index}`,
          patchRef: artifactRef(patch),
          sweepPoint: {
            path: spec.pointPath ?? spec.patchPath ?? SWEEP_PATH,
            value: spec.pointValue ?? spec.value,
          },
        };
      }),
      primaryMetric: PRIMARY_METRIC,
    } as const),
  );
  return { catalog, ruleset, base: baseScenario, patches, experiment };
}

async function makeUncheckedExperiment(
  variants: ReadonlyArray<Readonly<Record<string, unknown>>>,
  overrides: Readonly<Record<string, unknown>> = {},
): Promise<unknown> {
  return attachArtifactContentHash({
    $schema: "urn:voidtrace:schema:experiment:0.3.0",
    kind: "voidtrace.experiment",
    schemaVersion: "0.3.0",
    id: "experiment.finite-sweep-unchecked",
    revision: 0,
    gameBuild: baseScenario.gameBuild,
    catalogRef: artifactRef(catalog),
    rulesetRef: artifactRef(ruleset),
    baseScenarioRef: artifactRef(baseScenario),
    variants,
    primaryMetric: PRIMARY_METRIC,
    ...overrides,
  });
}

function requestFor(
  fixture: SweepFixture,
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

function expectAtomicFailure(outcome: ExperimentOutcome, code?: FailureCode, causeCode?: string) {
  expect(outcome.ok).toBe(false);
  if (outcome.ok) {
    throw new Error("Expected a finite Sweep failure");
  }
  if (code !== undefined) {
    expect(outcome.error.code).toBe(code);
  }
  if (causeCode !== undefined) {
    expect(outcome.error.causeCode).toBe(causeCode);
  }
  expect(Object.keys(outcome).toSorted()).toEqual(["error", "ok"]);
  expect(outcome).not.toHaveProperty("comparison");
  expect(outcome).not.toHaveProperty("base");
  expect(outcome).not.toHaveProperty("variants");
  expect(outcome).not.toHaveProperty("points");
  expect(outcome).not.toHaveProperty("materializedScenarios");
  expect(outcome).not.toHaveProperty("evaluations");
  return outcome.error;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

describe("SWP-001 finite parameter Sweep", () => {
  it("materializes the exact Patch set before evaluating base then declared points", async () => {
    const fixture = await makeFixture([{ value: 7 }, { value: 2 }, { value: 10 }]);
    const request = requestFor(fixture, {
      patches: [fixture.patches[1], fixture.patches[2], fixture.patches[0]],
    });
    const before = canonicalizeJson(request);
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      request,
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(canonicalizeJson(request)).toBe(before);
    expect(calls.map(criticalTier)).toEqual([1, 7, 2, 10]);
    expect(calls.map(({ id }) => id)).toEqual([
      fixture.base.id,
      "scenario.finite-sweep-0",
      "scenario.finite-sweep-1",
      "scenario.finite-sweep-2",
    ]);
    expect(outcome.variants.map(({ id }) => id)).toEqual([
      "variant.finite-sweep-0",
      "variant.finite-sweep-1",
      "variant.finite-sweep-2",
    ]);
    for (const scenario of calls.slice(1)) {
      expect(scenario.createdFrom).toEqual(artifactRef(fixture.base));
      await expect(verifyArtifactContentHash(scenario)).resolves.toBe(true);
    }
    expect(outcome.comparison).toMatchObject({
      experimentRef: artifactRef(fixture.experiment),
      primaryMetric: PRIMARY_METRIC,
      base: {
        scenarioRef: artifactRef(fixture.base),
        metricValue: 10,
        deltaFromBase: 0,
      },
      variants: [
        { id: "variant.finite-sweep-0", metricValue: 70, deltaFromBase: 60 },
        { id: "variant.finite-sweep-1", metricValue: 20, deltaFromBase: 10 },
        { id: "variant.finite-sweep-2", metricValue: 100, deltaFromBase: 90 },
      ],
    });
    expect(outcome.comparison.variants.map(({ scenarioRef }) => scenarioRef)).toEqual(
      calls.slice(1).map(artifactRef),
    );
    await expect(verifyArtifactContentHash(outcome.comparison)).resolves.toBe(true);
  });

  it("preserves 1 to 15 declared points under arbitrary supplied-Patch permutations", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 15 }),
        fc.uniqueArray(fc.integer({ min: 2, max: 1_000 }), {
          minLength: 15,
          maxLength: 15,
        }),
        fc.uniqueArray(fc.integer({ min: 0, max: 14 }), {
          minLength: 15,
          maxLength: 15,
        }),
        async (pointCount, valuePool, permutation) => {
          const values = valuePool.slice(0, pointCount);
          const fixture = await makeFixture(values.map((value) => ({ value })));
          const supplied = permutation
            .filter((index) => index < pointCount)
            .map((index) => fixture.patches[index] as ScenarioPatch);
          const calls: Scenario[] = [];

          const outcome = await createExperimentRunner({
            evaluateScenario: metricEvaluator(calls),
          })(requestFor(fixture, { patches: supplied }));

          expect(outcome.ok).toBe(true);
          if (!outcome.ok) {
            throw new Error(JSON.stringify(outcome.error));
          }
          expect(calls.map(criticalTier)).toEqual([1, ...values]);
          expect(outcome.variants.map(({ id }) => id)).toEqual(
            values.map((_, index) => `variant.finite-sweep-${index}`),
          );
          expect(outcome.comparison.variants.map(({ metricValue }) => metricValue)).toEqual(
            values.map((value) => value * 10),
          );
          expect(outcome.comparison.variants.map(({ deltaFromBase }) => deltaFromBase)).toEqual(
            values.map((value) => value * 10 - 10),
          );
          await expect(verifyArtifactContentHash(outcome.comparison)).resolves.toBe(true);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("rejects zero or sixteen points at the Experiment Contract boundary", async () => {
    const fixture = await makeFixture([{ value: 2 }]);
    const sixteenPatches = await Promise.all(
      Array.from({ length: 16 }, (_, index) => makePatch(index, { value: index + 2 })),
    );
    const invalidExperiments = [
      await makeUncheckedExperiment([]),
      await makeUncheckedExperiment(
        sixteenPatches.map((patch, index) => ({
          id: `variant.boundary-${index}`,
          patchRef: artifactRef(patch),
          sweepPoint: { path: SWEEP_PATH, value: index + 2 },
        })),
      ),
    ];

    for (const [index, experiment] of invalidExperiments.entries()) {
      const calls: Scenario[] = [];
      const outcome = await createExperimentRunner({
        evaluateScenario: metricEvaluator(calls),
      })(
        requestFor(fixture, {
          experiment,
          patches: index === 0 ? [] : sixteenPatches,
        }),
      );

      expectAtomicFailure(outcome, "experiment-invalid");
      expect(calls).toEqual([]);
    }
  });

  it("materializes every declared point before the first evaluator call", async () => {
    const fixture = await makeFixture([{ value: 2 }, { value: 3 }, { value: 1 }]);
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      requestFor(fixture),
    );

    expectAtomicFailure(outcome, "scenario-patch-materialization-failed", "scenario-patch-no-op");
    expect(calls).toEqual([]);
  });

  it("requires every point to use the same Scenario path", async () => {
    const fixture = await makeFixture([
      { value: 2 },
      {
        value: 0,
        patchPath: SECOND_PATH,
        pointPath: SECOND_PATH,
      },
    ]);
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      requestFor(fixture),
    );

    const error = expectAtomicFailure(outcome, "sweep-invalid", "multiple-sweep-paths");
    expect(error).toMatchObject({
      path: "/variants/1/sweepPoint/path",
      memberId: "variant.finite-sweep-1",
    });
    expect(calls).toEqual([]);
  });

  it("requires exactly one replace operation in every Sweep Patch", async () => {
    const fixture = await makeFixture([
      {
        value: 2,
        operations: [
          { op: "replace", path: SWEEP_PATH, value: 2 },
          { op: "replace", path: SECOND_PATH, value: 0 },
        ],
      },
    ]);
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      requestFor(fixture),
    );

    expectAtomicFailure(outcome, "sweep-invalid", "sweep-patch-operation-count");
    expect(calls).toEqual([]);
  });

  it.each([
    {
      name: "path",
      spec: { value: 2, pointPath: SECOND_PATH },
      causeCode: "sweep-path-mismatch",
      path: "/variants/0/sweepPoint/path",
    },
    {
      name: "canonical value",
      spec: { value: 2, pointValue: 3 },
      causeCode: "sweep-value-mismatch",
      path: "/variants/0/sweepPoint/value",
    },
  ])("requires exact $name agreement between a point and its Patch", async (testCase) => {
    const fixture = await makeFixture([testCase.spec]);
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      requestFor(fixture),
    );

    const error = expectAtomicFailure(outcome, "sweep-invalid", testCase.causeCode);
    expect(error).toMatchObject({
      path: testCase.path,
      memberId: "variant.finite-sweep-0",
    });
    expect(calls).toEqual([]);
  });

  it.each([
    { name: "equal integers", values: [2, 2] },
    { name: "canonical zero and negative zero", values: [0, -0] },
  ])("rejects duplicate $name instead of sorting or deduplicating", async ({ values }) => {
    const fixture = await makeFixture(values.map((value) => ({ value })));
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      requestFor(fixture),
    );

    const error = expectAtomicFailure(outcome, "sweep-invalid", "duplicate-sweep-value");
    expect(error).toMatchObject({
      path: "/variants/1/sweepPoint/value",
      memberId: "variant.finite-sweep-1",
    });
    expect(calls).toEqual([]);
  });

  it("keeps the base as a separate row and rejects a same-valued point as a Patch no-op", async () => {
    const fixture = await makeFixture([{ value: 1 }]);
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      requestFor(fixture),
    );

    const error = expectAtomicFailure(
      outcome,
      "scenario-patch-materialization-failed",
      "scenario-patch-no-op",
    );
    expect(error.memberId).toBe("variant.finite-sweep-0");
    expect(calls).toEqual([]);
  });

  it("rejects mixed source modes and malformed Sweep schemas before evaluation", async () => {
    const fixture = await makeFixture([{ value: 2 }, { value: 3 }]);
    const sweepVariant = {
      id: "variant.sweep",
      patchRef: artifactRef(fixture.patches[0] as ScenarioPatch),
      sweepPoint: { path: SWEEP_PATH, value: 2 },
    };
    const invalidExperiments = [
      await makeUncheckedExperiment([
        sweepVariant,
        {
          id: "variant.ordinary-patch",
          patchRef: artifactRef(fixture.patches[1] as ScenarioPatch),
        },
      ]),
      await makeUncheckedExperiment([
        sweepVariant,
        {
          id: "variant.resolved",
          scenarioRef: artifactRef(fixture.base),
        },
      ]),
      await makeUncheckedExperiment([sweepVariant], {
        $schema: "urn:voidtrace:schema:experiment:0.2.0",
        schemaVersion: "0.2.0",
      }),
      await makeUncheckedExperiment([
        {
          ...sweepVariant,
          sweepPoint: {
            ...sweepVariant.sweepPoint,
            range: { from: 0, to: 1, step: 0.1 },
          },
        },
      ]),
    ];

    for (const experiment of invalidExperiments) {
      const calls: Scenario[] = [];
      const outcome = await createExperimentRunner({
        evaluateScenario: metricEvaluator(calls),
      })(requestFor(fixture, { experiment }));

      expectAtomicFailure(outcome, "experiment-invalid");
      expect(calls).toEqual([]);
    }
  });

  it("fails closed at arbitrary evaluator failure positions without partial output", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 15 }),
        fc.nat(15),
        fc.boolean(),
        async (pointCount, failureSeed, shouldThrow) => {
          const fixture = await makeFixture(
            Array.from({ length: pointCount }, (_, index) => ({ value: index + 2 })),
          );
          const failureIndex = failureSeed % (pointCount + 1);
          let calls = 0;
          const evaluator: ScenarioEvaluator = async ({ scenario }) => {
            const callIndex = calls;
            calls += 1;
            if (callIndex === failureIndex) {
              if (shouldThrow) {
                throw new Error(SECRET);
              }
              return {
                ok: false,
                error: {
                  code: "scenario-invalid",
                  message: SECRET,
                },
              };
            }
            const member = checkedScenario(scenario);
            return makeEvaluationOutcome(member, criticalTier(member) * 10);
          };

          const outcome = await createExperimentRunner({ evaluateScenario: evaluator })(
            requestFor(fixture),
          );

          const error = expectAtomicFailure(
            outcome,
            "scenario-evaluation-failed",
            shouldThrow ? "evaluator-threw" : "evaluator-reported-failure",
          );
          expect(calls).toBe(failureIndex + 1);
          expect(error.memberId).toBe(
            failureIndex === 0 ? undefined : `variant.finite-sweep-${failureIndex - 1}`,
          );
          expect(JSON.stringify(outcome)).not.toContain(SECRET);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("isolates the run from caller mutation immediately after invocation", async () => {
    const fixture = await makeFixture([{ value: 9 }, { value: 2 }, { value: 7 }]);
    const request = structuredClone(requestFor(fixture));
    const mutable = request as unknown as MutableSweepRequest;
    const calls: Scenario[] = [];
    const runner = createExperimentRunner({ evaluateScenario: metricEvaluator(calls) });

    const pending = runner(request);
    mutable.experiment.id = "experiment.mutated-after-invocation";
    mutable.experiment.variants.reverse();
    required(mutable.experiment.variants[0], "Expected a mutable Sweep point").sweepPoint.value =
      99;
    mutable.patches.reverse();
    required(
      required(mutable.patches[0], "Expected a mutable Sweep Patch").operations[0],
      "Expected a mutable Sweep operation",
    ).value = 99;
    required(mutable.scenarios[0], "Expected a mutable base Scenario").contentHash =
      `sha256:${"f".repeat(64)}`;
    const outcome = await pending;

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(calls.map(criticalTier)).toEqual([1, 9, 2, 7]);
    expect(outcome.comparison.experimentRef.id).toBe("experiment.finite-sweep");
    expect(outcome.variants.map(({ id }) => id)).toEqual([
      "variant.finite-sweep-0",
      "variant.finite-sweep-1",
      "variant.finite-sweep-2",
    ]);
  });

  it("does not invoke accessor values while snapshotting Sweep metadata", async () => {
    const fixture = await makeFixture([{ value: 2 }]);
    const request = structuredClone(requestFor(fixture));
    const mutable = request as unknown as MutableSweepRequest;
    let accessorReads = 0;
    const point = required(
      mutable.experiment.variants[0],
      "Expected a mutable Sweep point",
    ).sweepPoint;
    Object.defineProperty(point, "value", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error(SECRET);
      },
    });
    const calls: Scenario[] = [];

    const outcome = await createExperimentRunner({ evaluateScenario: metricEvaluator(calls) })(
      request,
    );

    expectAtomicFailure(outcome, "experiment-invalid");
    expect(accessorReads).toBe(0);
    expect(calls).toEqual([]);
    expect(JSON.stringify(outcome)).not.toContain(SECRET);
  });

  it("snapshots through value-get Proxies and contains structural Proxy failures", async () => {
    const fixture = await makeFixture([{ value: 2 }]);
    const transparentRequest = structuredClone(requestFor(fixture));
    const transparentMutable = transparentRequest as unknown as MutableSweepRequest;
    const transparentVariant = required(
      transparentMutable.experiment.variants[0],
      "Expected a transparent Sweep point",
    );
    const originalPoint = transparentVariant.sweepPoint;
    let valueReads = 0;
    transparentVariant.sweepPoint = new Proxy(originalPoint, {
      get(target, property, receiver) {
        valueReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const transparentCalls: Scenario[] = [];

    const transparentOutcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator(transparentCalls),
    })(transparentRequest);

    expect(transparentOutcome.ok).toBe(true);
    expect(valueReads).toBe(0);
    expect(transparentCalls.map(criticalTier)).toEqual([1, 2]);

    const trappedRequest = structuredClone(requestFor(fixture));
    const trappedMutable = trappedRequest as unknown as MutableSweepRequest;
    trappedMutable.patches[0] = new Proxy(
      required(trappedMutable.patches[0], "Expected a trapped Sweep Patch"),
      {
        ownKeys() {
          throw new Error(SECRET);
        },
      },
    );
    const trappedCalls: Scenario[] = [];
    const trappedOutcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator(trappedCalls),
    })(trappedRequest);

    expectAtomicFailure(trappedOutcome, "experiment-invalid");
    expect(trappedCalls).toEqual([]);
    expect(JSON.stringify(trappedOutcome)).not.toContain(SECRET);
  });
});
