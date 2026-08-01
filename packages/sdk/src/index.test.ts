import generatedCapabilities from "@voidtrace/spec-artifacts/capabilities" with { type: "json" };
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import breakpointLeftSweepExperimentFixture from "../../../data/fixtures/experiments/breakpoint-left-sweep.experiment.json" with {
  type: "json",
};
import breakpointRightScenarioFixture from "../../../data/fixtures/experiments/breakpoint-right.scenario.json" with {
  type: "json",
};
import breakpointRightSweepExperimentFixture from "../../../data/fixtures/experiments/breakpoint-right-sweep.experiment.json" with {
  type: "json",
};
import breakpointRightSweep0PatchFixture from "../../../data/fixtures/experiments/breakpoint-right-sweep-0.scenario-patch.json" with {
  type: "json",
};
import breakpointRightSweep2PatchFixture from "../../../data/fixtures/experiments/breakpoint-right-sweep-2.scenario-patch.json" with {
  type: "json",
};
import breakpointRightSweep3PatchFixture from "../../../data/fixtures/experiments/breakpoint-right-sweep-3.scenario-patch.json" with {
  type: "json",
};
import criticalTierSweepExperimentFixture from "../../../data/fixtures/experiments/critical-tier-sweep.experiment.json" with {
  type: "json",
};
import criticalTierSweep0PatchFixture from "../../../data/fixtures/experiments/critical-tier-sweep-0.scenario-patch.json" with {
  type: "json",
};
import criticalTierSweep2PatchFixture from "../../../data/fixtures/experiments/critical-tier-sweep-2.scenario-patch.json" with {
  type: "json",
};
import criticalTierSweep3PatchFixture from "../../../data/fixtures/experiments/critical-tier-sweep-3.scenario-patch.json" with {
  type: "json",
};
import scenarioPatchExpectedProjectionFixture from "../../../data/fixtures/experiments/direct-critical-tier-2.expected.json" with {
  type: "json",
};
import scenarioPatchExpectedScenarioFixture from "../../../data/fixtures/experiments/direct-critical-tier-2.expected.scenario.json" with {
  type: "json",
};
import scenarioPatchFixture from "../../../data/fixtures/experiments/direct-critical-tier-2.scenario-patch.json" with {
  type: "json",
};
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import probabilityScenarioFixture from "../../../data/fixtures/golden/probability-critical-armor.scenario.json" with {
  type: "json",
};
import radialScenarioFixture from "../../../data/fixtures/golden/radial-critical-armor.scenario.json" with {
  type: "json",
};
import {
  describeCapabilities,
  evaluateScenario,
  findFiniteBreakpoint,
  materializeScenarioPatch,
  runExperiment,
} from "./index.ts";

type ArtifactIdentity = {
  readonly kind: string;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

function artifactRef(artifact: ArtifactIdentity): ArtifactIdentity {
  return {
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  };
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new TypeError("Experiment fixture must be JSON-serializable");
    }
    return encoded;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .toSorted()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

async function sha256(value: unknown): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
  return `sha256:${hex}`;
}

async function withContentHash<T extends object>(
  artifact: T,
): Promise<T & { contentHash: string }> {
  return {
    ...artifact,
    contentHash: await sha256(artifact),
  };
}

async function contentHashIsValid(artifact: object): Promise<boolean> {
  const { contentHash, ...body } = artifact as Record<string, unknown>;
  return typeof contentHash === "string" && contentHash === (await sha256(body));
}

async function comparisonExperiment(
  catalogRef: ArtifactIdentity = scenarioFixture.catalogRef,
): Promise<object> {
  return withContentHash({
    $schema: "urn:voidtrace:schema:experiment:0.3.0",
    kind: "voidtrace.experiment",
    schemaVersion: "0.3.0",
    id: "experiment.sdk-resolved-comparison",
    revision: 0,
    gameBuild: scenarioFixture.gameBuild,
    catalogRef,
    rulesetRef: scenarioFixture.rulesetRef,
    baseScenarioRef: artifactRef(scenarioFixture),
    variants: [
      {
        id: "explicit-roll",
        scenarioRef: artifactRef(probabilityScenarioFixture),
      },
      {
        id: "radial-falloff",
        scenarioRef: artifactRef(radialScenarioFixture),
      },
    ],
    primaryMetric: "damage.health.total",
  });
}

