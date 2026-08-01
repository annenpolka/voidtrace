# Experiment package rules

- Normative comparison behavior originates in `specs/**/*.pkl`; do not invent comparison semantics here.
- Orchestrate the existing single-Scenario Kernel evaluator; never implement Damage, Critical,
  Armor, Status, target selection, Trace replay, or other combat mechanics.
- Snapshot the caller-owned request graph before the first await and validate every input Artifact
  before the first evaluation.
- Resolve exactly one homogeneous variant source mode: declared Scenario revisions or declared
  ScenarioPatch revisions. Never mix the modes or silently materialize Patches for resolved mode.
- In Patch-backed mode, validate and materialize the complete Patch set before the first evaluation.
- Preserve base-then-variant declaration order and fail closed without partial materializations or
  evaluation rows.
- Never substitute missing metrics, partial evaluations, non-finite arithmetic, or unsupported modes.
- Keep this package independent of filesystem, network, process, workers, UI, and LLM concerns.
