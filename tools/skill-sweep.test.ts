import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { canonicalizeJson } from "../packages/contracts/src/index.ts";

type HelperResult = {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const helperPath = resolve(repositoryRoot, ".agents/skills/voidtrace/scripts/run-sweep.ts");

function runHelper(args: readonly string[]): HelperResult {
  const result = spawnSync(process.execPath, [helperPath, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  expect(result.error).toBeUndefined();
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseOutput(result: HelperResult): Record<string, unknown> {
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

describe("finite Sweep Experiment repository-local helper", () => {
  it("passes the checked-in literal Sweep golden in declared point order", () => {
    const result = runHelper(["--check-golden"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(parseOutput(result)).toMatchObject({
      ok: true,
      comparison: {
        id: "comparison.experiment.golden-critical-tier-sweep",
        primaryMetric: "damage.health.total",
        base: {
          scenarioRef: {
            id: "scenario.golden-direct-critical-armor",
          },
          metricValue: 100,
          deltaFromBase: 0,
        },
        variants: [
          {
            id: "sweep-point.critical-tier-0",
            scenarioRef: {
              id: "scenario.golden-sweep-critical-tier-0",
            },
            metricValue: 50,
            deltaFromBase: -50,
          },
          {
            id: "sweep-point.critical-tier-2",
            scenarioRef: {
              id: "scenario.golden-sweep-critical-tier-2",
            },
            metricValue: 150,
            deltaFromBase: 50,
          },
          {
            id: "sweep-point.critical-tier-3",
            scenarioRef: {
              id: "scenario.golden-sweep-critical-tier-3",
            },
            metricValue: 200,
            deltaFromBase: 100,
          },
        ],
      },
    });
  });

  it("emits canonical single-line JSON by default and equivalent pretty JSON on request", () => {
    const canonical = runHelper([]);
    const pretty = runHelper(["--pretty"]);

    expect(canonical.status).toBe(0);
    expect(pretty.status).toBe(0);
    expect(canonical.stderr).toBe("");
    expect(pretty.stderr).toBe("");
    expect(canonical.stdout.endsWith("\n")).toBe(true);
    expect(canonical.stdout.trim()).not.toContain("\n");
    expect(canonical.stdout).toBe(`${canonicalizeJson(parseOutput(canonical))}\n`);
    expect(pretty.stdout.trim()).toContain("\n");
    expect(parseOutput(pretty)).toEqual(parseOutput(canonical));
  });

  it("shows help without loading fixtures", () => {
    const result = runHelper(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("VoidTrace repository-local finite Sweep helper");
    expect(result.stdout).toContain("--check-golden");
    expect(result.stdout).toContain("Does not generate ranges, multiple axes, or Breakpoints");
  });

  it("returns exit 1 and a structured adapter error for an unknown option", () => {
    const result = runHelper(["--unsupported"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(parseOutput(result)).toEqual({
      ok: false,
      error: {
        code: "adapter.invalid-argument",
        message: "Unknown option: --unsupported",
      },
    });
  });
});
