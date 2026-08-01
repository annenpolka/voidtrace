# Codebase Investigation Report: VoidTrace Experiment slice

> Investigated on 2026-08-01 | 31,017 handwritten TypeScript/Pkl lines across 186 non-generated files | Primary language: TypeScript and Pkl

## Executive Summary

VoidTrace currently has a complete, content-addressed path for evaluating one synthetic Scenario, but it has no normative Experiment Contract, comparison output, runner package, or Experiment transport. The smallest change that preserves the existing architecture is a resolved comparison: one immutable base Scenario reference, a bounded ordered list of immutable variant Scenario references, one primary metric, and an all-or-nothing runner between SDK and Kernel.

**Health Assessment**: Moderate concerns. The core contract, hashing, validation, and package boundaries are strong; current-state README text and one Target Graph Clause have drifted from implemented behavior.

**Confidence**: High for current structure and the absence of Experiment; medium-high for the selected first slice until its independent oracle and full gates pass.

**Static investigation limits**: Runtime correctness and performance of the new slice are not yet verified. Current-game Warframe behavior is intentionally out of scope because every executable mechanic remains synthetic and experimental.

### Verified Facts

- `specs/main.pkl` registers eight Contracts and no Experiment.
- The generated schema/type/validator pipeline is generic; an expressible Pkl Contract requires no Experiment-specific generator branch.
- Current execution is `CLI -> runtime-node -> SDK -> Kernel`, and SDK supplies the generated core Ruleset.
- No `packages/experiments`, Experiment CLI command, Experiment fixture, or comparison output exists.
- Artifact validation snapshots behavior-free JSON, rejects extra properties, verifies SHA-256 content hashes, and compares complete Artifact references.
- README stopped at Ruleset `0.13.0`; generated sources and the ExecPlan are at Ruleset `0.18.0`.
- `SCP-003` omits the already-supported resolved Direct-plus-Radial consumer from its finite accepted Target Graph list.

### Inferences

- `packages/experiments` belongs above Kernel and below SDK. It should orchestrate multiple single-Scenario evaluations without owning combat mechanics or I/O.
- Full Scenario references are safer than JSON Patch for Contract `0.1.0`: the current finite Contract IR has no recursive JSON value or JSON Pointer vocabulary, and Scenario Patch semantics remain unresolved.
- A public Comparison Artifact is worthwhile in the first executable slice because it makes the selected metric, base value, variant deltas, and Result provenance independently validateable.

### Unverified / Needs Follow-up

- Scenario Patch, parameter Sweep, breakpoint search, ruleset branches, Monte Carlo, worker orchestration, Runtime/CLI transport, Lab, API, and MCP remain future slices.
- Large experiment performance is unknown; the first slice favors correctness and reuses Kernel validation per branch.
- README freshness is not presently enforced by `just spec-check`.

**Top 3 Things to Know**:

1. Normative behavior must begin in `specs/**/*.pkl`; the design memo is context, not authority.
2. Experiment may order and compare Kernel calls but must not reproduce Damage, Critical, Armor, Target, or Trace semantics.
3. Every referenced Scenario, Catalog, Ruleset, Result, and Experiment revision must match its full content-addressed reference; failures return no partial comparison.

## System Model

### Purpose

VoidTrace evaluates structured synthetic combat Scenarios into reproducible Result and Trace Artifacts. The proposed slice adds deterministic comparison of already-resolved Scenario revisions while keeping question interpretation, patch planning, and game-data claims outside the runner.

### Major Units

- `specs/` — normative Clauses, Contracts, finite Ruleset IR, and generated-source entrypoint.
- `tools/spec-gen` / `tools/spec-check` — deterministic generation and byte-for-byte freshness checking.
- `packages/contracts` — strict generated-schema validation, canonical JSON, hashing, and Artifact-reference integrity.
- `packages/catalog` / `packages/rules` — Catalog indexing and finite Rule execution.
- `packages/kernel` — one pure deterministic Scenario evaluation.
- `packages/sdk` — application-facing composition with the generated core Ruleset.
- `packages/runtime-node` / `apps/cli` — Node input handling and terminal transport.
- proposed `packages/experiments` — bounded multi-evaluation orchestration and comparison aggregation only.

### Candidate Entrypoints

- `specs/main.pkl` — sole normative generator entrypoint.
- `packages/kernel/src/evaluate.ts` — single-Scenario evaluator.
- `packages/sdk/src/index.ts` — public application facade.
- `packages/runtime-node/src/application.ts` — current JSON/file/stdin boundary.
- `apps/cli/src/cli.ts` — current `describe` / `run` / `trace` command registration.

