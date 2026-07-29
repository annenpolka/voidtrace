---
name: voidtrace
description: Use this temporary repository-local interface to run or inspect VoidTrace's synthetic Direct Hit, fixed Critical tier 0/1, and Armor vertical slice; vary resolved Armor, Health, or fixed tier; and inspect deterministic Result/Trace JSON. Do not use it for current Warframe claims, build advice, unsupported mechanics, or as the future public voidtrace/vt CLI.
---

# VoidTrace temporary skill interface

This skill operates only the first synthetic, experimental Kernel slice in this repository. It is
an agent-facing bridge until the planned public CLI exists. Never present its values as verified
current Warframe mechanics.

## Before running

1. Work from the repository root and read `AGENTS.md`.
2. Keep `specs/**/*.pkl` as the mechanics source of truth.
3. Treat the bundled adapter as an operator only. Do not copy mechanics or formulas into the skill,
   a response, or another UI.

## Supported requests

The adapter supports exactly one target and one hitscan Direct Hit in deterministic mode, with:

- the bundled synthetic Catalog and generated core Ruleset;
- fixed Critical tier `0` or `1`;
- non-negative resolved Armor and Health;
- neutral body hit against Health;
- full Result and causal Trace JSON.

Probability/expected-value Criticals, random Critical rolls, mods, headshots, Shield, Overguard,
projectiles, status, multishot, real-game imports, and build recommendations are unsupported.
If a request needs any of them, state the unsupported mechanic and stop. Do not approximate it as
zero effect and do not silently adapt it to the supported slice.

## Commands

Run the checked-in golden scenario:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts
```

Vary only the supported resolved inputs:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --critical-tier 0 --armor 0 --health 1000
```

Use a contract-valid Scenario or Catalog already prepared for this slice:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts \
  --scenario path/to/scenario.json \
  --catalog path/to/catalog.json
```

Run the literal golden assertion:

```bash
.agents/skills/voidtrace/scripts/smoke.sh
```

Use `--pretty` only for human reading. Without it, stdout is canonical single-line JSON suitable
for another agent or script. `--help` lists the finite adapter options.

## Interpreting output

- Exit `0` with `ok: true` means a contract-valid Result and Trace passed cross-Artifact integrity.
- Exit `2` with `ok: false` is a structured domain rejection. Report `error.code`,
  `error.mechanicId` when present, and `error.message`.
- Exit `1` with `ok: false` and an `adapter.*` code means input, file, or golden-check failure in
  this temporary interface.
- Applied and rejected candidates are both in `trace.decisions`. A rejected rule is not an error
  when its predicate simply did not match.
- Always preserve the warning and coverage classification that mark this slice experimental.

For a supported analysis request, report the requested metrics, the applied and rejected rule IDs,
and the experimental limitation. Do not edit repository files unless the user separately asks for
implementation work.
