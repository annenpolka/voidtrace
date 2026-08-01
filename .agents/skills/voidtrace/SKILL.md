---
name: voidtrace
description: Use VoidTrace's repository-local operator interface to run or inspect its synthetic experimental Direct Hit, Critical and Armor, fixed Multishot and pellets, resolved Pellet allocation, Radial, Direct-plus-Radial, Status or Beam ticks, and ordered punch-through, ricochet, or chain fixtures with Result and Trace JSON. Use for checked-in Scenario execution, supported resolved Armor, Health, or fixed-tier variation, and explicit capability or unsupported-boundary reporting. Do not use for current Warframe claims or build advice, generated randomness or Monte Carlo, projectile or geometry derivation, arbitrary attack-mode or target composition, probabilistic Multishot or pellets, Beam timing or ramp derivation, Status chance or type, or other unsupported mechanics.
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
4. Before calling a fixture checked-in, verify it with
   `git ls-files --error-unmatch <fixture-path>` and verify its bytes match `HEAD`. If either check
   fails, report that state and do not describe the fixture as checked-in.

## Supported requests

The interface supports one action from the finite set below. Every slice uses exactly one target
except the checked-in resolved punch-through, ricochet, and chain Scenarios, whose one ordered path
contains three explicit targets, the checked-in four-target resolved Radial Scenario, and the
checked-in three-target Direct-plus-Radial impact Scenarios:

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
- the repository-local resolved synthetic Beam Scenario through the formal CLI, where three
  explicit ticks at 100ms intervals each copy the Beam attack mode's base Damage, apply one shared
  fixed Critical tier, resolved Armor, and sequential Health commit, then aggregate terminal tick
  Damage;
- the repository-local resolved punch-through Scenario through the formal CLI, where one explicit
  ordered path contains three stable target IDs and each target independently receives the same
  fixed-tier Direct Hit through its resolved Armor and Health;
- the repository-local resolved ricochet Scenario through the formal CLI, where one explicit
  ordered path defines C→A→B independently from targets array order and each target receives the
  same fixed-tier Direct Hit through its resolved Armor and Health;
- the repository-local resolved chain Scenario through the formal CLI, where one explicit ordered
  path defines A→C→B independently from targets array order and each target receives the same
  fixed-tier Direct Hit through its resolved Armor and Health;
- the repository-local resolved multi-target Radial Scenario through the formal CLI, where four
  same-impact relations declare distance and LoS, two targets receive Radial Hits through a
  synthetic linear falloff and two preserve Health as resolved non-hits;
- the repository-local resolved Pellet allocation Scenario through the formal CLI, where four
  declared pellets are resolved as A×2, C×0, B×1, and one miss, with all target Health preserved
  or updated through the fixed-tier Direct Hit pipeline;
- the repository-local resolved Direct plus Radial impact Scenario through the formal CLI, where
  one parent impact emits Direct first and two Radial target hits after it on the same target-local
  World State; Direct and Radial share one synthetic attack mode and one explicit fixed tier;
- the repository-local distinct-mode Direct plus Radial impact Scenario through the formal CLI,
  where Direct reads base Damage 100 from the configured primary mode, Radial reads base Damage 80
  from the explicitly named radial mode, and both share one explicit fixed tier and World State;
- the repository-local distinct-tier Direct plus Radial impact Scenario through the formal CLI,
  where Direct uses explicit fixed tier 1, Radial uses explicit fixed tier 2, and both commit to
  the same target-local World State in Direct-before-Radial order;
- the repository-local shared-roll Direct plus Radial impact Scenario through the formal CLI,
  where one parent roll 0.2 resolves once against the shared primary mode Critical chance 0.25
  and all Direct and Radial children inherit fixed tier 1;
- analytic expected mode for the repository-local Critical chance, evaluating each reachable
  adjacent tier through Armor and terminal Health commit before weighting the branches;
- non-negative resolved Armor and Health;
- neutral body hit against Health;
- full Result and causal Trace JSON.

Before running a Direct-plus-Radial request, require checked-in resolved impact relations and one
supported explicit Critical resolution. Use the shared-mode Golden when no separate mode or tier
is requested, the distinct-mode Golden only when the request matches its explicit primary Direct
mode and separate Radial mode, or the distinct-tier Golden only when the request matches its
explicit Direct tier 1 and Radial tier 2. Use the shared-roll Golden only when the request matches
its single explicit roll 0.2, shared primary mode, and inherited tier 1. If the request asks for
trajectory, collision, arbitrary/custom mode composition, arbitrary/custom/generated Direct and
Radial tiers, a different impact roll, child-specific rolls, or generated rolls, stop without
asking for missing values and without running a nearby fixture as a substitute.

