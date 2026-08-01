import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalizeJson } from "../../../../packages/contracts/src/index.ts";
import { runExperiment } from "../../../../packages/sdk/src/index.ts";

type JsonRecord = Record<string, unknown>;

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const experimentPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/resolved-scenario-comparison.experiment.json",
);
const expectedPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/resolved-scenario-comparison.expected.json",
);
const catalogPath = resolve(repositoryRoot, "data/fixtures/catalog-mini/catalog.json");
const scenarioPaths = [
  "data/fixtures/golden/radial-critical-armor.scenario.json",
  "data/fixtures/golden/direct-critical-armor.scenario.json",
  "data/fixtures/golden/probability-critical-armor.scenario.json",
].map((path) => resolve(repositoryRoot, path));

const HELP = `VoidTrace repository-local resolved comparison helper

Usage:
  node .agents/skills/voidtrace/scripts/run-comparison.ts [options]

Options:
  --pretty        Pretty-print JSON instead of canonical single-line JSON
  --check-golden  Assert the checked-in comparison against literal expectations
  --help          Show this help
`;

class AdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

function record(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AdapterError("adapter.invalid-fixture", `${path} must be an object`);
  }
  return value as JsonRecord;
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    throw new AdapterError("adapter.fixture-read-failed", `Could not read fixture: ${path}`);
  }
}

function projectComparison(comparison: unknown): JsonRecord {
  const value = record(comparison, "/comparison");
  const experimentRef = record(value.experimentRef, "/comparison/experimentRef");
  const base = record(value.base, "/comparison/base");
  if (!Array.isArray(value.variants)) {
    throw new AdapterError("adapter.invalid-comparison", "/comparison/variants must be an array");
  }
  return {
    experimentId: experimentRef.id,
    comparisonId: value.id,
    primaryMetric: value.primaryMetric,
    base: {
      scenarioId: record(base.scenarioRef, "/comparison/base/scenarioRef").id,
      metricValue: base.metricValue,
      deltaFromBase: base.deltaFromBase,
    },
    variants: value.variants.map((item, index) => {
      const variant = record(item, `/comparison/variants/${index}`);
      return {
        id: variant.id,
        scenarioId: record(variant.scenarioRef, `/comparison/variants/${index}/scenarioRef`).id,
        metricValue: variant.metricValue,
        deltaFromBase: variant.deltaFromBase,
      };
    }),
  };
}

async function main(argv: readonly string[]): Promise<number> {
  const unknown = argv.filter(
    (option) => option !== "--pretty" && option !== "--check-golden" && option !== "--help",
  );
  if (unknown.length > 0) {
    throw new AdapterError("adapter.invalid-argument", `Unknown option: ${unknown[0]}`);
  }
  if (argv.includes("--help")) {
    process.stdout.write(HELP);
    return 0;
  }

  const [experiment, catalog, expected, ...scenarios] = await Promise.all([
    readJson(experimentPath),
    readJson(catalogPath),
    readJson(expectedPath),
    ...scenarioPaths.map(readJson),
  ]);
  const outcome = await runExperiment({ experiment, scenarios, catalog });
  if (!outcome.ok) {
    process.stdout.write(`${canonicalizeJson(outcome)}\n`);
    return 2;
  }
  if (
    argv.includes("--check-golden") &&
    canonicalizeJson(projectComparison(outcome.comparison)) !== canonicalizeJson(expected)
  ) {
    throw new AdapterError(
      "adapter.golden-mismatch",
      "Resolved comparison did not match literal expectations",
    );
  }
  process.stdout.write(
    argv.includes("--pretty")
      ? `${JSON.stringify(outcome, null, 2)}\n`
      : `${canonicalizeJson(outcome)}\n`,
  );
  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  const adapterError =
    error instanceof AdapterError
      ? error
      : new AdapterError("adapter.internal", "Comparison helper failed unexpectedly");
  process.stdout.write(
    `${canonicalizeJson({ ok: false, error: { code: adapterError.code, message: adapterError.message } })}\n`,
  );
  process.exitCode = 1;
}
