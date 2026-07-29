import {
  isStableId,
  type Ruleset,
  type ValidationIssue,
  validateContract,
  verifyArtifactContentHash,
} from "@voidtrace/contracts";
import coreRuleset from "@voidtrace/spec-artifacts/rulesets/core" with { type: "json" };
import { RulesError } from "./errors.ts";
import {
  executeRule,
  type RuleContext,
  type RuleDefinition,
  type RuleExecution,
  type RuleOperationKind,
  type RulePhase,
} from "./execution.ts";

export type LoadedRuleset = {
  readonly snapshot: Ruleset;
  resolveRule(id: string): RuleDefinition;
  executeRule(id: string, context: RuleContext): RuleExecution;
};

export type EmptyRuleset = {
  readonly id: "ruleset.empty";
  readonly version: "0.1.0";
  readonly rules: readonly never[];
};

export const EMPTY_RULESET: EmptyRuleset = Object.freeze({
  id: "ruleset.empty",
  version: "0.1.0",
  rules: Object.freeze([]),
});

type OperationDeclaration = {
  readonly phase: RulePhase;
  readonly eventKind: string;
  readonly reads: ReadonlyArray<string>;
  readonly writes: ReadonlyArray<string>;
};

const PHASES = [
  "damage.construct",
  "critical.roll",
  "critical.resolve",
  "target.mitigate",
  "damage.commit",
] as const satisfies ReadonlyArray<RulePhase>;

const PHASE_ORDER = new Map<RulePhase, number>(PHASES.map((phase, index) => [phase, index]));

const OPERATION_DECLARATIONS = {
  "damage-vector.copy": {
    phase: "damage.construct",
    eventKind: "damage.direct",
    reads: ["attack.base-damage"],
    writes: ["event.damage"],
  },
  "critical-tier.resolve-binary-roll": {
    phase: "critical.roll",
    eventKind: "damage.direct",
    reads: ["attack.critical-chance", "event.critical-roll"],
    writes: [
      "event.critical-tier",
      "event.critical-tier-0-probability",
      "event.critical-tier-1-probability",
    ],
  },
  "damage-vector.scale-fixed-critical": {
    phase: "critical.resolve",
    eventKind: "damage.direct",
    reads: ["event.damage", "event.critical-tier", "attack.critical-multiplier"],
    writes: ["event.damage"],
  },
  "damage-vector.scale-standard-armor": {
    phase: "target.mitigate",
    eventKind: "damage.direct",
    reads: ["event.damage", "target.armor"],
    writes: ["event.damage"],
  },
  "damage.commit-health": {
    phase: "damage.commit",
    eventKind: "damage.direct",
    reads: ["event.damage", "target.health"],
    writes: ["target.health"],
  },
} as const satisfies Record<RuleOperationKind, OperationDeclaration>;

function formatContractIssues(issues: ReadonlyArray<ValidationIssue>): string {
  return issues.map((issue) => `${issue.instancePath || "/"}: ${issue.message}`).join("; ");
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

function sameValues(actual: ReadonlyArray<string>, expected: ReadonlyArray<string>): boolean {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function assertNoDuplicateValues(
  rule: RuleDefinition,
  field: "reads" | "writes" | "evidenceIds",
): void {
  const values = rule[field];
  if (new Set(values).size !== values.length) {
    throw new RulesError(
      "operation-declaration-invalid",
      `Rule ${rule.id} declares duplicate ${field}`,
      { field, ruleId: rule.id },
    );
  }
}

function assertFiniteOperation(rule: RuleDefinition): void {
  const operation = rule.operation as {
    readonly kind: string;
    readonly requiredTier?: unknown;
    readonly constant?: unknown;
  };
  switch (operation.kind) {
    case "damage-vector.copy":
    case "critical-tier.resolve-binary-roll":
    case "damage.commit-health":
      return;
    case "damage-vector.scale-fixed-critical":
      if (operation.requiredTier === 0 || operation.requiredTier === 1) {
        return;
      }
      break;
    case "damage-vector.scale-standard-armor":
      if (
        typeof operation.constant === "number" &&
        Number.isFinite(operation.constant) &&
        operation.constant > 0
      ) {
        return;
      }
      break;
  }
  throw new RulesError(
    "operation-declaration-invalid",
    `Rule ${rule.id} does not declare a supported finite operation`,
    { operationKind: operation.kind, ruleId: rule.id },
  );
}

function assertExactOperationDeclaration(rule: RuleDefinition): void {
  assertFiniteOperation(rule);
  const expected = OPERATION_DECLARATIONS[rule.operation.kind];
  if (
    rule.phase !== expected.phase ||
    rule.eventKind !== expected.eventKind ||
    !sameValues(rule.reads, expected.reads) ||
    !sameValues(rule.writes, expected.writes)
  ) {
    throw new RulesError(
      "operation-declaration-invalid",
      `Rule ${rule.id} does not exactly declare the inputs, outputs, event, and phase of ${rule.operation.kind}`,
      { operationKind: rule.operation.kind, ruleId: rule.id },
    );
  }
  assertNoDuplicateValues(rule, "reads");
  assertNoDuplicateValues(rule, "writes");
  assertNoDuplicateValues(rule, "evidenceIds");
}

export async function loadRuleset(value: unknown = coreRuleset): Promise<LoadedRuleset> {
  const validation = validateContract("ruleset", value);
  if (!validation.ok) {
    throw new RulesError(
      "contract-invalid",
      `Ruleset contract validation failed: ${formatContractIssues(validation.issues)}`,
      { issueCount: validation.issues.length },
    );
  }

  const snapshot = validation.value;
  const rules = new Map<string, RuleDefinition>();
  let previousPhase = -1;
  for (const rule of snapshot.rules) {
    if (rules.has(rule.id) || rule.id === snapshot.id) {
      throw new RulesError("duplicate-rule-id", `Duplicate Ruleset ID: ${rule.id}`, {
        ruleId: rule.id,
      });
    }

    const phase = PHASE_ORDER.get(rule.phase);
    if (phase === undefined || phase < previousPhase) {
      throw new RulesError(
        "phase-order-invalid",
        `Ruleset phase order regressed at rule ${rule.id}: ${rule.phase}`,
        { phase: rule.phase, ruleId: rule.id },
      );
    }
    previousPhase = phase;
    assertExactOperationDeclaration(rule);
    rules.set(rule.id, rule);
  }

  deepFreeze(snapshot);
  if (!(await verifyArtifactContentHash(snapshot))) {
    throw new RulesError(
      "content-hash-mismatch",
      `Ruleset contentHash does not match canonical content: ${snapshot.id}`,
      { rulesetId: snapshot.id },
    );
  }

  const resolveRule = (id: string): RuleDefinition => {
    if (!isStableId(id)) {
      throw new RulesError("invalid-reference", `Invalid Rule reference: ${String(id)}`);
    }
    const rule = rules.get(id);
    if (rule === undefined) {
      throw new RulesError("invalid-reference", `Unknown Rule ID: ${id}`, { ruleId: id });
    }
    return rule;
  };

  return Object.freeze({
    snapshot,
    resolveRule,
    executeRule: (id: string, context: RuleContext): RuleExecution =>
      executeRule(resolveRule(id), context),
  });
}

export function loadCoreRuleset(): Promise<LoadedRuleset> {
  return loadRuleset(coreRuleset);
}
