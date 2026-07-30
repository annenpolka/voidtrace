import { isStableId, type Ruleset } from "@voidtrace/contracts";
import { RulesError } from "./errors.ts";

export type RuleDefinition = Ruleset["rules"][number];
export type RulePhase = RuleDefinition["phase"];
export type RuleOperationKind = RuleDefinition["operation"]["kind"];

export type DamageVector = Readonly<Record<string, number>>;

export type RuleParameterValue = number | string;

export type RuleContext = {
  readonly baseDamage: DamageVector;
  readonly currentDamage: DamageVector;
  readonly criticalTier: number | null;
  readonly criticalChance: number;
  readonly criticalRoll: number | null;
  readonly criticalMultiplier: number;
  readonly armor: number;
  readonly health: number;
};

export type ExpectedBranch = {
  readonly id: string;
  readonly tier: number;
  readonly weight: number;
  readonly damage: DamageVector;
  readonly health: number;
};

export type ExpectedAggregateContext = {
  readonly initialHealth: number;
  readonly branches: ReadonlyArray<ExpectedBranch>;
};

export type RuleStateProjection = {
  readonly damage: DamageVector;
  readonly damageTotal: number;
  readonly health: number;
};

type RuleExecutionBase = {
  readonly ruleId: string;
  readonly phase: RulePhase;
  readonly operationKind: RuleOperationKind;
  readonly parameters: Readonly<Record<string, RuleParameterValue>>;
  readonly before: RuleStateProjection;
  readonly after: RuleStateProjection;
  readonly resolvedCriticalTier?: number;
};

export type AppliedRuleExecution = RuleExecutionBase & {
  readonly outcome: "applied";
  readonly matched: true;
  readonly factor: number;
};

export type PredicateRejectedRuleExecution = RuleExecutionBase & {
  readonly outcome: "predicate-rejected";
  readonly matched: false;
  readonly factor: null;
};

export type RuleExecution = AppliedRuleExecution | PredicateRejectedRuleExecution;

type ValidatedRuleContext = {
  readonly baseDamage: DamageVector;
  readonly currentDamage: DamageVector;
  readonly criticalTier: number | null;
  readonly criticalChance: number;
  readonly criticalRoll: number | null;
  readonly criticalMultiplier: number;
  readonly armor: number;
  readonly health: number;
};

type ValidatedExpectedAggregateContext = {
  readonly initialHealth: number;
  readonly branches: ReadonlyArray<ExpectedBranch>;
};

const CONTEXT_FIELDS = [
  "baseDamage",
  "currentDamage",
  "criticalTier",
  "criticalChance",
  "criticalRoll",
  "criticalMultiplier",
  "armor",
  "health",
] as const;

function invalidContext(message: string, field: string): never {
  throw new RulesError("invalid-context", message, { field });
}

function dataProperty(value: object, key: string, subject: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
    invalidContext(`${subject}.${key} must be an own enumerable data property`, key);
  }
  return descriptor.value;
}

function snapshotDamageVector(value: unknown, field: string): DamageVector {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RulesError(
      "invalid-damage-vector",
      `${field} must be a plain non-empty DamageVector`,
      { field },
    );
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new RulesError(
      "invalid-damage-vector",
      `${field} must not carry a behavior-bearing prototype`,
      { field },
    );
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length === 0) {
    throw new RulesError("invalid-damage-vector", `${field} must not be empty`, { field });
  }
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new RulesError("invalid-damage-vector", `${field} contains a non-string key`, { field });
  }

  const snapshot: Record<string, number> = {};
  for (const key of (ownKeys as string[]).toSorted()) {
    if (!isStableId(key)) {
      throw new RulesError(
        "invalid-damage-vector",
        `${field} contains an invalid damage-type ID: ${key}`,
        { field, key },
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new RulesError(
        "invalid-damage-vector",
        `${field}.${key} must be an own enumerable data property`,
        { field, key },
      );
    }
    const component = descriptor.value;
    if (typeof component !== "number" || !Number.isFinite(component) || component < 0) {
      throw new RulesError(
        "invalid-damage-vector",
        `${field}.${key} must be a non-negative finite number`,
        { field, key },
      );
    }
    snapshot[key] = component;
  }
  return Object.freeze(snapshot);
}

