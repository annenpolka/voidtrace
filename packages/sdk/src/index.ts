import { snapshotJsonObject } from "@voidtrace/contracts";
import {
  type ExperimentOutcome,
  type FiniteBreakpointError,
  type FiniteBreakpointErrorCode,
  type FiniteBreakpointFailure,
  type FiniteBreakpointOutcome,
  type FiniteBreakpointSuccess,
  materializeScenarioPatch as materializeExperimentScenarioPatch,
  runExperimentComparison,
  runFiniteBreakpointAnalysis,
  type ScenarioPatchOutcome,
} from "@voidtrace/experiments";
import {
  type EvaluationOutcome,
  evaluateScenario as evaluateKernelScenario,
} from "@voidtrace/kernel";
import { loadCoreRuleset } from "@voidtrace/rules";
import generatedCapabilities from "@voidtrace/spec-artifacts/capabilities" with { type: "json" };

export type CapabilityManifest = typeof generatedCapabilities;

export type SdkEvaluationRequest = {
  readonly scenario: unknown;
  readonly catalog: unknown;
};

export type SdkEvaluationOutcome = EvaluationOutcome;

type SdkExperimentRequestBase = {
  readonly experiment: unknown;
  readonly scenarios: ReadonlyArray<unknown>;
  readonly catalog: unknown;
};

export type SdkResolvedExperimentRequest = SdkExperimentRequestBase & {
  readonly patches?: never;
};

export type SdkPatchBackedExperimentRequest = SdkExperimentRequestBase & {
  readonly patches: ReadonlyArray<unknown>;
};

export type SdkExperimentRequest = SdkResolvedExperimentRequest | SdkPatchBackedExperimentRequest;

export type SdkExperimentOutcome = ExperimentOutcome;

export type SdkFiniteBreakpointSideRequest = {
  readonly experiment: unknown;
  readonly scenarios: ReadonlyArray<unknown>;
  readonly patches: ReadonlyArray<unknown>;
};

export type SdkFiniteBreakpointRequest = {
  readonly analysisId: string;
  readonly analysisRevision: number;
  readonly catalog: unknown;
  readonly left: SdkFiniteBreakpointSideRequest;
  readonly right: SdkFiniteBreakpointSideRequest;
};

export type SdkFiniteBreakpointError = FiniteBreakpointError;
export type SdkFiniteBreakpointErrorCode = FiniteBreakpointErrorCode;
export type SdkFiniteBreakpointFailure = FiniteBreakpointFailure;
export type SdkFiniteBreakpointOutcome = FiniteBreakpointOutcome;
export type SdkFiniteBreakpointSuccess = FiniteBreakpointSuccess;

export type SdkScenarioPatchRequest = {
  readonly patch: unknown;
  readonly scenario: unknown;
};

export type SdkScenarioPatchOutcome = ScenarioPatchOutcome;

const SDK_EXPERIMENT_REQUEST_KEYS = ["catalog", "experiment", "patches", "scenarios"] as const;
const SDK_FINITE_BREAKPOINT_REQUEST_KEYS = [
  "analysisId",
  "analysisRevision",
  "catalog",
  "left",
  "right",
] as const;
const SDK_FINITE_BREAKPOINT_SIDE_KEYS = ["experiment", "patches", "scenarios"] as const;

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function invalidExperimentRequest(message: string): SdkExperimentOutcome {
  return deepFreeze({
    ok: false,
    error: {
      code: "experiment-invalid",
      message,
    },
  });
}

function invalidFiniteBreakpointRequest(
  message: string,
  details: {
    readonly path?: string;
    readonly side?: "left" | "right";
  } = {},
): SdkFiniteBreakpointFailure {
  return deepFreeze({
    ok: false,
    error: {
      code: "breakpoint-request-invalid",
      message,
      ...(details.path === undefined ? {} : { path: details.path }),
      ...(details.side === undefined ? {} : { side: details.side }),
    },
  });
}

