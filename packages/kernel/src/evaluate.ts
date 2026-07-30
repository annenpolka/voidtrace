import {
  type Catalog,
  CatalogError,
  loadCatalogSnapshot,
  type ResolvedCatalogReferences,
} from "@voidtrace/catalog";
import {
  type ArtifactRef,
  artifactMatchesRef,
  attachArtifactContentHash,
  attachResultHash,
  canonicalizeJson,
  type Result,
  type Trace,
  validateContract,
  verifyResultTraceIntegrity,
} from "@voidtrace/contracts";
import {
  type DamageVector,
  type ExpectedBranch,
  type LoadedRuleset,
  loadRuleset,
  type RuleDefinition,
  type RuleExecution,
  RulesError,
  type ResolvedPunchThroughTargetHit,
  type SequentialHit,
  sumDamageVector,
} from "@voidtrace/rules";
import { EventQueue, type KernelEvent } from "./event-queue.ts";
import {
  parseScenarioDomain,
  type ScenarioDomain,
  type ScenarioDomainError,
} from "./scenario-domain.ts";
import { replayTraceState, replayTraceTargetStates, TraceReplayError } from "./trace-replay.ts";
import { createWorldState, replaceEntityState, type WorldState } from "./world-state.ts";

export const KERNEL_ENGINE_VERSION = "0.11.0";
export const DEFAULT_PRODUCT_VERSION = "0.0.0";

export type EvaluationErrorCode =
  | "scenario-invalid"
  | "catalog-load-failed"
  | "ruleset-load-failed"
  | "catalog-reference-mismatch"
  | "ruleset-reference-mismatch"
  | "catalog-resolution-failed"
  | "unsupported-delivery"
  | "unsupported-critical-chance"
  | "unsupported-critical-multiplier"
  | "rule-execution-failed"
  | "artifact-construction-failed"
  | "integrity-check-failed";

export type EvaluationError = {
  readonly code: EvaluationErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly mechanicId?: string;
  readonly causeCode?: string;
};

export type EvaluationRequest = {
  readonly scenario: unknown;
  readonly catalog: unknown;
  readonly ruleset?: unknown;
  readonly productVersion?: string;
};

export type EvaluationSuccess = {
  readonly ok: true;
  readonly result: Result;
  readonly trace: Trace;
};

export type EvaluationFailure = {
  readonly ok: false;
  readonly error: EvaluationError;
};

export type EvaluationOutcome = EvaluationSuccess | EvaluationFailure;

type PhasePayload = {
  readonly phase: RuleDefinition["phase"];
};

type ScalarRecord = Readonly<Record<string, string | number | boolean | null>>;

const FIXED_CRITICAL_PHASES = [
  "damage.construct",
  "critical.resolve",
  "target.mitigate",
  "damage.commit",
] as const satisfies ReadonlyArray<RuleDefinition["phase"]>;
const FIXED_RADIAL_PHASES = [
  "damage.construct",
  "critical.resolve",
  "damage.radial-falloff",
  "target.mitigate",
  "damage.commit",
] as const satisfies ReadonlyArray<RuleDefinition["phase"]>;
const ROLLED_CRITICAL_PHASES = [
  "damage.construct",
  "critical.roll",
  "critical.resolve",
  "target.mitigate",
  "damage.commit",
] as const satisfies ReadonlyArray<RuleDefinition["phase"]>;
const EXPECTED_RESOLUTION_PHASES = ["critical.expected"] as const satisfies ReadonlyArray<
  RuleDefinition["phase"]
>;
const EXPECTED_AGGREGATION_PHASES = ["result.aggregate"] as const satisfies ReadonlyArray<
  RuleDefinition["phase"]
>;
const FIXED_MULTISHOT_EMISSION_PHASES = ["attack.emit"] as const satisfies ReadonlyArray<
  RuleDefinition["phase"]
>;
const FIXED_MULTISHOT_AGGREGATION_PHASES = ["result.aggregate"] as const satisfies ReadonlyArray<
  RuleDefinition["phase"]
>;
const RESOLVED_STATUS_TICK_PHASES = [
  "status.tick",
  "damage.commit",
] as const satisfies ReadonlyArray<RuleDefinition["phase"]>;

type BranchTraceMetadata = {
  readonly id: string;
  readonly tier: number;
  readonly weight: number;
};

type HitTraceMetadata = {
  readonly id: string;
  readonly index: number;
  readonly count: number;
};

type TickTraceMetadata = {
  readonly id: string;
  readonly index: number;
  readonly count: number;
  readonly timeMs: number;
};

type PathTargetTraceMetadata = {
  readonly pathId: string;
  readonly targetId: string;
  readonly index: number;
  readonly count: number;
};

function failure(
  code: EvaluationErrorCode,
  message: string,
  details: {
    readonly path?: string;
    readonly mechanicId?: string;
    readonly causeCode?: string;
  } = {},
): EvaluationFailure {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code,
      message,
      ...(details.path === undefined ? {} : { path: details.path }),
      ...(details.mechanicId === undefined ? {} : { mechanicId: details.mechanicId }),
      ...(details.causeCode === undefined ? {} : { causeCode: details.causeCode }),
    }),
  });
}

function scenarioFailure(error: ScenarioDomainError): EvaluationFailure {
  return failure("scenario-invalid", error.message, {
    path: error.path,
    ...(error.mechanicId === undefined ? {} : { mechanicId: error.mechanicId }),
    causeCode: error.code,
  });
}

function suppliedSnapshot(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, "snapshot");
  return descriptor?.enumerable && Object.hasOwn(descriptor, "value") ? descriptor.value : value;
}

function attackModeFieldPath(
  catalog: Catalog,
  references: ResolvedCatalogReferences,
  field: "criticalChance" | "criticalMultiplier",
): string | undefined {
  const weaponIndex = catalog.snapshot.weapons.findIndex(
    (weapon) => weapon.id === references.weapon.id,
  );
  if (weaponIndex < 0) {
    return undefined;
  }
  const attackModeIndex = catalog.snapshot.weapons[weaponIndex]?.attackModes.findIndex(
    (attackMode) => attackMode.id === references.attackMode.id,
  );
  if (attackModeIndex === undefined || attackModeIndex < 0) {
    return undefined;
  }
  return `/weapons/${weaponIndex}/attackModes/${attackModeIndex}/${field}`;
}

function criticalChanceHasRepresentableTiers(criticalChance: number): boolean {
  const baseTier = Math.floor(criticalChance);
  const fraction = criticalChance - baseTier;
  const nextTier = fraction === 0 ? baseTier : baseTier + 1;
  return (
    Number.isSafeInteger(baseTier) &&
    baseTier >= 0 &&
    Number.isSafeInteger(nextTier) &&
    nextTier >= 0
  );
}

function artifactRef<TKind extends string>(artifact: {
  readonly kind: TKind;
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly gameBuild: string;
}): ArtifactRef & { readonly kind: TKind } {
  return Object.freeze({
    kind: artifact.kind,
    schemaVersion: artifact.schemaVersion,
    id: artifact.id,
    revision: artifact.revision,
    contentHash: artifact.contentHash,
    gameBuild: artifact.gameBuild,
  });
}

function zeroVector(baseDamage: DamageVector): DamageVector {
  return Object.freeze(
    Object.fromEntries(Object.keys(baseDamage).map((damageTypeId) => [damageTypeId, 0])),
  );
}

function traceState(damage: DamageVector, health: number): Readonly<Record<string, number>> {
  const projection: Record<string, number> = {
    "damage.total": sumDamageVector(damage),
    "target.health": health,
  };
  for (const [damageTypeId, value] of Object.entries(damage).toSorted(([left], [right]) =>
    left.localeCompare(right),
  )) {
    projection[`damage.type.${damageTypeId}`] = value;
  }
  return Object.freeze(projection);
}

