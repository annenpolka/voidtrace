// Generated from specs/main.pkl. Do not edit.

/** Immutable reference to one revision of a content-addressed Artifact. */
export type ArtifactRef = {
  /** Stable discriminator of the referenced Artifact kind. */
  readonly "kind": string;
  /** Contract version of the referenced Artifact. */
  readonly "schemaVersion": string;
  /** Stable identity of the referenced Artifact. */
  readonly "id": string;
  /** Non-negative revision of the referenced Artifact. */
  readonly "revision": number;
  /** SHA-256 fingerprint of the referenced Artifact content. */
  readonly "contentHash": string;
  /** Game build of the referenced Artifact. */
  readonly "gameBuild": string;
};

/** Normalized immutable weapon, target, and modifier data for reproducible evaluation. */
export type CatalogSnapshot = {
  /** Schema identifier used to validate this Artifact. */
  readonly "$schema": "urn:voidtrace:schema:catalog-snapshot:0.1.0";
  /** Stable discriminator for this Artifact kind. */
  readonly "kind": "catalog-snapshot";
  /** Version of this Artifact contract. */
  readonly "schemaVersion": "0.1.0";
  /** Stable identity of this Artifact. */
  readonly "id": string;
  /** Non-negative immutable revision of this Artifact. */
  readonly "revision": number;
  /** Optional Artifact revision from which this Artifact was derived. */
  readonly "createdFrom"?: ArtifactRef & { readonly "kind": "catalog-snapshot" };
  /** SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. */
  readonly "contentHash": string;
  /** Game build against which this Artifact is defined. */
  readonly "gameBuild": string;
  /** Explicit provenance of the normalized data. */
  readonly "source": {
    /** Origin classification for this normalized CatalogSnapshot. */
    readonly "kind": "fixture" | "public-export" | "community" | "manual";
    /** Human-readable provenance note; not a mechanics claim. */
    readonly "description": string;
  };
  /** Normalized weapon definitions. */
  readonly "weapons": ReadonlyArray<{
    /** Stable Catalog identity of this weapon. */
    readonly "id": string;
    /** Human-readable weapon label. */
    readonly "label": string;
    /** One or more normalized attack modes owned by this weapon. */
    readonly "attackModes": ReadonlyArray<{
      /** Stable Catalog identity of this attack mode. */
      readonly "id": string;
      /** Human-readable attack-mode label. */
      readonly "label": string;
      /** Normalized delivery category; geometry remains resolved input. */
      readonly "delivery": "hitscan" | "projectile" | "beam" | "radial" | "melee";
      /** Non-negative base Damage Vector keyed by stable damage-type identity. */
      readonly "baseDamage": Readonly<Record<string, number>>;
      /** Normalized non-negative critical chance where 1.0 is 100 percent. */
      readonly "criticalChance": number;
      /** Critical damage multiplier before build modifiers. */
      readonly "criticalMultiplier": number;
    }>;
  }>;
  /** Normalized target definitions. */
  readonly "targets": ReadonlyArray<{
    /** Stable Catalog identity of this target. */
    readonly "id": string;
    /** Human-readable target label. */
    readonly "label": string;
    /** Non-negative normalized base Health. */
    readonly "baseHealth": number;
    /** Non-negative normalized base Shield. */
    readonly "baseShield": number;
    /** Non-negative normalized base Armor. */
    readonly "baseArmor": number;
    /** Non-negative normalized base Overguard. */
    readonly "baseOverguard": number;
  }>;
  /** Normalized modifier definitions, whether supported or not. */
  readonly "mods": ReadonlyArray<{
    /** Stable Catalog identity of this mod. */
    readonly "id": string;
    /** Human-readable mod label. */
    readonly "label": string;
    /** One or more normalized effects; Catalog presence does not imply Kernel support. */
    readonly "effects": ReadonlyArray<{
      /** Stable normalized stat identity affected by this Catalog entry. */
      readonly "stat": string;
      /** Finite normalized modifier operation; execution semantics belong to Rules. */
      readonly "operation": "add" | "multiply";
      /** Finite normalized modifier value. */
      readonly "value": number;
    }>;
  }>;
};

