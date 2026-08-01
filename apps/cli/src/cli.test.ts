import {
  canonicalizeJson,
  validateContract,
  verifyResultTraceIntegrity,
} from "@voidtrace/contracts";
import { type CliApplication, createNodeApplication, createProblem } from "@voidtrace/runtime-node";
import { describe, expect, it, vi } from "vitest";
import scenarioFixture from "../../../data/fixtures/golden/direct-critical-armor.scenario.json" with {
  type: "json",
};
import radialScenarioFixture from "../../../data/fixtures/golden/radial-critical-armor.scenario.json" with {
  type: "json",
};
import beamScenarioFixture from "../../../data/fixtures/golden/resolved-beam-ticks.scenario.json" with {
  type: "json",
};
import chainScenarioFixture from "../../../data/fixtures/golden/resolved-chain.scenario.json" with {
  type: "json",
};
import punchThroughScenarioFixture from "../../../data/fixtures/golden/resolved-punch-through.scenario.json" with {
  type: "json",
};
import radialTargetsScenarioFixture from "../../../data/fixtures/golden/resolved-radial-targets.scenario.json" with {
  type: "json",
};
import ricochetScenarioFixture from "../../../data/fixtures/golden/resolved-ricochet.scenario.json" with {
  type: "json",
};
import statusScenarioFixture from "../../../data/fixtures/golden/resolved-status-ticks.scenario.json" with {
  type: "json",
};
import packageJson from "../package.json" with { type: "json" };
import { type CliIo, runCli } from "./cli.ts";

const SCENARIO_PATH = "data/fixtures/golden/direct-critical-armor.scenario.json";
const RADIAL_SCENARIO_PATH = "data/fixtures/golden/radial-critical-armor.scenario.json";
const STATUS_SCENARIO_PATH = "data/fixtures/golden/resolved-status-ticks.scenario.json";
const BEAM_SCENARIO_PATH = "data/fixtures/golden/resolved-beam-ticks.scenario.json";
const PUNCH_THROUGH_SCENARIO_PATH = "data/fixtures/golden/resolved-punch-through.scenario.json";
const RICOCHET_SCENARIO_PATH = "data/fixtures/golden/resolved-ricochet.scenario.json";
const CHAIN_SCENARIO_PATH = "data/fixtures/golden/resolved-chain.scenario.json";
const RADIAL_TARGETS_SCENARIO_PATH = "data/fixtures/golden/resolved-radial-targets.scenario.json";
const CATALOG_PATH = "data/fixtures/catalog-mini/catalog.json";
const BEAM_CATALOG_PATH = "data/fixtures/catalog-mini/catalog-beam.json";

type Invocation = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

async function invoke(argv: readonly string[], application?: CliApplication): Promise<Invocation> {
  let stdout = "";
  let stderr = "";
  const io: CliIo = {
    writeOut: (text) => {
      stdout += text;
    },
    writeErr: (text) => {
      stderr += text;
    },
  };
  const exitCode = await runCli(argv, {
    ...(application === undefined ? {} : { application }),
    io,
  });
  return { exitCode, stdout, stderr };
}

async function goldenOutcome() {
  const outcome = await createNodeApplication().evaluate({
    scenarioSource: SCENARIO_PATH,
    catalogSource: CATALOG_PATH,
  });
  if (!outcome.ok) {
    throw new Error(outcome.problem.message);
  }
  return outcome;
}

