# Codebase Investigation Report: VoidTrace Patch-backed Experiment slice

> Investigated on 2026-08-01 | Static repository analysis only | Primary languages: TypeScript and Pkl

## Executive Summary

VoidTrace can materialize one exact `ScenarioPatch 0.1.0` into an ordinary Scenario and can compare
one base plus one to 15 already-resolved Scenario revisions. These operations are currently
separate. The smallest next slice that follows the design memo without duplicating orchestration is
an atomic Patch-backed Experiment: one exact base Scenario and one to 15 ordered exact Patch
references are all resolved before the existing base-then-variant comparison begins.

The selected order is:

```text
Patch-backed Experiment -> one-axis finite Sweep -> Breakpoint
```

Sweep is not selected first because it would otherwise need to invent a second Patch resolution and
comparison path. Breakpoint depends on Sweep and additionally needs explicit crossover, tie,
monotonicity, precision, and no-result semantics.

No web research is required. This is a repository-specific Contract and orchestration decision and
does not depend on current Warframe mechanics.

## Selected boundary

- `Experiment` advances to `0.2.0` and accepts either the existing homogeneous resolved variants
  (`{ id, scenarioRef }`) or a homogeneous Patch-backed list (`{ id, patchRef }`). Mixed source
  modes are rejected in the first slice.
- Resolved mode preserves the existing exact Scenario-set behavior.
- Patch-backed mode receives exactly the base Scenario and the exact declared Patch set. Supply
  order is irrelevant; Experiment declaration order is authoritative.
- Every Patch must reference the exact Experiment base Scenario. Patch source identities and
  materialized Scenario `(id, revision)` pairs must be unique.
- The request, Experiment, Catalog, Ruleset, base Scenario, and every Patch are snapshotted and
  validated before the first Scenario evaluation. All variants are materialized before the base is
  evaluated.
- Evaluation remains base first, then materialized variants in declaration order through the
  existing single-Scenario evaluator.
- The existing `Comparison 0.1.0` wire shape is retained. Its Experiment reference provides Patch
  provenance; its rows reference the ordinary materialized Scenarios and their Results.
- A Patch, materialization, evaluation, metric, arithmetic, or integrity failure returns no
  Comparison and no partial evaluation or materialized-Scenario rows.
- Kernel, Rules, runtime-node, and formal `describe` / `run` / `trace` CLI remain unchanged.
- Sweep, range expansion, multiple axes, Cartesian products, Breakpoint, ruleset branches, Monte
  Carlo, winner, tie, ranking, ratio, interpolation, and concurrency remain unsupported.

## Verified facts

- `specs/main.pkl` currently registers only `EXP-001`, `EXP-002`, and `SCN-001` for Experiment and
  Patch behavior. No Sweep or Breakpoint Contract, Clause pattern, or capability exists.
- `Experiment 0.1.0` accepts only ordered full Scenario references and explicitly excludes Patch,
  Sweep, and Breakpoint execution.
- `ScenarioPatch 0.1.0` already supplies an exact base reference, explicit result identity, bounded
  operations, deterministic materialization, and a verified output hash.
- `packages/experiments` already owns both comparison orchestration and Patch materialization while
  remaining independent of filesystem, network, process, UI, and LLM concerns.
- The current comparison runner validates the complete Scenario set before evaluation, preserves
  declaration order, verifies Result/Trace integrity, and returns no partial rows.
- The current SDK snapshots an Experiment request before asynchronously loading the generated core
  Ruleset.
- The design memo places Patch variants before parameter Sweep in P0-B and says Experiment expands
  Scenarios by Patch rather than copying them.

## Inferences and alternatives

### Adopted: versioned Experiment union with homogeneous modes

This keeps one public Experiment Artifact and one Comparison Artifact. A content-addressed
Experiment records the exact Patch references, while Comparison records the materialized Scenario
and Result references. Requiring homogeneous source modes avoids ambiguous supplied-set rules in
the first slice while preserving the existing resolved comparison mode.

### Rejected: add Sweep first

A one-axis explicit-value Sweep is the next likely slice, but it still needs exact derived Scenario
identities, Patch resolution, all-or-nothing evaluation, and Comparison semantics. Implementing it
first would duplicate or hide the currently missing Patch-backed comparison boundary.

### Rejected: create a separate PatchExperiment Artifact

The design history treats variants and sweeps as Experiment behavior. A second top-level Artifact
would require another result/provenance relationship or an opaque conversion into Experiment,
without reducing the core integrity work.

### Rejected: mutate Experiment `0.1.0` in place

Variant wire shape is a compatibility surface. Adding Patch variants requires a new Experiment
schema version even though the Comparison row shape can remain `0.1.0`.

## Data flow and failure topology