/** Complete immutable input fingerprint for a reproducible execution. */
export type Fingerprint = {
  /** Version of the product that requested the evaluation. */
  readonly "productVersion": string;
  /** Version of the engine that produced the Result. */
  readonly "engineVersion": string;
  /** Version of the Scenario contract consumed by the engine. */
  readonly "scenarioSchemaVersion": string;
  /** Content hash of the CatalogSnapshot used for evaluation. */
  readonly "catalogHash": string;
  /** Content hash of the Ruleset used for evaluation. */
  readonly "rulesetHash": string;
  /** Content hash of the Scenario used for evaluation. */
  readonly "scenarioHash": string;
  /** Non-negative deterministic random seed used for evaluation. */
  readonly "seed": number;
  /** SHA-256 of the canonical Fingerprint object excluding this resultHash field. */
  readonly "resultHash": string;
};

/** Versioned evaluation output with explicit provenance, coverage, and limitations. */
export type Result = {
  /** Schema identifier used to validate this Artifact. */
  readonly "$schema": "urn:voidtrace:schema:result:0.1.0";
  /** Stable discriminator for this Artifact kind. */
  readonly "kind": "voidtrace.result";
  /** Version of this Artifact contract. */
  readonly "schemaVersion": "0.1.0";
  /** Stable identity of this Artifact. */
  readonly "id": string;
  /** Non-negative immutable revision of this Artifact. */
  readonly "revision": number;
  /** Optional Artifact revision from which this Artifact was derived. */
  readonly "createdFrom"?: ArtifactRef & { readonly "kind": "voidtrace.result" };
  /** SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. */
  readonly "contentHash": string;
  /** Game build against which this Artifact is defined. */
  readonly "gameBuild": string;
  /** Scenario revision evaluated to produce this Result. */
  readonly "scenarioRef": ArtifactRef & { readonly "kind": "voidtrace.scenario" };
  /** Immutable input fingerprint for the execution that produced this Result. */
  readonly "fingerprint": Fingerprint;
  /** Evidence and support classification of mechanics affecting this Result. */
  readonly "coverage": {
    /** Mechanic identifiers covered by verified rules. */
    readonly "verified": ReadonlyArray<string>;
    /** Mechanic identifiers covered by experimental rules. */
    readonly "experimental": ReadonlyArray<string>;
    /** Mechanic identifiers whose interpretation remains disputed. */
    readonly "disputed": ReadonlyArray<string>;
    /** Mechanic identifiers explicitly excluded from this Result. */
    readonly "unsupported": ReadonlyArray<string>;
    /** Mechanic identifiers evaluated with an explicit approximation. */
    readonly "approximated": ReadonlyArray<string>;
  };
  /** Computed scalar metrics keyed by stable metric identifier. */
  readonly "metrics": Readonly<Record<string, number>>;
  /** Non-negative damage totals keyed by stable source identifier. */
  readonly "damageBySource": Readonly<Record<string, number>>;
  /** Non-negative damage totals keyed by stable damage-type identifier. */
  readonly "damageByType": Readonly<Record<string, number>>;
  /** Every default resolved during evaluation, represented as explicit scalar values. */
  readonly "resolvedDefaults": Readonly<Record<string, string | number | boolean | null>>;
  /** Assumptions that qualify interpretation of this Result. */
  readonly "assumptions": ReadonlyArray<{
    /** Stable identifier of the assumption. */
    readonly "id": string;
    /** Evidence status qualifying this assumption. */
    readonly "status": "verified" | "experimental" | "disputed" | "unsupported" | "approximated";
    /** Estimated impact of the assumption on the Result. */
    readonly "impact": "low" | "medium" | "high";
    /** Human-readable statement of the assumption. */
    readonly "description": string;
  }>;
  /** Structured warnings emitted without silently changing mechanics. */
  readonly "warnings": ReadonlyArray<{
    /** Stable machine-readable warning code. */
    readonly "code": string;
    /** Human-readable warning message. */
    readonly "message": string;
    /** Optional JSON Pointer locating the input or output that caused the warning. */
    readonly "pointer"?: string;
  }>;
  /** Optional reference to the causal Trace produced with this Result. */
  readonly "traceRef"?: ArtifactRef & { readonly "kind": "voidtrace.trace" };
};

