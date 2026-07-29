import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateContract } from "../packages/contracts/src/index.ts";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const bins = {
  voidtrace: fileURLToPath(new URL("../node_modules/.bin/voidtrace", import.meta.url)),
  vt: fileURLToPath(new URL("../node_modules/.bin/vt", import.meta.url)),
} as const;
const scenarioPath = "data/fixtures/golden/direct-critical-armor.scenario.json";
const probabilityScenarioPath = "data/fixtures/golden/probability-critical-armor.scenario.json";
const catalogPath = "data/fixtures/catalog-mini/catalog.json";

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
          ruleId: "rule.critical.resolve-binary-roll",
        }),
      ]),
    );
    expect(validateContract("trace", JSON.parse(trace.stdout)).ok).toBe(true);
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
