import generatedCapabilities from "@voidtrace/spec-artifacts/capabilities" with { type: "json" };
import { describe, expect, it } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
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
    $schema: "urn:voidtrace:schema:experiment:0.1.0",
    kind: "voidtrace.experiment",
    schemaVersion: "0.1.0",
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
