# VoidTrace agent rules

## Sources of truth

- Normative behavior is authored only in `specs/**/*.pkl`.
- `VoidTrace計画.md` is design history, not executable or normative specification.
- Generated files under `packages/spec-artifacts/` and `docs/generated/` must never be edited manually.
- A behavior change starts with a Rule or Clause change, followed by `just spec-gen`.

## Boundaries

- Runtime code must not silently introduce mechanics absent from the specification.
- Raw catalog data is evidence input, not normative mechanics.
- Verification level and game-mechanics evidence status are separate concepts.
- Unsupported mechanics must be explicit; never treat them as zero-effect behavior.
- Expected values must not be produced by the same evaluator under test.
- Kernel code must remain independent of filesystem, network, UI, and LLM concerns.
- UI code must not duplicate engine semantics.

## Workflow

1. Change Pkl source under `specs/`.
2. Run `just spec-gen`.
3. Review generated documents as a reverse translation of the specification.
4. Implement the handwritten code or oracle.
5. Run `just check`.

The generated specification boundary currently contains 59 active Clauses and 12 versioned public
Contracts. Its coverage is 33 property-tested, 25 example-tested, and one manual Clause.

The current implemented boundary ends at the synthetic Direct Hit / generalized fixed, explicit
roll, or analytic expected Critical / Armor vertical slices plus resolved fixed-count Multishot
and pellets plus resolved target-specific Pellet allocation, standalone resolved Radial falloff,
resolved multi-target Radial, resolved synthetic Status ticks, and resolved fixed-Critical Beam
ticks, backed by Kernel Engine `0.19.0`, generated Ruleset `0.18.0` revision `1`, and their formal
`describe` / `run` / `trace` JSON CLI.
Fixed Critical input is a non-negative safe-integer tier. Explicit-roll and expected resolution
accept non-negative Critical chance only while adjacent tiers are safely representable.
Expected mode evaluates reachable tiers through terminal Health commit before weighting Damage and
remaining Health; it does not emit a realized roll or tier. Resolved Multishot accepts an explicit
positive safe-integer hit count up to 64 and a shared fixed Critical tier, evaluates ordered child
hits against sequential Health, and does not generate a Multishot or per-hit Critical roll. These
Rules remain `experimental` evidence, not verified current-Warframe claims. Resolved pellets accept
an explicit positive safe-integer pellet count up to 64 in a separate action, use a common fixed
Critical tier, and do not compose with Multishot, distribute hits, model Spread, or generate rolls.
Standalone Radial accepts an explicit finite falloff multiplier in `[0, 1]` and a fixed Critical
tier, applies falloff after Critical and before Armor, and does not derive distance, model geometry,
or compose a Direct sibling or Projectile parent. Resolved multi-target Radial accepts 1 to 64
same-impact distance/LoS relations plus explicit synthetic linear falloff bounds, applies the
existing Radial pipeline only to in-range clear-LoS targets, and preserves non-hit target Health.
It does not derive impact coordinates, terrain, LoS, distance, or current-game falloff parameters.
Resolved Direct-plus-Radial impact accepts one configured Direct target and the same resolved
impact-distance/LoS relation set, emits both children under one parent, commits Direct before
Radial on the same target-local World State, and aggregates their Damage separately and together.
When `radialCriticalTier` is omitted, Direct and Radial share the action's fixed `criticalTier`;
when explicit, Radial uses its own non-negative safe-integer fixed tier. When
`radialAttackModeId` is omitted, Direct and Radial share the attacker attack mode; when it is
explicit, Direct and Radial can resolve two attack modes from the same synthetic weapon. It does
not derive a physical Projectile, collision, arbitrary mode composition, generated tiers or
rolls, Status, Multishot, or Pellet composition. As a separate finite slice, `criticalRoll` can
replace `criticalTier` only while Direct and Radial share the primary attack mode. The parent
impact resolves that explicit roll once and every child inherits the resolved tier.
`radialAttackModeId`, `radialCriticalTier`, child-specific rolls, generated randomness, and
expected branches do not combine with this slice.
Resolved Status ticks accept only `status.synthetic-resolved-dot`, explicit final Health damage per
tick, a positive count up to 64, and a positive interval whose last tick fits within
`timeLimitMs`. They do not derive Status application, type, damage, Critical, Armor, stack,
refresh, snapshot, defense changes, expected values, or rolls.
Resolved Beam ticks accept a `beam` delivery attack mode, a fixed non-negative safe-integer
Critical tier, an explicit positive count up to 64, and a positive interval whose last tick fits
within `timeLimitMs`. They evaluate base Damage, Critical, Armor, and terminal Health sequentially
for every tick. They do not derive held duration, ramp, Fire Rate, Magazine, Ammo, Reload, Chain
Beam, per-tick Critical or Status rolls, Status application, expected values, generated randomness,
or current-game Beam formulas.
Scenario Contract `0.3.0` requires an explicit `targetGraph`. It can represent resolved
impact-distance/LoS, ordered punch-through/chain/ricochet relations, and target-specific Pellet
allocation. The current runtime
accepts an empty relation list, one `punch-through`, `ricochet`, or `chain` ordered path referenced
by the matching resolved action, 1 to 64 same-impact distance/LoS relations referenced by a
resolved multi-target Radial action, or all-target allocation relations referenced by a resolved
Pellet allocation action. The impact-distance relation set can instead be referenced by a resolved
Direct-plus-Radial impact that names one configured Direct target. Target-specific terminal Health is recorded in Result
`targetStates`, with aggregate Damage, remaining Health, and defeated count. It does not derive
geometry, collision, wall penetration, attenuation, reflection angles, chain candidate search,
branching, distance, revisit behavior, target selection, or rolls. Every other non-empty Target
Graph is rejected without partial Artifacts.

