import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  attachArtifactContentHash,
  canonicalizeJson,
  validateContract,
} from "@voidtrace/contracts";
import { describeCapabilities, evaluateScenario, type SdkEvaluationOutcome } from "@voidtrace/sdk";
import { describe, expect, it, vi } from "vitest";
import catalogFixture from "../../../data/fixtures/catalog-mini/catalog.json" with { type: "json" };
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import {
  createNodeApplication,
  createProblem,
  exitCodeForProblem,
  type SdkFacade,
} from "./application.ts";

const scenarioPath = fileURLToPath(
  new URL("../../../data/fixtures/golden/direct-critical-armor.scenario.json", import.meta.url),
);
const catalogPath = fileURLToPath(
  new URL("../../../data/fixtures/catalog-mini/catalog.json", import.meta.url),
);
const tier2ScenarioPath = fileURLToPath(
  new URL("../../../data/fixtures/golden/tier-2-critical-armor.scenario.json", import.meta.url),
);
const tier2CatalogPath = fileURLToPath(
  new URL("../../../data/fixtures/catalog-mini/catalog-tier-2.json", import.meta.url),
);
const expectedScenarioPath = fileURLToPath(
  new URL("../../../data/fixtures/golden/expected-critical-armor.scenario.json", import.meta.url),
);

const defaultSdk: SdkFacade = {
  describeCapabilities,
  evaluateScenario,
};

type SdkEvaluationError = Extract<SdkEvaluationOutcome, { readonly ok: false }>["error"];

function sdkFailure(error: SdkEvaluationError): SdkFacade {
  return {
    describeCapabilities,
    evaluateScenario: async () => ({
      ok: false,
      error,
    }),
  };
}

describe("createProblem", () => {
  it("derives stable exit codes and validates the generated Problem contract", () => {
    for (const [classification, exitCode] of [
      ["input", 2],
      ["unsupported", 3],
      ["limit", 4],
      ["internal", 5],
    ] as const) {
      const problem = createProblem({
        classification,
        code: `cli.${classification}`,
        message: `${classification} problem`,
      });

      expect(exitCodeForProblem(problem)).toBe(exitCode);
      expect(validateContract("problem", problem).ok).toBe(true);
      expect(validateContract("problem", { ...problem, exitCode }).ok).toBe(false);
      expect(Object.isFrozen(problem)).toBe(true);
    }
  });
});

