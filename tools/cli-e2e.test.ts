import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { attachArtifactContentHash, validateContract } from "../packages/contracts/src/index.ts";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const bins = {
  voidtrace: fileURLToPath(new URL("../node_modules/.bin/voidtrace", import.meta.url)),
  vt: fileURLToPath(new URL("../node_modules/.bin/vt", import.meta.url)),
} as const;
const scenarioPath = "data/fixtures/golden/direct-critical-armor.scenario.json";
const probabilityScenarioPath = "data/fixtures/golden/probability-critical-armor.scenario.json";
const tier2ScenarioPath = "data/fixtures/golden/tier-2-critical-armor.scenario.json";
const expectedScenarioPath = "data/fixtures/golden/expected-critical-armor.scenario.json";
const multishotScenarioPath = "data/fixtures/golden/multishot-critical-armor.scenario.json";
const pelletScenarioPath = "data/fixtures/golden/pellet-critical-armor.scenario.json";
const punchThroughScenarioPath = "data/fixtures/golden/resolved-punch-through.scenario.json";
const ricochetScenarioPath = "data/fixtures/golden/resolved-ricochet.scenario.json";
const chainScenarioPath = "data/fixtures/golden/resolved-chain.scenario.json";
const radialTargetsScenarioPath = "data/fixtures/golden/resolved-radial-targets.scenario.json";
const pelletAllocationScenarioPath =
  "data/fixtures/golden/resolved-pellet-allocation.scenario.json";
const directRadialImpactScenarioPath =
  "data/fixtures/golden/resolved-direct-radial-impact.scenario.json";
const distinctModeImpactScenarioPath =
  "data/fixtures/golden/resolved-distinct-mode-direct-radial-impact.scenario.json";
const catalogPath = "data/fixtures/catalog-mini/catalog.json";
const tier2CatalogPath = "data/fixtures/catalog-mini/catalog-tier-2.json";

type ProcessResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

function execute(
  bin: keyof typeof bins,
  argv: readonly string[],
  stdin?: string,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bins[bin], argv, {
      cwd: repositoryRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (exitCode, signal) => {
      if (exitCode === null) {
        reject(new Error(`CLI terminated by signal ${signal ?? "unknown"}`));
        return;
      }
      resolve({ exitCode, stdout, stderr });
    });
    child.stdin.end(stdin);
  });
}

