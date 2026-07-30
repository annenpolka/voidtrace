import {
  canonicalizeJson,
  isStableId,
  type Trace,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";
import { type DamageVector, scaleDamageVector, sumDamageVector } from "@voidtrace/rules";

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

type BranchMetadata = {
  readonly id: string;
  readonly tier: number;
  readonly weight: number;
};

type HitMetadata = {
  readonly id: string;
  readonly index: number;
  readonly count: number;
};

function branchMetadata(
  parameters: Readonly<Record<string, string | number | boolean | null>>,
): BranchMetadata | undefined {
  const id = parameters["branch.id"];
  const tier = parameters["branch.tier"];
  const weight = parameters["branch.weight"];
  if (id === undefined && tier === undefined && weight === undefined) {
    return undefined;
  }
  if (
    typeof id !== "string" ||
    !isStableId(id) ||
    typeof tier !== "number" ||
    !Number.isSafeInteger(tier) ||
    tier < 0 ||
    typeof weight !== "number" ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    throw new TraceReplayError(
      "invalid-operation-parameters",
      "Trace branch operation has incomplete or invalid branch metadata",
    );
  }
  return Object.freeze({ id, tier, weight });
}

function hitMetadata(
  parameters: Readonly<Record<string, string | number | boolean | null>>,
): HitMetadata | undefined {
  const id = parameters["hit.id"];
  const index = parameters["hit.index"];
  const count = parameters["hit.count"];
  if (id === undefined && index === undefined && count === undefined) {
    return undefined;
  }
  if (
    typeof id !== "string" ||
    !isStableId(id) ||
    typeof index !== "number" ||
    !Number.isSafeInteger(index) ||
    index < 0 ||
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 1 ||
    index >= count
  ) {
    invalidParameters("Trace hit operation has incomplete or invalid hit metadata");
  }
  return Object.freeze({ id, index, count });
}

export type ReplayedTraceState = {
  readonly damage: DamageVector;
  readonly health: number;
};

type BranchReplayState = ReplayedTraceState & {
  readonly committed: boolean;
  readonly tier: number;
  readonly weight: number;
};

type HitReplayState = ReplayedTraceState & {
  readonly committed: boolean;
  readonly index: number;
  readonly count: number;
  readonly healthBefore: number;
};

function invalidParameters(message: string): never {
  throw new TraceReplayError("invalid-operation-parameters", message);
}

function requiredBranchMetadata(
  metadata: BranchMetadata | undefined,
  subject: string,
): BranchMetadata {
  if (metadata === undefined) {
    invalidParameters(`${subject} omitted branch metadata`);
  }
  return metadata;
}

function requiredHitMetadata(metadata: HitMetadata | undefined, subject: string): HitMetadata {
  if (metadata === undefined) {
    invalidParameters(`${subject} omitted hit metadata`);
  }
  return metadata;
}

function requiredNonNegativeNumber(
  values: Readonly<Record<string, string | number | boolean | null>>,
  key: string,
  subject: string,
): number {
  const value = values[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    invalidParameters(`${subject} has no finite non-negative ${key}`);
  }
  return value;
}

function projectionDamage(
  projection: Readonly<Record<string, string | number | boolean | null>>,
  subject: string,
): DamageVector {
  const damage: Record<string, number> = {};
  for (const [key, value] of Object.entries(projection)) {
    if (!key.startsWith("damage.type.")) {
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      invalidParameters(`${subject} has invalid Damage Vector component ${key}`);
    }
    damage[key.slice("damage.type.".length)] = value;
  }
  if (Object.keys(damage).length === 0) {
    throw new TraceReplayError(
      "missing-damage-vector",
      `${subject} does not contain a Damage Vector`,
    );
  }
  const frozen = Object.freeze(damage);
  if (projection["damage.total"] !== sumDamageVector(frozen)) {
    invalidParameters(`${subject} damage.total does not equal its Damage Vector`);
  }
  return frozen;
}

function assertProjection(
  projection: Readonly<Record<string, string | number | boolean | null>>,
  expectedDamage: DamageVector,
  expectedHealth: number,
  subject: string,
): void {
  if (
    projection["damage.total"] !== sumDamageVector(expectedDamage) ||
    projection["target.health"] !== expectedHealth
  ) {
    invalidParameters(`${subject} does not match replayed Damage and Health`);
  }
  const actualDamageKeys = Object.keys(projection)
    .filter((key) => key.startsWith("damage.type."))
    .map((key) => key.slice("damage.type.".length))
    .toSorted();
  const expectedDamageKeys = Object.keys(expectedDamage).toSorted();
  if (
    actualDamageKeys.length !== expectedDamageKeys.length ||
    actualDamageKeys.some((key, index) => key !== expectedDamageKeys[index])
  ) {
    invalidParameters(`${subject} has different Damage Vector keys`);
  }
  for (const key of expectedDamageKeys) {
    if (projection[`damage.type.${key}`] !== expectedDamage[key]) {
      invalidParameters(`${subject} has a different Damage Vector component ${key}`);
    }
  }
}

function aggregateWeightedBranches(
  parameters: Readonly<Record<string, string | number | boolean | null>>,
  branches: ReadonlyMap<string, BranchReplayState>,
  reads: Readonly<Record<string, string | number | boolean | null>>,
): ReplayedTraceState {
  const count = parameters.branchCount;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) {
    throw new TraceReplayError(
      "invalid-operation-parameters",
      "Trace weighted aggregation has no positive safe-integer branchCount",
    );
  }

  let weightTotal = 0;
  let expectedHealth = 0;
  const aggregate: Record<string, number> = {};
  const seenIds = new Set<string>();
  const seenTiers = new Set<number>();
  const damageReads: Array<{ readonly id: string; readonly damage: DamageVector }> = [];
  const healthReads: Array<{ readonly id: string; readonly health: number }> = [];
  const weightReads: Array<{
    readonly id: string;
    readonly tier: number;
    readonly weight: number;
  }> = [];
  let expectedDamageKeys: ReadonlyArray<string> | undefined;
  for (let index = 0; index < count; index += 1) {
    const id = parameters[`branch.${index}.id`];
    const tier = parameters[`branch.${index}.tier`];
    const weight = parameters[`branch.${index}.weight`];
    if (
      typeof id !== "string" ||
      !isStableId(id) ||
      seenIds.has(id) ||
      typeof tier !== "number" ||
      !Number.isSafeInteger(tier) ||
      tier < 0 ||
      seenTiers.has(tier) ||
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      throw new TraceReplayError(
        "invalid-operation-parameters",
        `Trace weighted aggregation has invalid branch ${index}`,
      );
    }
    const branch = branches.get(id);
    if (branch === undefined) {
      throw new TraceReplayError(
        "missing-damage-vector",
        `Trace weighted aggregation references unknown branch ${id}`,
      );
    }
    if (!branch.committed) {
      invalidParameters(`Trace weighted aggregation references uncommitted branch ${id}`);
    }
    if (branch.tier !== tier || branch.weight !== weight) {
      invalidParameters(`Trace weighted aggregation branch ${index} metadata is inconsistent`);
    }
    seenIds.add(id);
    seenTiers.add(tier);
    const damageKeys = Object.keys(branch.damage).toSorted();
    if (
      expectedDamageKeys !== undefined &&
      (damageKeys.length !== expectedDamageKeys.length ||
        damageKeys.some((key, keyIndex) => key !== expectedDamageKeys?.[keyIndex]))
    ) {
      throw new TraceReplayError(
        "invalid-operation-parameters",
        "Trace weighted aggregation branches have different Damage Vector keys",
      );
    }
    expectedDamageKeys = damageKeys;
    damageReads.push({ id, damage: branch.damage });
    healthReads.push({ id, health: branch.health });
    weightReads.push({ id, tier, weight });
    if (
      parameters[`branch.${index}.damageTotal`] !== sumDamageVector(branch.damage) ||
      parameters[`branch.${index}.health`] !== branch.health
    ) {
      invalidParameters(
        `Trace weighted aggregation branch ${index} terminal state is inconsistent`,
      );
    }
    weightTotal += weight;
    const weightedHealth = branch.health * weight;
    expectedHealth += weightedHealth;
    if (!Number.isFinite(weightedHealth) || !Number.isFinite(expectedHealth)) {
      invalidParameters(`Trace weighted aggregation overflowed branch ${index} Health`);
    }
    for (const [damageTypeId, component] of Object.entries(branch.damage)) {
      if (parameters[`branch.${index}.damage.${damageTypeId}`] !== component) {
        invalidParameters(
          `Trace weighted aggregation branch ${index} component ${damageTypeId} is inconsistent`,
        );
      }
      const value = (aggregate[damageTypeId] ?? 0) + component * weight;
      if (!Number.isFinite(value) || value < 0) {
        throw new TraceReplayError(
          "invalid-operation-parameters",
          `Trace weighted aggregation overflowed component ${damageTypeId}`,
        );
      }
      aggregate[damageTypeId] = value;
    }
  }
  if (seenIds.size !== branches.size) {
    throw new TraceReplayError(
      "invalid-operation-parameters",
      "Trace weighted aggregation does not reference every constructed branch exactly once",
    );
  }
  const weightTolerance = Number.EPSILON * Math.max(1, count);
  if (Math.abs(weightTotal - 1) > weightTolerance) {
    throw new TraceReplayError(
      "invalid-operation-parameters",
      "Trace weighted aggregation branch weights do not sum to one",
    );
  }
  if (parameters.weightTotal !== weightTotal || parameters.expectedHealth !== expectedHealth) {
    invalidParameters("Trace weighted aggregation summary is inconsistent");
  }
  if (
    Object.keys(reads).toSorted().join("\u0000") !==
      ["branch.damage", "branch.health", "branch.weight"].join("\u0000") ||
    reads["branch.damage"] !== canonicalizeJson(damageReads) ||
    reads["branch.health"] !== canonicalizeJson(healthReads) ||
    reads["branch.weight"] !== canonicalizeJson(weightReads)
  ) {
    invalidParameters("Trace weighted aggregation reads do not match terminal branches");
  }
  return Object.freeze({
    damage: Object.freeze(aggregate),
    health: expectedHealth,
  });
}

