<!-- Generated from specs/main.pkl. Do not edit. -->

# VoidTrace Normative Specification

- Schema version: `0.1.0`
- Source: `specs/main.pkl`
- Source fingerprint: `sha256:87422d3a3c0c701eaea653935340d5ca365863afd65797255365442d5c510d43`
- Generated contracts: 8 (see [CONTRACTS.md](./CONTRACTS.md))

## Maturity semantics

`guarantee` names the intended verification method. `maturity` records whether
that obligation is currently satisfied. Machine-verified active Clauses have an
independent oracle; active manual Clauses remain explicit review obligations.
Contract validation alone never activates a Kernel or mechanics Clause.

## Clauses

| ID | Area | Pattern | Guarantee | Maturity | Normative statement |
| --- | --- | --- | --- | --- | --- |
| `CLI-001` | `cli` | `cli_command_output_selection` | `example-tested` | `active` | helpメタデータ要求を除き、describe実行成功時はCapability Manifest、run実行成功時はResult、trace実行成功時はTraceだけをstdoutへ出力する |
| `CLI-002` | `cli` | `cli_deterministic_json` | `example-tested` | `active` | 同一のコマンド引数とArtifact入力は同一のcanonical単一行JSONを生成し、pretty表示はJSON値を変更しない |
| `CLI-003` | `cli` | `cli_stream_exit_discipline` | `example-tested` | `active` | describe、run、traceのdomain実行成功はexit 0と選択されたJSONだけをstdoutへ出し、domain実行失敗はstdoutを空にしてProblemだけをstderrへ出し、input=2、unsupported=3、limit=4、internal=5へ分類する。helpメタデータ要求はexit 0の人間可読stdoutとする |
| `CLI-004` | `cli` | `cli_alias_equivalence` | `example-tested` | `active` | voidtraceとvtは同一引数に対してstdout、stderr、exit codeがbyte単位で一致する |
| `CLI-005` | `cli` | `cli_application_boundary` | `example-tested` | `active` | CLIは引数解析、Artifact入出力、表示選択だけを担当し、評価意味論と能力記述をApplication APIへ委譲する |
| `CLI-006` | `cli` | `cli_input_surface` | `example-tested` | `active` | describeはArtifact入力を取らず、runとtraceは<scenario-source>と必須--catalog <catalog-source>を取り、各sourceはJSONファイルpathまたはstdinを表す「-」とする。両sourceを同時に「-」にはできず、評価はApplication APIが生成core Rulesetを選択し、暗黙fixtureを使わない |
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
