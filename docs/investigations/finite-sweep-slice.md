# Codebase Investigation Report: VoidTrace one-axis finite Sweep slice

> Investigated on 2026-08-01 | Static repository analysis only | Primary languages: TypeScript and Pkl

## Executive Summary

VoidTrace already evaluates one exact base Scenario plus one to 15 exact ScenarioPatch variants as
an atomic, ordered Comparison. The smallest next slice is not a second evaluator or a runtime range
generator. It is a third homogeneous Experiment mode whose declared variants each bind one exact
Patch to one explicit `sweepPoint` coordinate on the same scalar Scenario path.

The selected order remains:

```text
Patch-backed Experiment -> one-axis finite Sweep -> Breakpoint
```

No web research is required. This is a repository-specific Contract and orchestration decision; it
does not depend on current Warframe mechanics.

## Selected boundary

- `Experiment` advances to `0.3.0` and accepts exactly one of three homogeneous variant arrays:
  resolved `{ id, scenarioRef }`, ordinary Patch-backed `{ id, patchRef }`, or finite Sweep
  `{ id, patchRef, sweepPoint: { path, value } }`.
- A Sweep has one to 15 explicitly declared points. It does not accept `from`, `to`, `step`, a range
  expression, or a generator callback.
- Every `sweepPoint.path` uses the existing ScenarioPatch allowlist and all points use exactly the
  same path. Declaration order is authoritative; values are not sorted.
- Every point value is a finite non-null JSON scalar and is canonically unique within the Sweep.
- Every exact referenced Patch contains exactly one `replace` operation whose path and value match
  the declared `sweepPoint`. The runner does not synthesize or repair Patch Artifacts.
- The base remains the existing separate Comparison base row. A point equal to the base is rejected
  by ScenarioPatch no-op validation instead of producing a duplicate base point.
- The exact base Scenario and complete exact Patch set are validated and every point is materialized
  before the first evaluator call. Evaluation remains base first, then points in declaration order.
- Existing `Comparison 0.1.0` is reused. It references the exact Experiment and ordinary
  materialized Scenarios and Results; no second Sweep result or comparison formula is introduced.
- Any Experiment, point, Patch, materialization, evaluation, metric, arithmetic, or integrity
  failure returns no Comparison and no partial point, materialized-Scenario, or evaluation rows.
- Kernel, Rules, runtime-node, and formal `describe` / `run` / `trace` CLI remain unchanged. The
  public SDK keeps `runExperiment`; the repository-local skill receives a fixed Sweep helper.
- Multiple axes, Cartesian products, ordinary variant-by-Sweep products, Patch chains, range
  expansion, interpolation, Breakpoint, ruleset branches, Monte Carlo, winner, tie, ranking, ratio,
  sorting, deduplication, concurrency, Planner, Lab, API, and MCP remain unsupported.

## Verified facts

- Normative behavior is registered only through `specs/main.pkl`; generated Contract, coverage, and
  TypeScript files are reverse translations and cannot be edited manually.
- `Experiment 0.2.0` currently has two homogeneous modes, both bounded to 1–15 variants. It has no
  Sweep field, point type, Clause pattern, or dedicated capability.
- `ScenarioPatch 0.1.0` already limits changes to 1–64 ordered same-kind non-null scalar
  replacements on an allowlisted path and assigns an exact result Scenario identity.
- Patch-backed Experiment resolution already validates an exact complete Patch set, binds every
  Patch to the exact base, materializes all variants before evaluation, and reuses Comparison.
- `packages/experiments` is the sole handwritten owner of Patch materialization and Experiment
  comparison. Its boundary checker forbids filesystem, network, process, UI, LLM, Rules, and
  generated-spec dependencies.
- `packages/sdk` snapshots the caller graph before asynchronously loading the generated core
  Ruleset and delegates Experiment behavior rather than duplicating it.
- The design memo's P0-B order is base Scenario, Patch variants, A/B difference, then parameter
  Sweep, and its examples say one changed condition must be mechanically isolated.
- The design memo also contains a broader two-axis range example that expands to 126 Scenarios; it
  does not define rounding, duplicate points, limits, ordering, partial failure, or Breakpoint
  semantics.

## Inferences and alternatives

### Adopted: third homogeneous Experiment variant mode

Putting `sweepPoint` beside the exact `patchRef` makes both analysis intent and executable
materialization content-addressed. The duplicated path/value are an integrity assertion: the runner
must prove that the exact Patch implements the declared point. The third closed object shape also
lets generated JSON Schema reject mixing ordinary Patch variants and Sweep points.

### Rejected: treat any Patch-backed Experiment as a Sweep

An ordinary Patch can contain many operations on many paths. Without a normative point coordinate,
the system cannot claim one-axis isolation or distinguish an A/B variant set from a Sweep.

### Rejected: synthesize Patches from `{ path, values }`

Runtime synthesis would need to invent Patch identity, result Scenario identity, revision, hash,
and collision behavior. It would bypass the exact Patch provenance and materialization boundary
that the preceding slice established.

### Rejected: add a separate top-level Sweep Artifact and result

The existing Experiment and Comparison already provide input and output identity, ordering,
provenance, metric projection, and all-or-nothing failure. A second orchestration Artifact would add
another reference graph without removing any integrity work.

### Rejected: optional untyped Sweep metadata on ordinary Patch variants

An optional top-level field would let the generated schema accept invalid combinations and defer
the mode distinction entirely to handwritten code. A third closed homogeneous variant shape keeps
the wire distinction explicit.