function ruleReads(
  rule: RuleDefinition,
  execution: RuleExecution,
  references: ResolvedCatalogReferences,
  criticalTier: number | null,
  criticalRoll: number | null,
  armor: number,
  overrides: ScalarRecord = {},
): ScalarRecord {
  const values: ScalarRecord = {
    "attack.base-damage": sumDamageVector(references.attackMode.baseDamage),
    "attack.critical-chance": references.attackMode.criticalChance,
    "event.damage": execution.before.damageTotal,
    "attack.critical-multiplier": references.attackMode.criticalMultiplier,
    "target.armor": armor,
    "target.health": execution.before.health,
    ...(criticalTier === null ? {} : { "event.critical-tier": criticalTier }),
    ...(criticalRoll === null ? {} : { "event.critical-roll": criticalRoll }),
    ...overrides,
  };
  const reads: Record<string, string | number | boolean | null> = {};
  for (const readId of rule.reads) {
    if (!Object.hasOwn(values, readId)) {
      throw new TypeError(`Evaluator cannot project declared Rule read ${readId}`);
    }
    reads[readId] = values[readId] as string | number | boolean | null;
  }
  return Object.freeze(reads);
}

function operationParameters(
  execution: RuleExecution,
  branch?: BranchTraceMetadata,
  hit?: HitTraceMetadata,
  tick?: TickTraceMetadata,
  pathTarget?: PathTargetTraceMetadata,
): ScalarRecord {
  const values: Record<string, string | number | boolean | null> = {
    ...execution.parameters,
    ...(branch === undefined
      ? {}
      : {
          "branch.id": branch.id,
          "branch.tier": branch.tier,
          "branch.weight": branch.weight,
        }),
    ...(hit === undefined
      ? {}
      : {
          "hit.id": hit.id,
          "hit.index": hit.index,
          "hit.count": hit.count,
        }),
    ...(tick === undefined
      ? {}
      : {
          "tick.id": tick.id,
          "tick.index": tick.index,
          "tick.count": tick.count,
          "tick.time-ms": tick.timeMs,
        }),
    ...(pathTarget === undefined
      ? {}
      : {
          "path.id": pathTarget.pathId,
          "target.id": pathTarget.targetId,
          "path.index": pathTarget.index,
          "path.count": pathTarget.count,
        }),
  };
  if (execution.operationKind === "damage-vector.copy") {
    for (const [damageTypeId, value] of Object.entries(execution.after.damage)) {
      values[`component.${damageTypeId}`] = value;
    }
  }
  return Object.freeze(values);
}

function decisionForExecution(
  sequence: number,
  event: KernelEvent<PhasePayload>,
  rule: RuleDefinition,
  execution: RuleExecution,
  references: ResolvedCatalogReferences,
  criticalTier: number | null,
  criticalRoll: number | null,
  armor: number,
  options: {
    readonly branch?: BranchTraceMetadata;
    readonly hit?: HitTraceMetadata;
    readonly tick?: TickTraceMetadata;
    readonly pathTarget?: PathTargetTraceMetadata;
    readonly readOverrides?: ScalarRecord;
  } = {},
): Trace["decisions"][number] {
  const common = {
    sequence,
    eventId: event.id,
    ...(event.parentEventId === undefined ? {} : { parentEventId: event.parentEventId }),
    eventTimeMs: event.timeMs,
    phase: rule.phase,
    ruleId: rule.id,
    reads: ruleReads(
      rule,
      execution,
      references,
      criticalTier,
      criticalRoll,
      armor,
      options.readOverrides,
    ),
    evidenceStatus: rule.evidenceStatus,
    evidenceIds: rule.evidenceIds,
  } as const;

  if (execution.outcome === "predicate-rejected") {
    return Object.freeze({
      ...common,
      outcome: "rejected",
      rejectionStage: "predicate",
      rejectionReason: Object.freeze({
        code: "predicate.rule-mismatch",
        message: `Rule ${rule.id} predicate did not match the event`,
      }),
      matched: false,
    });
  }

  return Object.freeze({
    ...common,
    outcome: "applied",
    matched: true,
    operations: Object.freeze([
      Object.freeze({
        kind: execution.operationKind,
        parameters: operationParameters(
          execution,
          options.branch,
          options.hit,
          options.tick,
          options.pathTarget,
        ),
      }),
    ]),
    before: traceState(execution.before.damage, execution.before.health),
    after: traceState(execution.after.damage, execution.after.health),
  });
}

function createPhaseEvents(options: {
  readonly actionId: string;
  readonly namespace?: string;
  readonly logicalId?: string;
  readonly parentEventId?: string;
  readonly kind?: string;
  readonly timeMs?: number;
  readonly phases: ReadonlyArray<RuleDefinition["phase"]>;
}): EventQueue<PhasePayload> {
  const queue = new EventQueue<PhasePayload>();
  let parentEventId = options.parentEventId;
  const namespace = options.namespace ?? options.actionId;
  for (const [sequence, phase] of options.phases.entries()) {
    const id = `event.${namespace}.${phase}`;
    queue.enqueue({
      id,
      logicalId: options.logicalId ?? options.actionId,
      ...(parentEventId === undefined ? {} : { parentEventId }),
      timeMs: options.timeMs ?? 0,
      sequence,
      kind: options.kind ?? "damage.direct",
      payload: Object.freeze({ phase }),
    });
    parentEventId = id;
  }
  return queue;
}

function readHealth(world: WorldState, targetId: string): number {
  const value = world.entities[targetId]?.values.health;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`World target ${targetId} has invalid Health state`);
  }
  return value;
}

function updateMetricValues(
  metricValues: Record<string, number>,
  execution: RuleExecution,
  criticalTier: number | null,
  eventKind = "damage.direct",
): void {
  if (execution.outcome !== "applied") {
    return;
  }
  switch (execution.operationKind) {
    case "event.expand-fixed-multishot":
    case "event.expand-fixed-pellets":
    case "event.expand-resolved-status-ticks":
    case "event.expand-resolved-punch-through-targets":
    case "event.expand-resolved-ricochet-targets":
    case "event.expand-resolved-chain-targets":
    case "damage-vector.aggregate-sequential-hits":
    case "damage-vector.aggregate-sequential-pellets":
    case "damage-vector.aggregate-sequential-status-ticks":
    case "damage-vector.aggregate-resolved-punch-through-targets":
    case "damage-vector.aggregate-resolved-ricochet-targets":
    case "damage-vector.aggregate-resolved-chain-targets":
      return;
    case "damage-vector.copy":
      metricValues[
        eventKind === "damage.radial" ? "damage.radial.base.total" : "damage.direct-hit.total"
      ] = execution.after.damageTotal;
      return;
    case "critical-tier.resolve-tier-roll": {
      if (execution.resolvedCriticalTier === undefined) {
        throw new TypeError("Critical roll resolver did not produce a tier");
      }
      const {
        criticalRoll,
        baseTier,
        nextTier,
        fraction,
        baseTierProbability,
        nextTierProbability,
        tier0Probability,
        tier1Probability,
      } = execution.parameters;
      if (
        typeof criticalRoll !== "number" ||
        typeof baseTier !== "number" ||
        typeof nextTier !== "number" ||
        typeof fraction !== "number" ||
        typeof baseTierProbability !== "number" ||
        typeof nextTierProbability !== "number" ||
        typeof tier0Probability !== "number" ||
        typeof tier1Probability !== "number"
      ) {
        throw new TypeError("Critical roll resolver omitted probability metrics");
      }
      metricValues["critical.roll"] = criticalRoll;
      metricValues["critical.base-tier"] = baseTier;
      metricValues["critical.next-tier"] = nextTier;
      metricValues["critical.fraction"] = fraction;
      metricValues["critical.base-tier.probability"] = baseTierProbability;
      metricValues["critical.next-tier.probability"] = nextTierProbability;
      metricValues["critical.tier-0.probability"] = tier0Probability;
      metricValues["critical.tier-1.probability"] = tier1Probability;
      metricValues["critical.tier"] = execution.resolvedCriticalTier;
      return;
    }
    case "critical-tier.resolve-expected-branches": {
      const {
        baseTier,
        nextTier,
        fraction,
        baseTierProbability,
        nextTierProbability,
        tier0Probability,
        tier1Probability,
      } = execution.parameters;
      if (
        typeof baseTier !== "number" ||
        typeof nextTier !== "number" ||
        typeof fraction !== "number" ||
        typeof baseTierProbability !== "number" ||
        typeof nextTierProbability !== "number" ||
        typeof tier0Probability !== "number" ||
        typeof tier1Probability !== "number"
      ) {
        throw new TypeError("Expected Critical resolver omitted probability metrics");
      }
      metricValues["critical.base-tier"] = baseTier;
      metricValues["critical.next-tier"] = nextTier;
      metricValues["critical.fraction"] = fraction;
      metricValues["critical.base-tier.probability"] = baseTierProbability;
      metricValues["critical.next-tier.probability"] = nextTierProbability;
      metricValues["critical.tier-0.probability"] = tier0Probability;
      metricValues["critical.tier-1.probability"] = tier1Probability;
      return;
    }
    case "damage-vector.scale-critical-tier":
      if (criticalTier === null) {
        throw new TypeError("Fixed Critical rule executed before tier resolution");
      }
      metricValues["critical.tier"] = criticalTier;
      metricValues["critical.multiplier"] = execution.factor;
      metricValues["damage.post-critical.total"] = execution.after.damageTotal;
      return;
    case "damage-vector.scale-standard-armor":
      metricValues["armor.remaining-multiplier"] = execution.factor;
      return;
    case "damage-vector.scale-resolved-radial-falloff":
      metricValues["radial.falloff.multiplier"] = execution.factor;
      metricValues["damage.radial.total"] = execution.after.damageTotal;
      return;
    case "damage-vector.copy-resolved-status-tick":
      metricValues["damage.status.per-tick"] = execution.after.damageTotal;
      return;
    case "damage.commit-health":
      metricValues["damage.health.total"] = execution.before.damageTotal;
      metricValues["target.health.remaining"] = execution.after.health;
      return;
    case "damage-vector.aggregate-weighted-branches":
      return;
  }
}

