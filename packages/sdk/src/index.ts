import { snapshotJsonObject } from "@voidtrace/contracts";
import { type ExperimentOutcome, runResolvedComparison } from "@voidtrace/experiments";
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

export type SdkExperimentRequest = {
  readonly experiment: unknown;
  readonly scenarios: ReadonlyArray<unknown>;
  readonly catalog: unknown;
};

export type SdkExperimentOutcome = ExperimentOutcome;

const SDK_EXPERIMENT_REQUEST_KEYS = ["catalog", "experiment", "scenarios"] as const;

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
    requestKeys.length !== SDK_EXPERIMENT_REQUEST_KEYS.length ||
    !requestKeys.every((key, index) => key === SDK_EXPERIMENT_REQUEST_KEYS[index])
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
  const ruleset = await loadCoreRuleset();
  return runResolvedComparison({
    experiment: requestSnapshot.experiment,
    scenarios: requestSnapshot.scenarios,
    catalog: requestSnapshot.catalog,
    ruleset: ruleset.snapshot,
  });
}
