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

export type FixedMultishotContext = {
  readonly hitCount: number;
  readonly initialHealth: number;
  readonly zeroDamage: DamageVector;
};

export type FixedPelletContext = {
  readonly pelletCount: number;
  readonly initialHealth: number;
  readonly zeroDamage: DamageVector;
};

export type ResolvedRadialFalloffContext = {
  readonly currentDamage: DamageVector;
  readonly multiplier: number;
  readonly health: number;
};

export type ResolvedStatusTickScheduleContext = {
  readonly tickCount: number;
  readonly tickIntervalMs: number;
  readonly initialHealth: number;
  readonly zeroDamage: DamageVector;
};

export type ResolvedStatusTickDamageContext = {
  readonly resolvedHealthDamagePerTick: number;
  readonly health: number;
};

export type ResolvedPunchThroughExpansionContext = {
  readonly targetCount: number;
  readonly initialHealthTotal: number;
  readonly zeroDamage: DamageVector;
};

export type ResolvedPunchThroughTargetHit = {
  readonly id: string;
  readonly targetId: string;
  readonly index: number;
  readonly damage: DamageVector;
  readonly healthBefore: number;
  readonly healthAfter: number;
};

export type ResolvedPunchThroughAggregateContext = {
  readonly initialHealthTotal: number;
  readonly targets: ReadonlyArray<ResolvedPunchThroughTargetHit>;
};

export type ResolvedRicochetExpansionContext = ResolvedPunchThroughExpansionContext;
export type ResolvedRicochetTargetHit = ResolvedPunchThroughTargetHit;
export type ResolvedRicochetAggregateContext = ResolvedPunchThroughAggregateContext;
export type ResolvedChainExpansionContext = ResolvedPunchThroughExpansionContext;
export type ResolvedChainTargetHit = ResolvedPunchThroughTargetHit;
export type ResolvedChainAggregateContext = ResolvedPunchThroughAggregateContext;
export type ResolvedRadialTargetExpansionContext = ResolvedPunchThroughExpansionContext;
export type ResolvedRadialTargetHit = ResolvedPunchThroughTargetHit;
export type ResolvedRadialTargetAggregateContext = {
  readonly initialHealthTotal: number;
  readonly hitCount: number;
  readonly targets: ReadonlyArray<ResolvedRadialTargetHit>;
};

export type SequentialHit = {
  readonly id: string;
  readonly index: number;
  readonly damage: DamageVector;
  readonly healthBefore: number;
  readonly healthAfter: number;
};

