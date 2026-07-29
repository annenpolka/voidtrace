import { isStableId, type Ruleset } from "@voidtrace/contracts";
import { RulesError } from "./errors.ts";

export type RuleDefinition = Ruleset["rules"][number];
export type RulePhase = RuleDefinition["phase"];
export type RuleOperationKind = RuleDefinition["operation"]["kind"];

export type DamageVector = Readonly<Record<string, number>>;

export type RuleContext = {
  readonly baseDamage: DamageVector;
  readonly currentDamage: DamageVector;
  readonly criticalTier: 0 | 1 | null;
  readonly criticalChance: number;
  readonly criticalRoll: number | null;
  readonly criticalMultiplier: number;
  readonly armor: number;
  readonly health: number;
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
  readonly parameters: Readonly<Record<string, number>>;
  readonly before: RuleStateProjection;
  readonly after: RuleStateProjection;
  readonly resolvedCriticalTier?: 0 | 1;
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
  readonly criticalTier: 0 | 1 | null;
  readonly criticalChance: number;
  readonly criticalRoll: number | null;
  readonly criticalMultiplier: number;
  readonly armor: number;
  readonly health: number;
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

function snapshotContext(value: RuleContext): ValidatedRuleContext {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalidContext("Rule context must be a plain object", "context");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    invalidContext("Rule context must not carry a behavior-bearing prototype", "context");
  }
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set<string>(CONTEXT_FIELDS);
  if (
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key)) ||
    ownKeys.length !== CONTEXT_FIELDS.length
  ) {
    invalidContext("Rule context must contain exactly the declared context fields", "context");
  }

  const criticalTier = dataProperty(value, "criticalTier", "context");
  if (criticalTier !== null && criticalTier !== 0 && criticalTier !== 1) {
    invalidContext("criticalTier must be the integer tier 0 or 1, or null", "criticalTier");
  }
  const criticalChance = nonNegativeFinite(
    dataProperty(value, "criticalChance", "context"),
    "criticalChance",
  );
  const criticalRoll = nullableFinite(
    dataProperty(value, "criticalRoll", "context"),
    "criticalRoll",
  );
  const criticalMultiplier = nonNegativeFinite(
    dataProperty(value, "criticalMultiplier", "context"),
    "criticalMultiplier",
  );
  if (criticalMultiplier < 1) {
    invalidContext("criticalMultiplier must be at least 1", "criticalMultiplier");
  }

  return Object.freeze({
    baseDamage: snapshotDamageVector(dataProperty(value, "baseDamage", "context"), "baseDamage"),
    currentDamage: snapshotDamageVector(
      dataProperty(value, "currentDamage", "context"),
      "currentDamage",
    ),
    criticalTier,
    criticalChance,
    criticalRoll,
    criticalMultiplier,
    armor: nonNegativeFinite(dataProperty(value, "armor", "context"), "armor"),
    health: nonNegativeFinite(dataProperty(value, "health", "context"), "health"),
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

function parameters(values: Record<string, number> = {}): Readonly<Record<string, number>> {
  return Object.freeze(values);
}

function applied(
  rule: RuleDefinition,
  factor: number,
  values: Readonly<Record<string, number>>,
  before: RuleStateProjection,
  after: RuleStateProjection,
  resolvedCriticalTier?: 0 | 1,
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

function predicateRejected(
  rule: RuleDefinition,
  values: Readonly<Record<string, number>>,
  state: RuleStateProjection,
): PredicateRejectedRuleExecution {
  return Object.freeze({
    outcome: "predicate-rejected",
    matched: false,
    ruleId: rule.id,
    phase: rule.phase,
    operationKind: rule.operation.kind,
    factor: null,
    parameters: values,
    before: state,
    after: state,
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

export function executeRule(rule: RuleDefinition, context: RuleContext): RuleExecution {
  assertExecutableRule(rule);
  const input = snapshotContext(context);
  const before = stateProjection(input.currentDamage, input.health);
  const operation = rule.operation as {
    readonly kind: string;
    readonly requiredTier?: unknown;
    readonly constant?: unknown;
  };

  switch (operation.kind) {
    case "damage-vector.copy": {
      const after = stateProjection(input.baseDamage, input.health);
      return applied(rule, 1, parameters({ factor: 1 }), before, after);
    }
    case "critical-tier.resolve-binary-roll": {
      if (input.criticalChance > 1) {
        invalidContext(
          "criticalChance must not exceed 1 for binary Critical resolution",
          "criticalChance",
        );
      }
      if (input.criticalRoll === null || input.criticalRoll < 0 || input.criticalRoll >= 1) {
        invalidContext(
          "criticalRoll must be in the half-open interval [0, 1) for binary Critical resolution",
          "criticalRoll",
        );
      }

      const tier0Probability = 1 - input.criticalChance;
      const tier1Probability = input.criticalChance;
      const resolvedTier = input.criticalRoll < input.criticalChance ? 1 : 0;
      return applied(
        rule,
        1,
        parameters({
          criticalChance: input.criticalChance,
          criticalRoll: input.criticalRoll,
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
    case "damage-vector.scale-fixed-critical": {
      const requiredTier = operation.requiredTier;
      if (requiredTier !== 0 && requiredTier !== 1) {
        throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid fixed Critical tier`, {
          ruleId: rule.id,
        });
      }
      if (input.criticalTier === null) {
        invalidContext(
          "criticalTier must be resolved before fixed Critical scaling",
          "criticalTier",
        );
      }
      const predicateParameters = parameters({
        actualTier: input.criticalTier,
        requiredTier,
      });
      if (input.criticalTier !== requiredTier) {
        return predicateRejected(rule, predicateParameters, before);
      }
      const factor = requiredTier === 0 ? 1 : input.criticalMultiplier;
      const afterDamage = scaleValidatedDamageVector(input.currentDamage, factor);
      return applied(
        rule,
        factor,
        parameters({
          actualTier: input.criticalTier,
          criticalMultiplier: input.criticalMultiplier,
          factor,
          requiredTier,
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
