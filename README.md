# VoidTrace

VoidTrace is being built as two layers:

- **VoidTrace Kernel** — a headless, reproducible execution model for Warframe combat mechanics.
- **VoidTrace Lab** — an AI-assisted analysis environment that turns questions into inspectable experiments.

The current repository state is **Commit 1: specification pipeline initialization**. It establishes the normative Pkl specification, deterministic generated artifacts, and freshness checks. It does not yet contain a combat kernel, catalog, CLI, Lab, or verified Warframe mechanics.

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

## Specification maturity

The initial clauses describe foundational obligations such as deterministic replay and explicit rejection of unsupported mechanics. They are marked `planned`: the specification pipeline validates and publishes them, but the future Kernel must provide the independent property oracles before they may be marked `active`.
