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

The current implemented boundary ends at the synthetic Direct Hit / fixed-or-explicit-binary-roll
Critical / Armor vertical slices, their formal `describe` / `run` / `trace` JSON CLI, and the
repository-local fixed-tier fixture-variation skill. Do not add further CLI commands, Lab, API, or
MCP implementations until their planned vertical slice begins.