The helper does not synthesize or vary Critical chance or rolls. The formal CLI can evaluate the
repository-local explicit-roll, expected, resolved fixed-count Multishot and pellets, standalone
Radial, resolved Status and Beam ticks, resolved punch-through, resolved ricochet, resolved chain,
resolved multi-target Radial, resolved Pellet allocation, and resolved Direct plus Radial impact
Scenarios. The
distinct-mode, distinct-tier, and shared-roll Direct plus Radial impact Scenarios are also
available only through the formal CLI.
The
helper does not accept a Multishot count, pellet count, target path, impact relation, or per-target
override. Generated random rolls, custom Critical
chance, probabilistic or custom-count Multishot, custom-count or probabilistic pellets,
Multishot-plus-pellet composition, per-hit or per-pellet Critical rolls, Multishot or pellet
expected values, unresolved or probabilistic hit distribution, Spread, unsafe or unrepresentable tiers, Monte Carlo
aggregation, mods, headshots, Shield, Overguard, projectiles, real-game imports, and build
recommendations are unsupported. Catalog- or current-game-derived Radial falloff, physical
geometry, Projectile trajectory or collision, arbitrary or custom attack modes, arbitrary or
custom separate Direct/Radial tiers or rolls within one impact, custom Direct-plus-Radial inputs through the helper, custom multi-target
Radial inputs through the helper, and Radial expected values or generated rolls are also
unsupported.
The checked-in Beam Golden is the only operator preset for Beam: tick count 3, interval 100ms,
fixed tier 1, resolved Armor 300, and initial Health 50. The helper cannot vary Beam tick count,
interval, tier, or Catalog. Held-duration derivation, ramp, Fire Rate, Magazine, Ammo, Reload,
Chain Beam, per-tick Critical or Status rolls, Status application, expected Beam values, generated
randomness, and current-Warframe Beam formulas are unsupported. If a request needs any of them,
state the unsupported mechanic and stop without running or mutating a nearby fixture as a
substitute.
Status chance, Proc count or type resolution,
Status application from Direct or Radial Damage, Critical or Armor derivation of Status Damage,
stacking, refresh, snapshot rules, defense changes between ticks, expected Status values, and
generated Status rolls are unsupported. If a request needs any of them, state the unsupported
mechanic and stop. Do not approximate it as zero effect and do not silently adapt it to the
supported slice.
The Scenario Contract contains an explicit resolved `targetGraph`. The current evaluator accepts
either `relations: []` or exactly one checked-in-style `target-relation.ordered-path` with
`pathKind: punch-through`, `pathKind: ricochet`, or `pathKind: chain`, referenced by its matching
resolved action. It also accepts the checked-in-style set of 1 to 64
`target-relation.impact-distance` relations sharing one impact ID when referenced by
`action.resolved-radial-targets`. The relations supply resolved distance and LoS; the action
supplies explicit synthetic linear falloff bounds. The same relation set is accepted by
`action.resolved-direct-radial-impact` only when it also names one configured `directTargetId`;
the checked-in action commits that Direct child before Radial children and does not derive a
physical Projectile. It may omit `radialAttackModeId` to share the attacker mode, or explicitly
name the checked-in same-weapon radial mode; an unknown mode is a Catalog resolution failure. It
may also omit `radialCriticalTier` to share `criticalTier`, or explicitly name the checked-in
distinct Radial fixed tier. Alternatively, the checked-in shared-roll action omits both tier
fields and uses one `criticalRoll`; it cannot combine that roll with `radialAttackModeId` or
`radialCriticalTier`. The helper does not vary any per-impact tier or roll.
If a proposed mutation names an unknown target or keeps a stale
`contentHash`, report the invalid reference or Artifact-integrity failure and stop; do not
silently redirect the target, add one, or rehash solely to manufacture acceptance. It also accepts one
`target-relation.pellet-allocation` per configured target when all relations share the action's
allocation ID and their hit counts sum to no more than the declared 1 to 64 pellets; the remainder
is an explicit miss count. Geometry or collision derivation, wall
thickness, reflection angles, target selection, chain candidate search, branching, distance or
LoS derivation, revisit behavior, path derivation, attenuation, per-target Critical variation,
and rolls remain unsupported. Do not silently reduce another Target Graph to a supported path or
infer missing effects.

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
pnpm exec vt run data/fixtures/golden/resolved-beam-ticks.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog-beam.json
pnpm exec vt trace data/fixtures/golden/resolved-beam-ticks.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog-beam.json
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
pnpm exec vt run data/fixtures/golden/resolved-radial-targets.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-radial-targets.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-pellet-allocation.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-pellet-allocation.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-distinct-mode-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-distinct-mode-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-distinct-tier-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-distinct-tier-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-shared-roll-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt trace data/fixtures/golden/resolved-shared-roll-direct-radial-impact.scenario.json \
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
- Resolved synthetic Beam uses `rule.beam.schedule-resolved-ticks`, then
  `rule.beam.construct-resolved-tick`, `rule.beam.scale-critical-tier`,
  `rule.beam.standard-armor`, and `rule.beam.commit-resolved-tick-health` once per ordered tick,
  and ends with `rule.beam.aggregate-resolved-ticks`. Report `beam.tick-count`,
  `beam.tick-interval-ms`, `damage.beam.per-tick`, `damage.beam.total`, `critical.tier`,
  `critical.multiplier`, `damage.post-critical.total`, `armor.remaining-multiplier`,
  `damage.health.total`, and `target.health.remaining`. The checked-in Golden schedules at time
  `0`, evaluates ticks at `100`, `200`, and `300` milliseconds, aggregates at `300`, and commits
  Health `50→30→10→0`; preserve stable `tick.beam-N` IDs and the 14-decision causal order. These
  are explicit synthetic inputs. Do not infer held duration, ramp, weapon resources, Chain Beam,
  per-tick rolls, Status, expected values, or a current-game formula.
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
- Resolved multi-target Radial starts with `rule.radial.expand-resolved-targets`, inspects
  relations in A→C→B→D order, applies the five-rule Radial pipeline only to A and C, and ends with
  `rule.radial.aggregate-resolved-targets`. Report `radial.target-count`,
  `damage.radial.targets-total`, `damage.health.total`, `targets.health.remaining-total`,
  `targets.defeated-count`, and every target Health. A at distance 0 uses falloff 1; C at distance
  5 uses 0.7; B is beyond the end distance; D has resolved LoS false. The Golden result is
  2 / 67.5 / 67.5 / 242.5 / 0 with Health A=70, C=72.5, B=60, D=40 and 12 Trace decisions. Do not
  infer coordinates, terrain, LoS, distance, Catalog/current-game falloff parameters, a Direct
  sibling, Projectile parent, or a roll.
