# Codebase Investigation Report: VoidTrace finite sampled Breakpoint slice

> Investigated on 2026-08-01 | Static repository analysis plus one in-memory synthetic fixture
> probe | Primary languages: TypeScript and Pkl

## Executive Summary

VoidTrace can now materialize and evaluate one-axis finite Sweeps, but it cannot yet make the
historical plan memo's broad claim that a continuous A/B crossover exists at an interpolated
coordinate. The current finite points may be discrete or discontinuous, and a standalone
`Experiment + Comparison` pair does not contain enough bodies to re-prove the Patch, Scenario,
Result, and Trace checks performed by the Experiment runner.

The selected first Breakpoint slice therefore composes two complete finite Sweep requests inside
one `packages/experiments` call. Both sides are snapshotted, fully preflighted, and materialized
before either side is evaluated. After both complete successfully, a deterministic finite scan
compares the two absolute primary-metric series at the same explicitly declared numeric
coordinates. Its Artifact may report only one of these observational findings:

- `exact-equality`: the two sampled metric values are exactly equal at one declared coordinate;
- `sampled-sign-reversal`: two adjacent sampled differences have opposite non-zero signs; or
- `no-observed-candidate`: neither condition occurs in the supplied finite samples.

Multiple candidates are ambiguous and fail without an Artifact. A sampled sign reversal is not a
claim that a continuous root exists between the points. No interpolation, binary search,
monotonicity, winner, ranking, tie policy, or current-Warframe truth is introduced.

No web research is required. This is a repository-specific Contract, provenance, and orchestration
decision over explicitly synthetic inputs.

## Selected boundary

- Add a separate `FiniteBreakpointAnalysis 0.1.0` content-addressed Artifact. `Experiment 0.3.0`
  and `Comparison 0.1.0` remain unchanged.
- Add a dedicated `BRK-001` property-tested Clause, oracle pattern, and
  `experiments.finite-breakpoint` capability.
- Accept one caller-declared analysis ID and revision, one common Catalog and generated Ruleset,
  and named `left` and `right` finite Sweep requests.
- Require each side to be a valid 1-to-15-point Sweep backed by an exact complete Patch set.
- Snapshot the complete caller graph before the first await. Preflight and materialize both sides
  before the first evaluator call.
- Require the two Experiments to share exact Catalog and Ruleset refs, game build, primary metric,
  Sweep path, point count, and coordinate values in the same declaration order.
- Restrict this analysis to finite numeric coordinates that are strictly increasing in declaration
  order. Existing string, boolean, descending, and unordered Sweeps remain valid Sweeps but are
  unsupported Breakpoint sources.
- Evaluate left base and points, then right base and points, reusing the existing sequential
  Experiment runner and its Result/Trace/Comparison integrity checks.
- Require every Result fingerprint used by both series to share product, Engine, and Scenario
  schema versions.
- Compute each sample's exact finite signed difference as `left metric - right metric`, normalize
  negative zero, and reject non-finite arithmetic.
- Scan every sample. Count exact-zero samples and adjacent non-zero sign reversals without
  multiplying signs. One candidate succeeds, zero candidates produces a successful
  `no-observed-candidate`, and more than one fails as ambiguous.
- Store every coordinate, both variant IDs, Scenario and Result refs, metric values, and signed
  difference in the Analysis Artifact so the finite observation is auditable.
- Keep Kernel, Rules, runtime-node, formal `describe` / `run` / `trace` CLI, Lab, API, MCP, and
  current-game mechanics unchanged.
- Add a thin SDK facade and a fixed repository-local helper that runs two checked-in synthetic
  Sweeps and the finite analysis. The helper does not accept custom points or infer a continuous
  value.

## Why the original shortcuts were rejected

### Rejected: cross `Comparison.deltaFromBase` against zero

That usually rediscovers the known base coordinate because every point is a one-path Patch of the
same base. It is not the plan memo's A/B crossover and has little product value.

### Rejected: analyze four standalone Experiment/Comparison Artifacts

A correctly re-hashed Comparison can contain caller-selected metric values and Result refs.
Likewise, Experiment metadata alone cannot prove that each exact Patch contained the declared
single operation. The public slice must not describe such inputs as fully evaluated Sweeps.

