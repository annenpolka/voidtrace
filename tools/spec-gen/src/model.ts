import { type ContractDefinition, parseContracts } from "./contract-model.ts";

export const KNOWN_PATTERNS = [
  "scope_boundary",
  "unsupported_mechanic_rejected",
  "deterministic_replay",
  "event_time_monotonic",
  "same_logical_random",
  "damage_vector_identity",
  "damage_total_equals_components",
  "critical_tier_probability_sum",
  "fixed_critical_tier",
  "expected_critical_branches",
  "fixed_multishot_expansion",
  "fixed_pellet_expansion",
  "resolved_radial_falloff",
  "resolved_status_ticks",
  "resolved_punch_through_path",
  "armor_monotonic",
  "armor_formula_example",
  "trace_reconstructs_result",
  "rejected_rule_has_reason",
  "golden_scenario",
  "cli_command_output_selection",
  "cli_deterministic_json",
  "cli_stream_exit_discipline",
  "cli_alias_equivalence",
  "cli_application_boundary",
  "cli_input_surface",
] as const;

export const VERIFICATION_LEVELS = ["property-tested", "example-tested", "manual"] as const;

export const CLAUSE_MATURITIES = ["planned", "active", "retired"] as const;

export const SPEC_AREAS = ["scope", "kernel", "mechanics", "catalog", "cli", "lab"] as const;

export type PatternId = (typeof KNOWN_PATTERNS)[number];
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];
export type ClauseMaturity = (typeof CLAUSE_MATURITIES)[number];
export type SpecArea = (typeof SPEC_AREAS)[number];

export type Clause = {
  id: string;
  pattern: PatternId;
  desc: string;
  guarantee: VerificationLevel;
  maturity: ClauseMaturity;
  area: SpecArea;
};

export const RULE_PHASES = [
  "attack.emit",
  "critical.expected",
  "damage.construct",
  "critical.roll",
  "critical.resolve",
  "damage.radial-falloff",
  "status.tick",
  "target.mitigate",
  "damage.commit",
  "result.aggregate",
] as const;

export const RULE_EVIDENCE_STATUSES = [
  "verified",
  "experimental",
  "disputed",
  "unsupported",
  "approximated",
] as const;

export type RulePhase = (typeof RULE_PHASES)[number];
export type RuleEvidenceStatus = (typeof RULE_EVIDENCE_STATUSES)[number];

export type RuleOperation =
  | {
      kind: "event.expand-fixed-multishot";
      maximumHits: number;
    }
  | {
      kind: "event.expand-fixed-pellets";
      maximumPellets: number;
    }
  | {
      kind: "event.expand-resolved-status-ticks";
      maximumTicks: number;
    }
  | {
      kind: "event.expand-resolved-punch-through-targets";
      maximumTargets: number;
    }
  | {
      kind: "damage-vector.copy";
    }
  | {
      kind: "critical-tier.resolve-tier-roll";
    }
  | {
      kind: "critical-tier.resolve-expected-branches";
    }
  | {
      kind: "damage-vector.scale-critical-tier";
    }
  | {
      kind: "damage-vector.scale-standard-armor";
      constant: number;
    }
  | {
      kind: "damage-vector.scale-resolved-radial-falloff";
    }
  | {
      kind: "damage-vector.copy-resolved-status-tick";
    }
  | {
      kind: "damage.commit-health";
    }
  | {
      kind: "damage-vector.aggregate-weighted-branches";
    }
  | {
      kind: "damage-vector.aggregate-sequential-hits";
    }
  | {
      kind: "damage-vector.aggregate-sequential-pellets";
    }
  | {
      kind: "damage-vector.aggregate-sequential-status-ticks";
    }
  | {
      kind: "damage-vector.aggregate-resolved-punch-through-targets";
    };

export type RuleDefinition = {
  id: string;
  description: string;
  phase: RulePhase;
  eventKind: string;
  reads: string[];
  writes: string[];
  operation: RuleOperation;
  evidenceStatus: RuleEvidenceStatus;
  evidenceIds: string[];
};

export type RulesetDefinition = {
  id: string;
  version: string;
  revision: number;
  gameBuild: string;
  rules: RuleDefinition[];
};

export type SpecDocument = {
  title: string;
  schemaVersion: string;
  clauses: Clause[];
  contracts: ContractDefinition[];
  ruleset: RulesetDefinition;
};

// Contract validation is not a Kernel behavior oracle. Add a pattern here only when
// its independent runner exists and is exercised by `just check`.
export const IMPLEMENTED_ORACLE_PATTERNS: readonly PatternId[] = [
  "unsupported_mechanic_rejected",
  "deterministic_replay",
  "event_time_monotonic",
  "same_logical_random",
  "damage_vector_identity",
  "damage_total_equals_components",
  "critical_tier_probability_sum",
  "fixed_critical_tier",
  "expected_critical_branches",
  "fixed_multishot_expansion",
  "fixed_pellet_expansion",
  "resolved_radial_falloff",
  "resolved_status_ticks",
  "resolved_punch_through_path",
  "armor_monotonic",
  "armor_formula_example",
  "trace_reconstructs_result",
  "rejected_rule_has_reason",
  "golden_scenario",
  "cli_command_output_selection",
  "cli_deterministic_json",
  "cli_stream_exit_discipline",
  "cli_alias_equivalence",
  "cli_application_boundary",
  "cli_input_surface",
];

