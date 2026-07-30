# VoidTrace

VoidTrace is being built as two layers:

- **VoidTrace Kernel** — a headless, reproducible execution model for Warframe combat mechanics.
- **VoidTrace Lab** — an AI-assisted analysis environment that turns questions into inspectable experiments.

The current repository state is **Commit 12: standalone resolved Radial falloff**. It establishes the
normative Pkl specification, deterministic generated artifacts, eight versioned public contracts,
and Ruleset `0.7.0` revision `1` on the Kernel foundation: an ordered Event Queue,
logical-coordinate RNG, explicit World State transitions, and generated finite Rule IR. Strictly
validated synthetic mini catalogs supply one hitscan weapon and one target to deterministic or
analytic expected Direct Hit / Critical / Armor round trips. Critical resolution accepts either a fixed
non-negative safe-integer tier or an explicit roll against a non-negative Catalog Critical
chance whose adjacent tiers are safely representable. For chance `c`, the roll resolves between
`floor(c)` and the next reachable tier; resolved tier `t` scales damage by
`1 + t * (criticalMultiplier - 1)`. The formal `voidtrace` / `vt` command surface emits
content-addressed Result and causal Trace Artifacts for these slices as deterministic JSON.
Expected mode evaluates each reachable adjacent Critical tier through Armor and terminal Health
commit, then weights final Damage Vectors and remaining Health. It does not invent a realized
Critical roll or tier. Resolved fixed-count Multishot expands one action into up to 64 stable,
ordered Direct Hit child events, commits each hit to the preceding World State, and aggregates the
terminal Damage Vector and final Health without generating Multishot or per-hit Critical rolls.
Resolved fixed-count pellets use a separate action, emission Rule, aggregation Rule, capability,
and Trace identity while reusing the Direct Hit pipeline for each ordered pellet.
Standalone Radial evaluation accepts an explicit finite falloff multiplier in `[0, 1]`, applies it
after fixed Critical resolution and before Armor, and records a distinct Radial event and metrics.

This slice and its runtime Rules remain synthetic and experimental. They are not verified
statements of current Warframe mechanics. Generated random rolls, Monte Carlo,
Critical inputs whose tiers or resulting multiplier cannot be represented safely, mods,
headshots, Shield, Overguard, projectiles, status, probabilistic Multishot, custom-count helper
variation, Multishot-plus-pellet composition, variable or probabilistic pellets, per-pellet rolls,
pellet hit distribution, Spread, Multishot or pellet expected values, Trace queries, comparisons,
distance-derived Radial falloff, physical geometry, Direct-plus-Radial or Projectile parent
composition, multi-target Radial damage, and the Lab remain unsupported.

`VoidTrace計画.md` is design input and discussion history. Normative behavior lives only under `specs/`.

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

`just spec-gen` regenerates the committed package under `packages/spec-artifacts/` and the human-readable views under `docs/generated/`.

`just spec-check` regenerates into a temporary directory and compares every controlled file byte-for-byte. It never repairs stale generated files implicitly.

## Contract boundary

Pkl under `specs/contracts/` is the sole contract source. It generates:

- Draft 2020-12 JSON Schemas and TypeScript projections under `packages/spec-artifacts/`
- Human-readable contract documentation under `docs/generated/`

The handwritten `@voidtrace/contracts` package registers every generated Schema with Ajv in strict mode. It validates without coercion or default insertion and provides RFC 8785 canonical JSON, SHA-256 Artifact fingerprints, stable ID checks, and cross-Artifact integrity checks. `Fingerprint.resultHash` identifies canonical execution inputs; Result and Trace content hashes independently identify their complete stored payloads. The package contains no game mechanics.

This commit intentionally stops at the eight contracts and generated Ruleset `0.7.0` required by
the deterministic, single-hit expected, resolved fixed-count Multishot, and resolved fixed-count
pellet round trips plus standalone resolved Radial falloff and their structured CLI failure surface.
`ScenarioPatch`/JSON Patch and later domain-specific Result proof fields remain future work.

## CLI

Both executable names point to the same entry. JSON is the default; `--json` is accepted
explicitly and `--pretty` changes whitespace only.

```bash
pnpm exec vt describe
pnpm exec vt run data/fixtures/golden/direct-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec voidtrace trace data/fixtures/golden/direct-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/probability-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/tier-2-critical-armor.scenario.json \
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
pnpm exec vt run - --catalog data/fixtures/catalog-mini/catalog.json \
  < data/fixtures/golden/direct-critical-armor.scenario.json
```

`run` writes only a Result Artifact to stdout; `trace` writes only its Trace Artifact.
On failure stdout remains empty and stderr receives one structured Problem. Exit codes are
`2` for invalid input, `3` for unsupported mechanics, `4` for a computation limit, and
`5` for an internal failure. The CLI has no implicit Catalog fixture and never prompts.

## Repository-local skill

The skill at `.agents/skills/voidtrace/SKILL.md` is a fixed-tier/expected fixture-variation and
formal-CLI golden inspection helper. It accepts non-negative safe-integer deterministic tiers and
an analytic expected preset through its helper, and documents the resolved fixed-count Multishot
and pellet fixtures plus standalone resolved Radial falloff through the formal CLI. It is not a
second public CLI and does not synthesize Critical chance, rolls, Multishot counts, pellet counts,
distance, or geometry:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --critical-tier 4 --armor 0 --health 1000
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --expected
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --expected --armor 0 --health 250
pnpm exec vt run data/fixtures/golden/multishot-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/pellet-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
pnpm exec vt run data/fixtures/golden/radial-critical-armor.scenario.json \
  --catalog data/fixtures/catalog-mini/catalog.json
.agents/skills/voidtrace/scripts/smoke.sh
```

Both interfaces delegate to the same application evaluation boundary. Unsupported mechanics are
reported explicitly rather than approximated.

## Specification maturity

Of thirty Clauses, twenty-nine are `active`; `TRC-002` remains a planned rejection-trace
obligation. `CRT-001` covers the generalized adjacent-tier distribution for safely representable
non-negative Critical chance and an explicit deterministic roll. `CRT-002` covers the
`1 + tier * (criticalMultiplier - 1)` scale. `CRT-003` covers terminal-branch analytic expected
values, including per-branch Health-zero clamp before weighting. All runtime Rules retain
`experimental` evidence status. `MSH-001` covers bounded expansion into ordered fixed-count child
hits without implicit randomness. `PLT-001` separately covers bounded fixed-count pellets from one
shot without Multishot composition, hit distribution, Spread, or implicit randomness. `TRC-001`
replays final Damage and terminal Health from Trace, anchored to the Scenario's initial Health.
`RAD-001` covers a standalone Radial Hit whose resolved falloff multiplier is applied between
Critical and Armor without deriving it from distance or geometry.
Generated randomness, probabilistic Multishot or pellets, and Monte Carlo remain future Clauses.
