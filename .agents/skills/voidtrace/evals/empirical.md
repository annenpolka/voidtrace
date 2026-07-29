# VoidTrace skill empirical evaluation

The checklists below are frozen before executor dispatch. A critical miss makes the scenario fail;
normal items score full, half, or zero for accuracy.

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