function projectRequestedMetrics(
  requested: readonly string[],
  metricValues: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const projected: Record<string, number> = {};
  for (const metricId of requested) {
    const value = metricValues[metricId];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`Evaluator did not produce requested metric ${metricId}`);
    }
    projected[metricId] = value;
  }
  return Object.freeze(projected);
}

function mechanicForRule(rule: RuleDefinition): string {
  switch (rule.operation.kind) {
    case "event.expand-fixed-multishot":
    case "damage-vector.aggregate-sequential-hits":
      return "mechanic.multishot.fixed-count";
    case "event.expand-fixed-pellets":
    case "damage-vector.aggregate-sequential-pellets":
      return "mechanic.pellet.fixed-count";
    case "event.expand-resolved-status-ticks":
    case "damage-vector.copy-resolved-status-tick":
    case "damage-vector.aggregate-sequential-status-ticks":
      return "mechanic.status.resolved-ticks";
    case "event.expand-resolved-punch-through-targets":
    case "damage-vector.aggregate-resolved-punch-through-targets":
      return "mechanic.punch-through.resolved-path";
    case "event.expand-resolved-ricochet-targets":
    case "damage-vector.aggregate-resolved-ricochet-targets":
      return "mechanic.ricochet.resolved-path";
    case "event.expand-resolved-chain-targets":
    case "damage-vector.aggregate-resolved-chain-targets":
      return "mechanic.chain.resolved-path";
    case "damage-vector.scale-resolved-radial-falloff":
      return "mechanic.damage.radial-falloff";
    case "damage-vector.copy":
      return rule.eventKind === "damage.radial"
        ? "mechanic.damage.radial"
        : "mechanic.damage.direct-hit";
    case "critical-tier.resolve-tier-roll":
      return "mechanic.critical.probability";
    case "critical-tier.resolve-expected-branches":
    case "damage-vector.aggregate-weighted-branches":
      return "mechanic.critical.expected-value";
    case "damage-vector.scale-critical-tier":
      return "mechanic.critical.tier-multiplier";
    case "damage-vector.scale-standard-armor":
      return "mechanic.defense.standard-armor";
    case "damage.commit-health":
      return "mechanic.damage.health-commit";
    default:
      throw new TypeError("Ruleset contains an operation outside the finite Kernel vocabulary");
  }
}

function coverageForRules(rules: readonly RuleDefinition[]): Result["coverage"] {
  const probabilityResolved = rules.some(
    (rule) =>
      rule.operation.kind === "critical-tier.resolve-tier-roll" ||
      rule.operation.kind === "critical-tier.resolve-expected-branches",
  );
  const groups: Record<RuleDefinition["evidenceStatus"], Set<string>> = {
    verified: new Set(),
    experimental: new Set(),
    disputed: new Set(),
    unsupported: new Set(probabilityResolved ? [] : ["mechanic.critical.probability"]),
    approximated: new Set(),
  };
  for (const rule of rules) {
    groups[rule.evidenceStatus].add(mechanicForRule(rule));
  }
  const sorted = (values: Set<string>): readonly string[] => Object.freeze([...values].toSorted());
  return Object.freeze({
    verified: sorted(groups.verified),
    experimental: sorted(groups.experimental),
    disputed: sorted(groups.disputed),
    unsupported: sorted(groups.unsupported),
    approximated: sorted(groups.approximated),
  });
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function validateBuiltArtifact<TContract extends "result" | "trace">(
  contract: TContract,
  value: unknown,
):
  | {
      readonly ok: true;
      readonly value: TContract extends "result" ? Result : Trace;
    }
  | EvaluationFailure {
  const validated = validateContract(contract, value);
  if (!validated.ok) {
    const issue = validated.issues[0];
    return failure(
      "artifact-construction-failed",
      `Generated ${contract} failed its contract at ${issue?.instancePath || "/"}: ${issue?.message ?? "unknown validation error"}`,
      {
        path: issue?.instancePath || "/",
      },
    );
  }
  return {
    ok: true,
    value: deepFreeze(validated.value) as unknown as TContract extends "result" ? Result : Trace,
  };
}

type RuntimeEvaluation = {
  readonly appliedRules: readonly RuleDefinition[];
  readonly decisions: readonly Trace["decisions"][number][];
  readonly metricValues: Readonly<Record<string, number>>;
  readonly damage: DamageVector;
  readonly targetHealthById?: Readonly<Record<string, number>>;
};

function ruleContext(
  references: ResolvedCatalogReferences,
  damage: DamageVector,
  criticalTier: number | null,
  criticalRoll: number | null,
  armor: number,
  health: number,
) {
  return {
    baseDamage: references.attackMode.baseDamage,
    currentDamage: damage,
    criticalTier,
    criticalChance: references.attackMode.criticalChance,
    criticalRoll,
    criticalMultiplier: references.attackMode.criticalMultiplier,
    armor,
    health,
  } as const;
}

function evaluateDeterministicRuntime(
  domain: ScenarioDomain,
  references: ResolvedCatalogReferences,
  ruleset: LoadedRuleset,
): RuntimeEvaluation {
  if (domain.action.criticalResolution === "expected") {
    throw new TypeError("Expected Critical resolution reached deterministic evaluation");
  }
  const appliedRules: RuleDefinition[] = [];
  const decisions: Trace["decisions"][number][] = [];
  const metricValues: Record<string, number> = {};
  let damage = zeroVector(references.attackMode.baseDamage);
  let world = createWorldState([
    {
      id: domain.target.id,
      values: Object.freeze({ health: domain.target.resolvedHealth }),
    },
  ]);
  let criticalTier = domain.action.criticalTier;
  let decisionSequence = 0;
  const phases =
    domain.action.criticalResolution === "fixed" ? FIXED_CRITICAL_PHASES : ROLLED_CRITICAL_PHASES;

  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    phases,
  }).drain()) {
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const execution = ruleset.executeRule(
        rule.id,
        ruleContext(
          references,
          damage,
          criticalTier,
          domain.action.criticalRoll,
          domain.target.resolvedArmor,
          readHealth(world, domain.target.id),
        ),
      );
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          criticalTier,
          domain.action.criticalRoll,
          domain.target.resolvedArmor,
        ),
      );
      decisionSequence += 1;
      updateMetricValues(metricValues, execution, criticalTier);
      if (execution.resolvedCriticalTier !== undefined) {
        criticalTier = execution.resolvedCriticalTier;
      }
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        damage = execution.after.damage;
        world = replaceEntityState(world, domain.target.id, {
          health: execution.after.health,
        });
      }
    }
  }

  return Object.freeze({
    appliedRules: Object.freeze(appliedRules),
    decisions: Object.freeze(decisions),
    metricValues: Object.freeze(metricValues),
    damage,
  });
}

