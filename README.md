# VoidTrace

VoidTrace is being built as two layers:

- **VoidTrace Kernel** — a headless, reproducible execution model for Warframe combat mechanics.
- **VoidTrace Lab** — an AI-assisted analysis environment that turns questions into inspectable experiments.

The implemented boundary is synthetic, experimental Kernel Engine `0.19.0`, backed by generated
Ruleset `0.18.0` revision `1`, twelve versioned public contracts, and 59 normative Clauses. It
currently supports:

- Direct Hit through base Damage, fixed or explicit-roll Critical, Armor, and terminal Health;
- analytic expected Critical across safely representable adjacent tiers;
- resolved fixed-count Multishot and pellets, plus resolved target-specific Pellet allocation;
- standalone resolved Radial falloff and resolved multi-target Radial distance/LoS relations;
- resolved Direct-plus-Radial impact, including its checked-in distinct attack-mode, distinct fixed-tier,
  and shared explicit-roll variants;
- resolved synthetic Status ticks and fixed-Critical Beam ticks; and
- resolved punch-through, ricochet, and chain ordered target paths.

For `critical.roll`, Trace now inspects the existing shared-impact and Direct explicit-roll Rules
in generated Ruleset declaration order. The matching candidate is applied; the other is recorded
as a predicate rejection with code `predicate.event-kind-mismatch` and exact actual/expected event
kinds. A rejected candidate is an auditable non-match, not a failed Scenario or a zero-effect
mechanic. Guard/operation rejection and all-phase candidate auditing remain outside this slice.

Scenario Contract `0.3.0` makes its Target Graph explicit. The runtime accepts only the finite
resolved relation shapes consumed by the supported slices: empty relations, one ordered target
path, same-impact distance/LoS relations for multi-target Radial or Direct-plus-Radial impact, or
complete target-specific Pellet allocation. It does not infer geometry, collision, distance, LoS,
reflection, target selection, Spread, or hit probability. Other non-empty Target Graphs are
rejected without partial Artifacts.

Experiment Contract `0.3.0` accepts one Catalog, one Ruleset, one base Scenario, one primary metric,
and exactly one of three homogeneous 1–15-member variant modes: ordered resolved Scenario variants,
ordered ordinary ScenarioPatch variants, or ordered explicit one-axis finite Sweep points. Resolved
mode validates the exact Scenario set. Ordinary Patch-backed mode validates the exact base and Patch
set. Each Sweep point declares `{id, patchRef, sweepPoint: {path, value}}`; every point shares one
allowlisted scalar path and has a canonically unique finite non-null scalar value, while its exact
Patch has one matching replace operation. Patch-backed and Sweep modes materialize their complete
Patch sets before evaluation, then evaluate the base and variants in declaration order. All three
modes verify every Result and Trace and emit Comparison Contract `0.1.0` with each metric value and
finite signed difference `variant - base`; any failure returns no partial rows. This surface is
available through `@voidtrace/sdk` and the repository-local skill. The formal CLI remains limited
to `describe`, `run`, and `trace`; it has no comparison command.

FiniteBreakpointAnalysis Contract `0.1.0` accepts two complete finite Sweep requests under one
Catalog and generated Ruleset. The two Sweeps must share game build, primary metric, allowlisted
path, point count, and the same declaration-ordered strictly increasing finite numeric coordinates.
Both sides are fully preflighted and materialized before evaluation; the complete left Sweep is
then evaluated before the complete right Sweep. The resulting content-addressed Analysis records
both Experiment and Comparison references, each point's Scenario and Result references, absolute
metric values, and finite `left - right` differences. It reports only one exact sampled equality,
one adjacent non-zero sampled sign reversal, or no observed candidate. Multiple candidates fail
atomically. This is a finite observation, not a continuous root, interpolated crossover, winner, or
ranking. The SDK and repository-local skill expose the fixed slice; the formal CLI is unchanged.

ScenarioPatch Contract `0.1.0` adds a finite pre-materialization slice. A Patch names one exact
content-addressed base Scenario, a distinct result identity pair, and 1–64 ordered replace
operations against existing allowlisted non-null scalar leaves. The materializer snapshots both inputs, validates
their Contracts, hashes, game build, and exact base reference, applies unique same-kind non-no-op
changes to an isolated clone, then emits a newly hashed normal Scenario with exact `createdFrom`.
Any failure returns no partial Scenario. The SDK and repository-local skill expose standalone
materialization as well as the bounded Patch-backed Experiment composition; the Kernel and formal
CLI remain unchanged.

These capabilities are not verified statements of current Warframe mechanics. Raw Catalog data is
evidence input, while every implemented runtime Rule retains `experimental` evidence status.
Generated randomness, Monte Carlo, probabilistic Multishot or pellets, per-hit rolls, physical
Projectile or geometry derivation, current-game-derived Radial or Beam formulas, real Status
application/formulas, and unsupported composition remain explicit non-features. Experiment does
not mix its three variant modes or generate Sweep ranges/steps, sort or deduplicate point values,
run multiple axes or Cartesian products, chain Patches, or implement adaptive or continuous
Breakpoint search, Ruleset branching, Monte Carlo, ratios, winner selection, ranking, tie semantics,
statistics, interpolation, parallel execution, or expected-value synthesis. It never generates
randomness, Patches, result Scenario identities, revisions, or hashes from Sweep values. Scenario
Patch is not full RFC 6902: `add`,
`remove`, `test`, `move`, `copy`, null or structural values, and generated operations remain
unsupported.

