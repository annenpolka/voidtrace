---
name: voidtrace
description: Use VoidTrace's repository-local operator interface to run or inspect the synthetic Direct Hit, fixed Critical tier 0/1, checked-in explicit binary Critical roll, and Armor vertical slices; vary resolved Armor, Health, or fixed tier through the helper; and inspect deterministic Result/Trace JSON. Do not use it for current Warframe claims, build advice, or unsupported mechanics.
---

# VoidTrace repository-local skill interface

This skill operates only the first synthetic, experimental Kernel slice in this repository. It is
an agent-facing fixture-variation helper alongside the formal `voidtrace` / `vt` CLI. Never
present its values as verified current Warframe mechanics.

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

The helper does not synthesize or vary probability Criticals. The formal CLI can evaluate the
checked-in binary explicit-roll Scenario, but generated random rolls, expected values, Critical
chance above `1`, Monte Carlo aggregation, mods, headshots, Shield, Overguard, projectiles,
status, multishot, real-game imports, and build recommendations are unsupported. If a request
needs any of them, state the unsupported mechanic and stop. Do not approximate it as zero effect
and do not silently adapt it to the supported slice.

## Commands

For immutable Scenario and Catalog Artifacts, use the formal CLI:

```bash
pnpm exec vt run data/fixtures/golden/direct-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/direct-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/probability-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/probability-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
```

Use the repository-local helper to run the checked-in golden scenario with a combined
Result/Trace envelope:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts
```

Vary only the supported resolved inputs:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --critical-tier 0 --armor 0 --health 1000
```

Use a contract-valid fixed-tier Scenario with a Catalog already prepared for the helper's
supported slice:

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
  the repository-local helper.
- Applied and rejected candidates are both in `trace.decisions`. A rejected rule is not an error
  when its predicate simply did not match.
- Always preserve the warning and coverage classification that mark this slice experimental.

For a supported analysis request, report the requested metrics, the applied and rejected rule IDs,
and the experimental limitation. Do not edit repository files unless the user separately asks for
implementation work.