### Rejected: claim a root bracket or continuous crossover

For a discontinuous metric, opposite signs at adjacent samples do not prove an equality between
them. Equal endpoint signs also do not prove that the interval contains no hidden crossings.
Therefore the wire claim is `sampled-sign-reversal`, and absence is explicitly
`no-observed-candidate` within the supplied samples.

### Rejected: threshold-only analysis as the roadmap Breakpoint

A finite metric-versus-threshold scan is coherent, but it does not implement the plan memo's
left/right comparison. It can be added later as a separate predicate without overloading this
Artifact.

### Rejected: adaptive binary search

The current system requires exact content-addressed Patch and result Scenario identities before
evaluation. Runtime midpoint generation would need new identity, hash, termination, rounding,
continuity, and monotonicity rules. None is defined by the normative specification.

## Phase evidence

| Phase | Coverage | Result |
| --- | --- | --- |
| 1. Preflight census | tracked tree, worktree, packages, specs, tests, CI | Clean public `main` at `87e30c1`; medium Pkl/TypeScript monorepo; no Breakpoint implementation |
| 2. Surface sweep | plan memo, normative Pkl, generated Contracts/capabilities, experiments, SDK, operator, docs | Memo contains several incompatible Breakpoint sketches; current normative surface explicitly excludes all of them |
| 3. Flow tracing | SDK snapshot, Experiment preflight/materialization, evaluation, Comparison construction, failure paths | The safe insertion point is after two complete preflights and two complete successful Comparisons, inside `packages/experiments` |
| 4. Cross-cutting census | closed schema, canonical snapshot, hashes, refs, finite arithmetic, deep freeze, boundary checker, dependency pins, security checklist | No new dependency or I/O is needed; existing failure containment and package boundaries apply |
| 5. Falsification/history | version history, negative search, unsorted/non-numeric points, exact/plateau/multiple/no candidate, forged Artifact model | Separate `0.1.0` Artifact and dedicated capability fit history; weak four-Artifact and continuous-root claims were rejected |
| 6. Synthesis | selected Contract, flow, failures, exclusions, acceptance matrix | This document fixes the finite observational two-series slice |

## Existing flow and ownership

The current Experiment flow is:

```text
SDK request
  -> descriptor snapshot before Ruleset load
  -> Experiment/Catalog/Ruleset/Scenario/Patch Contract, hash, and exact-ref validation
  -> complete Patch-set materialization
  -> base then points in declaration order
  -> Result/Trace integrity verification
  -> content-addressed Comparison
```

The Breakpoint composition adds one owner-controlled stage:

```text
complete Breakpoint request snapshot
  -> left preflight and full materialization
  -> right preflight and full materialization
  -> shared numeric-axis compatibility checks
  -> left complete Experiment evaluation
  -> right complete Experiment evaluation
  -> fingerprint compatibility checks
  -> finite left-minus-right sample scan
  -> hash, Contract validation, and integrity check of one Analysis Artifact
```

Any failure returns one frozen structured error and no Analysis, partial sample list, Comparison,
evaluation row, or materialized Scenario. Earlier internal evaluator calls cannot be undone, but
their Artifacts are not returned when a later evaluation or analysis step fails.

`packages/experiments` owns both orchestration and the finite scan. The SDK only snapshots its
smaller request, loads the generated core Ruleset once, and delegates. The repository-local helper
owns file loading and golden projection only; it must not recalculate samples or candidates.

## Proposed Artifact shape

The generated Contract is a closed object with this conceptual shape:

```text
FiniteBreakpointAnalysis 0.1.0
  Artifact envelope
  method = finite-scan
  leftExperimentRef / rightExperimentRef
  leftComparisonRef / rightComparisonRef
  primaryMetric / sweepPath
  productVersion / engineVersion / scenarioSchemaVersion
  samples[1..15]
    value
    leftVariantId / rightVariantId
    leftScenarioRef / rightScenarioRef
    leftResultRef / rightResultRef
    leftMetricValue / rightMetricValue
    signedDifference
  finding
    exact-equality { sampleIndex }
    | sampled-sign-reversal { lowerSampleIndex, upperSampleIndex }
    | no-observed-candidate
```

