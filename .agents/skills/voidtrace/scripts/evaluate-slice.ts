import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachArtifactContentHash,
  canonicalizeJson,
  type Result,
  type Trace,
} from "../../../../packages/contracts/src/index.ts";
import { evaluateScenario } from "../../../../packages/sdk/src/index.ts";

type Options = {
  scenarioPath: string;
  catalogPath: string;
  criticalTier?: number;
  armor?: number;
  health?: number;
  expected: boolean;
  pretty: boolean;
  checkGolden: boolean;
  help: boolean;
};

type JsonRecord = Record<string, unknown>;

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const defaultScenarioPath = resolve(
  repositoryRoot,
  "data/fixtures/golden/direct-critical-armor.scenario.json",
);
const defaultCatalogPath = resolve(repositoryRoot, "data/fixtures/catalog-mini/catalog.json");
const expectedPath = resolve(
  repositoryRoot,
  "data/fixtures/golden/direct-critical-armor.expected.json",
);
const expectedScenarioPath = resolve(
  repositoryRoot,
  "data/fixtures/golden/expected-critical-armor.scenario.json",
);
const expectedCatalogPath = resolve(
  repositoryRoot,
  "data/fixtures/catalog-mini/catalog-tier-2.json",
);
const expectedExpectedPath = resolve(
  repositoryRoot,
  "data/fixtures/golden/expected-critical-armor.expected.json",
);

const HELP = `VoidTrace repository-local synthetic-slice helper

Usage:
  node .agents/skills/voidtrace/scripts/evaluate-slice.ts [options]

Options:
  --scenario PATH       Contract-valid Scenario JSON (default: bundled golden Scenario)
  --catalog PATH        Contract-valid CatalogSnapshot JSON (default: bundled mini Catalog)
  --critical-tier TIER  Override with a non-negative safe-integer fixed Critical tier
  --armor NUMBER        Override non-negative resolved Armor
  --health NUMBER       Override non-negative resolved Health
  --expected            Use the bundled analytic expected-Critical Scenario and matching Catalog
  --pretty              Pretty-print JSON instead of canonical single-line JSON
  --check-golden        Assert the selected unmodified bundled scenario against literal expectations
  --help                Show this help
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

function nonNegativeNumber(value: string, option: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new AdapterError(
      "adapter.invalid-argument",
      `${option} must be a finite non-negative number`,
    );
  }
  return number;
}

function nonNegativeSafeInteger(value: string, option: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new AdapterError(
      "adapter.invalid-argument",
      `${option} must be a non-negative safe integer`,
    );
  }
  return number;
}

function parseOptions(argv: readonly string[]): Options {
  const options: Options = {
    scenarioPath: defaultScenarioPath,
    catalogPath: defaultCatalogPath,
    expected: false,
    pretty: false,
    checkGolden: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    switch (option) {
      case "--scenario":
        options.scenarioPath = resolve(nextValue(argv, index, option));
        index += 1;
        break;
      case "--catalog":
        options.catalogPath = resolve(nextValue(argv, index, option));
        index += 1;
        break;
      case "--critical-tier": {
        const value = nextValue(argv, index, option);
        options.criticalTier = nonNegativeSafeInteger(value, option);
        index += 1;
        break;
      }
      case "--armor":
        options.armor = nonNegativeNumber(nextValue(argv, index, option), option);
        index += 1;
        break;
      case "--health":
        options.health = nonNegativeNumber(nextValue(argv, index, option), option);
        index += 1;
        break;
      case "--expected":
        options.expected = true;
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
  if (options.expected) {
    if (
      options.scenarioPath !== defaultScenarioPath ||
      options.catalogPath !== defaultCatalogPath
    ) {
      throw new AdapterError(
        "adapter.invalid-argument",
        "--expected cannot be combined with --scenario or --catalog",
      );
    }
    options.scenarioPath = expectedScenarioPath;
    options.catalogPath = expectedCatalogPath;
  }
  return options;
}

function record(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AdapterError("adapter.invalid-input-shape", `${path} must be an object`);
  }
  return value as JsonRecord;
}

function firstRecord(value: unknown, path: string): JsonRecord {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AdapterError("adapter.invalid-input-shape", `${path} must be a non-empty array`);
  }
  return record(value[0], `${path}/0`);
}

async function readJson(path: string): Promise<unknown> {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    throw new AdapterError(
      "adapter.file-read-failed",
      `Could not read ${path}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new AdapterError(
      "adapter.json-invalid",
      `Could not parse ${path}: ${error instanceof Error ? error.message : "invalid JSON"}`,
    );
  }
}