async function patchBackedExperiment(): Promise<object> {
  return withContentHash({
    $schema: "urn:voidtrace:schema:experiment:0.3.0",
    kind: "voidtrace.experiment",
    schemaVersion: "0.3.0",
    id: "experiment.sdk-patch-backed-comparison",
    revision: 0,
    gameBuild: scenarioFixture.gameBuild,
    catalogRef: scenarioFixture.catalogRef,
    rulesetRef: scenarioFixture.rulesetRef,
    baseScenarioRef: artifactRef(scenarioFixture),
    variants: [
      {
        id: "critical-tier-2",
        patchRef: artifactRef(scenarioPatchFixture),
      },
    ],
    primaryMetric: "damage.health.total",
  });
}

async function criticalTierScenarioPatch(): Promise<object> {
  return withContentHash({
    $schema: "urn:voidtrace:schema:scenario-patch:0.1.0",
    kind: "voidtrace.scenario-patch",
    schemaVersion: "0.1.0",
    id: "scenario-patch.sdk-critical-tier",
    revision: 0,
    gameBuild: scenarioFixture.gameBuild,
    baseScenarioRef: artifactRef(scenarioFixture),
    resultScenario: {
      id: "scenario.sdk-materialized-critical-tier",
      revision: 0,
    },
    operations: [
      {
        op: "replace",
        path: "/actionPlan/0/parameters/criticalTier",
        value: 2,
      },
    ],
  });
}

function finiteBreakpointRequest() {
  return {
    analysisId: "finite-breakpoint-analysis.sdk-critical-tier",
    analysisRevision: 0,
    catalog: catalogFixture,
    left: {
      experiment: breakpointLeftSweepExperimentFixture,
      scenarios: [scenarioFixture],
      patches: [
        criticalTierSweep0PatchFixture,
        criticalTierSweep2PatchFixture,
        criticalTierSweep3PatchFixture,
      ],
    },
    right: {
      experiment: breakpointRightSweepExperimentFixture,
      scenarios: [breakpointRightScenarioFixture],
      patches: [
        breakpointRightSweep0PatchFixture,
        breakpointRightSweep2PatchFixture,
        breakpointRightSweep3PatchFixture,
      ],
    },
  };
}

function allObjectsAreFrozen(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return true;
  }
  return Object.isFrozen(value) && Object.values(value).every(allObjectsAreFrozen);
}