function evaluateFixedHitGroupRuntime(
  domain: ScenarioDomain,
  references: ResolvedCatalogReferences,
  ruleset: LoadedRuleset,
): RuntimeEvaluation {
  if (
    (domain.action.kind !== "fixed-multishot" && domain.action.kind !== "fixed-pellets") ||
    domain.action.criticalResolution !== "fixed" ||
    domain.action.criticalTier === null
  ) {
    throw new TypeError("Non-fixed grouped-hit input reached fixed grouped-hit evaluation");
  }
  const isMultishot = domain.action.kind === "fixed-multishot";
  const eventKind = isMultishot ? "action.multishot-direct-hit" : "action.pellet-direct-hit";
  const countRead = isMultishot ? "action.multishot-hit-count" : "action.pellet-count";
  const expansionKind = isMultishot ? "event.expand-fixed-multishot" : "event.expand-fixed-pellets";
  const expansionCountParameter = isMultishot ? "hitCount" : "pelletCount";
  const aggregateKind = isMultishot
    ? "damage-vector.aggregate-sequential-hits"
    : "damage-vector.aggregate-sequential-pellets";
  const hitPrefix = isMultishot ? "hit.multishot" : "pellet.shot";

  const appliedRules: RuleDefinition[] = [];
  const decisions: Trace["decisions"][number][] = [];
  const metricValues: Record<string, number> = {};
  const zeroDamage = zeroVector(references.attackMode.baseDamage);
  let world = createWorldState([
    {
      id: domain.target.id,
      values: Object.freeze({ health: domain.target.resolvedHealth }),
    },
  ]);
  let decisionSequence = 0;
  let expansionExecution: RuleExecution | undefined;
  let expansionEventId: string | undefined;

  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    kind: eventKind,
    phases: FIXED_MULTISHOT_EMISSION_PHASES,
  }).drain()) {
    expansionEventId = event.id;
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const execution = isMultishot
        ? ruleset.executeFixedMultishotRule(rule.id, {
            hitCount: domain.action.hitCount,
            initialHealth: domain.target.resolvedHealth,
            zeroDamage,
          })
        : ruleset.executeFixedPelletRule(rule.id, {
            pelletCount: domain.action.hitCount,
            initialHealth: domain.target.resolvedHealth,
            zeroDamage,
          });
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          domain.action.criticalTier,
          null,
          domain.target.resolvedArmor,
          {
            readOverrides: {
              [countRead]: domain.action.hitCount,
            },
          },
        ),
      );
      decisionSequence += 1;
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        expansionExecution = execution;
      }
    }
  }
  if (
    expansionExecution === undefined ||
    expansionExecution.operationKind !== expansionKind ||
    expansionEventId === undefined ||
    requiredNumber(expansionExecution.parameters, expansionCountParameter) !==
      domain.action.hitCount
  ) {
    throw new TypeError("Ruleset did not apply fixed grouped-hit expansion");
  }

  const hits: SequentialHit[] = [];
  for (let index = 0; index < domain.action.hitCount; index += 1) {
    const hit: HitTraceMetadata = Object.freeze({
      id: `${hitPrefix}-${index}`,
      index,
      count: domain.action.hitCount,
    });
    const healthBefore = readHealth(world, domain.target.id);
    let hitDamage = zeroVector(references.attackMode.baseDamage);

    for (const event of createPhaseEvents({
      actionId: domain.action.id,
      namespace: `${domain.action.id}.${hit.id}`,
      logicalId: `${domain.action.id}.${hit.id}`,
      parentEventId: expansionEventId,
      phases: FIXED_CRITICAL_PHASES,
    }).drain()) {
      for (const rule of ruleset.snapshot.rules) {
        if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
          continue;
        }
        const execution = ruleset.executeRule(
          rule.id,
          ruleContext(
            references,
            hitDamage,
            domain.action.criticalTier,
            null,
            domain.target.resolvedArmor,
            readHealth(world, domain.target.id),
          ),
        );
        decisions.push(
          decisionForExecution(
            decisionSequence,
            event,
            rule,
            execution,
            references,
            domain.action.criticalTier,
            null,
            domain.target.resolvedArmor,
            { hit },
          ),
        );
        decisionSequence += 1;
        updateMetricValues(metricValues, execution, domain.action.criticalTier);
        if (execution.outcome === "applied") {
          appliedRules.push(rule);
          hitDamage = execution.after.damage;
          world = replaceEntityState(world, domain.target.id, {
            health: execution.after.health,
          });
        }
      }
    }

    hits.push(
      Object.freeze({
        id: hit.id,
        index,
        damage: hitDamage,
        healthBefore,
        healthAfter: readHealth(world, domain.target.id),
      }),
    );
  }

  let aggregateExecution: RuleExecution | undefined;
  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    kind: eventKind,
    parentEventId: expansionEventId,
    phases: FIXED_MULTISHOT_AGGREGATION_PHASES,
  }).drain()) {
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const execution = isMultishot
        ? ruleset.executeSequentialHitAggregateRule(rule.id, {
            initialHealth: domain.target.resolvedHealth,
            hits,
          })
        : ruleset.executeSequentialPelletAggregateRule(rule.id, {
            initialHealth: domain.target.resolvedHealth,
            hits,
          });
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          domain.action.criticalTier,
          null,
          domain.target.resolvedArmor,
          {
            readOverrides: {
              "hit.damage": canonicalizeJson(
                hits.map((hit) => ({ id: hit.id, index: hit.index, damage: { ...hit.damage } })),
              ),
              "hit.health-before": canonicalizeJson(
                hits.map((hit) => ({
                  id: hit.id,
                  index: hit.index,
                  healthBefore: hit.healthBefore,
                })),
              ),
              "hit.health-after": canonicalizeJson(
                hits.map((hit) => ({
                  id: hit.id,
                  index: hit.index,
                  healthAfter: hit.healthAfter,
                })),
              ),
            },
          },
        ),
      );
      decisionSequence += 1;
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        aggregateExecution = execution;
      }
    }
  }
  if (aggregateExecution === undefined || aggregateExecution.operationKind !== aggregateKind) {
    throw new TypeError("Ruleset did not apply fixed grouped-hit aggregation");
  }

  metricValues[isMultishot ? "multishot.hit-count" : "pellet.count"] = domain.action.hitCount;
  metricValues[isMultishot ? "damage.multishot.total" : "damage.pellet.total"] =
    aggregateExecution.after.damageTotal;
  metricValues["damage.health.total"] = aggregateExecution.after.damageTotal;
  metricValues["target.health.remaining"] = aggregateExecution.after.health;

  return Object.freeze({
    appliedRules: Object.freeze(appliedRules),
    decisions: Object.freeze(decisions),
    metricValues: Object.freeze(metricValues),
    damage: aggregateExecution.after.damage,
  });
}

