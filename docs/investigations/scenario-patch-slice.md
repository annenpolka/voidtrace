# Codebase Investigation Report: VoidTrace Scenario Patch slice

> Investigated on 2026-08-01 | Static repository analysis only | Primary languages: TypeScript and Pkl

## Executive Summary

VoidTrace can compare exact, already-materialized Scenario revisions, but it cannot yet derive a
variant from a base Scenario. The smallest safe next slice is a content-addressed
`ScenarioPatch 0.1.0` that performs one to 64 ordered, unique, same-type non-null scalar replacements at a
finite allowlist of existing Scenario paths and materializes one ordinary Scenario revision before
the existing Experiment or Kernel boundary.

This slice is deliberately not full RFC 6902. It excludes `add`, `remove`, `test`, `move`, `copy`,
root replacement, object or array values, structural Scenario edits, and Patch-aware Experiment
execution. An exact `baseScenarioRef`, including the base content hash, supplies a stronger stale
base precondition than a revision-only `test` operation.

**Health assessment**: Good foundation with one design gap. Snapshot, schema validation, hashing,
Artifact-reference integrity, and strict failure patterns are already reusable; Patch vocabulary,
pointer limits, output identity, and isolation exceptions were not previously specified.

**Confidence**: High for repository structure and the selected finite boundary. Runtime behavior
remains unverified until the Pkl Clause, independent property oracle, fixtures, and full gates pass.

### Selected boundary

```text
unknown request
  -> ScenarioPatch Contract + hash validation
  -> exact base Scenario Contract + hash + ArtifactRef validation
  -> ordered scalar replacements on an isolated descriptor-snapshot clone
  -> derived envelope (declared id/revision, createdFrom=base)
  -> Scenario Contract + new content hash validation
  -> ordinary Scenario
       -> existing SDK evaluation, or
       -> a separately constructed resolved Experiment 0.1.0
```

The materializer belongs in `packages/experiments` because it creates a Scenario variant without
owning combat semantics. `packages/contracts` continues to expose the generated Artifact type and
reproducibility utilities. Kernel, Runtime, and formal CLI remain unchanged.

## Verified facts

- No `ScenarioPatch`, `SCN-001`, or `patch_isolation` definition exists in current Pkl, generated
  artifacts, SDK, Experiment runner, Runtime, or CLI.
- `EXP-001` explicitly requires already-resolved Scenario references and forbids implicit JSON
  Patch execution.
- The design memo contains three incompatible operation shapes and several paths that do not match
  Scenario Contract `0.3.0`; it is design history rather than normative input.
- The finite Contract IR can express a scalar replacement operation without generator recursion,
  but it cannot express a general recursive JSON value for full RFC 6902.
- Scenario configuration and action parameters are already flat scalar records. Meaningful
  synthetic variations such as Critical tier, Armor, Health, falloff, resolved relation values,
  and time limits therefore fit the finite slice.
- A derived Scenario can pass through the existing Kernel unchanged. Its new content hash naturally
  propagates into Result and Trace fingerprints and into later Experiment Scenario references.
- `attachArtifactContentHash` hashes a descriptor snapshot without invoking property value getters
  but does not deep-freeze nested output by itself; the materializer must return a separately
  deep-frozen success value.
- Formal CLI behavior is normatively fixed to `describe`, `run`, and `trace`. Adding a Patch command
  would require a separate CLI vertical slice.

## Chosen Contract and semantics

`ScenarioPatch 0.1.0` is an immutable Artifact with:

- an exact `baseScenarioRef` of kind `voidtrace.scenario`;
- a declared `resultScenario` identity containing `id` and non-negative `revision`;
- one to 64 ordered operations;
- operation shape `{ op: "replace", path, value }`;
- non-null scalar values only: string, finite number, or boolean. `null` has no possible
  same-kind non-noop replacement and is rejected at the Contract boundary.

The first allowed path set is:

- `/attacker/configuration/<key>`;
- `/targets/<index>/configuration/<key>`;
- `/targetGraph/relations/<index>/resolvedDistanceMeters`;
- `/targetGraph/relations/<index>/lineOfSightClear`;
- `/targetGraph/relations/<index>/resolvedHitCount`;
- `/initialState/<key>`;
- `/actionPlan/<index>/parameters/<key>`;
- `/simulation/timeLimitMs`;
- `/metrics/<index>`.

`<key>` uses JSON Pointer escaping for `~` and `/`; array indices are canonical non-negative decimal
integers. Every path must already exist and resolve to a non-null scalar leaf. Replacements must preserve the
JSON scalar kind and must change the canonical value. Duplicate normalized paths are rejected.

Patch application must:

1. snapshot the request without invoking property value getters; portable JavaScript structural
   reflection can invoke Proxy traps, whose exception details must not escape;
2. validate the Patch and base Scenario Contracts and content hashes;
3. require the exact base Artifact reference and matching game build;
4. reject an output identity identical to the base identity;
5. apply every operation to an isolated clone in declaration order;
6. preserve base `$schema`, `kind`, `schemaVersion`, `gameBuild`, `catalogRef`, and `rulesetRef`;
7. set the declared output identity and `createdFrom` to the exact base Scenario reference;
8. compute a new content hash, validate the resulting Scenario, and deep-freeze success;
9. return no partial Scenario for any failure and never mutate caller inputs.

