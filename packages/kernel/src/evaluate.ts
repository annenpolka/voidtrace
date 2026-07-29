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
  type Result,
  type Trace,
  validateContract,
  verifyResultTraceIntegrity,
} from "@voidtrace/contracts";
import {
  type DamageVector,
  type LoadedRuleset,
  loadRuleset,
  type RuleDefinition,
  type RuleExecution,
  RulesError,
  sumDamageVector,
} from "@voidtrace/rules";
import { EventQueue, type KernelEvent } from "./event-queue.ts";
import { parseScenarioDomain, type ScenarioDomainError } from "./scenario-domain.ts";
import { createWorldState, replaceEntityState, type WorldState } from "./world-state.ts";

export const KERNEL_ENGINE_VERSION = "0.2.0";
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
const ROLLED_CRITICAL_PHASES = [
  "damage.construct",
  "critical.roll",
  "critical.resolve",
  "target.mitigate",
  "damage.commit",
] as const satisfies ReadonlyArray<RuleDefinition["phase"]>;

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

function criticalChancePath(
  catalog: Catalog,
  references: ResolvedCatalogReferences,
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
  return `/weapons/${weaponIndex}/attackModes/${attackModeIndex}/criticalChance`;
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
  criticalTier: 0 | 1 | null,
  criticalRoll: number | null,
  armor: number,
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

function operationParameters(execution: RuleExecution): Readonly<Record<string, number>> {
  const values: Record<string, number> = { ...execution.parameters };
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
  criticalTier: 0 | 1 | null,
  criticalRoll: number | null,
  armor: number,
): Trace["decisions"][number] {
  const common = {
    sequence,
    eventId: event.id,
    ...(event.parentEventId === undefined ? {} : { parentEventId: event.parentEventId }),
    eventTimeMs: event.timeMs,
    phase: rule.phase,
    ruleId: rule.id,
    reads: ruleReads(rule, execution, references, criticalTier, criticalRoll, armor),
    evidenceStatus: rule.evidenceStatus,
    evidenceIds: rule.evidenceIds,
  } as const;

  if (execution.outcome === "predicate-rejected") {
    return Object.freeze({
      ...common,
      outcome: "rejected",
      rejectionStage: "predicate",
      rejectionReason: Object.freeze({
        code: "predicate.critical-tier-mismatch",
        message: `Rule ${rule.id} requires a different fixed Critical tier`,
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
        parameters: operationParameters(execution),
      }),
    ]),
    before: traceState(execution.before.damage, execution.before.health),
    after: traceState(execution.after.damage, execution.after.health),
  });
}

function createPhaseEvents(
  actionId: string,
  criticalResolution: "fixed" | "roll",
): EventQueue<PhasePayload> {
  const queue = new EventQueue<PhasePayload>();
  let parentEventId: string | undefined;
  const phases = criticalResolution === "fixed" ? FIXED_CRITICAL_PHASES : ROLLED_CRITICAL_PHASES;
  for (const [sequence, phase] of phases.entries()) {
    const id = `event.${actionId}.${phase}`;
    queue.enqueue({
      id,
      logicalId: actionId,
      ...(parentEventId === undefined ? {} : { parentEventId }),
      timeMs: 0,
      sequence,
      kind: "damage.direct",
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
  criticalTier: 0 | 1 | null,
): void {
  if (execution.outcome !== "applied") {
    return;
  }
  switch (execution.operationKind) {
    case "damage-vector.copy":
      metricValues["damage.direct-hit.total"] = execution.after.damageTotal;
      return;
    case "critical-tier.resolve-binary-roll": {
      if (execution.resolvedCriticalTier === undefined) {
        throw new TypeError("Critical roll resolver did not produce a tier");
      }
      const { criticalRoll, tier0Probability, tier1Probability } = execution.parameters;
      if (
        criticalRoll === undefined ||
        tier0Probability === undefined ||
        tier1Probability === undefined
      ) {
        throw new TypeError("Critical roll resolver omitted probability metrics");
      }
      metricValues["critical.roll"] = criticalRoll;
      metricValues["critical.tier-0.probability"] = tier0Probability;
      metricValues["critical.tier-1.probability"] = tier1Probability;
      metricValues["critical.tier"] = execution.resolvedCriticalTier;
      return;
    }
    case "damage-vector.scale-fixed-critical":
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
    case "damage.commit-health":
      metricValues["damage.health.total"] = execution.before.damageTotal;
      metricValues["target.health.remaining"] = execution.after.health;
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
    case "damage-vector.copy":
      return "mechanic.damage.direct-hit";
    case "critical-tier.resolve-binary-roll":
      return "mechanic.critical.probability";
    case "damage-vector.scale-fixed-critical":
      return "mechanic.critical.fixed-tier";
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
    (rule) => rule.operation.kind === "critical-tier.resolve-binary-roll",
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

/**
 * Evaluates the deterministic Direct Hit / fixed-or-explicit-roll Critical / Armor slice.
 *
 * The function is pure with respect to external state: it rebuilds executable
 * handles from the supplied content-addressed snapshots and consults no clock,
 * I/O, or random source.
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

  if (references.attackMode.delivery !== "hitscan") {
    return failure(
      "unsupported-delivery",
      `Unsupported attack delivery in the first combat slice: ${references.attackMode.delivery}`,
      {
        mechanicId: `mechanic.delivery.${references.attackMode.delivery}`,
      },
    );
  }
  if (domain.action.criticalResolution === "roll" && references.attackMode.criticalChance > 1) {
    const path = criticalChancePath(catalog, references);
    return failure(
      "unsupported-critical-chance",
      `Binary Critical roll resolution supports criticalChance from 0 through 1; received ${references.attackMode.criticalChance}`,
      {
        ...(path === undefined ? {} : { path }),
        mechanicId: "mechanic.critical.probability",
      },
    );
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

  try {
    let decisionSequence = 0;
    for (const event of createPhaseEvents(
      domain.action.id,
      domain.action.criticalResolution,
    ).drain()) {
      for (const rule of ruleset.snapshot.rules) {
        if (rule.phase !== event.payload.phase) {
          continue;
        }
        const execution = ruleset.executeRule(rule.id, {
          baseDamage: references.attackMode.baseDamage,
          currentDamage: damage,
          criticalTier,
          criticalChance: references.attackMode.criticalChance,
          criticalRoll: domain.action.criticalRoll,
          criticalMultiplier: references.attackMode.criticalMultiplier,
          armor: domain.target.resolvedArmor,
          health: readHealth(world, domain.target.id),
        });
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
  } catch (error) {
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
      decisions,
    } as const);
    const validatedTrace = validateBuiltArtifact("trace", traceWithHash);
    if (!validatedTrace.ok) {
      return validatedTrace;
    }
    const trace = validatedTrace.value;

    const finalDamageTotal = sumDamageVector(damage);
    const resultWithHash = await attachArtifactContentHash({
      $schema: "urn:voidtrace:schema:result:0.1.0",
      kind: "voidtrace.result",
      schemaVersion: "0.1.0",
      id: `result.${domain.scenario.id}`,
      revision: domain.scenario.revision,
      gameBuild: domain.scenario.gameBuild,
      scenarioRef,
      fingerprint,
      coverage: coverageForRules(appliedRules),
      metrics: projectRequestedMetrics(domain.metrics, metricValues),
      damageBySource: {
        [domain.action.id]: finalDamageTotal,
      },
      damageByType: damage,
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