export type SequentialHitAggregateContext = {
  readonly initialHealth: number;
  readonly hits: ReadonlyArray<SequentialHit>;
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

type ValidatedFixedMultishotContext = FixedMultishotContext;

type ValidatedFixedPelletContext = FixedPelletContext;

type ValidatedResolvedRadialFalloffContext = ResolvedRadialFalloffContext;

type ValidatedResolvedStatusTickScheduleContext = ResolvedStatusTickScheduleContext;

type ValidatedResolvedStatusTickDamageContext = ResolvedStatusTickDamageContext;

type ValidatedResolvedPunchThroughExpansionContext = ResolvedPunchThroughExpansionContext;

type ValidatedResolvedPunchThroughAggregateContext = ResolvedPunchThroughAggregateContext;

type ValidatedResolvedRadialTargetAggregateContext = ResolvedRadialTargetAggregateContext;

type ValidatedSequentialHitAggregateContext = SequentialHitAggregateContext;

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

function snapshotFixedMultishotContext(
  value: FixedMultishotContext,
): ValidatedFixedMultishotContext {
  const context = snapshotPlainExactObject(
    value,
    ["hitCount", "initialHealth", "zeroDamage"],
    "context",
  );
  const hitCount = dataProperty(context, "hitCount", "context");
  if (!isNonNegativeSafeInteger(hitCount) || hitCount < 1) {
    invalidContext("hitCount must be a positive safe integer", "hitCount");
  }
  const zeroDamage = snapshotDamageVector(
    dataProperty(context, "zeroDamage", "context"),
    "zeroDamage",
  );
  if (sumValidatedDamageVector(zeroDamage) !== 0) {
    invalidContext("zeroDamage components must all be zero", "zeroDamage");
  }
  return Object.freeze({
    hitCount,
    initialHealth: nonNegativeFinite(
      dataProperty(context, "initialHealth", "context"),
      "initialHealth",
    ),
    zeroDamage,
  });
}

function snapshotFixedPelletContext(value: FixedPelletContext): ValidatedFixedPelletContext {
  const context = snapshotPlainExactObject(
    value,
    ["pelletCount", "initialHealth", "zeroDamage"],
    "context",
  );
  const pelletCount = dataProperty(context, "pelletCount", "context");
  if (!isNonNegativeSafeInteger(pelletCount) || pelletCount < 1) {
    invalidContext("pelletCount must be a positive safe integer", "pelletCount");
  }
  const zeroDamage = snapshotDamageVector(
    dataProperty(context, "zeroDamage", "context"),
    "zeroDamage",
  );
  if (sumValidatedDamageVector(zeroDamage) !== 0) {
    invalidContext("zeroDamage components must all be zero", "zeroDamage");
  }
  return Object.freeze({
    pelletCount,
    initialHealth: nonNegativeFinite(
      dataProperty(context, "initialHealth", "context"),
      "initialHealth",
    ),
    zeroDamage,
  });
}

function snapshotResolvedRadialFalloffContext(
  value: ResolvedRadialFalloffContext,
): ValidatedResolvedRadialFalloffContext {
  const context = snapshotPlainExactObject(
    value,
    ["currentDamage", "multiplier", "health"],
    "context",
  );
  const multiplier = nonNegativeFinite(
    dataProperty(context, "multiplier", "context"),
    "multiplier",
  );
  if (multiplier > 1) {
    invalidContext("multiplier must be at most 1", "multiplier");
  }
  return Object.freeze({
    currentDamage: snapshotDamageVector(
      dataProperty(context, "currentDamage", "context"),
      "currentDamage",
    ),
    multiplier,
    health: nonNegativeFinite(dataProperty(context, "health", "context"), "health"),
  });
}

function snapshotResolvedStatusTickScheduleContext(
  value: ResolvedStatusTickScheduleContext,
): ValidatedResolvedStatusTickScheduleContext {
  const context = snapshotPlainExactObject(
    value,
    ["tickCount", "tickIntervalMs", "initialHealth", "zeroDamage"],
    "context",
  );
  const tickCount = dataProperty(context, "tickCount", "context");
  const tickIntervalMs = dataProperty(context, "tickIntervalMs", "context");
  if (!isNonNegativeSafeInteger(tickCount) || tickCount < 1) {
    invalidContext("tickCount must be a positive safe integer", "tickCount");
  }
  if (!isNonNegativeSafeInteger(tickIntervalMs) || tickIntervalMs < 1) {
    invalidContext("tickIntervalMs must be a positive safe integer", "tickIntervalMs");
  }
  const zeroDamage = snapshotDamageVector(
    dataProperty(context, "zeroDamage", "context"),
    "zeroDamage",
  );
  if (sumValidatedDamageVector(zeroDamage) !== 0) {
    invalidContext("zeroDamage components must all be zero", "zeroDamage");
  }
  return Object.freeze({
    tickCount,
    tickIntervalMs,
    initialHealth: nonNegativeFinite(
      dataProperty(context, "initialHealth", "context"),
      "initialHealth",
    ),
    zeroDamage,
  });
}

function snapshotResolvedStatusTickDamageContext(
  value: ResolvedStatusTickDamageContext,
): ValidatedResolvedStatusTickDamageContext {
  const context = snapshotPlainExactObject(
    value,
    ["resolvedHealthDamagePerTick", "health"],
    "context",
  );
  return Object.freeze({
    resolvedHealthDamagePerTick: nonNegativeFinite(
      dataProperty(context, "resolvedHealthDamagePerTick", "context"),
      "resolvedHealthDamagePerTick",
    ),
    health: nonNegativeFinite(dataProperty(context, "health", "context"), "health"),
  });
}

function snapshotResolvedPunchThroughExpansionContext(
  value: ResolvedPunchThroughExpansionContext,
): ValidatedResolvedPunchThroughExpansionContext {
  const context = snapshotPlainExactObject(
    value,
    ["targetCount", "initialHealthTotal", "zeroDamage"],
    "context",
  );
  const targetCount = dataProperty(context, "targetCount", "context");
  if (!isNonNegativeSafeInteger(targetCount) || targetCount < 1) {
    invalidContext("targetCount must be a positive safe integer", "targetCount");
  }
  const zeroDamage = snapshotDamageVector(
    dataProperty(context, "zeroDamage", "context"),
    "zeroDamage",
  );
  if (sumValidatedDamageVector(zeroDamage) !== 0) {
    invalidContext("zeroDamage components must all be zero", "zeroDamage");
  }
  return Object.freeze({
    targetCount,
    initialHealthTotal: nonNegativeFinite(
      dataProperty(context, "initialHealthTotal", "context"),
      "initialHealthTotal",
    ),
    zeroDamage,
  });
}

function snapshotResolvedPunchThroughTargets(
  value: unknown,
): ReadonlyArray<ResolvedPunchThroughTargetHit> {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1
  ) {
    invalidContext("targets must be a plain non-empty array", "targets");
  }
  const targets: ResolvedPunchThroughTargetHit[] = [];
  const ids = new Set<string>();
  const targetIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const subject = `targets[${index}]`;
    const target = snapshotPlainExactObject(
      dataProperty(value, String(index), "targets"),
      ["id", "targetId", "index", "damage", "healthBefore", "healthAfter"],
      subject,
    );
    const id = dataProperty(target, "id", subject);
    const targetId = dataProperty(target, "targetId", subject);
    if (typeof id !== "string" || !isStableId(id) || ids.has(id)) {
      invalidContext(`${subject}.id must be a unique stable ID`, `${subject}.id`);
    }
    if (typeof targetId !== "string" || !isStableId(targetId) || targetIds.has(targetId)) {
      invalidContext(`${subject}.targetId must be a unique stable ID`, `${subject}.targetId`);
    }
    if (dataProperty(target, "index", subject) !== index) {
      invalidContext(`${subject}.index must equal its stable array index`, `${subject}.index`);
    }
    const damage = snapshotDamageVector(
      dataProperty(target, "damage", subject),
      `${subject}.damage`,
    );
    const healthBefore = nonNegativeFinite(
      dataProperty(target, "healthBefore", subject),
      `${subject}.healthBefore`,
    );
    const healthAfter = nonNegativeFinite(
      dataProperty(target, "healthAfter", subject),
      `${subject}.healthAfter`,
    );
    const expectedHealthAfter =
      sumValidatedDamageVector(damage) >= healthBefore
        ? 0
        : healthBefore - sumValidatedDamageVector(damage);
    if (healthAfter !== expectedHealthAfter) {
      invalidContext(`${subject} does not form a valid Health transition`, "targets");
    }
    ids.add(id);
    targetIds.add(targetId);
    targets.push(Object.freeze({ id, targetId, index, damage, healthBefore, healthAfter }));
  }
  return Object.freeze(targets);
}

