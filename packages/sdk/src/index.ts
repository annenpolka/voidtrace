import { snapshotJsonObject } from "@voidtrace/contracts";
import {
  type ExperimentOutcome,
  materializeScenarioPatch as materializeExperimentScenarioPatch,
  runExperimentComparison,
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

export type SdkScenarioPatchRequest = {
  readonly patch: unknown;
  readonly scenario: unknown;
};

export type SdkScenarioPatchOutcome = ScenarioPatchOutcome;

const SDK_EXPERIMENT_REQUEST_KEYS = ["catalog", "experiment", "patches", "scenarios"] as const;

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

export async function materializeScenarioPatch(
  request: SdkScenarioPatchRequest,
): Promise<SdkScenarioPatchOutcome> {
  return materializeExperimentScenarioPatch(request);
}