async function applyOverrides(input: unknown, options: Options): Promise<unknown> {
  if (
    options.criticalTier === undefined &&
    options.armor === undefined &&
    options.health === undefined
  ) {
    return input;
  }

  const scenario = structuredClone(record(input, "/"));
  if (options.criticalTier !== undefined) {
    const action = firstRecord(scenario.actionPlan, "/actionPlan");
    const parameters = record(action.parameters, "/actionPlan/0/parameters");
    parameters.criticalTier = options.criticalTier;
  }
  if (options.armor !== undefined || options.health !== undefined) {
    const target = firstRecord(scenario.targets, "/targets");
    const configuration = record(target.configuration, "/targets/0/configuration");
    if (options.armor !== undefined) {
      configuration.resolvedArmor = options.armor;
    }
    if (options.health !== undefined) {
      configuration.resolvedHealth = options.health;
    }
  }
  delete scenario.contentHash;
  return attachArtifactContentHash(scenario);
}

function numberRecord(value: unknown, path: string): Readonly<Record<string, number>> {
  const candidate = record(value, path);
  for (const [key, item] of Object.entries(candidate)) {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new AdapterError(
        "adapter.golden-fixture-invalid",
        `${path}/${key} must be a finite number`,
      );
    }
  }
  return candidate as Readonly<Record<string, number>>;
}

function stringArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new AdapterError("adapter.golden-fixture-invalid", `${path} must be an array of strings`);
  }
  return value as string[];
}

function recordArray(value: unknown, path: string): readonly JsonRecord[] {
  if (!Array.isArray(value)) {
    throw new AdapterError("adapter.golden-fixture-invalid", `${path} must be an array`);
  }
  return value.map((item, index) => record(item, `${path}/${index}`));
}

function closeEnough(actual: number | undefined, expected: number, tolerance: number): boolean {
  return actual !== undefined && Math.abs(actual - expected) <= tolerance;
}

