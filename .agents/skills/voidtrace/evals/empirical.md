# VoidTrace skill empirical evaluation

The checklists below are frozen before executor dispatch. A critical miss makes the scenario fail;
normal items score full, half, or zero for accuracy.

> Commit 7 scope note: this evaluation covers the fixed-tier helper only. The formal CLI's
> checked-in explicit-roll Scenario is documented by the skill but is not evidence from these
> empirical rounds.

## Commit 7 structural re-review

- Initial Iteration 0 review found description/body gaps around the formal CLI roll trigger,
  fixed-tier helper input boundary, Monte Carlo exclusion, and the roll Trace recipe.
- The minimum wording fixes were applied to those four points.
- A fresh structural reviewer reported CLEAR / PASS with no new overclaim.
- This was a static description/body check only. It is not an execution round and does not add
  empirical convergence credit.

## Iteration 0: description/body consistency

- Description trigger: operate or inspect the temporary synthetic Direct Hit / fixed Critical /
  Armor slice.
- Body coverage: supported boundary, executable recipes, output contract, limitation language, and
  explicit non-use cases all match that trigger.
- Deliberate exclusion: the skill is not the planned public `voidtrace` / `vt` CLI.
- Static result: consistent. This is structural review, not empirical convergence evidence.

## Fixed baseline scenarios and checklists

### Scenario A — median: inspect the golden run

Ask for the synthetic golden run's metrics and causal rule decisions.

1. [critical] Invoke the checked-in adapter successfully and base the answer on its output.
2. Report all seven requested golden metrics accurately.
3. Report the four applied Rule IDs and the rejected fixed-tier candidate with its reason.
4. State that the values are synthetic/experimental and are not verified current Warframe claims.
5. Do not modify repository files.

### Scenario B — supported edge: compare two resolved inputs

Compare tier 0 / Armor 0 against tier 1 / Armor 300 at Health 1000.

1. [critical] Execute both supported variants through the adapter.
2. Keep the two Result/Trace outputs distinct and report the requested final damage and Health.
3. Identify the matching and rejected fixed-tier Rule candidates for each run.
4. Preserve the synthetic/experimental limitation.
5. Do not derive or restate mechanics formulas in the response.

### Scenario C — unsupported edge: real headshot build advice

Ask for a current-game headshot build recommendation using this skill.

1. [critical] Do not run or reinterpret the synthetic slice as an answer to the real-game request.
2. Name headshots and current-game build advice as outside this skill's supported boundary.
3. Do not silently treat the unsupported mechanic as zero effect.
4. Offer only the supported synthetic slice or a separately authorized current-data workflow.

## Failure pattern ledger

No empirical executor findings yet.

## Iteration 1

### Changes from Iteration 0

- None. Iteration 0 found no description/body gap.
- Pattern applied: none.

### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — golden inspection | ○ | 100% | unavailable | unavailable | 0 | — |
| B — supported comparison | ○ | 100% | unavailable | unavailable | 0 | — |
| C — unsupported real-game request | ○ | 100% | unavailable | unavailable | 0 | — |

The collaboration runner did not expose `tool_uses` or `duration_ms`; those fields are recorded as
unavailable rather than estimated.

### Structured reflection

- Scenario A: no unclear points; all four phases OK.
- Scenario B: no unclear points; all four phases OK.
- Scenario C: no unclear points; all four phases OK.

### Discretionary fill-ins

- Scenario A preserved metric keys and used Trace sequence order.
- Scenario B interpreted “final damage” as `damage.health.total` and included Artifact hashes to
  distinguish runs.
- Scenario C answered in Japanese and named the two allowed next workflows.

### Ledger updates

None.

Convergence check: one consecutive clear empirical round. A fresh second round is required.

## Iteration 2

### Changes from Iteration 1

- None. Iteration 1 surfaced no unclear point requiring a targeted fix.
- Pattern applied: none.

### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — golden inspection | ○ | 100% | unavailable | unavailable | 0 | — |
| B — supported comparison | ○ | 100% | unavailable | unavailable | 0 | — |
| C — unsupported real-game request | ○ | 100% | unavailable | unavailable | 0 | — |

### Structured reflection

- All three fresh executors reported every phase OK and no unclear points.

### Discretionary fill-ins

- Scenario A included exit status, game build, and empty verified coverage.
- Scenario B stated that equal final values came from distinct Result/Trace executions.
- Scenario C named the supported slice boundary before offering the two allowed next workflows.

### Ledger updates

None.

## Holdout

The unused holdout requested tier 1, Armor 0, Health 50 and asked for three distinct output fields
plus Critical decisions.

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| D — low-Health supported input | ○ | 100% | unavailable | unavailable | 0 | — |

The executor ran the adapter once and accurately reported `damage.health.total: 200`,
`damageBySource: {"action.direct-hit-1": 200}`, `target.health.remaining: 0`, tier 1 applied,
tier 0 rejected, and the experimental limitation. It reported no unclear points. Accuracy dropped
0 points from the recent 100% average.

## Evaluation status

- Description/body consistency: pass.
- Two consecutive fresh-executor rounds: 100% accuracy, all critical items pass, zero new unclear
  points, zero retries.
- Holdout: pass at 100%, with no overfitting signal.
- `tool_uses` and `duration_ms`: unavailable from this collaboration runner, so the formal
  step-count and duration convergence thresholds cannot be asserted or fabricated.
- Resource decision: ship the temporary skill on qualitative/accuracy convergence; keep the two
  unavailable telemetry axes explicit.

## Commit 8 generalized-tier re-evaluation

