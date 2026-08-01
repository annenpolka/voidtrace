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
const helperPath = resolve(repositoryRoot, ".agents/skills/voidtrace/scripts/run-breakpoint.ts");

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

describe("finite Breakpoint repository-local helper", () => {
  it("passes the full checked-in Analysis Artifact golden", () => {
    const result = runHelper(["--check-golden"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(parseOutput(result)).toMatchObject({
      ok: true,
      analysis: {
        id: "analysis.golden-finite-breakpoint",
        method: "finite-scan",
        primaryMetric: "target.health.remaining",
        sweepPath: "/actionPlan/0/parameters/criticalTier",
        samples: [
          {
            value: 0,
            leftVariantId: "breakpoint-left.critical-tier-0",
            rightVariantId: "breakpoint-right.critical-tier-0",
            leftMetricValue: 950,
            rightMetricValue: 1000,
            signedDifference: -50,
          },
          {
            value: 2,
            leftVariantId: "breakpoint-left.critical-tier-2",
            rightVariantId: "breakpoint-right.critical-tier-2",
            leftMetricValue: 850,
            rightMetricValue: 800,
            signedDifference: 50,
          },
          {
            value: 3,
            leftVariantId: "breakpoint-left.critical-tier-3",
            rightVariantId: "breakpoint-right.critical-tier-3",
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

  it("shows the observational boundary in help without loading fixtures", () => {
    const result = runHelper(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("VoidTrace repository-local finite Breakpoint helper");
    expect(result.stdout).toContain("--check-golden");
    expect(result.stdout).toContain("observed sampled sign reversal from tier 0 to tier 2");
    expect(result.stdout).toContain(
      "Does not find a continuous root, interpolate, or declare a winner",
    );
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
