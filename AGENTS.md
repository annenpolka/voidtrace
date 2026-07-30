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

The current implemented boundary ends at the synthetic Direct Hit / generalized fixed, explicit
roll, or analytic expected Critical / Armor vertical slices plus resolved fixed-count Multishot
and pellets plus resolved target-specific Pellet allocation, standalone resolved Radial falloff,
resolved multi-target Radial, and resolved synthetic Status ticks, backed by generated Ruleset
`0.17.0` revision `1` and their formal
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

The repository-local fixture-variation skill accepts non-negative safe-integer fixed tiers and the
repository-local analytic expected preset; it is not the formal CLI boundary and does not
synthesize Critical chance, rolls, Multishot counts, or pellet counts. The formal CLI can run the
repository-local resolved fixed-count Multishot, pellet, standalone Radial, multi-target Radial,
resolved Pellet allocation, resolved Direct-plus-Radial impact, and resolved Status tick fixtures.
The formal CLI also runs the checked-in distinct-mode, distinct-fixed-tier, and shared-explicit-roll
Direct-plus-Radial impact fixtures.
Probabilistic Multishot or
pellets, Multishot-plus-pellet composition, per-hit or per-pellet Critical rolls, probabilistic hit distribution,
Spread, Catalog- or current-game-derived Radial falloff, physical Projectile composition,
arbitrary attack-mode composition or arbitrary/custom separate Critical resolutions within one
Direct-plus-Radial impact,
generated random rolls, grouped-hit expected values, and Monte Carlo remain
unsupported.
Real Status formulas, chance/type resolution, Direct/Radial application, stacking, refresh,
snapshot behavior, and Status expected values remain unsupported.
Multiple-target evaluation outside the resolved punch-through, ricochet, chain ordered-path,
resolved Radial distance/LoS, and resolved Pellet allocation slices remains unsupported.
Do not add further CLI commands, Lab, API, or MCP implementations until their planned vertical
slice begins.
