# VoidTrace

VoidTrace is being built as two layers:

- **VoidTrace Kernel** — a headless, reproducible execution model for Warframe combat mechanics.
- **VoidTrace Lab** — an AI-assisted analysis environment that turns questions into inspectable experiments.

The current repository state is **Commit 6: CLI**. It establishes the normative
Pkl specification, deterministic generated artifacts, eight versioned public contracts, and
the Kernel foundation: an ordered Event Queue, logical-coordinate RNG, explicit World State
transitions, and generated finite Rule IR. A strictly validated synthetic mini catalog supplies
one hitscan weapon and one target to a deterministic Direct Hit / fixed Critical tier / Armor
round trip that emits content-addressed Result and causal Trace Artifacts. The formal
`voidtrace` / `vt` command surface exposes that slice as deterministic JSON.

This slice is synthetic and experimental. It is not a verified statement of current Warframe
mechanics, and probability Criticals, mods, headshots, Shield, Overguard, projectiles, status,
multishot, Trace queries, comparisons, and the Lab remain unsupported.

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

This commit intentionally stops at the eight contracts required by the first round trip and its
structured CLI failure surface.
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
pnpm exec vt run - --catalog data/fixtures/catalog-mini/catalog.json \
  < data/fixtures/golden/direct-critical-armor.scenario.json
```

`run` writes only a Result Artifact to stdout; `trace` writes only its Trace Artifact.
On failure stdout remains empty and stderr receives one structured Problem. Exit codes are
`2` for invalid input, `3` for unsupported mechanics, `4` for a future computation limit, and
`5` for an internal failure. The CLI has no implicit Catalog fixture and never prompts.

## Repository-local skill

The skill at `.agents/skills/voidtrace/SKILL.md` remains a fixture-variation and literal-golden
inspection helper. It is not a second public CLI:

```bash
node .agents/skills/voidtrace/scripts/evaluate-slice.ts --critical-tier 0 --armor 0 --health 1000
.agents/skills/voidtrace/scripts/smoke.sh
```

Both interfaces delegate to the same application evaluation boundary. Unsupported mechanics are
reported explicitly rather than approximated.

## Specification maturity

Nineteen clauses are `active` because their boundary checks, property tests, or literal
golden example are exercised through `just check`. Critical probability normalization remains
`planned`; the current slice accepts only an explicit fixed tier of `0` or `1`.