The Commit 7 results above are historical. Commit 8 changes the helper from fixed tier `0`/`1` to
any non-negative safe-integer fixed tier and adds a checked-in tier-2 explicit-roll CLI path.

### Iteration 0: description/body consistency

- The old description, supported-request list, helper parser, examples, and Trace interpretation
  all encoded the superseded binary boundary.
- One cohesive fix updates those surfaces to the generalized fixed-tier and adjacent-tier boundary.
- The skill still excludes generated randomness, expected values, and current-game claims.
- Static result after the fix: description and body are consistent. This does not count as an
  empirical convergence round.

### Frozen scenarios and requirements

#### Scenario A — median: vary a generalized fixed tier

Run the helper with fixed Critical tier 4, Armor 0, and Health 1000, then summarize the result.

1. [critical] Execute the helper successfully with `--critical-tier 4 --armor 0 --health 1000`.
2. Report Critical tier, Critical multiplier, final Health damage, and remaining Health accurately.
3. Report the four applied Rule IDs and state that the Trace has no rejected Rule.
4. State that the values are synthetic/experimental, not verified current Warframe claims.
5. Do not modify repository files or restate the mechanics formula.

#### Scenario B — supported edge: inspect the tier-2 explicit-roll golden

> Historical note: this Commit 8 checklist predates `TRC-002`. Current explicit-roll Trace
> reporting is reevaluated in the later `TRC-002` section and includes one rejected candidate.

Run and inspect both Result and Trace for the checked-in tier-2 explicit-roll Scenario.

1. [critical] Invoke formal `vt run` and `vt trace` with the tier-2 Scenario and matching Catalog.
2. Report base tier, next tier, fraction, resolved tier, Critical multiplier, final Health damage,
   and remaining Health accurately.
3. Report the five applied Rule IDs and state that the Trace has no rejected Rule.
4. Preserve the synthetic/experimental limitation.
5. Do not modify repository files or claim generated randomness.

#### Holdout C — unsupported edge: ask the helper to generate a custom roll

Ask for a helper run at custom Critical chance 2.4 with a generated random roll.

1. [critical] Do not edit a Catalog, fabricate a roll, or reinterpret a fixed-tier run as the
   requested probability run.
2. Name Critical-chance variation and generated rolls as outside the helper boundary.
3. Offer the checked-in explicit-roll CLI fixtures or separately authorized implementation work.
4. Do not approximate the unsupported mechanics as zero effect.

### Iteration 1

#### Changes from Iteration 0

- None after the generalized-tier consistency fix.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — generalized fixed tier | ○ | 100% | unavailable | unavailable | 0 | — |
| B — tier-2 explicit roll | ○ | 100% | unavailable | unavailable | 0 | — |

The collaboration runner did not expose `tool_uses` or `duration_ms`; those fields remain
unavailable rather than estimated.

#### Structured reflection

- Both fresh executors reported all four phases OK and no unclear points.

#### Discretionary fill-ins

- Scenario A summarized the applied Rules in Trace order.
- Scenario B distinguished the Catalog Critical multiplier from the resolved tier multiplier.

#### Ledger updates

None.

Convergence check: one consecutive clear generalized-tier round. A fresh second round is required.

### Iteration 2

#### Changes from Iteration 1

- None. Iteration 1 surfaced no unclear point requiring a fix.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — generalized fixed tier | ○ | 100% | unavailable | unavailable | 0 | — |
| B — tier-2 explicit roll | ○ | 100% | unavailable | unavailable | 0 | Understanding |

#### Structured reflection

- Scenario A: no unclear points; all four phases OK.
- Scenario B:
  - Issue: the skill called the tier-2 fixture “checked-in”, but it was not yet tracked in the
    active implementation worktree.
  - Cause: the instruction used repository-state wording as an invariant.
  - General Fix Rule: describe an available local artifact by location or role unless version
    control state has been verified for the current run.

#### Discretionary fill-ins

- Scenario B independently distinguished Result `critical.multiplier` from Trace
  `criticalMultiplier`; the instruction had not defined the two names.

#### Ledger updates

- Added: repository-state wording treated as invariant.
- Added: input and resolved metric name collision.

#### Next fix proposal

- Use “repository-local” for the tier-2 fixtures and explicitly distinguish the applied Result
  multiplier from the Catalog input shown in Trace.

Convergence check: reset to zero consecutive clears because a new unclear point surfaced.

### Iteration 3

#### Changes from Iteration 2

- Replaced tier-2 “checked-in” claims with repository-local artifact wording.
- Defined Result `critical.multiplier` as the applied tier factor and Trace
  `criticalMultiplier` as the Catalog input.
- Pattern applied: repository-state wording treated as invariant; input and resolved metric name
  collision.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — generalized fixed tier | ○ | 100% | unavailable | unavailable | 0 | — |
| B — tier-2 explicit roll | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Both fresh executors reported all four phases OK and no unclear points.

#### Discretionary fill-ins

- Scenario A used `--pretty` for readability without changing values.
- Scenario B verified the dirty-worktree state and avoided claiming the new files were tracked.

#### Ledger updates

- No new patterns.

Convergence check: one consecutive clear round after the Iteration 2 fix.

## TRC-002 rejection-trace re-evaluation

This re-evaluation follows the activation of `TRC-002`. It supersedes only earlier claims that
the explicit-roll Trace has no rejected Rule; fixed-tier and expected-mode results are unchanged.

### Frozen scenarios and requirements

#### Scenario A — supported edge: tier-2 explicit roll

1. [critical] Run formal `vt run` and `vt trace` with the tier-2 Scenario and matching Catalog
   without editing files.
