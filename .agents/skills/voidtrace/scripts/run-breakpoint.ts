import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalizeJson } from "../../../../packages/contracts/src/index.ts";
import { findFiniteBreakpoint } from "../../../../packages/sdk/src/index.ts";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const catalogPath = resolve(repositoryRoot, "data/fixtures/catalog-mini/catalog.json");
const expectedPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/finite-breakpoint-analysis.expected.json",
);
const leftExperimentPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/breakpoint-left-sweep.experiment.json",
);
const leftScenarioPath = resolve(
  repositoryRoot,
  "data/fixtures/golden/direct-critical-armor.scenario.json",
);
const leftPatchPaths = [
  "data/fixtures/experiments/critical-tier-sweep-0.scenario-patch.json",
  "data/fixtures/experiments/critical-tier-sweep-2.scenario-patch.json",
  "data/fixtures/experiments/critical-tier-sweep-3.scenario-patch.json",
].map((path) => resolve(repositoryRoot, path));
const rightExperimentPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/breakpoint-right-sweep.experiment.json",
);
const rightScenarioPath = resolve(
  repositoryRoot,
  "data/fixtures/experiments/breakpoint-right.scenario.json",
);
const rightPatchPaths = [
  "data/fixtures/experiments/breakpoint-right-sweep-0.scenario-patch.json",
  "data/fixtures/experiments/breakpoint-right-sweep-2.scenario-patch.json",
  "data/fixtures/experiments/breakpoint-right-sweep-3.scenario-patch.json",
].map((path) => resolve(repositoryRoot, path));

const HELP = `VoidTrace repository-local finite Breakpoint helper

Usage:
  node .agents/skills/voidtrace/scripts/run-breakpoint.ts [options]

Options:
  --pretty        Pretty-print JSON instead of canonical single-line JSON
  --check-golden  Assert the checked-in finite analysis against the full literal Artifact
  --help          Show this help

Scope:
  Uses two fixed synthetic finite Sweeps through the SDK only.
  Reports an observed sampled sign reversal from tier 0 to tier 2.
  Does not find a continuous root, interpolate, or declare a winner.
`;

class AdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    throw new AdapterError("adapter.fixture-read-failed", `Could not read fixture: ${path}`);
  }
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

  const [
    catalog,
    expected,
    leftExperiment,
    leftScenario,
    leftPatches,
    rightExperiment,
    rightScenario,
    rightPatches,
  ] = await Promise.all([
    readJson(catalogPath),
    readJson(expectedPath),
    readJson(leftExperimentPath),
    readJson(leftScenarioPath),
    Promise.all(leftPatchPaths.map(readJson)),
    readJson(rightExperimentPath),
    readJson(rightScenarioPath),
    Promise.all(rightPatchPaths.map(readJson)),
  ]);
  const outcome = await findFiniteBreakpoint({
    analysisId: "analysis.golden-finite-breakpoint",
    analysisRevision: 0,
    catalog,
    left: {
      experiment: leftExperiment,
      scenarios: [leftScenario],
      patches: leftPatches,
    },
    right: {
      experiment: rightExperiment,
      scenarios: [rightScenario],
      patches: rightPatches,
    },
  });
  if (!outcome.ok) {
    process.stdout.write(`${canonicalizeJson(outcome)}\n`);
    return 2;
  }
  if (
    argv.includes("--check-golden") &&
    canonicalizeJson(outcome.analysis) !== canonicalizeJson(expected)
  ) {
    throw new AdapterError(
      "adapter.golden-mismatch",
      "Finite Breakpoint analysis did not match the full literal Artifact",
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
      : new AdapterError("adapter.internal", "Finite Breakpoint helper failed unexpectedly");
  process.stdout.write(
    `${canonicalizeJson({ ok: false, error: { code: adapterError.code, message: adapterError.message } })}\n`,
  );
  process.exitCode = 1;
}
