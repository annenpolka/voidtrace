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
roll, or analytic expected Critical / Armor vertical slices backed by generated Ruleset `0.4.0`
revision `1`, and their formal `describe` / `run` / `trace` JSON CLI. Fixed Critical input is a
non-negative safe-integer tier. Explicit-roll and expected resolution accept non-negative Critical
chance only while adjacent tiers are safely representable. Expected mode evaluates reachable
tiers through terminal Health commit before weighting Damage and remaining Health; it does not
emit a realized roll or tier. These Rules remain `experimental` evidence, not verified
current-Warframe claims.

The repository-local fixture-variation skill accepts non-negative safe-integer fixed tiers and the
repository-local analytic expected preset; it is not the formal CLI boundary and does not
synthesize Critical chance or rolls. Generated random rolls and Monte Carlo remain unsupported.
Do not add further CLI commands, Lab, API, or MCP implementations until their planned vertical
slice begins.