describe("VoidTrace CLI success routing", () => {
  it("emits the generated Capability Manifest deterministically", async () => {
    const first = await invoke(["describe"]);
    const second = await invoke(["describe", "--json"]);

    expect(first).toEqual(second);
    expect(first.exitCode).toBe(0);
    expect(first.stderr).toBe("");
    expect(first.stdout.endsWith("\n")).toBe(true);
    expect(JSON.parse(first.stdout)).toEqual(createNodeApplication().describe());
    expect(first.stdout).toBe(`${canonicalizeJson(JSON.parse(first.stdout))}\n`);
    expect(JSON.parse(first.stdout)).toMatchObject({
      capabilities: expect.arrayContaining([
        {
          id: "mechanics.resolved-beam-ticks",
          status: "supported",
          activeClauseRefs: ["BEM-001", "GOL-018"],
          plannedClauseRefs: [],
        },
      ]),
    });
  });

  it("selects only Result for run and only Trace for trace", async () => {
    const evaluated = await goldenOutcome();
    const evaluate = vi.fn(async () => evaluated);
    const application: CliApplication = {
      describe: () => createNodeApplication().describe(),
      evaluate,
    };

    const run = await invoke(["run", "scenario.input", "--catalog", "catalog.input"], application);
    const trace = await invoke(
      ["trace", "scenario.input", "--catalog", "catalog.input"],
      application,
    );

    expect(run).toEqual({
      exitCode: 0,
      stdout: `${canonicalizeJson(evaluated.result)}\n`,
      stderr: "",
    });
    expect(trace).toEqual({
      exitCode: 0,
      stdout: `${canonicalizeJson(evaluated.trace)}\n`,
      stderr: "",
    });
    expect(JSON.parse(run.stdout).kind).toBe("voidtrace.result");
    expect(JSON.parse(trace.stdout).kind).toBe("voidtrace.trace");
    expect(evaluate).toHaveBeenNthCalledWith(1, {
      scenarioSource: "scenario.input",
      catalogSource: "catalog.input",
    });
    expect(evaluate).toHaveBeenNthCalledWith(2, {
      scenarioSource: "scenario.input",
      catalogSource: "catalog.input",
    });
  });

  it("produces contract-valid, mutually consistent golden Artifacts", async () => {
    const run = await invoke(["run", SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const trace = await invoke(["trace", SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const resultValue = JSON.parse(run.stdout) as unknown;
    const traceValue = JSON.parse(trace.stdout) as unknown;
    const result = validateContract("result", resultValue);
    const causalTrace = validateContract("trace", traceValue);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(trace.stderr).toBe("");
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid Result or Trace");
    }
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, scenarioFixture),
    ).resolves.toBe(true);
  });

  it("round-trips the standalone resolved Radial golden through run and trace", async () => {
    const run = await invoke(["run", RADIAL_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const trace = await invoke(["trace", RADIAL_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const resultValue = JSON.parse(run.stdout) as unknown;
    const traceValue = JSON.parse(trace.stdout) as unknown;
    const result = validateContract("result", resultValue);
    const causalTrace = validateContract("trace", traceValue);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(trace.stderr).toBe("");
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid Radial Result or Trace");
    }
    expect(result.value.metrics).toMatchObject({
      "damage.radial.base.total": 100,
      "radial.falloff.multiplier": 0.75,
      "damage.radial.total": 150,
      "damage.health.total": 75,
      "target.health.remaining": 925,
    });
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, radialScenarioFixture),
    ).resolves.toBe(true);
  });

  it("round-trips resolved Status ticks through run and trace", async () => {
    const run = await invoke(["run", STATUS_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const trace = await invoke(["trace", STATUS_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const resultValue = JSON.parse(run.stdout) as unknown;
    const traceValue = JSON.parse(trace.stdout) as unknown;
    const result = validateContract("result", resultValue);
    const causalTrace = validateContract("trace", traceValue);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(trace.stderr).toBe("");
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid resolved Status Result or Trace");
    }
    expect(result.value.metrics).toMatchObject({
      "status.tick-count": 3,
      "damage.status.per-tick": 40,
      "damage.status.total": 120,
      "target.health.remaining": 0,
    });
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, statusScenarioFixture),
    ).resolves.toBe(true);
  });

  it("selects the Beam fixture Catalog and round-trips resolved Beam ticks", async () => {
    const run = await invoke(["run", BEAM_SCENARIO_PATH, "--catalog", BEAM_CATALOG_PATH]);
    const trace = await invoke(["trace", BEAM_SCENARIO_PATH, "--catalog", BEAM_CATALOG_PATH]);
    const resultValue = JSON.parse(run.stdout) as unknown;
    const traceValue = JSON.parse(trace.stdout) as unknown;
    const result = validateContract("result", resultValue);
    const causalTrace = validateContract("trace", traceValue);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(trace.stderr).toBe("");
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid resolved Beam Result or Trace");
    }
    expect(result.value.metrics).toMatchObject({
      "beam.tick-count": 3,
      "beam.tick-interval-ms": 100,
      "damage.beam.per-tick": 20,
      "damage.beam.total": 60,
      "critical.tier": 1,
      "critical.multiplier": 2,
      "damage.post-critical.total": 40,
      "armor.remaining-multiplier": 0.5,
      "damage.health.total": 60,
      "target.health.remaining": 0,
    });
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, beamScenarioFixture),
    ).resolves.toBe(true);
  });

  it("round-trips resolved punch-through targets through run and trace", async () => {
    const run = await invoke(["run", PUNCH_THROUGH_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const trace = await invoke(["trace", PUNCH_THROUGH_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const resultValue = JSON.parse(run.stdout) as unknown;
    const traceValue = JSON.parse(trace.stdout) as unknown;
    const result = validateContract("result", resultValue);
    const causalTrace = validateContract("trace", traceValue);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(trace.stderr).toBe("");
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid resolved punch-through Result or Trace");
    }
    expect(result.value.metrics).toEqual({
      "punch-through.target-count": 3,
      "damage.punch-through.total": 350,
      "damage.health.total": 350,
      "targets.health.remaining-total": 60,
      "targets.defeated-count": 1,
    });
    expect(result.value.targetStates).toEqual({
      "actor.target-a": { health: 50 },
      "actor.target-b": { health: 0 },
      "actor.target-c": { health: 10 },
    });
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, punchThroughScenarioFixture),
    ).resolves.toBe(true);
  });

  it("round-trips resolved ricochet targets through run and trace", async () => {
    const run = await invoke(["run", RICOCHET_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const trace = await invoke(["trace", RICOCHET_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const result = validateContract("result", JSON.parse(run.stdout) as unknown);
    const causalTrace = validateContract("trace", JSON.parse(trace.stdout) as unknown);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid resolved ricochet Result or Trace");
    }
    expect(result.value.metrics).toEqual({
      "ricochet.target-count": 3,
      "damage.ricochet.total": 525,
      "damage.health.total": 525,
      "targets.health.remaining-total": 125,
      "targets.defeated-count": 1,
    });
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, ricochetScenarioFixture),
    ).resolves.toBe(true);
  });

  it("round-trips resolved chain targets through run and trace", async () => {
    const run = await invoke(["run", CHAIN_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const trace = await invoke(["trace", CHAIN_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const result = validateContract("result", JSON.parse(run.stdout) as unknown);
    const causalTrace = validateContract("trace", JSON.parse(trace.stdout) as unknown);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid resolved chain Result or Trace");
    }
    expect(result.value.metrics).toEqual({
      "chain.target-count": 3,
      "damage.chain.total": 175,
      "damage.health.total": 175,
      "targets.health.remaining-total": 135,
      "targets.defeated-count": 1,
    });
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, chainScenarioFixture),
    ).resolves.toBe(true);
  });

  it("round-trips resolved multi-target Radial through run and trace", async () => {
    const run = await invoke(["run", RADIAL_TARGETS_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const trace = await invoke(["trace", RADIAL_TARGETS_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const result = validateContract("result", JSON.parse(run.stdout) as unknown);
    const causalTrace = validateContract("trace", JSON.parse(trace.stdout) as unknown);

    expect(run.exitCode).toBe(0);
    expect(trace.exitCode).toBe(0);
    expect(result.ok).toBe(true);
    expect(causalTrace.ok).toBe(true);
    if (!result.ok || !causalTrace.ok) {
      throw new Error("CLI emitted an invalid resolved multi-target Radial Result or Trace");
    }
    expect(result.value.metrics).toEqual({
      "radial.target-count": 2,
      "damage.radial.targets-total": 67.5,
      "damage.health.total": 67.5,
      "targets.health.remaining-total": 242.5,
      "targets.defeated-count": 0,
    });
    await expect(
      verifyResultTraceIntegrity(result.value, causalTrace.value, radialTargetsScenarioFixture),
    ).resolves.toBe(true);
  });

  it("pretty-printing changes whitespace but not the JSON value", async () => {
    const compact = await invoke(["run", SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const pretty = await invoke(["run", SCENARIO_PATH, "--catalog", CATALOG_PATH, "--pretty"]);

    expect(pretty.exitCode).toBe(0);
    expect(pretty.stderr).toBe("");
    expect(pretty.stdout).not.toBe(compact.stdout);
    expect(JSON.parse(pretty.stdout)).toEqual(JSON.parse(compact.stdout));
    expect(pretty.stdout).toBe(`${JSON.stringify(JSON.parse(compact.stdout), null, 2)}\n`);
  });

  it("accepts exactly one stdin Artifact source", async () => {
    const application = createNodeApplication({
      readStdin: async () => JSON.stringify(scenarioFixture),
    });
    const stdin = await invoke(["run", "-", "--catalog", CATALOG_PATH], application);
    const file = await invoke(["run", SCENARIO_PATH, "--catalog", CATALOG_PATH]);

    expect(stdin).toEqual(file);
  });
});

describe("VoidTrace CLI failure routing", () => {
  it("rejects the Beam Scenario when a nearby non-Beam Catalog is selected", async () => {
    const invocation = await invoke(["run", BEAM_SCENARIO_PATH, "--catalog", CATALOG_PATH]);
    const problem = validateContract("problem", JSON.parse(invocation.stderr));

    expect(invocation.exitCode).toBe(2);
    expect(invocation.stdout).toBe("");
    expect(problem.ok).toBe(true);
    if (!problem.ok) {
      throw new Error("CLI emitted an invalid Beam Catalog mismatch Problem");
    }
    expect(problem.value).toMatchObject({
      classification: "input",
      code: "catalog-reference-mismatch",
      source: BEAM_SCENARIO_PATH,
    });
  });

  it.each([
    { argv: [] as string[] },
    { argv: ["unknown"] },
    { argv: ["describe", "unexpected-input"] },
    { argv: ["run"] },
    { argv: ["run", SCENARIO_PATH] },
    { argv: ["run", SCENARIO_PATH, "--catalog", CATALOG_PATH, "--unknown"] },
  ])("returns one input Problem without writing stdout for $argv", async ({ argv }) => {
    const invocation = await invoke(argv);
    const problem = validateContract("problem", JSON.parse(invocation.stderr));

    expect(invocation.exitCode).toBe(2);
    expect(invocation.stdout).toBe("");
    expect(invocation.stderr.split("\n")).toHaveLength(2);
    expect(problem.ok).toBe(true);
    if (!problem.ok) {
      throw new Error("CLI emitted an invalid Problem");
    }
    expect(problem.value.classification).toBe("input");
  });

  it("preserves a delegated unsupported Problem and exit code", async () => {
    const problem = createProblem({
      classification: "unsupported",
      code: "unsupported-delivery",
      message: "Unsupported attack delivery",
      mechanicId: "mechanic.delivery.projectile",
    });
    const application: CliApplication = {
      describe: () => createNodeApplication().describe(),
      evaluate: async () => ({ ok: false, problem }),
    };
    const invocation = await invoke(
      ["run", "scenario.input", "--catalog", "catalog.input"],
      application,
    );

    expect(invocation).toEqual({
      exitCode: 3,
      stdout: "",
      stderr: `${canonicalizeJson(problem)}\n`,
    });
  });

  it("normalizes unexpected application exceptions without leaking details", async () => {
    const application: CliApplication = {
      describe: () => {
        throw new Error("secret stack detail");
      },
      evaluate: async () => {
        throw new Error("secret stack detail");
      },
    };
    const invocation = await invoke(["describe"], application);
    const parsed = JSON.parse(invocation.stderr) as {
      classification: string;
      message: string;
    };

    expect(invocation.exitCode).toBe(5);
    expect(invocation.stdout).toBe("");
    expect(parsed.classification).toBe("internal");
    expect(invocation.stderr).not.toContain("secret");
    expect(invocation.stderr).not.toContain("stack");
  });

  it.each([
    { argv: ["--help"], usage: "Usage: voidtrace [options] [command]" },
    { argv: ["describe", "--help"], usage: "Usage: voidtrace describe [options]" },
    { argv: ["run", "--help"], usage: "Usage: voidtrace run [options] <scenario>" },
    { argv: ["trace", "--help"], usage: "Usage: voidtrace trace [options] <scenario>" },
  ])(
    "keeps human-readable help as a stdout metadata exception for $argv",
    async ({ argv, usage }) => {
      const invocation = await invoke(argv);

      expect(invocation.exitCode).toBe(0);
      expect(invocation.stderr).toBe("");
      expect(invocation.stdout).toContain(usage);
    },
  );
});

describe("VoidTrace executable aliases", () => {
  it("maps voidtrace and vt to the same executable", () => {
    expect(packageJson.bin).toEqual({
      voidtrace: "./src/main.ts",
      vt: "./src/main.ts",
    });
  });
});