describe("installed VoidTrace CLI aliases", () => {
  it.each([
    ["describe"],
    ["run", scenarioPath, "--catalog", catalogPath],
    ["trace", scenarioPath, "--catalog", catalogPath],
    ["run", probabilityScenarioPath, "--catalog", catalogPath],
    ["trace", probabilityScenarioPath, "--catalog", catalogPath],
    ["run", tier2ScenarioPath, "--catalog", tier2CatalogPath],
    ["trace", tier2ScenarioPath, "--catalog", tier2CatalogPath],
    ["run", expectedScenarioPath, "--catalog", tier2CatalogPath],
    ["trace", expectedScenarioPath, "--catalog", tier2CatalogPath],
    ["run", multishotScenarioPath, "--catalog", catalogPath],
    ["trace", multishotScenarioPath, "--catalog", catalogPath],
    ["run", pelletScenarioPath, "--catalog", catalogPath],
    ["trace", pelletScenarioPath, "--catalog", catalogPath],
    ["run", punchThroughScenarioPath, "--catalog", catalogPath],
    ["trace", punchThroughScenarioPath, "--catalog", catalogPath],
    ["run", ricochetScenarioPath, "--catalog", catalogPath],
    ["trace", ricochetScenarioPath, "--catalog", catalogPath],
    ["run", chainScenarioPath, "--catalog", catalogPath],
    ["trace", chainScenarioPath, "--catalog", catalogPath],
    ["run", radialTargetsScenarioPath, "--catalog", catalogPath],
    ["trace", radialTargetsScenarioPath, "--catalog", catalogPath],
    ["run", pelletAllocationScenarioPath, "--catalog", catalogPath],
    ["trace", pelletAllocationScenarioPath, "--catalog", catalogPath],
    ["run", directRadialImpactScenarioPath, "--catalog", catalogPath],
    ["trace", directRadialImpactScenarioPath, "--catalog", catalogPath],
    ["run", distinctModeImpactScenarioPath, "--catalog", catalogPath],
    ["trace", distinctModeImpactScenarioPath, "--catalog", catalogPath],
    ["run", "--help"],
    ["unknown"],
  ])("are byte-equivalent for %j", async (...argv) => {
    const [formal, alias] = await Promise.all([execute("voidtrace", argv), execute("vt", argv)]);

    expect(alias).toEqual(formal);
  });

  it("emits contract-valid Result and Trace Artifacts in separate invocations", async () => {
    const result = await execute("vt", ["run", scenarioPath, "--catalog", catalogPath]);
    const trace = await execute("vt", ["trace", scenarioPath, "--catalog", catalogPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(validateContract("result", JSON.parse(result.stdout)).ok).toBe(true);
    expect(trace.exitCode).toBe(0);
    expect(trace.stderr).toBe("");
    expect(validateContract("trace", JSON.parse(trace.stdout)).ok).toBe(true);
  });

  it("exposes explicit-roll Critical Result and Trace through the installed CLI", async () => {
    const result = await execute("vt", ["run", probabilityScenarioPath, "--catalog", catalogPath]);
    const trace = await execute("vt", ["trace", probabilityScenarioPath, "--catalog", catalogPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      metrics: {
        "critical.roll": 0.2,
        "critical.base-tier": 0,
        "critical.next-tier": 1,
        "critical.fraction": 0.25,
        "critical.base-tier.probability": 0.75,
        "critical.next-tier.probability": 0.25,
        "critical.tier-0.probability": 0.75,
        "critical.tier-1.probability": 0.25,
        "critical.tier": 1,
      },
    });
    expect(validateContract("result", JSON.parse(result.stdout)).ok).toBe(true);
    expect(trace.exitCode).toBe(0);
    expect(trace.stderr).toBe("");
    const traceArtifact = JSON.parse(trace.stdout) as {
      decisions: Array<{ outcome: string; ruleId: string }>;
    };
    expect(traceArtifact.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outcome: "applied",
          ruleId: "rule.critical.resolve-tier-roll",
        }),
      ]),
    );
    expect(validateContract("trace", JSON.parse(trace.stdout)).ok).toBe(true);
  });

  it("exposes generalized tier-2 Critical metrics through the installed CLI", async () => {
    const result = await execute("vt", ["run", tier2ScenarioPath, "--catalog", tier2CatalogPath]);
    const trace = await execute("vt", ["trace", tier2ScenarioPath, "--catalog", tier2CatalogPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      metrics: {
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
      },
    });
    expect(validateContract("result", JSON.parse(result.stdout)).ok).toBe(true);
    expect(trace.exitCode).toBe(0);
    expect(trace.stderr).toBe("");
    const traceArtifact = JSON.parse(trace.stdout) as {
      decisions: Array<{ outcome: string; ruleId: string }>;
    };
    expect(traceArtifact.decisions).toEqual(
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
    expect(validateContract("trace", JSON.parse(trace.stdout)).ok).toBe(true);
  });

  it("exposes terminal-branch Critical expected values through the installed CLI", async () => {
    const result = await execute("vt", [
      "run",
      expectedScenarioPath,
      "--catalog",
      tier2CatalogPath,
    ]);
    const trace = await execute("vt", [
      "trace",
      expectedScenarioPath,
      "--catalog",
      tier2CatalogPath,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const resultArtifact = JSON.parse(result.stdout);
    expect(resultArtifact).toMatchObject({
      metrics: {
        "critical.base-tier": 1,
        "critical.next-tier": 2,
        "critical.expected.multiplier": 2.25,
        "damage.expected.health.total": 112.5,
        "target.health.expected-remaining": 18.75,
      },
      damageByType: {
        "damage.synthetic-kinetic": 112.5,
      },
    });
    expect(resultArtifact.metrics).not.toHaveProperty("critical.tier");
    expect(validateContract("result", resultArtifact).ok).toBe(true);

    expect(trace.exitCode).toBe(0);
    expect(trace.stderr).toBe("");
    const traceArtifact = JSON.parse(trace.stdout) as {
      decisions: Array<{
        outcome: string;
        ruleId: string;
        after?: Record<string, number>;
      }>;
    };
    expect(traceArtifact.decisions.at(-1)).toMatchObject({
      outcome: "applied",
      ruleId: "rule.critical.aggregate-expected-branches",
      after: {
        "damage.total": 112.5,
        "target.health": 18.75,
      },
    });
    expect(validateContract("trace", traceArtifact).ok).toBe(true);
  });

  it("exposes resolved fixed Multishot Result and Trace through the installed CLI", async () => {
    const result = await execute("vt", ["run", multishotScenarioPath, "--catalog", catalogPath]);
    const trace = await execute("vt", ["trace", multishotScenarioPath, "--catalog", catalogPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const resultArtifact = JSON.parse(result.stdout);
    expect(resultArtifact).toMatchObject({
      metrics: {
        "multishot.hit-count": 3,
        "damage.direct-hit.total": 100,
        "damage.multishot.total": 300,
        "damage.health.total": 300,
        "target.health.remaining": 0,
      },
      damageByType: {
        "damage.synthetic-kinetic": 300,
      },
    });
    expect(validateContract("result", resultArtifact).ok).toBe(true);

    expect(trace.exitCode).toBe(0);
    expect(trace.stderr).toBe("");
    const traceArtifact = JSON.parse(trace.stdout) as {
      decisions: Array<{ ruleId: string }>;
    };
    expect(traceArtifact.decisions[0]).toMatchObject({
      ruleId: "rule.multishot.emit-fixed-hits",
    });
    expect(traceArtifact.decisions.at(-1)).toMatchObject({
      ruleId: "rule.multishot.aggregate-fixed-hits",
    });
    expect(validateContract("trace", traceArtifact).ok).toBe(true);
  });

  it("returns one limit Problem and no partial Artifact above the Multishot bound", async () => {
    const fixture = JSON.parse(
      await readFile(new URL(`../${multishotScenarioPath}`, import.meta.url), "utf8"),
    ) as {
      contentHash: string;
      actionPlan: Array<{ parameters: { hitCount: number } }>;
    } & Record<string, unknown>;
    const action = fixture.actionPlan[0];
    if (action === undefined) {
      throw new Error("Multishot golden Scenario must contain an action");
    }
    action.parameters.hitCount = 65;
    const { contentHash: _contentHash, ...withoutHash } = fixture;
    const scenario = await attachArtifactContentHash(withoutHash);
    const failure = await execute(
      "vt",
      ["run", "-", "--catalog", catalogPath],
      JSON.stringify(scenario),
    );

    expect(failure.exitCode).toBe(4);
    expect(failure.stdout).toBe("");
    expect(failure.stderr.split("\n")).toHaveLength(2);
    expect(JSON.parse(failure.stderr)).toMatchObject({
      code: "rule-execution-failed",
      classification: "limit",
      causeCode: "execution-limit-exceeded",
    });
    expect(validateContract("problem", JSON.parse(failure.stderr)).ok).toBe(true);
  });

  it("exposes resolved fixed-count pellet Result and Trace through the installed CLI", async () => {
    const result = await execute("vt", ["run", pelletScenarioPath, "--catalog", catalogPath]);
    const trace = await execute("vt", ["trace", pelletScenarioPath, "--catalog", catalogPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const resultArtifact = JSON.parse(result.stdout);
    expect(resultArtifact).toMatchObject({
      metrics: {
        "pellet.count": 4,
        "damage.direct-hit.total": 100,
        "damage.pellet.total": 400,
        "damage.health.total": 400,
        "target.health.remaining": 0,
      },
      damageByType: {
        "damage.synthetic-kinetic": 400,
      },
    });
    expect(validateContract("result", resultArtifact).ok).toBe(true);

    expect(trace.exitCode).toBe(0);
    expect(trace.stderr).toBe("");
    const traceArtifact = JSON.parse(trace.stdout) as {
      decisions: Array<{ ruleId: string }>;
    };
    expect(traceArtifact.decisions[0]).toMatchObject({
      ruleId: "rule.pellet.emit-fixed-hits",
    });
    expect(traceArtifact.decisions.at(-1)).toMatchObject({
      ruleId: "rule.pellet.aggregate-fixed-hits",
    });
    expect(validateContract("trace", traceArtifact).ok).toBe(true);
  });

  it("returns one limit Problem and no partial Artifact above the pellet bound", async () => {
    const fixture = JSON.parse(
      await readFile(new URL(`../${pelletScenarioPath}`, import.meta.url), "utf8"),
    ) as {
      contentHash: string;
      actionPlan: Array<{ parameters: { pelletCount: number } }>;
    } & Record<string, unknown>;
    const action = fixture.actionPlan[0];
    if (action === undefined) {
      throw new Error("Pellet golden Scenario must contain an action");
    }
    action.parameters.pelletCount = 65;
    const { contentHash: _contentHash, ...withoutHash } = fixture;
    const scenario = await attachArtifactContentHash(withoutHash);
    const failure = await execute(
      "vt",
      ["run", "-", "--catalog", catalogPath],
      JSON.stringify(scenario),
    );

    expect(failure.exitCode).toBe(4);
    expect(failure.stdout).toBe("");
    expect(failure.stderr.split("\n")).toHaveLength(2);
    expect(JSON.parse(failure.stderr)).toMatchObject({
      code: "rule-execution-failed",
      classification: "limit",
      causeCode: "execution-limit-exceeded",
    });
    expect(validateContract("problem", JSON.parse(failure.stderr)).ok).toBe(true);
  });

  it("accepts either input Artifact from stdin without changing the Result", async () => {
    const [scenario, catalog] = await Promise.all([
      readFile(new URL(`../${scenarioPath}`, import.meta.url), "utf8"),
      readFile(new URL(`../${catalogPath}`, import.meta.url), "utf8"),
    ]);
    const [fromFile, scenarioFromStdin, catalogFromStdin] = await Promise.all([
      execute("vt", ["run", scenarioPath, "--catalog", catalogPath]),
      execute("vt", ["run", "-", "--catalog", catalogPath], scenario),
      execute("vt", ["run", scenarioPath, "--catalog", "-"], catalog),
    ]);

    expect(scenarioFromStdin).toEqual(fromFile);
    expect(catalogFromStdin).toEqual(fromFile);
  });

  it("keeps stdout empty and emits one Problem for invalid input", async () => {
    const failure = await execute("vt", ["run", "missing-scenario.json", "--catalog", catalogPath]);

    expect(failure.exitCode).toBe(2);
    expect(failure.stdout).toBe("");
    expect(failure.stderr.split("\n")).toHaveLength(2);
    expect(validateContract("problem", JSON.parse(failure.stderr)).ok).toBe(true);
  });
});