function nonNegativeFinite(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    invalidContext(`${field} must be a non-negative finite number`, field);
  }
  return value;
}

function nullableFinite(value: unknown, field: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalidContext(`${field} must be a finite number or null`, field);
  }
  return value;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function snapshotPlainExactObject(
  value: unknown,
  fields: readonly string[],
  subject: string,
): object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalidContext(`${subject} must be a plain object`, subject);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    invalidContext(`${subject} must not carry a behavior-bearing prototype`, subject);
  }
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set(fields);
  if (
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key)) ||
    ownKeys.length !== fields.length
  ) {
    invalidContext(`${subject} must contain exactly the declared fields`, subject);
  }
  return value;
}

function snapshotContext(value: RuleContext): ValidatedRuleContext {
  const context = snapshotPlainExactObject(value, CONTEXT_FIELDS, "context");

  const criticalTier = dataProperty(context, "criticalTier", "context");
  if (criticalTier !== null && !isNonNegativeSafeInteger(criticalTier)) {
    invalidContext("criticalTier must be a non-negative safe integer or null", "criticalTier");
  }
  const criticalChance = nonNegativeFinite(
    dataProperty(context, "criticalChance", "context"),
    "criticalChance",
  );
  const criticalRoll = nullableFinite(
    dataProperty(context, "criticalRoll", "context"),
    "criticalRoll",
  );
  const criticalMultiplier = nonNegativeFinite(
    dataProperty(context, "criticalMultiplier", "context"),
    "criticalMultiplier",
  );
  if (criticalMultiplier < 1) {
    invalidContext("criticalMultiplier must be at least 1", "criticalMultiplier");
  }

  return Object.freeze({
    baseDamage: snapshotDamageVector(dataProperty(context, "baseDamage", "context"), "baseDamage"),
    currentDamage: snapshotDamageVector(
      dataProperty(context, "currentDamage", "context"),
      "currentDamage",
    ),
    criticalTier,
    criticalChance,
    criticalRoll,
    criticalMultiplier,
    armor: nonNegativeFinite(dataProperty(context, "armor", "context"), "armor"),
    health: nonNegativeFinite(dataProperty(context, "health", "context"), "health"),
  });
}

function snapshotExpectedBranches(value: unknown): ReadonlyArray<ExpectedBranch> {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1
  ) {
    invalidContext("branches must be a plain non-empty array", "branches");
  }

  const branches: ExpectedBranch[] = [];
  const ids = new Set<string>();
  const tiers = new Set<number>();
  for (let index = 0; index < value.length; index += 1) {
    const branchValue = dataProperty(value, String(index), "branches");
    const subject = `branches[${index}]`;
    const branch = snapshotPlainExactObject(
      branchValue,
      ["id", "tier", "weight", "damage", "health"],
      subject,
    );
    const id = dataProperty(branch, "id", subject);
    if (typeof id !== "string" || !isStableId(id) || ids.has(id)) {
      invalidContext(`${subject}.id must be a unique stable ID`, `${subject}.id`);
    }
    const tier = dataProperty(branch, "tier", subject);
    if (!isNonNegativeSafeInteger(tier) || tiers.has(tier)) {
      invalidContext(
        `${subject}.tier must be a unique non-negative safe integer`,
        `${subject}.tier`,
      );
    }
    const weight = dataProperty(branch, "weight", subject);
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
      invalidContext(`${subject}.weight must be a positive finite number`, `${subject}.weight`);
    }

    ids.add(id);
    tiers.add(tier);
    branches.push(
      Object.freeze({
        id,
        tier,
        weight,
        damage: snapshotDamageVector(dataProperty(branch, "damage", subject), `${subject}.damage`),
        health: nonNegativeFinite(dataProperty(branch, "health", subject), `${subject}.health`),
      }),
    );
  }
  return Object.freeze(branches);
}