function parseFiniteBreakpointSide(
  value: unknown,
  side: "left" | "right",
): SdkFiniteBreakpointSideRequest | SdkFiniteBreakpointFailure {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalidFiniteBreakpointRequest(
      "Each finite Breakpoint side must contain exactly experiment, scenarios, and patches",
      { path: `/${side}`, side },
    );
  }
  const keys = Object.keys(value).toSorted();
  if (
    keys.length !== SDK_FINITE_BREAKPOINT_SIDE_KEYS.length ||
    !keys.every((key, index) => key === SDK_FINITE_BREAKPOINT_SIDE_KEYS[index])
  ) {
    return invalidFiniteBreakpointRequest(
      "Each finite Breakpoint side must contain exactly experiment, scenarios, and patches",
      { path: `/${side}`, side },
    );
  }
  const sideRecord = value as Record<string, unknown>;
  if (!Array.isArray(sideRecord.scenarios) || !Array.isArray(sideRecord.patches)) {
    return invalidFiniteBreakpointRequest(
      "Finite Breakpoint scenarios and patches must be arrays",
      {
        path: `/${side}/${Array.isArray(sideRecord.scenarios) ? "patches" : "scenarios"}`,
        side,
      },
    );
  }
  return {
    experiment: sideRecord.experiment,
    scenarios: sideRecord.scenarios,
    patches: sideRecord.patches,
  };
}

export function describeCapabilities(): CapabilityManifest {
  return deepFreeze(structuredClone(generatedCapabilities));
}

export async function evaluateScenario(
  request: SdkEvaluationRequest,
): Promise<SdkEvaluationOutcome> {
  const ruleset = await loadCoreRuleset();
  return evaluateKernelScenario({
    scenario: request.scenario,
    catalog: request.catalog,
    ruleset,
  });
}

export async function runExperiment(request: SdkExperimentRequest): Promise<SdkExperimentOutcome> {
  let requestSnapshot: ReturnType<typeof snapshotJsonObject>;
  try {
    requestSnapshot = snapshotJsonObject(request);
  } catch {
    return invalidExperimentRequest("Experiment request must be a plain JSON value");
  }
  const requestKeys = Object.keys(requestSnapshot).toSorted();
  if (
    requestKeys.some(
      (key) =>
        !SDK_EXPERIMENT_REQUEST_KEYS.includes(key as (typeof SDK_EXPERIMENT_REQUEST_KEYS)[number]),
    ) ||
    !["catalog", "experiment", "scenarios"].every((key) => Object.hasOwn(requestSnapshot, key))
  ) {
    return invalidExperimentRequest("Experiment request has an invalid field set");
  }
  if (!Array.isArray(requestSnapshot.scenarios)) {
    return deepFreeze({
      ok: false,
      error: {
        code: "scenario-set-mismatch",
        message: "scenarios must be an array",
        path: "/scenarios",
      },
    });
  }
  const patches = requestSnapshot.patches;
  if (Object.hasOwn(requestSnapshot, "patches") && !Array.isArray(patches)) {
    return deepFreeze({
      ok: false,
      error: {
        code: "patch-set-mismatch",
        message: "patches must be an array",
        path: "/patches",
      },
    });
  }
  const ruleset = await loadCoreRuleset();
  const common = {
    experiment: requestSnapshot.experiment,
    scenarios: requestSnapshot.scenarios,
    catalog: requestSnapshot.catalog,
    ruleset: ruleset.snapshot,
  } as const;
  return Array.isArray(patches)
    ? runExperimentComparison({ ...common, patches })
    : runExperimentComparison(common);
}

export async function findFiniteBreakpoint(
  request: SdkFiniteBreakpointRequest,
): Promise<SdkFiniteBreakpointOutcome> {
  let requestSnapshot: ReturnType<typeof snapshotJsonObject>;
  try {
    requestSnapshot = snapshotJsonObject(request);
  } catch {
    return invalidFiniteBreakpointRequest("Finite Breakpoint request must be a plain JSON value");
  }
  const requestKeys = Object.keys(requestSnapshot).toSorted();
  if (
    requestKeys.length !== SDK_FINITE_BREAKPOINT_REQUEST_KEYS.length ||
    !requestKeys.every((key, index) => key === SDK_FINITE_BREAKPOINT_REQUEST_KEYS[index])
  ) {
    return invalidFiniteBreakpointRequest("Finite Breakpoint request has an invalid field set");
  }
  const left = parseFiniteBreakpointSide(requestSnapshot.left, "left");
  if ("ok" in left) {
    return left;
  }
  const right = parseFiniteBreakpointSide(requestSnapshot.right, "right");
  if ("ok" in right) {
    return right;
  }

  const ruleset = await loadCoreRuleset();
  return runFiniteBreakpointAnalysis({
    analysisId: requestSnapshot.analysisId as string,
    analysisRevision: requestSnapshot.analysisRevision as number,
    catalog: requestSnapshot.catalog,
    left,
    right,
    ruleset: ruleset.snapshot,
  });
}

export async function materializeScenarioPatch(
  request: SdkScenarioPatchRequest,
): Promise<SdkScenarioPatchOutcome> {
  return materializeExperimentScenarioPatch(request);
}