/** Generated finite Rule IR interpreted by the Kernel-facing Rules package. */
export type Ruleset = {
  /** Schema identifier used to validate this Artifact. */
  readonly "$schema": "urn:voidtrace:schema:ruleset:0.1.0";
  /** Stable discriminator for this Artifact kind. */
  readonly "kind": "ruleset";
  /** Version of this Artifact contract. */
  readonly "schemaVersion": "0.1.0";
  /** Stable identity of this Artifact. */
  readonly "id": string;
  /** Non-negative immutable revision of this Artifact. */
  readonly "revision": number;
  /** Optional Artifact revision from which this Artifact was derived. */
  readonly "createdFrom"?: ArtifactRef & { readonly "kind": "ruleset" };
  /** SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. */
  readonly "contentHash": string;
  /** Game build against which this Artifact is defined. */
  readonly "gameBuild": string;
  /** Ordered finite Rule IR. */
  readonly "rules": ReadonlyArray<{
    /** Stable normative Rule identity. */
    readonly "id": string;
    /** Human-readable normative operation semantics. */
    readonly "description": string;
    /** Finite execution phase. */
    readonly "phase": "damage.construct" | "critical.resolve" | "target.mitigate" | "damage.commit";
    /** Stable event discriminator matched by this Rule. */
    readonly "eventKind": string;
    /** Declared scalar or vector paths read by this Rule. */
    readonly "reads": ReadonlyArray<string>;
    /** Declared scalar or vector paths written by this Rule. */
    readonly "writes": ReadonlyArray<string>;
    /** Finite executable operation selected by this Rule. */
    readonly "operation": {
      /** Copy the input base Damage Vector into event damage. */
      readonly "kind": "damage-vector.copy";
    } | {
      /** Scale by the finite deterministic fixed-tier Critical rule. */
      readonly "kind": "damage-vector.scale-fixed-critical";
      /** Fixed Critical tier matched by this Rule. */
      readonly "requiredTier": number;
    } | {
      /** Scale by constant divided by resolved Armor plus constant. */
      readonly "kind": "damage-vector.scale-standard-armor";
      /** Positive denominator constant in the standard Armor formula. */
      readonly "constant": number;
    } | {
      /** Commit final event damage to the resolved Health layer. */
      readonly "kind": "damage.commit-health";
    };
    /** Game-mechanics evidence status, independent of implementation maturity. */
    readonly "evidenceStatus": "verified" | "experimental" | "disputed" | "unsupported" | "approximated";
    /** Evidence identities supporting or qualifying this Rule. */
    readonly "evidenceIds": ReadonlyArray<string>;
  }>;
};

/** Immutable, reproducible evaluation input with explicit structured extension points. */
export type Scenario = {
  /** Schema identifier used to validate this Artifact. */
  readonly "$schema": "urn:voidtrace:schema:scenario:0.1.0";
  /** Stable discriminator for this Artifact kind. */
  readonly "kind": "voidtrace.scenario";
  /** Version of this Artifact contract. */
  readonly "schemaVersion": "0.1.0";
  /** Stable identity of this Artifact. */
  readonly "id": string;
  /** Non-negative immutable revision of this Artifact. */
  readonly "revision": number;
  /** Optional Artifact revision from which this Artifact was derived. */
  readonly "createdFrom"?: ArtifactRef & { readonly "kind": "voidtrace.scenario" };
  /** SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. */
  readonly "contentHash": string;
  /** Game build against which this Artifact is defined. */
  readonly "gameBuild": string;
  /** CatalogSnapshot revision used to resolve Scenario identities. */
  readonly "catalogRef": ArtifactRef & { readonly "kind": "catalog-snapshot" };
  /** Ruleset revision used to evaluate this Scenario. */
  readonly "rulesetRef": ArtifactRef & { readonly "kind": "ruleset" };
  /** Structured attacker input without embedded mechanics interpretation. */
  readonly "attacker": {
    /** Scenario-local stable identity of the configured actor. */
    readonly "id": string;
    /** Flat, explicit scalar configuration interpreted by later domain contracts. */
    readonly "configuration": Readonly<Record<string, string | number | boolean | null>>;
  };
  /** One or more structured target inputs. */
  readonly "targets": ReadonlyArray<{
    /** Scenario-local stable identity of the configured target. */
    readonly "id": string;
    /** Flat, explicit scalar target configuration interpreted by later domain contracts. */
    readonly "configuration": Readonly<Record<string, string | number | boolean | null>>;
  }>;
  /** Explicit flat scalar state present before the first action. */
  readonly "initialState": Readonly<Record<string, string | number | boolean | null>>;
  /** Ordered, non-empty sequence of structured action inputs. */
  readonly "actionPlan": ReadonlyArray<{
    /** Scenario-local stable identity of this action step. */
    readonly "id": string;
    /** Domain action discriminator resolved by a later action contract. */
    readonly "kind": string;
    /** Flat, explicit scalar parameters for this action. */
    readonly "parameters": Readonly<Record<string, string | number | boolean | null>>;
  }>;
  /** Bounded evaluation mode with no hidden random defaults. */
  readonly "simulation": {
    /** Evaluate fixed outcomes without probabilistic aggregation. */
    readonly "mode": "deterministic";
    /** Positive execution time horizon in milliseconds. */
    readonly "timeLimitMs": number;
  } | {
    /** Evaluate supported probabilistic behavior as expected values. */
    readonly "mode": "expected";
    /** Positive execution time horizon in milliseconds. */
    readonly "timeLimitMs": number;
  } | {
    /** Evaluate probabilistic behavior with deterministic seeded trials. */
    readonly "mode": "monte-carlo";
    /** Non-negative deterministic random seed. */
    readonly "seed": number;
    /** Positive number of Monte Carlo trials. */
    readonly "iterations": number;
    /** Positive execution time horizon in milliseconds. */
    readonly "timeLimitMs": number;
  };
  /** Non-empty list of requested metric identifiers. */
  readonly "metrics": ReadonlyArray<string>;
  /** Explicit assumptions that qualify evaluation of this Scenario. */
  readonly "assumptions": ReadonlyArray<{
    /** Stable identifier of an explicit Scenario assumption. */
    readonly "id": string;
    /** Human-readable statement of the explicit assumption. */
    readonly "description": string;
  }>;
};

