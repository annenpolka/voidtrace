import {
  type ArtifactRef,
  artifactMatchesRef,
  attachArtifactContentHash,
  type CatalogSnapshot,
  type Comparison,
  canonicalizeJson,
  type Experiment,
  type Result,
  type Ruleset,
  type Scenario,
  snapshotJsonValue,
  type Trace,
  validateContract,
  verifyArtifactContentHash,
  verifyResultTraceIntegrity,
} from "@voidtrace/contracts";
import {
  type EvaluationOutcome,
  type EvaluationRequest,
  evaluateScenario as evaluateKernelScenario,
} from "@voidtrace/kernel";

export type ExperimentErrorCode =
  | "experiment-invalid"
  | "catalog-load-failed"
  | "ruleset-load-failed"
  | "catalog-reference-mismatch"
  | "ruleset-reference-mismatch"
  | "scenario-set-mismatch"
  | "scenario-reference-mismatch"
  | "unsupported-experiment-scenario"
  | "scenario-evaluation-failed"
  | "comparison-metric-missing"
  | "comparison-arithmetic-failed"
  | "artifact-construction-failed"
  | "integrity-check-failed";

export type ExperimentError = {
  readonly code: ExperimentErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly memberId?: string;
  readonly causeCode?: string;
};

export type RunResolvedComparisonRequest = {
  readonly experiment: unknown;
  readonly scenarios: ReadonlyArray<unknown>;
  readonly catalog: unknown;
  readonly ruleset: unknown;
  readonly productVersion?: string;
};

export type ExperimentEvaluationRow = {
  readonly scenario: Scenario;
  readonly result: Result;
  readonly trace: Trace;
};

export type ExperimentVariantEvaluationRow = ExperimentEvaluationRow & {
  readonly id: string;
};

export type ExperimentSuccess = {
  readonly ok: true;
  readonly comparison: Comparison;
  readonly base: ExperimentEvaluationRow;
  readonly variants: ReadonlyArray<ExperimentVariantEvaluationRow>;
};

export type ExperimentFailure = {
  readonly ok: false;
  readonly error: ExperimentError;
};

export type ExperimentOutcome = ExperimentSuccess | ExperimentFailure;

export type ScenarioEvaluator = (request: EvaluationRequest) => Promise<EvaluationOutcome>;

export type ExperimentRunnerDependencies = {
  readonly evaluateScenario: ScenarioEvaluator;
};

type JsonRecord = Record<string, unknown>;

type DeclaredMember = {
  readonly id: string | null;
  readonly pointer: string;
  readonly reference: ArtifactRef & { readonly kind: "voidtrace.scenario" };
};

type ResolvedMember = DeclaredMember & {
  readonly scenario: Scenario;
};

type Preflight = {
  readonly experiment: Experiment;
  readonly catalog: CatalogSnapshot;
  readonly ruleset: Ruleset;
  readonly base: ResolvedMember;
  readonly variants: ReadonlyArray<ResolvedMember & { readonly id: string }>;
  readonly productVersion?: string;
};

const REQUEST_KEYS = ["catalog", "experiment", "productVersion", "ruleset", "scenarios"] as const;
const SUCCESS_KEYS = ["ok", "result", "trace"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value).toSorted();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function failure(
  code: ExperimentErrorCode,
  message: string,
  details: {
    readonly path?: string;
    readonly memberId?: string;
    readonly causeCode?: string;
  } = {},
): ExperimentFailure {
  return deepFreeze({
    ok: false,
    error: {
      code,
      message,
      ...(details.path === undefined ? {} : { path: details.path }),
      ...(details.memberId === undefined ? {} : { memberId: details.memberId }),
      ...(details.causeCode === undefined ? {} : { causeCode: details.causeCode }),
    },
  });
}

function isExperimentFailure(
  value: ExperimentFailure | Preflight | ExperimentEvaluationRow,
): value is ExperimentFailure {
  return "ok" in value && value.ok === false;
}