function evaluateResolvedTargetPathRuntime(
  domain: ScenarioDomain,
  references: ResolvedCatalogReferences,
  ruleset: LoadedRuleset,
): RuntimeEvaluation {
  if (
    (domain.action.kind !== "resolved-punch-through" &&
      domain.action.kind !== "resolved-ricochet" &&
      domain.action.kind !== "resolved-chain") ||
    domain.action.criticalResolution !== "fixed" ||
    domain.action.criticalTier === null ||
    domain.action.targetPathRelationId === null
  ) {
    throw new TypeError("Invalid input reached resolved target-path evaluation");
  }
  const isPunchThrough = domain.action.kind === "resolved-punch-through";
  const isRicochet = domain.action.kind === "resolved-ricochet";
  const pathLabel = isPunchThrough ? "punch-through" : isRicochet ? "ricochet" : "chain";
  const actionEventKind = isPunchThrough
    ? "action.resolved-punch-through-direct-hits"
    : isRicochet
      ? "action.resolved-ricochet-direct-hits"
      : "action.resolved-chain-direct-hits";
  const expansionOperationKind = isPunchThrough
    ? "event.expand-resolved-punch-through-targets"
    : isRicochet
      ? "event.expand-resolved-ricochet-targets"
      : "event.expand-resolved-chain-targets";
  const aggregateOperationKind = isPunchThrough
    ? "damage-vector.aggregate-resolved-punch-through-targets"
    : isRicochet
      ? "damage-vector.aggregate-resolved-ricochet-targets"
      : "damage-vector.aggregate-resolved-chain-targets";
  const appliedRules: RuleDefinition[] = [];
  const decisions: Trace["decisions"][number][] = [];
  const metricValues: Record<string, number> = {};
  const zeroDamage = zeroVector(references.attackMode.baseDamage);
  const initialHealthTotal = domain.targets.reduce(
    (total, target) => total + target.resolvedHealth,
    0,
  );
  let world = createWorldState(
    domain.targets.map((target) => ({
      id: target.id,
      values: Object.freeze({ health: target.resolvedHealth }),
    })),
  );
  let decisionSequence = 0;
  let expansionExecution: RuleExecution | undefined;
  let expansionEventId: string | undefined;

  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    kind: actionEventKind,
    phases: FIXED_MULTISHOT_EMISSION_PHASES,
  }).drain()) {
    expansionEventId = event.id;
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const context = {
        targetCount: domain.targets.length,
        initialHealthTotal,
        zeroDamage,
      };
      const execution = isPunchThrough
        ? ruleset.executeResolvedPunchThroughExpansionRule(rule.id, context)
        : isRicochet
          ? ruleset.executeResolvedRicochetExpansionRule(rule.id, context)
          : ruleset.executeResolvedChainExpansionRule(rule.id, context);
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          domain.action.criticalTier,
          null,
          0,
          {
            readOverrides: {
              "action.target-path-count": domain.targets.length,
            },
          },
        ),
      );
      decisionSequence += 1;
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        expansionExecution = execution;
      }
    }
  }
  if (
    expansionExecution?.operationKind !== expansionOperationKind ||
    expansionEventId === undefined
  ) {
    throw new TypeError(`Ruleset did not apply resolved ${pathLabel} expansion`);
  }

  const targetHits: ResolvedPunchThroughTargetHit[] = [];
  for (const [index, target] of domain.targets.entries()) {
    const pathTarget: PathTargetTraceMetadata = Object.freeze({
      pathId: domain.action.targetPathRelationId,
      targetId: target.id,
      index,
      count: domain.targets.length,
    });
    const healthBefore = readHealth(world, target.id);
    let targetDamage = zeroVector(references.attackMode.baseDamage);
    for (const event of createPhaseEvents({
      actionId: domain.action.id,
      namespace: `${domain.action.id}.path-target-${index}`,
      logicalId: `${domain.action.id}.${target.id}`,
      parentEventId: expansionEventId,
      phases: FIXED_CRITICAL_PHASES,
    }).drain()) {
      for (const rule of ruleset.snapshot.rules) {
        if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
          continue;
        }
        const execution = ruleset.executeRule(
          rule.id,
          ruleContext(
            references,
            targetDamage,
            domain.action.criticalTier,
            null,
            target.resolvedArmor,
            readHealth(world, target.id),
          ),
        );
        decisions.push(
          decisionForExecution(
            decisionSequence,
            event,
            rule,
            execution,
            references,
            domain.action.criticalTier,
            null,
            target.resolvedArmor,
            { pathTarget },
          ),
        );
        decisionSequence += 1;
        updateMetricValues(metricValues, execution, domain.action.criticalTier);
        if (execution.outcome === "applied") {
          appliedRules.push(rule);
          targetDamage = execution.after.damage;
          world = replaceEntityState(world, target.id, {
            health: execution.after.health,
          });
        }
      }
    }
    targetHits.push(
      Object.freeze({
        id: `path-target.${index}`,
        targetId: target.id,
        index,
        damage: targetDamage,
        healthBefore,
        healthAfter: readHealth(world, target.id),
      }),
    );
  }

  let aggregateExecution: RuleExecution | undefined;
  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    kind: actionEventKind,
    parentEventId: expansionEventId,
    phases: FIXED_MULTISHOT_AGGREGATION_PHASES,
  }).drain()) {
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const context = {
        initialHealthTotal,
        targets: targetHits,
      };
      const execution = isPunchThrough
        ? ruleset.executeResolvedPunchThroughAggregateRule(rule.id, context)
        : isRicochet
          ? ruleset.executeResolvedRicochetAggregateRule(rule.id, context)
          : ruleset.executeResolvedChainAggregateRule(rule.id, context);
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          domain.action.criticalTier,
          null,
          0,
          {
            readOverrides: {
              "path-target.damage": canonicalizeJson(
                targetHits.map((target) => ({
                  id: target.id,
                  targetId: target.targetId,
                  index: target.index,
                  damage: { ...target.damage },
                })),
              ),
              "path-target.health-before": canonicalizeJson(
                targetHits.map((target) => ({
                  id: target.id,
                  targetId: target.targetId,
                  index: target.index,
                  healthBefore: target.healthBefore,
                })),
              ),
              "path-target.health-after": canonicalizeJson(
                targetHits.map((target) => ({
                  id: target.id,
                  targetId: target.targetId,
                  index: target.index,
                  healthAfter: target.healthAfter,
                })),
              ),
            },
          },
        ),
      );
      decisionSequence += 1;
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        aggregateExecution = execution;
      }
    }
  }
  if (aggregateExecution?.operationKind !== aggregateOperationKind) {
    throw new TypeError(`Ruleset did not apply resolved ${pathLabel} aggregation`);
  }

  const remainingHealthTotal = targetHits.reduce((total, target) => total + target.healthAfter, 0);
  metricValues[`${pathLabel}.target-count`] = targetHits.length;
  metricValues[`damage.${pathLabel}.total`] = aggregateExecution.after.damageTotal;
  metricValues["damage.health.total"] = aggregateExecution.after.damageTotal;
  metricValues["targets.health.remaining-total"] = remainingHealthTotal;
  metricValues["targets.defeated-count"] = targetHits.filter(
    (target) => target.healthAfter === 0,
  ).length;

  return Object.freeze({
    appliedRules: Object.freeze(appliedRules),
    decisions: Object.freeze(decisions),
    metricValues: Object.freeze(metricValues),
    damage: aggregateExecution.after.damage,
    targetHealthById: Object.freeze(
      Object.fromEntries(targetHits.map((target) => [target.targetId, target.healthAfter])),
    ),
  });
}

function evaluateFixedRadialRuntime(
  domain: ScenarioDomain,
  references: ResolvedCatalogReferences,
  ruleset: LoadedRuleset,
): RuntimeEvaluation {
  if (
    domain.action.kind !== "radial-hit" ||
    domain.action.criticalResolution !== "fixed" ||
    domain.action.criticalTier === null
  ) {
    throw new TypeError("Non-fixed Radial input reached fixed Radial evaluation");
  }

  const appliedRules: RuleDefinition[] = [];
  const decisions: Trace["decisions"][number][] = [];
  const metricValues: Record<string, number> = {};
  let damage = zeroVector(references.attackMode.baseDamage);
  let world = createWorldState([
    {
      id: domain.target.id,
      values: Object.freeze({ health: domain.target.resolvedHealth }),
    },
  ]);
  let decisionSequence = 0;

  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    kind: "damage.radial",
    phases: FIXED_RADIAL_PHASES,
  }).drain()) {
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const isFalloff = rule.operation.kind === "damage-vector.scale-resolved-radial-falloff";
      const execution = isFalloff
        ? ruleset.executeResolvedRadialFalloffRule(rule.id, {
            currentDamage: damage,
            multiplier: domain.action.resolvedRadialFalloffMultiplier,
            health: readHealth(world, domain.target.id),
          })
        : ruleset.executeRule(
            rule.id,
            ruleContext(
              references,
              damage,
              domain.action.criticalTier,
              null,
              domain.target.resolvedArmor,
              readHealth(world, domain.target.id),
            ),
          );
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          domain.action.criticalTier,
          null,
          domain.target.resolvedArmor,
          isFalloff
            ? {
                readOverrides: {
                  "event.radial-falloff-multiplier": domain.action.resolvedRadialFalloffMultiplier,
                },
              }
            : {},
        ),
      );
      decisionSequence += 1;
      updateMetricValues(metricValues, execution, domain.action.criticalTier, rule.eventKind);
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        damage = execution.after.damage;
        world = replaceEntityState(world, domain.target.id, {
          health: execution.after.health,
        });
      }
    }
  }

  return Object.freeze({
    appliedRules: Object.freeze(appliedRules),
    decisions: Object.freeze(decisions),
    metricValues: Object.freeze(metricValues),
    damage,
  });
}

