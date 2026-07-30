import {
  isStableId,
  type Scenario,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";

export const SUPPORTED_METRIC_IDS = Object.freeze([
  "damage.direct-hit.total",
  "critical.roll",
  "critical.base-tier",
  "critical.next-tier",
  "critical.fraction",
  "critical.base-tier.probability",
  "critical.next-tier.probability",
  "critical.tier-0.probability",
  "critical.tier-1.probability",
  "critical.tier",
  "critical.multiplier",
  "critical.expected.multiplier",
  "damage.post-critical.total",
  "damage.expected.post-critical.total",
  "armor.remaining-multiplier",
  "damage.health.total",
  "damage.expected.health.total",
  "target.health.remaining",
  "target.health.expected-remaining",
  "multishot.hit-count",
  "damage.multishot.total",
  "pellet.count",
  "damage.pellet.total",
  "radial.falloff.multiplier",
  "damage.radial.base.total",
  "damage.radial.total",
  "status.tick-count",
  "status.tick-interval-ms",
  "damage.status.per-tick",
  "damage.status.total",
] as const);

export type SupportedMetricId = (typeof SUPPORTED_METRIC_IDS)[number];

export type ScenarioDomainErrorCode =
  | "contract-invalid"
  | "content-hash-mismatch"
  | "unsupported-simulation-mode"
  | "unsupported-target-graph"
  | "unsupported-scenario-shape"
  | "unsupported-configuration-key"
  | "missing-configuration-key"
  | "invalid-configuration-value"
  | "invalid-target-reference"
  | "unsupported-target-defense"
  | "unsupported-action-kind"
  | "unsupported-hit-location"
  | "unsupported-damage-layer"
  | "invalid-critical-resolution"
  | "unsupported-multishot-resolution"
  | "unsupported-pellet-resolution"
  | "unsupported-radial-resolution"
  | "unsupported-status-resolution"
  | "status-time-horizon-exceeded"
  | "unsupported-critical-tier"
  | "unsupported-metric"
  | "duplicate-metric";

export type ScenarioDomainError = {
  readonly code: ScenarioDomainErrorCode;
  readonly path: string;
  readonly mechanicId?: string;
  readonly message: string;
};

export type ScenarioDomain = {
  readonly scenario: Scenario;
  readonly attacker: {
    readonly id: string;
    readonly weaponId: string;
    readonly attackModeId: string;
  };
  readonly target: {
    readonly id: string;
    readonly catalogTargetId: string;
    readonly resolvedHealth: number;
    readonly resolvedShield: 0;
    readonly resolvedArmor: number;
    readonly resolvedOverguard: 0;
  };
  readonly action: {
    readonly id: string;
    readonly kind:
      | "direct-hit"
      | "fixed-multishot"
      | "fixed-pellets"
      | "radial-hit"
      | "resolved-status-ticks";
    readonly targetId: string;
    readonly hitLocation: "hit-location.neutral-body" | null;
    readonly damageLayer: "health";
    readonly criticalResolution: "fixed" | "roll" | "expected" | "none";
    readonly criticalTier: number | null;
    readonly criticalRoll: number | null;
    readonly hitCount: number;
    readonly resolvedRadialFalloffMultiplier: number;
    readonly statusId: "status.synthetic-resolved-dot" | null;
    readonly resolvedHealthDamagePerTick: number;
    readonly statusTickCount: number;
    readonly statusTickIntervalMs: number;
  };
  readonly simulation: {
    readonly mode: "deterministic" | "expected";
    readonly timeLimitMs: number;
  };
  readonly metrics: readonly SupportedMetricId[];
  readonly fingerprintSeed: 0;
};

type ScenarioDomainFailure = {
  readonly ok: false;
  readonly error: ScenarioDomainError;
};

export type ScenarioDomainParseResult =
  | {
      readonly ok: true;
      readonly value: ScenarioDomain;
    }
  | ScenarioDomainFailure;

type ScalarRecord = Readonly<Record<string, string | number | boolean | null>>;

const SUPPORTED_METRIC_SET: ReadonlySet<string> = new Set(SUPPORTED_METRIC_IDS);
const ATTACKER_CONFIGURATION_KEYS = Object.freeze(["weaponId", "attackModeId"] as const);
const TARGET_CONFIGURATION_KEYS = Object.freeze([
  "catalogTargetId",
  "resolvedHealth",
  "resolvedShield",
  "resolvedArmor",
  "resolvedOverguard",
] as const);
const ACTION_PARAMETER_COMMON_KEYS = Object.freeze([
  "targetId",
  "hitLocation",
  "damageLayer",
] as const);
const FIXED_CRITICAL_PARAMETER_KEYS = Object.freeze([
  ...ACTION_PARAMETER_COMMON_KEYS,
  "criticalTier",
] as const);
const ROLLED_CRITICAL_PARAMETER_KEYS = Object.freeze([
  ...ACTION_PARAMETER_COMMON_KEYS,
  "criticalRoll",
] as const);
const EXPECTED_CRITICAL_PARAMETER_KEYS = ACTION_PARAMETER_COMMON_KEYS;
const FIXED_MULTISHOT_PARAMETER_KEYS = Object.freeze([
  ...ACTION_PARAMETER_COMMON_KEYS,
  "criticalTier",
  "hitCount",
] as const);
const FIXED_PELLET_PARAMETER_KEYS = Object.freeze([
  ...ACTION_PARAMETER_COMMON_KEYS,
  "criticalTier",
  "pelletCount",
] as const);
const FIXED_RADIAL_PARAMETER_KEYS = Object.freeze([
  ...ACTION_PARAMETER_COMMON_KEYS,
  "criticalTier",
  "resolvedFalloffMultiplier",
] as const);
const RESOLVED_STATUS_TICK_PARAMETER_KEYS = Object.freeze([
  "targetId",
  "damageLayer",
  "statusId",
  "resolvedHealthDamagePerTick",
  "tickCount",
  "tickIntervalMs",
] as const);
const MULTISHOT_ONLY_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "multishot.hit-count",
  "damage.multishot.total",
]);
const PELLET_ONLY_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "pellet.count",
  "damage.pellet.total",
]);
const RADIAL_ONLY_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "radial.falloff.multiplier",
  "damage.radial.base.total",
  "damage.radial.total",
]);
const STATUS_ONLY_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "status.tick-count",
  "status.tick-interval-ms",
  "damage.status.per-tick",
  "damage.status.total",
]);
const STATUS_AVAILABLE_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  ...STATUS_ONLY_METRIC_IDS,
  "damage.health.total",
  "target.health.remaining",
]);
const DISTRIBUTION_CRITICAL_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "critical.base-tier",
  "critical.next-tier",
  "critical.fraction",
  "critical.base-tier.probability",
  "critical.next-tier.probability",
  "critical.tier-0.probability",
  "critical.tier-1.probability",
]);
const EXPLICIT_ROLL_ONLY_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set(["critical.roll"]);
const EXPECTED_CRITICAL_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "critical.expected.multiplier",
  "damage.expected.post-critical.total",
  "damage.expected.health.total",
  "target.health.expected-remaining",
]);
const REALIZED_CRITICAL_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "critical.roll",
  "critical.tier",
  "critical.multiplier",
  "damage.post-critical.total",
  "damage.health.total",
  "target.health.remaining",
]);
const FIXED_UNAVAILABLE_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  ...EXPLICIT_ROLL_ONLY_METRIC_IDS,
  ...DISTRIBUTION_CRITICAL_METRIC_IDS,
]);

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function failure(
  code: ScenarioDomainErrorCode,
  path: string,
  message: string,
  mechanicId?: string,
): ScenarioDomainFailure {
  const error =
    mechanicId === undefined
      ? Object.freeze({ code, path, message })
      : Object.freeze({ code, path, mechanicId, message });
  return Object.freeze({ ok: false, error });
}

