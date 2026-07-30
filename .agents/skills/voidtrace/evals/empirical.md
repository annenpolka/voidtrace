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