### Core Flows

1. Current Scenario flow — unknown JSON -> strict Scenario/Catalog/Ruleset validation -> domain narrowing -> finite Rule evaluation -> Result/Trace construction -> cross-Artifact integrity and Trace replay.
2. Proposed resolved comparison flow — Experiment plus exact Scenario set and Catalog -> Experiment/provenance validation -> base then declared variants through Kernel -> require the primary metric in every Result -> content-addressed Comparison Artifact plus complete evaluations, or one structured failure with no partial output.

### Technology Stack

| Layer | Technology | Version / Notes |
|------|------------|-----------------|
| Normative spec | Pkl | 0.32.x |
| Runtime | TypeScript / Node.js | strict TS, Node 24-26 |
| Schema validation | JSON Schema 2020-12 / Ajv | generated schemas, strict and non-coercing |
| Package manager | pnpm | 11.x, exact external versions |
| Tests | Vitest / fast-check | all `packages`, `apps`, and `tools` test files |
| CI | GitHub Actions | `just check` on Node 24 and 26 |

## Evidence Matrix

### Coverage Lane Matrix

| Coverage lane | Units covered | Key evidence | Status |
|--------------|---------------|--------------|--------|
| Structure & Layout | specs, all packages, CLI, tools, docs, fixtures | `rg --files`; package manifests; entrypoints | Closed |
| Dependency & Build System | workspace, manifests, CI, boundary checker | `pnpm-workspace.yaml`, `package.json`, `check.yml`, `check-boundaries.ts` | Closed |
| Code Patterns & Conventions | Pkl IR, generated contracts, strict validation, discriminated outcomes | Contract model/renderers and package AGENTS | Closed |
| Architecture & Data Flow | CLI through Kernel; proposed Experiment flow | SDK, runtime-node, Kernel evaluator | Closed |
| Test & Quality Infrastructure | generator, freshness, boundaries, unit/property/E2E | Vitest config, `justfile`, representative tests | Closed statically; new runtime unverified |
| Git History & Evolution | README, scope Clause, SDK, boundaries | `git log`, `git blame` | Closed |

### Phase Completion

| Phase | Status | Notes |
|------|--------|-------|
| Phase 1: Preflight Census | Full | 186 non-generated files; primary units and exclusions recorded |
| Phase 2: Surface Coverage Sweep | Full | Specification, generated, runtime, transport, test, and documentation surfaces covered |
| Phase 3: Flow Tracing | Full | Current and proposed entry-to-output paths traced |
| Phase 4: Cross-Cutting Census | Full | Validation, integrity, mutation, errors, secrets, dependency, and boundary checks covered |
| Phase 5: Falsification & Blind-Spot Hunt | Full | Negative searches, history, README drift, and Clause contradiction checked |
| Phase 6: Synthesis & Confidence Gate | Full | Minimum slice, exclusions, risks, and acceptance conditions recorded here |

### Contradiction Ledger

- README Ruleset `0.13.0`, 43 Clauses, and unsupported Direct-plus-Radial versus generated Ruleset `0.18.0`, 53 Clauses, and active Direct-plus-Radial/Beam — unresolved before implementation; update current-state documentation.
- `SCP-003` finite accepted Target Graph consumers omit resolved Direct-plus-Radial, while `IMP-001` and its Golden are active — unresolved before implementation; amend the Pkl Clause and regenerate.
- The design memo proposes patch/sweep/rule variants, while the finite Contract IR cannot express robust recursive JSON Patch semantics — resolved by limiting Experiment `0.1.0` to already-resolved Scenario references.

### Open Gap Ledger

- Patch isolation — Experiment planning surface — postponed until a Scenario Patch Contract and path/value semantics exist.
- Statistical experiments — Experiment runner — Monte Carlo and common-random-number semantics remain unsupported.
- Transport — Runtime/CLI — no Experiment command in this slice.
- Performance — experiments/Kernel boundary — repeated validation is accepted until measured.
- README freshness — documentation quality — outside generated roots; consider a later assertion or generated status block.

### Claim Confidence Table

| Claim | Label | Evidence | Counter-evidence attempted | Confidence |
|------|-------|----------|---------------------------|------------|
| Experiment does not exist in normative/runtime surfaces | Verified | negative `rg` across specs/packages/apps/tools/docs/data | searched Contract IDs, schema names, package names, commands, fixtures | High |
| Contract generation/registration is generic | Verified | Contract parser/renderer, schema index, Ajv registration | searched for an eight-Contract switch | High |
| Experiments belongs between SDK and Kernel | Inference | enforced imports and package AGENTS | checked alternate Runtime/CLI and Kernel ownership | Medium-high |
| Full Scenario refs are the minimum safe input | Inference | finite Contract IR and ArtifactRef integrity | evaluated JSON Patch and embedded Scenario alternatives | Medium-high |
| Current security posture is suitable for this pure local slice | Verified static | strict snapshot/validation/hash/error tests; no auth/network/server | secret, unsafe DOM/code execution, env-history, audit-config searches | High static |