`SCN-001` defines isolation after excluding the envelope fields necessarily derived by the
materializer: `id`, `revision`, `createdFrom`, and `contentHash`. Every other canonical difference
must be named by exactly one successful replacement operation.

## Explicit unsupported boundary

- full RFC 6902 compatibility;
- `add`, `remove`, `test`, `move`, or `copy`;
- replacing the document root, an object, an array, or a missing field;
- changing Artifact envelope, Catalog or Ruleset provenance, actor/action/target identities,
  action or relation discriminators, Scenario structure, simulation mode, or assumption structure;
- changing JSON scalar types;
- Patch nesting, recursive values, Patch composition, merge conflict resolution, or inverse Patch;
- embedding Patch variants into Experiment `0.1.0`;
- automatic Experiment construction, Sweep, Breakpoint, Ruleset branches, Monte Carlo, ranking,
  winner selection, or statistical interpretation;
- Kernel mechanics inference, current-Warframe truth, Lab, API, MCP, or a new formal CLI command.

## Coverage evidence

| Coverage lane | Units covered | Status |
| --- | --- | --- |
| Structure and layout | specs, generated artifacts, contracts, experiments, SDK, Runtime, CLI, skill | Closed |
| Dependency and build | workspace manifests, boundary checker, CI, generator flow | Closed statically |
| Patterns and conventions | finite Pkl IR, strict schema validation, snapshot/hash/ref/failure patterns | Closed |
| Architecture and flow | Patch materialization before existing Experiment/Kernel | Closed |
| Tests and quality | validator, hashing, Experiment adversarial/property patterns, skill smoke | Closed statically; new runtime unverified |
| Git history and evolution | initial Contracts through resolved Experiment and rejected-Trace milestones | Closed |

### Phase completion

| Phase | Status | Result |
| --- | --- | --- |
| 1. Preflight census | Full | Medium TypeScript/Pkl monorepo; generated roots excluded from manual edits |
| 2. Surface sweep | Full | All Patch-adjacent normative, generated, runtime, operator, and test surfaces covered |
| 3. Flow tracing | Full | Selected pre-materialization flow reaches existing Kernel without a Kernel change |
| 4. Cross-cutting census | Full | Validation, mutation, integrity, errors, dependencies, and static security reviewed |
| 5. Falsification | Full | Negative searches, memo contradictions, stale paths, and history checked |
| 6. Synthesis | Full | Finite scalar-replace slice and acceptance boundary fixed here |

## Contradiction ledger

- The memo alternates between nested YAML, RFC-style JSON, and Pkl-oracle Patch operations. The new
  Contract selects the RFC-style field names but only the explicitly specified scalar subset.
- Memo paths such as `/targetGraph/targets/0/level` and
  `/attacker/weaponBuild/arcane/id` do not exist in Scenario `0.3.0`. The selected paths are derived
  from the current generated Contract.
- The original wording “only named paths change” conflicts with content-addressed derived Artifact
  envelopes. `SCN-001` explicitly excludes the four derived envelope fields from its isolation
  comparison.
- Existing `experiments.resolved-comparison` capability groups every `experiments` Clause. Adding
  `SCN-001` requires the generator to split `EXP-*` and `SCN-*` into separate capabilities.
- The pre-implementation statements in `docs/investigations/experiment-slice.md` are historical;
  its remaining Scenario Patch gap is still accurate.

## Test and acceptance matrix

The independent oracle must cover:

- a literal Patch changing `/actionPlan/0/parameters/criticalTier` from `1` to `2`;
- exact output identity, `createdFrom`, content hash, Scenario Contract, and deep freeze;
- canonical equality outside the declared leaf and derived envelope fields;
- deterministic repeated application and caller-input immutability;
- 1 and 64 operations, declaration order, and generated safe scalar replacements;
- stale Patch hash, stale base hash, wrong base ref, and wrong game build;
- zero or 65 operations, duplicate normalized paths, missing paths, non-scalar targets, scalar-kind
  changes, no-op replacements, non-canonical array indices, invalid escapes, and protected roots;
- `__proto__`, `constructor`, escaped slash/tilde keys, accessors, hidden properties, sparse arrays,
  structural Proxy trap failures, and exceptions whose text must not leak into structured errors;
- a contract-valid but Kernel-unsupported derived Scenario remaining a later evaluation failure,
  rather than being silently repaired by the Patch layer;
- evaluation of the checked-in derived Scenario through the existing SDK with the synthetic,
  experimental caveat intact.

The repository gate remains `just check` on Node 26 and
`mise x node@24 -- just check`, followed by the repository-local skill smoke. Generated documents
must be reviewed as a reverse translation of the Pkl source before handwritten implementation is
accepted.

## Static security result

No credentials, private keys, environment files, auth surface, HTTP endpoint, database, dynamic
code execution, or unsafe DOM sink was found in scope. Dependencies are exactly pinned and GitHub
Actions are commit-pinned; no dependency-audit job is configured. The principal risks for this
local pure slice are prototype-bearing input, accessor execution, pointer ambiguity, partial output,
and exception disclosure. Existing descriptor snapshots and fixed outward error messages provide
the patterns the new materializer must preserve.

No web research was required. The unresolved question was repository-specific Contract design,
and the finite local IR plus current Scenario schema were sufficient to choose a conservative
boundary without introducing current or external factual claims.
