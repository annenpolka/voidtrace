import type { ArtifactRef } from "@voidtrace/spec-artifacts/contracts";
import { describe, expect, it } from "vitest";
import { artifactMatchesRef } from "./artifact-ref.ts";
import { canonicalizeJson } from "./canonical-json.ts";
import {
  attachArtifactContentHash,
  attachResultHash,
  verifyArtifactContentHash,
  verifyResultIntegrity,
  verifyResultTraceIntegrity,
  verifyTraceIntegrity,
} from "./fingerprint.ts";
import { assertStableId, isStableId } from "./stable-id.ts";
import { validateContract } from "./validator.ts";

const HASH = `sha256:${"0".repeat(64)}`;

function artifactRef(kind: string, id: string): ArtifactRef {
  return {
    kind,
    schemaVersion: "0.1.0",
    id,
    revision: 0,
    contentHash: HASH,
    gameBuild: "43.0.0",
  };
}

const scenario = {
  $schema: "urn:voidtrace:schema:scenario:0.1.0",
  kind: "voidtrace.scenario",
  schemaVersion: "0.1.0",
  id: "scenario.example",
  revision: 0,
  contentHash: HASH,
  gameBuild: "43.0.0",
  catalogRef: artifactRef("catalog-snapshot", "catalog.example"),
  rulesetRef: artifactRef("ruleset", "ruleset.example"),
  attacker: {
    id: "actor.primary",
    configuration: {
      weaponId: "weapon.example",
    },
  },
  targets: [
    {
      id: "target.primary",
      configuration: {
        enemyId: "enemy.example",
        level: 1,
      },
    },
  ],
  initialState: {
    comboMultiplier: 1,
  },
  actionPlan: [
    {
      id: "action.000",
      kind: "fire",
      parameters: {
        atMs: 0,
      },
    },
  ],
  simulation: {
    mode: "deterministic",
    timeLimitMs: 1_000,
  },
  metrics: ["metric.total-damage"],
  assumptions: [],
} as const;

const fingerprint = {
  productVersion: "0.1.0",
  engineVersion: "0.1.0",
  scenarioSchemaVersion: "0.1.0",
  catalogHash: HASH,
  rulesetHash: HASH,
  scenarioHash: HASH,
  seed: 0,
  resultHash: HASH,
} as const;

const result = {
  $schema: "urn:voidtrace:schema:result:0.1.0",
  kind: "voidtrace.result",
  schemaVersion: "0.1.0",
  id: "result.example",
  revision: 0,
  contentHash: HASH,
  gameBuild: "43.0.0",
  scenarioRef: artifactRef("voidtrace.scenario", "scenario.example"),
  fingerprint,
  coverage: {
    verified: [],
    experimental: [],
    disputed: [],
    unsupported: [],
    approximated: [],
  },
  metrics: {
    "metric.total-damage": 10,
  },
  damageBySource: {
    "source.direct": 10,
  },
  damageByType: {
    "damage.impact": 10,
  },
  resolvedDefaults: {},
  assumptions: [],
  warnings: [],
} as const;

const trace = {
  $schema: "urn:voidtrace:schema:trace:0.1.0",
  kind: "voidtrace.trace",
  schemaVersion: "0.1.0",
  id: "trace.example",
  revision: 0,
  contentHash: HASH,
  gameBuild: "43.0.0",
  scenarioRef: artifactRef("voidtrace.scenario", "scenario.example"),
  fingerprint,
  level: "rules",
  decisions: [
    {
      outcome: "applied",
      sequence: 0,
      eventId: "event.000",
      eventTimeMs: 0,
      phase: "rule.resolve",
      ruleId: "rule.example",
      reads: {},
      evidenceStatus: "experimental",
      evidenceIds: [],
      matched: true,
      operations: [
        {
          kind: "record",
          parameters: {
            value: 10,
          },
        },
      ],
      before: {
        damage: 0,
      },
      after: {
        damage: 10,
      },
    },
    {
      outcome: "rejected",
      sequence: 1,
      eventId: "event.000",
      eventTimeMs: 0,
      phase: "rule.resolve",
      ruleId: "rule.other",
      reads: {},
      evidenceStatus: "disputed",
      evidenceIds: [],
      matched: true,
      rejectionStage: "guard",
      guardResult: false,
      rejectionReason: {
        code: "guard.false",
        message: "required guard was false",
      },
    },
  ],
} as const;

