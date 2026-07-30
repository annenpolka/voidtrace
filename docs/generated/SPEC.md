<!-- Generated from specs/main.pkl. Do not edit. -->

# VoidTrace Normative Specification

- Schema version: `0.1.0`
- Source: `specs/main.pkl`
- Source fingerprint: `sha256:0c31b659ee3dfdbb169862e3ef1c82b810cea167388bddb98118b84281505fa0`
- Generated contracts: 8 (see [CONTRACTS.md](./CONTRACTS.md))

## Maturity semantics

`guarantee` names the intended verification method. `maturity` records whether
that obligation is currently satisfied. Machine-verified active Clauses have an
independent oracle; active manual Clauses remain explicit review obligations.
Contract validation alone never activates a Kernel or mechanics Clause.

## Clauses

| ID | Area | Pattern | Guarantee | Maturity | Normative statement |
| --- | --- | --- | --- | --- | --- |
| `CHN-001` | `mechanics` | `resolved_chain_path` | `property-tested` | `active` | action.resolved-chain-direct-hitsは一つのpathKind chain ordered-path relationをtargetPathRelationIdで参照し、その1以上64以下のtargetIdsを順番どおり一度ずつ固定Critical Direct Hitとして評価する。各targetは自身のresolved ArmorとHealthを読み、target別World Stateへcommitする。候補探索、branch、距離、target選択、減衰、再訪、暗黙rollは生成しない |
| `CLI-001` | `cli` | `cli_command_output_selection` | `example-tested` | `active` | helpメタデータ要求を除き、describe実行成功時はCapability Manifest、run実行成功時はResult、trace実行成功時はTraceだけをstdoutへ出力する |
| `CLI-002` | `cli` | `cli_deterministic_json` | `example-tested` | `active` | 同一のコマンド引数とArtifact入力は同一のcanonical単一行JSONを生成し、pretty表示はJSON値を変更しない |
| `CLI-003` | `cli` | `cli_stream_exit_discipline` | `example-tested` | `active` | describe、run、traceのdomain実行成功はexit 0と選択されたJSONだけをstdoutへ出し、domain実行失敗はstdoutを空にしてProblemだけをstderrへ出し、input=2、unsupported=3、limit=4、internal=5へ分類する。helpメタデータ要求はexit 0の人間可読stdoutとする |
| `CLI-004` | `cli` | `cli_alias_equivalence` | `example-tested` | `active` | voidtraceとvtは同一引数に対してstdout、stderr、exit codeがbyte単位で一致する |
| `CLI-005` | `cli` | `cli_application_boundary` | `example-tested` | `active` | CLIは引数解析、Artifact入出力、表示選択だけを担当し、評価意味論と能力記述をApplication APIへ委譲する |
| `CLI-006` | `cli` | `cli_input_surface` | `example-tested` | `active` | describeはArtifact入力を取らず、runとtraceは<scenario-source>と必須--catalog <catalog-source>を取り、各sourceはJSONファイルpathまたはstdinを表す「-」とする。両sourceを同時に「-」にはできず、評価はApplication APIが生成core Rulesetを選択し、暗黙fixtureを使わない |
| `CRT-001` | `mechanics` | `critical_tier_probability_sum` | `property-tested` | `active` | deterministic modeのCritical解決入力はcriticalTierとcriticalRollの厳密に一方だけを持ち、expected modeは両方を持たない。確率分布を使う場合、非負のCritical chance cについてbase=floor(c)、fraction=c-baseとし、fractionが0ならnext=base、それ以外はnext=base+1とする。baseと到達可能なnextはsafe integerでなければならず、p(base)=1-fraction、p(next)=fractionを形成する。明示rollではrollがfraction未満のときだけnextを、それ以外はbaseを解決する。互換metricのcritical.tier-0.probabilityとcritical.tier-1.probabilityは、この分布を絶対tier 0と1へ射影し、到達不能なtierの確率を0とする |
| `CRT-002` | `mechanics` | `fixed_critical_tier` | `property-tested` | `active` | 解決済みCritical tier tは非負safe integerだけを受理し、CatalogのcriticalMultiplier Mに対してDamage Vectorへ倍率1+t*(M-1)を適用する。Resultのcritical.multiplier metricはCatalog入力Mではなく、この解決済みtierへ実際に適用した倍率を表す。適用倍率を有限数として表現できない入力は部分ResultやTraceを返さずunsupportedとする |
| `CRT-003` | `mechanics` | `expected_critical_branches` | `property-tested` | `active` | expected modeの単発Direct HitはCritical chanceのbase tierと到達可能なnext tierを独立branchとしてCritical倍率、Armor、Health commitまで終端評価し、その後で各branchの確率によりDamage Vector、実適用Critical倍率、post-Critical Damage、Health Damage、残Healthを加重平均する。Health 0 clampは各branch内で行い、平均Damageから残Healthを逆算しない。Resultはcritical.expected.multiplier、damage.expected.post-critical.total、damage.expected.health.total、target.health.expected-remainingを使い、実現値であるcritical.roll、critical.tier、critical.multiplier、damage.post-critical.total、damage.health.total、target.health.remainingを生成しない |
| `DEF-001` | `mechanics` | `armor_monotonic` | `property-tested` | `active` | 標準Armor式300/(Armor+300)では、他条件が同一ならArmor増加によってHealth Damageは増加しない |
| `DEF-002` | `mechanics` | `armor_formula_example` | `example-tested` | `active` | golden.direct-critical-armorにおいて、標準Armor 300では許容誤差0.000001以内でHealth Damage倍率が0.5となる |
| `DMG-001` | `mechanics` | `damage_vector_identity` | `property-tested` | `active` | ModifierなしのDirect Hitでは、damage.construct直後のDamage VectorがCatalog入力と一致する |
| `DMG-002` | `mechanics` | `damage_total_equals_components` | `property-tested` | `active` | 各Damage Vectorのtotalは有限な非負成分の総和と一致する |
| `ENG-001` | `kernel` | `deterministic_replay` | `property-tested` | `active` | 同一Catalog、Ruleset、Scenario、seedは同一のcanonical Resultを返す |
| `ENG-002` | `kernel` | `event_time_monotonic` | `property-tested` | `active` | Event Queueから処理されるイベント時刻は後退しない |
| `GOL-001` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/direct-critical-armor.scenario.jsonは独立literal expected vectorと一致するResultおよびTraceを生成する |
| `GOL-002` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/probability-critical-armor.scenario.jsonは明示Critical rollから隣接tierを解決し、独立literal expected vectorと一致するResultおよびTraceを生成する |
| `GOL-003` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/tier-2-critical-armor.scenario.jsonはCritical chance 1.25と明示roll 0.2からtier 2を解決し、Critical multiplier 2、base Damage 100、Armor 300に対する最終Health Damage 150と残Health 850を独立literal expected vectorとしてResultおよびTraceと照合する |
| `GOL-004` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/expected-critical-armor.scenario.jsonはCritical chance 1.25のtier 1 branchを確率0.75、tier 2 branchを確率0.25でCritical倍率、Armor 300、Health commitまで別々に評価する。初期Health 125に対してraw expected Health Damage 112.5、branch clamp後のexpected残Health 18.75を独立literal expected vectorとしてResultおよびTraceと照合する |
| `GOL-005` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/multishot-critical-armor.scenario.jsonは3個の順序付きDirect Hitを逐次Healthへcommitし、独立literal expected vectorと一致するResultおよびTraceを生成する |
| `GOL-006` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/pellet-critical-armor.scenario.jsonは4個の順序付きpellet Direct Hitを逐次Healthへcommitし、独立literal expected vectorと一致するResultおよびTraceを生成する |
| `GOL-007` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/radial-critical-armor.scenario.jsonはbase Damage 100、fixed Critical tier 1、resolved falloff 0.75、Armor 300からHealth Damage 75と残Health 925を独立literal expected vectorとしてResultおよびTraceと照合する |
| `GOL-008` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/resolved-status-ticks.scenario.jsonは解決済みHealth Damage 40の3 tickを1000ms間隔でHealth 100へ順次commitし、時刻1000、2000、3000と最終Health 0を独立literal expected vectorとしてResultおよびTraceと照合する |
| `GOL-009` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/resolved-punch-through.scenario.jsonは明示されたA→B→Cのpunch-through ordered pathを固定Critical tier 1で評価し、target別ArmorによりHealthを150→50、80→0、60→10へ独立commitして、Damage合計350と残Health合計60をliteral expected vectorとしてResultおよびTraceと照合する |
| `GOL-010` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/resolved-ricochet.scenario.jsonはtargets配列と異なるC→A→Bのricochet ordered pathを固定Critical tier 2で評価し、target別ArmorによりHealthを100→25、250→100、80→0へ独立commitして、Damage合計525と残Health合計125をliteral expected vectorとしてResultおよびTraceと照合する |
| `GOL-011` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/resolved-chain.scenario.jsonはtargets配列B→A→Cと異なるA→C→Bのchain ordered pathを固定Critical tier 0で評価し、target別ArmorによりHealthを120→70、90→65、60→0へ独立commitして、Damage合計175と残Health合計135をliteral expected vectorとしてResultおよびTraceと照合する |
| `GOL-012` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/resolved-radial-targets.scenario.jsonはtargets配列B→D→A→Cと異なるrelation順A→C→B→Dを固定Critical tier 0で検査し、Aは距離0でfalloff 1、Cは距離5でfalloff 0.7、Bは終了距離超、Dはresolved LoS falseとして、Healthを120→70、90→72.5、60→60、40→40へ更新し、命中Damage合計67.5と全target残Health合計242.5をliteral expected vectorとしてResultおよびTraceと照合する |
| `GOL-013` | `mechanics` | `golden_scenario` | `example-tested` | `active` | data/fixtures/golden/resolved-pellet-allocation.scenario.jsonはtargets配列B→A→Cと異なるrelation順A→C→Bへ総pellet 4をA=2、C=0、B=1として配分し、残る1 pelletをmissとする。固定Critical tier 0とtarget別ArmorによりHealthをA 150→50、C 90→90、B 80→0へ更新し、命中Damage合計200、全target残Health合計140、撃破1をliteral expected vectorとしてResultおよびTraceと照合する |
| `MSH-001` | `mechanics` | `fixed_multishot_expansion` | `property-tested` | `active` | action.multishot-direct-hitは明示された正のsafe-integer hitCountを上限64まで受理し、安定したindexと親action参照を持つ同数のDirect Hit子イベントへ展開する。確率的Multishot、暗黙roll、部分Resultは生成しない |
| `PLT-001` | `mechanics` | `fixed_pellet_expansion` | `property-tested` | `active` | action.pellet-direct-hitは明示された正のsafe-integer pelletCountを上限64まで受理し、同じ一回の射撃に属する安定したindexと親action参照を持つ同数のDirect Hit子イベントへ展開する。Multishotとの合成、確率的pellet数、pellet別Critical roll、命中分配、Spread、部分Resultは生成しない |
| `PLT-002` | `mechanics` | `resolved_pellet_allocation` | `property-tested` | `active` | action.resolved-pellet-allocationは一つのallocation ID、1以上64以下の総pellet数、固定Critical tierと、同じallocation IDを持つ全target分の非負safe-integer resolved hit countを受理する。hit count合計は総pellet数以下でなければならず、差分はmissとする。relation順、次にtarget内pellet index順でDirect Hitを評価し、0-hit targetもHealth不変で終端状態へ残す。Spread、命中判定、確率分布、pellet別Critical roll、Multishot合成、暗黙rollは生成しない |
| `PTH-001` | `mechanics` | `resolved_punch_through_path` | `property-tested` | `active` | action.resolved-punch-through-direct-hitsは一つのpathKind punch-through ordered-path relationをtargetPathRelationIdで参照し、その1以上64以下のtargetIdsを順番どおり一度ずつ固定Critical Direct Hitとして評価する。各targetは自身のresolved ArmorとHealthを読み、target別World Stateへcommitする。壁厚、衝突、貫通減衰、target選択、暗黙rollは生成しない |
| `RAD-001` | `mechanics` | `resolved_radial_falloff` | `property-tested` | `active` | action.radial-hitは明示された有限な0以上1以下のresolvedFalloffMultiplierと固定Critical tierを受理する。Radial Damage VectorはCritical解決後かつArmor適用前にこの倍率でscaleされる。距離式、物理配置、Direct sibling、Projectile親、Multishot、Pellet、複数target、暗黙rollは生成しない |
| `RAD-002` | `mechanics` | `resolved_radial_targets` | `property-tested` | `active` | action.resolved-radial-targetsは一つのimpactId、有限な非負falloffStartMeters、それより大きいfalloffEndMeters、有限な0以上1以下のminimumFalloffMultiplier、固定Critical tierを受理し、同じimpactIdを持つ1以上64以下のimpact-distance relationを宣言順に検査する。resolved LoS falseまたは終了距離超のtargetは非命中としてHealthを変更せず、開始距離以下の命中targetはfalloff倍率1、開始と終了の間は1からminimumFalloffMultiplierへ線形補間し、各targetのRadial DamageへCritical後かつArmor前に適用する。爆心座標、地形、LoS、距離、現行Warframeのfalloff式、暗黙rollは導出しない |
| `RCH-001` | `mechanics` | `resolved_ricochet_path` | `property-tested` | `active` | action.resolved-ricochet-direct-hitsは一つのpathKind ricochet ordered-path relationをtargetPathRelationIdで参照し、その1以上64以下のtargetIdsを順番どおり一度ずつ固定Critical Direct Hitとして評価する。各targetは自身のresolved ArmorとHealthを読み、target別World Stateへcommitする。反射角、物理軌道、target選択、減衰、chain、暗黙rollは生成しない |
| `RNG-001` | `kernel` | `same_logical_random` | `property-tested` | `active` | 同一seed、論理Event ID、roll purposeは同一乱数を返す |
| `SCP-001` | `scope` | `scope_boundary` | `manual` | `active` | 物理・衝突・軌道は解決済みHitPlanとして入力され、Kernelは幾何学的命中判定を行わない |
| `SCP-002` | `scope` | `unsupported_mechanic_rejected` | `property-tested` | `active` | 非対応メカニクスをゼロ効果として黙って無視せず、構造化された非対応結果を返す |
| `SCP-003` | `scope` | `unsupported_mechanic_rejected` | `property-tested` | `active` | Scenario targetGraphは、Kernel外で解決済みのimpact距離・LoS、ordered path、またはtarget別Pellet配分だけを有限構造として保持する。Runtimeは空relations、resolved punch-through／ricochet／chain Direct Hit列が参照する一つのordered path、resolved multi-target Radialが参照する同一impactの1以上64以下のimpact-distance relations、またはresolved Pellet allocationが参照する全target分のallocation relationsだけを受理し、その他の非空Target Graphや複数targetを黙って無視せずunsupportedとして部分Artifactなしで拒否する |
| `STS-001` | `mechanics` | `resolved_status_ticks` | `property-tested` | `active` | action.resolved-status-ticksはstatus.synthetic-resolved-dot、有限な非負resolvedHealthDamagePerTick、1以上のsafe-integer tickCount、正のsafe-integer tickIntervalMsを受理する。最大64 tickをintervalの倍数時刻で単一targetのHealthへ順次commitし、最後のtickはScenario timeLimitMs以下でなければならない。Status chance、type抽選、付与元Direct／Radial、Critical、Armor、stack、refresh、snapshot式、暗黙rollは生成しない |
| `TRC-001` | `kernel` | `trace_reconstructs_result` | `property-tested` | `active` | Scenarioの初期HealthをアンカーとしてTraceの順序付きDamage Vector、Health commit、expected branch集約を再生すると、Resultの最終Damage Vectorとdeterministicまたはexpectedの残Healthに一致する |
| `TRC-002` | `kernel` | `rejected_rule_has_reason` | `property-tested` | `planned` | 不適用RuleのTrace decisionにはrejection stageと安定した構造化理由が存在する |