function snapshotExpectedAggregateContext(
  value: ExpectedAggregateContext,
): ValidatedExpectedAggregateContext {
  const context = snapshotPlainExactObject(value, ["initialHealth", "branches"], "context");
  return Object.freeze({
    initialHealth: nonNegativeFinite(
      dataProperty(context, "initialHealth", "context"),
      "initialHealth",
    ),
    branches: snapshotExpectedBranches(dataProperty(context, "branches", "context")),
  });
}

function sumValidatedDamageVector(damage: DamageVector): number {
  let total = 0;
  for (const component of Object.values(damage)) {
    total += component;
    if (!Number.isFinite(total)) {
      throw new RulesError(
        "arithmetic-invalid",
        "Damage Vector total overflowed finite arithmetic",
      );
    }
  }
  return total;
}

export function sumDamageVector(damage: DamageVector): number {
  return sumValidatedDamageVector(snapshotDamageVector(damage, "damage"));
}

function scaleValidatedDamageVector(damage: DamageVector, factor: number): DamageVector {
  if (!Number.isFinite(factor) || factor < 0) {
    throw new RulesError("arithmetic-invalid", "Damage Vector scale factor must be finite", {
      factor: String(factor),
    });
  }
  const scaled: Record<string, number> = {};
  for (const [id, component] of Object.entries(damage)) {
    const value = component * factor;
    if (!Number.isFinite(value) || value < 0) {
      throw new RulesError(
        "arithmetic-invalid",
        `Damage component ${id} overflowed finite arithmetic`,
        { factor, id },
      );
    }
    scaled[id] = value;
  }
  return Object.freeze(scaled);
}

export function scaleDamageVector(damage: DamageVector, factor: number): DamageVector {
  const snapshot = snapshotDamageVector(damage, "damage");
  return scaleValidatedDamageVector(snapshot, factor);
}

function stateProjection(damage: DamageVector, health: number): RuleStateProjection {
  return Object.freeze({
    damage,
    damageTotal: sumValidatedDamageVector(damage),
    health,
  });
}

function parameters(
  values: Record<string, RuleParameterValue> = {},
): Readonly<Record<string, RuleParameterValue>> {
  return Object.freeze(values);
}

function applied(
  rule: RuleDefinition,
  factor: number,
  values: Readonly<Record<string, RuleParameterValue>>,
  before: RuleStateProjection,
  after: RuleStateProjection,
  resolvedCriticalTier?: number,
): AppliedRuleExecution {
  return Object.freeze({
    outcome: "applied",
    matched: true,
    ruleId: rule.id,
    phase: rule.phase,
    operationKind: rule.operation.kind,
    factor,
    parameters: values,
    before,
    after,
    ...(resolvedCriticalTier === undefined ? {} : { resolvedCriticalTier }),
  });
}

