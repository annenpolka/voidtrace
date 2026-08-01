import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalizeJson } from "../../../../packages/contracts/src/index.ts";
import { evaluateScenario, materializeScenarioPatch } from "../../../../packages/sdk/src/index.ts";

type Options = {
  patchPath: string;
  scenarioPath: string;
  catalogPath: string;
  evaluate: boolean;
  pretty: boolean;
  checkGolden: boolean;
  help: boolean;
};

type JsonRecord = Record<string, unknown>;

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const defaultPatchPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/direct-critical-tier-2.scenario-patch.json",
);
const defaultScenarioPath = resolve(
  repositoryRoot,
  "data/fixtures/golden/direct-critical-armor.scenario.json",
);
const defaultCatalogPath = resolve(repositoryRoot, "data/fixtures/catalog-mini/catalog.json");
const expectedScenarioPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/direct-critical-tier-2.expected.scenario.json",
);
const expectedProjectionPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/direct-critical-tier-2.expected.json",
);

const HELP = `VoidTrace repository-local Scenario Patch helper

Usage:
  node .agents/skills/voidtrace/scripts/apply-scenario-patch.ts [options]

Options:
  --patch PATH       Contract-valid, content-addressed ScenarioPatch JSON
  --scenario PATH    Exact content-addressed base Scenario JSON
  --catalog PATH     CatalogSnapshot used only with --evaluate
  --evaluate         Evaluate the materialized Scenario through the SDK
  --pretty           Pretty-print JSON instead of canonical single-line JSON
  --check-golden     Assert the bundled Patch, materialized Scenario, and evaluation
  --help             Show this help
`;

class AdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

function nextValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new AdapterError("adapter.invalid-argument", `${option} requires a value`);
  }
  return value;
}

function parseOptions(argv: readonly string[]): Options {
  const options: Options = {
    patchPath: defaultPatchPath,
    scenarioPath: defaultScenarioPath,
    catalogPath: defaultCatalogPath,
    evaluate: false,
    pretty: false,
    checkGolden: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    switch (option) {
      case "--patch":
        options.patchPath = resolve(nextValue(argv, index, option));
        index += 1;
        break;
      case "--scenario":
        options.scenarioPath = resolve(nextValue(argv, index, option));
        index += 1;
        break;
      case "--catalog":
        options.catalogPath = resolve(nextValue(argv, index, option));
        index += 1;
        break;
      case "--evaluate":
        options.evaluate = true;
        break;
      case "--pretty":
        options.pretty = true;
        break;
      case "--check-golden":
        options.checkGolden = true;
        break;
      case "--help":
        options.help = true;
        break;
      default:
        throw new AdapterError("adapter.invalid-argument", `Unknown option: ${String(option)}`);
    }
  }
  return options;
}

function record(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AdapterError("adapter.invalid-output", `${path} must be an object`);
  }
  return value as JsonRecord;
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    throw new AdapterError("adapter.fixture-read-failed", `Could not read JSON input: ${path}`);
  }
}

function emit(value: unknown, pretty: boolean): void {
  if (pretty) {
    process.stdout.write(`${JSON.stringify(JSON.parse(canonicalizeJson(value)), null, 2)}\n`);
    return;
  }
  process.stdout.write(`${canonicalizeJson(value)}\n`);
}

function operationPaths(patch: unknown): readonly string[] {
  const operations = record(patch, "/patch").operations;
  if (!Array.isArray(operations)) {
    throw new AdapterError("adapter.invalid-output", "/patch/operations must be an array");
  }
  return operations.map((operation, index) => {
    const path = record(operation, `/patch/operations/${index}`).path;
    if (typeof path !== "string") {
      throw new AdapterError(
        "adapter.invalid-output",
        `/patch/operations/${index}/path must be a string`,
      );
    }
    return path;
  });
}