function evaluateResolvedStatusTicksRuntime(
  domain: ScenarioDomain,
  references: ResolvedCatalogReferences,
  ruleset: LoadedRuleset,
): RuntimeEvaluation {
  if (
    domain.action.kind !== "resolved-status-ticks" ||
    domain.action.statusId !== "status.synthetic-resolved-dot"
  ) {
    throw new TypeError("Non-resolved Status input reached resolved Status tick evaluation");
  }

  const appliedRules: RuleDefinition[] = [];
  const decisions: Trace["decisions"][number][] = [];
  const metricValues: Record<string, number> = {};
  const zeroDamage: DamageVector = Object.freeze({ "damage.synthetic-status": 0 });
  let world = createWorldState([
    {
      id: domain.target.id,
      values: Object.freeze({ health: domain.target.resolvedHealth }),
    },
  ]);
  let decisionSequence = 0;
  let scheduleExecution: RuleExecution | undefined;
  let scheduleEventId: string | undefined;

  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    kind: "action.resolved-status-ticks",
    phases: FIXED_MULTISHOT_EMISSION_PHASES,
  }).drain()) {
    scheduleEventId = event.id;
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const execution = ruleset.executeResolvedStatusTickScheduleRule(rule.id, {
        tickCount: domain.action.statusTickCount,
        tickIntervalMs: domain.action.statusTickIntervalMs,
        initialHealth: domain.target.resolvedHealth,
        zeroDamage,
      });
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          null,
          null,
          domain.target.resolvedArmor,
          {
            readOverrides: {
              "action.status-tick-count": domain.action.statusTickCount,
              "action.status-tick-interval-ms": domain.action.statusTickIntervalMs,
            },
          },
        ),
      );
      decisionSequence += 1;
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        scheduleExecution = execution;
      }
    }
  }
  if (
    scheduleExecution === undefined ||
    scheduleExecution.operationKind !== "event.expand-resolved-status-ticks" ||
    scheduleEventId === undefined ||
    requiredNumber(scheduleExecution.parameters, "tickCount") !== domain.action.statusTickCount ||
    requiredNumber(scheduleExecution.parameters, "tickIntervalMs") !==
      domain.action.statusTickIntervalMs
  ) {
    throw new TypeError("Ruleset did not apply resolved Status tick scheduling");
  }

  const ticks: SequentialHit[] = [];
  for (let index = 0; index < domain.action.statusTickCount; index += 1) {
    const timeMs = (index + 1) * domain.action.statusTickIntervalMs;
    const tick: TickTraceMetadata = Object.freeze({
      id: `tick.status-${index}`,
      index,
      count: domain.action.statusTickCount,
      timeMs,
    });
    const healthBefore = readHealth(world, domain.target.id);
    let tickDamage: DamageVector = zeroDamage;

    for (const event of createPhaseEvents({
      actionId: domain.action.id,
      namespace: `${domain.action.id}.${tick.id}`,
      logicalId: `${domain.action.id}.${tick.id}`,
      parentEventId: scheduleEventId,
      kind: "damage.status-tick",
      timeMs,
      phases: RESOLVED_STATUS_TICK_PHASES,
    }).drain()) {
      for (const rule of ruleset.snapshot.rules) {
        if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
          continue;
        }
        const execution =
          rule.operation.kind === "damage-vector.copy-resolved-status-tick"
            ? ruleset.executeResolvedStatusTickDamageRule(rule.id, {
                resolvedHealthDamagePerTick: domain.action.resolvedHealthDamagePerTick,
                health: readHealth(world, domain.target.id),
              })
            : ruleset.executeRule(
                rule.id,
                ruleContext(
                  references,
                  tickDamage,
                  null,
                  null,
                  domain.target.resolvedArmor,
                  readHealth(world, domain.target.id),
                ),
              );
        decisions.push(
          decisionForExecution(
            decisionSequence,
            event,
            rule,
            execution,
            references,
            null,
            null,
            domain.target.resolvedArmor,
            {
              tick,
              ...(rule.operation.kind === "damage-vector.copy-resolved-status-tick"
                ? {
                    readOverrides: {
                      "status.resolved-health-damage-per-tick":
                        domain.action.resolvedHealthDamagePerTick,
                    },
                  }
                : {}),
            },
          ),
        );
        decisionSequence += 1;
        updateMetricValues(metricValues, execution, null, rule.eventKind);
        if (execution.outcome === "applied") {
          appliedRules.push(rule);
          tickDamage = execution.after.damage;
          world = replaceEntityState(world, domain.target.id, {
            health: execution.after.health,
          });
        }
      }
    }

    ticks.push(
      Object.freeze({
        id: tick.id,
        index,
        damage: tickDamage,
        healthBefore,
        healthAfter: readHealth(world, domain.target.id),
      }),
    );
  }

  let aggregateExecution: RuleExecution | undefined;
  const finalTickTimeMs = domain.action.statusTickCount * domain.action.statusTickIntervalMs;
  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    kind: "action.resolved-status-ticks",
    parentEventId: scheduleEventId,
    timeMs: finalTickTimeMs,
    phases: FIXED_MULTISHOT_AGGREGATION_PHASES,
  }).drain()) {
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const execution = ruleset.executeSequentialStatusTickAggregateRule(rule.id, {
        initialHealth: domain.target.resolvedHealth,
        hits: ticks,
      });
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          null,
          null,
          domain.target.resolvedArmor,
          {
            readOverrides: {
              "tick.damage": canonicalizeJson(
                ticks.map((tick) => ({
                  id: tick.id,
                  index: tick.index,
                  damage: { ...tick.damage },
                })),
              ),
              "tick.health-before": canonicalizeJson(
                ticks.map((tick) => ({
                  id: tick.id,
                  index: tick.index,
                  healthBefore: tick.healthBefore,
                })),
              ),
              "tick.health-after": canonicalizeJson(
                ticks.map((tick) => ({
                  id: tick.id,
                  index: tick.index,
                  healthAfter: tick.healthAfter,
                })),
              ),
            },
          },
        ),
      );
      decisionSequence += 1;
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        aggregateExecution = execution;
      }
    }
  }
  if (
    aggregateExecution === undefined ||
    aggregateExecution.operationKind !== "damage-vector.aggregate-sequential-status-ticks"
  ) {
    throw new TypeError("Ruleset did not apply resolved Status tick aggregation");
  }

  metricValues["status.tick-count"] = domain.action.statusTickCount;
  metricValues["status.tick-interval-ms"] = domain.action.statusTickIntervalMs;
  metricValues["damage.status.total"] = aggregateExecution.after.damageTotal;
  metricValues["damage.health.total"] = aggregateExecution.after.damageTotal;
  metricValues["target.health.remaining"] = aggregateExecution.after.health;

  return Object.freeze({
    appliedRules: Object.freeze(appliedRules),
    decisions: Object.freeze(decisions),
    metricValues: Object.freeze(metricValues),
    damage: aggregateExecution.after.damage,
  });
}