function exactKeys(
  record: ScalarRecord,
  expectedKeys: readonly string[],
  path: string,
): ScenarioDomainFailure | undefined {
  const expected = new Set(expectedKeys);
  const unexpected = Object.keys(record)
    .filter((key) => !expected.has(key))
    .toSorted();
  if (unexpected.length > 0) {
    const key = unexpected[0] as string;
    return failure(
      "unsupported-configuration-key",
      `${path}/${pointerSegment(key)}`,
      `Unsupported Scenario configuration key: ${key}`,
    );
  }

  for (const key of expectedKeys) {
    if (!Object.hasOwn(record, key)) {
      return failure(
        "missing-configuration-key",
        `${path}/${pointerSegment(key)}`,
        `Missing required Scenario configuration key: ${key}`,
      );
    }
  }
  return undefined;
}

type ReadResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | ScenarioDomainFailure;

function readStableString(record: ScalarRecord, key: string, path: string): ReadResult<string> {
  const value = record[key];
  if (!isStableId(value)) {
    return failure(
      "invalid-configuration-value",
      `${path}/${pointerSegment(key)}`,
      `${key} must be a stable identifier`,
    );
  }
  return { ok: true, value };
}

function readNonNegativeFiniteNumber(
  record: ScalarRecord,
  key: string,
  path: string,
): ReadResult<number> {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return failure(
      "invalid-configuration-value",
      `${path}/${pointerSegment(key)}`,
      `${key} must be a finite non-negative number`,
    );
  }
  return { ok: true, value };
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