`VoidTrace計画.md` is design input and discussion history. Normative behavior lives only under
`specs/`.

## Requirements

- Node.js 24–26
- pnpm 11
- Pkl 0.32.x
- just >=1.51,<2

## Commands

```bash
just setup
just spec-gen
just spec-check
just check
```

`just spec-gen` regenerates the committed package under `packages/spec-artifacts/` and the
human-readable views under `docs/generated/`.

`just spec-check` regenerates into a temporary directory and compares every controlled file
byte-for-byte. It never repairs stale generated files implicitly.

## Contract boundary

Pkl under `specs/contracts/` is the sole contract source. It generates:

- Draft 2020-12 JSON Schemas and TypeScript projections under `packages/spec-artifacts/`
- Human-readable contract documentation under `docs/generated/`

The generated boundary currently contains twelve schemas: ArtifactRef, CatalogSnapshot,
Comparison, Experiment, Fingerprint, FiniteBreakpointAnalysis, Problem, Result, Ruleset, Scenario,
ScenarioPatch, and Trace. The handwritten
`@voidtrace/contracts` package registers them with Ajv in strict mode. It validates without
coercion or default insertion and provides RFC 8785 canonical JSON, SHA-256 Artifact fingerprints,
stable ID checks, and cross-Artifact integrity checks. `Fingerprint.resultHash` identifies
canonical execution inputs; Result, Trace, Experiment, Comparison, FiniteBreakpointAnalysis, and
ScenarioPatch content hashes independently identify their complete stored payloads. The package
contains no game mechanics.

## CLI

Both executable names point to the same entry. JSON is the default; `--json` is accepted
explicitly and `--pretty` changes whitespace only.

```bash
pnpm exec vt describe
pnpm exec vt run data/fixtures/golden/direct-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec voidtrace trace data/fixtures/golden/resolved-beam-ticks.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/resolved-direct-radial-impact.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run - --catalog data/fixtures/catalog-mini/catalog.json \
  < data/fixtures/golden/direct-critical-armor.scenario.json
```

The other supported synthetic slices have checked-in Scenario fixtures under
`data/fixtures/golden/`. `run` writes only a Result Artifact to stdout; `trace` writes only its
Trace Artifact. On failure stdout remains empty and stderr receives one structured Problem. Exit
codes are `2` for invalid input, `3` for unsupported mechanics, `4` for a computation limit, and
`5` for an internal failure. The CLI has no implicit Catalog fixture, never prompts, and does not
run Experiments.

## SDK and repository-local skill

`@voidtrace/sdk` exposes single-Scenario evaluation, resolved, ordinary Patch-backed, or finite
one-axis Sweep Experiment comparison, finite two-Sweep Breakpoint analysis, and finite Scenario
Patch materialization. The skill
at `.agents/skills/voidtrace/SKILL.md` provides fixed-tier/expected fixture variation, formal-CLI
golden inspection, checked-in resolved and ordinary Patch-backed comparisons, a checked-in
Critical-tier Sweep over the explicit points `0`, `2`, and `3`, a checked-in finite Breakpoint
analysis over the same coordinates, and one checked-in Patch example:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --critical-tier 4 --armor 0 --health 1000
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --expected
node .agents/skills/voidtrace/scripts/run-comparison.ts --pretty
node .agents/skills/voidtrace/scripts/run-comparison.ts --check-golden
node .agents/skills/voidtrace/scripts/run-patch-comparison.ts --check-golden
node .agents/skills/voidtrace/scripts/run-sweep.ts --check-golden
node .agents/skills/voidtrace/scripts/run-breakpoint.ts --check-golden
node .agents/skills/voidtrace/scripts/apply-scenario-patch.ts --evaluate --check-golden
.agents/skills/voidtrace/scripts/smoke.sh
```

The skill is an operator surface, not a second public CLI. Its comparison helpers accept only the
checked-in Experiments and their exact resolved Scenario set or exact base-plus-Patch set. The Sweep
helper accepts only the checked-in Critical-tier points `0`, `2`, and `3`; it does not accept custom
points or generate ranges, steps, axes, products, Patches, or Breakpoints. These helpers do not
synthesize variants, mutate fixtures, infer whether a larger metric is better, or substitute a
nearby supported comparison for an unsupported request. The Patch helper accepts only already-valid
content-addressed Patch and base inputs; it does not repair, rehash, or synthesize either Artifact.
The Breakpoint helper accepts only the checked-in aligned left and right Sweeps at coordinates
`0`, `2`, and `3`. It reports their finite sampled finding and does not accept custom inputs,
generate points, search continuously, interpolate, infer monotonicity, or declare a winner.

## Specification maturity

All 59 Clauses are `active`; no planned Clause remains. The generated coverage view reports 33
property-tested, 25 example-tested, and one manual Clause.
Machine-verified active Clauses use independent oracles exercised by `just check`. All runtime
Rules remain synthetic and retain `experimental` evidence status.