Experiment Contract `0.3.0` separately accepts one exact Catalog and Ruleset reference, one base
Scenario reference, one primary metric, and exactly one homogeneous list of 1 to 15 ordered
resolved Scenario references, ordinary ScenarioPatch references, or explicit one-axis finite Sweep
points shaped as `{id, patchRef, sweepPoint: {path, value}}`. The three source modes cannot be mixed.
Resolved mode requires the supplied Scenario set to match exactly. Ordinary Patch-backed mode
requires exactly the base Scenario and complete Patch set. Sweep mode additionally requires one
shared allowlisted scalar path, canonically unique finite non-null scalar point values, and one
replace operation in each exact Patch whose path and canonical value match its declaration. Patch
and Sweep modes validate and materialize their complete Patch sets before evaluation, then evaluate
the base and each variant once through the existing single-Scenario Kernel in declaration order.
The base remains a separate Comparison row; an equal-value Sweep point is rejected by the existing
no-op Patch rule. Every mode integrity-checks every Result and Trace and returns Comparison Contract
`0.1.0` with finite metric values and signed `variant - base` deltas. A failure returns no partial
Comparison, point list, materialized Scenario rows, or evaluation rows. Sweep never derives Patch
operations, result Scenario identities, revisions, or hashes from values. Range or step generation,
value sorting or deduplication, multiple axes or Cartesian products, mixed modes, Patch chains,
Ruleset branches, generated randomness, Monte Carlo, ratios, interpolation, parallel execution,
winner or ranking semantics, and statistical uncertainty remain unsupported. This slice is exposed
through `@voidtrace/sdk` and the repository-local operator skill; the formal CLI has no Experiment
command.

FiniteBreakpointAnalysis Contract `0.1.0` composes exactly two complete finite Sweep requests in
one call. Both sides share one Catalog, generated Ruleset, game build, primary metric, allowlisted
Sweep path, point count, and declaration-ordered strictly increasing finite numeric coordinates.
The runtime snapshots the whole request before its first await, preflights and materializes both
sides before any evaluation, evaluates the complete left Sweep and then the complete right Sweep,
and verifies every Comparison, Result, Trace, and common Result fingerprint. It records absolute
left and right metric values and finite `left - right` differences for every declared point. A
unique zero sample yields `exact-equality`, one adjacent non-zero sign change yields
`sampled-sign-reversal`, and no such observation yields `no-observed-candidate`; more than one
candidate fails without an Analysis Artifact. This finite scan does not prove a continuous root or
crossover and does not interpolate, apply tolerance, search or generate points, sort or deduplicate,
infer monotonicity, or assign winner, ranking, or tie semantics. It is exposed only through
`@voidtrace/sdk` and the repository-local operator skill; Kernel, runtime-node, and the formal CLI
remain unchanged.

