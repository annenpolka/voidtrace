export type RuleDefinition = {
  readonly id: string;
  readonly phase: string;
};

export type Ruleset = {
  readonly id: string;
  readonly version: string;
  readonly rules: readonly RuleDefinition[];
};

const EMPTY_RULES: readonly RuleDefinition[] = Object.freeze([]);

export const EMPTY_RULESET = Object.freeze({
  id: "ruleset.empty",
  version: "0.1.0",
  rules: EMPTY_RULES,
} as const satisfies Ruleset);

export type EmptyRuleset = typeof EMPTY_RULESET;
