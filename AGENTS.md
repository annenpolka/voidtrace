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
and pellets plus standalone resolved Radial falloff and resolved synthetic Status ticks, backed by
generated Ruleset `0.8.0` revision `1` and their formal `describe` / `run` / `trace` JSON CLI.
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
compose a Direct sibling or Projectile parent, or distribute across multiple targets.
Resolved Status ticks accept only `status.synthetic-resolved-dot`, explicit final Health damage per
tick, a positive count up to 64, and a positive interval whose last tick fits within
`timeLimitMs`. They do not derive Status application, type, damage, Critical, Armor, stack,
refresh, snapshot, defense changes, expected values, or rolls.

The repository-local fixture-variation skill accepts non-negative safe-integer fixed tiers and the
repository-local analytic expected preset; it is not the formal CLI boundary and does not
synthesize Critical chance, rolls, Multishot counts, or pellet counts. The formal CLI can run the
repository-local resolved fixed-count Multishot, pellet, standalone Radial, and resolved Status
tick fixtures.
Probabilistic Multishot or
pellets, Multishot-plus-pellet composition, per-hit or per-pellet Critical rolls, hit distribution,
Spread, distance-derived Radial falloff, Direct-plus-Radial or Projectile composition, generated
random rolls, grouped-hit expected values, and Monte Carlo remain unsupported.
Real Status formulas, chance/type resolution, Direct/Radial application, stacking, refresh,
snapshot behavior, and Status expected values remain unsupported.
Do not add further CLI commands, Lab, API, or MCP implementations until their planned vertical
slice begins.