2. Report base tier 1, next tier 2, fraction 0.25, resolved tier 2, applied multiplier 3, Health
   Damage 150, and remaining Health 850.
3. Report five applied Rules, six total decisions, and exactly one rejected
   `rule.impact.resolve-shared-critical-roll` candidate with predicate stage and
   `predicate.event-kind-mismatch`.
4. Treat the rejection as a same-phase event-kind non-match, not an evaluation failure or a
   zero-effect mechanic.
5. Preserve the synthetic/experimental boundary and do not claim generated randomness.

#### Scenario B — supported edge: shared-roll Direct plus Radial impact

1. [critical] Run formal `vt run` and `vt trace` with the shared-roll impact Scenario and matching
   Catalog without editing files.
2. Report chance 0.25, roll 0.2, tier 1, Direct 100, Radial 135, aggregate 235, remaining Health
   215, and target Health A=100, C=55, B=60.
3. Report 17 applied decisions, 18 total decisions, and exactly one rejected
   `rule.critical.resolve-tier-roll` candidate with predicate stage and
   `predicate.event-kind-mismatch`.
4. Preserve the non-failure rejection meaning, shared parent, and Direct-before-Radial order.
5. Preserve the synthetic/experimental boundary and the stated roll-sharing limitations.

### Iteration 0 — pre-fix baseline

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — tier-2 explicit roll | ○ | 100% | unavailable | unavailable | 0 | — |
| B — shared-roll impact | ○ | 100% | unavailable | unavailable | 0 | — |

Both executors corrected the runtime facts from formal Trace output. Scenario B therefore passed
despite the skill still saying 17 total decisions, which exposed instruction/runtime drift rather
than an output failure. Scenario A repeated the already-documented distinction between Catalog
Critical multiplier input 2 and applied Result multiplier 3.

- Issue: a capable executor could self-correct the stale shared-roll count, but the instruction
  itself still contradicted the formal Trace.
- Cause: the skill's literal Trace interpretation had not moved with the activated rejection
  Clause.
- General Fix Rule: when an auditable decision is added, update both the general decision semantics
  and each affected literal decision count close to the interpretation recipe.

### Iteration 1

#### Changes from Iteration 0

- Defined the two `critical.roll` candidates, the predicate rejection reason and reads, and the
  non-failure/non-zero interpretation.
- Updated Direct explicit-roll to six total decisions and shared-roll impact to 17 applied plus
  one rejected decision, 18 total.
- Pattern applied: runtime drift obscured by successful executor self-correction.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — tier-2 explicit roll | ○ | 100% | unavailable | unavailable | 0 | — |
| B — shared-roll impact | ○ | 100% | unavailable | unavailable | 0 | — |

Both fresh executors satisfied every frozen requirement and reported zero retries. Scenario B's
structured note described the domain-level risk of misreading a rejection; it did not identify an
instruction ambiguity and repeated the interpretation now stated by the skill.

#### Discretionary fill-ins

- Scenario A separated the Catalog multiplier input from the applied multiplier.
- Scenario B reported exact actual/expected event kinds and target-local Health transitions.

#### Ledger updates

- Added: runtime drift obscured by successful executor self-correction.

Resource cutoff: ship after one targeted post-fix round because both baseline and post-fix rounds
were 100%, every critical item passed, retries were zero, and no target-instruction ambiguity
remained. Collaboration metadata did not expose tool-use or duration, so full quantitative
convergence is not claimed.

## `69e881a` resolved Experiment comparison re-evaluation

This evaluation covers the repository-local resolved Scenario comparison added after the Experiment
and Comparison Contracts. It does not extend the formal CLI or claim current Warframe mechanics.

### Iteration 0: description/body consistency

- The description names resolved comparison inspection and Comparison JSON without broadening the
  skill to Scenario Patch, Sweep, Breakpoint, Monte Carlo, or current-game advice.
- The body fixes the supported input to one tracked Experiment and its exact base plus two declared
  Scenario revisions, documents the executable helper, and defines signed `variant - base` without
  winner semantics.
- The checked-in precondition still requires `git ls-files --error-unmatch` and exact HEAD bytes
  before an executor may call an Artifact checked-in.
- Static result: description and body are consistent. This is not an empirical convergence round.

### Frozen scenarios and requirements

#### Scenario A — median: inspect the resolved comparison golden

Run the repository-local comparison helper with both pretty output and golden checking, then
summarize the Comparison.

1. [critical] Verify the Experiment, expected projection, Catalog, Ruleset, and three Scenario
   fixtures are tracked and byte-identical to HEAD, then execute the helper successfully with
   `--pretty --check-golden`.
2. Report the Experiment ID, Comparison ID, and primary metric accurately.
3. Report the base Scenario value and zero delta, then both variants in declaration order with
   exact metric values and signed deltas.
4. State that every member produced integrity-checked Result and Trace Artifacts and that exit 0
   plus golden checking passed.
5. Preserve the synthetic/experimental limitation, infer no winner, and modify no files.

#### Scenario B — supported edge: explain the negative delta

Inspect the checked-in comparison and explain what the Radial variant's negative delta establishes.

1. [critical] Verify the relevant fixtures are tracked and byte-identical to HEAD, then execute the
   comparison helper rather than calculating from prose.
2. Report base `100`, explicit-roll variant `100` with delta `0`, and Radial variant `75` with delta
   `-25`, preserving declaration order.
3. Define `-25` only as Radial metric minus base metric for `damage.health.total`.
4. Do not call either branch better, worse, a winner, or a tie; the slice has no metric-direction
   or ranking semantics.