export async function parseScenarioDomain(input: unknown): Promise<ScenarioDomainParseResult> {
  const contract = validateContract("scenario", input);
  if (!contract.ok) {
    const firstIssue = contract.issues[0];
    const path = firstIssue?.instancePath || "/";
    const detail = firstIssue === undefined ? "unknown validation failure" : firstIssue.message;
    return failure(
      "contract-invalid",
      path,
      `Scenario contract validation failed at ${path}: ${detail}`,
    );
  }

  const scenario = contract.value;
  if (!(await verifyArtifactContentHash(scenario))) {
    return failure(
      "content-hash-mismatch",
      "/contentHash",
      "Scenario contentHash does not match its canonical content",
    );
  }

  if (scenario.simulation.mode === "monte-carlo") {
    return failure(
      "unsupported-simulation-mode",
      "/simulation/mode",
      `Unsupported simulation mode: ${scenario.simulation.mode}`,
      `simulation.${scenario.simulation.mode}`,
    );
  }

  if (scenario.targetGraph.relations.length > 0) {
    return failure(
      "unsupported-target-graph",
      "/targetGraph/relations",
      "Resolved Target Graph relations are not implemented by the current single-target slice",
      "mechanic.target-graph",
    );
  }

  if (scenario.targets.length !== 1) {
    return failure(
      "unsupported-scenario-shape",
      "/targets",
      `The first combat slice requires exactly one target; received ${scenario.targets.length}`,
    );
  }
  if (scenario.actionPlan.length !== 1) {
    return failure(
      "unsupported-scenario-shape",
      "/actionPlan",
      `The first combat slice requires exactly one action; received ${scenario.actionPlan.length}`,
    );
  }

  const initialStateKeys = Object.keys(scenario.initialState).toSorted();
  if (initialStateKeys.length > 0) {
    const key = initialStateKeys[0] as string;
    return failure(
      "unsupported-configuration-key",
      `/initialState/${pointerSegment(key)}`,
      `The first combat slice requires an empty initialState; found ${key}`,
    );
  }

  const attackerKeyError = exactKeys(
    scenario.attacker.configuration,
    ATTACKER_CONFIGURATION_KEYS,
    "/attacker/configuration",
  );
  if (attackerKeyError !== undefined) {
    return attackerKeyError;
  }
  const weaponId = readStableString(
    scenario.attacker.configuration,
    "weaponId",
    "/attacker/configuration",
  );
  if (!weaponId.ok) {
    return weaponId;
  }
  const attackModeId = readStableString(
    scenario.attacker.configuration,
    "attackModeId",
    "/attacker/configuration",
  );
  if (!attackModeId.ok) {
    return attackModeId;
  }

  const target = scenario.targets[0] as Scenario["targets"][number];
  const targetKeyError = exactKeys(
    target.configuration,
    TARGET_CONFIGURATION_KEYS,
    "/targets/0/configuration",
  );
  if (targetKeyError !== undefined) {
    return targetKeyError;
  }
  const catalogTargetId = readStableString(
    target.configuration,
    "catalogTargetId",
    "/targets/0/configuration",
  );
  if (!catalogTargetId.ok) {
    return catalogTargetId;
  }
  const resolvedHealth = readNonNegativeFiniteNumber(
    target.configuration,
    "resolvedHealth",
    "/targets/0/configuration",
  );
  if (!resolvedHealth.ok) {
    return resolvedHealth;
  }
  const resolvedShield = readNonNegativeFiniteNumber(
    target.configuration,
    "resolvedShield",
    "/targets/0/configuration",
  );
  if (!resolvedShield.ok) {
    return resolvedShield;
  }
  if (resolvedShield.value !== 0) {
    return failure(
      "unsupported-target-defense",
      "/targets/0/configuration/resolvedShield",
      "Shield is unsupported in the first combat slice and must resolve to zero",
      "mechanic.shield",
    );
  }
  const resolvedArmor = readNonNegativeFiniteNumber(
    target.configuration,
    "resolvedArmor",
    "/targets/0/configuration",
  );
  if (!resolvedArmor.ok) {
    return resolvedArmor;
  }
  const resolvedOverguard = readNonNegativeFiniteNumber(
    target.configuration,
    "resolvedOverguard",
    "/targets/0/configuration",
  );
  if (!resolvedOverguard.ok) {
    return resolvedOverguard;
  }
  if (resolvedOverguard.value !== 0) {
    return failure(
      "unsupported-target-defense",
      "/targets/0/configuration/resolvedOverguard",
      "Overguard is unsupported in the first combat slice and must resolve to zero",
      "mechanic.overguard",
    );
  }

  const action = scenario.actionPlan[0] as Scenario["actionPlan"][number];
  if (
    action.kind !== "action.direct-hit" &&
    action.kind !== "action.multishot-direct-hit" &&
    action.kind !== "action.pellet-direct-hit" &&
    action.kind !== "action.radial-hit" &&
    action.kind !== "action.resolved-status-ticks"
  ) {
    return failure(
      "unsupported-action-kind",
      "/actionPlan/0/kind",
      `Unsupported action kind: ${action.kind}`,
      action.kind,
    );
  }
  if (action.kind === "action.resolved-status-ticks") {
    if (scenario.simulation.mode !== "deterministic") {
      return failure(
        "unsupported-status-resolution",
        "/simulation/mode",
        "Resolved Status ticks require deterministic mode",
        "mechanic.status.resolved-ticks",
      );
    }
    const actionKeyError = exactKeys(
      action.parameters,
      RESOLVED_STATUS_TICK_PARAMETER_KEYS,
      "/actionPlan/0/parameters",
    );
    if (actionKeyError !== undefined) {
      return actionKeyError;
    }
    const actionTargetId = readStableString(
      action.parameters,
      "targetId",
      "/actionPlan/0/parameters",
    );
    if (!actionTargetId.ok) {
      return actionTargetId;
    }
    if (actionTargetId.value !== target.id) {
      return failure(
        "invalid-target-reference",
        "/actionPlan/0/parameters/targetId",
        `Action targetId ${actionTargetId.value} does not reference the configured target ${target.id}`,
      );
    }
    if (action.parameters.damageLayer !== "health") {
      return failure(
        "unsupported-damage-layer",
        "/actionPlan/0/parameters/damageLayer",
        `Unsupported damage layer: ${String(action.parameters.damageLayer)}`,
        "mechanic.damage-layer",
      );
    }
    if (action.parameters.statusId !== "status.synthetic-resolved-dot") {
      return failure(
        "unsupported-status-resolution",
        "/actionPlan/0/parameters/statusId",
        `Unsupported resolved Status identity: ${String(action.parameters.statusId)}`,
        "mechanic.status.resolved-ticks",
      );
    }
    const resolvedHealthDamagePerTick = action.parameters.resolvedHealthDamagePerTick;
    if (
      typeof resolvedHealthDamagePerTick !== "number" ||
      !Number.isFinite(resolvedHealthDamagePerTick) ||
      resolvedHealthDamagePerTick < 0
    ) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/resolvedHealthDamagePerTick",
        "resolvedHealthDamagePerTick must be a finite non-negative number",
        "mechanic.status.resolved-ticks",
      );
    }
    const tickCount = action.parameters.tickCount;
    if (typeof tickCount !== "number" || !Number.isSafeInteger(tickCount) || tickCount < 1) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/tickCount",
        `Resolved Status tickCount must be a positive safe integer; received ${String(tickCount)}`,
        "mechanic.status.resolved-ticks",
      );
    }
    const tickIntervalMs = action.parameters.tickIntervalMs;
    if (
      typeof tickIntervalMs !== "number" ||
      !Number.isSafeInteger(tickIntervalMs) ||
      tickIntervalMs < 1
    ) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/tickIntervalMs",
        `Resolved Status tickIntervalMs must be a positive safe integer; received ${String(tickIntervalMs)}`,
        "mechanic.status.resolved-ticks",
      );
    }
    const finalTickTimeMs = tickCount * tickIntervalMs;
    if (!Number.isSafeInteger(finalTickTimeMs)) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/tickIntervalMs",
        "Resolved Status final tick time must be a safe integer",
        "mechanic.status.resolved-ticks",
      );
    }
    if (finalTickTimeMs > scenario.simulation.timeLimitMs) {
      return failure(
        "status-time-horizon-exceeded",
        "/simulation/timeLimitMs",
        `Resolved Status final tick at ${finalTickTimeMs}ms exceeds timeLimitMs ${scenario.simulation.timeLimitMs}`,
        "mechanic.status.resolved-ticks",
      );
    }

    if (scenario.metrics.length === 0) {
      return failure(
        "unsupported-scenario-shape",
        "/metrics",
        "At least one supported metric is required",
      );
    }
    const metrics: SupportedMetricId[] = [];
    const seenMetrics = new Set<string>();
    for (const [index, metric] of scenario.metrics.entries()) {
      if (!SUPPORTED_METRIC_SET.has(metric)) {
        return failure(
          "unsupported-metric",
          `/metrics/${index}`,
          `Unsupported metric: ${metric}`,
          metric,
        );
      }
      const supportedMetric = metric as SupportedMetricId;
      if (!STATUS_AVAILABLE_METRIC_IDS.has(supportedMetric)) {
        return failure(
          "unsupported-metric",
          `/metrics/${index}`,
          `Metric ${metric} is unavailable for resolved Status ticks`,
          metric,
        );
      }
      if (seenMetrics.has(metric)) {
        return failure(
          "duplicate-metric",
          `/metrics/${index}`,
          `Duplicate metric: ${metric}`,
          metric,
        );
      }
      seenMetrics.add(metric);
      metrics.push(supportedMetric);
    }

    const frozenScenario = deepFreeze(scenario);
    const value: ScenarioDomain = Object.freeze({
      scenario: frozenScenario,
      attacker: Object.freeze({
        id: frozenScenario.attacker.id,
        weaponId: weaponId.value,
        attackModeId: attackModeId.value,
      }),
      target: Object.freeze({
        id: target.id,
        catalogTargetId: catalogTargetId.value,
        resolvedHealth: resolvedHealth.value,
        resolvedShield: 0,
        resolvedArmor: resolvedArmor.value,
        resolvedOverguard: 0,
      }),
      action: Object.freeze({
        id: action.id,
        kind: "resolved-status-ticks",
        targetId: actionTargetId.value,
        hitLocation: null,
        damageLayer: "health",
        criticalResolution: "none",
        criticalTier: null,
        criticalRoll: null,
        hitCount: 1,
        resolvedRadialFalloffMultiplier: 1,
        statusId: "status.synthetic-resolved-dot",
        resolvedHealthDamagePerTick,
        statusTickCount: tickCount,
        statusTickIntervalMs: tickIntervalMs,
      }),
      simulation: Object.freeze({
        mode: "deterministic",
        timeLimitMs: frozenScenario.simulation.timeLimitMs,
      }),
      metrics: Object.freeze(metrics),
      fingerprintSeed: 0,
    });
    return Object.freeze({ ok: true, value });
  }
  const actionKind =
    action.kind === "action.multishot-direct-hit"
      ? "fixed-multishot"
      : action.kind === "action.pellet-direct-hit"
        ? "fixed-pellets"
        : action.kind === "action.radial-hit"
          ? "radial-hit"
          : "direct-hit";
  const hasCriticalTier = Object.hasOwn(action.parameters, "criticalTier");
  const hasCriticalRoll = Object.hasOwn(action.parameters, "criticalRoll");
  if (
    actionKind === "fixed-multishot" &&
    (scenario.simulation.mode !== "deterministic" || !hasCriticalTier || hasCriticalRoll)
  ) {
    return failure(
      "unsupported-multishot-resolution",
      "/actionPlan/0/parameters",
      "The first Multishot slice requires deterministic mode with fixed criticalTier and no criticalRoll",
      "mechanic.multishot.fixed-count",
    );
  }
  if (
    actionKind === "radial-hit" &&
    (scenario.simulation.mode !== "deterministic" || !hasCriticalTier || hasCriticalRoll)
  ) {
    return failure(
      "unsupported-radial-resolution",
      "/actionPlan/0/parameters",
      "The first Radial slice requires deterministic mode with fixed criticalTier and no criticalRoll",
      "mechanic.damage.radial",
    );
  }
  if (
    actionKind === "fixed-pellets" &&
    (scenario.simulation.mode !== "deterministic" || !hasCriticalTier || hasCriticalRoll)
  ) {
    return failure(
      "unsupported-pellet-resolution",
      "/actionPlan/0/parameters",
      "The first pellet slice requires deterministic mode with fixed criticalTier and no criticalRoll",
      "mechanic.pellet.fixed-count",
    );
  }
  const criticalResolution =
    scenario.simulation.mode === "expected" ? "expected" : hasCriticalTier ? "fixed" : "roll";
  if (
    (criticalResolution === "expected" && (hasCriticalTier || hasCriticalRoll)) ||
    (criticalResolution !== "expected" && hasCriticalTier === hasCriticalRoll)
  ) {
    return failure(
      "invalid-critical-resolution",
      "/actionPlan/0/parameters",
      scenario.simulation.mode === "expected"
        ? "Expected simulation must omit criticalTier and criticalRoll"
        : "Deterministic simulation requires exactly one of criticalTier or criticalRoll",
      "mechanic.critical.resolution",
    );
  }
  const actionKeyError = exactKeys(
    action.parameters,
    actionKind === "fixed-multishot" ||
      actionKind === "fixed-pellets" ||
      actionKind === "radial-hit"
      ? actionKind === "fixed-multishot"
        ? FIXED_MULTISHOT_PARAMETER_KEYS
        : actionKind === "fixed-pellets"
          ? FIXED_PELLET_PARAMETER_KEYS
          : FIXED_RADIAL_PARAMETER_KEYS
      : criticalResolution === "fixed"
        ? FIXED_CRITICAL_PARAMETER_KEYS
        : criticalResolution === "roll"
          ? ROLLED_CRITICAL_PARAMETER_KEYS
          : EXPECTED_CRITICAL_PARAMETER_KEYS,
    "/actionPlan/0/parameters",
  );
  if (actionKeyError !== undefined) {
    return actionKeyError;
  }
  const actionTargetId = readStableString(
    action.parameters,
    "targetId",
    "/actionPlan/0/parameters",
  );
  if (!actionTargetId.ok) {
    return actionTargetId;
  }
  if (actionTargetId.value !== target.id) {
    return failure(
      "invalid-target-reference",
      "/actionPlan/0/parameters/targetId",
      `Action targetId ${actionTargetId.value} does not reference the configured target ${target.id}`,
    );
  }

  const hitLocation = action.parameters.hitLocation;
  if (hitLocation !== "hit-location.neutral-body") {
    return failure(
      "unsupported-hit-location",
      "/actionPlan/0/parameters/hitLocation",
      `Unsupported hit location: ${String(hitLocation)}`,
      "mechanic.hit-location",
    );
  }
  const damageLayer = action.parameters.damageLayer;
  if (damageLayer !== "health") {
    return failure(
      "unsupported-damage-layer",
      "/actionPlan/0/parameters/damageLayer",
      `Unsupported damage layer: ${String(damageLayer)}`,
      "mechanic.damage-layer",
    );
  }
  let criticalTier: number | null = null;
  let criticalRoll: number | null = null;
  let hitCount = 1;
  let resolvedRadialFalloffMultiplier = 1;
  if (criticalResolution === "fixed") {
    const candidate = action.parameters.criticalTier;
    if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < 0) {
      return failure(
        "unsupported-critical-tier",
        "/actionPlan/0/parameters/criticalTier",
        `Fixed Critical tier must be a non-negative safe integer; received ${String(candidate)}`,
        "mechanic.critical.fixed-tier",
      );
    }
    criticalTier = candidate;
  } else if (criticalResolution === "roll") {
    const candidate = action.parameters.criticalRoll;
    if (
      typeof candidate !== "number" ||
      !Number.isFinite(candidate) ||
      candidate < 0 ||
      candidate >= 1
    ) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/criticalRoll",
        "criticalRoll must be a finite number in the half-open interval [0, 1)",
        "mechanic.critical.probability",
      );
    }
    criticalRoll = candidate;
  }
  if (actionKind === "fixed-multishot") {
    const candidate = action.parameters.hitCount;
    if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < 1) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/hitCount",
        `Fixed Multishot hitCount must be a positive safe integer; received ${String(candidate)}`,
        "mechanic.multishot.fixed-count",
      );
    }
    hitCount = candidate;
  } else if (actionKind === "fixed-pellets") {
    const candidate = action.parameters.pelletCount;
    if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < 1) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/pelletCount",
        `Fixed pelletCount must be a positive safe integer; received ${String(candidate)}`,
        "mechanic.pellet.fixed-count",
      );
    }
    hitCount = candidate;
  }
  if (actionKind === "radial-hit") {
    const candidate = action.parameters.resolvedFalloffMultiplier;
    if (
      typeof candidate !== "number" ||
      !Number.isFinite(candidate) ||
      candidate < 0 ||
      candidate > 1
    ) {
      return failure(
        "invalid-configuration-value",
        "/actionPlan/0/parameters/resolvedFalloffMultiplier",
        `Resolved Radial falloff multiplier must be finite and in [0, 1]; received ${String(candidate)}`,
        "mechanic.damage.radial-falloff",
      );
    }
    resolvedRadialFalloffMultiplier = candidate;
  }

  if (scenario.metrics.length === 0) {
    return failure(
      "unsupported-scenario-shape",
      "/metrics",
      "At least one supported metric is required",
    );
  }
  const metrics: SupportedMetricId[] = [];
  const seenMetrics = new Set<string>();
  for (const [index, metric] of scenario.metrics.entries()) {
    if (!SUPPORTED_METRIC_SET.has(metric)) {
      return failure(
        "unsupported-metric",
        `/metrics/${index}`,
        `Unsupported metric: ${metric}`,
        metric,
      );
    }
    const supportedMetric = metric as SupportedMetricId;
    if (
      (criticalResolution === "fixed" && FIXED_UNAVAILABLE_METRIC_IDS.has(supportedMetric)) ||
      (criticalResolution !== "expected" && EXPECTED_CRITICAL_METRIC_IDS.has(supportedMetric)) ||
      (criticalResolution === "expected" && REALIZED_CRITICAL_METRIC_IDS.has(supportedMetric)) ||
      (actionKind !== "fixed-multishot" && MULTISHOT_ONLY_METRIC_IDS.has(supportedMetric)) ||
      (actionKind !== "fixed-pellets" && PELLET_ONLY_METRIC_IDS.has(supportedMetric)) ||
      (actionKind !== "radial-hit" && RADIAL_ONLY_METRIC_IDS.has(supportedMetric)) ||
      STATUS_ONLY_METRIC_IDS.has(supportedMetric)
    ) {
      return failure(
        "unsupported-metric",
        `/metrics/${index}`,
        `Metric ${metric} is unavailable for ${criticalResolution} Critical resolution`,
        metric,
      );
    }
    if (seenMetrics.has(metric)) {
      return failure(
        "duplicate-metric",
        `/metrics/${index}`,
        `Duplicate metric: ${metric}`,
        metric,
      );
    }
    seenMetrics.add(metric);
    metrics.push(metric as SupportedMetricId);
  }

  const frozenScenario = deepFreeze(scenario);
  const value: ScenarioDomain = Object.freeze({
    scenario: frozenScenario,
    attacker: Object.freeze({
      id: frozenScenario.attacker.id,
      weaponId: weaponId.value,
      attackModeId: attackModeId.value,
    }),
    target: Object.freeze({
      id: target.id,
      catalogTargetId: catalogTargetId.value,
      resolvedHealth: resolvedHealth.value,
      resolvedShield: 0,
      resolvedArmor: resolvedArmor.value,
      resolvedOverguard: 0,
    }),
    action: Object.freeze({
      id: action.id,
      kind: actionKind,
      targetId: actionTargetId.value,
      hitLocation: "hit-location.neutral-body",
      damageLayer: "health",
      criticalResolution,
      criticalTier,
      criticalRoll,
      hitCount,
      resolvedRadialFalloffMultiplier,
      statusId: null,
      resolvedHealthDamagePerTick: 0,
      statusTickCount: 0,
      statusTickIntervalMs: 0,
    }),
    simulation: Object.freeze({
      mode: scenario.simulation.mode === "expected" ? "expected" : "deterministic",
      timeLimitMs: frozenScenario.simulation.timeLimitMs,
    }),
    metrics: Object.freeze(metrics),
    fingerprintSeed: 0,
  });

  return Object.freeze({ ok: true, value });
}
