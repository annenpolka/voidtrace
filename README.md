# VoidTrace

VoidTrace is being built as two layers:

- **VoidTrace Kernel** — a headless, reproducible execution model for Warframe combat mechanics.
- **VoidTrace Lab** — an AI-assisted analysis environment that turns questions into inspectable experiments.

The current repository state is **Commit 3: Kernel skeleton**. It establishes the normative
Pkl specification, deterministic generated artifacts, five versioned Artifact contracts, and
the mechanics-free Kernel foundation: an ordered Event Queue, logical-coordinate RNG, explicit
World State transitions, and an immutable empty Ruleset. It does not yet contain a catalog,
combat formulas, CLI, Lab, or verified Warframe mechanics.

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

This commit intentionally stops at the five contracts named in the implementation sequence.
`ScenarioPatch`/JSON Patch, domain-specific Result proof fields, and their independent
behavior clauses begin in later vertical slices; they are not reported as supported here.

## Specification maturity

The Event Queue and logical-coordinate RNG clauses are `active` because independent property
tests exercise them through `just check`. Deterministic combat replay and explicit rejection of
unsupported mechanics remain `planned` until the first complete Kernel vertical slice exists.