5. Preserve the synthetic/experimental limitation and modify no files.

#### Scenario C — unsupported edge: Patch, Sweep, ranking, and Monte Carlo

Ask the skill to JSON Patch Armor, sweep several values, rank a winner, and run 10,000 Monte Carlo
iterations.

1. [critical] Do not run or substitute the checked-in comparison as an answer to the unsupported
   request, edit fixtures, invent Patch semantics, or fabricate statistical output.
2. Name Scenario Patch, Sweep, winner/ranking semantics, and Monte Carlo as outside the supported
   comparison boundary.
3. Do not silently reduce any unsupported behavior to zero effect.
4. Offer only the exact repository-local resolved comparison or separately authorized Pkl-first
   implementation work.
5. Make no current-game claim and modify no files.

#### Holdout D — custom Beam ratio comparison

Ask for a custom Beam-versus-Direct comparison, ratio, and winner using new Scenario inputs.

1. [critical] Do not synthesize the Scenarios, repurpose the checked-in Experiment, or infer a
   ratio/winner.
2. Name custom comparison membership, ratios, and winner direction as unsupported by this helper.
3. Offer the exact checked-in comparison or separately authorized Pkl-first implementation work.
4. Preserve the synthetic boundary and modify no files.

### Iteration 1

#### Changes from Iteration 0

- None. The structural pass surfaced no targeted wording fix.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved comparison golden | ○ | 100% | unavailable | unavailable | 0 | — |
| B — signed negative delta | ○ | 100% | unavailable | unavailable | 0 | — |
| C — unsupported Patch/Sweep/ranking/Monte Carlo | ○ | 100% | unavailable | unavailable | 0 | — |

The collaboration runner did not expose authoritative `tool_uses` or `duration_ms`; executor-side
command counts are not substituted for those fields.

#### Structured reflection

- All three fresh executors reported Understanding, Planning, Execution, and Verification as OK,
  every critical item passed, and no instruction was unclear.
- Scenario A verified all seven input files as tracked and byte-identical to HEAD, then ran
  `--pretty --check-golden` at exit 0 and reported the complete declared projection.
- Scenario B independently ran the helper and limited `-25` to `75 - 100` for
  `damage.health.total`; it inferred no winner, loser, ranking, or tie.
- Scenario C did not run the helper or edit fixtures. It named all four requested capabilities as
  unsupported and offered only the exact resolved fixture or separate Pkl-first work.

#### Discretionary fill-ins

- Scenario A included the Comparison content hash and explicitly called the order declarative, not
  ranked.
- Scenario B listed the underlying synthetic Rule traces. This was accurate extra evidence and did
  not broaden comparison semantics.
- Scenario C identified future seed, aggregation, direction, and tie choices as implementation
  questions without treating them as blockers to the required unsupported response.

#### Ledger updates

- None. The helper script was still untracked during this documentation commit, but no instruction
  called the script itself checked-in; all Artifacts described that way were independently verified
  against HEAD.

Convergence check: one consecutive clear resolved-comparison round. A fresh second round is
required.

### Iteration 2

#### Changes from Iteration 1

- None. Iteration 1 surfaced no instruction-side ambiguity requiring a targeted change.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved comparison golden | ○ | 100% | unavailable | unavailable | 0 | — |
| B — signed negative delta | ○ | 100% | unavailable | unavailable | 1 | Execution |
| C — unsupported Patch/Sweep/ranking/Monte Carlo | ○ | 100% | unavailable | unavailable | 0 | — |

Authoritative Agent `tool_uses` and `duration_ms` remained unavailable. Scenario B's retry was an
executor-authored `jq` projection syntax correction after the requested helper had already been
selected; it did not expose an unclear skill instruction or change the reported Comparison.

#### Structured reflection

- Scenario A independently reproduced exit 0, golden success, all seven tracked/HEAD-identical
  inputs, the exact IDs and declaration order, values 100/100/75, deltas 0/0/-25, and the
  synthetic/no-winner boundary.
- Scenario B independently reproduced the exact projection and limited `-25` to the signed
  arithmetic difference for `damage.health.total`. The optional output filter needed one syntax
  retry, while the helper contract and final answer remained unambiguous.
- Scenario C again stopped without executing or substituting a fixture. It named Patch, Sweep,
  ranking direction, and Monte Carlo as unsupported and offered the exact fixture or Pkl-first
  implementation only.

#### Discretionary fill-ins

- Scenario A called out that the helper script itself was not yet tracked in the documentation
  worktree while every Artifact described as checked-in was tracked and HEAD-identical.
- Scenario B listed Rule IDs even though the frozen checklist required only Comparison semantics.
- Scenario C listed Patch paths, Sweep ranges, metric direction/ties, and random distributions as
  future implementation inputs. These were properties missing from the unsupported user request,
  not ambiguities in the skill's instruction to stop without inference.

#### Ledger updates

- None. The single projection-command retry did not recur as an instruction-side failure pattern.

Qualitative result: two consecutive rounds reached 100% with every critical item passing and zero
new instruction-side unclear points. Formal step-count and duration convergence cannot be asserted
because the collaboration runner did not expose those measurements. Holdout remains before the
resource decision.

### Initial holdout diagnosis

The unused holdout requested newly synthesized Beam and Direct Scenarios, a Damage ratio, and a
winner.

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| D — custom Beam ratio comparison | ○ | 100% | unavailable | unavailable | 0 | Understanding |

The executor correctly refused every unsupported operation, inferred no ratio or winner, made no
edit, and preserved the synthetic boundary. It nevertheless surfaced two instruction-side issues:

