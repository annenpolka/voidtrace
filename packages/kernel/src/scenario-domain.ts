import {
  isStableId,
  type Scenario,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";

export const SUPPORTED_METRIC_IDS = Object.freeze([
  "damage.direct-hit.total",
  "critical.roll",
  "critical.tier-0.probability",
  "critical.tier-1.probability",
  "critical.tier",
  "critical.multiplier",
  "damage.post-critical.total",
  "armor.remaining-multiplier",
  "damage.health.total",
  "target.health.remaining",
] as const);

export type SupportedMetricId = (typeof SUPPORTED_METRIC_IDS)[number];

export type ScenarioDomainErrorCode =
  | "contract-invalid"
  | "content-hash-mismatch"
  | "unsupported-simulation-mode"
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
    readonly targetId: string;
    readonly hitLocation: "hit-location.neutral-body";
    readonly damageLayer: "health";
    readonly criticalResolution: "fixed" | "roll";
    readonly criticalTier: 0 | 1 | null;
    readonly criticalRoll: number | null;
  };
  readonly simulation: {
    readonly mode: "deterministic";
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
const ROLLED_CRITICAL_METRIC_IDS: ReadonlySet<SupportedMetricId> = new Set([
  "critical.roll",
  "critical.tier-0.probability",
  "critical.tier-1.probability",
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

  if (scenario.simulation.mode !== "deterministic") {
    return failure(
      "unsupported-simulation-mode",
      "/simulation/mode",
      `Unsupported simulation mode: ${scenario.simulation.mode}`,
      `simulation.${scenario.simulation.mode}`,
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
  if (action.kind !== "action.direct-hit") {
    return failure(
      "unsupported-action-kind",
      "/actionPlan/0/kind",
      `Unsupported action kind: ${action.kind}`,
      action.kind,
    );
  }
  const hasCriticalTier = Object.hasOwn(action.parameters, "criticalTier");
  const hasCriticalRoll = Object.hasOwn(action.parameters, "criticalRoll");
  if (hasCriticalTier === hasCriticalRoll) {
    return failure(
      "invalid-critical-resolution",
      "/actionPlan/0/parameters",
      "Exactly one of criticalTier or criticalRoll is required",
      "mechanic.critical.resolution",
    );
  }
  const criticalResolution = hasCriticalTier ? "fixed" : "roll";
  const actionKeyError = exactKeys(
    action.parameters,
    criticalResolution === "fixed" ? FIXED_CRITICAL_PARAMETER_KEYS : ROLLED_CRITICAL_PARAMETER_KEYS,
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
  let criticalTier: 0 | 1 | null = null;
  let criticalRoll: number | null = null;
  if (criticalResolution === "fixed") {
    const candidate = action.parameters.criticalTier;
    if (!Number.isInteger(candidate) || (candidate !== 0 && candidate !== 1)) {
      return failure(
        "unsupported-critical-tier",
        "/actionPlan/0/parameters/criticalTier",
        `Unsupported fixed Critical tier: ${String(candidate)}`,
        "mechanic.critical.fixed-tier",
      );
    }
    criticalTier = candidate;
  } else {
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
    if (
      criticalResolution === "fixed" &&
      ROLLED_CRITICAL_METRIC_IDS.has(metric as SupportedMetricId)
    ) {
      return failure(
        "unsupported-metric",
        `/metrics/${index}`,
        `Metric ${metric} requires criticalRoll resolution`,
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
      targetId: actionTargetId.value,
      hitLocation: "hit-location.neutral-body",
      damageLayer: "health",
      criticalResolution,
      criticalTier,
      criticalRoll,
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
