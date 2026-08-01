# Experiment package rules

- Normative comparison behavior originates in `specs/**/*.pkl`; do not invent comparison semantics here.
- Orchestrate the existing single-Scenario Kernel evaluator; never implement Damage, Critical,
  Armor, Status, target selection, Trace replay, or other combat mechanics.
- Snapshot the caller-owned request graph before the first await and validate every input Artifact
  before the first evaluation.
- Resolve exactly one homogeneous variant source mode: declared Scenario revisions, ordinary
  ScenarioPatch revisions, or explicit finite Sweep points backed by exact ScenarioPatch revisions.
  Never mix the modes or silently materialize Patches for resolved mode.
- In Patch-backed mode, validate and materialize the complete Patch set before the first evaluation.
- In finite Sweep mode, require 1 to 15 declaration-ordered points on one shared allowlisted path,
  canonically unique values, and exactly one matching replace operation in each exact Patch. Never
  synthesize Patch identity or sort, deduplicate, or expand point values.
- Finite Breakpoint analysis composes exactly two complete finite Sweep requests with one common
  Catalog and Ruleset. Preflight and materialize both sides before evaluation, require identical
  strictly increasing numeric coordinates, path, metric, and provenance, then evaluate the complete
  left Sweep before the complete right Sweep.
- Breakpoint findings are observational only: one exact sampled equality, one adjacent non-zero
  sampled sign reversal, or no observed candidate. Multiple candidates fail atomically; never infer
  a continuous root, interpolate, apply tolerance, declare a winner, or generate new points.
- Preserve base-then-variant declaration order and fail closed without partial materializations or
  evaluation rows.
- Never substitute missing metrics, partial evaluations, non-finite arithmetic, or unsupported modes.
- Keep this package independent of filesystem, network, process, workers, UI, and LLM concerns.