function aggregateSequentialHits(
  parameters: Readonly<Record<string, string | number | boolean | null>>,
  hits: ReadonlyMap<string, HitReplayState>,
  reads: Readonly<Record<string, string | number | boolean | null>>,
  initialHealth: number,
): ReplayedTraceState {
  const count = parameters.hitCount;
  if (
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count !== hits.size
  ) {
    invalidParameters("Trace sequential aggregation has an invalid hitCount");
  }

  const ordered = [...hits.entries()].toSorted(([, left], [, right]) => left.index - right.index);
  const aggregate: Record<string, number> = {};
  const damageReads: Array<{
    readonly id: string;
    readonly index: number;
    readonly damage: DamageVector;
  }> = [];
  const beforeReads: Array<{
    readonly id: string;
    readonly index: number;
    readonly healthBefore: number;
  }> = [];
  const afterReads: Array<{
    readonly id: string;
    readonly index: number;
    readonly healthAfter: number;
  }> = [];
  let previousHealth = initialHealth;
  let expectedDamageKeys: ReadonlyArray<string> | undefined;

  for (const [index, [id, hit]] of ordered.entries()) {
    if (
      hit.index !== index ||
      hit.count !== count ||
      !hit.committed ||
      hit.healthBefore !== previousHealth
    ) {
      invalidParameters(`Trace sequential aggregation has invalid hit ${index}`);
    }
    const damageKeys = Object.keys(hit.damage).toSorted();
    if (
      expectedDamageKeys !== undefined &&
      (damageKeys.length !== expectedDamageKeys.length ||
        damageKeys.some((key, keyIndex) => key !== expectedDamageKeys?.[keyIndex]))
    ) {
      invalidParameters("Trace sequential aggregation hits have different Damage Vector keys");
    }
    expectedDamageKeys = damageKeys;
    if (
      parameters[`hit.${index}.id`] !== id ||
      parameters[`hit.${index}.index`] !== index ||
      parameters[`hit.${index}.damageTotal`] !== sumDamageVector(hit.damage) ||
      parameters[`hit.${index}.healthBefore`] !== hit.healthBefore ||
      parameters[`hit.${index}.healthAfter`] !== hit.health
    ) {
      invalidParameters(`Trace sequential aggregation hit ${index} is inconsistent`);
    }
    for (const [damageTypeId, component] of Object.entries(hit.damage)) {
      if (parameters[`hit.${index}.damage.${damageTypeId}`] !== component) {
        invalidParameters(
          `Trace sequential aggregation hit ${index} component ${damageTypeId} is inconsistent`,
        );
      }
      const value = (aggregate[damageTypeId] ?? 0) + component;
      if (!Number.isFinite(value) || value < 0) {
        invalidParameters(`Trace sequential aggregation overflowed component ${damageTypeId}`);
      }
      aggregate[damageTypeId] = value;
    }
    damageReads.push({ id, index, damage: hit.damage });
    beforeReads.push({ id, index, healthBefore: hit.healthBefore });
    afterReads.push({ id, index, healthAfter: hit.health });
    previousHealth = hit.health;
  }
  if (
    Object.keys(reads).toSorted().join("\u0000") !==
      ["hit.damage", "hit.health-after", "hit.health-before"].join("\u0000") ||
    reads["hit.damage"] !== canonicalizeJson(damageReads) ||
    reads["hit.health-before"] !== canonicalizeJson(beforeReads) ||
    reads["hit.health-after"] !== canonicalizeJson(afterReads)
  ) {
    invalidParameters("Trace sequential aggregation reads do not match terminal hits");
  }
  return Object.freeze({
    damage: Object.freeze(aggregate),
    health: previousHealth,
  });
}