1. Issue: the documented helper itself was not yet tracked although its input Artifacts were.
   Cause: empirical execution preceded the operator-skill commit.
   General Fix Rule: evaluate a repository command as release-ready only after the command is
   tracked and byte-identical to HEAD.
2. Issue: “stop without replacing” did not say whether the exact fixture could still be mentioned
   as a distinct option after refusal.
   Cause: replacement/execution and non-substitutive introduction were not separated.
   General Fix Rule: unsupported branches should state the allowed post-refusal action explicitly,
   such as “mention allowed; execution as a substitute forbidden.”

The holdout is diagnostic rather than a convergence pass because it produced new instruction-side
unclear points.

### Iteration 3 targeted fixes

#### Changes from Iteration 2

- Committed the operator helper in `e3192a3`, so its path and bytes can be verified against HEAD.
- Clarified that after refusing an unsupported comparison, an executor may mention the exact
  checked-in comparison as a distinct example but may not run or present it as satisfying the
  request; separately authorized Pkl-first work remains allowed.
- Patterns applied: tracked executable precondition; mention versus substitute distinction.

#### Targeted rerun scenarios

- Scenario C: the frozen unsupported Patch, Sweep, ranking, and Monte Carlo request.
- Scenario D: the frozen custom Beam-versus-Direct ratio and winner holdout.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| C — unsupported Patch/Sweep/ranking/Monte Carlo | ○ | 100% | unavailable | unavailable | 0 | Understanding |
| D — custom Beam ratio comparison | ○ | 100% | unavailable | unavailable | 0 | — |

Both executors verified the helper was tracked and HEAD-identical, did not run it as a substitute,
and correctly distinguished an allowed mention from forbidden replacement execution. Scenario D's
list of ratio, direction, tie, and “new Scenario” choices concerns the unsupported user request and
future implementation, not the target instruction.

Scenario C surfaced one new target-instruction ambiguity:

- Issue: the frontmatter said to use the skill for unsupported-boundary reporting and then used
  “Do not use for” to list the same unsupported mechanics.
- Cause: invocation routing and executable capability were expressed as one exclusion.
- General Fix Rule: explicitly separate “may invoke to report unsupported” from “must not execute,
  approximate, or answer as supported.”

Convergence check: reset because a new Understanding-phase ambiguity surfaced.

### Iteration 4 targeted fix

#### Changes from Iteration 3

- Replaced the conflicting frontmatter exclusion with an explicit routing rule: the skill may be
  invoked to report an unsupported request, but must not execute, approximate, or answer it as
  supported.
- Pattern applied: routing condition versus execution capability.

#### Targeted rerun scenarios

- Scenario C: unsupported Patch, Sweep, ranking, and Monte Carlo.
- Scenario D: unsupported custom Beam-versus-Direct ratio and winner.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| C — unsupported Patch/Sweep/ranking/Monte Carlo | ○ | 100% | unavailable | unavailable | 0 | — |
| D — custom Beam ratio comparison | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Both fresh executors treated unsupported reporting as a valid invocation while refusing every
  requested execution or approximation.
- Both verified the helper was tracked and HEAD-identical without running it, separated an allowed
  mention of the exact fixture from forbidden substitution, and offered separately authorized
  Pkl-first implementation.
- Both explicitly separated future user-request choices from target-instruction ambiguity and
  reported zero target-instruction unclear points.

#### Ledger updates

- Tracked executable precondition: fixed by committing the helper before rerun.
- Mention versus substitute distinction: fixed by an explicit post-refusal sentence.
- Routing condition versus execution capability: fixed by the frontmatter routing sentence.

### Resolved comparison evaluation status

- Iteration 0 description/body consistency: pass.
- Baseline Iterations 1 and 2: every scenario at 100%, every critical item passed, with no
  instruction-side ambiguity; one optional output-filter syntax retry occurred in Iteration 2.
- Initial holdout: capability response correct at 100%, but two instruction issues surfaced and
  were fixed.
- Targeted Iteration 3: both original holdout issues cleared; one frontmatter routing ambiguity
  surfaced and was fixed.
- Targeted Iteration 4: unsupported-report routing and custom-comparison refusal both
  passed at 100%, zero retries, and zero target-instruction unclear points.
- `tool_uses` and `duration_ms` remained unavailable from the collaboration runner, so formal
  step-count and duration convergence thresholds are not asserted or fabricated.
- Resource decision: ship the resolved comparison operator skill on complete accuracy, critical
  coverage, tracked executable state, and the final targeted clear; retain the unavailable
  telemetry limitation explicitly.

## Commit 10 resolved fixed-count Multishot evaluation continuation

The historical Multishot evaluation resumes here after the self-contained resolved Experiment
evaluation record.

### Iteration 4

#### Changes from Iteration 3

- None. Iteration 3 surfaced no new unclear point.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved fixed-count fixture | ○ | 100% | unavailable | unavailable | 0 | — |
| B — unsupported probabilistic request | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Scenario A kept per-hit Direct Hit, aggregate terminal Damage, sequential Health clamp, ordered
  hit metadata, and generated-roll exclusions distinct with no unclear points.
- Scenario B stopped before execution, named every unsupported dimension, and offered only the
  resolved fixed-count fixture or separately authorized Pkl-first implementation.

#### Ledger updates

- No new patterns.

Convergence check: two consecutive clear rounds after the Iteration 2 fix.

### Commit 10 evaluation status

- Description/body consistency: pass.
- Two consecutive fresh-executor rounds after the metric-semantics fix: 100% accuracy, all
  critical items pass, zero new instruction-side unclear points, and zero retries.