function snapshotResolvedPunchThroughAggregateContext(
  value: ResolvedPunchThroughAggregateContext,
): ValidatedResolvedPunchThroughAggregateContext {
  const context = snapshotPlainExactObject(value, ["initialHealthTotal", "targets"], "context");
  const initialHealthTotal = nonNegativeFinite(
    dataProperty(context, "initialHealthTotal", "context"),
    "initialHealthTotal",
  );
  const targets = snapshotResolvedPunchThroughTargets(dataProperty(context, "targets", "context"));
  const summedInitialHealth = targets.reduce((total, target) => total + target.healthBefore, 0);
  if (!Number.isFinite(summedInitialHealth) || summedInitialHealth !== initialHealthTotal) {
    invalidContext("initialHealthTotal must equal the target Health sum", "initialHealthTotal");
  }
  return Object.freeze({ initialHealthTotal, targets });
}

function snapshotResolvedRadialTargetAggregateContext(
  value: ResolvedRadialTargetAggregateContext,
): ValidatedResolvedRadialTargetAggregateContext {
  const context = snapshotPlainExactObject(
    value,
    ["initialHealthTotal", "hitCount", "targets"],
    "context",
  );
  const initialHealthTotal = nonNegativeFinite(
    dataProperty(context, "initialHealthTotal", "context"),
    "initialHealthTotal",
  );
  const hitCount = dataProperty(context, "hitCount", "context");
  const targets = snapshotResolvedPunchThroughTargets(dataProperty(context, "targets", "context"));
  if (!isNonNegativeSafeInteger(hitCount) || hitCount > targets.length) {
    invalidContext(
      "hitCount must be a non-negative safe integer no greater than targets.length",
      "hitCount",
    );
  }
  const summedInitialHealth = targets.reduce((total, target) => total + target.healthBefore, 0);
  if (!Number.isFinite(summedInitialHealth) || summedInitialHealth !== initialHealthTotal) {
    invalidContext("initialHealthTotal must equal the target Health sum", "initialHealthTotal");
  }
  return Object.freeze({ initialHealthTotal, hitCount, targets });
}

function snapshotSequentialHits(value: unknown): ReadonlyArray<SequentialHit> {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1
  ) {
    invalidContext("hits must be a plain non-empty array", "hits");
  }

  const hits: SequentialHit[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const subject = `hits[${index}]`;
    const hit = snapshotPlainExactObject(
      dataProperty(value, String(index), "hits"),
      ["id", "index", "damage", "healthBefore", "healthAfter"],
      subject,
    );
    const id = dataProperty(hit, "id", subject);
    if (typeof id !== "string" || !isStableId(id) || ids.has(id)) {
      invalidContext(`${subject}.id must be a unique stable ID`, `${subject}.id`);
    }
    const declaredIndex = dataProperty(hit, "index", subject);
    if (declaredIndex !== index) {
      invalidContext(`${subject}.index must equal its stable array index`, `${subject}.index`);
    }
    const healthBefore = nonNegativeFinite(
      dataProperty(hit, "healthBefore", subject),
      `${subject}.healthBefore`,
    );
    const healthAfter = nonNegativeFinite(
      dataProperty(hit, "healthAfter", subject),
      `${subject}.healthAfter`,
    );
    if (healthAfter > healthBefore) {
      invalidContext(
        `${subject}.healthAfter must not exceed healthBefore`,
        `${subject}.healthAfter`,
      );
    }
    ids.add(id);
    hits.push(
      Object.freeze({
        id,
        index,
        damage: snapshotDamageVector(dataProperty(hit, "damage", subject), `${subject}.damage`),
        healthBefore,
        healthAfter,
      }),
    );
  }
  return Object.freeze(hits);
}