function requiredNumber(
  parameters: Readonly<Record<string, string | number>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Expected Rule execution omitted finite parameter ${key}`);
  }
  return value;
}

function evaluateExpectedRuntime(
  domain: ScenarioDomain,
  references: ResolvedCatalogReferences,
  ruleset: LoadedRuleset,
): RuntimeEvaluation {
  if (domain.action.criticalResolution !== "expected") {
    throw new TypeError("Deterministic Critical resolution reached expected evaluation");
  }
  const appliedRules: RuleDefinition[] = [];
  const decisions: Trace["decisions"][number][] = [];
  const metricValues: Record<string, number> = {};
  const initialDamage = zeroVector(references.attackMode.baseDamage);
  let decisionSequence = 0;
  let distributionExecution: RuleExecution | undefined;

  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    phases: EXPECTED_RESOLUTION_PHASES,
  }).drain()) {
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const execution = ruleset.executeRule(
        rule.id,
        ruleContext(
          references,
          initialDamage,
          null,
          null,
          domain.target.resolvedArmor,
          domain.target.resolvedHealth,
        ),
      );
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          null,
          null,
          domain.target.resolvedArmor,
        ),
      );
      decisionSequence += 1;
      updateMetricValues(metricValues, execution, null);
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        distributionExecution = execution;
      }
    }
  }
  if (
    distributionExecution === undefined ||
    distributionExecution.operationKind !== "critical-tier.resolve-expected-branches"
  ) {
    throw new TypeError("Ruleset did not apply expected Critical branch resolution");
  }

  const baseTier = requiredNumber(distributionExecution.parameters, "baseTier");
  const nextTier = requiredNumber(distributionExecution.parameters, "nextTier");
  const baseTierProbability = requiredNumber(
    distributionExecution.parameters,
    "baseTierProbability",
  );
  const nextTierProbability = requiredNumber(
    distributionExecution.parameters,
    "nextTierProbability",
  );
  const branchInputs = [
    { tier: baseTier, weight: baseTierProbability },
    { tier: nextTier, weight: nextTierProbability },
  ].filter((branch, index, branches) => {
    if (branch.weight <= 0) {
      return false;
    }
    return branches.findIndex((candidate) => candidate.tier === branch.tier) === index;
  });

  const branches: ExpectedBranch[] = [];
  let expectedCriticalMultiplier = 0;
  let expectedPostCriticalDamage = 0;
  let armorRemainingMultiplier: number | undefined;
  const distributionEventId = `event.${domain.action.id}.critical.expected`;

  for (const branchInput of branchInputs) {
    const branch: BranchTraceMetadata = Object.freeze({
      id: `branch.critical-tier-${branchInput.tier}`,
      tier: branchInput.tier,
      weight: branchInput.weight,
    });
    let branchDamage = zeroVector(references.attackMode.baseDamage);
    let branchWorld = createWorldState([
      {
        id: domain.target.id,
        values: Object.freeze({ health: domain.target.resolvedHealth }),
      },
    ]);

    for (const event of createPhaseEvents({
      actionId: domain.action.id,
      namespace: `${domain.action.id}.${branch.id}`,
      logicalId: `${domain.action.id}.${branch.id}`,
      parentEventId: distributionEventId,
      phases: FIXED_CRITICAL_PHASES,
    }).drain()) {
      for (const rule of ruleset.snapshot.rules) {
        if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
          continue;
        }
        const execution = ruleset.executeRule(
          rule.id,
          ruleContext(
            references,
            branchDamage,
            branch.tier,
            null,
            domain.target.resolvedArmor,
            readHealth(branchWorld, domain.target.id),
          ),
        );
        decisions.push(
          decisionForExecution(
            decisionSequence,
            event,
            rule,
            execution,
            references,
            branch.tier,
            null,
            domain.target.resolvedArmor,
            { branch },
          ),
        );
        decisionSequence += 1;
        if (execution.outcome === "applied") {
          appliedRules.push(rule);
          if (execution.operationKind === "damage-vector.copy") {
            metricValues["damage.direct-hit.total"] = execution.after.damageTotal;
          } else if (execution.operationKind === "damage-vector.scale-critical-tier") {
            expectedCriticalMultiplier += branch.weight * execution.factor;
            expectedPostCriticalDamage += branch.weight * execution.after.damageTotal;
          } else if (execution.operationKind === "damage-vector.scale-standard-armor") {
            armorRemainingMultiplier = execution.factor;
          }
          branchDamage = execution.after.damage;
          branchWorld = replaceEntityState(branchWorld, domain.target.id, {
            health: execution.after.health,
          });
        }
      }
    }

    branches.push(
      Object.freeze({
        id: branch.id,
        tier: branch.tier,
        weight: branch.weight,
        damage: branchDamage,
        health: readHealth(branchWorld, domain.target.id),
      }),
    );
  }

  if (branches.length === 0 || armorRemainingMultiplier === undefined) {
    throw new TypeError("Expected Critical evaluation produced no reachable terminal branch");
  }

  let aggregateExecution: RuleExecution | undefined;
  for (const event of createPhaseEvents({
    actionId: domain.action.id,
    parentEventId: distributionEventId,
    phases: EXPECTED_AGGREGATION_PHASES,
  }).drain()) {
    for (const rule of ruleset.snapshot.rules) {
      if (rule.phase !== event.payload.phase || rule.eventKind !== event.kind) {
        continue;
      }
      const execution = ruleset.executeExpectedAggregateRule(rule.id, {
        initialHealth: domain.target.resolvedHealth,
        branches,
      });
      decisions.push(
        decisionForExecution(
          decisionSequence,
          event,
          rule,
          execution,
          references,
          null,
          null,
          domain.target.resolvedArmor,
          {
            readOverrides: {
              "branch.damage": canonicalizeJson(
                branches.map((branch) => ({
                  id: branch.id,
                  damage: { ...branch.damage },
                })),
              ),
              "branch.health": canonicalizeJson(
                branches.map((branch) => ({
                  id: branch.id,
                  health: branch.health,
                })),
              ),
              "branch.weight": canonicalizeJson(
                branches.map((branch) => ({
                  id: branch.id,
                  tier: branch.tier,
                  weight: branch.weight,
                })),
              ),
            },
          },
        ),
      );
      decisionSequence += 1;
      if (execution.outcome === "applied") {
        appliedRules.push(rule);
        aggregateExecution = execution;
      }
    }
  }
  if (
    aggregateExecution === undefined ||
    aggregateExecution.operationKind !== "damage-vector.aggregate-weighted-branches"
  ) {
    throw new TypeError("Ruleset did not apply expected terminal branch aggregation");
  }

  metricValues["critical.expected.multiplier"] = expectedCriticalMultiplier;
  metricValues["damage.expected.post-critical.total"] = expectedPostCriticalDamage;
  metricValues["armor.remaining-multiplier"] = armorRemainingMultiplier;
  metricValues["damage.expected.health.total"] = aggregateExecution.after.damageTotal;
  metricValues["target.health.expected-remaining"] = aggregateExecution.after.health;

  return Object.freeze({
    appliedRules: Object.freeze(appliedRules),
    decisions: Object.freeze(decisions),
    metricValues: Object.freeze(metricValues),
    damage: aggregateExecution.after.damage,
  });
}

/**
 * Evaluates the Direct Hit / generalized Critical / Armor slice.
 *
 * Deterministic mode resolves a fixed tier or explicit roll. Expected mode
 * evaluates each reachable adjacent Critical tier through terminal Health
 * commit before weighting branch Damage Vectors and remaining Health.
 */
export async function evaluateScenario(request: EvaluationRequest): Promise<EvaluationOutcome> {
  const parsed = await parseScenarioDomain(request.scenario);
  if (!parsed.ok) {
    return scenarioFailure(parsed.error);
  }
  const domain = parsed.value;

  let catalog: Catalog;
  try {
    catalog = await loadCatalogSnapshot(suppliedSnapshot(request.catalog));
  } catch (error) {
    return failure(
      "catalog-load-failed",
      error instanceof Error ? error.message : "CatalogSnapshot loading failed",
      {
        causeCode: error instanceof CatalogError ? error.code : "unknown",
      },
    );
  }

  let ruleset: LoadedRuleset;
  try {
    ruleset = await loadRuleset(suppliedSnapshot(request.ruleset));
  } catch (error) {
    return failure(
      "ruleset-load-failed",
      error instanceof Error ? error.message : "Ruleset loading failed",
      {
        causeCode: error instanceof RulesError ? error.code : "unknown",
      },
    );
  }

  if (!(await artifactMatchesRef(domain.scenario.catalogRef, catalog.snapshot))) {
    return failure(
      "catalog-reference-mismatch",
      "Scenario catalogRef does not match the loaded CatalogSnapshot",
      { path: "/catalogRef" },
    );
  }
  if (!(await artifactMatchesRef(domain.scenario.rulesetRef, ruleset.snapshot))) {
    return failure(
      "ruleset-reference-mismatch",
      "Scenario rulesetRef does not match the loaded Ruleset",
      { path: "/rulesetRef" },
    );
  }

  let references: ResolvedCatalogReferences;
  try {
    references = catalog.resolveReferences({
      weaponId: domain.attacker.weaponId,
      attackModeId: domain.attacker.attackModeId,
      targetId: domain.target.catalogTargetId,
      modIds: [],
    });
  } catch (error) {
    return failure(
      "catalog-resolution-failed",
      error instanceof Error ? error.message : "Catalog reference resolution failed",
      {
        causeCode: error instanceof CatalogError ? error.code : "unknown",
      },
    );
  }

  if (
    domain.action.kind !== "resolved-status-ticks" &&
    references.attackMode.delivery !== "hitscan"
  ) {
    return failure(
      "unsupported-delivery",
      `Unsupported attack delivery in the first combat slice: ${references.attackMode.delivery}`,
      {
        mechanicId: `mechanic.delivery.${references.attackMode.delivery}`,
      },
    );
  }
  if (
    (domain.action.criticalResolution === "roll" ||
      domain.action.criticalResolution === "expected") &&
    !criticalChanceHasRepresentableTiers(references.attackMode.criticalChance)
  ) {
    const path = attackModeFieldPath(catalog, references, "criticalChance");
    return failure(
      "unsupported-critical-chance",
      `Critical distribution resolution requires safely representable tiers; received criticalChance ${references.attackMode.criticalChance}`,
      {
        ...(path === undefined ? {} : { path }),
        mechanicId: "mechanic.critical.probability",
      },
    );
  }

  let runtime: RuntimeEvaluation;
  try {
    runtime =
      domain.action.kind === "resolved-status-ticks"
        ? evaluateResolvedStatusTicksRuntime(domain, references, ruleset)
        : domain.action.kind === "resolved-punch-through" ||
            domain.action.kind === "resolved-ricochet" ||
            domain.action.kind === "resolved-chain"
          ? evaluateResolvedTargetPathRuntime(domain, references, ruleset)
          : domain.action.kind === "radial-hit"
            ? evaluateFixedRadialRuntime(domain, references, ruleset)
            : domain.action.kind === "fixed-multishot" || domain.action.kind === "fixed-pellets"
              ? evaluateFixedHitGroupRuntime(domain, references, ruleset)
              : domain.action.criticalResolution === "expected"
                ? evaluateExpectedRuntime(domain, references, ruleset)
                : evaluateDeterministicRuntime(domain, references, ruleset);
  } catch (error) {
    if (error instanceof RulesError && error.code === "unsupported-critical-multiplier") {
      const path = attackModeFieldPath(catalog, references, "criticalMultiplier");
      return failure("unsupported-critical-multiplier", error.message, {
        ...(path === undefined ? {} : { path }),
        mechanicId: "mechanic.critical.tier-multiplier",
      });
    }
    return failure(
      "rule-execution-failed",
      error instanceof Error ? error.message : "Rule execution failed",
      {
        causeCode: error instanceof RulesError ? error.code : "unknown",
      },
    );
  }

  try {
    const scenarioRef = artifactRef(domain.scenario);
    const fingerprint = await attachResultHash({
      productVersion: request.productVersion ?? DEFAULT_PRODUCT_VERSION,
      engineVersion: KERNEL_ENGINE_VERSION,
      scenarioSchemaVersion: domain.scenario.schemaVersion,
      catalogHash: catalog.snapshot.contentHash,
      rulesetHash: ruleset.snapshot.contentHash,
      scenarioHash: domain.scenario.contentHash,
      seed: domain.fingerprintSeed,
    });
    const traceWithHash = await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:trace:0.1.0",
      kind: "voidtrace.trace",
      schemaVersion: "0.1.0",
      id: `trace.${domain.scenario.id}`,
      revision: domain.scenario.revision,
      gameBuild: domain.scenario.gameBuild,
      scenarioRef,
      fingerprint,
      level: "full",
      decisions: runtime.decisions,
    } as const);
    const validatedTrace = validateBuiltArtifact("trace", traceWithHash);
    if (!validatedTrace.ok) {
      return validatedTrace;
    }
    const trace = validatedTrace.value;

    const finalDamageTotal = sumDamageVector(runtime.damage);
    const resultWithHash = await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:result:0.2.0",
      kind: "voidtrace.result",
      schemaVersion: "0.2.0",
      id: `result.${domain.scenario.id}`,
      revision: domain.scenario.revision,
      gameBuild: domain.scenario.gameBuild,
      scenarioRef,
      fingerprint,
      coverage: coverageForRules(runtime.appliedRules),
      metrics: projectRequestedMetrics(domain.metrics, runtime.metricValues),
      damageBySource: {
        [domain.action.id]: finalDamageTotal,
      },
      damageByType: runtime.damage,
      targetStates: Object.fromEntries(
        domain.targets.map((target) => [
          target.id,
          {
            health:
              runtime.targetHealthById?.[target.id] ??
              runtime.metricValues[
                domain.action.criticalResolution === "expected"
                  ? "target.health.expected-remaining"
                  : "target.health.remaining"
              ],
          },
        ]),
      ),
      resolvedDefaults: {
        "fingerprint.seed": domain.fingerprintSeed,
        "trace.level": "full",
      },
      assumptions: domain.scenario.assumptions.map((assumption) => ({
        id: assumption.id,
        status: "experimental" as const,
        impact: "high" as const,
        description: assumption.description,
      })),
      warnings: [
        {
          code: "warning.synthetic-experimental-rules",
          message:
            "This Result uses synthetic experimental mechanics and is not a verified current Warframe claim.",
        },
      ],
      traceRef: artifactRef(trace),
    } as const);
    const validatedResult = validateBuiltArtifact("result", resultWithHash);
    if (!validatedResult.ok) {
      return validatedResult;
    }
    const result = validatedResult.value;

    if (!(await verifyResultTraceIntegrity(result, trace, domain.scenario))) {
      return failure(
        "integrity-check-failed",
        "Result, Trace, and Scenario failed cross-Artifact integrity verification",
      );
    }
    if (
      domain.action.kind === "resolved-punch-through" ||
      domain.action.kind === "resolved-ricochet" ||
      domain.action.kind === "resolved-chain"
    ) {
      try {
        const replayed = await replayTraceTargetStates(
          trace,
          Object.fromEntries(domain.targets.map((target) => [target.id, target.resolvedHealth])),
        );
        if (
          canonicalizeJson(replayed.damage) !== canonicalizeJson(runtime.damage) ||
          canonicalizeJson(replayed.healthByTarget) !== canonicalizeJson(runtime.targetHealthById)
        ) {
          return failure(
            "integrity-check-failed",
            "Target-path Trace replay does not match evaluated Damage or target Health",
          );
        }
      } catch (error) {
        return failure(
          "integrity-check-failed",
          error instanceof Error ? error.message : "Target-path Trace semantic replay failed",
          {
            causeCode: error instanceof TraceReplayError ? error.code : "unknown",
          },
        );
      }
      return Object.freeze({ ok: true, result, trace });
    }

    let replayedHealth: number;
    try {
      const replayed = await replayTraceState(trace, domain.target.resolvedHealth);
      if (canonicalizeJson(replayed.damage) !== canonicalizeJson(runtime.damage)) {
        return failure(
          "integrity-check-failed",
          "Trace replay Damage Vector does not match the evaluated Result",
        );
      }
      replayedHealth = replayed.health;
    } catch (error) {
      return failure(
        "integrity-check-failed",
        error instanceof Error ? error.message : "Trace semantic replay failed",
        {
          causeCode: error instanceof TraceReplayError ? error.code : "unknown",
        },
      );
    }
    const terminalHealthMetricId =
      domain.action.criticalResolution === "expected"
        ? "target.health.expected-remaining"
        : "target.health.remaining";
    const evaluatedHealth = runtime.metricValues[terminalHealthMetricId];
    if (typeof evaluatedHealth !== "number" || replayedHealth !== evaluatedHealth) {
      return failure(
        "integrity-check-failed",
        "Trace replay terminal Health does not match the evaluated Result",
      );
    }

    return Object.freeze({
      ok: true,
      result,
      trace,
    });
  } catch (error) {
    return failure(
      "artifact-construction-failed",
      error instanceof Error ? error.message : "Result or Trace construction failed",
    );
  }
}