ScenarioPatch Contract `0.1.0` separately accepts one exact base Scenario reference, one explicit
result Scenario identity pair, and 1 to 64 ordered replace-only operations over allowlisted
existing non-null scalar paths. The materializer snapshots both inputs before awaiting, verifies both Contracts and
content hashes plus the exact base reference and game build, rejects duplicate paths, missing or
non-scalar leaves, kind changes, no-ops, and reuse of the exact base identity, then emits a normal
Scenario with the declared identity, exact base `createdFrom`, and a new verified content hash.
Failure is atomic and returns no partial Scenario. It does not add or remove fields, replace null,
objects, or arrays, implement full RFC 6902, evaluate Damage, synthesize or rehash input, chain
Patch outputs, generate Sweep points, or run Breakpoint or Ruleset branches. This slice is exposed
standalone and through the bounded ordinary Patch-backed and finite Sweep Experiment modes in
`@voidtrace/sdk` and the repository-local operator skill; Kernel, runtime-node, and the formal CLI
remain unchanged.

The repository-local fixture-variation skill accepts non-negative safe-integer fixed tiers and the
repository-local analytic expected preset plus exact resolved and ordinary Patch-backed Scenario
comparisons, the checked-in one-axis Critical-tier Sweep points `0`, `2`, and `3`, the checked-in
two-Sweep finite Breakpoint analysis over those coordinates, and finite Scenario Patch
materialization; it is not the formal CLI boundary and does not synthesize Critical chance, rolls,
Multishot counts, pellet counts, comparison members, variant inputs, Sweep paths or values,
Breakpoint inputs, Patch operations, or Patch content hashes. The formal CLI can run the
repository-local resolved fixed-count Multishot, pellet, standalone Radial, multi-target Radial,
resolved Pellet allocation, resolved Direct-plus-Radial impact, resolved Status tick, and resolved
Beam tick fixtures.
The formal CLI also runs the checked-in distinct-mode, distinct-fixed-tier, and shared-explicit-roll
Direct-plus-Radial impact fixtures.
For the `critical.roll` phase only, the runtime inspects
`rule.impact.resolve-shared-critical-roll` and `rule.critical.resolve-tier-roll` in generated
Ruleset declaration order. It applies the event-kind match and records the non-match as a
predicate rejection with `predicate.event-kind-mismatch` plus actual/expected event-kind reads.
The rejected candidate does not read mechanic context, execute its operation, mutate World State,
or change metrics. Guard/operation rejection and all-phase candidate auditing remain unsupported.
Probabilistic Multishot or
pellets, Multishot-plus-pellet composition, per-hit or per-pellet Critical rolls, probabilistic hit distribution,
Spread, Catalog- or current-game-derived Radial falloff, physical Projectile composition,
arbitrary attack-mode composition or arbitrary/custom separate Critical resolutions within one
Direct-plus-Radial impact,
generated random rolls, grouped-hit expected values, and Monte Carlo remain
unsupported.
Real Status formulas, chance/type resolution, Direct/Radial application, stacking, refresh,
snapshot behavior, and Status expected values remain unsupported.
Held-duration-derived Beam ticks, ramp, resource behavior, Chain Beam, per-tick rolls, Status
composition, Beam expected values, and current-game Beam formulas remain unsupported.
Multiple-target evaluation outside the resolved punch-through, ricochet, chain ordered-path,
resolved Radial distance/LoS, and resolved Pellet allocation slices remains unsupported.
Do not add further CLI commands, Lab, API, or MCP implementations until their planned vertical
slice begins.