const CLAUSE_ID = /^[A-Z][A-Z0-9]{2}-\d{3}$/;
const SCHEMA_VERSION = /^\d+\.\d+\.\d+$/;
const STABLE_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value)
    .filter((key) => !allowed.has(key))
    .toSorted();
  if (unknown.length > 0) {
    throw new Error(`Unknown specification key at ${path}: ${unknown[0]}`);
  }
}

function requireString(
  value: unknown,
  path: string,
  predicate: (candidate: string) => boolean = () => true,
): string {
  if (typeof value !== "string" || !predicate(value)) {
    throw new Error(`Invalid specification value at ${path}`);
  }
  return value;
}

function requireFiniteNumber(
  value: unknown,
  path: string,
  predicate: (candidate: number) => boolean = () => true,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
    !predicate(value)
  ) {
    throw new Error(`Invalid specification value at ${path}`);
  }
  return value;
}

function requireStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid specification value at ${path}`);
  }
  const items = value.map((item, index) =>
    requireString(item, `${path}[${index}]`, (candidate) => STABLE_ID.test(candidate)),
  );
  if (new Set(items).size !== items.length) {
    throw new Error(`Duplicate specification value at ${path}`);
  }
  return items;
}

function requireVocabularyValue<const T extends readonly string[]>(
  value: unknown,
  path: string,
  vocabulary: T,
): T[number] {
  const candidate = requireString(value, path);
  if (!vocabulary.includes(candidate)) {
    throw new Error(
      `Unknown value at ${path}: ${candidate}. Expected one of ${vocabulary.join(", ")}`,
    );
  }
  return candidate;
}

function parseClause(value: unknown, index: number): Clause {
  const path = `clauses[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Invalid specification value at ${path}`);
  }
  assertExactKeys(value, ["id", "pattern", "desc", "guarantee", "maturity", "area"], path);

  return {
    id: requireString(value.id, `${path}.id`, (candidate) => CLAUSE_ID.test(candidate)),
    pattern: requireVocabularyValue(value.pattern, `${path}.pattern`, KNOWN_PATTERNS),
    desc: requireString(value.desc, `${path}.desc`, (candidate) => candidate.length > 0),
    guarantee: requireVocabularyValue(value.guarantee, `${path}.guarantee`, VERIFICATION_LEVELS),
    maturity: requireVocabularyValue(value.maturity, `${path}.maturity`, CLAUSE_MATURITIES),
    area: requireVocabularyValue(value.area, `${path}.area`, SPEC_AREAS),
  };
}

function parseRuleOperation(value: unknown, path: string): RuleOperation {
  if (!isRecord(value)) {
    throw new Error(`Invalid specification value at ${path}`);
  }
  const kind = requireString(value.kind, `${path}.kind`);
  switch (kind) {
    case "event.expand-fixed-multishot":
      assertExactKeys(value, ["kind", "maximumHits"], path);
      return {
        kind,
        maximumHits: requireFiniteNumber(
          value.maximumHits,
          `${path}.maximumHits`,
          (candidate) => Number.isInteger(candidate) && candidate > 0,
        ),
      };
    case "event.expand-fixed-pellets":
      assertExactKeys(value, ["kind", "maximumPellets"], path);
      return {
        kind,
        maximumPellets: requireFiniteNumber(
          value.maximumPellets,
          `${path}.maximumPellets`,
          (candidate) => Number.isInteger(candidate) && candidate > 0,
        ),
      };
    case "event.expand-resolved-status-ticks":
      assertExactKeys(value, ["kind", "maximumTicks"], path);
      return {
        kind,
        maximumTicks: requireFiniteNumber(
          value.maximumTicks,
          `${path}.maximumTicks`,
          (candidate) => Number.isInteger(candidate) && candidate > 0,
        ),
      };
    case "event.expand-resolved-punch-through-targets":
      assertExactKeys(value, ["kind", "maximumTargets"], path);
      return {
        kind,
        maximumTargets: requireFiniteNumber(
          value.maximumTargets,
          `${path}.maximumTargets`,
          (candidate) => Number.isInteger(candidate) && candidate > 0,
        ),
      };
    case "damage-vector.copy":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "critical-tier.resolve-tier-roll":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "critical-tier.resolve-expected-branches":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.scale-critical-tier":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.scale-standard-armor":
      assertExactKeys(value, ["kind", "constant"], path);
      return {
        kind,
        constant: requireFiniteNumber(
          value.constant,
          `${path}.constant`,
          (candidate) => candidate > 0,
        ),
      };
    case "damage-vector.scale-resolved-radial-falloff":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.copy-resolved-status-tick":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage.commit-health":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.aggregate-weighted-branches":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.aggregate-sequential-hits":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.aggregate-sequential-pellets":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.aggregate-sequential-status-ticks":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    case "damage-vector.aggregate-resolved-punch-through-targets":
      assertExactKeys(value, ["kind"], path);
      return { kind };
    default:
      throw new Error(`Unknown Rule operation at ${path}: ${kind}`);
  }
}

function parseRuleset(value: unknown): RulesetDefinition {
  const path = "ruleset";
  if (!isRecord(value)) {
    throw new Error(`Invalid specification value at ${path}`);
  }
  assertExactKeys(value, ["id", "version", "revision", "gameBuild", "rules"], path);
  if (!Array.isArray(value.rules) || value.rules.length === 0) {
    throw new Error("Ruleset must contain at least one Rule");
  }
  const rules = value.rules.map((item, index): RuleDefinition => {
    const rulePath = `${path}.rules[${index}]`;
    if (!isRecord(item)) {
      throw new Error(`Invalid specification value at ${rulePath}`);
    }
    assertExactKeys(
      item,
      [
        "id",
        "description",
        "phase",
        "eventKind",
        "reads",
        "writes",
        "operation",
        "evidenceStatus",
        "evidenceIds",
      ],
      rulePath,
    );
    return {
      id: requireString(item.id, `${rulePath}.id`, (candidate) => STABLE_ID.test(candidate)),
      description: requireString(
        item.description,
        `${rulePath}.description`,
        (candidate) => candidate.length > 0,
      ),
      phase: requireVocabularyValue(item.phase, `${rulePath}.phase`, RULE_PHASES),
      eventKind: requireString(item.eventKind, `${rulePath}.eventKind`, (candidate) =>
        STABLE_ID.test(candidate),
      ),
      reads: requireStringArray(item.reads, `${rulePath}.reads`),
      writes: requireStringArray(item.writes, `${rulePath}.writes`),
      operation: parseRuleOperation(item.operation, `${rulePath}.operation`),
      evidenceStatus: requireVocabularyValue(
        item.evidenceStatus,
        `${rulePath}.evidenceStatus`,
        RULE_EVIDENCE_STATUSES,
      ),
      evidenceIds: requireStringArray(item.evidenceIds, `${rulePath}.evidenceIds`),
    };
  });

  const ids = rules.map((rule) => rule.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Ruleset contains duplicate Rule IDs");
  }
  const phaseIndexes = rules.map((rule) => RULE_PHASES.indexOf(rule.phase));
  if (phaseIndexes.some((phase, index) => index > 0 && phase < (phaseIndexes[index - 1] ?? -1))) {
    throw new Error("Ruleset Rules must be ordered by execution phase");
  }

  return {
    id: requireString(value.id, `${path}.id`, (candidate) => STABLE_ID.test(candidate)),
    version: requireString(value.version, `${path}.version`, (candidate) =>
      SCHEMA_VERSION.test(candidate),
    ),
    revision: requireFiniteNumber(
      value.revision,
      `${path}.revision`,
      (candidate) => Number.isInteger(candidate) && candidate >= 0,
    ),
    gameBuild: requireString(
      value.gameBuild,
      `${path}.gameBuild`,
      (candidate) => candidate.length > 0,
    ),
    rules,
  };
}

export function validateSpecDocument(value: unknown): SpecDocument {
  if (!isRecord(value)) {
    throw new Error("Pkl entrypoint did not evaluate to an object");
  }
  assertExactKeys(value, ["title", "schemaVersion", "clauses", "contracts", "ruleset"], "root");
  if (!Array.isArray(value.clauses) || value.clauses.length === 0) {
    throw new Error("Specification must contain at least one Clause");
  }

  const clauses = value.clauses.map(parseClause);
  const ids = new Set<string>();
  for (const clause of clauses) {
    if (ids.has(clause.id)) {
      throw new Error(`Duplicate Clause ID: ${clause.id}`);
    }
    ids.add(clause.id);
    if (
      clause.maturity === "active" &&
      clause.guarantee !== "manual" &&
      !IMPLEMENTED_ORACLE_PATTERNS.includes(clause.pattern)
    ) {
      throw new Error(
        `Clause ${clause.id} cannot be active: no independent ${clause.pattern} oracle is registered`,
      );
    }
  }

  return {
    title: requireString(value.title, "title", (candidate) => candidate.length > 0),
    schemaVersion: requireString(value.schemaVersion, "schemaVersion", (candidate) =>
      SCHEMA_VERSION.test(candidate),
    ),
    clauses: clauses.toSorted((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    ),
    contracts: parseContracts(value.contracts),
    ruleset: parseRuleset(value.ruleset),
  };
}
