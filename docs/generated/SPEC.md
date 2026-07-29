<!-- Generated from specs/main.pkl. Do not edit. -->

# VoidTrace Normative Specification

- Schema version: `0.1.0`
- Source: `specs/main.pkl`
- Source fingerprint: `sha256:665871338ae7087403e063e7827966aff5a3492134cf285c29fa624483ade1de`

## Maturity semantics

`guarantee` names the intended independent verification method. `maturity` records
whether that oracle currently exists. Commit 1 publishes foundational clauses as
`planned`; it does not claim that a combat Kernel has verified them.

## Clauses

| ID | Area | Pattern | Guarantee | Maturity | Normative statement |
| --- | --- | --- | --- | --- | --- |
| `ENG-001` | `kernel` | `deterministic_replay` | `property-tested` | `planned` | 同一Catalog、Ruleset、Scenario、seedは同一のcanonical Resultを返す |
| `ENG-002` | `kernel` | `event_time_monotonic` | `property-tested` | `planned` | Event Queueから処理されるイベント時刻は後退しない |
| `RNG-001` | `kernel` | `same_logical_random` | `property-tested` | `planned` | 同一seed、論理Event ID、roll purposeは同一乱数を返す |
| `SCP-001` | `scope` | `scope_boundary` | `manual` | `planned` | 物理・衝突・軌道は解決済みHitPlanとして入力され、Kernelは幾何学的命中判定を行わない |
| `SCP-002` | `scope` | `unsupported_mechanic_rejected` | `property-tested` | `planned` | 非対応メカニクスをゼロ効果として黙って無視せず、構造化された非対応結果を返す |