function assertGolden(result: Result, trace: Trace, input: unknown): string {
  const expected = record(input, "/");
  const tolerance = expected.tolerance;
  if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance < 0) {
    throw new AdapterError(
      "adapter.golden-fixture-invalid",
      "/tolerance must be a finite non-negative number",
    );
  }
  for (const [metricId, value] of Object.entries(numberRecord(expected.metrics, "/metrics"))) {
    if (!closeEnough(result.metrics[metricId], value, tolerance)) {
      throw new AdapterError(
        "adapter.golden-mismatch",
        `Metric ${metricId} did not match literal expected value ${value}`,
      );
    }
  }
  for (const [sourceId, value] of Object.entries(
    numberRecord(expected.damageBySource, "/damageBySource"),
  )) {
    if (!closeEnough(result.damageBySource[sourceId], value, tolerance)) {
      throw new AdapterError(
        "adapter.golden-mismatch",
        `Damage source ${sourceId} did not match literal expected value ${value}`,
      );
    }
  }
  for (const [damageTypeId, value] of Object.entries(
    numberRecord(expected.damageByType, "/damageByType"),
  )) {
    if (!closeEnough(result.damageByType[damageTypeId], value, tolerance)) {
      throw new AdapterError(
        "adapter.golden-mismatch",
        `Damage type ${damageTypeId} did not match literal expected value ${value}`,
      );
    }
  }

  const appliedRuleIds = trace.decisions
    .filter((decision) => decision.outcome === "applied")
    .map((decision) => decision.ruleId);
  const expectedApplied = stringArray(expected.appliedRuleIds, "/appliedRuleIds");
  if (canonicalizeJson(appliedRuleIds) !== canonicalizeJson(expectedApplied)) {
    throw new AdapterError(
      "adapter.golden-mismatch",
      "Applied Rule IDs did not match the literal golden fixture",
    );
  }

  const rejectedRules = trace.decisions
    .filter((decision) => decision.outcome === "rejected")
    .map((decision) => ({
      ruleId: decision.ruleId,
      stage: decision.rejectionStage,
      code: decision.rejectionReason.code,
    }));
  const expectedRejected = recordArray(expected.rejectedRules, "/rejectedRules");
  if (canonicalizeJson(rejectedRules) !== canonicalizeJson(expectedRejected)) {
    throw new AdapterError(
      "adapter.golden-mismatch",
      "Rejected Rule decisions did not match the literal golden fixture",
    );
  }

  const expectedScenarioId = expected.scenarioId;
  if (typeof expectedScenarioId !== "string" || result.scenarioRef.id !== expectedScenarioId) {
    throw new AdapterError(
      "adapter.golden-mismatch",
      "Result Scenario reference did not match the literal golden fixture",
    );
  }

  const expectedId = expected.id;
  if (typeof expectedId !== "string") {
    throw new AdapterError("adapter.golden-fixture-invalid", "/id must be a string");
  }
  return expectedId;
}

function emit(value: unknown, pretty: boolean): void {
  if (pretty) {
    const canonical = canonicalizeJson(value);
    process.stdout.write(`${JSON.stringify(JSON.parse(canonical), null, 2)}\n`);
    return;
  }
  process.stdout.write(`${canonicalizeJson(value)}\n`);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  const hasOverrides =
    options.criticalTier !== undefined ||
    options.armor !== undefined ||
    options.health !== undefined;
  if (options.expected && options.criticalTier !== undefined) {
    throw new AdapterError(
      "adapter.invalid-argument",
      "--critical-tier is a realized outcome and cannot be combined with --expected",
    );
  }
  const selectedDefaultScenarioPath = options.expected ? expectedScenarioPath : defaultScenarioPath;
  const selectedDefaultCatalogPath = options.expected ? expectedCatalogPath : defaultCatalogPath;
  if (
    options.checkGolden &&
    (hasOverrides ||
      options.scenarioPath !== selectedDefaultScenarioPath ||
      options.catalogPath !== selectedDefaultCatalogPath)
  ) {
    throw new AdapterError(
      "adapter.invalid-argument",
      "--check-golden requires the unmodified bundled Scenario and Catalog",
    );
  }

  const scenario = await applyOverrides(await readJson(options.scenarioPath), options);
  const catalog = await readJson(options.catalogPath);
  const outcome = await evaluateScenario({
    scenario,
    catalog,
  });
  if (!outcome.ok) {
    emit(outcome, options.pretty);
    process.exitCode = 2;
    return;
  }

  if (options.checkGolden) {
    const goldenId = assertGolden(
      outcome.result,
      outcome.trace,
      await readJson(options.expected ? expectedExpectedPath : expectedPath),
    );
    emit(
      {
        ...outcome,
        goldenCheck: {
          id: goldenId,
          passed: true,
        },
      },
      options.pretty,
    );
    return;
  }
  emit(outcome, options.pretty);
}

try {
  await main();
} catch (error) {
  emit(
    {
      ok: false,
      error: {
        code: error instanceof AdapterError ? error.code : "adapter.unexpected",
        message: error instanceof Error ? error.message : "Unknown adapter failure",
      },
    },
    process.argv.includes("--pretty"),
  );
  process.exitCode = 1;
}
