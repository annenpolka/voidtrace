<!-- Generated from specs/main.pkl. Do not edit. -->

# Artifact contracts

These contracts are generated from the finite Contract IR imported by `specs/main.pkl`.
JSON Schema is the runtime authority; generated TypeScript is its static projection.
Objects reject undeclared properties, and validators do not coerce or insert defaults.

## ArtifactRef

- Contract ID: `artifact-ref`
- Schema ID: `urn:voidtrace:schema:artifact-ref:0.1.0`
- Schema version: `0.1.0`

Immutable reference to one revision of a content-addressed Artifact.

| Field | Presence | Meaning |
| --- | --- | --- |
| `kind` | required | Stable discriminator of the referenced Artifact kind. |
| `schemaVersion` | required | Contract version of the referenced Artifact. |
| `id` | required | Stable identity of the referenced Artifact. |
| `revision` | required | Non-negative revision of the referenced Artifact. |
| `contentHash` | required | SHA-256 fingerprint of the referenced Artifact content. |
| `gameBuild` | required | Game build of the referenced Artifact. |

## CatalogSnapshot

- Contract ID: `catalog-snapshot`
- Schema ID: `urn:voidtrace:schema:catalog-snapshot:0.1.0`
- Schema version: `0.1.0`

Normalized immutable weapon, target, and modifier data for reproducible evaluation.

| Field | Presence | Meaning |
| --- | --- | --- |
| `$schema` | required | Schema identifier used to validate this Artifact. |
| `kind` | required | Stable discriminator for this Artifact kind. |
| `schemaVersion` | required | Version of this Artifact contract. |
| `id` | required | Stable identity of this Artifact. |
| `revision` | required | Non-negative immutable revision of this Artifact. |
| `createdFrom` | optional | Optional Artifact revision from which this Artifact was derived. |
| `contentHash` | required | SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. |
| `gameBuild` | required | Game build against which this Artifact is defined. |
| `source` | required | Explicit provenance of the normalized data. |
| `weapons` | required | Normalized weapon definitions. |
| `targets` | required | Normalized target definitions. |
| `mods` | required | Normalized modifier definitions, whether supported or not. |

## Fingerprint

- Contract ID: `fingerprint`
- Schema ID: `urn:voidtrace:schema:fingerprint:0.1.0`
- Schema version: `0.1.0`

Complete immutable input fingerprint for a reproducible execution.

| Field | Presence | Meaning |
| --- | --- | --- |
| `productVersion` | required | Version of the product that requested the evaluation. |
| `engineVersion` | required | Version of the engine that produced the Result. |
| `scenarioSchemaVersion` | required | Version of the Scenario contract consumed by the engine. |
| `catalogHash` | required | Content hash of the CatalogSnapshot used for evaluation. |
| `rulesetHash` | required | Content hash of the Ruleset used for evaluation. |
| `scenarioHash` | required | Content hash of the Scenario used for evaluation. |
| `seed` | required | Non-negative deterministic random seed used for evaluation. |
| `resultHash` | required | SHA-256 of the canonical Fingerprint object excluding this resultHash field. |

## Problem

- Contract ID: `problem`
- Schema ID: `urn:voidtrace:schema:problem:0.1.0`
- Schema version: `0.1.0`

Structured application failure whose stable classification determines the process exit status.

| Field | Presence | Meaning |
| --- | --- | --- |
| `kind` | required | Stable discriminator for a VoidTrace application failure. |
| `schemaVersion` | required | Version of this Problem contract. |
| `code` | required | Stable machine-readable failure code. |
| `message` | required | Non-empty diagnostic suitable for a human or agent. |
| `classification` | required | Stable failure class that determines the process exit status. |
| `pointer` | optional | Optional JSON Pointer locating the rejected input. |
| `mechanicId` | optional | Optional stable identifier of the unsupported or failed mechanic. |
| `causeCode` | optional | Optional stable code from the delegated application failure. |
| `source` | optional | Optional non-empty source identifier associated with input loading. |

## Result

- Contract ID: `result`
- Schema ID: `urn:voidtrace:schema:result:0.1.0`
- Schema version: `0.1.0`

Versioned evaluation output with explicit provenance, coverage, and limitations.

