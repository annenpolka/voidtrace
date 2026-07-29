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

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
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