describe("createNodeApplication", () => {
  it("describes capabilities through the SDK facade", () => {
    const app = createNodeApplication();

    expect(app.describe()).toEqual(describeCapabilities());
    expect(Object.isFrozen(app.describe())).toBe(true);
  });

  it("evaluates the golden Scenario and Catalog from files", async () => {
    const outcome = await createNodeApplication().evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.problem.message);
    }
    expect(outcome.result.kind).toBe("voidtrace.result");
    expect(outcome.trace.kind).toBe("voidtrace.trace");
  });

  it("evaluates generalized tier-2 Critical metrics from files", async () => {
    const outcome = await createNodeApplication().evaluate({
      scenarioSource: tier2ScenarioPath,
      catalogSource: tier2CatalogPath,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.problem.message);
    }
    expect(outcome.result.metrics).toMatchObject({
      "critical.roll": 0.2,
      "critical.base-tier": 1,
      "critical.next-tier": 2,
      "critical.fraction": 0.25,
      "critical.base-tier.probability": 0.75,
      "critical.next-tier.probability": 0.25,
      "critical.tier-0.probability": 0,
      "critical.tier-1.probability": 0.75,
      "critical.tier": 2,
      "critical.multiplier": 3,
      "damage.health.total": 150,
      "target.health.remaining": 850,
    });
    expect(outcome.trace.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outcome: "applied",
          ruleId: "rule.critical.resolve-tier-roll",
        }),
        expect.objectContaining({
          outcome: "applied",
          ruleId: "rule.critical.scale-tier",
        }),
      ]),
    );
  });

  it("evaluates terminal-branch Critical expected metrics from files", async () => {
    const outcome = await createNodeApplication().evaluate({
      scenarioSource: expectedScenarioPath,
      catalogSource: tier2CatalogPath,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error(outcome.problem.message);
    }
    expect(outcome.result.metrics).toMatchObject({
      "critical.base-tier": 1,
      "critical.next-tier": 2,
      "critical.base-tier.probability": 0.75,
      "critical.next-tier.probability": 0.25,
      "critical.expected.multiplier": 2.25,
      "damage.expected.post-critical.total": 225,
      "damage.expected.health.total": 112.5,
      "target.health.expected-remaining": 18.75,
    });
    expect(outcome.result.metrics).not.toHaveProperty("critical.tier");
    expect(outcome.trace.decisions.at(-1)).toMatchObject({
      outcome: "applied",
      ruleId: "rule.critical.aggregate-expected-branches",
      after: {
        "damage.total": 112.5,
        "target.health": 18.75,
      },
    });
  });

  it("produces the same outcome for file and stdin Scenario sources", async () => {
    const scenarioText = await readFile(scenarioPath, "utf8");
    const fileOutcome = await createNodeApplication().evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });
    const stdinOutcome = await createNodeApplication({
      readStdin: async () => scenarioText,
    }).evaluate({
      scenarioSource: "-",
      catalogSource: catalogPath,
    });

    expect(canonicalizeJson(stdinOutcome)).toBe(canonicalizeJson(fileOutcome));
  });

  it("accepts caller-supplied stdin text without consulting process stdin", async () => {
    const readStdin = vi.fn(async () => {
      throw new Error("must not read process stdin");
    });
    const outcome = await createNodeApplication({ readStdin }).evaluate({
      scenarioSource: "-",
      catalogSource: catalogPath,
      stdinText: JSON.stringify(scenarioFixture),
    });

    expect(outcome.ok).toBe(true);
    expect(readStdin).not.toHaveBeenCalled();
  });

  it("rejects two stdin sources before reading either input", async () => {
    const readStdin = vi.fn(async () => JSON.stringify(scenarioFixture));
    const readTextFile = vi.fn(async () => JSON.stringify(catalogFixture));
    const outcome = await createNodeApplication({ readStdin, readTextFile }).evaluate({
      scenarioSource: "-",
      catalogSource: "-",
    });

    expect(outcome).toEqual({
      ok: false,
      problem: {
        kind: "voidtrace.problem",
        schemaVersion: "0.1.0",
        code: "cli.stdin-conflict",
        message: "Scenario and Catalog cannot both read from stdin",
        classification: "input",
      },
    });
    expect(readStdin).not.toHaveBeenCalled();
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it("normalizes malformed JSON without exposing V8 diagnostics", async () => {
    const app = createNodeApplication({
      readStdin: async () => '{"secret":',
    });
    const first = await app.evaluate({
      scenarioSource: "-",
      catalogSource: catalogPath,
    });
    const second = await app.evaluate({
      scenarioSource: "-",
      catalogSource: catalogPath,
    });

    expect(first).toEqual(second);
    expect(first).toEqual({
      ok: false,
      problem: {
        kind: "voidtrace.problem",
        schemaVersion: "0.1.0",
        code: "cli.json-invalid",
        message: "Scenario input is not valid JSON",
        classification: "input",
        source: "-",
      },
    });
    expect(canonicalizeJson(first)).not.toContain("secret");
  });

  it("normalizes file failures without exposing raw OS or exception text", async () => {
    const outcome = await createNodeApplication({
      readTextFile: async (path) => {
        if (path === scenarioPath) {
          throw new Error("ENOENT /private/secret runtime detail");
        }
        return JSON.stringify(catalogFixture);
      },
    }).evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });

    expect(outcome).toMatchObject({
      ok: false,
      problem: {
        code: "cli.file-read-failed",
        message: "Could not read Scenario JSON input",
        classification: "input",
        source: scenarioPath,
      },
    });
    expect(canonicalizeJson(outcome)).not.toContain("ENOENT");
    expect(canonicalizeJson(outcome)).not.toContain("/private/secret");
  });

  it("maps unsupported Scenario paths to exit code 3 with structured context", async () => {
    const changed = structuredClone(scenarioFixture) as {
      contentHash: string;
      actionPlan: Array<{
        parameters: {
          hitLocation: string;
        };
      }>;
    } & Record<string, unknown>;
    const action = changed.actionPlan[0];
    if (action === undefined) {
      throw new Error("Golden Scenario must contain an action");
    }
    action.parameters.hitLocation = "hit-location.head";
    const { contentHash: _contentHash, ...withoutHash } = changed;
    const unsupportedScenario = await attachArtifactContentHash(withoutHash);
    const outcome = await createNodeApplication({
      readStdin: async () => JSON.stringify(unsupportedScenario),
    }).evaluate({
      scenarioSource: "-",
      catalogSource: catalogPath,
    });

    expect(outcome).toMatchObject({
      ok: false,
      problem: {
        code: "scenario-invalid",
        classification: "unsupported",
        pointer: "/actionPlan/0/parameters/hitLocation",
        mechanicId: "mechanic.hit-location",
        causeCode: "unsupported-hit-location",
        source: "-",
      },
    });
  });

  it.each([
    {
      error: {
        code: "unsupported-delivery",
        message: "Unsupported delivery",
        mechanicId: "mechanic.delivery.projectile",
      } satisfies SdkEvaluationError,
      causeCode: undefined,
    },
    {
      error: {
        code: "rule-execution-failed",
        message: "Unsupported rule",
        causeCode: "unsupported-rule",
      } satisfies SdkEvaluationError,
      causeCode: "unsupported-rule",
    },
  ])("maps unsupported delivery and Rule failures to exit code 3", async ({ error, causeCode }) => {
    const outcome = await createNodeApplication({
      sdk: sdkFailure(error),
    }).evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });

    expect(outcome).toMatchObject({
      ok: false,
      problem: {
        code: error.code,
        classification: "unsupported",
        ...(causeCode === undefined ? {} : { causeCode }),
      },
    });
  });

  it("maps an unrepresentable Critical chance to the Catalog source", async () => {
    const outcome = await createNodeApplication({
      sdk: sdkFailure({
        code: "unsupported-critical-chance",
        message: "Critical chance cannot produce safely representable tiers",
        path: "/weapons/0/attackModes/0/criticalChance",
        mechanicId: "mechanic.critical.probability",
      }),
    }).evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });

    expect(outcome).toMatchObject({
      ok: false,
      problem: {
        code: "unsupported-critical-chance",
        classification: "unsupported",
        pointer: "/weapons/0/attackModes/0/criticalChance",
        mechanicId: "mechanic.critical.probability",
        source: catalogPath,
      },
    });
    if (!outcome.ok) {
      expect(exitCodeForProblem(outcome.problem)).toBe(3);
    }
  });

  it("maps an unrepresentable Critical multiplier to the Catalog source", async () => {
    const outcome = await createNodeApplication({
      sdk: sdkFailure({
        code: "unsupported-critical-multiplier",
        message: "Critical tier multiplier cannot be represented finitely",
        path: "/weapons/0/attackModes/0/criticalMultiplier",
        mechanicId: "mechanic.critical.tier-multiplier",
      }),
    }).evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });

    expect(outcome).toMatchObject({
      ok: false,
      problem: {
        code: "unsupported-critical-multiplier",
        classification: "unsupported",
        pointer: "/weapons/0/attackModes/0/criticalMultiplier",
        mechanicId: "mechanic.critical.tier-multiplier",
        source: catalogPath,
      },
    });
    if (!outcome.ok) {
      expect(exitCodeForProblem(outcome.problem)).toBe(3);
    }
  });

  it("maps stale Artifact content to an input Problem", async () => {
    const staleScenario = {
      ...scenarioFixture,
      contentHash: `sha256:${"0".repeat(64)}`,
    };
    const outcome = await createNodeApplication({
      readStdin: async () => JSON.stringify(staleScenario),
    }).evaluate({
      scenarioSource: "-",
      catalogSource: catalogPath,
    });

    expect(outcome).toMatchObject({
      ok: false,
      problem: {
        code: "scenario-invalid",
        classification: "input",
        causeCode: "content-hash-mismatch",
        source: "-",
      },
    });
  });

  it("normalizes delegated integrity failures as generic internal Problems", async () => {
    const outcome = await createNodeApplication({
      sdk: sdkFailure({
        code: "integrity-check-failed",
        message: "sensitive internal integrity detail",
      }),
    }).evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });

    expect(outcome).toEqual({
      ok: false,
      problem: {
        kind: "voidtrace.problem",
        schemaVersion: "0.1.0",
        code: "cli.internal",
        message: "VoidTrace could not complete the evaluation",
        classification: "internal",
      },
    });
    expect(canonicalizeJson(outcome)).not.toContain("sensitive");
    expect(canonicalizeJson(outcome)).not.toContain("integrity detail");
  });

  it("maps unexpected SDK exceptions to a generic internal Problem", async () => {
    const sdk: SdkFacade = {
      ...defaultSdk,
      evaluateScenario: async () => {
        throw new Error("secret stack detail from dependency");
      },
    };
    const outcome = await createNodeApplication({ sdk }).evaluate({
      scenarioSource: scenarioPath,
      catalogSource: catalogPath,
    });

    expect(outcome).toEqual({
      ok: false,
      problem: {
        kind: "voidtrace.problem",
        schemaVersion: "0.1.0",
        code: "cli.internal",
        message: "VoidTrace could not complete the evaluation",
        classification: "internal",
      },
    });
    expect(canonicalizeJson(outcome)).not.toContain("secret");
    expect(canonicalizeJson(outcome)).not.toContain("stack");
  });
});