function snapshotSequentialHitAggregateContext(
  value: SequentialHitAggregateContext,
): ValidatedSequentialHitAggregateContext {
  const context = snapshotPlainExactObject(value, ["initialHealth", "hits"], "context");
  const initialHealth = nonNegativeFinite(
    dataProperty(context, "initialHealth", "context"),
    "initialHealth",
  );
  const hits = snapshotSequentialHits(dataProperty(context, "hits", "context"));
  let expectedHealthBefore = initialHealth;
  for (const [index, hit] of hits.entries()) {
    const expectedHealthAfter =
      sumValidatedDamageVector(hit.damage) >= hit.healthBefore
        ? 0
        : hit.healthBefore - sumValidatedDamageVector(hit.damage);
    if (hit.healthBefore !== expectedHealthBefore || hit.healthAfter !== expectedHealthAfter) {
      invalidContext(`hits[${index}] does not form a valid sequential Health transition`, "hits");
    }
    expectedHealthBefore = hit.healthAfter;
  }
  return Object.freeze({ initialHealth, hits });
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

export function executeFixedMultishotRule(
  rule: RuleDefinition,
  context: FixedMultishotContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "event.expand-fixed-multishot") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a fixed Multishot expansion operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }

  const operation = rule.operation as {
    readonly kind: "event.expand-fixed-multishot";
    readonly maximumHits: unknown;
  };
  if (
    typeof operation.maximumHits !== "number" ||
    !Number.isSafeInteger(operation.maximumHits) ||
    operation.maximumHits < 1
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid Multishot limit`, {
      ruleId: rule.id,
    });
  }

  const input = snapshotFixedMultishotContext(context);
  if (input.hitCount > operation.maximumHits) {
    throw new RulesError(
      "execution-limit-exceeded",
      `Fixed Multishot hitCount ${input.hitCount} exceeds limit ${operation.maximumHits}`,
      { hitCount: input.hitCount, maximumHits: operation.maximumHits },
    );
  }
  const projection = stateProjection(input.zeroDamage, input.initialHealth);
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      hitCount: input.hitCount,
      maximumHits: operation.maximumHits,
    }),
    projection,
    projection,
  );
}

export function executeFixedPelletRule(
  rule: RuleDefinition,
  context: FixedPelletContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "event.expand-fixed-pellets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a fixed pellet expansion operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }

  const operation = rule.operation as {
    readonly kind: "event.expand-fixed-pellets";
    readonly maximumPellets: unknown;
  };
  if (
    typeof operation.maximumPellets !== "number" ||
    !Number.isSafeInteger(operation.maximumPellets) ||
    operation.maximumPellets < 1
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid pellet limit`, {
      ruleId: rule.id,
    });
  }

  const input = snapshotFixedPelletContext(context);
  if (input.pelletCount > operation.maximumPellets) {
    throw new RulesError(
      "execution-limit-exceeded",
      `Fixed pelletCount ${input.pelletCount} exceeds limit ${operation.maximumPellets}`,
      { maximumPellets: operation.maximumPellets, pelletCount: input.pelletCount },
    );
  }
  const projection = stateProjection(input.zeroDamage, input.initialHealth);
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      maximumPellets: operation.maximumPellets,
      pelletCount: input.pelletCount,
    }),
    projection,
    projection,
  );
}

export function executeResolvedRadialFalloffRule(
  rule: RuleDefinition,
  context: ResolvedRadialFalloffContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "damage-vector.scale-resolved-radial-falloff") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved Radial falloff operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const input = snapshotResolvedRadialFalloffContext(context);
  const before = stateProjection(input.currentDamage, input.health);
  const afterDamage = scaleValidatedDamageVector(input.currentDamage, input.multiplier);
  return applied(
    rule,
    input.multiplier,
    parameters({ factor: input.multiplier, multiplier: input.multiplier }),
    before,
    stateProjection(afterDamage, input.health),
  );
}

