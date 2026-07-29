# Kernel package rules

- The Kernel is a pure deterministic state machine.
- Do not import filesystem, network, clock, UI, worker orchestration, or LLM concerns.
- Do not call `Math.random()`; use logical-coordinate RNG.
- Event ordering is logical time, sequence, then stable ID.
- Runtime state may be updated internally, but public inputs and returned snapshots are not mutated.
- Mechanics must come from validated Rulesets; unsupported mechanics fail explicitly.
