---
name: voidtrace
description: Use VoidTrace's repository-local operator interface to run or inspect the synthetic Direct Hit, resolved fixed-count Multishot and pellets, standalone resolved Radial falloff, resolved synthetic Status ticks, resolved ordered punch-through, ricochet, and chain Direct Hits, generalized fixed Critical tier, explicit adjacent-tier Critical roll, analytic single-hit Critical expected value, and Armor vertical slices; vary resolved Armor or Health, vary a deterministic non-negative safe-integer fixed tier, and inspect Result/Trace JSON. Do not use it for current Warframe claims, build advice, generated randomness, Monte Carlo, geometry-derived or attenuated target paths, unresolved chain candidate search or branching, distance-derived Radial falloff, probabilistic Multishot, variable pellet counts, custom Critical chance, Status chance or type resolution, or unsupported mechanics.
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

The interface supports one action from the finite set below. Every slice uses exactly one target
except the checked-in resolved punch-through, ricochet, and chain Scenarios, whose one ordered path
contains three explicit targets:

- one hitscan Direct Hit using the bundled synthetic Catalog and generated core Ruleset;
- deterministic mode with any non-negative safe-integer fixed Critical tier through the helper;
- repository-local explicit-roll Scenarios whose adjacent Critical tiers are safely representable
  through the formal CLI;
- a repository-local resolved fixed-count Multishot Scenario through the formal CLI, where each
  emitted hit uses the same explicit fixed Critical tier and commits to Health in order;
- a repository-local resolved fixed-count pellet Scenario through the formal CLI, where four
  ordered pellets from one shot use the same explicit fixed Critical tier and commit in order;
- a repository-local standalone Radial Scenario through the formal CLI, where an explicit
  resolved falloff multiplier scales Damage after fixed Critical and before Armor;
- a repository-local resolved synthetic Status Scenario through the formal CLI, where an explicit
  final Health Damage per tick is committed at a fixed positive interval for a fixed positive
  tick count;
- the repository-local resolved punch-through Scenario through the formal CLI, where one explicit
  ordered path contains three stable target IDs and each target independently receives the same
  fixed-tier Direct Hit through its resolved Armor and Health;
- the repository-local resolved ricochet Scenario through the formal CLI, where one explicit
  ordered path defines C→A→B independently from targets array order and each target receives the
  same fixed-tier Direct Hit through its resolved Armor and Health;
- the repository-local resolved chain Scenario through the formal CLI, where one explicit ordered
  path defines A→C→B independently from targets array order and each target receives the same
  fixed-tier Direct Hit through its resolved Armor and Health;
- analytic expected mode for the repository-local Critical chance, evaluating each reachable
  adjacent tier through Armor and terminal Health commit before weighting the branches;
- non-negative resolved Armor and Health;
- neutral body hit against Health;
- full Result and causal Trace JSON.