/**
 * Reconstructs final Damage and Health solely from ordered Trace operations,
 * anchored to the Scenario's resolved initial Health.
 *
 * This replay is deliberately narrower than evaluation. It understands only
 * the finite operation vocabulary emitted by the first combat slice.
 */
export async function replayTraceState(
  input: unknown,
  initialHealth: number,
): Promise<ReplayedTraceState> {
  if (!Number.isFinite(initialHealth) || initialHealth < 0) {
    invalidParameters("Trace replay initialHealth must be a finite non-negative number");
  }
  return replayTrace(input, initialHealth);
}

async function replayTrace(
  input: unknown,
  anchoredInitialHealth?: number,
): Promise<ReplayedTraceState> {
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
  let health: number | undefined;
  let committed = false;
  let initialHealth = anchoredInitialHealth;
  const branches = new Map<string, BranchReplayState>();
  const hits = new Map<string, HitReplayState>();
  let expectedHitCount: number | undefined;

  for (const decision of trace.decisions) {
    if (decision.outcome !== "applied") {
      continue;
    }
    if (decision.operations.length !== 1) {
      invalidParameters(`Trace decision ${decision.sequence} must contain exactly one operation`);
    }
    const operation = decision.operations[0];
    if (operation === undefined) {
      invalidParameters(`Trace decision ${decision.sequence} omitted its operation`);
    }
    const operationBranch = branchMetadata(operation.parameters);
    const operationBranchId = operationBranch?.id;
    const operationHit = hitMetadata(operation.parameters);
    const operationHitId = operationHit?.id;
    if (operationBranchId !== undefined && operationHitId !== undefined) {
      invalidParameters(`Trace decision ${decision.sequence} mixes branch and hit metadata`);
    }
    const branchState =
      operationBranchId === undefined ? undefined : branches.get(operationBranchId);
    const hitState = operationHitId === undefined ? undefined : hits.get(operationHitId);
    if (
      operationBranch !== undefined &&
      branchState !== undefined &&
      (operationBranch.tier !== branchState.tier || operationBranch.weight !== branchState.weight)
    ) {
      invalidParameters(`Trace decision ${decision.sequence} changed branch metadata`);
    }
    if (
      operationHit !== undefined &&
      hitState !== undefined &&
      (operationHit.index !== hitState.index || operationHit.count !== hitState.count)
    ) {
      invalidParameters(`Trace decision ${decision.sequence} changed hit metadata`);
    }
    const currentDamage =
      operationBranchId !== undefined
        ? branchState?.damage
        : operationHitId !== undefined
          ? hitState?.damage
          : damage;
    const currentHealth =
      operationBranchId !== undefined
        ? branchState?.health
        : operationHitId !== undefined
          ? hitState?.health
          : health;

    switch (operation.kind) {
      case "event.expand-fixed-multishot":
      case "event.expand-fixed-pellets": {
        const isMultishot = operation.kind === "event.expand-fixed-multishot";
        const hitCount = operation.parameters[isMultishot ? "hitCount" : "pelletCount"];
        const maximumHits = operation.parameters[isMultishot ? "maximumHits" : "maximumPellets"];
        const countRead = isMultishot ? "action.multishot-hit-count" : "action.pellet-count";
        if (
          typeof hitCount !== "number" ||
          !Number.isSafeInteger(hitCount) ||
          hitCount < 1 ||
          typeof maximumHits !== "number" ||
          !Number.isSafeInteger(maximumHits) ||
          maximumHits < hitCount ||
          decision.reads[countRead] !== hitCount
        ) {
          invalidParameters("Trace fixed grouped-hit expansion has invalid parameters");
        }
        const beforeDamage = projectionDamage(
          decision.before,
          `Trace decision ${decision.sequence} before`,
        );
        const beforeHealth = requiredNonNegativeNumber(
          decision.before,
          "target.health",
          `Trace decision ${decision.sequence} before`,
        );
        if (sumDamageVector(beforeDamage) !== 0) {
          invalidParameters("Trace fixed grouped-hit expansion does not start at zero Damage");
        }
        if (initialHealth === undefined) {
          initialHealth = beforeHealth;
        }
        assertProjection(
          decision.before,
          beforeDamage,
          initialHealth,
          `Trace decision ${decision.sequence} before`,
        );
        assertProjection(
          decision.after,
          beforeDamage,
          initialHealth,
          `Trace decision ${decision.sequence} after`,
        );
        expectedHitCount = hitCount;
        damage = beforeDamage;
        health = initialHealth;
        break;
      }
      case "damage-vector.copy": {
        if (initialHealth === undefined) {
          initialHealth = requiredNonNegativeNumber(
            decision.before,
            "target.health",
            `Trace decision ${decision.sequence} before`,
          );
        }
        const beforeDamage = projectionDamage(
          decision.before,
          `Trace decision ${decision.sequence} before`,
        );
        if (sumDamageVector(beforeDamage) !== 0) {
          invalidParameters(
            `Trace copy decision ${decision.sequence} does not start at zero Damage`,
          );
        }
        const copyHealth =
          operationHitId === undefined
            ? initialHealth
            : requiredNonNegativeNumber(
                decision.before,
                "target.health",
                `Trace decision ${decision.sequence} before`,
              );
        assertProjection(
          decision.before,
          beforeDamage,
          copyHealth,
          `Trace decision ${decision.sequence} before`,
        );
        const copied = copyOperationDamage(operation.parameters);
        assertProjection(
          decision.after,
          copied,
          copyHealth,
          `Trace decision ${decision.sequence} after`,
        );
        if (operationHitId !== undefined) {
          const metadata = requiredHitMetadata(
            operationHit,
            `Trace copy decision ${decision.sequence}`,
          );
          if (
            expectedHitCount === undefined ||
            metadata.count !== expectedHitCount ||
            metadata.index !== hits.size ||
            hits.has(operationHitId) ||
            copyHealth !== health
          ) {
            invalidParameters(`Trace constructs invalid sequential hit ${operationHitId}`);
          }
          hits.set(
            operationHitId,
            Object.freeze({
              damage: copied,
              health: copyHealth,
              healthBefore: copyHealth,
              committed: false,
              index: metadata.index,
              count: metadata.count,
            }),
          );
        } else if (operationBranchId === undefined) {
          if (damage !== undefined && sumDamageVector(damage) !== 0) {
            invalidParameters("Trace constructs duplicate global Damage Vector");
          }
          damage = copied;
          health = initialHealth;
        } else {
          const metadata = requiredBranchMetadata(
            operationBranch,
            `Trace copy decision ${decision.sequence}`,
          );
          if (branches.has(operationBranchId)) {
            invalidParameters(`Trace constructs duplicate branch ${operationBranchId}`);
          }
          if ([...branches.values()].some((branch) => branch.tier === metadata.tier)) {
            invalidParameters(`Trace constructs duplicate branch tier ${metadata.tier}`);
          }
          branches.set(
            operationBranchId,
            Object.freeze({
              damage: copied,
              health: copyHealth,
              committed: false,
              tier: metadata.tier,
              weight: metadata.weight,
            }),
          );
        }
        break;
      }
      case "critical-tier.resolve-binary-roll":
      case "critical-tier.resolve-tier-roll":
        if (currentDamage === undefined || currentHealth === undefined) {
          throw new TraceReplayError(
            "missing-damage-vector",
            "Trace resolves a Critical roll before constructing a Damage Vector",
          );
        }
        assertProjection(
          decision.before,
          currentDamage,
          currentHealth,
          `Trace decision ${decision.sequence} before`,
        );
        assertProjection(
          decision.after,
          currentDamage,
          currentHealth,
          `Trace decision ${decision.sequence} after`,
        );
        break;
      case "critical-tier.resolve-expected-branches": {
        const beforeDamage = projectionDamage(
          decision.before,
          `Trace decision ${decision.sequence} before`,
        );
        if (sumDamageVector(beforeDamage) !== 0) {
          invalidParameters("Trace expected branch resolution does not start at zero Damage");
        }
        const beforeHealth = requiredNonNegativeNumber(
          decision.before,
          "target.health",
          `Trace decision ${decision.sequence} before`,
        );
        if (initialHealth === undefined) {
          initialHealth = beforeHealth;
        }
        assertProjection(
          decision.before,
          beforeDamage,
          initialHealth,
          `Trace decision ${decision.sequence} before`,
        );
        assertProjection(
          decision.after,
          beforeDamage,
          initialHealth,
          `Trace decision ${decision.sequence} after`,
        );
        damage = beforeDamage;
        health = initialHealth;
        break;
      }
      case "damage-vector.scale-fixed-critical":
      case "damage-vector.scale-critical-tier":
      case "damage-vector.scale-standard-armor": {
        if (currentDamage === undefined || currentHealth === undefined) {
          throw new TraceReplayError(
            "missing-damage-vector",
            `Trace operation ${operation.kind} precedes Damage Vector construction`,
          );
        }
        assertProjection(
          decision.before,
          currentDamage,
          currentHealth,
          `Trace decision ${decision.sequence} before`,
        );
        const scaled = scaleDamageVector(currentDamage, scaleFactor(operation.parameters));
        assertProjection(
          decision.after,
          scaled,
          currentHealth,
          `Trace decision ${decision.sequence} after`,
        );
        if (operationHitId !== undefined) {
          const metadata = requiredHitMetadata(
            operationHit,
            `Trace scale decision ${decision.sequence}`,
          );
          if (hitState === undefined) {
            invalidParameters(`Trace scales unknown hit ${operationHitId}`);
          }
          hits.set(
            operationHitId,
            Object.freeze({
              damage: scaled,
              health: currentHealth,
              healthBefore: hitState.healthBefore,
              committed: hitState.committed,
              index: metadata.index,
              count: metadata.count,
            }),
          );
        } else if (operationBranchId === undefined) {
          damage = scaled;
        } else {
          const metadata = requiredBranchMetadata(
            operationBranch,
            `Trace scale decision ${decision.sequence}`,
          );
          branches.set(
            operationBranchId,
            Object.freeze({
              damage: scaled,
              health: currentHealth,
              committed: branchState?.committed ?? false,
              tier: branchState?.tier ?? metadata.tier,
              weight: branchState?.weight ?? metadata.weight,
            }),
          );
        }
        break;
      }
      case "damage.commit-health": {
        if (currentDamage === undefined || currentHealth === undefined) {
          throw new TraceReplayError(
            "missing-damage-vector",
            "Trace commits Health before constructing a Damage Vector",
          );
        }
        assertProjection(
          decision.before,
          currentDamage,
          currentHealth,
          `Trace decision ${decision.sequence} before`,
        );
        const damageTotal = sumDamageVector(currentDamage);
        const declaredDamageTotal = requiredNonNegativeNumber(
          operation.parameters,
          "damageTotal",
          "Trace Health commit",
        );
        const declaredHealthBefore = requiredNonNegativeNumber(
          operation.parameters,
          "healthBefore",
          "Trace Health commit",
        );
        const declaredHealthAfter = requiredNonNegativeNumber(
          operation.parameters,
          "healthAfter",
          "Trace Health commit",
        );
        const healthAfter = damageTotal >= currentHealth ? 0 : currentHealth - damageTotal;
        if (
          declaredDamageTotal !== damageTotal ||
          declaredHealthBefore !== currentHealth ||
          declaredHealthAfter !== healthAfter
        ) {
          invalidParameters(`Trace Health commit ${decision.sequence} is inconsistent`);
        }
        assertProjection(
          decision.after,
          currentDamage,
          healthAfter,
          `Trace decision ${decision.sequence} after`,
        );
        if (operationHitId !== undefined) {
          const metadata = requiredHitMetadata(
            operationHit,
            `Trace Health commit ${decision.sequence}`,
          );
          if (hitState === undefined || hitState.committed) {
            invalidParameters(`Trace commits invalid hit ${operationHitId}`);
          }
          hits.set(
            operationHitId,
            Object.freeze({
              damage: currentDamage,
              health: healthAfter,
              healthBefore: hitState.healthBefore,
              committed: true,
              index: metadata.index,
              count: metadata.count,
            }),
          );
          health = healthAfter;
        } else if (operationBranchId === undefined) {
          health = healthAfter;
          committed = true;
        } else {
          const metadata = requiredBranchMetadata(
            operationBranch,
            `Trace Health commit ${decision.sequence}`,
          );
          branches.set(
            operationBranchId,
            Object.freeze({
              damage: currentDamage,
              health: healthAfter,
              committed: true,
              tier: branchState?.tier ?? metadata.tier,
              weight: branchState?.weight ?? metadata.weight,
            }),
          );
        }
        break;
      }
      case "damage-vector.aggregate-weighted-branches": {
        if (initialHealth === undefined) {
          invalidParameters("Trace aggregates branches before establishing initial Health");
        }
        const aggregate = aggregateWeightedBranches(operation.parameters, branches, decision.reads);
        assertProjection(
          decision.before,
          aggregate.damage,
          initialHealth,
          `Trace decision ${decision.sequence} before`,
        );
        assertProjection(
          decision.after,
          aggregate.damage,
          aggregate.health,
          `Trace decision ${decision.sequence} after`,
        );
        damage = aggregate.damage;
        health = aggregate.health;
        committed = true;
        break;
      }
      case "damage-vector.aggregate-sequential-hits":
      case "damage-vector.aggregate-sequential-pellets": {
        if (initialHealth === undefined || expectedHitCount === undefined) {
          invalidParameters("Trace aggregates sequential hits before fixed grouped-hit expansion");
        }
        const aggregate = aggregateSequentialHits(
          operation.parameters,
          hits,
          decision.reads,
          initialHealth,
        );
        if (hits.size !== expectedHitCount) {
          invalidParameters("Trace sequential aggregation does not include every emitted hit");
        }
        assertProjection(
          decision.before,
          aggregate.damage,
          initialHealth,
          `Trace decision ${decision.sequence} before`,
        );
        assertProjection(
          decision.after,
          aggregate.damage,
          aggregate.health,
          `Trace decision ${decision.sequence} after`,
        );
        damage = aggregate.damage;
        health = aggregate.health;
        committed = true;
        break;
      }
      default:
        throw new TraceReplayError(
          "unsupported-operation",
          `Unsupported Trace operation: ${operation.kind}`,
        );
    }
  }

  if (damage === undefined || health === undefined) {
    throw new TraceReplayError(
      "missing-damage-vector",
      "Trace contains no complete applied Damage and Health state",
    );
  }
  if (!committed) {
    invalidParameters("Trace does not reach terminal Health commit or expected aggregation");
  }
  return Object.freeze({ damage, health });
}

/**
 * Reconstructs the final Damage Vector and validates internal Health transitions.
 *
 * Use replayTraceState when the Scenario initial Health is available and must
 * anchor the replayed terminal Health.
 */
export async function replayTraceDamage(input: unknown): Promise<DamageVector> {
  return (await replayTrace(input)).damage;
}