function assertExecutableRule(rule: RuleDefinition): void {
  if (typeof rule !== "object" || rule === null || !isStableId(rule.id)) {
    throw new RulesError("invalid-rule", "Rule execution requires a generated Rule definition");
  }
  if (rule.evidenceStatus === "unsupported") {
    throw new RulesError("unsupported-rule", `Rule is explicitly unsupported: ${rule.id}`, {
      ruleId: rule.id,
    });
  }
  if (
    typeof rule.operation !== "object" ||
    rule.operation === null ||
    typeof rule.operation.kind !== "string"
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has no finite operation declaration`, {
      ruleId: rule.id,
    });
  }
}

type CriticalDistribution = {
  readonly baseTier: number;
  readonly nextTier: number;
  readonly fraction: number;
  readonly baseTierProbability: number;
  readonly nextTierProbability: number;
  readonly tier0Probability: number;
  readonly tier1Probability: number;
};

function resolveCriticalDistribution(criticalChance: number): CriticalDistribution {
  const baseTier = Math.floor(criticalChance);
  const fraction = criticalChance - baseTier;
  const nextTier = fraction === 0 ? baseTier : baseTier + 1;
  if (!isNonNegativeSafeInteger(baseTier) || !isNonNegativeSafeInteger(nextTier)) {
    invalidContext(
      "criticalChance must resolve only to non-negative safe-integer tiers",
      "criticalChance",
    );
  }
  const baseTierProbability = 1 - fraction;
  const nextTierProbability = fraction;
  return Object.freeze({
    baseTier,
    nextTier,
    fraction,
    baseTierProbability,
    nextTierProbability,
    tier0Probability:
      (baseTier === 0 ? baseTierProbability : 0) + (nextTier === 0 ? nextTierProbability : 0),
    tier1Probability:
      (baseTier === 1 ? baseTierProbability : 0) + (nextTier === 1 ? nextTierProbability : 0),
  });
}

export function executeRule(rule: RuleDefinition, context: RuleContext): RuleExecution {
  assertExecutableRule(rule);
  const input = snapshotContext(context);
  const before = stateProjection(input.currentDamage, input.health);
  const operation = rule.operation as {
    readonly kind: string;
    readonly constant?: unknown;
  };

  switch (operation.kind) {
    case "damage-vector.copy": {
      const after = stateProjection(input.baseDamage, input.health);
      return applied(rule, 1, parameters({ factor: 1 }), before, after);
    }
    case "critical-tier.resolve-tier-roll": {
      if (input.criticalRoll === null || input.criticalRoll < 0 || input.criticalRoll >= 1) {
        invalidContext(
          "criticalRoll must be in the half-open interval [0, 1) for Critical tier resolution",
          "criticalRoll",
        );
      }

      const {
        baseTier,
        nextTier,
        fraction,
        baseTierProbability,
        nextTierProbability,
        tier0Probability,
        tier1Probability,
      } = resolveCriticalDistribution(input.criticalChance);
      const resolvedTier = input.criticalRoll < fraction ? nextTier : baseTier;
      return applied(
        rule,
        1,
        parameters({
          criticalChance: input.criticalChance,
          criticalRoll: input.criticalRoll,
          baseTier,
          nextTier,
          fraction,
          baseTierProbability,
          nextTierProbability,
          tier0Probability,
          tier1Probability,
          resolvedTier,
          factor: 1,
        }),
        before,
        before,
        resolvedTier,
      );
    }
    case "critical-tier.resolve-expected-branches": {
      const distribution = resolveCriticalDistribution(input.criticalChance);
      return applied(
        rule,
        1,
        parameters({
          criticalChance: input.criticalChance,
          ...distribution,
          factor: 1,
        }),
        before,
        before,
      );
    }
    case "damage-vector.scale-critical-tier": {
      if (input.criticalTier === null) {
        invalidContext(
          "criticalTier must be resolved before Critical tier scaling",
          "criticalTier",
        );
      }
      const factor = 1 + input.criticalTier * (input.criticalMultiplier - 1);
      if (!Number.isFinite(factor) || factor < 1) {
        throw new RulesError(
          "unsupported-critical-multiplier",
          `Critical tier multiplier is not finitely representable for tier ${input.criticalTier} and criticalMultiplier ${input.criticalMultiplier}`,
          {
            criticalMultiplier: input.criticalMultiplier,
            criticalTier: input.criticalTier,
          },
        );
      }
      const afterDamage = scaleValidatedDamageVector(input.currentDamage, factor);
      return applied(
        rule,
        factor,
        parameters({
          actualTier: input.criticalTier,
          criticalMultiplier: input.criticalMultiplier,
          factor,
        }),
        before,
        stateProjection(afterDamage, input.health),
      );
    }
    case "damage-vector.scale-standard-armor": {
      const constant = operation.constant;
      if (typeof constant !== "number" || !Number.isFinite(constant) || constant <= 0) {
        throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid Armor constant`, {
          ruleId: rule.id,
        });
      }
      const denominator = input.armor + constant;
      if (!Number.isFinite(denominator) || denominator <= 0) {
        throw new RulesError(
          "arithmetic-invalid",
          "Standard Armor denominator overflowed finite arithmetic",
          { armor: input.armor, constant },
        );
      }
      const factor = constant / denominator;
      const afterDamage = scaleValidatedDamageVector(input.currentDamage, factor);
      return applied(
        rule,
        factor,
        parameters({ armor: input.armor, constant, factor }),
        before,
        stateProjection(afterDamage, input.health),
      );
    }
    case "damage.commit-health": {
      const damageTotal = before.damageTotal;
      const healthAfter = damageTotal >= input.health ? 0 : input.health - damageTotal;
      return applied(
        rule,
        1,
        parameters({
          damageTotal,
          healthAfter,
          healthBefore: input.health,
        }),
        before,
        stateProjection(input.currentDamage, healthAfter),
      );
    }
    default:
      throw new RulesError(
        "unknown-operation",
        `Unknown Rule operation: ${String(operation.kind)}`,
        { ruleId: rule.id },
      );
  }
}