```text
unknown request
  -> one descriptor snapshot
  -> Experiment/Catalog/Ruleset validation + hashes + exact refs
  -> resolved mode: exact complete Scenario set
     patch mode: exact base Scenario + exact complete Patch set
  -> patch mode: materialize every variant in Experiment order
  -> validate unique materialized identities and Scenario provenance
  -> evaluate base once
  -> evaluate variants once in declaration order
  -> verify each Result/Trace against its Scenario
  -> project the primary metric and signed variant-base deltas
  -> validate/hash/cross-check Comparison
  -> complete success
```

Any failure before or during this flow returns only a fixed structured Experiment failure. Caller
objects are not mutated, property-value getters are not executed, and structural Proxy trap details
are not exposed. Already-computed internal values are not returned on failure.

## Coverage evidence

| Coverage lane | Units covered | Status |
| --- | --- | --- |
| Structure and layout | specs, generators, generated artifacts, contracts, experiments, SDK, runtime, CLI, fixtures, skill | Closed |
| Dependency and build | workspace manifests, exact dependencies, boundary checker, CI, freshness gate | Closed statically |
| Patterns and conventions | finite Contract IR, schema versions, snapshot/hash/ref/freeze/failure patterns | Closed |
| Architecture and flow | Patch materializer into existing comparison evaluator | Closed |
| Tests and quality | unit, property, adversarial, SDK integration, helper smoke, Node 24/26 gates | Closed statically; new behavior unverified |
| Git history and evolution | resolved Experiment, Trace, Scenario Patch implementation and hardening commits | Closed |

### Phase completion

| Phase | Status | Result |
| --- | --- | --- |
| 1. Preflight census | Full | Medium Pkl/TypeScript pnpm monorepo; generated roots excluded from manual edits |
| 2. Surface sweep | Full | Normative, generated, runtime, transport, operator, fixture, and quality surfaces covered |
| 3. Flow tracing | Full | Patch materialization and resolved comparison paths traced entry-to-output |
| 4. Cross-cutting census | Full | validation, mutation, bounds, integrity, errors, dependencies, and static security reviewed |
| 5. Falsification | Full | negative searches, plan contradictions, history, and alternative slice ordering checked |
| 6. Synthesis | Full | Patch-backed Experiment boundary and exclusions fixed here |

## Contradiction and gap ledger

- The design memo uses Patch-backed variants, while normative Experiment `0.1.0` requires complete
  Scenario references. The new versioned Experiment mode resolves this gap without silently
  changing `0.1.0`.
- The memo's multi-axis example expands to 126 Scenarios, above the current 15-variant bound and
  without product, rounding, duplicate-point, or scheduling semantics. It remains history only.
- Some memo Patch examples use paths and operations outside current `ScenarioPatch 0.1.0`. The new
  slice composes only already-valid exact Patch Artifacts and does not widen Patch semantics.
- A base value in a future Sweep can conflict with the Patch no-op prohibition. The base row must be
  modeled separately when Sweep is designed.
- Existing investigation reports describe their pre-implementation snapshots. They remain history,
  not current-state specifications.
- Prepared evaluation performance remains unmeasured. The bounded 16-evaluation maximum is accepted
  for correctness; optimization requires measurement before larger sweeps.

## Static security result

No credential, private-key, environment-file history, auth endpoint, HTTP server, database, dynamic
code execution, or unsafe DOM sink was found in the product path. External dependencies are exactly
pinned with lockfile integrity values; no dependency-audit CI job is configured. The relevant trust
boundary is untrusted in-process JSON-shaped input. The new orchestration must preserve bounded
arrays, descriptor snapshots, exact-key validation, full Artifact hashes/references, fixed outward
errors, and no partial output. Portable JavaScript structural reflection may execute Proxy traps;
their exception details must remain contained.

## Acceptance matrix

- old resolved Experiment mode remains deterministic and passes its existing fixture;
- Patch-backed mode resolves one and 15 variants, independent of supplied Patch order;
- every Patch and materialized Scenario is bound to the exact base, Catalog, Ruleset, and game build;
- duplicate Patch refs, result identities, variant IDs, missing/extra Patch inputs, mixed source modes,
  stale hashes, wrong bases, unsupported derived Scenarios, and arbitrary failure positions fail
  closed before any misleading output;
- every Patch is materialized before the first evaluator call;
- base then declared variant evaluation order is retained;
- Comparison hash, Experiment ref, Scenario refs, Result refs, metric values, signed deltas, negative
  zero normalization, deep freeze, and caller immutability are independently checked;
- SDK snapshots before its Ruleset-load await and does not expose accessor or Proxy exception text;
- generated documents are reviewed after `just spec-gen` and before handwritten behavior;
- `just check` passes on Node 26 and Node 24; the repository-local operator helper has a literal
  synthetic fixture and explicit unsupported limits.
