import {
  attachArtifactContentHash,
  canonicalizeJson,
  type Experiment,
  type Result,
  type Scenario,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";
import {
  type EvaluationOutcome,
  type EvaluationRequest,
  evaluateScenario as evaluateKernelScenario,
} from "@voidtrace/kernel";
import { describe, expect, it, vi } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import directScenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import probabilityScenarioFixture from "../../../data/fixtures/golden/probability-critical-armor.scenario.json" with {
  type: "json",
};
import radialScenarioFixture from "../../../data/fixtures/golden/radial-critical-armor.scenario.json" with {
  type: "json",
};
import rulesetFixture from "../../spec-artifacts/src/rulesets/core.generated.json" with {
  type: "json",
};
import { createExperimentRunner, type ExperimentOutcome, runResolvedComparison } from "./index.ts";

const PRIMARY_METRIC = "damage.health.total";
const DIFFERENT_HASH = `sha256:${"f".repeat(64)}`;

type ArtifactEnvelope = {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

type VariantInput = {
  readonly id: string;
  readonly scenario: Scenario;
};

function checkedScenario(value: unknown): Scenario {
  const validation = validateContract("scenario", value);
  if (!validation.ok) {
    throw new Error(`Test Scenario is invalid: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function checkedResult(value: unknown): Result {
  const validation = validateContract("result", value);
  if (!validation.ok) {
    throw new Error(`Test Result is invalid: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function artifactRef<TArtifact extends ArtifactEnvelope>(artifact: TArtifact) {
  return {
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  } as const;
}

function allObjectsAreFrozen(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return true;
  }
  return Object.isFrozen(value) && Object.values(value).every(allObjectsAreFrozen);
}

function expectFailure(
  outcome: ExperimentOutcome,
  code: Extract<ExperimentOutcome, { readonly ok: false }>["error"]["code"],
  causeCode?: string,
) {
  expect(outcome).toMatchObject({
    ok: false,
    error: {
      code,
      ...(causeCode === undefined ? {} : { causeCode }),
    },
  });
  if (outcome.ok) {
    throw new Error(`Expected ${code}, received a successful Comparison`);
  }
  return outcome;
}

const directScenario = checkedScenario(directScenarioFixture);
const probabilityScenario = checkedScenario(probabilityScenarioFixture);
const radialScenario = checkedScenario(radialScenarioFixture);

async function makeExperiment(
  options: {
    readonly base?: Scenario;
    readonly variants?: ReadonlyArray<VariantInput>;
    readonly primaryMetric?: string;
  } = {},
): Promise<Experiment> {
  const base = options.base ?? directScenario;
  const variants =
    options.variants ??
    ([
      { id: "variant.same-damage", scenario: probabilityScenario },
      { id: "variant.radial-falloff", scenario: radialScenario },
    ] as const);
  const hashed = await attachArtifactContentHash({
    $schema: "urn:voidtrace:schema:experiment:0.1.0",
    kind: "voidtrace.experiment",
    schemaVersion: "0.1.0",
    id: "experiment.synthetic-resolved-comparison",
    revision: 0,
    gameBuild: directScenario.gameBuild,
    catalogRef: artifactRef(catalogFixture),
    rulesetRef: artifactRef(rulesetFixture),
    baseScenarioRef: artifactRef(base),
    variants: variants.map((variant) => ({
      id: variant.id,
      scenarioRef: artifactRef(variant.scenario),
    })),
    primaryMetric: options.primaryMetric ?? PRIMARY_METRIC,
  } as const);
  const validation = validateContract("experiment", hashed);
  if (!validation.ok) {
    throw new Error(`Test Experiment is invalid: ${JSON.stringify(validation.issues)}`);
  }
  return validation.value;
}

function requestFor(
  experiment: Experiment,
  scenarios: ReadonlyArray<Scenario> = [radialScenario, probabilityScenario, directScenario],
) {
  return {
    experiment: structuredClone(experiment),
    scenarios: scenarios.map((scenario) => structuredClone(scenario)),
    catalog: structuredClone(catalogFixture),
    ruleset: structuredClone(rulesetFixture),
  };
}

async function rehashScenario(body: Omit<Scenario, "contentHash">): Promise<Scenario> {
  return checkedScenario(await attachArtifactContentHash(body));
}

async function resultWithMetrics(
  outcome: Extract<EvaluationOutcome, { readonly ok: true }>,
  metrics: Readonly<Record<string, number>>,
): Promise<Extract<EvaluationOutcome, { readonly ok: true }>> {
  const { contentHash: _contentHash, ...body } = structuredClone(outcome.result);
  const result = checkedResult(
    await attachArtifactContentHash({
      ...body,
      metrics,
    }),
  );
  return {
    ok: true,
    result,
    trace: outcome.trace,
  };
}

describe("resolved Experiment comparison", () => {
  it("runs the real Kernel in declaration order and emits exact signed projections", async () => {
    const experiment = await makeExperiment();
    const request = requestFor(experiment);
    const requestBefore = canonicalizeJson(request);

    const first = await runResolvedComparison(request);
    const second = await runResolvedComparison(request);
    const evaluatedScenarioIds: string[] = [];
    const observingRunner = createExperimentRunner({
      evaluateScenario: async (evaluationRequest) => {
        evaluatedScenarioIds.push(checkedScenario(evaluationRequest.scenario).id);
        return evaluateKernelScenario(evaluationRequest);
      },
    });
    const observed = await observingRunner(request);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(observed.ok).toBe(true);
    expect(first).toEqual(second);
    expect(first).toEqual(observed);
    expect(first).not.toBe(second);
    expect(request.scenarios.map((scenario) => scenario.id)).toEqual([
      radialScenario.id,
      probabilityScenario.id,
      directScenario.id,
    ]);
    expect(evaluatedScenarioIds).toEqual([
      directScenario.id,
      probabilityScenario.id,
      radialScenario.id,
    ]);
    expect(canonicalizeJson(request)).toBe(requestBefore);
    expect(allObjectsAreFrozen(first)).toBe(true);
    if (!first.ok) {
      throw new Error(first.error.message);
    }

    expect(first.base.scenario.id).toBe(directScenario.id);
    expect(first.variants.map((row) => row.id)).toEqual([
      "variant.same-damage",
      "variant.radial-falloff",
    ]);
    expect(first.variants.map((row) => row.scenario.id)).toEqual([
      probabilityScenario.id,
      radialScenario.id,
    ]);
    expect(first.comparison).toMatchObject({
      kind: "voidtrace.comparison",
      id: `comparison.${experiment.id}`,
      revision: experiment.revision,
      gameBuild: experiment.gameBuild,
      primaryMetric: PRIMARY_METRIC,
      base: {
        metricValue: 100,
        deltaFromBase: 0,
      },
      variants: [
        {
          id: "variant.same-damage",
          metricValue: 100,
          deltaFromBase: 0,
        },
        {
          id: "variant.radial-falloff",
          metricValue: 75,
          deltaFromBase: -25,
        },
      ],
    });
    expect(Object.is(first.comparison.base.deltaFromBase, -0)).toBe(false);
    expect(validateContract("comparison", first.comparison).ok).toBe(true);
    await expect(verifyArtifactContentHash(first.comparison)).resolves.toBe(true);
  });

  it("rejects stale hashes and missing, extra, or duplicate supplied Scenarios before evaluation", async () => {
    const experiment = await makeExperiment();
    const evaluator = vi.fn(async (request: EvaluationRequest) => evaluateKernelScenario(request));
    const runner = createExperimentRunner({ evaluateScenario: evaluator });

    const stale = {
      ...structuredClone(experiment),
      primaryMetric: "target.health.remaining",
    };
    expectFailure(await runner(requestFor(stale as Experiment)), "experiment-invalid");
    expect(evaluator).not.toHaveBeenCalled();

    expectFailure(
      await runner(requestFor(experiment, [directScenario, probabilityScenario])),
      "scenario-set-mismatch",
    );
    expect(evaluator).not.toHaveBeenCalled();

    expectFailure(
      await runner(
        requestFor(experiment, [
          directScenario,
          probabilityScenario,
          radialScenario,
          directScenario,
        ]),
      ),
      "scenario-set-mismatch",
    );
    expect(evaluator).not.toHaveBeenCalled();

    expectFailure(
      await runner(
        requestFor(experiment, [directScenario, probabilityScenario, probabilityScenario]),
      ),
      "scenario-set-mismatch",
      "duplicate-scenario-identity",
    );
    expect(evaluator).not.toHaveBeenCalled();
  });

  it("rejects duplicate declarations before evaluation", async () => {
    const evaluator = vi.fn(async (request: EvaluationRequest) => evaluateKernelScenario(request));
    const runner = createExperimentRunner({ evaluateScenario: evaluator });
    const duplicateVariantIds = await makeExperiment({
      variants: [
        { id: "variant.duplicate", scenario: probabilityScenario },
        { id: "variant.duplicate", scenario: radialScenario },
      ],
    });

    expectFailure(
      await runner(requestFor(duplicateVariantIds)),
      "experiment-invalid",
      "duplicate-variant-id",
    );
    expect(evaluator).not.toHaveBeenCalled();

    const duplicateScenarioIdentities = await makeExperiment({
      variants: [
        { id: "variant.first", scenario: probabilityScenario },
        { id: "variant.second", scenario: probabilityScenario },
      ],
    });
    expectFailure(
      await runner(requestFor(duplicateScenarioIdentities)),
      "scenario-set-mismatch",
      "duplicate-scenario-identity",
    );
    expect(evaluator).not.toHaveBeenCalled();
  });

  it("rejects Scenario provenance drift and absent declared metrics before evaluation", async () => {
    const evaluator = vi.fn(async (request: EvaluationRequest) => evaluateKernelScenario(request));
    const runner = createExperimentRunner({ evaluateScenario: evaluator });
    const { contentHash: _probabilityHash, ...probabilityBody } =
      structuredClone(probabilityScenario);
    const provenanceDrift = await rehashScenario({
      ...probabilityBody,
      catalogRef: {
        ...probabilityBody.catalogRef,
        contentHash: DIFFERENT_HASH,
      },
    });
    const provenanceExperiment = await makeExperiment({
      variants: [
        { id: "variant.provenance-drift", scenario: provenanceDrift },
        { id: "variant.radial-falloff", scenario: radialScenario },
      ],
    });
    expectFailure(
      await runner(
        requestFor(provenanceExperiment, [directScenario, provenanceDrift, radialScenario]),
      ),
      "scenario-reference-mismatch",
      "provenance-mismatch",
    );
    expect(evaluator).not.toHaveBeenCalled();

    const { contentHash: _radialHash, ...radialBody } = structuredClone(radialScenario);
    const metricAbsent = await rehashScenario({
      ...radialBody,
      metrics: radialBody.metrics.filter((metric) => metric !== PRIMARY_METRIC),
    });
    const metricExperiment = await makeExperiment({
      variants: [
        { id: "variant.same-damage", scenario: probabilityScenario },
        { id: "variant.metric-absent", scenario: metricAbsent },
      ],
    });
    expectFailure(
      await runner(
        requestFor(metricExperiment, [directScenario, probabilityScenario, metricAbsent]),
      ),
      "comparison-metric-missing",
      "scenario-metric-membership",
    );
    expect(evaluator).not.toHaveBeenCalled();
  });

  it("rejects Monte Carlo before invoking the evaluator", async () => {
    const evaluator = vi.fn(async (request: EvaluationRequest) => evaluateKernelScenario(request));
    const runner = createExperimentRunner({ evaluateScenario: evaluator });
    const { contentHash: _scenarioHash, ...scenarioBody } = structuredClone(probabilityScenario);
    const monteCarlo = await rehashScenario({
      ...scenarioBody,
      simulation: {
        mode: "monte-carlo",
        seed: 7,
        iterations: 10,
        timeLimitMs: 1,
      },
    });
    const experiment = await makeExperiment({
      variants: [
        { id: "variant.monte-carlo", scenario: monteCarlo },
        { id: "variant.radial-falloff", scenario: radialScenario },
      ],
    });

    expectFailure(
      await runner(requestFor(experiment, [directScenario, monteCarlo, radialScenario])),
      "unsupported-experiment-scenario",
      "unsupported-monte-carlo",
    );
    expect(evaluator).not.toHaveBeenCalled();
  });

  it("maps evaluator failure, exceptions, and malformed success without leaking artifacts", async () => {
    const experiment = await makeExperiment();
    const request = requestFor(experiment);
    const failedEvaluator = vi.fn(
      async (): Promise<EvaluationOutcome> => ({
        ok: false,
        error: {
          code: "scenario-invalid",
          message: "injected failure",
        },
      }),
    );
    const failed = expectFailure(
      await createExperimentRunner({ evaluateScenario: failedEvaluator })(request),
      "scenario-evaluation-failed",
      "evaluator-reported-failure",
    );
    expect(Object.keys(failed).toSorted()).toEqual(["error", "ok"]);
    expect(failedEvaluator).toHaveBeenCalledTimes(1);

    const throwingEvaluator = vi.fn(
      async (_request: EvaluationRequest): Promise<EvaluationOutcome> => {
        throw new Error("injected exception");
      },
    );
    const thrown = expectFailure(
      await createExperimentRunner({ evaluateScenario: throwingEvaluator })(request),
      "scenario-evaluation-failed",
      "evaluator-threw",
    );
    expect(Object.keys(thrown).toSorted()).toEqual(["error", "ok"]);
    expect(throwingEvaluator).toHaveBeenCalledTimes(1);

    const malformedEvaluator = vi.fn(
      async (evaluationRequest: EvaluationRequest): Promise<EvaluationOutcome> => {
        const outcome = await evaluateKernelScenario(evaluationRequest);
        if (!outcome.ok) {
          return outcome;
        }
        return {
          ...outcome,
          unexpected: true,
        } as unknown as EvaluationOutcome;
      },
    );
    const malformed = expectFailure(
      await createExperimentRunner({ evaluateScenario: malformedEvaluator })(request),
      "integrity-check-failed",
      "invalid-evaluator-outcome",
    );
    expect(Object.keys(malformed).toSorted()).toEqual(["error", "ok"]);
    expect(malformedEvaluator).toHaveBeenCalledTimes(1);
  });

  it("stops on the first failing variant and returns no partial evaluation rows", async () => {
    const experiment = await makeExperiment();
    let callCount = 0;
    const evaluator = vi.fn(async (request: EvaluationRequest): Promise<EvaluationOutcome> => {
      callCount += 1;
      if (callCount === 2) {
        return {
          ok: false,
          error: {
            code: "rule-execution-failed",
            message: "injected variant failure",
          },
        };
      }
      return evaluateKernelScenario(request);
    });

    const outcome = expectFailure(
      await createExperimentRunner({ evaluateScenario: evaluator })(requestFor(experiment)),
      "scenario-evaluation-failed",
      "evaluator-reported-failure",
    );
    expect(evaluator).toHaveBeenCalledTimes(2);
    expect(outcome.error.memberId).toBe("variant.same-damage");
    expect(Object.keys(outcome).toSorted()).toEqual(["error", "ok"]);
    expect(outcome).not.toHaveProperty("comparison");
    expect(outcome).not.toHaveProperty("base");
    expect(outcome).not.toHaveProperty("variants");
  });

  it("rejects a valid evaluator Result that omits the primary metric", async () => {
    const experiment = await makeExperiment();
    const evaluator = vi.fn(async (request: EvaluationRequest): Promise<EvaluationOutcome> => {
      const outcome = await evaluateKernelScenario(request);
      if (!outcome.ok) {
        return outcome;
      }
      const metrics = { ...outcome.result.metrics };
      delete metrics[PRIMARY_METRIC];
      return resultWithMetrics(outcome, metrics);
    });

    expectFailure(
      await createExperimentRunner({ evaluateScenario: evaluator })(requestFor(experiment)),
      "comparison-metric-missing",
      "result-metric-membership",
    );
    expect(evaluator).toHaveBeenCalledTimes(1);
  });

  it("fails closed when finite metric values produce an overflowing signed delta", async () => {
    const experiment = await makeExperiment();
    const evaluator = vi.fn(async (request: EvaluationRequest): Promise<EvaluationOutcome> => {
      const outcome = await evaluateKernelScenario(request);
      if (!outcome.ok) {
        return outcome;
      }
      const scenario = checkedScenario(request.scenario);
      const metricValue = scenario.id === directScenario.id ? -Number.MAX_VALUE : Number.MAX_VALUE;
      return resultWithMetrics(outcome, {
        ...outcome.result.metrics,
        [PRIMARY_METRIC]: metricValue,
      });
    });

    const outcome = expectFailure(
      await createExperimentRunner({ evaluateScenario: evaluator })(requestFor(experiment)),
      "comparison-arithmetic-failed",
      "non-finite-delta",
    );
    expect(evaluator).toHaveBeenCalledTimes(3);
    expect(outcome.error.memberId).toBe("variant.same-damage");
    expect(Object.keys(outcome).toSorted()).toEqual(["error", "ok"]);
    expect(outcome).not.toHaveProperty("comparison");
    expect(outcome).not.toHaveProperty("base");
    expect(outcome).not.toHaveProperty("variants");
  });
});