function firstIssuePath(
  validation: Extract<ReturnType<typeof validateContract>, { readonly ok: false }>,
): string | undefined {
  const path = validation.issues[0]?.instancePath;
  return path === undefined || path.length === 0 ? undefined : path;
}

function artifactRef<TKind extends string>(artifact: {
  readonly kind: TKind;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
}): ArtifactRef & { readonly kind: TKind } {
  return deepFreeze({
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  });
}

function scenarioIdentity(value: { readonly id: string; readonly revision: number }): string {
  return `${value.id}\0${value.revision}`;
}

function referencesEqual(left: ArtifactRef, right: ArtifactRef): boolean {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

async function preflight(request: unknown): Promise<Preflight | ExperimentFailure> {
  let requestSnapshot: unknown;
  try {
    requestSnapshot = snapshotJsonValue(request);
  } catch {
    return failure("experiment-invalid", "Experiment request must be a plain JSON value");
  }
  if (!isRecord(requestSnapshot)) {
    return failure("experiment-invalid", "Experiment request must be an object");
  }
  const requestKeys = Object.keys(requestSnapshot).toSorted();
  if (
    requestKeys.some((key) => !REQUEST_KEYS.includes(key as (typeof REQUEST_KEYS)[number])) ||
    !["catalog", "experiment", "ruleset", "scenarios"].every((key) =>
      Object.hasOwn(requestSnapshot, key),
    )
  ) {
    return failure("experiment-invalid", "Experiment request has an invalid field set");
  }
  if (
    requestSnapshot.productVersion !== undefined &&
    typeof requestSnapshot.productVersion !== "string"
  ) {
    return failure("experiment-invalid", "productVersion must be a string", {
      path: "/productVersion",
    });
  }

  const experimentValidation = validateContract("experiment", requestSnapshot.experiment);
  if (!experimentValidation.ok) {
    const path = firstIssuePath(experimentValidation);
    return failure("experiment-invalid", "Experiment Contract validation failed", {
      ...(path === undefined ? {} : { path }),
    });
  }
  const experiment = deepFreeze(experimentValidation.value);
  if (!(await verifyArtifactContentHash(experiment))) {
    return failure("experiment-invalid", "Experiment contentHash does not match its content", {
      path: "/contentHash",
    });
  }

  const catalogValidation = validateContract("catalog-snapshot", requestSnapshot.catalog);
  if (!catalogValidation.ok) {
    const path = firstIssuePath(catalogValidation);
    return failure("catalog-load-failed", "CatalogSnapshot Contract validation failed", {
      ...(path === undefined ? {} : { path }),
    });
  }
  const catalog = deepFreeze(catalogValidation.value);
  if (!(await verifyArtifactContentHash(catalog))) {
    return failure(
      "catalog-load-failed",
      "CatalogSnapshot contentHash does not match its content",
      {
        path: "/catalog/contentHash",
        causeCode: "content-hash-mismatch",
      },
    );
  }

  const rulesetValidation = validateContract("ruleset", requestSnapshot.ruleset);
  if (!rulesetValidation.ok) {
    const path = firstIssuePath(rulesetValidation);
    return failure("ruleset-load-failed", "Ruleset Contract validation failed", {
      ...(path === undefined ? {} : { path }),
    });
  }
  const ruleset = deepFreeze(rulesetValidation.value);
  if (!(await verifyArtifactContentHash(ruleset))) {
    return failure("ruleset-load-failed", "Ruleset contentHash does not match its content", {
      path: "/ruleset/contentHash",
      causeCode: "content-hash-mismatch",
    });
  }

  if (
    experiment.gameBuild !== catalog.gameBuild ||
    !(await artifactMatchesRef(experiment.catalogRef, catalog))
  ) {
    return failure(
      "catalog-reference-mismatch",
      "Experiment catalogRef does not match the supplied CatalogSnapshot",
      { path: "/experiment/catalogRef" },
    );
  }
  if (
    experiment.gameBuild !== ruleset.gameBuild ||
    !(await artifactMatchesRef(experiment.rulesetRef, ruleset))
  ) {
    return failure(
      "ruleset-reference-mismatch",
      "Experiment rulesetRef does not match the supplied Ruleset",
      { path: "/experiment/rulesetRef" },
    );
  }

  if (!Array.isArray(requestSnapshot.scenarios)) {
    return failure("scenario-set-mismatch", "scenarios must be an array", {
      path: "/scenarios",
    });
  }
  const scenarioInputs = requestSnapshot.scenarios;
  const validatedScenarios: Scenario[] = [];
  for (const [index, input] of scenarioInputs.entries()) {
    const validation = validateContract("scenario", input);
    if (!validation.ok) {
      return failure("scenario-reference-mismatch", "Scenario Contract validation failed", {
        path: `/scenarios/${index}${firstIssuePath(validation) ?? ""}`,
      });
    }
    const scenario = deepFreeze(validation.value);
    if (!(await verifyArtifactContentHash(scenario))) {
      return failure(
        "scenario-reference-mismatch",
        "Scenario contentHash does not match its content",
        {
          path: `/scenarios/${index}/contentHash`,
          causeCode: "content-hash-mismatch",
        },
      );
    }
    validatedScenarios.push(scenario);
  }

  const members: DeclaredMember[] = [
    {
      id: null,
      pointer: "/baseScenarioRef",
      reference: experiment.baseScenarioRef,
    },
    ...experiment.variants.map((variant, index) => ({
      id: variant.id,
      pointer: `/variants/${index}/scenarioRef`,
      reference: variant.scenarioRef,
    })),
  ];
  const variantIds = new Set<string>();
  const declaredScenarioIdentities = new Set<string>();
  for (const member of members) {
    if (member.id !== null) {
      if (variantIds.has(member.id)) {
        return failure("experiment-invalid", "Experiment variant IDs must be unique", {
          path: member.pointer.replace(/scenarioRef$/, "id"),
          memberId: member.id,
          causeCode: "duplicate-variant-id",
        });
      }
      variantIds.add(member.id);
    }
    const identity = scenarioIdentity(member.reference);
    if (declaredScenarioIdentities.has(identity)) {
      return failure("scenario-set-mismatch", "Declared Scenario identities must be unique", {
        path: member.pointer,
        ...(member.id === null ? {} : { memberId: member.id }),
        causeCode: "duplicate-scenario-identity",
      });
    }
    declaredScenarioIdentities.add(identity);
  }

  if (validatedScenarios.length !== members.length) {
    return failure(
      "scenario-set-mismatch",
      "Supplied Scenario count does not match the Experiment declaration",
      { path: "/scenarios" },
    );
  }
  const suppliedByIdentity = new Map<string, Scenario>();
  for (const [index, scenario] of validatedScenarios.entries()) {
    const identity = scenarioIdentity(scenario);
    if (suppliedByIdentity.has(identity)) {
      return failure("scenario-set-mismatch", "Supplied Scenario identities must be unique", {
        path: `/scenarios/${index}`,
        causeCode: "duplicate-scenario-identity",
      });
    }
    if (!declaredScenarioIdentities.has(identity)) {
      return failure(
        "scenario-set-mismatch",
        "Supplied Scenario is not declared by the Experiment",
        {
          path: `/scenarios/${index}`,
          causeCode: "unexpected-scenario",
        },
      );
    }
    suppliedByIdentity.set(identity, scenario);
  }

  const resolvedMembers: ResolvedMember[] = [];
  for (const member of members) {
    const scenario = suppliedByIdentity.get(scenarioIdentity(member.reference));
    if (scenario === undefined) {
      return failure("scenario-set-mismatch", "A declared Scenario was not supplied", {
        path: member.pointer,
        ...(member.id === null ? {} : { memberId: member.id }),
        causeCode: "missing-scenario",
      });
    }
    if (!(await artifactMatchesRef(member.reference, scenario))) {
      return failure(
        "scenario-reference-mismatch",
        "Scenario does not match its declared reference",
        {
          path: member.pointer,
          ...(member.id === null ? {} : { memberId: member.id }),
        },
      );
    }
    if (
      scenario.gameBuild !== experiment.gameBuild ||
      !referencesEqual(scenario.catalogRef, experiment.catalogRef) ||
      !referencesEqual(scenario.rulesetRef, experiment.rulesetRef)
    ) {
      return failure(
        "scenario-reference-mismatch",
        "Scenario provenance does not match the Experiment Catalog, Ruleset, and game build",
        {
          path: member.pointer,
          ...(member.id === null ? {} : { memberId: member.id }),
          causeCode: "provenance-mismatch",
        },
      );
    }
    if (scenario.simulation.mode === "monte-carlo") {
      return failure(
        "unsupported-experiment-scenario",
        "Resolved comparison does not support Monte Carlo Scenarios",
        {
          path: member.pointer,
          ...(member.id === null ? {} : { memberId: member.id }),
          causeCode: "unsupported-monte-carlo",
        },
      );
    }
    if (scenario.metrics.filter((metric) => metric === experiment.primaryMetric).length !== 1) {
      return failure(
        "comparison-metric-missing",
        "primaryMetric must occur exactly once in every Scenario metrics list",
        {
          path: member.pointer,
          ...(member.id === null ? {} : { memberId: member.id }),
          causeCode: "scenario-metric-membership",
        },
      );
    }
    resolvedMembers.push(deepFreeze({ ...member, scenario }));
  }

  const base = resolvedMembers[0];
  if (base === undefined) {
    return failure("scenario-set-mismatch", "Experiment has no base Scenario");
  }
  const variants = resolvedMembers.slice(1).map((member) => {
    if (member.id === null) {
      throw new TypeError("Variant member has no ID");
    }
    return deepFreeze({ ...member, id: member.id });
  });
  return deepFreeze({
    experiment,
    catalog,
    ruleset,
    base,
    variants,
    ...(requestSnapshot.productVersion === undefined
      ? {}
      : { productVersion: requestSnapshot.productVersion }),
  });
}

async function evaluateMember(
  evaluator: ScenarioEvaluator,
  preflighted: Preflight,
  member: ResolvedMember,
): Promise<ExperimentEvaluationRow | ExperimentFailure> {
  let rawOutcome: unknown;
  try {
    rawOutcome = await evaluator({
      scenario: member.scenario,
      catalog: preflighted.catalog,
      ruleset: preflighted.ruleset,
      ...(preflighted.productVersion === undefined
        ? {}
        : { productVersion: preflighted.productVersion }),
    });
  } catch {
    return failure("scenario-evaluation-failed", "Scenario evaluator threw an exception", {
      path: member.pointer,
      ...(member.id === null ? {} : { memberId: member.id }),
      causeCode: "evaluator-threw",
    });
  }

  let outcome: unknown;
  try {
    outcome = snapshotJsonValue(rawOutcome);
  } catch {
    return failure("integrity-check-failed", "Scenario evaluator returned a non-JSON outcome", {
      path: member.pointer,
      ...(member.id === null ? {} : { memberId: member.id }),
      causeCode: "invalid-evaluator-outcome",
    });
  }
  if (!isRecord(outcome) || typeof outcome.ok !== "boolean") {
    return failure("integrity-check-failed", "Scenario evaluator returned an invalid outcome", {
      path: member.pointer,
      ...(member.id === null ? {} : { memberId: member.id }),
      causeCode: "invalid-evaluator-outcome",
    });
  }
  if (!outcome.ok) {
    return failure("scenario-evaluation-failed", "Scenario evaluation failed", {
      path: member.pointer,
      ...(member.id === null ? {} : { memberId: member.id }),
      causeCode: "evaluator-reported-failure",
    });
  }
  if (!hasExactKeys(outcome, SUCCESS_KEYS)) {
    return failure(
      "integrity-check-failed",
      "Scenario evaluator success has an invalid field set",
      {
        path: member.pointer,
        ...(member.id === null ? {} : { memberId: member.id }),
        causeCode: "invalid-evaluator-outcome",
      },
    );
  }

  const resultValidation = validateContract("result", outcome.result);
  const traceValidation = validateContract("trace", outcome.trace);
  if (!resultValidation.ok || !traceValidation.ok) {
    return failure(
      "integrity-check-failed",
      "Scenario evaluator returned invalid Result or Trace",
      {
        path: member.pointer,
        ...(member.id === null ? {} : { memberId: member.id }),
        causeCode: "invalid-evaluation-artifact",
      },
    );
  }
  const result = deepFreeze(resultValidation.value);
  const trace = deepFreeze(traceValidation.value);
  if (!(await verifyResultTraceIntegrity(result, trace, member.scenario))) {
    return failure(
      "integrity-check-failed",
      "Result and Trace do not match the evaluated Scenario",
      {
        path: member.pointer,
        ...(member.id === null ? {} : { memberId: member.id }),
        causeCode: "result-trace-integrity",
      },
    );
  }
  const metricValue = result.metrics[preflighted.experiment.primaryMetric];
  if (
    result.fingerprint.catalogHash !== preflighted.experiment.catalogRef.contentHash ||
    result.fingerprint.rulesetHash !== preflighted.experiment.rulesetRef.contentHash ||
    !Object.hasOwn(result.metrics, preflighted.experiment.primaryMetric) ||
    typeof metricValue !== "number" ||
    !Number.isFinite(metricValue)
  ) {
    return failure(
      "comparison-metric-missing",
      "Result does not contain the required primaryMetric",
      {
        path: member.pointer,
        ...(member.id === null ? {} : { memberId: member.id }),
        causeCode: "result-metric-membership",
      },
    );
  }
  return deepFreeze({
    scenario: member.scenario,
    result,
    trace,
  });
}

async function comparisonMatches(
  comparison: Comparison,
  preflighted: Preflight,
  base: ExperimentEvaluationRow,
  variants: ReadonlyArray<ExperimentVariantEvaluationRow>,
): Promise<boolean> {
  if (!(await verifyArtifactContentHash(comparison))) {
    return false;
  }
  if (
    comparison.id !== `comparison.${preflighted.experiment.id}` ||
    comparison.revision !== preflighted.experiment.revision ||
    comparison.gameBuild !== preflighted.experiment.gameBuild ||
    comparison.createdFrom !== undefined ||
    comparison.primaryMetric !== preflighted.experiment.primaryMetric ||
    !(await artifactMatchesRef(comparison.experimentRef, preflighted.experiment)) ||
    variants.length !== preflighted.variants.length ||
    comparison.variants.length !== variants.length ||
    !(await artifactMatchesRef(comparison.base.scenarioRef, base.scenario)) ||
    !(await artifactMatchesRef(comparison.base.resultRef, base.result)) ||
    comparison.base.metricValue !== base.result.metrics[comparison.primaryMetric] ||
    comparison.base.deltaFromBase !== 0
  ) {
    return false;
  }
  for (const [index, row] of variants.entries()) {
    const declared = preflighted.variants[index];
    const projection = comparison.variants[index];
    if (
      declared === undefined ||
      projection === undefined ||
      projection.id !== declared.id ||
      row.id !== declared.id ||
      !(await artifactMatchesRef(projection.scenarioRef, row.scenario)) ||
      !(await artifactMatchesRef(projection.resultRef, row.result)) ||
      projection.metricValue !== row.result.metrics[comparison.primaryMetric]
    ) {
      return false;
    }
    const expectedDelta = normalizeZero(projection.metricValue - comparison.base.metricValue);
    if (!Number.isFinite(expectedDelta) || projection.deltaFromBase !== expectedDelta) {
      return false;
    }
  }
  return true;
}

export function createExperimentRunner(
  dependencies: ExperimentRunnerDependencies,
): (request: RunResolvedComparisonRequest) => Promise<ExperimentOutcome> {
  const evaluator = dependencies.evaluateScenario;
  if (typeof evaluator !== "function") {
    throw new TypeError("createExperimentRunner requires a Scenario evaluator");
  }
  return async (request: RunResolvedComparisonRequest): Promise<ExperimentOutcome> => {
    const preflighted = await preflight(request);
    if (isExperimentFailure(preflighted)) {
      return preflighted;
    }

    const base = await evaluateMember(evaluator, preflighted, preflighted.base);
    if (isExperimentFailure(base)) {
      return base;
    }
    const variants: ExperimentVariantEvaluationRow[] = [];
    for (const member of preflighted.variants) {
      const row = await evaluateMember(evaluator, preflighted, member);
      if (isExperimentFailure(row)) {
        return row;
      }
      variants.push(deepFreeze({ id: member.id, ...row }));
    }

    const baseMetricValue = base.result.metrics[preflighted.experiment.primaryMetric];
    if (typeof baseMetricValue !== "number" || !Number.isFinite(baseMetricValue)) {
      return failure("comparison-metric-missing", "Base Result primaryMetric is unavailable");
    }
    const variantProjections: Comparison["variants"][number][] = [];
    for (const row of variants) {
      const metricValue = row.result.metrics[preflighted.experiment.primaryMetric];
      if (typeof metricValue !== "number" || !Number.isFinite(metricValue)) {
        return failure("comparison-metric-missing", "Variant Result primaryMetric is unavailable", {
          memberId: row.id,
        });
      }
      const deltaFromBase = normalizeZero(metricValue - baseMetricValue);
      if (!Number.isFinite(deltaFromBase)) {
        return failure(
          "comparison-arithmetic-failed",
          "Signed variant-minus-base delta is not finite",
          { memberId: row.id, causeCode: "non-finite-delta" },
        );
      }
      variantProjections.push(
        deepFreeze({
          id: row.id,
          scenarioRef: artifactRef(row.scenario),
          resultRef: artifactRef(row.result),
          metricValue,
          deltaFromBase,
        }),
      );
    }

    let comparison: Comparison;
    try {
      const withHash = await attachArtifactContentHash({
        $schema: "urn:voidtrace:schema:comparison:0.1.0",
        kind: "voidtrace.comparison",
        schemaVersion: "0.1.0",
        id: `comparison.${preflighted.experiment.id}`,
        revision: preflighted.experiment.revision,
        gameBuild: preflighted.experiment.gameBuild,
        experimentRef: artifactRef(preflighted.experiment),
        primaryMetric: preflighted.experiment.primaryMetric,
        base: {
          scenarioRef: artifactRef(base.scenario),
          resultRef: artifactRef(base.result),
          metricValue: baseMetricValue,
          deltaFromBase: 0,
        },
        variants: variantProjections,
      } as const);
      const validation = validateContract("comparison", withHash);
      if (!validation.ok) {
        const path = firstIssuePath(validation);
        return failure("artifact-construction-failed", "Constructed Comparison is invalid", {
          ...(path === undefined ? {} : { path }),
        });
      }
      comparison = deepFreeze(validation.value);
    } catch {
      return failure("artifact-construction-failed", "Comparison construction failed");
    }

    if (!(await comparisonMatches(comparison, preflighted, base, variants))) {
      return failure(
        "integrity-check-failed",
        "Comparison failed cross-Artifact integrity checks",
        {
          causeCode: "comparison-integrity",
        },
      );
    }
    return deepFreeze({
      ok: true,
      comparison,
      base,
      variants,
    });
  };
}

export const runResolvedComparison = createExperimentRunner({
  evaluateScenario: evaluateKernelScenario,
});