describe("generated Contract validation", () => {
  it("compiles every schema and accepts representative Artifacts", () => {
    expect(validateContract("artifact-ref", artifactRef("ruleset", "ruleset.example"))).toEqual({
      ok: true,
      value: artifactRef("ruleset", "ruleset.example"),
    });
    expect(validateContract("fingerprint", fingerprint).ok).toBe(true);
    expect(validateContract("scenario", scenario).ok).toBe(true);
    expect(validateContract("result", result).ok).toBe(true);
    expect(validateContract("trace", trace).ok).toBe(true);
  });

  it("rejects wrong discriminators, extra fields, invalid hashes, and negative revisions", () => {
    expect(validateContract("scenario", { ...scenario, kind: "scenario" }).ok).toBe(false);
    expect(validateContract("scenario", { ...scenario, extra: true }).ok).toBe(false);
    expect(validateContract("scenario", { ...scenario, contentHash: "sha256:short" }).ok).toBe(
      false,
    );
    expect(validateContract("scenario", { ...scenario, revision: -1 }).ok).toBe(false);
  });

  it("does not coerce, repair, or mutate invalid input", () => {
    const input = {
      ...scenario,
      revision: "0",
    };
    const before = canonicalizeJson(input);
    const first = validateContract("scenario", input);
    const second = validateContract("scenario", input);

    expect(first.ok).toBe(false);
    expect(second).toEqual(first);
    expect(canonicalizeJson(input)).toBe(before);
  });

  it("rejects inherited fields and accessors as stable non-JSON failures", () => {
    const inherited = Object.create(artifactRef("ruleset", "ruleset.example"));
    const first = validateContract("artifact-ref", inherited);
    const second = validateContract("artifact-ref", inherited);

    expect(first).toEqual({
      ok: false,
      issues: [
        {
          instancePath: "",
          schemaPath: "#",
          keyword: "jsonValue",
          message: "must be a plain JSON value with own enumerable data properties",
          details: '{"constraint":"plain-json"}',
        },
      ],
    });
    expect(second).toEqual(first);

    let reads = 0;
    const accessor = {
      ...artifactRef("ruleset", "ruleset.example"),
    };
    Object.defineProperty(accessor, "revision", {
      enumerable: true,
      get: () => {
        reads += 1;
        return 0;
      },
    });

    expect(validateContract("artifact-ref", accessor).ok).toBe(false);
    expect(reads).toBe(0);
  });

  it("validates and returns one descriptor snapshot instead of Proxy get values", () => {
    const source = artifactRef("ruleset", "ruleset.original");
    let reads = 0;
    const proxy = new Proxy(source, {
      get(target, property, receiver) {
        reads += 1;
        if (property === "id") {
          return "ruleset.spoofed";
        }
        if (property === "revision") {
          return 9;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const validation = validateContract("artifact-ref", proxy);
    expect(validation).toMatchObject({
      ok: true,
      value: {
        id: "ruleset.original",
        revision: 0,
      },
    });
    expect(reads).toBe(0);
  });

  it("requires bounded Monte Carlo inputs and structured rejection reasons", () => {
    expect(
      validateContract("scenario", {
        ...scenario,
        simulation: {
          mode: "monte-carlo",
          iterations: 10,
          timeLimitMs: 1_000,
        },
      }).ok,
    ).toBe(false);

    const rejected = trace.decisions[1];
    const { rejectionReason: _reason, ...withoutReason } = rejected;
    expect(
      validateContract("trace", {
        ...trace,
        decisions: [withoutReason],
      }).ok,
    ).toBe(false);
  });

  it("enforces Artifact kinds at each typed reference boundary", () => {
    expect(
      validateContract("scenario", {
        ...scenario,
        catalogRef: artifactRef("ruleset", "catalog.example"),
      }).ok,
    ).toBe(false);
    expect(
      validateContract("scenario", {
        ...scenario,
        rulesetRef: artifactRef("catalog-snapshot", "ruleset.example"),
      }).ok,
    ).toBe(false);
    expect(
      validateContract("result", {
        ...result,
        scenarioRef: artifactRef("ruleset", "scenario.example"),
      }).ok,
    ).toBe(false);
    expect(
      validateContract("trace", {
        ...trace,
        scenarioRef: artifactRef("ruleset", "scenario.example"),
      }).ok,
    ).toBe(false);
    expect(
      validateContract("result", {
        ...result,
        traceRef: artifactRef("voidtrace.scenario", "trace.example"),
      }).ok,
    ).toBe(false);
    expect(
      validateContract("result", {
        ...result,
        traceRef: artifactRef("voidtrace.trace", "trace.example"),
      }).ok,
    ).toBe(true);
  });

  it("rejects unstable Result metric and damage record keys", () => {
    for (const [field, value] of [
      ["metrics", { "Total Damage": 10 }],
      ["damageBySource", { "source/direct": 10 }],
      ["damageByType", { "Impact Damage": 10 }],
    ] as const) {
      expect(
        validateContract("result", {
          ...result,
          [field]: value,
        }).ok,
      ).toBe(false);
    }
  });

  it("enforces each rejected Trace decision stage as a coherent shape", () => {
    const guardRejected = trace.decisions[1];
    const { guardResult: _guardResult, ...withoutGuardResult } = guardRejected;
    const predicateRejected = {
      ...withoutGuardResult,
      rejectionStage: "predicate",
      matched: false,
    };
    const operationRejected = {
      ...withoutGuardResult,
      rejectionStage: "operation",
      matched: true,
    };

    for (const decision of [predicateRejected, guardRejected, operationRejected]) {
      expect(
        validateContract("trace", {
          ...trace,
          decisions: [decision],
        }).ok,
      ).toBe(true);
    }

    for (const decision of [
      { ...predicateRejected, matched: true },
      { ...predicateRejected, guardResult: false },
      withoutGuardResult,
      { ...guardRejected, guardResult: true },
      { ...operationRejected, matched: false },
      { ...operationRejected, guardResult: false },
    ]) {
      expect(
        validateContract("trace", {
          ...trace,
          decisions: [decision],
        }).ok,
      ).toBe(false);
    }
  });
});

describe("ArtifactRef integrity", () => {
  it("matches identity fields and a verified canonical content hash", async () => {
    const { contentHash: _contentHash, ...scenarioWithoutHash } = scenario;
    const artifact = await attachArtifactContentHash(scenarioWithoutHash);
    const reference: ArtifactRef = {
      kind: artifact.kind,
      schemaVersion: artifact.schemaVersion,
      id: artifact.id,
      revision: artifact.revision,
      contentHash: artifact.contentHash,
      gameBuild: artifact.gameBuild,
    };

    await expect(artifactMatchesRef(reference, artifact)).resolves.toBe(true);
    await expect(
      artifactMatchesRef(
        {
          ...reference,
          revision: 1,
        },
        artifact,
      ),
    ).resolves.toBe(false);
  });

  it("rejects schema-invalid references and non-JSON Artifact state", async () => {
    const invalidArtifact = await attachArtifactContentHash({
      kind: "INVALID KIND",
      schemaVersion: "no",
      id: "../bad",
      revision: -1,
      gameBuild: "",
    });
    const invalidReference: ArtifactRef = {
      kind: invalidArtifact.kind,
      schemaVersion: invalidArtifact.schemaVersion,
      id: invalidArtifact.id,
      revision: invalidArtifact.revision,
      contentHash: invalidArtifact.contentHash,
      gameBuild: invalidArtifact.gameBuild,
    };

    expect(validateContract("artifact-ref", invalidReference).ok).toBe(false);
    await expect(artifactMatchesRef(invalidReference, invalidArtifact)).resolves.toBe(false);

    const { contentHash: _contentHash, ...scenarioWithoutHash } = scenario;
    const validArtifact = await attachArtifactContentHash(scenarioWithoutHash);
    const hiddenArtifact = { ...validArtifact };
    Object.defineProperty(hiddenArtifact, "hidden", {
      enumerable: false,
      value: 42,
    });
    const validReference: ArtifactRef = {
      kind: validArtifact.kind,
      schemaVersion: validArtifact.schemaVersion,
      id: validArtifact.id,
      revision: validArtifact.revision,
      contentHash: validArtifact.contentHash,
      gameBuild: validArtifact.gameBuild,
    };

    await expect(artifactMatchesRef(validReference, hiddenArtifact)).resolves.toBe(false);
  });

  it("cannot be redirected to a spoofed reference by Proxy get traps", async () => {
    const { contentHash: _contentHash, ...scenarioWithoutHash } = scenario;
    const artifact = await attachArtifactContentHash(scenarioWithoutHash);
    const originalReference: ArtifactRef = {
      kind: artifact.kind,
      schemaVersion: artifact.schemaVersion,
      id: artifact.id,
      revision: artifact.revision,
      contentHash: artifact.contentHash,
      gameBuild: artifact.gameBuild,
    };
    const spoofedReference: ArtifactRef = {
      ...originalReference,
      id: "scenario.spoofed",
      revision: 9,
    };
    let reads = 0;
    const proxy = new Proxy(artifact, {
      get(target, property, receiver) {
        reads += 1;
        if (property === "id") {
          return spoofedReference.id;
        }
        if (property === "revision") {
          return spoofedReference.revision;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    await expect(artifactMatchesRef(originalReference, proxy)).resolves.toBe(true);
    await expect(artifactMatchesRef(spoofedReference, proxy)).resolves.toBe(false);
    expect(reads).toBe(0);
  });
});

describe("Result and Trace integrity", () => {
  it("binds both output Artifacts to one verified Scenario fingerprint", async () => {
    const { contentHash: _scenarioHash, ...scenarioBody } = scenario;
    const hashedScenario = await attachArtifactContentHash(scenarioBody);
    const scenarioReference = {
      kind: hashedScenario.kind,
      schemaVersion: hashedScenario.schemaVersion,
      id: hashedScenario.id,
      revision: hashedScenario.revision,
      contentHash: hashedScenario.contentHash,
      gameBuild: hashedScenario.gameBuild,
    } as const satisfies ArtifactRef;
    const executionFingerprint = await attachResultHash({
      productVersion: "0.1.0",
      engineVersion: "0.1.0",
      scenarioSchemaVersion: hashedScenario.schemaVersion,
      catalogHash: hashedScenario.catalogRef.contentHash,
      rulesetHash: hashedScenario.rulesetRef.contentHash,
      scenarioHash: hashedScenario.contentHash,
      seed: 0,
    });

    const { contentHash: _traceHash, ...traceBody } = trace;
    const hashedTrace = await attachArtifactContentHash({
      ...traceBody,
      scenarioRef: scenarioReference,
      fingerprint: executionFingerprint,
    });
    const traceReference = {
      kind: hashedTrace.kind,
      schemaVersion: hashedTrace.schemaVersion,
      id: hashedTrace.id,
      revision: hashedTrace.revision,
      contentHash: hashedTrace.contentHash,
      gameBuild: hashedTrace.gameBuild,
    } as const satisfies ArtifactRef;
    const { contentHash: _resultHash, ...resultBody } = result;
    const hashedResult = await attachArtifactContentHash({
      ...resultBody,
      scenarioRef: scenarioReference,
      fingerprint: executionFingerprint,
      traceRef: traceReference,
    });

    await expect(verifyResultIntegrity(hashedResult, hashedScenario)).resolves.toBe(true);
    await expect(verifyTraceIntegrity(hashedTrace, hashedScenario)).resolves.toBe(true);
    await expect(
      verifyResultTraceIntegrity(hashedResult, hashedTrace, hashedScenario),
    ).resolves.toBe(true);

    const alternateFingerprint = await attachResultHash({
      productVersion: "0.1.0",
      engineVersion: "0.1.0",
      scenarioSchemaVersion: hashedScenario.schemaVersion,
      catalogHash: hashedScenario.catalogRef.contentHash,
      rulesetHash: hashedScenario.rulesetRef.contentHash,
      scenarioHash: hashedScenario.contentHash,
      seed: 1,
    });
    const alternateTrace = await attachArtifactContentHash({
      ...traceBody,
      scenarioRef: scenarioReference,
      fingerprint: alternateFingerprint,
    });
    const alternateTraceReference = {
      kind: alternateTrace.kind,
      schemaVersion: alternateTrace.schemaVersion,
      id: alternateTrace.id,
      revision: alternateTrace.revision,
      contentHash: alternateTrace.contentHash,
      gameBuild: alternateTrace.gameBuild,
    } as const satisfies ArtifactRef;
    const resultLinkedToAlternateTrace = await attachArtifactContentHash({
      ...resultBody,
      scenarioRef: scenarioReference,
      fingerprint: executionFingerprint,
      traceRef: alternateTraceReference,
    });
    await expect(
      verifyResultTraceIntegrity(resultLinkedToAlternateTrace, alternateTrace, hashedScenario),
    ).resolves.toBe(false);

    await expect(
      verifyResultIntegrity(
        {
          ...hashedResult,
          revision: hashedResult.revision + 1,
        },
        hashedScenario,
      ),
    ).resolves.toBe(false);
    await expect(
      verifyTraceIntegrity(
        {
          ...hashedTrace,
          fingerprint: {
            ...executionFingerprint,
            catalogHash: `sha256:${"f".repeat(64)}`,
          },
        },
        hashedScenario,
      ),
    ).resolves.toBe(false);

    const monteCarloScenario = await attachArtifactContentHash({
      ...scenarioBody,
      simulation: {
        mode: "monte-carlo",
        seed: 7,
        iterations: 10,
        timeLimitMs: 1_000,
      },
    });
    const mismatchedSeedFingerprint = await attachResultHash({
      productVersion: "0.1.0",
      engineVersion: "0.1.0",
      scenarioSchemaVersion: monteCarloScenario.schemaVersion,
      catalogHash: monteCarloScenario.catalogRef.contentHash,
      rulesetHash: monteCarloScenario.rulesetRef.contentHash,
      scenarioHash: monteCarloScenario.contentHash,
      seed: 8,
    });
    const resultWithMismatchedSeed = await attachArtifactContentHash({
      ...resultBody,
      scenarioRef: {
        kind: monteCarloScenario.kind,
        schemaVersion: monteCarloScenario.schemaVersion,
        id: monteCarloScenario.id,
        revision: monteCarloScenario.revision,
        contentHash: monteCarloScenario.contentHash,
        gameBuild: monteCarloScenario.gameBuild,
      },
      fingerprint: mismatchedSeedFingerprint,
    });
    await expect(verifyResultIntegrity(resultWithMismatchedSeed, monteCarloScenario)).resolves.toBe(
      false,
    );

    const mutableResult = structuredClone(hashedResult);
    const pendingIntegrity = verifyResultTraceIntegrity(mutableResult, hashedTrace, hashedScenario);
    (mutableResult.metrics as Record<string, number>)["metric.total-damage"] = 999;
    await expect(pendingIntegrity).resolves.toBe(true);
    await expect(verifyArtifactContentHash(mutableResult)).resolves.toBe(false);
  });
});

describe("stable IDs", () => {
  it("accepts repository IDs and rejects display names or path-like values", () => {
    expect(isStableId("scenario.torid-incarnon.001")).toBe(true);
    expect(isStableId("Torid Incarnon")).toBe(false);
    expect(isStableId("../scenario")).toBe(false);
    expect(() => assertStableId("scenario.valid")).not.toThrow();
    expect(() => assertStableId("not valid")).toThrow("Invalid stable ID");
  });
});