- Unsupported edge: pass without execution, fabrication, approximation, or file mutation.
- `tool_uses` and `duration_ms`: unavailable from this collaboration runner, so those thresholds
  are not asserted.
- Resource decision: ship the resolved fixed-count Multishot operator documentation.

## Commit 11 resolved fixed-count pellet re-evaluation

Commit 11 adds a formal-CLI path for one repository-local four-pellet Scenario. Pellets belong to
one shot, have stable pellet identities in hit metadata, share one explicit fixed Critical tier,
and are distinct from the resolved fixed-count Multishot action.

### Iteration 0: description/body consistency

- Updated the description, supported boundary, formal CLI commands, unsupported list, and Trace
  interpretation for resolved fixed-count pellets.
- Distinguished one-pellet `damage.direct-hit.total` from `damage.pellet.total` and sequential
  Health clamp.
- Kept variable or probabilistic pellet counts, Multishot composition, hit distribution, Spread,
  per-pellet rolls, pellet expected values, generated randomness, and current-game claims outside
  the skill boundary.
- Static result: description and body are consistent. This is not an empirical convergence round.

### Frozen scenarios and requirements

#### Scenario A — median: inspect resolved fixed-count pellets

Run the repository-local pellet fixture through both formal CLI views and summarize its Result and
causal Trace.

1. [critical] Invoke `vt run` and `vt trace` with the pellet Scenario and matching Catalog.
2. Report pellet count, one-pellet Direct Hit total, aggregate Health damage, aggregate pellet
   damage, and final remaining Health accurately.
3. Report the pellet emission Rule, four repeated Rules for each of four ordered pellets, final
   pellet aggregation Rule, stable pellet identities, and sequential Health transitions.
4. Preserve the synthetic/experimental limitation and do not modify repository files.
5. Do not call the pellet group Multishot or claim generated pellet or Critical rolls.

#### Scenario B — unsupported edge: compose probabilistic Multishot and pellets

Ask for 2.5 Multishot times 12 pellets, distributed across two targets with Spread and generated
per-pellet Critical rolls, including expected and realized damage.

1. [critical] Do not edit Artifacts, fabricate rolls or hit distribution, or reinterpret either
   fixed fixture as the requested composition.
2. Name Multishot-plus-pellet composition, probabilistic/custom counts, multiple-target hit
   distribution, Spread, per-pellet Critical rolls, and grouped expected values as unsupported.
3. Offer the separate repository-local fixed Multishot or pellet fixtures, or separately
   authorized implementation work.
4. Do not approximate unsupported mechanics, make a current-game claim, or modify files.

### Iteration 1

#### Changes from Iteration 0

- None after the fixed-count pellet consistency update.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved fixed-count pellets | ○ | 100% | unavailable | unavailable | 0 | — |
| B — unsupported grouped composition | ○ | 100% | unavailable | unavailable | 0 | — |

The collaboration runner did not expose `tool_uses` or `duration_ms`; those fields remain
unavailable rather than estimated.

#### Structured reflection

- Both fresh executors satisfied every fixed requirement and reported zero retries.
- Scenario A's dirty-worktree note concerns the shared environment, not instruction ambiguity.
- Scenario B's undefined distribution, composition order, hit assignment, RNG, and aggregation
  are exactly the unsupported semantics the skill requires it not to infer.

#### Discretionary fill-ins

- Scenario A included decision count and empty rejected-Rule status.
- Scenario B called local fixtures “checked-in”; this was executor wording rather than a
  capability claim or checklist failure.

#### Ledger updates

- No new instruction-side failure pattern.

Convergence check: one consecutive clear fixed-pellet round. A fresh second round is required.

### Iteration 2

#### Changes from Iteration 1

- None. Iteration 1 surfaced no instruction-side fix.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved fixed-count pellets | ○ | 100% | unavailable | unavailable | 0 | — |
| B — unsupported grouped composition | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Scenario A reproduced all metrics, four stable pellet identities, 18 applied decisions, ordered
  Health commits, and matching Artifact hashes with no unclear points.
- Scenario B stopped without execution, explicitly rejected the `2.5 × 12 = 30` shortcut, named
  every unsupported dimension, and offered only separate fixed fixtures or implementation.

#### Ledger updates

- No new patterns.

Convergence check: two consecutive clear fixed-pellet rounds.

### Commit 11 evaluation status

- Description/body consistency: pass.
- Two consecutive fresh-executor rounds: 100% accuracy, all critical items pass, zero new
  instruction-side unclear points, and zero retries.
- Unsupported grouped-composition edge: pass without execution, fabrication, approximation, or
  file mutation.
- `tool_uses` and `duration_ms`: unavailable from this collaboration runner, so those thresholds
  are not asserted.
- Resource decision: ship the resolved fixed-count pellet operator documentation.

## Commit 8 generalized-tier evaluation continuation

The historical generalized-tier evaluation resumes here after the intervening Multishot and
pellet evaluation records.

### Iteration 4

#### Changes from Iteration 3

- None. Iteration 3 surfaced no unclear point requiring a fix.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — generalized fixed tier | ○ | 100% | unavailable | unavailable | 0 | — |
| B — tier-2 explicit roll | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Both fresh executors reported all four phases OK and no unclear points.

#### Discretionary fill-ins

- Scenario A listed Rules in Trace order.
- Scenario B included the literal roll and Armor factor as additional context.

#### Ledger updates

- No new patterns.

Convergence check: two consecutive clear rounds after the Iteration 2 fix. Holdout remains.

### Holdout

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| C — unsupported custom chance and generated roll | ○ | 100% | unavailable | unavailable | 0 | — |

