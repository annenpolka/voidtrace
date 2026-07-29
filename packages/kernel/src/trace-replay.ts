import { type Trace, validateContract, verifyArtifactContentHash } from "@voidtrace/contracts";
import { type DamageVector, scaleDamageVector } from "@voidtrace/rules";

export type TraceReplayErrorCode =
  | "trace-contract-invalid"
  | "content-hash-mismatch"
  | "missing-damage-vector"
  | "invalid-operation-parameters"
  | "unsupported-operation";

export class TraceReplayError extends Error {
  readonly code: TraceReplayErrorCode;

  constructor(code: TraceReplayErrorCode, message: string) {
    super(message);
    this.name = "TraceReplayError";
    this.code = code;
  }
}

function copyOperationDamage(
  parameters: Readonly<Record<string, string | number | boolean | null>>,
): DamageVector {
  const components: Record<string, number> = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (!key.startsWith("component.")) {
      continue;
    }
    const damageTypeId = key.slice("component.".length);
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new TraceReplayError(
        "invalid-operation-parameters",
        `Trace copy operation has invalid component ${key}`,
      );
    }
    components[damageTypeId] = value;
  }
  if (Object.keys(components).length === 0) {
    throw new TraceReplayError(
      "missing-damage-vector",
      "Trace copy operation does not contain a Damage Vector",
    );
  }
  return Object.freeze(components);
}

function scaleFactor(
  parameters: Readonly<Record<string, string | number | boolean | null>>,
): number {
  const factor = parameters.factor;
  if (typeof factor !== "number" || !Number.isFinite(factor) || factor < 0) {
    throw new TraceReplayError(
      "invalid-operation-parameters",
      "Trace scale operation has no finite non-negative factor",
    );
  }
  return factor;
}

/**
 * Reconstructs the final Damage Vector solely from ordered Trace operations.
 *
 * This replay is deliberately narrower than evaluation. It understands only
 * the finite operation vocabulary emitted by the first combat slice.
 */
export async function replayTraceDamage(input: unknown): Promise<DamageVector> {
  const validated = validateContract("trace", input);
  if (!validated.ok) {
    throw new TraceReplayError("trace-contract-invalid", "Trace contract validation failed");
  }
  const trace: Trace = validated.value;
  if (!(await verifyArtifactContentHash(trace))) {
    throw new TraceReplayError(
      "content-hash-mismatch",
      "Trace contentHash does not match its canonical content",
    );
  }
  let damage: DamageVector | undefined;

  for (const decision of trace.decisions) {
    if (decision.outcome !== "applied") {
      continue;
    }
    for (const operation of decision.operations) {
      switch (operation.kind) {
        case "damage-vector.copy":
          damage = copyOperationDamage(operation.parameters);
          break;
        case "damage-vector.scale-fixed-critical":
        case "damage-vector.scale-standard-armor":
          if (damage === undefined) {
            throw new TraceReplayError(
              "missing-damage-vector",
              `Trace operation ${operation.kind} precedes Damage Vector construction`,
            );
          }
          damage = scaleDamageVector(damage, scaleFactor(operation.parameters));
          break;
        case "damage.commit-health":
          if (damage === undefined) {
            throw new TraceReplayError(
              "missing-damage-vector",
              "Trace commits Health before constructing a Damage Vector",
            );
          }
          break;
        default:
          throw new TraceReplayError(
            "unsupported-operation",
            `Unsupported Trace operation: ${operation.kind}`,
          );
      }
    }
  }

  if (damage === undefined) {
    throw new TraceReplayError(
      "missing-damage-vector",
      "Trace contains no applied Damage Vector construction",
    );
  }
  return damage;
}