describe("VoidTrace SDK", () => {
  it("returns a fresh, deeply frozen capability snapshot", () => {
    const first = describeCapabilities();
    const second = describeCapabilities();

    expect(first).toEqual(generatedCapabilities);
    expect(first).not.toBe(generatedCapabilities);
    expect(first).not.toBe(second);
    expect(first.capabilities).not.toBe(second.capabilities);
    expect(allObjectsAreFrozen(first)).toBe(true);
    expect(allObjectsAreFrozen(second)).toBe(true);
  });

  it("delegates evaluation with the generated core Ruleset", async () => {
    const first = await evaluateScenario({
      scenario: structuredClone(scenarioFixture),
      catalog: structuredClone(catalogFixture),
    });
    const second = await evaluateScenario({
      scenario: structuredClone(scenarioFixture),
      catalog: structuredClone(catalogFixture),
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first).toEqual(second);
    if (!first.ok) {
      throw new Error(first.error.message);
    }
    expect(first.result.kind).toBe("voidtrace.result");
    expect(first.trace.kind).toBe("voidtrace.trace");
    expect(first.result.fingerprint.rulesetHash).toBe(scenarioFixture.rulesetRef.contentHash);
  });

  it("runs a content-addressed resolved comparison in declared order", async () => {
    const experiment = await comparisonExperiment();
    const scenarios = [radialScenarioFixture, scenarioFixture, probabilityScenarioFixture];
    const request = {
      experiment,
      scenarios,
      catalog: catalogFixture,
    };

    const first = await runExperiment(structuredClone(request));
    const second = await runExperiment(structuredClone(request));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first).toEqual(second);
    if (!first.ok) {
      throw new Error(first.error.message);
    }

    expect(first.base.scenario.id).toBe(scenarioFixture.id);
    expect(first.variants.map(({ id, scenario }) => [id, scenario.id])).toEqual([
      ["explicit-roll", probabilityScenarioFixture.id],
      ["radial-falloff", radialScenarioFixture.id],
    ]);
    expect(first.comparison).toMatchObject({
      $schema: "urn:voidtrace:schema:comparison:0.1.0",
      kind: "voidtrace.comparison",
      schemaVersion: "0.1.0",
      primaryMetric: "damage.health.total",
      base: {
        metricValue: 100,
        deltaFromBase: 0,
      },
      variants: [
        {
          id: "explicit-roll",
          metricValue: 100,
          deltaFromBase: 0,
        },
        {
          id: "radial-falloff",
          metricValue: 75,
          deltaFromBase: -25,
        },
      ],
    });
    expect(await contentHashIsValid(first.comparison)).toBe(true);
  });

  it("rejects a content-valid Experiment that references a different Catalog", async () => {
    const experiment = await comparisonExperiment({
      ...scenarioFixture.catalogRef,
      id: "catalog.synthetic-other",
    });

    const outcome = await runExperiment({
      experiment,
      scenarios: [scenarioFixture, probabilityScenarioFixture, radialScenarioFixture],
      catalog: catalogFixture,
    });

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "catalog-reference-mismatch",
        message: "Experiment catalogRef does not match the supplied CatalogSnapshot",
        path: "/experiment/catalogRef",
      },
    });
  });

  it("snapshots Experiment inputs before the first asynchronous Ruleset load", async () => {
    const experiment = await comparisonExperiment();
    const request = structuredClone({
      experiment,
      scenarios: [radialScenarioFixture, scenarioFixture, probabilityScenarioFixture],
      catalog: catalogFixture,
    });

    const pending = runExperiment(request);
    (request.experiment as Record<string, unknown>).id = "experiment.mutated-after-call";
    request.scenarios.reverse();
    (request.scenarios[0] as Record<string, unknown>).contentHash = `sha256:${"f".repeat(64)}`;
    const outcome = await pending;

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    expect(outcome.comparison.experimentRef.id).toBe("experiment.sdk-resolved-comparison");
    expect(outcome.base.scenario.id).toBe(scenarioFixture.id);
    expect(outcome.variants.map(({ scenario }) => scenario.id)).toEqual([
      probabilityScenarioFixture.id,
      radialScenarioFixture.id,
    ]);
  });

  it("runs a Patch-backed Experiment through the public SDK boundary", async () => {
    const request = {
      experiment: await patchBackedExperiment(),
      scenarios: [scenarioFixture],
      patches: [scenarioPatchFixture],
      catalog: catalogFixture,
    };

    const first = await runExperiment(structuredClone(request));
    const second = await runExperiment(structuredClone(request));

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) {
      throw new Error(first.error.message);
    }
    expect(first.base.scenario.id).toBe(scenarioFixture.id);
    expect(first.variants).toHaveLength(1);
    expect(first.variants[0]?.id).toBe("critical-tier-2");
    expect(first.variants[0]?.scenario).toEqual(scenarioPatchExpectedScenarioFixture);
    expect(first.comparison).toMatchObject({
      primaryMetric: "damage.health.total",
      base: {
        metricValue: 100,
        deltaFromBase: 0,
      },
      variants: [
        {
          id: "critical-tier-2",
          scenarioRef: artifactRef(scenarioPatchExpectedScenarioFixture),
          metricValue: 150,
          deltaFromBase: 50,
        },
      ],
    });
    expect(await contentHashIsValid(first.comparison)).toBe(true);
  });

  it("runs the checked-in finite Sweep through the public SDK boundary", async () => {
    const request = {
      experiment: criticalTierSweepExperimentFixture,
      scenarios: [scenarioFixture],
      patches: [
        criticalTierSweep3PatchFixture,
        criticalTierSweep0PatchFixture,
        criticalTierSweep2PatchFixture,
      ],
      catalog: catalogFixture,
    };

    const first = await runExperiment(structuredClone(request));
    const second = await runExperiment(structuredClone(request));

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) {
      throw new Error(first.error.message);
    }
    expect(first.base.scenario.id).toBe(scenarioFixture.id);
    expect(
      first.variants.map(({ id, scenario }) => [
        id,
        scenario.actionPlan[0]?.parameters.criticalTier,
      ]),
    ).toEqual([
      ["sweep-point.critical-tier-0", 0],
      ["sweep-point.critical-tier-2", 2],
      ["sweep-point.critical-tier-3", 3],
    ]);
    expect(first.comparison).toMatchObject({
      id: "comparison.experiment.golden-critical-tier-sweep",
      primaryMetric: "damage.health.total",
      base: {
        metricValue: 100,
        deltaFromBase: 0,
      },
      variants: [
        { id: "sweep-point.critical-tier-0", metricValue: 50, deltaFromBase: -50 },
        { id: "sweep-point.critical-tier-2", metricValue: 150, deltaFromBase: 50 },
        { id: "sweep-point.critical-tier-3", metricValue: 200, deltaFromBase: 100 },
      ],
    });
    expect(await contentHashIsValid(first.comparison)).toBe(true);
  });

  it("finds a finite sampled Breakpoint through one public SDK request", async () => {
    const request = finiteBreakpointRequest();

    const first = await findFiniteBreakpoint(structuredClone(request));
    const second = await findFiniteBreakpoint(structuredClone(request));

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) {
      throw new Error(first.error.message);
    }
    expect(first.analysis).toMatchObject({
      $schema: "urn:voidtrace:schema:finite-breakpoint-analysis:0.1.0",
      kind: "voidtrace.finite-breakpoint-analysis",
      schemaVersion: "0.1.0",
      id: "finite-breakpoint-analysis.sdk-critical-tier",
      revision: 0,
      method: "finite-scan",
      primaryMetric: "target.health.remaining",
      sweepPath: "/actionPlan/0/parameters/criticalTier",
      samples: [
        {
          value: 0,
          leftMetricValue: 950,
          rightMetricValue: 1000,
          signedDifference: -50,
        },
        {
          value: 2,
          leftMetricValue: 850,
          rightMetricValue: 800,
          signedDifference: 50,
        },
        {
          value: 3,
          leftMetricValue: 800,
          rightMetricValue: 700,
          signedDifference: 100,
        },
      ],
      finding: {
        type: "sampled-sign-reversal",
        lowerSampleIndex: 0,
        upperSampleIndex: 1,
      },
    });
    expect(await contentHashIsValid(first.analysis)).toBe(true);
    expect(allObjectsAreFrozen(first)).toBe(true);
  });

  it("snapshots the complete finite Breakpoint request before loading the Ruleset", async () => {
    const request = structuredClone(finiteBreakpointRequest());

    const pending = findFiniteBreakpoint(request);
    request.analysisId = "finite-breakpoint-analysis.mutated-after-call";
    request.left.patches.reverse();
    request.right.patches.length = 0;
    const rightScenario = request.right.scenarios[0];
    const rightTarget = rightScenario?.targets[0];
    if (rightTarget === undefined) {
      throw new Error("Expected the finite Breakpoint fixture to contain one right target");
    }
    rightTarget.configuration.resolvedHealth = 1;
    const outcome = await pending;

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    expect(outcome.analysis.id).toBe("finite-breakpoint-analysis.sdk-critical-tier");
    expect(outcome.analysis.samples.map(({ value }) => value)).toEqual([0, 2, 3]);
    expect(outcome.analysis.samples.map(({ rightMetricValue }) => rightMetricValue)).toEqual([
      1000, 800, 700,
    ]);
  });

  it("rejects finite Breakpoint accessors without invoking or exposing them", async () => {
    const secret = "PRIVATE SDK breakpoint getter exception";
    let accessorReads = 0;
    const request = finiteBreakpointRequest();
    Object.defineProperty(request.left, "experiment", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error(secret);
      },
    });

    const outcome = await findFiniteBreakpoint(request as never);

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "breakpoint-request-invalid",
        message: "Finite Breakpoint request must be a plain JSON value",
      },
    });
    expect(accessorReads).toBe(0);
    expect(JSON.stringify(outcome)).not.toContain(secret);
    expect(allObjectsAreFrozen(outcome)).toBe(true);
  });

  it("rejects extra finite Breakpoint envelope and side fields", async () => {
    const extraEnvelope = await findFiniteBreakpoint({
      ...finiteBreakpointRequest(),
      unexpected: true,
    } as never);
    const request = finiteBreakpointRequest();
    const extraSide = await findFiniteBreakpoint({
      ...request,
      right: {
        ...request.right,
        unexpected: true,
      },
    } as never);

    expect(extraEnvelope).toEqual({
      ok: false,
      error: {
        code: "breakpoint-request-invalid",
        message: "Finite Breakpoint request has an invalid field set",
      },
    });
    expect(extraSide).toEqual({
      ok: false,
      error: {
        code: "breakpoint-request-invalid",
        message:
          "Each finite Breakpoint side must contain exactly experiment, scenarios, and patches",
        path: "/right",
        side: "right",
      },
    });
  });

  it("snapshots the Patch set and bodies before the first asynchronous Ruleset load", async () => {
    const request = structuredClone({
      experiment: await patchBackedExperiment(),
      scenarios: [scenarioFixture],
      patches: [scenarioPatchFixture],
      catalog: catalogFixture,
    });
    const pending = runExperiment(request);
    const patch = request.patches[0] as unknown as {
      contentHash: string;
      operations: Array<{ value: number }>;
    };
    patch.contentHash = `sha256:${"f".repeat(64)}`;
    const operation = patch.operations[0];
    if (operation === undefined) {
      throw new Error("Expected the checked-in Patch to contain one operation");
    }
    operation.value = 63;
    request.patches.length = 0;

    const outcome = await pending;

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    expect(outcome.variants[0]?.scenario).toEqual(scenarioPatchExpectedScenarioFixture);
    expect(outcome.comparison.variants).toMatchObject([
      {
        id: "critical-tier-2",
        metricValue: 150,
        deltaFromBase: 50,
      },
    ]);
  });

  it("rejects a Patch-backed Experiment when the SDK request omits patches", async () => {
    const outcome = await runExperiment({
      experiment: await patchBackedExperiment(),
      scenarios: [scenarioFixture],
      catalog: catalogFixture,
    });

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "patch-set-mismatch",
        message: "Patch-backed Experiment mode requires Patch inputs",
        path: "/patches",
        causeCode: "missing-patch-set",
      },
    });
  });

  it("rejects accessors without invoking them or leaking their exception", async () => {
    const secret = "PRIVATE SDK getter exception";
    let accessorReads = 0;
    const request: Record<string, unknown> = {
      scenarios: [scenarioFixture, probabilityScenarioFixture, radialScenarioFixture],
      catalog: catalogFixture,
    };
    Object.defineProperty(request, "experiment", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error(secret);
      },
    });

    const outcome = await runExperiment(request as never);

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "experiment-invalid",
        message: "Experiment request must be a plain JSON value",
      },
    });
    expect(accessorReads).toBe(0);
    expect(JSON.stringify(outcome)).not.toContain(secret);
    expect(allObjectsAreFrozen(outcome)).toBe(true);
  });

  it("rejects extra SDK Experiment request fields instead of silently dropping them", async () => {
    const outcome = await runExperiment({
      experiment: await comparisonExperiment(),
      scenarios: [scenarioFixture, probabilityScenarioFixture, radialScenarioFixture],
      catalog: catalogFixture,
      unexpected: true,
    } as never);

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "experiment-invalid",
        message: "Experiment request has an invalid field set",
      },
    });
  });

  it("materializes a Scenario Patch and evaluates the ordinary derived Scenario", async () => {
    const request = {
      patch: await criticalTierScenarioPatch(),
      scenario: scenarioFixture,
    };
    const requestBefore = canonicalize(request);

    const first = await materializeScenarioPatch(structuredClone(request));
    const second = await materializeScenarioPatch(structuredClone(request));

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(canonicalize(request)).toBe(requestBefore);
    if (!first.ok) {
      throw new Error(first.error.message);
    }
    expect(first.scenario.id).toBe("scenario.sdk-materialized-critical-tier");
    expect(first.scenario.createdFrom).toEqual(artifactRef(scenarioFixture));
    expect(first.scenario.actionPlan[0]?.parameters.criticalTier).toBe(2);
    expect(await contentHashIsValid(first.scenario)).toBe(true);
    expect(allObjectsAreFrozen(first)).toBe(true);

    const evaluation = await evaluateScenario({
      scenario: first.scenario,
      catalog: catalogFixture,
    });
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) {
      throw new Error(evaluation.error.message);
    }
    expect(evaluation.result.metrics["damage.health.total"]).toBe(150);
    expect(evaluation.result.warnings).toContainEqual({
      code: "warning.synthetic-experimental-rules",
      message:
        "This Result uses synthetic experimental mechanics and is not a verified current Warframe claim.",
    });
  });

  it("connects the checked-in Scenario Patch and literal expectations to the regression gate", async () => {
    const materialized = await materializeScenarioPatch({
      patch: scenarioPatchFixture,
      scenario: scenarioFixture,
    });
    expect(materialized.ok).toBe(true);
    if (!materialized.ok) {
      throw new Error(materialized.error.message);
    }
    expect(canonicalize(materialized.scenario)).toBe(
      canonicalize(scenarioPatchExpectedScenarioFixture),
    );

    const evaluation = await evaluateScenario({
      scenario: materialized.scenario,
      catalog: catalogFixture,
    });
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) {
      throw new Error(evaluation.error.message);
    }
    expect({
      patchId: scenarioPatchFixture.id,
      patchContentHash: scenarioPatchFixture.contentHash,
      baseScenarioId: scenarioPatchFixture.baseScenarioRef.id,
      resultScenarioId: materialized.scenario.id,
      changedPaths: scenarioPatchFixture.operations.map((operation) => operation.path),
      criticalTier: materialized.scenario.actionPlan[0]?.parameters.criticalTier,
      healthDamage: evaluation.result.metrics["damage.health.total"],
      remainingHealth: evaluation.result.metrics["target.health.remaining"],
    }).toEqual(scenarioPatchExpectedProjectionFixture);
  });

  it("keeps the SDK Patch wrapper exact, mutation-safe, and accessor-safe", async () => {
    const request = structuredClone({
      patch: await criticalTierScenarioPatch(),
      scenario: scenarioFixture,
    });
    const pending = materializeScenarioPatch(request);
    (request.patch as Record<string, unknown>).id = "scenario-patch.mutated-after-call";
    (request.scenario as Record<string, unknown>).contentHash = `sha256:${"f".repeat(64)}`;
    const outcome = await pending;
    expect(outcome.ok).toBe(true);

    const extra = await materializeScenarioPatch({
      patch: await criticalTierScenarioPatch(),
      scenario: scenarioFixture,
      unexpected: true,
    } as never);
    expect(extra).toEqual({
      ok: false,
      error: {
        code: "scenario-patch-request-invalid",
        message: "Scenario Patch request has an invalid field set",
      },
    });

    const secret = "PRIVATE SDK Scenario Patch getter exception";
    let accessorReads = 0;
    const accessorRequest: Record<string, unknown> = { scenario: scenarioFixture };
    Object.defineProperty(accessorRequest, "patch", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error(secret);
      },
    });
    const rejected = await materializeScenarioPatch(accessorRequest as never);
    expect(rejected).toEqual({
      ok: false,
      error: {
        code: "scenario-patch-request-invalid",
        message: "Scenario Patch request must be a plain JSON object",
      },
    });
    expect(accessorReads).toBe(0);
    expect(JSON.stringify(rejected)).not.toContain(secret);
    expect(allObjectsAreFrozen(rejected)).toBe(true);
  });
});
