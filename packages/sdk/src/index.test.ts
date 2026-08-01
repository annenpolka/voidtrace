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
import { describeCapabilities, evaluateScenario, runExperiment } from "./index.ts";

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
});
