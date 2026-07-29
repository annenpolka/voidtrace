<!-- Generated from specs/main.pkl. Do not edit. -->

# VoidTrace Normative Specification

- Schema version: `0.1.0`
- Source: `specs/main.pkl`
- Source fingerprint: `sha256:38ff0383cec87830c6227a29a780273930470d1e0bfb27126f8873c3a7af0496`
- Generated contracts: 7 (see [CONTRACTS.md](./CONTRACTS.md))

## Maturity semantics

`guarantee` names the intended verification method. `maturity` records whether
that obligation is currently satisfied. Machine-verified active Clauses have an
independent oracle; active manual Clauses remain explicit review obligations.
Contract validation alone never activates a Kernel or mechanics Clause.

## Clauses

| ID | Area | Pattern | Guarantee | Maturity | Normative statement |
| --- | --- | --- | --- | --- | --- |
| `CRT-001` | `mechanics` | `critical_tier_probability_sum` | `property-tested` | `planned` | Critical tier確率分布を実装するとき、その確率総和は1となる |
| `CRT-002` | `mechanics` | `fixed_critical_tier` | `property-tested` | `active` | deterministic固定tierは0または1だけを受理し、tier 0は倍率1、tier 1はCatalogのcriticalMultiplierを適用する |
| `DEF-001` | `mechanics` | `armor_monotonic` | `property-tested` | `active` | 標準Armor式300/(Armor+300)では、他条件が同一ならArmor増加によってHealth Damageは増加しない |
| `DEF-002` | `mechanics` | `armor_formula_example` | `example-tested` | `active` | golden.direct-critical-armorにおいて、標準Armor 300では許容誤差0.000001以内でHealth Damage倍率が0.5となる |
| `DMG-001` | `mechanics` | `damage_vector_identity` | `property-tested` | `active` | ModifierなしのDirect Hitでは、damage.construct直後のDamage VectorがCatalog入力と一致する |
| `DMG-002` | `mechanics` | `damage_total_equals_components` | `property-tested` | `active` | 各Damage Vectorのtotalは有限な非負成分の総和と一致する |
| `ENG-001` | `kernel` | `deterministic_replay` | `property-tested` | `active` | 同一Catalog、Ruleset、Scenario、seedは同一のcanonical Resultを返す |
| `ENG-002` | `kernel` | `event_time_monotonic` | `property-tested` | `active` | Event Queueから処理されるイベント時刻は後退しない |
| `GOL-001` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/direct-critical-armor.scenario.jsonは独立literal expected vectorと一致するResultおよびTraceを生成する |
| `RNG-001` | `kernel` | `same_logical_random` | `property-tested` | `active` | 同一seed、論理Event ID、roll purposeは同一乱数を返す |
| `SCP-001` | `scope` | `scope_boundary` | `manual` | `active` | 物理・衝突・軌道は解決済みHitPlanとして入力され、Kernelは幾何学的命中判定を行わない |
| `SCP-002` | `scope` | `unsupported_mechanic_rejected` | `property-tested` | `active` | 非対応メカニクスをゼロ効果として黙って無視せず、構造化された非対応結果を返す |
| `TRC-001` | `kernel` | `trace_reconstructs_result` | `property-tested` | `active` | Traceの順序付きDamage Vector操作を再生するとResultの最終Damage Vectorと一致する |
| `TRC-002` | `kernel` | `rejected_rule_has_reason` | `property-tested` | `active` | 不適用RuleのTrace decisionにはrejection stageと安定した構造化理由が存在する |