function firstActionCriticalTier(scenario: unknown): unknown {
  const actionPlan = record(scenario, "/scenario").actionPlan;
  if (!Array.isArray(actionPlan) || actionPlan.length === 0) {
    throw new AdapterError("adapter.invalid-output", "/scenario/actionPlan must be non-empty");
  }
  return record(record(actionPlan[0], "/scenario/actionPlan/0").parameters, "/parameters")
    .criticalTier;
}

function projectGolden(patch: unknown, scenario: unknown, evaluation: unknown): JsonRecord {
  const patchRecord = record(patch, "/patch");
  const baseScenarioRef = record(patchRecord.baseScenarioRef, "/patch/baseScenarioRef");
  const scenarioRecord = record(scenario, "/scenario");
  const evaluationRecord = record(evaluation, "/evaluation");
  const result = record(evaluationRecord.result, "/evaluation/result");
  const metrics = record(result.metrics, "/evaluation/result/metrics");
  return {
    patchId: patchRecord.id,
    patchContentHash: patchRecord.contentHash,
    baseScenarioId: baseScenarioRef.id,
    resultScenarioId: scenarioRecord.id,
    changedPaths: operationPaths(patch),
    criticalTier: firstActionCriticalTier(scenario),
    healthDamage: metrics["damage.health.total"],
    remainingHealth: metrics["target.health.remaining"],
  };
}

async function main(argv: readonly string[]): Promise<number> {
  const options = parseOptions(argv);
  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (
    options.checkGolden &&
    (!options.evaluate ||
      options.patchPath !== defaultPatchPath ||
      options.scenarioPath !== defaultScenarioPath ||
      options.catalogPath !== defaultCatalogPath)
  ) {
    throw new AdapterError(
      "adapter.invalid-argument",
      "--check-golden requires --evaluate and the bundled Patch, Scenario, and Catalog",
    );
  }

  const [patch, scenario] = await Promise.all([
    readJson(options.patchPath),
    readJson(options.scenarioPath),
  ]);
  const materialized = await materializeScenarioPatch({ patch, scenario });
  if (!materialized.ok) {
    emit(materialized, options.pretty);
    return 2;
  }

  const evaluation = options.evaluate
    ? await evaluateScenario({
        scenario: materialized.scenario,
        catalog: await readJson(options.catalogPath),
      })
    : undefined;
  if (evaluation !== undefined && !evaluation.ok) {
    emit(evaluation, options.pretty);
    return 2;
  }

  const output: JsonRecord = {
    ok: true,
    patch: {
      id: record(patch, "/patch").id,
      baseScenarioRef: record(patch, "/patch").baseScenarioRef,
      changedPaths: operationPaths(patch),
    },
    scenario: materialized.scenario,
    ...(evaluation === undefined ? {} : { evaluation }),
  };

  if (options.checkGolden) {
    const [expectedScenario, expectedProjection] = await Promise.all([
      readJson(expectedScenarioPath),
      readJson(expectedProjectionPath),
    ]);
    if (canonicalizeJson(materialized.scenario) !== canonicalizeJson(expectedScenario)) {
      throw new AdapterError(
        "adapter.golden-mismatch",
        "Materialized Scenario did not match the literal expected Scenario",
      );
    }
    if (
      canonicalizeJson(projectGolden(patch, materialized.scenario, evaluation)) !==
      canonicalizeJson(expectedProjection)
    ) {
      throw new AdapterError(
        "adapter.golden-mismatch",
        "Scenario Patch evaluation did not match literal expectations",
      );
    }
    output.goldenCheck = {
      id: "golden.scenario-patch-critical-tier-2",
      passed: true,
    };
  }

  emit(output, options.pretty);
  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  const adapterError =
    error instanceof AdapterError
      ? error
      : new AdapterError("adapter.internal", "Scenario Patch helper failed unexpectedly");
  emit(
    { ok: false, error: { code: adapterError.code, message: adapterError.message } },
    process.argv.includes("--pretty"),
  );
  process.exitCode = 1;
}
