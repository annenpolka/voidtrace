import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type HelperResult = {
  readonly status: number | null;
  readonly stdout: Record<string, unknown>;
  readonly stderr: string;
};

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const helperPath = resolve(
  repositoryRoot,
  ".agents/skills/voidtrace/scripts/apply-scenario-patch.ts",
);

function runHelper(args: readonly string[]): HelperResult {
  const result = spawnSync(process.execPath, [helperPath, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  expect(result.error).toBeUndefined();
  return {
    status: result.status,
    stdout: JSON.parse(result.stdout) as Record<string, unknown>,
    stderr: result.stderr,
  };
}

describe("Scenario Patch repository-local helper", () => {
  it("passes the checked-in materialization and evaluation golden", () => {
    const result = runHelper(["--evaluate", "--check-golden"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatchObject({
      ok: true,
      goldenCheck: {
        id: "golden.scenario-patch-critical-tier-2",
        passed: true,
      },
      patch: {
        id: "scenario-patch.golden-critical-tier-2",
      },
      scenario: {
        id: "scenario.golden-patched-critical-tier-2",
        contentHash: "sha256:d05c1ee15020a5e443c6c701e40a76a5a136de6fd11158d0562d20fd1ceaa973",
      },
    });
  });

  it("returns exit 2 and no partial Scenario for an exact-base mismatch", () => {
    const result = runHelper([
      "--patch",
      "data/fixtures/experiments/direct-critical-tier-2.scenario-patch.json",
      "--scenario",
      "data/fixtures/golden/probability-critical-armor.scenario.json",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toBe("");
    expect(result.stdout).toEqual({
      ok: false,
      error: {
        code: "base-scenario-reference-mismatch",
        message: "ScenarioPatch baseScenarioRef does not match the supplied base Scenario",
        path: "/patch/baseScenarioRef",
      },
    });
    expect(result.stdout).not.toHaveProperty("scenario");
  });

  it("returns exit 1 for an invalid golden-check option combination", () => {
    const result = runHelper(["--check-golden"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(result.stdout).toEqual({
      ok: false,
      error: {
        code: "adapter.invalid-argument",
        message: "--check-golden requires --evaluate and the bundled Patch, Scenario, and Catalog",
      },
    });
  });
});