### Deferred: Breakpoint

The memo only says an agent may choose Sweep or binary search. It does not settle comparison sides,
monotonicity, equality, tolerance, brackets, discrete points, multiple crossings, or no-crossing
output. Breakpoint therefore remains a separate post-Sweep investigation.

## Data flow and failure topology

```text
unknown SDK request
  -> descriptor snapshot before Ruleset-load await
  -> Experiment/Catalog/Ruleset/base/Patch Contract + hash + exact-reference validation
  -> resolve exactly one homogeneous variant mode
  -> Sweep mode: same path + unique coordinates + one matching operation per Patch
  -> materialize every point from the same exact base
  -> validate every derived Scenario and its provenance
  -> evaluate base once
  -> evaluate points once in declaration order
  -> verify each Result/Trace against its Scenario
  -> project primary metric and signed point-minus-base deltas
  -> validate/hash/cross-check existing Comparison
  -> complete success
```

Any failure returns a fixed structured Experiment failure. Caller objects and evaluator outputs are
snapshotted and not mutated. Accessor values are not executed; portable structural Proxy traps may
run, but their exception details are contained. Internal partial materializations and rows are not
returned.

## Coverage evidence

| Coverage lane | Units covered | Status |
| --- | --- | --- |
| Structure and layout | specs, generated roots, contracts, experiments, SDK, CLI, fixtures, skill, docs | Closed |
| Dependency and build | workspace manifests, exact dependencies, boundary checker, CI, freshness gate | Closed statically |
| Patterns and conventions | versioned finite Contract IR, homogeneous unions, snapshot/hash/ref/freeze/failure patterns | Closed |
| Architecture and flow | SDK to Experiment preflight, Patch materialization, Kernel evaluation, Comparison | Closed |
| Tests and quality | contract, property, adversarial, SDK, helper subprocess, Node 24/26 gates | Closed statically; new behavior unverified |
| Git history and evolution | resolved comparison, ScenarioPatch, Patch-backed Experiment commits | Closed |

### Phase completion

| Phase | Status | Result |
| --- | --- | --- |
| 1. Preflight census | Full | Medium Pkl/TypeScript pnpm monorepo; 225 relevant tracked files and 28 tests |
| 2. Surface sweep | Full | Normative, generated, runtime, transport, operator, fixture, dependency, and quality surfaces covered |
| 3. Flow tracing | Full | SDK success path and preflight/materialization failure path traced entry-to-output |
| 4. Cross-cutting census | Full | validation, bounds, mutation, integrity, errors, dependencies, and static security reviewed |
| 5. Falsification | Full | negative searches, memo contradictions, history, and four alternative representations checked |
| 6. Synthesis | Full | Third homogeneous Experiment mode and exclusions fixed here |

## Contradiction and gap ledger

- The memo uses both singular `sweep.parameters` and plural `sweeps: ParameterSweep[]`, but never
  defines `ParameterSweep`. The selected one-axis point shape is a new normative choice, not a claim
  that either historical sketch was executable.
- The memo's range and multi-axis example conflicts with the current 15-variant finite bound and the
  requested staged order. Range generation and products remain unsupported.
- A base value cannot be represented by a valid no-op ScenarioPatch. The base is deliberately the
  separate Comparison base row.
- Patches can replace generic finite scalar Scenario leaves that the current Kernel later rejects as
  unsupported domain values. Sweep does not convert such failures into zero effects or skip rows.
- Existing investigation reports describe their own pre-implementation snapshots and remain design
  history rather than current normative truth.
- Prepared-evaluation performance is still unmeasured. The existing maximum of 16 sequential
  evaluations is retained; concurrency or a larger limit requires measurement.

## Static security result

No credential, private-key, committed environment file, auth surface, HTTP server, database, raw
SQL, file upload, unsafe DOM sink, dynamic code execution, or product-network path was found. Exact
dependency versions and lockfile integrity are present; CI does not run a dependency-audit command.
The relevant trust boundary is hostile in-process JSON-shaped input. Sweep must preserve bounded
arrays, descriptor snapshots, exact closed shapes, canonical values, full Artifact hashes and
references, fixed outward errors, and no partial output. The existing descriptor snapshot has no
byte or depth budget before later count gates; that residual resource-exhaustion risk is not widened
by adding range generation because range generation remains unsupported.

## Acceptance matrix

- resolved and ordinary Patch-backed Experiment modes remain deterministic and compatible after the
  explicit Experiment schema-version migration;
- Sweep accepts 1 and 15 points, preserves declaration order, and is invariant to supplied Patch
  order;
- every point uses one shared allowlisted path, a canonically unique scalar value, and an exact Patch
  with one matching operation;
- multiple paths, duplicate values, value/path mismatch, multi-operation Patch, mixed source modes,
  missing/extra/stale Patch inputs, wrong bases, colliding identities, invalid derived Scenarios, and
  arbitrary failure positions fail closed before misleading output;
- every point materializes before the first evaluator call, then base and points evaluate exactly
  once in declaration order;
- Comparison hash, Experiment reference, Scenario/Result references, values, signed deltas, negative
  zero normalization, deep freeze, caller immutability, and result/trace integrity remain checked;
- generated documents are reverse-reviewed after `just spec-gen` and before handwritten behavior;
- `just check` passes on Node 26 and Node 24; the repository-local helper uses tracked literal
  synthetic fixtures and states that no current-Warframe claim, range, multi-axis, or Breakpoint is
  produced.