/** Ordered causal record that distinguishes applied rules from rejected candidates. */
export type Trace = {
  /** Schema identifier used to validate this Artifact. */
  readonly "$schema": "urn:voidtrace:schema:trace:0.1.0";
  /** Stable discriminator for this Artifact kind. */
  readonly "kind": "voidtrace.trace";
  /** Version of this Artifact contract. */
  readonly "schemaVersion": "0.1.0";
  /** Stable identity of this Artifact. */
  readonly "id": string;
  /** Non-negative immutable revision of this Artifact. */
  readonly "revision": number;
  /** Optional Artifact revision from which this Artifact was derived. */
  readonly "createdFrom"?: ArtifactRef & { readonly "kind": "voidtrace.trace" };
  /** SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. */
  readonly "contentHash": string;
  /** Game build against which this Artifact is defined. */
  readonly "gameBuild": string;
  /** Scenario revision whose evaluation produced this Trace. */
  readonly "scenarioRef": ArtifactRef & { readonly "kind": "voidtrace.scenario" };
  /** Immutable input fingerprint shared with the associated Result. */
  readonly "fingerprint": Fingerprint;
  /** Trace detail level requested for this Artifact. */
  readonly "level": "none" | "summary" | "rules" | "full";
  /** Ordered applied and rejected rule decisions. */
  readonly "decisions": ReadonlyArray<{
    /** Discriminator stating whether this rule decision was applied or rejected. */
    readonly "outcome": "applied";
    /** Stable non-negative order of this decision within the Trace. */
    readonly "sequence": number;
    /** Stable identity of the event examined by this rule. */
    readonly "eventId": string;
    /** Optional causal parent of the examined event. */
    readonly "parentEventId"?: string;
    /** Non-negative logical event time in milliseconds. */
    readonly "eventTimeMs": number;
    /** Stable rule phase in which the decision was made. */
    readonly "phase": string;
    /** Stable identity of the evaluated rule. */
    readonly "ruleId": string;
    /** Flat scalar values read while evaluating the rule. */
    readonly "reads": Readonly<Record<string, string | number | boolean | null>>;
    /** Evidence status of the rule at evaluation time. */
    readonly "evidenceStatus": "verified" | "experimental" | "disputed" | "unsupported" | "approximated";
    /** Stable evidence identifiers supporting or qualifying the rule. */
    readonly "evidenceIds": ReadonlyArray<string>;
    /** Applied decisions always matched their event predicate. */
    readonly "matched": true;
    /** One or more structured operations emitted by the rule. */
    readonly "operations": ReadonlyArray<{
      /** Stable operation discriminator. */
      readonly "kind": string;
      /** Flat scalar parameters applied by the operation. */
      readonly "parameters": Readonly<Record<string, string | number | boolean | null>>;
    }>;
    /** Flat scalar state projection captured before applying operations. */
    readonly "before": Readonly<Record<string, string | number | boolean | null>>;
    /** Flat scalar state projection captured after applying operations. */
    readonly "after": Readonly<Record<string, string | number | boolean | null>>;
  } | {
    /** Discriminator stating whether this rule decision was applied or rejected. */
    readonly "outcome": "rejected";
    /** Stable non-negative order of this decision within the Trace. */
    readonly "sequence": number;
    /** Stable identity of the event examined by this rule. */
    readonly "eventId": string;
    /** Optional causal parent of the examined event. */
    readonly "parentEventId"?: string;
    /** Non-negative logical event time in milliseconds. */
    readonly "eventTimeMs": number;
    /** Stable rule phase in which the decision was made. */
    readonly "phase": string;
    /** Stable identity of the evaluated rule. */
    readonly "ruleId": string;
    /** Flat scalar values read while evaluating the rule. */
    readonly "reads": Readonly<Record<string, string | number | boolean | null>>;
    /** Evidence status of the rule at evaluation time. */
    readonly "evidenceStatus": "verified" | "experimental" | "disputed" | "unsupported" | "approximated";
    /** Stable evidence identifiers supporting or qualifying the rule. */
    readonly "evidenceIds": ReadonlyArray<string>;
    /** Stage at which this rule decision was rejected. */
    readonly "rejectionStage": "predicate";
    /** Structured explanation of why the rule was not applied. */
    readonly "rejectionReason": {
      /** Stable machine-readable rejection code. */
      readonly "code": string;
      /** Human-readable explanation of the rejection. */
      readonly "message": string;
    };
    /** Predicate rejection means the event predicate did not match. */
    readonly "matched": false;
  } | {
    /** Discriminator stating whether this rule decision was applied or rejected. */
    readonly "outcome": "rejected";
    /** Stable non-negative order of this decision within the Trace. */
    readonly "sequence": number;
    /** Stable identity of the event examined by this rule. */
    readonly "eventId": string;
    /** Optional causal parent of the examined event. */
    readonly "parentEventId"?: string;
    /** Non-negative logical event time in milliseconds. */
    readonly "eventTimeMs": number;
    /** Stable rule phase in which the decision was made. */
    readonly "phase": string;
    /** Stable identity of the evaluated rule. */
    readonly "ruleId": string;
    /** Flat scalar values read while evaluating the rule. */
    readonly "reads": Readonly<Record<string, string | number | boolean | null>>;
    /** Evidence status of the rule at evaluation time. */
    readonly "evidenceStatus": "verified" | "experimental" | "disputed" | "unsupported" | "approximated";
    /** Stable evidence identifiers supporting or qualifying the rule. */
    readonly "evidenceIds": ReadonlyArray<string>;
    /** Stage at which this rule decision was rejected. */
    readonly "rejectionStage": "guard";
    /** Structured explanation of why the rule was not applied. */
    readonly "rejectionReason": {
      /** Stable machine-readable rejection code. */
      readonly "code": string;
      /** Human-readable explanation of the rejection. */
      readonly "message": string;
    };
    /** Guard rejection occurs only after the event predicate matched. */
    readonly "matched": true;
    /** Guard rejection records the failed guard result. */
    readonly "guardResult": false;
  } | {
    /** Discriminator stating whether this rule decision was applied or rejected. */
    readonly "outcome": "rejected";
    /** Stable non-negative order of this decision within the Trace. */
    readonly "sequence": number;
    /** Stable identity of the event examined by this rule. */
    readonly "eventId": string;
    /** Optional causal parent of the examined event. */
    readonly "parentEventId"?: string;
    /** Non-negative logical event time in milliseconds. */
    readonly "eventTimeMs": number;
    /** Stable rule phase in which the decision was made. */
    readonly "phase": string;
    /** Stable identity of the evaluated rule. */
    readonly "ruleId": string;
    /** Flat scalar values read while evaluating the rule. */
    readonly "reads": Readonly<Record<string, string | number | boolean | null>>;
    /** Evidence status of the rule at evaluation time. */
    readonly "evidenceStatus": "verified" | "experimental" | "disputed" | "unsupported" | "approximated";
    /** Stable evidence identifiers supporting or qualifying the rule. */
    readonly "evidenceIds": ReadonlyArray<string>;
    /** Stage at which this rule decision was rejected. */
    readonly "rejectionStage": "operation";
    /** Structured explanation of why the rule was not applied. */
    readonly "rejectionReason": {
      /** Stable machine-readable rejection code. */
      readonly "code": string;
      /** Human-readable explanation of the rejection. */
      readonly "message": string;
    };
    /** Operation rejection occurs only after the event predicate matched. */
    readonly "matched": true;
  }>;
};
export type ContractId = "artifact-ref" | "catalog-snapshot" | "fingerprint" | "result" | "ruleset" | "scenario" | "trace";

export type ContractById = {
  readonly "artifact-ref": ArtifactRef;
  readonly "catalog-snapshot": CatalogSnapshot;
  readonly "fingerprint": Fingerprint;
  readonly "result": Result;
  readonly "ruleset": Ruleset;
  readonly "scenario": Scenario;
  readonly "trace": Trace;
};