| Field | Presence | Meaning |
| --- | --- | --- |
| `$schema` | required | Schema identifier used to validate this Artifact. |
| `kind` | required | Stable discriminator for this Artifact kind. |
| `schemaVersion` | required | Version of this Artifact contract. |
| `id` | required | Stable identity of this Artifact. |
| `revision` | required | Non-negative immutable revision of this Artifact. |
| `createdFrom` | optional | Optional Artifact revision from which this Artifact was derived. |
| `contentHash` | required | SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. |
| `gameBuild` | required | Game build against which this Artifact is defined. |
| `scenarioRef` | required | Scenario revision evaluated to produce this Result. |
| `fingerprint` | required | Immutable input fingerprint for the execution that produced this Result. |
| `coverage` | required | Evidence and support classification of mechanics affecting this Result. |
| `metrics` | required | Computed scalar metrics keyed by stable metric identifier. |
| `damageBySource` | required | Non-negative damage totals keyed by stable source identifier. |
| `damageByType` | required | Non-negative damage totals keyed by stable damage-type identifier. |
| `resolvedDefaults` | required | Every default resolved during evaluation, represented as explicit scalar values. |
| `assumptions` | required | Assumptions that qualify interpretation of this Result. |
| `warnings` | required | Structured warnings emitted without silently changing mechanics. |
| `traceRef` | optional | Optional reference to the causal Trace produced with this Result. |

## Ruleset

- Contract ID: `ruleset`
- Schema ID: `urn:voidtrace:schema:ruleset:0.2.0`
- Schema version: `0.2.0`

Generated finite Rule IR interpreted by the Kernel-facing Rules package.

| Field | Presence | Meaning |
| --- | --- | --- |
| `$schema` | required | Schema identifier used to validate this Artifact. |
| `kind` | required | Stable discriminator for this Artifact kind. |
| `schemaVersion` | required | Version of this Artifact contract. |
| `id` | required | Stable identity of this Artifact. |
| `revision` | required | Non-negative immutable revision of this Artifact. |
| `createdFrom` | optional | Optional Artifact revision from which this Artifact was derived. |
| `contentHash` | required | SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. |
| `gameBuild` | required | Game build against which this Artifact is defined. |
| `rules` | required | Ordered finite Rule IR. |

## Scenario

- Contract ID: `scenario`
- Schema ID: `urn:voidtrace:schema:scenario:0.1.0`
- Schema version: `0.1.0`

Immutable, reproducible evaluation input with explicit structured extension points.

| Field | Presence | Meaning |
| --- | --- | --- |
| `$schema` | required | Schema identifier used to validate this Artifact. |
| `kind` | required | Stable discriminator for this Artifact kind. |
| `schemaVersion` | required | Version of this Artifact contract. |
| `id` | required | Stable identity of this Artifact. |
| `revision` | required | Non-negative immutable revision of this Artifact. |
| `createdFrom` | optional | Optional Artifact revision from which this Artifact was derived. |
| `contentHash` | required | SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. |
| `gameBuild` | required | Game build against which this Artifact is defined. |
| `catalogRef` | required | CatalogSnapshot revision used to resolve Scenario identities. |
| `rulesetRef` | required | Ruleset revision used to evaluate this Scenario. |
| `attacker` | required | Structured attacker input without embedded mechanics interpretation. |
| `targets` | required | One or more structured target inputs. |
| `initialState` | required | Explicit flat scalar state present before the first action. |
| `actionPlan` | required | Ordered, non-empty sequence of structured action inputs. |
| `simulation` | required | Bounded evaluation mode with no hidden random defaults. |
| `metrics` | required | Non-empty list of requested metric identifiers. |
| `assumptions` | required | Explicit assumptions that qualify evaluation of this Scenario. |

## Trace

- Contract ID: `trace`
- Schema ID: `urn:voidtrace:schema:trace:0.1.0`
- Schema version: `0.1.0`

Ordered causal record that distinguishes applied rules from rejected candidates.

| Field | Presence | Meaning |
| --- | --- | --- |
| `$schema` | required | Schema identifier used to validate this Artifact. |
| `kind` | required | Stable discriminator for this Artifact kind. |
| `schemaVersion` | required | Version of this Artifact contract. |
| `id` | required | Stable identity of this Artifact. |
| `revision` | required | Non-negative immutable revision of this Artifact. |
| `createdFrom` | optional | Optional Artifact revision from which this Artifact was derived. |
| `contentHash` | required | SHA-256 fingerprint of the canonical Artifact excluding this top-level contentHash field. |
| `gameBuild` | required | Game build against which this Artifact is defined. |
| `scenarioRef` | required | Scenario revision whose evaluation produced this Trace. |
| `fingerprint` | required | Immutable input fingerprint shared with the associated Result. |
| `level` | required | Trace detail level requested for this Artifact. |
| `decisions` | required | Ordered applied and rejected rule decisions. |