The helper does not synthesize or vary Critical chance or rolls. The formal CLI can evaluate the
repository-local explicit-roll, expected, resolved fixed-count Multishot, resolved
punch-through, resolved ricochet, and resolved chain Scenarios. The helper does not accept a
Multishot count, pellet count, target path, or per-target override. Generated random rolls, custom Critical
chance, probabilistic or custom-count Multishot, custom-count or probabilistic pellets,
Multishot-plus-pellet composition, per-hit or per-pellet Critical rolls, Multishot or pellet
expected values, hit distribution, Spread, unsafe or unrepresentable tiers, Monte Carlo
aggregation, mods, headshots, Shield, Overguard, projectiles, real-game imports, and build
recommendations are unsupported. Distance-derived Radial falloff, physical geometry, Direct and
Radial sibling composition, Projectile parents, multiple Radial targets, and Radial expected
values or generated rolls are also unsupported. Status chance, Proc count or type resolution,
Status application from Direct or Radial Damage, Critical or Armor derivation of Status Damage,
stacking, refresh, snapshot rules, defense changes between ticks, expected Status values, and
generated Status rolls are unsupported. If a request needs any of them, state the unsupported
mechanic and stop. Do not approximate it as zero effect and do not silently adapt it to the
supported slice.
The Scenario Contract contains an explicit resolved `targetGraph`. The current evaluator accepts
either `relations: []` or exactly one checked-in-style `target-relation.ordered-path` with
`pathKind: punch-through`, `pathKind: ricochet`, or `pathKind: chain`, referenced by its matching
resolved action. Impact-distance, more than one relation, geometry or collision derivation, wall
thickness, reflection angles, target selection, chain candidate search, branching, distance,
revisit behavior, path derivation, attenuation, per-target Critical variation, and rolls remain
unsupported. Do not silently reduce another Target Graph to a supported path or infer missing
effects.

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
pnpm exec vt run data/fixtures/golden/tier-2-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog-tier-2.json
pnpm exec vt trace data/fixtures/golden/tier-2-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog-tier-2.json
pnpm exec vt run data/fixtures/golden/expected-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog-tier-2.json
pnpm exec vt trace data/fixtures/golden/expected-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog-tier-2.json
pnpm exec vt run data/fixtures/golden/multishot-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/multishot-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/pellet-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/pellet-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/radial-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/radial-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-status-ticks.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-status-ticks.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-punch-through.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-punch-through.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-ricochet.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-ricochet.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-chain.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-chain.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
```

Use the repository-local helper to run the checked-in golden scenario with a combined
Result/Trace envelope:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts
```

Vary only the supported resolved inputs:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --critical-tier 4 --armor 0 --health 1000
```

Run the bundled analytic expected scenario, optionally varying only resolved Armor or Health:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --expected
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --expected --armor 0 --health 1000
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
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --expected --check-golden
```

Use `--pretty` only for human reading. Without it, stdout is canonical single-line JSON suitable
for another agent or script. `--help` lists the finite adapter options.

## Interpreting output

- Exit `0` with `ok: true` means a contract-valid Result and Trace passed cross-Artifact integrity.
- Exit `2` with `ok: false` is a structured domain rejection. Report `error.code`,
  `error.mechanicId` when present, and `error.message`.
- Exit `1` with `ok: false` and an `adapter.*` code means input, file, or golden-check failure in
  the repository-local helper.
- Rule decisions are in `trace.decisions`. Expected mode repeats the Direct Hit, Critical scale,
  Armor, and Health commit Rules once per reachable branch, then applies
  `rule.critical.aggregate-expected-branches`. Do not collapse repeated Rule IDs or invent
  rejected candidates when the Trace contains none.
- Result metric `critical.multiplier` is the resolved tier's applied factor. The Trace field
  `criticalMultiplier` is the Catalog input, so report them separately when they differ.
- Expected mode has no realized `critical.roll`, `critical.tier`, or `critical.multiplier`. Report
  `critical.expected.multiplier`, `damage.expected.health.total`, and
  `target.health.expected-remaining`. The remaining-Health value is weighted after each branch's
  Health-zero clamp and need not equal initial Health minus raw expected damage.
- Resolved fixed-count Multishot starts with `rule.multishot.emit-fixed-hits`, repeats Direct Hit,
  fixed Critical scale, Armor, and Health commit once per ordered hit, and ends with
  `rule.multishot.aggregate-fixed-hits`. Report `multishot.hit-count`,
  `damage.multishot.total`, final `damage.health.total`, and `target.health.remaining`; preserve
  the `hit.id`, `hit.index`, and `hit.count` Trace metadata when explaining causality.
  `damage.direct-hit.total` is the common pre-Critical value for one emitted hit, not a
  Multishot sum. Aggregate Damage sums every terminal hit and may exceed initial Health, while the
  sequential Health commits clamp remaining Health at zero.
- Resolved fixed-count pellets follow the same four-Rule Direct Hit pipeline per ordered pellet,
  but use `rule.pellet.emit-fixed-hits` and `rule.pellet.aggregate-fixed-hits`. Report
  `pellet.count`, the common one-pellet `damage.direct-hit.total`,
  `damage.pellet.total`, final `damage.health.total`, and `target.health.remaining`. Pellet
  identity is carried by stable `hit.id` values such as `pellet.shot-0`; do not call the group
  Multishot or imply that pellet count was rolled.