export function executeResolvedStatusTickScheduleRule(
  rule: RuleDefinition,
  context: ResolvedStatusTickScheduleContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "event.expand-resolved-status-ticks") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved Status tick expansion operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const operation = rule.operation as {
    readonly kind: "event.expand-resolved-status-ticks";
    readonly maximumTicks: unknown;
  };
  if (
    typeof operation.maximumTicks !== "number" ||
    !Number.isSafeInteger(operation.maximumTicks) ||
    operation.maximumTicks < 1
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid Status tick limit`, {
      ruleId: rule.id,
    });
  }
  const input = snapshotResolvedStatusTickScheduleContext(context);
  if (input.tickCount > operation.maximumTicks) {
    throw new RulesError(
      "execution-limit-exceeded",
      `Resolved Status tickCount ${input.tickCount} exceeds limit ${operation.maximumTicks}`,
      { maximumTicks: operation.maximumTicks, tickCount: input.tickCount },
    );
  }
  const projection = stateProjection(input.zeroDamage, input.initialHealth);
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      maximumTicks: operation.maximumTicks,
      tickCount: input.tickCount,
      tickIntervalMs: input.tickIntervalMs,
    }),
    projection,
    projection,
  );
}

export function executeResolvedStatusTickDamageRule(
  rule: RuleDefinition,
  context: ResolvedStatusTickDamageContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "damage-vector.copy-resolved-status-tick") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved Status tick Damage operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const input = snapshotResolvedStatusTickDamageContext(context);
  const beforeDamage = Object.freeze({ "damage.synthetic-status": 0 });
  const afterDamage = Object.freeze({
    "damage.synthetic-status": input.resolvedHealthDamagePerTick,
  });
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      "component.damage.synthetic-status": input.resolvedHealthDamagePerTick,
    }),
    stateProjection(beforeDamage, input.health),
    stateProjection(afterDamage, input.health),
  );
}

export function executeResolvedPunchThroughExpansionRule(
  rule: RuleDefinition,
  context: ResolvedPunchThroughExpansionContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "event.expand-resolved-punch-through-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved punch-through expansion operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const operation = rule.operation as {
    readonly kind: "event.expand-resolved-punch-through-targets";
    readonly maximumTargets: unknown;
  };
  if (
    typeof operation.maximumTargets !== "number" ||
    !Number.isSafeInteger(operation.maximumTargets) ||
    operation.maximumTargets < 1
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid target limit`, {
      ruleId: rule.id,
    });
  }
  const input = snapshotResolvedPunchThroughExpansionContext(context);
  if (input.targetCount > operation.maximumTargets) {
    throw new RulesError(
      "execution-limit-exceeded",
      `Resolved punch-through targetCount ${input.targetCount} exceeds limit ${operation.maximumTargets}`,
      { maximumTargets: operation.maximumTargets, targetCount: input.targetCount },
    );
  }
  const projection = stateProjection(input.zeroDamage, input.initialHealthTotal);
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      maximumTargets: operation.maximumTargets,
      targetCount: input.targetCount,
    }),
    projection,
    projection,
  );
}

export function executeResolvedRicochetExpansionRule(
  rule: RuleDefinition,
  context: ResolvedRicochetExpansionContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "event.expand-resolved-ricochet-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved ricochet expansion operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const operation = rule.operation as {
    readonly kind: "event.expand-resolved-ricochet-targets";
    readonly maximumTargets: unknown;
  };
  if (
    typeof operation.maximumTargets !== "number" ||
    !Number.isSafeInteger(operation.maximumTargets) ||
    operation.maximumTargets < 1
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid target limit`, {
      ruleId: rule.id,
    });
  }
  const input = snapshotResolvedPunchThroughExpansionContext(context);
  if (input.targetCount > operation.maximumTargets) {
    throw new RulesError(
      "execution-limit-exceeded",
      `Resolved ricochet targetCount ${input.targetCount} exceeds limit ${operation.maximumTargets}`,
      { maximumTargets: operation.maximumTargets, targetCount: input.targetCount },
    );
  }
  const projection = stateProjection(input.zeroDamage, input.initialHealthTotal);
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      maximumTargets: operation.maximumTargets,
      targetCount: input.targetCount,
    }),
    projection,
    projection,
  );
}

export function executeResolvedChainExpansionRule(
  rule: RuleDefinition,
  context: ResolvedChainExpansionContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "event.expand-resolved-chain-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved chain expansion operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const operation = rule.operation as {
    readonly kind: "event.expand-resolved-chain-targets";
    readonly maximumTargets: unknown;
  };
  if (
    typeof operation.maximumTargets !== "number" ||
    !Number.isSafeInteger(operation.maximumTargets) ||
    operation.maximumTargets < 1
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid target limit`, {
      ruleId: rule.id,
    });
  }
  const input = snapshotResolvedPunchThroughExpansionContext(context);
  if (input.targetCount > operation.maximumTargets) {
    throw new RulesError(
      "execution-limit-exceeded",
      `Resolved chain targetCount ${input.targetCount} exceeds limit ${operation.maximumTargets}`,
      { maximumTargets: operation.maximumTargets, targetCount: input.targetCount },
    );
  }
  const projection = stateProjection(input.zeroDamage, input.initialHealthTotal);
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      maximumTargets: operation.maximumTargets,
      targetCount: input.targetCount,
    }),
    projection,
    projection,
  );
}