The fresh executor did not edit a Catalog, fabricate a roll, or reinterpret a fixed-tier run. It
named both unsupported inputs, avoided a zero-effect approximation, and offered the
repository-local explicit-roll CLI fixture or separately authorized implementation work.

### Commit 8 evaluation status

- Description/body consistency: pass.
- Two consecutive fresh-executor rounds after the wording fix: 100% accuracy, all critical items
  pass, zero new unclear points, and zero retries.
- Holdout: pass at 100%, with no overfitting signal.
- `tool_uses` and `duration_ms`: unavailable from this collaboration runner, so those convergence
  thresholds are not asserted.
- Resource decision: ship the generalized temporary operator skill.

## Commit 9 analytic-expected re-evaluation

Commit 9 adds an analytic single-hit expected path. The helper selects a repository-local expected
Scenario and tier-2 Catalog with `--expected`; it does not generate random rolls or accept custom
Critical chances.

### Iteration 0: description/body consistency

- Updated the description, supported requests, commands, metric interpretation, and Trace
  interpretation for analytic expected evaluation.
- Defined expected remaining Health as the weighted result after each terminal branch clamps
  Health independently, distinct from subtracting raw expected damage from initial Health.
- Kept custom Critical chance, generated random rolls, Monte Carlo, and current-game claims outside
  the skill boundary.
- Static result: description and body are consistent. This is not an empirical convergence round.

### Frozen scenarios and requirements

#### Scenario A — median: inspect the bundled expected Scenario

Run `--expected` and summarize its expected metrics and branch Trace.

1. [critical] Execute the repository-local helper successfully with `--expected`.
2. Report expected multiplier, raw expected Health damage, and expected remaining Health accurately.
3. Distinguish per-branch Health clamping from subtracting raw expected damage from initial Health.
4. Report reached tiers, weights, repeated Rules, final aggregate Rule, and rejected Rule status.
5. Preserve the synthetic/experimental limitation and do not modify repository files.

#### Scenario B — supported edge: no Armor and higher Health

Run `--expected --armor 0 --health 250` and inspect both terminal branches.

1. [critical] Execute the repository-local helper successfully with the two overrides.
2. Report tier, weight, Health damage, and remaining Health for each branch accurately.
3. Distinguish raw expected Health damage from expected remaining Health.
4. Report repeated Rules, final aggregate Rule, and rejected Rule status.
5. Preserve the synthetic/experimental limitation, omit mechanics-formula restatement, and do not
   modify repository files.

#### Holdout C — unsupported custom chance and generated roll

Ask for Critical chance 2.4, a generated random roll, its average, and the realized outcome.

1. [critical] Do not edit a Catalog, fabricate a roll, or reinterpret a fixed/expected local preset.
2. Name custom Critical chance and generated random rolls as unsupported.
3. Offer repository-local expected/explicit fixtures or separately authorized implementation and
   research.
4. Do not approximate the request as zero effect, make a current-game claim, or modify files.

### Iteration 1

#### Changes from Iteration 0

- None after the analytic-expected consistency update.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — bundled expected Scenario | ○ | 100% | unavailable | unavailable | 0 | — |
| B — no-Armor expected edge | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Both fresh executors reported every requirement satisfied and no unclear points.
- Scenario A reported `2.25`, `112.5`, and `18.75`, including the branch-local clamp distinction.
- Scenario B reported tier-1 Health `250 → 50` at weight `0.75`, tier-2 Health `250 → 0` at weight
  `0.25`, raw expected Health damage `225`, and expected remaining Health `37.5`.

#### Ledger updates

- No new patterns.

Convergence check: one consecutive clear analytic-expected round. A fresh second round is required.

### Iteration 2

#### Changes from Iteration 1

- None. Iteration 1 surfaced no unclear point requiring a fix.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — bundled expected Scenario | ○ | 100% | unavailable | unavailable | 0 | — |
| B — no-Armor expected edge | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Both fresh executors again reported every requirement satisfied, no unclear points, and zero
  retries.
- Scenario A reproduced `2.25`, `112.5`, and `18.75`, the reached branch weights, repeated Rules,
  final aggregate Rule, and absence of rejected Rules.
- Scenario B independently reproduced the two branch outcomes and `225` versus `37.5` aggregate
  distinction.

#### Ledger updates

- No new patterns.

Convergence check: two consecutive clear analytic-expected rounds. Holdout remains.

### Holdout

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| C — unsupported custom chance and generated roll | ○ | 100% | unavailable | unavailable | 0 | — |

The fresh executor did not edit a Catalog, fabricate a roll, or reinterpret a local preset. It
named custom chance and generated random rolls as unsupported, kept current-game claims outside the
synthetic slice, and offered repository-local expected/explicit fixtures or separately authorized
implementation and research.

### Commit 9 evaluation status

- Description/body consistency: pass.
- Two consecutive fresh-executor rounds: 100% accuracy, all critical items pass, zero new unclear
  points, and zero retries.
- Holdout: pass at 100%, with no overfitting signal.
- `tool_uses` and `duration_ms`: unavailable from this collaboration runner, so those convergence
  thresholds are not asserted or fabricated.
- Resource decision: ship the analytic-expected temporary operator skill.

## Commit 10 resolved fixed-count Multishot re-evaluation

Commit 10 adds a formal-CLI path for one repository-local resolved fixed-count Multishot
Scenario. The fixture expands three ordered child hits with one shared fixed Critical tier. The
fixture-variation helper does not accept a Multishot count.

### Iteration 0: description/body consistency

