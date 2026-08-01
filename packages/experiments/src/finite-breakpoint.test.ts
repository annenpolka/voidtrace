import {
  type ArtifactRef,
  attachArtifactContentHash,
  attachResultHash,
  type CatalogSnapshot,
  canonicalizeJson,
  type Experiment,
  type FiniteBreakpointAnalysis,
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
import breakpointLeftExperimentFixture from "../../../data/fixtures/experiments/breakpoint-left-sweep.experiment.json" with {
  type: "json",
};
import breakpointRightScenarioFixture from "../../../data/fixtures/experiments/breakpoint-right.scenario.json" with {
  type: "json",
};
import breakpointRightExperimentFixture from "../../../data/fixtures/experiments/breakpoint-right-sweep.experiment.json" with {
  type: "json",
};
import breakpointRightPatch0Fixture from "../../../data/fixtures/experiments/breakpoint-right-sweep-0.scenario-patch.json" with {
  type: "json",
};
import breakpointRightPatch2Fixture from "../../../data/fixtures/experiments/breakpoint-right-sweep-2.scenario-patch.json" with {
  type: "json",
};
import breakpointRightPatch3Fixture from "../../../data/fixtures/experiments/breakpoint-right-sweep-3.scenario-patch.json" with {
  type: "json",
};
import leftPatch0Fixture from "../../../data/fixtures/experiments/critical-tier-sweep-0.scenario-patch.json" with {
  type: "json",
};
import leftPatch2Fixture from "../../../data/fixtures/experiments/critical-tier-sweep-2.scenario-patch.json" with {
  type: "json",
};
import leftPatch3Fixture from "../../../data/fixtures/experiments/critical-tier-sweep-3.scenario-patch.json" with {
  type: "json",
};
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import rulesetFixture from "../../spec-artifacts/src/rulesets/core.generated.json" with {
  type: "json",
};
import {
  createFiniteBreakpointRunner,
  type FiniteBreakpointOutcome,
  type RunFiniteBreakpointAnalysisRequest,
  runFiniteBreakpointAnalysis,
  type ScenarioEvaluator,
} from "./index.ts";

const PRIMARY_METRIC = "damage.health.total";
const ALTERNATE_METRIC = "target.health.remaining";
const PRODUCT_VERSION = "0.0.0";
const ENGINE_VERSION = "0.0.0";
const NUMERIC_PATH = "/actionPlan/0/parameters/criticalTier";
const SECOND_NUMERIC_PATH = "/targets/0/configuration/resolvedArmor";
const STRING_PATH = "/attacker/configuration/attackModeId";
const SECRET = "PRIVATE finite Breakpoint caller or evaluator detail";
const PROPERTY_RUNS = 8;

type SweepScalar = string | number | boolean;

type ArtifactIdentity = {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

type SideName = "left" | "right";

type SideFixture = {
  readonly base: Scenario;
  readonly patches: ReadonlyArray<ScenarioPatch>;
  readonly experiment: Experiment;
};

type PairFixture = {
  readonly left: SideFixture;
  readonly right: SideFixture;
  readonly catalog: CatalogSnapshot;
  readonly ruleset: Ruleset;
};

type MetricSeries = {
  readonly left: ReadonlyArray<number>;
  readonly right: ReadonlyArray<number>;
};

type OracleCandidate =
  | { readonly type: "exact-equality"; readonly sampleIndex: number }
  | {
      readonly type: "sampled-sign-reversal";
      readonly lowerSampleIndex: number;
      readonly upperSampleIndex: number;
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

function checkedCatalog(value: unknown): CatalogSnapshot {
  const validation = validateContract("catalog-snapshot", value);
  if (!validation.ok) {
    throw new Error(`Invalid Catalog fixture: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedRuleset(value: unknown): Ruleset {
  const validation = validateContract("ruleset", value);
  if (!validation.ok) {
    throw new Error(`Invalid Ruleset fixture: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedScenario(value: unknown): Scenario {
  const validation = validateContract("scenario", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Breakpoint Scenario: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedPatch(value: unknown): ScenarioPatch {
  const validation = validateContract("scenario-patch", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Breakpoint Patch: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedExperiment(value: unknown): Experiment {
  const validation = validateContract("experiment", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Breakpoint Experiment: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedResult(value: unknown): Result {
  const validation = validateContract("result", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Breakpoint Result: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedTrace(value: unknown): Trace {
  const validation = validateContract("trace", value);
  if (!validation.ok) {
    throw new Error(`Invalid finite Breakpoint Trace: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

const catalog = checkedCatalog(catalogFixture);
const ruleset = checkedRuleset(rulesetFixture);

async function makeBase(side: SideName): Promise<Scenario> {
  const { contentHash: _contentHash, ...body } = structuredClone(scenarioFixture);
  return checkedScenario(
    await attachArtifactContentHash({
      ...body,
      id: `scenario.breakpoint-${side}-base`,
      revision: 0,
    }),
  );
}

async function makeSide(
  side: SideName,
  coordinates: ReadonlyArray<SweepScalar>,
  options: {
    readonly path?: string;
    readonly primaryMetric?: string;
  } = {},
): Promise<SideFixture> {
  const base = await makeBase(side);
  const path = options.path ?? NUMERIC_PATH;
  const patches = await Promise.all(
    coordinates.map(async (value, index) =>
      checkedPatch(
        await attachArtifactContentHash({
          $schema: "urn:voidtrace:schema:scenario-patch:0.1.0",
          kind: "voidtrace.scenario-patch",
          schemaVersion: "0.1.0",
          id: `scenario-patch.breakpoint-${side}-${index}`,
          revision: 0,
          gameBuild: base.gameBuild,
          baseScenarioRef: artifactRef(base),
          resultScenario: {
            id: `scenario.breakpoint-${side}-point-${index}`,
            revision: index,
          },
          operations: [{ op: "replace", path, value }],
        } as const),
      ),
    ),
  );
  const experiment = checkedExperiment(
    await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:experiment:0.3.0",
      kind: "voidtrace.experiment",
      schemaVersion: "0.3.0",
      id: `experiment.breakpoint-${side}`,
      revision: 0,
      gameBuild: base.gameBuild,
      catalogRef: artifactRef(catalog),
      rulesetRef: artifactRef(ruleset),
      baseScenarioRef: artifactRef(base),
      variants: patches.map((patch, index) => ({
        id: `variant.breakpoint-${side}-${index}`,
        patchRef: artifactRef(patch),
        sweepPoint: { path, value: coordinates[index] as SweepScalar },
      })),
      primaryMetric: options.primaryMetric ?? PRIMARY_METRIC,
    } as const),
  );
  return { base, patches, experiment };
}

async function makePair(
  leftCoordinates: ReadonlyArray<SweepScalar>,
  options: {
    readonly rightCoordinates?: ReadonlyArray<SweepScalar>;
    readonly leftPath?: string;
    readonly rightPath?: string;
    readonly leftMetric?: string;
    readonly rightMetric?: string;
  } = {},
): Promise<PairFixture> {
  const [left, right] = await Promise.all([
    makeSide("left", leftCoordinates, {
      ...(options.leftPath === undefined ? {} : { path: options.leftPath }),
      ...(options.leftMetric === undefined ? {} : { primaryMetric: options.leftMetric }),
    }),
    makeSide("right", options.rightCoordinates ?? leftCoordinates, {
      ...(options.rightPath === undefined ? {} : { path: options.rightPath }),
      ...(options.rightMetric === undefined ? {} : { primaryMetric: options.rightMetric }),
    }),
  ]);
  return { left, right, catalog, ruleset };
}

function requestFor(pair: PairFixture): RunFiniteBreakpointAnalysisRequest {
  return {
    analysisId: "finite-breakpoint-analysis.test",
    analysisRevision: 0,
    left: {
      experiment: pair.left.experiment,
      scenarios: [pair.left.base],
      patches: pair.left.patches,
    },
    right: {
      experiment: pair.right.experiment,
      scenarios: [pair.right.base],
      patches: pair.right.patches,
    },
    catalog: pair.catalog,
    ruleset: pair.ruleset,
    productVersion: PRODUCT_VERSION,
  };
}

async function makeEvaluationOutcome(
  scenario: Scenario,
  metricValue: number,
  versions: {
    readonly productVersion?: string;
    readonly engineVersion?: string;
    readonly scenarioSchemaVersion?: string;
  } = {},
): Promise<Extract<Awaited<ReturnType<ScenarioEvaluator>>, { readonly ok: true }>> {
  const fingerprint = await attachResultHash({
    productVersion: versions.productVersion ?? PRODUCT_VERSION,
    engineVersion: versions.engineVersion ?? ENGINE_VERSION,
    scenarioSchemaVersion: versions.scenarioSchemaVersion ?? scenario.schemaVersion,
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
      metrics: {
        [PRIMARY_METRIC]: metricValue,
        [ALTERNATE_METRIC]: metricValue,
      },
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

function scenarioLocation(scenario: Scenario): {
  readonly side: SideName;
  readonly index: number | null;
} {
  const match = /^scenario\.breakpoint-(left|right)-(base|point-(\d+))$/.exec(scenario.id);
  if (match === null) {
    throw new Error(`Unexpected finite Breakpoint Scenario ID: ${scenario.id}`);
  }
  return {
    side: match[1] as SideName,
    index: match[2] === "base" ? null : Number(match[3]),
  };
}

function metricEvaluator(
  series: MetricSeries,
  options: {
    readonly calls?: Scenario[];
    readonly versions?: (
      side: SideName,
      index: number | null,
    ) => {
      readonly productVersion?: string;
      readonly engineVersion?: string;
      readonly scenarioSchemaVersion?: string;
    };
  } = {},
): ScenarioEvaluator {
  return async ({ scenario }) => {
    const member = checkedScenario(scenario);
    const location = scenarioLocation(member);
    options.calls?.push(member);
    const metricValue =
      location.index === null ? 0 : (series[location.side][location.index] as number);
    return makeEvaluationOutcome(
      member,
      metricValue,
      options.versions?.(location.side, location.index),
    );
  };
}

function expectAtomicFailure(
  outcome: FiniteBreakpointOutcome,
  code?: Extract<FiniteBreakpointOutcome, { readonly ok: false }>["error"]["code"],
  causeCode?: string,
) {
  expect(outcome.ok).toBe(false);
  if (outcome.ok) {
    throw new Error("Expected finite Breakpoint failure");
  }
  if (code !== undefined) {
    expect(outcome.error.code).toBe(code);
  }
  if (causeCode !== undefined) {
    expect(outcome.error.causeCode).toBe(causeCode);
  }
  expect(Object.keys(outcome).toSorted()).toEqual(["error", "ok"]);
  expect(outcome).not.toHaveProperty("analysis");
  expect(outcome).not.toHaveProperty("samples");
  expect(outcome).not.toHaveProperty("comparison");
  expect(outcome).not.toHaveProperty("left");
  expect(outcome).not.toHaveProperty("right");
  expect(outcome).not.toHaveProperty("evaluations");
  return outcome.error;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function independentCandidates(differences: ReadonlyArray<number>): ReadonlyArray<OracleCandidate> {
  const result: OracleCandidate[] = [];
  for (let index = 0; index < differences.length; index += 1) {
    const current = normalizeZero(differences[index] as number);
    if (current === 0) {
      result.push({ type: "exact-equality", sampleIndex: index });
    }
    if (index === 0) {
      continue;
    }
    const previous = normalizeZero(differences[index - 1] as number);
    if (
      current !== 0 &&
      previous !== 0 &&
      ((previous < 0 && current > 0) || (previous > 0 && current < 0))
    ) {
      result.push({
        type: "sampled-sign-reversal",
        lowerSampleIndex: index - 1,
        upperSampleIndex: index,
      });
    }
  }
  return result;
}

function assertDeeplyFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return;
  }
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    assertDeeplyFrozen(child, seen);
  }
}

describe("BRK-001 finite sampled Breakpoint analysis", () => {
  it("runs the checked-in two-Sweep fixture through the default Kernel runner", async () => {
    const outcome = await runFiniteBreakpointAnalysis({
      analysisId: "finite-breakpoint-analysis.golden",
      analysisRevision: 0,
      left: {
        experiment: breakpointLeftExperimentFixture,
        scenarios: [scenarioFixture],
        patches: [leftPatch0Fixture, leftPatch2Fixture, leftPatch3Fixture],
      },
      right: {
        experiment: breakpointRightExperimentFixture,
        scenarios: [breakpointRightScenarioFixture],
        patches: [
          breakpointRightPatch0Fixture,
          breakpointRightPatch2Fixture,
          breakpointRightPatch3Fixture,
        ],
      },
      catalog: catalogFixture,
      ruleset: rulesetFixture,
      productVersion: PRODUCT_VERSION,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.analysis).toMatchObject({
      kind: "voidtrace.finite-breakpoint-analysis",
      schemaVersion: "0.1.0",
      id: "finite-breakpoint-analysis.golden",
      revision: 0,
      method: "finite-scan",
      primaryMetric: ALTERNATE_METRIC,
      sweepPath: NUMERIC_PATH,
      samples: [
        { value: 0, leftMetricValue: 950, rightMetricValue: 1000, signedDifference: -50 },
        { value: 2, leftMetricValue: 850, rightMetricValue: 800, signedDifference: 50 },
        { value: 3, leftMetricValue: 800, rightMetricValue: 700, signedDifference: 100 },
      ],
      finding: {
        type: "sampled-sign-reversal",
        lowerSampleIndex: 0,
        upperSampleIndex: 1,
      },
    });
    await expect(verifyArtifactContentHash(outcome.analysis)).resolves.toBe(true);
    assertDeeplyFrozen(outcome);
  });

  it("reports one exact equality without treating zero-adjacent pairs as reversals", async () => {
    const pair = await makePair([0, 2, 3]);
    const calls: Scenario[] = [];
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [10, 20, 30], right: [5, 20, 25] }, { calls }),
    })(requestFor(pair));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.analysis.finding).toEqual({ type: "exact-equality", sampleIndex: 1 });
    expect(outcome.analysis.samples.map(({ signedDifference }) => signedDifference)).toEqual([
      5, 0, 5,
    ]);
    expect(calls).toHaveLength(8);
  });

  it("reports one adjacent sampled sign reversal without claiming a continuous root", async () => {
    const pair = await makePair([0, 2]);
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0, 20], right: [10, 10] }),
    })(requestFor(pair));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.analysis.finding).toEqual({
      type: "sampled-sign-reversal",
      lowerSampleIndex: 0,
      upperSampleIndex: 1,
    });
    expect(outcome.analysis).not.toHaveProperty("root");
    expect(outcome.analysis).not.toHaveProperty("interpolatedValue");
  });

  it("records absence only within the supplied samples", async () => {
    const pair = await makePair([0, 2, 3]);
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [20, 30, 40], right: [10, 10, 10] }),
    })(requestFor(pair));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.analysis.finding).toEqual({ type: "no-observed-candidate" });
  });

  it.each([
    {
      name: "an equality plateau",
      coordinates: [0, 2],
      series: { left: [10, 10], right: [10, 10] },
    },
    {
      name: "multiple sampled sign reversals",
      coordinates: [0, 2, 3],
      series: { left: [0, 20, 0], right: [10, 10, 10] },
    },
  ])("rejects $name as ambiguous without a partial Analysis", async ({ coordinates, series }) => {
    const pair = await makePair(coordinates);
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator(series),
    })(requestFor(pair));

    expectAtomicFailure(outcome, "breakpoint-ambiguous", "multiple-candidates");
  });

  it.each([1, 15])("preserves the explicit %i-point boundary", async (pointCount) => {
    const coordinates = Array.from({ length: pointCount }, (_, index) => index + 2);
    const pair = await makePair(coordinates);
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({
        left: coordinates.map((value) => value + 10),
        right: coordinates.map(() => 0),
      }),
    })(requestFor(pair));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    expect(outcome.analysis.samples).toHaveLength(pointCount);
    expect(outcome.analysis.finding).toEqual({ type: "no-observed-candidate" });
  });

  it("matches an independent finite candidate oracle over one to fifteen points", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.oneof(fc.integer({ min: -2, max: 2 }), fc.constant(-0)), {
          minLength: 1,
          maxLength: 15,
        }),
        async (differences) => {
          const coordinates = differences.map((_, index) => index + 2);
          const pair = await makePair(coordinates);
          const outcome = await createFiniteBreakpointRunner({
            evaluateScenario: metricEvaluator({
              left: differences,
              right: differences.map(() => 0),
            }),
          })(requestFor(pair));
          const expected = independentCandidates(differences);

          if (expected.length > 1) {
            expectAtomicFailure(outcome, "breakpoint-ambiguous", "multiple-candidates");
            return;
          }
          expect(outcome.ok).toBe(true);
          if (!outcome.ok) {
            throw new Error(JSON.stringify(outcome.error));
          }
          expect(outcome.analysis.finding).toEqual(
            expected[0] ?? { type: "no-observed-candidate" },
          );
          for (const sample of outcome.analysis.samples) {
            expect(Object.is(sample.signedDifference, -0)).toBe(false);
          }
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it.each([
    {
      name: "a non-numeric axis",
      make: () =>
        makePair(["attack-mode.synthetic-a", "attack-mode.synthetic-b"], {
          leftPath: STRING_PATH,
          rightPath: STRING_PATH,
        }),
      code: "breakpoint-axis-unsupported" as const,
      causeCode: "non-numeric-coordinate",
    },
    {
      name: "an unordered numeric axis",
      make: () => makePair([2, 0]),
      code: "breakpoint-order-invalid" as const,
      causeCode: "coordinate-not-increasing",
    },
    {
      name: "mismatched coordinates",
      make: () => makePair([0, 2], { rightCoordinates: [0, 3] }),
      code: "breakpoint-series-mismatch" as const,
      causeCode: "coordinate-mismatch",
    },
    {
      name: "mismatched paths",
      make: () =>
        makePair([0, 2], {
          leftPath: NUMERIC_PATH,
          rightPath: SECOND_NUMERIC_PATH,
        }),
      code: "breakpoint-series-mismatch" as const,
      causeCode: "axis-shape-mismatch",
    },
    {
      name: "mismatched primary metrics",
      make: () => makePair([0, 2], { rightMetric: ALTERNATE_METRIC }),
      code: "breakpoint-series-mismatch" as const,
      causeCode: "source-provenance-mismatch",
    },
  ])("rejects $name before evaluation", async ({ make, code, causeCode }) => {
    const pair = await make();
    const calls: Scenario[] = [];
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0, 0], right: [0, 0] }, { calls }),
    })(requestFor(pair));

    expectAtomicFailure(outcome, code, causeCode);
    expect(calls).toEqual([]);
  });

  it("rejects finite operands whose left-minus-right subtraction overflows", async () => {
    const pair = await makePair([0]);
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({
        left: [Number.MAX_VALUE],
        right: [-Number.MAX_VALUE],
      }),
    })(requestFor(pair));

    expectAtomicFailure(outcome, "breakpoint-arithmetic-failed", "non-finite-difference");
  });

  it("fully preflights both sides before making the first evaluator call", async () => {
    const pair = await makePair([0, 2]);
    const validRequest = requestFor(pair);
    const rightPatch = validRequest.right.patches[0] as ScenarioPatch;
    const request: RunFiniteBreakpointAnalysisRequest = {
      ...validRequest,
      right: {
        ...validRequest.right,
        patches: [
          {
            ...rightPatch,
            contentHash: `sha256:${"0".repeat(64)}`,
          },
          ...validRequest.right.patches.slice(1),
        ],
      },
    };
    const calls: Scenario[] = [];

    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0, 0], right: [0, 0] }, { calls }),
    })(request);

    const error = expectAtomicFailure(
      outcome,
      "breakpoint-source-failed",
      "patch-reference-mismatch",
    );
    expect(error.side).toBe("right");
    expect(calls).toEqual([]);
  });

  it("evaluates the complete left series before the complete right series", async () => {
    const pair = await makePair([0, 2, 3]);
    const calls: Scenario[] = [];
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0, 20, 30], right: [10, 10, 10] }, { calls }),
    })(requestFor(pair));

    expect(outcome.ok).toBe(true);
    expect(calls.map(({ id }) => id)).toEqual([
      "scenario.breakpoint-left-base",
      "scenario.breakpoint-left-point-0",
      "scenario.breakpoint-left-point-1",
      "scenario.breakpoint-left-point-2",
      "scenario.breakpoint-right-base",
      "scenario.breakpoint-right-point-0",
      "scenario.breakpoint-right-point-1",
      "scenario.breakpoint-right-point-2",
    ]);
  });

  it("rejects incompatible Result fingerprint versions after both complete evaluations", async () => {
    const pair = await makePair([0, 2]);
    const calls: Scenario[] = [];
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator(
        { left: [0, 20], right: [10, 10] },
        {
          calls,
          versions: (side) => ({ engineVersion: side === "left" ? ENGINE_VERSION : "9.9.9" }),
        },
      ),
    })(requestFor(pair));

    expectAtomicFailure(
      outcome,
      "breakpoint-fingerprint-mismatch",
      "incompatible-result-fingerprint",
    );
    expect(calls).toHaveLength(6);
  });

  it("does not mutate caller input and deeply freezes a successful Analysis", async () => {
    const pair = await makePair([0, 2]);
    const request = requestFor(pair);
    const before = canonicalizeJson(request);
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0, 20], right: [10, 10] }),
    })(request);

    expect(canonicalizeJson(request)).toBe(before);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    assertDeeplyFrozen(outcome);
    await expect(verifyArtifactContentHash(outcome.analysis)).resolves.toBe(true);
  });

  it("rejects accessors without invoking them or exposing their values", async () => {
    const pair = await makePair([0]);
    const request = requestFor(pair) as RunFiniteBreakpointAnalysisRequest & {
      analysisId: string;
    };
    let getterCalls = 0;
    Object.defineProperty(request, "analysisId", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return SECRET;
      },
    });
    const calls: Scenario[] = [];
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0], right: [0] }, { calls }),
    })(request);

    const error = expectAtomicFailure(outcome, "breakpoint-request-invalid");
    expect(getterCalls).toBe(0);
    expect(calls).toEqual([]);
    expect(JSON.stringify(error)).not.toContain(SECRET);
  });

  it("contains structural Proxy and evaluator exceptions without leaking secrets", async () => {
    const pair = await makePair([0]);
    const request = requestFor(pair);
    const proxy = new Proxy(request, {
      ownKeys() {
        throw new Error(SECRET);
      },
    });
    const proxyOutcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0], right: [0] }),
    })(proxy);
    const proxyError = expectAtomicFailure(proxyOutcome, "breakpoint-request-invalid");
    expect(JSON.stringify(proxyError)).not.toContain(SECRET);

    const evaluatorOutcome = await createFiniteBreakpointRunner({
      evaluateScenario: async () => {
        throw new Error(SECRET);
      },
    })(request);
    const evaluatorError = expectAtomicFailure(
      evaluatorOutcome,
      "breakpoint-source-failed",
      "scenario-evaluation-failed",
    );
    expect(evaluatorError.side).toBe("left");
    expect(JSON.stringify(evaluatorError)).not.toContain(SECRET);
  });

  it("keeps all sample provenance auditable and content-addressed", async () => {
    const pair = await makePair([0, 2]);
    const outcome = await createFiniteBreakpointRunner({
      evaluateScenario: metricEvaluator({ left: [0, 20], right: [10, 10] }),
    })(requestFor(pair));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(JSON.stringify(outcome.error));
    }
    const analysis: FiniteBreakpointAnalysis = outcome.analysis;
    expect(analysis.leftExperimentRef).toEqual(artifactRef(pair.left.experiment));
    expect(analysis.rightExperimentRef).toEqual(artifactRef(pair.right.experiment));
    expect(analysis.samples.map(({ leftVariantId }) => leftVariantId)).toEqual([
      "variant.breakpoint-left-0",
      "variant.breakpoint-left-1",
    ]);
    expect(analysis.samples.map(({ rightVariantId }) => rightVariantId)).toEqual([
      "variant.breakpoint-right-0",
      "variant.breakpoint-right-1",
    ]);
    for (const sample of analysis.samples) {
      expect(sample.leftScenarioRef.kind).toBe("voidtrace.scenario");
      expect(sample.rightScenarioRef.kind).toBe("voidtrace.scenario");
      expect(sample.leftResultRef.kind).toBe("voidtrace.result");
      expect(sample.rightResultRef.kind).toBe("voidtrace.result");
    }
    await expect(verifyArtifactContentHash(analysis)).resolves.toBe(true);
  });
});
