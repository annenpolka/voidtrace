# Experiment package rules

- Normative comparison behavior originates in `specs/**/*.pkl`; do not invent comparison semantics here.
- Orchestrate the existing single-Scenario Kernel evaluator; never implement Damage, Critical,
  Armor, Status, target selection, Trace replay, or other combat mechanics.
- Snapshot and validate every input Artifact before the first evaluation.
- Resolve exactly the declared Scenario set, preserve base-then-variant order, and fail closed.
- Never substitute missing metrics, partial evaluations, non-finite arithmetic, or unsupported modes.
- Keep this package independent of filesystem, network, process, workers, UI, and LLM concerns.
