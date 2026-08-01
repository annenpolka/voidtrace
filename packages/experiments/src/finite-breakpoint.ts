import {
  type ArtifactRef,
  artifactMatchesRef,
  attachArtifactContentHash,
  canonicalizeJson,
  type Experiment,
  type FiniteBreakpointAnalysis,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";
import type { ExperimentSuccess } from "./index.ts";

type SweepVariant = Extract<
  Experiment["variants"][number],
  { readonly patchRef: unknown; readonly sweepPoint: unknown }
>;

export type FiniteBreakpointErrorCode =
  | "breakpoint-request-invalid"
  | "breakpoint-source-failed"
  | "breakpoint-source-unsupported"
  | "breakpoint-series-mismatch"
  | "breakpoint-axis-unsupported"
  | "breakpoint-order-invalid"
  | "breakpoint-fingerprint-mismatch"
  | "breakpoint-arithmetic-failed"
  | "breakpoint-ambiguous"
  | "artifact-construction-failed"
  | "integrity-check-failed";

export type FiniteBreakpointError = {
  readonly code: FiniteBreakpointErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly side?: "left" | "right";
  readonly memberId?: string;
  readonly causeCode?: string;
};

export type FiniteBreakpointSuccess = {
  readonly ok: true;
  readonly analysis: FiniteBreakpointAnalysis;
};

export type FiniteBreakpointFailure = {
  readonly ok: false;
  readonly error: FiniteBreakpointError;
};

export type FiniteBreakpointOutcome = FiniteBreakpointSuccess | FiniteBreakpointFailure;

export type PreparedFiniteBreakpoint = {
  readonly sweepPath: string;
  readonly coordinates: ReadonlyArray<number>;
  readonly leftVariants: ReadonlyArray<SweepVariant>;
  readonly rightVariants: ReadonlyArray<SweepVariant>;
};

type ArtifactIdentity<TKind extends string = string> = {
  readonly kind: TKind;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
};

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

export function finiteBreakpointFailure(
  code: FiniteBreakpointErrorCode,
  message: string,
  details: {
    readonly path?: string;
    readonly side?: "left" | "right";
    readonly memberId?: string;
    readonly causeCode?: string;
  } = {},
): FiniteBreakpointFailure {
  return deepFreeze({
    ok: false,
    error: {
      code,
      message,
      ...(details.path === undefined ? {} : { path: details.path }),
      ...(details.side === undefined ? {} : { side: details.side }),
      ...(details.memberId === undefined ? {} : { memberId: details.memberId }),
      ...(details.causeCode === undefined ? {} : { causeCode: details.causeCode }),
    },
  });
}

function artifactRef<TKind extends string>(
  artifact: ArtifactIdentity<TKind>,
): ArtifactRef & { readonly kind: TKind } {
  return deepFreeze({
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  });
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function isSweepVariant(variant: Experiment["variants"][number]): variant is SweepVariant {
  return "patchRef" in variant && "sweepPoint" in variant;
}

function referencesEqual(left: unknown, right: unknown): boolean {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

function sideCoordinates(
  experiment: Experiment,
  side: "left" | "right",
):
  | {
      readonly path: string;
      readonly coordinates: ReadonlyArray<number>;
      readonly variants: ReadonlyArray<SweepVariant>;
    }
  | FiniteBreakpointFailure {
  if (!experiment.variants.every(isSweepVariant)) {
    return finiteBreakpointFailure(
      "breakpoint-source-unsupported",
      "Finite Breakpoint analysis requires finite Sweep Experiments",
      { path: `/${side}/experiment/variants`, side, causeCode: "non-sweep-experiment" },
    );
  }
  const variants = experiment.variants;
  const first = variants[0];
  if (first === undefined) {
    return finiteBreakpointFailure(
      "breakpoint-source-unsupported",
      "Finite Breakpoint analysis requires at least one Sweep point",
      { path: `/${side}/experiment/variants`, side, causeCode: "empty-sweep" },
    );
  }
  const path = first.sweepPoint.path;
  const coordinates: number[] = [];
  for (const [index, variant] of variants.entries()) {
    const coordinate = variant.sweepPoint.value;
    if (variant.sweepPoint.path !== path) {
      return finiteBreakpointFailure(
        "breakpoint-series-mismatch",
        "Finite Breakpoint source points must share one Sweep path",
        {
          path: `/${side}/experiment/variants/${index}/sweepPoint/path`,
          side,
          memberId: variant.id,
          causeCode: "multiple-sweep-paths",
        },
      );
    }
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate)) {
      return finiteBreakpointFailure(
        "breakpoint-axis-unsupported",
        "Finite Breakpoint coordinates must be finite numbers",
        {
          path: `/${side}/experiment/variants/${index}/sweepPoint/value`,
          side,
          memberId: variant.id,
          causeCode: "non-numeric-coordinate",
        },
      );
    }
    const normalized = normalizeZero(coordinate);
    const previous = coordinates.at(-1);
    if (previous !== undefined && !(normalized > previous)) {
      return finiteBreakpointFailure(
        "breakpoint-order-invalid",
        "Finite Breakpoint coordinates must be strictly increasing in declaration order",
        {
          path: `/${side}/experiment/variants/${index}/sweepPoint/value`,
          side,
          memberId: variant.id,
          causeCode: "coordinate-not-increasing",
        },
      );
    }
    coordinates.push(normalized);
  }
  return deepFreeze({ path, coordinates, variants });
}

export function prepareFiniteBreakpoint(
  left: Experiment,
  right: Experiment,
): PreparedFiniteBreakpoint | FiniteBreakpointFailure {
  if (
    left.gameBuild !== right.gameBuild ||
    left.primaryMetric !== right.primaryMetric ||
    !referencesEqual(left.catalogRef, right.catalogRef) ||
    !referencesEqual(left.rulesetRef, right.rulesetRef)
  ) {
    return finiteBreakpointFailure(
      "breakpoint-series-mismatch",
      "Finite Breakpoint sources must share game build, Catalog, Ruleset, and primary metric",
      { causeCode: "source-provenance-mismatch" },
    );
  }
  const leftAxis = sideCoordinates(left, "left");
  if ("ok" in leftAxis) {
    return leftAxis;
  }
  const rightAxis = sideCoordinates(right, "right");
  if ("ok" in rightAxis) {
    return rightAxis;
  }
  if (
    leftAxis.path !== rightAxis.path ||
    leftAxis.coordinates.length !== rightAxis.coordinates.length
  ) {
    return finiteBreakpointFailure(
      "breakpoint-series-mismatch",
      "Finite Breakpoint sources must have the same path and point count",
      { causeCode: "axis-shape-mismatch" },
    );
  }
  for (const [index, coordinate] of leftAxis.coordinates.entries()) {
    if (rightAxis.coordinates[index] !== coordinate) {
      return finiteBreakpointFailure(
        "breakpoint-series-mismatch",
        "Finite Breakpoint sources must have identical declaration-ordered coordinates",
        {
          path: `/right/experiment/variants/${index}/sweepPoint/value`,
          causeCode: "coordinate-mismatch",
        },
      );
    }
  }
  return deepFreeze({
    sweepPath: leftAxis.path,
    coordinates: leftAxis.coordinates,
    leftVariants: leftAxis.variants,
    rightVariants: rightAxis.variants,
  });
}

function fingerprintVersions(
  left: ExperimentSuccess,
  right: ExperimentSuccess,
):
  | {
      readonly productVersion: string;
      readonly engineVersion: string;
      readonly scenarioSchemaVersion: string;
    }
  | FiniteBreakpointFailure {
  const rows = [left.base, ...left.variants, right.base, ...right.variants];
  const first = rows[0]?.result.fingerprint;
  if (first === undefined) {
    return finiteBreakpointFailure(
      "breakpoint-fingerprint-mismatch",
      "Finite Breakpoint sources have no Result fingerprint",
      { causeCode: "missing-fingerprint" },
    );
  }
  for (const row of rows) {
    const fingerprint = row.result.fingerprint;
    if (
      fingerprint.productVersion !== first.productVersion ||
      fingerprint.engineVersion !== first.engineVersion ||
      fingerprint.scenarioSchemaVersion !== first.scenarioSchemaVersion
    ) {
      return finiteBreakpointFailure(
        "breakpoint-fingerprint-mismatch",
        "Every Result used by a finite Breakpoint must share product, Engine, and Scenario versions",
        { causeCode: "incompatible-result-fingerprint" },
      );
    }
  }
  return deepFreeze({
    productVersion: first.productVersion,
    engineVersion: first.engineVersion,
    scenarioSchemaVersion: first.scenarioSchemaVersion,
  });
}

type Candidate =
  | { readonly type: "exact-equality"; readonly sampleIndex: number }
  | {
      readonly type: "sampled-sign-reversal";
      readonly lowerSampleIndex: number;
      readonly upperSampleIndex: number;
    };

function candidates(samples: FiniteBreakpointAnalysis["samples"]): ReadonlyArray<Candidate> {
  const observed: Candidate[] = [];
  for (const [index, sample] of samples.entries()) {
    if (sample.signedDifference === 0) {
      observed.push({ type: "exact-equality", sampleIndex: index });
    }
    const previous = samples[index - 1];
    if (
      previous !== undefined &&
      previous.signedDifference !== 0 &&
      sample.signedDifference !== 0 &&
      ((previous.signedDifference < 0 && sample.signedDifference > 0) ||
        (previous.signedDifference > 0 && sample.signedDifference < 0))
    ) {
      observed.push({
        type: "sampled-sign-reversal",
        lowerSampleIndex: index - 1,
        upperSampleIndex: index,
      });
    }
  }
  return deepFreeze(observed);
}

async function analysisMatches(
  analysis: FiniteBreakpointAnalysis,
  analysisId: string,
  analysisRevision: number,
  leftExperiment: Experiment,
  rightExperiment: Experiment,
  left: ExperimentSuccess,
  right: ExperimentSuccess,
  prepared: PreparedFiniteBreakpoint,
): Promise<boolean> {
  const fingerprint = left.base.result.fingerprint;
  if (
    !(await verifyArtifactContentHash(analysis)) ||
    analysis.id !== analysisId ||
    analysis.revision !== analysisRevision ||
    analysis.createdFrom !== undefined ||
    analysis.gameBuild !== leftExperiment.gameBuild ||
    analysis.method !== "finite-scan" ||
    analysis.primaryMetric !== leftExperiment.primaryMetric ||
    analysis.sweepPath !== prepared.sweepPath ||
    analysis.productVersion !== fingerprint.productVersion ||
    analysis.engineVersion !== fingerprint.engineVersion ||
    analysis.scenarioSchemaVersion !== fingerprint.scenarioSchemaVersion ||
    !(await artifactMatchesRef(analysis.leftExperimentRef, leftExperiment)) ||
    !(await artifactMatchesRef(analysis.rightExperimentRef, rightExperiment)) ||
    !(await artifactMatchesRef(analysis.leftComparisonRef, left.comparison)) ||
    !(await artifactMatchesRef(analysis.rightComparisonRef, right.comparison)) ||
    analysis.samples.length !== prepared.coordinates.length
  ) {
    return false;
  }
  for (const [index, sample] of analysis.samples.entries()) {
    const leftRow = left.variants[index];
    const rightRow = right.variants[index];
    const leftVariant = prepared.leftVariants[index];
    const rightVariant = prepared.rightVariants[index];
    if (
      leftRow === undefined ||
      rightRow === undefined ||
      leftVariant === undefined ||
      rightVariant === undefined ||
      sample.value !== prepared.coordinates[index] ||
      sample.leftVariantId !== leftVariant.id ||
      sample.rightVariantId !== rightVariant.id ||
      !(await artifactMatchesRef(sample.leftScenarioRef, leftRow.scenario)) ||
      !(await artifactMatchesRef(sample.rightScenarioRef, rightRow.scenario)) ||
      !(await artifactMatchesRef(sample.leftResultRef, leftRow.result)) ||
      !(await artifactMatchesRef(sample.rightResultRef, rightRow.result)) ||
      sample.leftMetricValue !== leftRow.result.metrics[analysis.primaryMetric] ||
      sample.rightMetricValue !== rightRow.result.metrics[analysis.primaryMetric] ||
      sample.signedDifference !== normalizeZero(sample.leftMetricValue - sample.rightMetricValue)
    ) {
      return false;
    }
  }
  const observed = candidates(analysis.samples);
  if (observed.length === 0) {
    return analysis.finding.type === "no-observed-candidate";
  }
  return (
    observed.length === 1 && canonicalizeJson(analysis.finding) === canonicalizeJson(observed[0])
  );
}

export async function buildFiniteBreakpointAnalysis(request: {
  readonly analysisId: string;
  readonly analysisRevision: number;
  readonly leftExperiment: Experiment;
  readonly rightExperiment: Experiment;
  readonly left: ExperimentSuccess;
  readonly right: ExperimentSuccess;
  readonly prepared: PreparedFiniteBreakpoint;
}): Promise<FiniteBreakpointOutcome> {
  const versions = fingerprintVersions(request.left, request.right);
  if ("ok" in versions) {
    return versions;
  }
  if (
    request.left.variants.length !== request.prepared.coordinates.length ||
    request.right.variants.length !== request.prepared.coordinates.length
  ) {
    return finiteBreakpointFailure(
      "integrity-check-failed",
      "Finite Breakpoint evaluation rows do not match the prepared point count",
      { causeCode: "evaluation-row-count" },
    );
  }

  const samples: FiniteBreakpointAnalysis["samples"][number][] = [];
  for (const [index, value] of request.prepared.coordinates.entries()) {
    const leftRow = request.left.variants[index];
    const rightRow = request.right.variants[index];
    const leftVariant = request.prepared.leftVariants[index];
    const rightVariant = request.prepared.rightVariants[index];
    if (
      leftRow === undefined ||
      rightRow === undefined ||
      leftVariant === undefined ||
      rightVariant === undefined ||
      leftRow.id !== leftVariant.id ||
      rightRow.id !== rightVariant.id
    ) {
      return finiteBreakpointFailure(
        "integrity-check-failed",
        "Finite Breakpoint evaluation rows do not match the prepared variants",
        { path: `/samples/${index}`, causeCode: "evaluation-row-membership" },
      );
    }
    const leftMetricValue = leftRow.result.metrics[request.leftExperiment.primaryMetric];
    const rightMetricValue = rightRow.result.metrics[request.rightExperiment.primaryMetric];
    if (
      typeof leftMetricValue !== "number" ||
      !Number.isFinite(leftMetricValue) ||
      typeof rightMetricValue !== "number" ||
      !Number.isFinite(rightMetricValue)
    ) {
      return finiteBreakpointFailure(
        "integrity-check-failed",
        "Finite Breakpoint Result metrics must be finite numbers",
        { path: `/samples/${index}`, causeCode: "metric-unavailable" },
      );
    }
    const signedDifference = normalizeZero(leftMetricValue - rightMetricValue);
    if (!Number.isFinite(signedDifference)) {
      return finiteBreakpointFailure(
        "breakpoint-arithmetic-failed",
        "Finite Breakpoint signed difference is not finite",
        { path: `/samples/${index}/signedDifference`, causeCode: "non-finite-difference" },
      );
    }
    samples.push(
      deepFreeze({
        value,
        leftVariantId: leftVariant.id,
        rightVariantId: rightVariant.id,
        leftScenarioRef: artifactRef(leftRow.scenario),
        rightScenarioRef: artifactRef(rightRow.scenario),
        leftResultRef: artifactRef(leftRow.result),
        rightResultRef: artifactRef(rightRow.result),
        leftMetricValue,
        rightMetricValue,
        signedDifference,
      }),
    );
  }

  const observed = candidates(samples);
  if (observed.length > 1) {
    return finiteBreakpointFailure(
      "breakpoint-ambiguous",
      "Finite Breakpoint samples contain more than one observational candidate",
      { causeCode: "multiple-candidates" },
    );
  }
  const finding: FiniteBreakpointAnalysis["finding"] =
    observed[0] ?? deepFreeze({ type: "no-observed-candidate" as const });

  let analysis: FiniteBreakpointAnalysis;
  try {
    const withHash = await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:finite-breakpoint-analysis:0.1.0",
      kind: "voidtrace.finite-breakpoint-analysis",
      schemaVersion: "0.1.0",
      id: request.analysisId,
      revision: request.analysisRevision,
      gameBuild: request.leftExperiment.gameBuild,
      method: "finite-scan",
      leftExperimentRef: artifactRef(request.leftExperiment),
      rightExperimentRef: artifactRef(request.rightExperiment),
      leftComparisonRef: artifactRef(request.left.comparison),
      rightComparisonRef: artifactRef(request.right.comparison),
      primaryMetric: request.leftExperiment.primaryMetric,
      sweepPath: request.prepared.sweepPath,
      ...versions,
      samples,
      finding,
    } as const);
    const validation = validateContract("finite-breakpoint-analysis", withHash);
    if (!validation.ok) {
      return finiteBreakpointFailure(
        "artifact-construction-failed",
        "Constructed FiniteBreakpointAnalysis is invalid",
        {
          ...(validation.issues[0]?.instancePath
            ? { path: validation.issues[0].instancePath }
            : {}),
        },
      );
    }
    analysis = deepFreeze(validation.value);
  } catch {
    return finiteBreakpointFailure(
      "artifact-construction-failed",
      "FiniteBreakpointAnalysis construction failed",
    );
  }

  if (
    !(await analysisMatches(
      analysis,
      request.analysisId,
      request.analysisRevision,
      request.leftExperiment,
      request.rightExperiment,
      request.left,
      request.right,
      request.prepared,
    ))
  ) {
    return finiteBreakpointFailure(
      "integrity-check-failed",
      "FiniteBreakpointAnalysis failed cross-Artifact integrity checks",
      { causeCode: "analysis-integrity" },
    );
  }
  return deepFreeze({ ok: true, analysis });
}