export function executeExpectedAggregateRule(
  rule: RuleDefinition,
  context: ExpectedAggregateContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "damage-vector.aggregate-weighted-branches") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a weighted-branch aggregate operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }

  const input = snapshotExpectedAggregateContext(context);
  const expectedDamageKeys = Object.keys(input.branches[0]?.damage ?? {});
  const aggregateDamage = Object.fromEntries(expectedDamageKeys.map((id) => [id, 0]));
  const values: Record<string, RuleParameterValue> = {
    branchCount: input.branches.length,
  };
  let weightTotal = 0;
  let expectedHealth = 0;

  for (const [index, branch] of input.branches.entries()) {
    const damageKeys = Object.keys(branch.damage);
    if (
      damageKeys.length !== expectedDamageKeys.length ||
      damageKeys.some((id, keyIndex) => id !== expectedDamageKeys[keyIndex])
    ) {
      invalidContext("All expected branches must contain the same Damage Vector keys", "branches");
    }

    weightTotal += branch.weight;
    if (!Number.isFinite(weightTotal)) {
      invalidContext("Expected branch weights overflowed finite arithmetic", "branches");
    }
    const weightedHealth = branch.health * branch.weight;
    if (!Number.isFinite(weightedHealth)) {
      throw new RulesError(
        "arithmetic-invalid",
        `Expected branch ${branch.id} Health overflowed weighted arithmetic`,
        { branchId: branch.id },
      );
    }
    expectedHealth += weightedHealth;
    if (!Number.isFinite(expectedHealth)) {
      throw new RulesError("arithmetic-invalid", "Expected Health overflowed finite arithmetic");
    }

    for (const id of expectedDamageKeys) {
      const weightedComponent = (branch.damage[id] ?? 0) * branch.weight;
      const aggregateComponent = (aggregateDamage[id] ?? 0) + weightedComponent;
      if (!Number.isFinite(weightedComponent) || !Number.isFinite(aggregateComponent)) {
        throw new RulesError(
          "arithmetic-invalid",
          `Expected damage component ${id} overflowed weighted arithmetic`,
          { branchId: branch.id, id },
        );
      }
      aggregateDamage[id] = aggregateComponent;
    }

    values[`branch.${index}.id`] = branch.id;
    values[`branch.${index}.tier`] = branch.tier;
    values[`branch.${index}.weight`] = branch.weight;
    values[`branch.${index}.damageTotal`] = sumValidatedDamageVector(branch.damage);
    values[`branch.${index}.health`] = branch.health;
    for (const id of expectedDamageKeys) {
      values[`branch.${index}.damage.${id}`] = branch.damage[id] ?? 0;
    }
  }

  const weightTolerance = Number.EPSILON * Math.max(1, input.branches.length);
  if (Math.abs(weightTotal - 1) > weightTolerance) {
    invalidContext("Expected branch weights must sum to 1", "branches");
  }
  values.weightTotal = weightTotal;
  values.expectedHealth = expectedHealth;

  const damage = Object.freeze(aggregateDamage);
  return applied(
    rule,
    1,
    parameters(values),
    stateProjection(damage, input.initialHealth),
    stateProjection(damage, expectedHealth),
  );
}