The Contract IR can express all local field shapes and bounds. Cross-Artifact refs, aligned
coordinates, strict ordering, arithmetic, candidate uniqueness, adjacent indices, and complete
fingerprint agreement remain independent oracle obligations.

## Falsification matrix

| Signed samples | Outcome |
| --- | --- |
| `[-5, 0, +7]` | one `exact-equality`; zero-adjacent pairs are not double-counted |
| `[+5, 0, +7]` | one `exact-equality`; no winner flip is claimed |
| `[-5, +7]` | one `sampled-sign-reversal`; no continuous root is claimed |
| `[+5, +7]` | `no-observed-candidate`; hidden between-point behavior is not denied |
| `[-5, +7, -2]` | ambiguous failure with no Analysis |
| `[0, 0]` | ambiguous equality plateau with no Analysis |
| `[0]` | one endpoint `exact-equality` |
| `[+5]` | `no-observed-candidate` within one sample |
| finite operands whose subtraction overflows | arithmetic failure |
| same values in descending or arbitrary order | unsupported Breakpoint source; no sorting |
| mismatched path, coordinates, metric, Catalog, Ruleset, build, or fingerprint versions | source mismatch failure |

## Verified synthetic fixture probe

An in-memory probe used the checked-in Critical-tier points `0`, `2`, and `3` and the existing
Kernel without changing files. The left series used the checked-in Armor-300, Health-1000 base;
the right used a synthetic Armor-0, Health-1100 base. For `target.health.remaining` the verified
point values were:

```text
coordinate:       0    2    3
left metric:    950  850  800
right metric:  1000  800  700
left - right:   -50  +50 +100
```

This yields exactly one sampled sign reversal between declared points `0` and `2`. The fixture is
synthetic and experimental; it is only an end-to-end orchestration example.

## Acceptance conditions

- Pkl is the only normative source; generated files are changed only by `just spec-gen`.
- Generated reverse translation shows one new active Clause, one new Contract, and a supported
  `experiments.finite-breakpoint` capability while Ruleset and Engine versions remain unchanged.
- Contract tests cover every finding union member and reject malformed or overlapping shapes.
- Independent/property tests cover one to 15 points, exact equality, sign reversal, absence,
  plateau, multiple candidates, reversed sides, numeric overflow, and negative-zero normalization.
- Public-runner adversarial tests cover invalid hashes, mismatched refs/rows/paths/coordinates,
  unordered and non-numeric axes, mixed fingerprint versions, input mutation, accessor avoidance,
  Proxy exception containment, and failure without partial Artifacts.
- SDK and subprocess tests run the checked-in two-Sweep fixture and compare a literal expected
  Analysis Artifact.
- `just check` passes on Node 26 and Node 24, repository-local smoke exits zero, and generated files
  are fresh.

## Explicitly unsupported after this slice

- a continuous crossover coordinate, interpolation, root finding, tolerance, or confidence bound;
- adaptive point generation, binary search, ranges, steps, sorting, deduplication, or resampling;
- monotonicity claims or proof;
- winner, loser, metric direction, ranking, preference, or tie policy;
- multiple-candidate enumeration or plateau interval output;
- string or boolean axes, descending axes, unordered coordinates, multiple axes, or products;
- arbitrary/custom points in the repository-local helper;
- probabilistic or Monte Carlo Breakpoints;
- formal CLI, Lab, API, MCP, Planner, or LLM selection of Sweep versus search;
- current-Warframe values or mechanics claims.

## Confidence and residual risk

Confidence is high for repository structure, generated-Contract conventions, Experiment integrity
flow, and the selected finite observational semantics. Confidence is medium for future product
fit: the historical memo uses Breakpoint for several broader continuous and discrete use cases.

Residual risks remain the existing unbounded descriptor snapshot depth/byte size and the reviewed
oracle-pattern whitelist. The first slice also evaluates both complete series even when an early
sample already looks decisive, because early stopping would weaken ambiguity detection and failure
atomicity.
