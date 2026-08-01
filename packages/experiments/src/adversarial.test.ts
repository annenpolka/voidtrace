import {
  type ArtifactRef,
  attachArtifactContentHash,
  attachResultHash,
  type CatalogSnapshot,
  type Experiment,
  type Result,
  type Ruleset,
  type Scenario,
  type Trace,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import { createExperimentRunner, type ExperimentOutcome, type ScenarioEvaluator } from "./index.ts";

const PRIMARY_METRIC = "damage.health.total";
const SECRET = "PRIVATE evaluator stack and filesystem detail";

type ArtifactIdentity = {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

type Fixture = {
  readonly catalog: CatalogSnapshot;
  readonly ruleset: Ruleset;
  readonly base: Scenario;
  readonly variant: Scenario;
  readonly experiment: Experiment;
};

function artifactRef(artifact: ArtifactIdentity): ArtifactRef {
  return {
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  };
}

function memberIdentity(scenario: Pick<Scenario, "id" | "revision">): string {
  return `${scenario.id}\0${scenario.revision}`;
}

async function makeRuleset(): Promise<Ruleset> {
  const schemaVersion = scenarioFixture.rulesetRef.schemaVersion;
  return (await attachArtifactContentHash({
    $schema: `urn:voidtrace:schema:ruleset:${schemaVersion}`,
    kind: "ruleset",
    schemaVersion,
    id: "ruleset.experiment-adversarial",
    revision: 0,
    gameBuild: catalogFixture.gameBuild,
    rules: [],
  })) as unknown as Ruleset;
}

async function makeScenario(
  ruleset: Ruleset,
  identity: { readonly id: string; readonly revision: number },
): Promise<Scenario> {
  const { contentHash: _contentHash, ...body } = structuredClone(scenarioFixture);
  return (await attachArtifactContentHash({
    ...body,
    id: identity.id,
    revision: identity.revision,
    catalogRef: artifactRef(catalogFixture),
    rulesetRef: artifactRef(ruleset),
  })) as Scenario;
}

async function makeFixture(options: { readonly sameScenarioId?: boolean } = {}): Promise<Fixture> {
  const catalog = structuredClone(catalogFixture) as CatalogSnapshot;
  const ruleset = await makeRuleset();
  const baseId = "scenario.experiment-adversarial-base";
  const base = await makeScenario(ruleset, { id: baseId, revision: 0 });
  const variant = await makeScenario(ruleset, {
    id: options.sameScenarioId ? baseId : "scenario.experiment-adversarial-variant",
    revision: 1,
  });
  const experiment = (await attachArtifactContentHash({
    $schema: "urn:voidtrace:schema:experiment:0.1.0",
    kind: "voidtrace.experiment",
    schemaVersion: "0.1.0",
    id: "experiment.adversarial",
    revision: 0,
    gameBuild: catalog.gameBuild,
    catalogRef: artifactRef(catalog),
    rulesetRef: artifactRef(ruleset),
    baseScenarioRef: artifactRef(base),
    variants: [
      {
        id: "variant.adversarial",
        scenarioRef: artifactRef(variant),
      },
    ],
    primaryMetric: PRIMARY_METRIC,
  })) as Experiment;
  return { catalog, ruleset, base, variant, experiment };
}

function requestFor(
  fixture: Fixture,
  scenarios: ReadonlyArray<Scenario> = [fixture.base, fixture.variant],
) {
  return {
    experiment: fixture.experiment,
    scenarios,
    catalog: fixture.catalog,
    ruleset: fixture.ruleset,
    productVersion: "0.0.0",
  };
}

async function makeEvaluationOutcome(
  scenario: Scenario,
  metricValue: number,
): Promise<Extract<Awaited<ReturnType<ScenarioEvaluator>>, { readonly ok: true }>> {
  const fingerprint = await attachResultHash({
    productVersion: "0.0.0",
    engineVersion: "0.0.0",
    scenarioSchemaVersion: scenario.schemaVersion,
    catalogHash: scenario.catalogRef.contentHash,
    rulesetHash: scenario.rulesetRef.contentHash,
    scenarioHash: scenario.contentHash,
    seed: 0,
  });
  const trace = (await attachArtifactContentHash({
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
  })) as Trace;
  const result = (await attachArtifactContentHash({
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
  })) as Result;
  return { ok: true, result, trace };
}

function metricEvaluator(
  fixture: Fixture,
  metrics: { readonly base?: number; readonly variant?: number } = {},
  calls: string[] = [],
): ScenarioEvaluator {
  return async ({ scenario }) => {
    const member = scenario as Scenario;
    calls.push(memberIdentity(member));
    const metricValue =
      memberIdentity(member) === memberIdentity(fixture.base)
        ? (metrics.base ?? 10)
        : (metrics.variant ?? 12);
    return makeEvaluationOutcome(member, metricValue);
  };
}

async function rehashArtifact<T extends ArtifactIdentity>(
  artifact: T,
  changes: Readonly<Record<string, unknown>>,
): Promise<T> {
  const { contentHash: _contentHash, ...body } = structuredClone(artifact);
  return (await attachArtifactContentHash({ ...body, ...changes })) as T;
}

function expectIntegrityFailure(outcome: ExperimentOutcome): void {
  expect(outcome.ok).toBe(false);
  if (outcome.ok) {
    throw new Error("Expected an Experiment failure");
  }
  expect(outcome.error).toMatchObject({
    code: "integrity-check-failed",
    causeCode: "result-trace-integrity",
  });
}

describe("resolved Experiment adversarial boundaries", () => {
  it("uses descriptor snapshots for Proxy inputs and rejects accessors without invoking them", async () => {
    const fixture = await makeFixture();
    let proxyReads = 0;
    const proxiedExperiment = new Proxy(fixture.experiment, {
      get(target, property, receiver) {
        proxyReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const runner = createExperimentRunner({
      evaluateScenario: metricEvaluator(fixture),
    });

    const proxiedOutcome = await runner({
      ...requestFor(fixture),
      experiment: proxiedExperiment,
    });

    expect(proxiedOutcome.ok).toBe(true);
    expect(proxyReads).toBe(0);

    let accessorReads = 0;
    const accessorRequest = { ...requestFor(fixture) };
    Object.defineProperty(accessorRequest, "experiment", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error(SECRET);
      },
    });
    const accessorOutcome = await runner(accessorRequest);

    expect(accessorOutcome).toEqual({
      ok: false,
      error: {
        code: "experiment-invalid",
        message: "Experiment request must be a plain JSON value",
      },
    });
    expect(accessorReads).toBe(0);
    expect(JSON.stringify(accessorOutcome)).not.toContain(SECRET);
  });

  it("isolates the run from caller mutation immediately after invocation", async () => {
    const fixture = await makeFixture();
    const mutableRequest = structuredClone(requestFor(fixture));
    const runner = createExperimentRunner({
      evaluateScenario: metricEvaluator(fixture),
    });

    const pending = runner(mutableRequest);
    const mutableExperiment = mutableRequest.experiment as unknown as Record<string, unknown>;
    const mutableBase = mutableRequest.scenarios[0] as unknown as Record<string, unknown>;
    mutableExperiment.id = "experiment.mutated-after-invocation";
    mutableBase.contentHash = `sha256:${"f".repeat(64)}`;
    (mutableRequest.scenarios as Scenario[]).reverse();

    const outcome = await pending;

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    expect(outcome.comparison.experimentRef.id).toBe(fixture.experiment.id);
    expect(outcome.base.scenario.contentHash).toBe(fixture.base.contentHash);
    expect(outcome.variants[0]?.scenario.contentHash).toBe(fixture.variant.contentHash);
  });

  it("is invariant to supplied Scenario order while evaluating base then declared variants", async () => {
    const fixture = await makeFixture();
    const orderedCalls: string[] = [];
    const reversedCalls: string[] = [];
    const ordered = await createExperimentRunner({
      evaluateScenario: metricEvaluator(fixture, {}, orderedCalls),
    })(requestFor(fixture));
    const reversed = await createExperimentRunner({
      evaluateScenario: metricEvaluator(fixture, {}, reversedCalls),
    })(requestFor(fixture, [fixture.variant, fixture.base]));

    expect(ordered.ok).toBe(true);
    expect(reversed.ok).toBe(true);
    if (!ordered.ok || !reversed.ok) {
      throw new Error("Expected both supplied orders to succeed");
    }
    const declaredOrder = [memberIdentity(fixture.base), memberIdentity(fixture.variant)];
    expect(orderedCalls).toEqual(declaredOrder);
    expect(reversedCalls).toEqual(declaredOrder);
    expect(reversed.comparison).toEqual(ordered.comparison);
  });

  it("accepts the same Scenario id at distinct declared revisions", async () => {
    const fixture = await makeFixture({ sameScenarioId: true });
    const outcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator(fixture),
    })(requestFor(fixture, [fixture.variant, fixture.base]));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    expect(outcome.base.scenario.id).toBe(outcome.variants[0]?.scenario.id);
    expect(outcome.base.scenario.revision).toBe(0);
    expect(outcome.variants[0]?.scenario.revision).toBe(1);
    expect(outcome.comparison.base.scenarioRef.revision).toBe(0);
    expect(outcome.comparison.variants[0]?.scenarioRef.revision).toBe(1);
  });

  it("rejects evaluator Artifacts belonging to another Experiment member", async () => {
    const fixture = await makeFixture();
    const wrongMemberOutcome = await makeEvaluationOutcome(fixture.variant, 12);
    const runner = createExperimentRunner({
      evaluateScenario: async () => wrongMemberOutcome,
    });

    const outcome = await runner(requestFor(fixture));

    expectIntegrityFailure(outcome);
    if (!outcome.ok) {
      expect(outcome.error.path).toBe("/baseScenarioRef");
    }
  });

  it("rejects mixed-member Result and Trace pairs", async () => {
    const fixture = await makeFixture();
    const baseOutcome = await makeEvaluationOutcome(fixture.base, 10);
    const variantOutcome = await makeEvaluationOutcome(fixture.variant, 12);
    const runner = createExperimentRunner({
      evaluateScenario: async () => ({
        ok: true,
        result: baseOutcome.result,
        trace: variantOutcome.trace,
      }),
    });

    expectIntegrityFailure(await runner(requestFor(fixture)));
  });

  it("rejects evaluator successes with extra fields", async () => {
    const fixture = await makeFixture();
    const valid = await makeEvaluationOutcome(fixture.base, 10);
    const runner = createExperimentRunner({
      evaluateScenario: async () => ({ ...valid, debug: SECRET }),
    });

    const outcome = await runner(requestFor(fixture));

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toMatchObject({
        code: "integrity-check-failed",
        causeCode: "invalid-evaluator-outcome",
      });
      expect(outcome.error.message).not.toContain(SECRET);
    }
  });

  it("rejects rehashed Result and Trace Scenario-reference tampering", async () => {
    const fixture = await makeFixture();
    const valid = await makeEvaluationOutcome(fixture.base, 10);
    const resultWithWrongScenario = await rehashArtifact(valid.result, {
      scenarioRef: artifactRef(fixture.variant),
    });
    const traceWithWrongScenario = await rehashArtifact(valid.trace, {
      scenarioRef: artifactRef(fixture.variant),
    });
    const resultLinkedToWrongTrace = await rehashArtifact(valid.result, {
      traceRef: artifactRef(traceWithWrongScenario),
    });

    await expect(verifyArtifactContentHash(resultWithWrongScenario)).resolves.toBe(true);
    await expect(verifyArtifactContentHash(traceWithWrongScenario)).resolves.toBe(true);

    for (const evaluatorOutcome of [
      { ok: true, result: resultWithWrongScenario, trace: valid.trace } as const,
      { ok: true, result: resultLinkedToWrongTrace, trace: traceWithWrongScenario } as const,
    ]) {
      const runner = createExperimentRunner({
        evaluateScenario: async () => evaluatorOutcome,
      });
      expectIntegrityFailure(await runner(requestFor(fixture)));
    }
  });

  it("rejects fully rehashed fingerprint provenance tampering", async () => {
    const fixture = await makeFixture();
    const valid = await makeEvaluationOutcome(fixture.base, 10);
    const { resultHash: _resultHash, ...fingerprintBody } = valid.result.fingerprint;
    const forgedFingerprint = await attachResultHash({
      ...fingerprintBody,
      catalogHash: `sha256:${"f".repeat(64)}`,
    });
    const forgedTrace = await rehashArtifact(valid.trace, {
      fingerprint: forgedFingerprint,
    });
    const forgedResult = await rehashArtifact(valid.result, {
      fingerprint: forgedFingerprint,
      traceRef: artifactRef(forgedTrace),
    });

    await expect(verifyArtifactContentHash(forgedTrace)).resolves.toBe(true);
    await expect(verifyArtifactContentHash(forgedResult)).resolves.toBe(true);
    const runner = createExperimentRunner({
      evaluateScenario: async () => ({ ok: true, result: forgedResult, trace: forgedTrace }),
    });

    expectIntegrityFailure(await runner(requestFor(fixture)));
  });

  it("normalizes a negative-zero signed delta to positive zero", async () => {
    const fixture = await makeFixture();
    const outcome = await createExperimentRunner({
      evaluateScenario: metricEvaluator(fixture, { base: 0, variant: -0 }),
    })(requestFor(fixture));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    const delta = outcome.comparison.variants[0]?.deltaFromBase;
    expect(delta).toBe(0);
    expect(Object.is(delta, -0)).toBe(false);
  });

  it("does not leak an evaluator exception message", async () => {
    const fixture = await makeFixture();
    const runner = createExperimentRunner({
      evaluateScenario: async () => {
        throw new Error(SECRET);
      },
    });

    const outcome = await runner(requestFor(fixture));

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "scenario-evaluation-failed",
        message: "Scenario evaluator threw an exception",
        path: "/baseScenarioRef",
        causeCode: "evaluator-threw",
      },
    });
    expect(JSON.stringify(outcome)).not.toContain(SECRET);
  });

  it("does not copy arbitrary evaluator failure codes into its public error", async () => {
    const fixture = await makeFixture();
    const maliciousFailures = [
      { ok: false, error: { code: SECRET } },
      { ok: false, error: { causeCode: SECRET } },
    ] as const;

    for (const maliciousFailure of maliciousFailures) {
      const evaluator = (async () => maliciousFailure) as unknown as ScenarioEvaluator;
      const outcome = await createExperimentRunner({ evaluateScenario: evaluator })(
        requestFor(fixture),
      );

      expect(outcome.ok).toBe(false);
      expect(JSON.stringify(outcome)).not.toContain(SECRET);
    }
  });
});