- Standalone resolved Radial uses `rule.radial.construct-hit`,
  `rule.radial.scale-critical-tier`, `rule.radial.apply-resolved-falloff`,
  `rule.radial.standard-armor`, and `rule.radial.commit-health` in that order. Report
  `damage.radial.base.total`, `damage.post-critical.total`, `radial.falloff.multiplier`,
  `damage.radial.total` (post-falloff, pre-Armor), `damage.health.total`, and
  `target.health.remaining`. Do not infer distance, geometry, a Direct sibling, or a Projectile
  parent from the resolved multiplier.
- Resolved synthetic Status uses `rule.status.schedule-resolved-ticks`, then
  `rule.status.construct-resolved-tick` and `rule.status.commit-resolved-tick-health` once per
  ordered tick, and ends with `rule.status.aggregate-resolved-ticks`. Report
  `status.tick-count`, `status.tick-interval-ms`, `damage.status.per-tick`,
  `damage.status.total`, `damage.health.total`, and `target.health.remaining`. The bundled Golden
  trace schedules at time `0`, constructs and commits at `1000`, `2000`, and `3000` milliseconds,
  and aggregates at `3000`; preserve stable tick IDs and sequential Health transitions when
  explaining causality. `resolvedHealthDamagePerTick` is already the final Health Damage for each
  tick. Do not infer a Status chance, Proc type, source hit, Critical, Armor, stack, refresh,
  snapshot, or real-game formula from it.
- Resolved punch-through starts with `rule.punch-through.expand-resolved-targets`, applies Direct
  Hit, fixed Critical scale, Armor, and Health commit once per ordered path target, and ends with
  `rule.punch-through.aggregate-resolved-targets`. Report `punch-through.target-count`,
  `damage.punch-through.total`, `damage.health.total`, `targets.health.remaining-total`,
  `targets.defeated-count`, and every `result.targetStates[targetId].health`. Preserve `path.id`,
  `path.index`, `path.count`, and `target.id` Trace metadata when explaining causality. The Golden
  path order is `actor.target-a`, `actor.target-b`, `actor.target-c`; do not replace it with the
  `targets` array order or imply that the Kernel selected targets. Aggregate Damage sums each
  independent terminal hit and can exceed an individual target's Health. This slice does not
  model penetration attenuation, walls, collision, geometry, chain, ricochet, or rolls.
- Resolved ricochet starts with `rule.ricochet.expand-resolved-targets`, applies the same four
  target-local Rules in the relation-defined order, and ends with
  `rule.ricochet.aggregate-resolved-targets`. Report `ricochet.target-count`,
  `damage.ricochet.total`, `damage.health.total`, `targets.health.remaining-total`,
  `targets.defeated-count`, and every target Health. The Golden relation is C→A→B even though the
  targets array is A→B→C; preserve `path.index` and `target.id` from Trace. Do not infer a
  reflection angle, trajectory, collision, automatic target choice, attenuation, chain, or roll.
- Resolved chain starts with `rule.chain.expand-resolved-targets`, applies the same four
  target-local Rules in the relation-defined order, and ends with
  `rule.chain.aggregate-resolved-targets`. Report `chain.target-count`,
  `damage.chain.total`, `damage.health.total`, `targets.health.remaining-total`,
  `targets.defeated-count`, and every target Health. The Golden targets array is B→A→C while the
  relation is A→C→B; preserve the relation order, `path.index`, and `target.id` from Trace. Do not
  infer candidate search, branching, distance, revisit behavior, automatic target choice,
  attenuation, or a roll.
- Always preserve the warning and coverage classification that mark this slice experimental.

For a supported analysis request, report the requested metrics, the applied and rejected rule IDs,
and the experimental limitation. Do not edit repository files unless the user separately asks for
implementation work.
