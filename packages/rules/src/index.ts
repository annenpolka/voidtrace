export type { Ruleset } from "@voidtrace/contracts";
export { RulesError, type RulesErrorCode, type RulesErrorDetails } from "./errors.ts";
export {
  type AppliedRuleExecution,
  type DamageVector,
  executeRule,
  type PredicateRejectedRuleExecution,
  type RuleContext,
  type RuleDefinition,
  type RuleExecution,
  type RuleOperationKind,
  type RulePhase,
  type RuleStateProjection,
  scaleDamageVector,
  sumDamageVector,
} from "./execution.ts";
export {
  EMPTY_RULESET,
  type EmptyRuleset,
  type LoadedRuleset,
  loadCoreRuleset,
  loadRuleset,
} from "./ruleset.ts";
