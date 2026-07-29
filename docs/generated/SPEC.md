<!-- Generated from specs/main.pkl. Do not edit. -->

# VoidTrace Normative Specification

- Schema version: `0.1.0`
- Source: `specs/main.pkl`
- Source fingerprint: `sha256:e896fa0c37181aed6da06909aa195a178a8260ebf92ad35be6c883bdcd478051`
- Generated contracts: 6 (see [CONTRACTS.md](./CONTRACTS.md))

## Maturity semantics

`guarantee` names the intended independent verification method. `maturity` records
whether that oracle currently exists. Foundational Kernel clauses remain `planned`;
generated Contract validation does not claim that a combat Kernel has verified them.

## Clauses

| ID | Area | Pattern | Guarantee | Maturity | Normative statement |
| --- | --- | --- | --- | --- | --- |
| `ENG-001` | `kernel` | `deterministic_replay` | `property-tested` | `planned` | 同一Catalog、Ruleset、Scenario、seedは同一のcanonical Resultを返す |
| `ENG-002` | `kernel` | `event_time_monotonic` | `property-tested` | `active` | Event Queueから処理されるイベント時刻は後退しない |
| `RNG-001` | `kernel` | `same_logical_random` | `property-tested` | `active` | 同一seed、論理Event ID、roll purposeは同一乱数を返す |
| `SCP-001` | `scope` | `scope_boundary` | `manual` | `planned` | 物理・衝突・軌道は解決済みHitPlanとして入力され、Kernelは幾何学的命中判定を行わない |
| `SCP-002` | `scope` | `unsupported_mechanic_rejected` | `property-tested` | `planned` | 非対応メカニクスをゼロ効果として黙って無視せず、構造化された非対応結果を返す |