- Resolved Pellet allocation starts with `rule.pellet.expand-resolved-allocation`, applies the
  four-rule Direct Hit pipeline in relation order and then target-local pellet index order, and
  ends with `rule.pellet.aggregate-resolved-allocation`. Report `pellet.count`,
  `pellet.hit-count`, `pellet.miss-count`, `damage.pellet.total`, `damage.health.total`,
  `targets.health.remaining-total`, `targets.defeated-count`, and every target Health. The Golden
  targets array is B→A→C, relations are A→C→B, emitted hits are A→A→B, and the result is
  4 / 3 / 1 / 200 / 200 / 140 / 1 with Health A=50, C=90, B=0 and 14 Trace decisions. Do not
  infer Spread, hit tests, a probability distribution, per-pellet Critical rolls, or Multishot
  composition.
- Resolved Direct plus Radial impact starts with
  `rule.impact.expand-resolved-direct-radial`, commits the four-rule Direct pipeline to A, then
  applies the five-rule Radial pipeline in relation order to A and C, and ends with
  `rule.impact.aggregate-resolved-direct-radial`. Report `impact.direct.damage-total`,
  `impact.radial.damage-total`, `impact.damage-total`, `impact.radial-target-count`,
  `damage.health.total`, `targets.health.remaining-total`, `targets.defeated-count`, and every
  target Health. The Golden Direct changes A 180→130; its Radial sibling then changes A 130→80,
  while C changes 90→72.5 and out-of-range B remains 60. The totals are Direct 50, Radial 67.5,
  aggregate 117.5, remaining Health 212.5, with 16 Trace decisions. Preserve the common parent
  event and Direct-before-Radial order. The shared-mode Golden omits `radialAttackModeId`.
- The distinct-mode Direct plus Radial Golden uses the same 16-rule parent/child sequence, but
  Direct decisions read `attack.base-damage` 100 from
  `attack-mode.synthetic-aperture.primary` and Radial decisions read 80 from the explicit
  `attack-mode.synthetic-aperture.radial`. Report Direct 50, Radial 54, aggregate 104, remaining
  Health 226, and target Health A=90, C=76, B=60. Do not infer a trajectory, collision, physical
  Projectile, arbitrary mode composition, separate Critical tiers or rolls, Status, Multishot,
  or Pellet composition from that Golden.
- The distinct-tier Direct plus Radial Golden combines the primary Direct mode with the explicitly
  named Radial mode, then applies fixed tier 1 to Direct and fixed tier 2 to both Radial children.
  Report Direct 100,
  Radial 162, aggregate 262, remaining Health 188, and target Health A=80, C=48, B=60. The Trace
  has 16 decisions: the Direct Critical decision reads tier 1, both Radial Critical decisions read
  tier 2, and all three remain under the common parent event in Direct-before-Radial order. Do not
  infer rolls, Critical chance, roll-sharing, arbitrary tier synthesis, or current-game mechanics
  from these fixed inputs.
- The shared-roll Direct plus Radial Golden has one parent
  `rule.impact.resolve-shared-critical-roll` decision. It reads Critical chance 0.25 and explicit
  roll 0.2, resolves tier 1 once, and parents the Direct and two Radial construct decisions. All
  three child Critical decisions read tier 1. Report Direct 100, Radial 135, aggregate 235,
  remaining Health 215, target Health A=100, C=55, B=60, and 17 decisions. This is an explicit
  synthetic input, not generated randomness or a verified current-game roll-sharing rule. Do not
  extrapolate to distinct attack-mode chances, child-specific rolls, expected values, or arbitrary
  roll inputs.
- Always preserve the warning and coverage classification that mark this slice experimental.

For a supported analysis request, report the requested metrics, the applied and rejected rule IDs,
and the experimental limitation. Do not edit repository files unless the user separately asks for
implementation work.