export function executeResolvedRadialTargetExpansionRule(
  rule: RuleDefinition,
  context: ResolvedRadialTargetExpansionContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "event.expand-resolved-radial-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved Radial target expansion operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const operation = rule.operation as {
    readonly kind: "event.expand-resolved-radial-targets";
    readonly maximumTargets: unknown;
  };
  if (
    typeof operation.maximumTargets !== "number" ||
    !Number.isSafeInteger(operation.maximumTargets) ||
    operation.maximumTargets < 1
  ) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} has an invalid target limit`, {
      ruleId: rule.id,
    });
  }
  const input = snapshotResolvedPunchThroughExpansionContext(context);
  if (input.targetCount > operation.maximumTargets) {
    throw new RulesError(
      "execution-limit-exceeded",
      `Resolved Radial targetCount ${input.targetCount} exceeds limit ${operation.maximumTargets}`,
      { maximumTargets: operation.maximumTargets, targetCount: input.targetCount },
    );
  }
  const projection = stateProjection(input.zeroDamage, input.initialHealthTotal);
  return applied(
    rule,
    1,
    parameters({
      factor: 1,
      maximumTargets: operation.maximumTargets,
      targetCount: input.targetCount,
    }),
    projection,
    projection,
  );
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

function executeSequentialAggregateRule(
  rule: RuleDefinition,
  context: SequentialHitAggregateContext,
  operationKind:
    | "damage-vector.aggregate-sequential-hits"
    | "damage-vector.aggregate-sequential-pellets"
    | "damage-vector.aggregate-sequential-status-ticks",
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== operationKind) {
    throw new RulesError("invalid-rule", `Rule ${rule.id} is not a ${operationKind} operation`, {
      operationKind: rule.operation.kind,
      ruleId: rule.id,
    });
  }

  const input = snapshotSequentialHitAggregateContext(context);
  const itemPrefix =
    operationKind === "damage-vector.aggregate-sequential-status-ticks" ? "tick" : "hit";
  const expectedDamageKeys = Object.keys(input.hits[0]?.damage ?? {});
  const aggregateDamage: Record<string, number> = Object.fromEntries(
    expectedDamageKeys.map((id) => [id, 0]),
  );
  const values: Record<string, RuleParameterValue> = {
    [`${itemPrefix}Count`]: input.hits.length,
  };

  for (const [index, hit] of input.hits.entries()) {
    const damageKeys = Object.keys(hit.damage);
    if (
      damageKeys.length !== expectedDamageKeys.length ||
      damageKeys.some((id, keyIndex) => id !== expectedDamageKeys[keyIndex])
    ) {
      invalidContext("All sequential hits must contain the same Damage Vector keys", "hits");
    }
    values[`${itemPrefix}.${index}.id`] = hit.id;
    values[`${itemPrefix}.${index}.index`] = hit.index;
    values[`${itemPrefix}.${index}.damageTotal`] = sumValidatedDamageVector(hit.damage);
    values[`${itemPrefix}.${index}.healthBefore`] = hit.healthBefore;
    values[`${itemPrefix}.${index}.healthAfter`] = hit.healthAfter;
    for (const id of expectedDamageKeys) {
      const aggregateComponent = (aggregateDamage[id] ?? 0) + (hit.damage[id] ?? 0);
      if (!Number.isFinite(aggregateComponent) || aggregateComponent < 0) {
        throw new RulesError(
          "arithmetic-invalid",
          `Sequential hit aggregate overflowed damage component ${id}`,
          { hitId: hit.id, id },
        );
      }
      aggregateDamage[id] = aggregateComponent;
      values[`${itemPrefix}.${index}.damage.${id}`] = hit.damage[id] ?? 0;
    }
  }

  const damage = Object.freeze(aggregateDamage);
  const finalHealth = input.hits.at(-1)?.healthAfter;
  if (finalHealth === undefined) {
    invalidContext("Sequential hit aggregation requires at least one hit", "hits");
  }
  return applied(
    rule,
    1,
    parameters(values),
    stateProjection(damage, input.initialHealth),
    stateProjection(damage, finalHealth),
  );
}

export function executeSequentialHitAggregateRule(
  rule: RuleDefinition,
  context: SequentialHitAggregateContext,
): RuleExecution {
  return executeSequentialAggregateRule(rule, context, "damage-vector.aggregate-sequential-hits");
}

export function executeSequentialPelletAggregateRule(
  rule: RuleDefinition,
  context: SequentialHitAggregateContext,
): RuleExecution {
  return executeSequentialAggregateRule(
    rule,
    context,
    "damage-vector.aggregate-sequential-pellets",
  );
}

export function executeSequentialStatusTickAggregateRule(
  rule: RuleDefinition,
  context: SequentialHitAggregateContext,
): RuleExecution {
  return executeSequentialAggregateRule(
    rule,
    context,
    "damage-vector.aggregate-sequential-status-ticks",
  );
}

export function executeResolvedPunchThroughAggregateRule(
  rule: RuleDefinition,
  context: ResolvedPunchThroughAggregateContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "damage-vector.aggregate-resolved-punch-through-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved punch-through aggregate operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const input = snapshotResolvedPunchThroughAggregateContext(context);
  const expectedDamageKeys = Object.keys(input.targets[0]?.damage ?? {});
  const aggregateDamage: Record<string, number> = Object.fromEntries(
    expectedDamageKeys.map((id) => [id, 0]),
  );
  const values: Record<string, RuleParameterValue> = {
    targetCount: input.targets.length,
  };
  let remainingHealthTotal = 0;
  for (const [index, target] of input.targets.entries()) {
    const damageKeys = Object.keys(target.damage);
    if (
      damageKeys.length !== expectedDamageKeys.length ||
      damageKeys.some((id, keyIndex) => id !== expectedDamageKeys[keyIndex])
    ) {
      invalidContext(
        "All punch-through targets must contain the same Damage Vector keys",
        "targets",
      );
    }
    values[`target.${index}.id`] = target.targetId;
    values[`target.${index}.event-id`] = target.id;
    values[`target.${index}.index`] = target.index;
    values[`target.${index}.damageTotal`] = sumValidatedDamageVector(target.damage);
    values[`target.${index}.healthBefore`] = target.healthBefore;
    values[`target.${index}.healthAfter`] = target.healthAfter;
    remainingHealthTotal += target.healthAfter;
    if (!Number.isFinite(remainingHealthTotal)) {
      throw new RulesError("arithmetic-invalid", "Target Health sum overflowed finite arithmetic");
    }
    for (const id of expectedDamageKeys) {
      const component = (aggregateDamage[id] ?? 0) + (target.damage[id] ?? 0);
      if (!Number.isFinite(component) || component < 0) {
        throw new RulesError(
          "arithmetic-invalid",
          `Punch-through aggregate overflowed damage component ${id}`,
          { id, targetId: target.targetId },
        );
      }
      aggregateDamage[id] = component;
      values[`target.${index}.damage.${id}`] = target.damage[id] ?? 0;
    }
  }
  const damage = Object.freeze(aggregateDamage);
  return applied(
    rule,
    1,
    parameters(values),
    stateProjection(damage, input.initialHealthTotal),
    stateProjection(damage, remainingHealthTotal),
  );
}

export function executeResolvedRicochetAggregateRule(
  rule: RuleDefinition,
  context: ResolvedRicochetAggregateContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "damage-vector.aggregate-resolved-ricochet-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved ricochet aggregate operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const input = snapshotResolvedPunchThroughAggregateContext(context);
  const expectedDamageKeys = Object.keys(input.targets[0]?.damage ?? {});
  const aggregateDamage: Record<string, number> = Object.fromEntries(
    expectedDamageKeys.map((id) => [id, 0]),
  );
  const values: Record<string, RuleParameterValue> = {
    targetCount: input.targets.length,
  };
  let remainingHealthTotal = 0;
  for (const [index, target] of input.targets.entries()) {
    const damageKeys = Object.keys(target.damage);
    if (
      damageKeys.length !== expectedDamageKeys.length ||
      damageKeys.some((id, keyIndex) => id !== expectedDamageKeys[keyIndex])
    ) {
      invalidContext("All ricochet targets must contain the same Damage Vector keys", "targets");
    }
    values[`target.${index}.id`] = target.targetId;
    values[`target.${index}.event-id`] = target.id;
    values[`target.${index}.index`] = target.index;
    values[`target.${index}.damageTotal`] = sumValidatedDamageVector(target.damage);
    values[`target.${index}.healthBefore`] = target.healthBefore;
    values[`target.${index}.healthAfter`] = target.healthAfter;
    remainingHealthTotal += target.healthAfter;
    if (!Number.isFinite(remainingHealthTotal)) {
      throw new RulesError("arithmetic-invalid", "Target Health sum overflowed finite arithmetic");
    }
    for (const id of expectedDamageKeys) {
      const component = (aggregateDamage[id] ?? 0) + (target.damage[id] ?? 0);
      if (!Number.isFinite(component) || component < 0) {
        throw new RulesError(
          "arithmetic-invalid",
          `Ricochet aggregate overflowed damage component ${id}`,
          { id, targetId: target.targetId },
        );
      }
      aggregateDamage[id] = component;
      values[`target.${index}.damage.${id}`] = target.damage[id] ?? 0;
    }
  }
  const damage = Object.freeze(aggregateDamage);
  return applied(
    rule,
    1,
    parameters(values),
    stateProjection(damage, input.initialHealthTotal),
    stateProjection(damage, remainingHealthTotal),
  );
}

export function executeResolvedChainAggregateRule(
  rule: RuleDefinition,
  context: ResolvedChainAggregateContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "damage-vector.aggregate-resolved-chain-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved chain aggregate operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const input = snapshotResolvedPunchThroughAggregateContext(context);
  const expectedDamageKeys = Object.keys(input.targets[0]?.damage ?? {});
  const aggregateDamage: Record<string, number> = Object.fromEntries(
    expectedDamageKeys.map((id) => [id, 0]),
  );
  const values: Record<string, RuleParameterValue> = {
    targetCount: input.targets.length,
  };
  let remainingHealthTotal = 0;
  for (const [index, target] of input.targets.entries()) {
    const damageKeys = Object.keys(target.damage);
    if (
      damageKeys.length !== expectedDamageKeys.length ||
      damageKeys.some((id, keyIndex) => id !== expectedDamageKeys[keyIndex])
    ) {
      invalidContext("All chain targets must contain the same Damage Vector keys", "targets");
    }
    values[`target.${index}.id`] = target.targetId;
    values[`target.${index}.event-id`] = target.id;
    values[`target.${index}.index`] = target.index;
    values[`target.${index}.damageTotal`] = sumValidatedDamageVector(target.damage);
    values[`target.${index}.healthBefore`] = target.healthBefore;
    values[`target.${index}.healthAfter`] = target.healthAfter;
    remainingHealthTotal += target.healthAfter;
    if (!Number.isFinite(remainingHealthTotal)) {
      throw new RulesError("arithmetic-invalid", "Target Health sum overflowed finite arithmetic");
    }
    for (const id of expectedDamageKeys) {
      const component = (aggregateDamage[id] ?? 0) + (target.damage[id] ?? 0);
      if (!Number.isFinite(component) || component < 0) {
        throw new RulesError(
          "arithmetic-invalid",
          `Chain aggregate overflowed damage component ${id}`,
          { id, targetId: target.targetId },
        );
      }
      aggregateDamage[id] = component;
      values[`target.${index}.damage.${id}`] = target.damage[id] ?? 0;
    }
  }
  const damage = Object.freeze(aggregateDamage);
  return applied(
    rule,
    1,
    parameters(values),
    stateProjection(damage, input.initialHealthTotal),
    stateProjection(damage, remainingHealthTotal),
  );
}

export function executeResolvedRadialTargetAggregateRule(
  rule: RuleDefinition,
  context: ResolvedRadialTargetAggregateContext,
): RuleExecution {
  assertExecutableRule(rule);
  if (rule.operation.kind !== "damage-vector.aggregate-resolved-radial-targets") {
    throw new RulesError(
      "invalid-rule",
      `Rule ${rule.id} is not a resolved Radial target aggregate operation`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  const input = snapshotResolvedRadialTargetAggregateContext(context);
  const expectedDamageKeys = Object.keys(input.targets[0]?.damage ?? {});
  const aggregateDamage: Record<string, number> = Object.fromEntries(
    expectedDamageKeys.map((id) => [id, 0]),
  );
  const values: Record<string, RuleParameterValue> = {
    inspectedTargetCount: input.targets.length,
    targetCount: input.hitCount,
  };
  let remainingHealthTotal = 0;
  for (const [index, target] of input.targets.entries()) {
    const damageKeys = Object.keys(target.damage);
    if (
      damageKeys.length !== expectedDamageKeys.length ||
      damageKeys.some((id, keyIndex) => id !== expectedDamageKeys[keyIndex])
    ) {
      invalidContext(
        "All resolved Radial targets must contain the same Damage Vector keys",
        "targets",
      );
    }
    values[`target.${index}.id`] = target.targetId;
    values[`target.${index}.event-id`] = target.id;
    values[`target.${index}.index`] = target.index;
    values[`target.${index}.damageTotal`] = sumValidatedDamageVector(target.damage);
    values[`target.${index}.healthBefore`] = target.healthBefore;
    values[`target.${index}.healthAfter`] = target.healthAfter;
    remainingHealthTotal += target.healthAfter;
    if (!Number.isFinite(remainingHealthTotal)) {
      throw new RulesError("arithmetic-invalid", "Target Health sum overflowed finite arithmetic");
    }
    for (const id of expectedDamageKeys) {
      const component = (aggregateDamage[id] ?? 0) + (target.damage[id] ?? 0);
      if (!Number.isFinite(component) || component < 0) {
        throw new RulesError(
          "arithmetic-invalid",
          `Resolved Radial aggregate overflowed damage component ${id}`,
          { id, targetId: target.targetId },
        );
      }
      aggregateDamage[id] = component;
      values[`target.${index}.damage.${id}`] = target.damage[id] ?? 0;
    }
  }
  const damage = Object.freeze(aggregateDamage);
  return applied(
    rule,
    1,
    parameters(values),
    stateProjection(damage, input.initialHealthTotal),
    stateProjection(damage, remainingHealthTotal),
  );
}