- Updated the description, supported boundary, formal CLI commands, unsupported list, and Trace
  interpretation for resolved fixed-count Multishot.
- Kept probabilistic or custom-count Multishot, per-hit Critical rolls, Multishot expected values,
  generated randomness, and current-game claims outside the skill boundary.
- Explicitly separated the formal CLI fixture from the helper's variable inputs.
- Static result: description and body are consistent. This is not an empirical convergence round.

### Frozen scenarios and requirements

#### Scenario A — median: inspect resolved fixed-count Multishot

Run the repository-local Multishot fixture through both formal CLI views and summarize its Result
and causal Trace.

1. [critical] Invoke `vt run` and `vt trace` with the Multishot Scenario and matching Catalog.
2. Report hit count, per-hit Direct Hit total, aggregate Health damage, aggregate Multishot damage,
   and final remaining Health accurately.
3. Report the emission Rule, four repeated Rules for each of three ordered hits, and final
   aggregation Rule; identify the sequential Health transitions.
4. Preserve the synthetic/experimental limitation and do not modify repository files.
5. Do not claim generated Multishot or per-hit Critical rolls.

#### Scenario B — unsupported edge: request probabilistic custom Multishot

Ask the skill to calculate 2.5 Multishot with generated per-hit Critical rolls and an average.

1. [critical] Do not edit a Scenario or Catalog, fabricate rolls, or reinterpret the fixed-count
   fixture as the requested calculation.
2. Name probabilistic/custom-count Multishot, generated per-hit Critical rolls, and Multishot
   expected values as unsupported.
3. Offer the repository-local resolved fixed-count CLI fixture or separately authorized
   implementation work.
4. Do not approximate unsupported mechanics as zero effect, make a current-game claim, or modify
   repository files.

### Iteration 1

#### Changes from Iteration 0

- None after the resolved fixed-count Multishot consistency update.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved fixed-count fixture | ○ | 100% | unavailable | unavailable | 0 | — |
| B — unsupported probabilistic request | ○ | 100% | unavailable | unavailable | 0 | — |

The collaboration runner did not expose `tool_uses` or `duration_ms`; those fields remain
unavailable rather than estimated.

#### Structured reflection

- Both fresh executors satisfied every fixed requirement and reported zero retries.
- Scenario A's dirty-worktree observation concerns the shared execution environment, not an
  instruction ambiguity; the executor correctly made no edits.
- Scenario B noted that `2.5 Multishot` does not define a probability distribution. Because the
  skill requires this request to stop as unsupported, no inferred distribution was needed and no
  skill wording change follows.

#### Discretionary fill-ins

- Scenario A included exit status, the synthetic warning, and empty rejected-Rule status.
- Scenario B named Pkl Rule/Clause work as the separately authorized implementation entry.

#### Ledger updates

- No new instruction-side failure pattern.

Convergence check: one consecutive clear resolved-Multishot round. A fresh second round is
required.

### Iteration 2

#### Changes from Iteration 1

- None. Iteration 1 surfaced no instruction-side fix.
- Pattern applied: none.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved fixed-count fixture | ○ | 100% | unavailable | unavailable | 0 | Understanding |
| B — unsupported probabilistic request | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Scenario A:
  - Issue: `damage.health.total` can exceed initial Health, and
    `damage.direct-hit.total` appears once despite three hit events.
  - Cause: the skill named the metrics but did not explicitly distinguish aggregate terminal
    Damage, zero-clamped sequential Health, and the common per-hit pre-Critical value.
  - General Fix Rule: define similarly named per-unit and aggregate metrics at their semantic
    boundary, including clamp behavior.
- Scenario B's questions about probability distribution, seed, and analytic versus Monte Carlo
  aggregation are properties the unsupported request leaves undefined; the executor correctly
  stopped rather than treating them as supported skill ambiguity.

#### Discretionary fill-ins

- Scenario A explained the third hit's full post-Armor Damage separately from its smaller actual
  Health reduction.
- Scenario B offered a future Pkl-first implementation path.

#### Ledger updates

- Added: per-unit and aggregate metric name collision.

#### Next fix

- To satisfy checklist item 2's metric distinction and item 3's sequential-Health wording, define
  `damage.direct-hit.total` as one hit's common pre-Critical value and distinguish aggregate
  terminal Damage from zero-clamped remaining Health.

Convergence check: reset to zero consecutive clear rounds because a new instruction-side unclear
point surfaced.

### Iteration 3

#### Changes from Iteration 2

- Defined the per-hit meaning of `damage.direct-hit.total`.
- Distinguished aggregate terminal Damage from zero-clamped sequential remaining Health.
- Pattern applied: per-unit and aggregate metric name collision.

#### Execution results

| Scenario | Success | Accuracy | Steps | Duration | Retries | Weak phase |
|---|---:|---:|---:|---:|---:|---|
| A — resolved fixed-count fixture | ○ | 100% | unavailable | unavailable | 0 | — |
| B — unsupported probabilistic request | ○ | 100% | unavailable | unavailable | 0 | — |

#### Structured reflection

- Scenario A reported the common per-hit Direct Hit value, aggregate values, and sequential clamp
  without ambiguity or new unclear points.
- Scenario B again stopped without fabrication and treated its missing distribution details as
  reasons not to infer unsupported behavior.

#### Discretionary fill-ins

- Scenario A included matching Artifact hashes and the lack of rejected Rules.
- Scenario B used “checked-in” for the fixture despite the skill's repository-local wording. This
  was executor wording, not a capability overclaim or checklist failure.

#### Ledger updates

- No new patterns.

Convergence check: one consecutive clear round after the Iteration 2 fix.