## Findings by Coverage Lane

### Structure & Layout

- The repository is a package-per-responsibility pnpm workspace. Future absent roots are allowed, but `packages/experiments` has no boundary rule yet.
- Generated outputs are confined to `packages/spec-artifacts` and `docs/generated`; they must not be hand-edited.

### Dependency & Build System

- The SDK currently depends on Kernel, Rules, and generated capabilities. Experiments can depend on Contracts and Kernel; SDK can add Experiments while continuing to supply the core Ruleset.
- External dependency versions are exact. No non-standard registry or dependency-audit CI job was found.

### Code Patterns & Conventions

- Public unknown inputs are snapped to plain JSON before validation, comparison, or hashing. Accessors, prototypes, sparse arrays, cycles, hidden properties, and non-finite numbers are rejected.
- Outcomes are discriminated unions and unsupported behavior fails explicitly.

### Architecture & Data Flow

- Kernel owns exactly one Scenario evaluation and returns content-addressed Result/Trace Artifacts after semantic replay.
- The Experiment runner must inject or receive a single evaluator, preserve declared branch order, and aggregate only existing Result metrics.

### Test & Quality Infrastructure

- Root Vitest discovery automatically includes a new package's colocated tests.
- Active behavioral Clauses require independent oracles; schema validation alone cannot activate comparison behavior.
- Adversarial tests must cover duplicate IDs/refs, missing/extra scenarios, wrong content hashes or provenance, missing metrics, evaluator failure, mutation attempts, and comparison construction failure.

### Git History & Evolution

- README was last brought current at resolved Pellet allocation and was not updated through later Direct-plus-Radial and Beam milestones.
- `SCP-003` was introduced with Target Graph and extended through Pellet allocation, but not when Direct-plus-Radial began consuming the same impact-distance relations.

## Risks & Recommendations

### Technical Debt & Risks

#### Critical

- None found in the investigated local, headless, synthetic slice.

#### Moderate

- **Normative accepted-set drift**: `SCP-003` contradicts an active vertical slice.
  - Evidence: `specs/kernel/scope.pkl` versus `IMP-001` and generated Golden coverage.
  - Impact: agents and generated documentation can reject or misdescribe an implemented path.
  - Confidence: High.
- **All-or-nothing integrity across multiple evaluations**: a naive runner could return a valid base with a missing or failed variant.
  - Evidence: current Kernel only defines a single-evaluation outcome.
  - Impact: misleading comparisons or silent zero substitution.
  - Confidence: High.

#### Low

- **README status drift**: current behavior is described manually outside freshness-controlled roots.
  - Evidence: history and generated-doc comparison.
  - Impact: incorrect onboarding and compatibility decisions.
  - Confidence: High.
- **Repeated preparation cost**: the first runner will reload and validate Catalog/Ruleset per branch.
  - Evidence: current Kernel evaluation path.
  - Impact: inefficient large sweeps, not incorrect small comparisons.
  - Confidence: Medium; unmeasured.

## Recommendations

### Before making changes

1. Correct `SCP-003` in Pkl and regenerate before claiming a new boundary.
   - Evidence: active Direct-plus-Radial contradicts its accepted-set description.
   - Why now: preserve the specification-first source of truth.
2. Define both Experiment input and Comparison output Contracts plus two executable Clauses before handwritten runner code.
   - Evidence: schema validation cannot establish reference compatibility, order, metric presence, or fail-closed behavior.
   - Why now: these are public compatibility and integrity semantics.

### Quick wins

1. Add `packages/experiments` to the architecture boundary checker.
   - Evidence: future roots are allowed but Experiment has no import policy.
   - Why now: prevent Node/UI/LLM/mechanics leakage at package creation.
2. Refresh README's current-state section after the new slice lands.
   - Evidence: it stopped five Ruleset milestones ago.
   - Why now: restore a usable operator-facing status summary.

### Areas needing deeper investigation

1. Scenario Patch and recursive JSON value design — required before safe patch-based A/B isolation.
2. Prepared evaluation/session boundary — measure before Sweep or Monte Carlo.
3. Comparison semantics beyond the signed `variant - base` delta — improvement direction, ratios, ties, Pareto, and uncertainty need separate Clauses.
