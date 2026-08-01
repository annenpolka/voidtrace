# 銃器Kernelの意味論を段階的に拡張する

このExecPlanは生きた文書である。作業中は `Progress`、`Surprises & Discoveries`、`Decision Log`、`Outcomes & Retrospective` を常に現状へ更新する。

## Purpose / Big Picture

VoidTrace Kernelを、合成データによる単発Direct Hit計算から、銃器の一発を構成する複数のダメージイベントを再現可能に評価できる基盤へ進める。最初の追加マイルストーンはMultishotである。Multishotとは、一回の射撃入力から複数の弾または命中イベントを生成する仕組みを指す。

実装後は、同じ武器・敵・seedを使ったScenarioを `vt run` と `vt trace` で評価し、複数のDirect Hitが同じWorld Stateへ順番にcommitされること、その各イベントの親子関係と適用RuleをTraceから再生できることを確認できる。値は引き続き合成かつexperimentalであり、現在のWarframe仕様を検証済みとは扱わない。

## Progress

- [x] (2026-07-30 07:22:00Z) Commit 8/9相当のCritical tier一般化、明示roll、解析的期待値、終端Health分岐集約を実装した。
- [x] (2026-07-30 07:22:00Z) Node 26とNode 24で `just check` を実行し、生成物24件のfreshness、境界検査、21テストファイル231テストの成功を確認した。
- [x] (2026-07-30 07:22:00Z) リポジトリ内skillの固定tier smokeと解析的期待値goldenを確認した。
- [x] (2026-07-30 07:23:40Z) Critical／expectedマイルストーンを `2639b6a` としてコミットした。
- [x] (2026-07-30 07:24:11Z) 本ExecPlanを `7de265f` として進捗記録の基準線にコミットした。
- [x] (2026-07-30 07:38:00Z) MultishotのPkl Clause、Rule IR、Scenario入力、Golden Scenarioを定義し、Ruleset `0.5.0`を生成した。
- [x] (2026-07-30 07:38:00Z) 最大64の複数Direct HitをEvent Queue上で順次評価し、Result集約とTrace再生を実装した。
- [x] (2026-07-30 07:38:00Z) Multishotの独立oracle、境界/propertyテスト、Runtime/CLI E2Eを追加し、対象7ファイル154テストを通した。
- [x] (2026-07-30 07:44:00Z) repository-local skillのMultishot操作例をempirical-prompt-tuningで再評価し、修正後2回連続の100% checklist達成を確認した。
- [x] (2026-07-30 07:44:00Z) Node 24とNode 26で21テストファイル251テストを含む全ゲートを通した。
- [x] (2026-07-30 07:46:00Z) Multishotマイルストーンを `92019a6` としてコミットした。
- [x] (2026-07-30 07:46:00Z) 元計画の順序に従い、次の縦切りを解決済み固定count Pelletに選定した。
- [x] (2026-07-30 07:52:00Z) PelletのPkl Clause、Rule IR、Scenario入力、Golden Scenarioを定義し、Ruleset `0.6.0`を生成した。
- [x] (2026-07-30 07:52:00Z) Pelletを既存Direct Hitパイプラインへ流し、Result／Trace／replayを実装した。
- [x] (2026-07-30 07:52:00Z) 独立oracle、境界/propertyテスト、Runtime/CLI E2Eを追加し、対象8ファイル185テストを通した。
- [x] (2026-07-30 07:56:00Z) repository-local skillのPellet操作例をempirical-prompt-tuningで再評価し、2回連続の100% checklist達成を確認した。
- [x] (2026-07-30 07:56:00Z) Node 26で21テストファイル268テストを含む全ゲートを通した。
- [x] (2026-07-30 07:57:00Z) Node 24でも21テストファイル268テストを含む全ゲートを通した。
- [x] (2026-07-30 07:58:00Z) Pelletマイルストーンを `0b43a63` としてコミットした。
- [x] (2026-07-30 07:58:00Z) 次のRadial縦切りを、解決済みfalloff multiplierを持つ単独Radial Hitとして設計した。
- [x] (2026-07-30 08:09:00Z) RadialのPkl Clause、Rule IR、Scenario入力、Golden Scenarioを定義し、Ruleset `0.7.0`を生成した。
- [x] (2026-07-30 08:09:00Z) Radial HitをDirectと別event kindで評価し、Critical後・Armor前のresolved falloff、Result／Trace／replayを実装した。
- [x] (2026-07-30 08:09:00Z) 独立oracle、境界/propertyテスト、Runtime/CLI E2Eを追加し、Node 26/24で21ファイル280テストを通した。
- [x] (2026-07-30 08:09:00Z) repository-local skillへRadial操作例と停止境界を追加し、empirical-prompt-tuning第2ラウンドで対応・非対応シナリオとも100% checklist達成を確認した。
- [x] (2026-07-30 08:09:00Z) Radialマイルストーンを `1e7a3ea` としてコミットした。
- [x] (2026-07-30 08:14:00Z) 元計画の次の領域であるStatusについて、時間・snapshot・stackを混ぜずに検証できる最小縦切りを設計した。
- [x] (2026-07-30 08:26:00Z) 解決済みsynthetic Status tickのPkl Clause、Rule IR、Scenario入力、Golden Scenarioを定義し、Ruleset `0.8.0`を生成した。
- [x] (2026-07-30 08:26:00Z) 論理時刻へ最大64 tickをscheduleし、逐次Health commit、Result集約、Trace replayを実装した。
- [x] (2026-07-30 08:26:00Z) 独立oracle、境界/propertyテスト、Runtime/CLI E2Eを追加し、Node 26/24で21ファイル297テストを通した。
- [x] (2026-07-30 08:26:00Z) repository-local skillへStatus操作例と停止境界を追加し、empirical-prompt-tuning第2ラウンドで対応・非対応シナリオとも100% checklist、retry 0、fill-in 0を確認した。
- [x] (2026-07-30 08:26:00Z) Statusマイルストーンを `5f1fa73` としてコミットした。
- [x] (2026-07-30 08:32:00Z) Scenario Contract `0.2.0`へresolved impact-distance/LoSとordered punch-through/chain/ricochet pathの有限Target Graph入力を追加した。
- [x] (2026-07-30 08:32:00Z) 現在のRuntimeは空relationsだけを受理し、非空Target Graphを `unsupported-target-graph` として部分Artifactなしで拒否する境界を実装した。
- [x] (2026-07-30 08:32:00Z) Node 26/24で33 Clauses、8 Contracts、21ファイル299テストを通し、Target Graph契約境界を `5ebc4f4` としてコミットした。
- [x] (2026-07-30 10:34:00Z) 最初の実行可能な複数target sliceとして、resolved punch-through順序に沿う固定Critical Direct Hit列とtarget別World State／Traceを実装した。Goldenは3 target、固定tier 1、target別Armor/Health、貫通減衰なしである。
- [x] (2026-07-30 10:34:00Z) Result Contract `0.2.0`へtarget ID別終端Health、Ruleset `0.9.0`へpath展開／集約Ruleを追加し、Golden、独立oracle、property、改ざんTrace、Runtime、formal CLI、installed CLI aliasを検証した。
- [x] (2026-07-30 10:34:00Z) repository-local skillへresolved punch-through操作例と非対応境界を追加し、empirical-prompt-tuningを2回とhold-outで実行した。対応・非対応はいずれも100%、不明点0、retry 0で、impact-distanceの暗黙変換も拒否した。
- [x] (2026-07-30 10:34:00Z) Node 26.0.0とNode 24.18.0で35 Clauses、8 Contracts、生成24ファイル、21テストファイル311テストを含む `just check` を通した。
- [x] (2026-07-30 10:35:00Z) Resolved punch-throughマイルストーンを `bd0b659` としてコミットした。
- [x] (2026-07-30 10:45:00Z) 次の複数target sliceとして、明示されたresolved ricochet順序に沿う固定Critical Direct Hit列を実装した。Goldenはtargets配列と異なるC→A→B順、固定tier 2、target別Armor/Health、反射角・自動選択・減衰なしである。
- [x] (2026-07-30 10:45:00Z) Ruleset `0.10.0`のricochet展開／集約Rule、Golden、property、Runtime、formal CLI、installed CLI aliasを追加し、Node 26/24で37 Clauses、8 Contracts、生成24ファイル、21ファイル320テストを通した。
- [x] (2026-07-30 10:45:00Z) repository-local skillへresolved ricochet操作例と停止境界を追加した。empirical-prompt-tuningは2回連続で対応・非対応100%、不明点0、retry 0となり、relation/action不一致のhold-outも暗黙修正せず拒否した。
- [x] (2026-07-30 10:45:00Z) Resolved ricochetマイルストーンを `27aaefd` としてコミットした。
- [x] (2026-07-30 11:02:00Z) 次の複数target sliceとして、明示されたresolved chain順序に沿う固定Critical Direct Hit列を実装した。Goldenはtargets配列B→A→Cと異なるA→C→B順、固定tier 0、target別Armor/Health、候補探索・分岐・距離・自動選択・減衰・再訪導出なしである。
- [x] (2026-07-30 11:02:00Z) Ruleset `0.11.0`のchain展開／集約Rule、Golden、property、Runtime、formal CLI、installed CLI aliasを追加し、Node 26/24で39 Clauses、8 Contracts、生成24ファイル、21ファイル329テストを通した。
- [x] (2026-07-30 11:07:00Z) repository-local skillへresolved chain操作例と停止境界を追加した。empirical-prompt-tuningはfeature commit後の第2・第3回で対応7/7・非対応6/6、不明点0を連続達成し、relation/action不一致のhold-outも暗黙修正せず拒否した。
- [x] (2026-07-30 11:07:00Z) Resolved chainマイルストーンを `abde40d` としてコミットした。
- [x] (2026-07-30 11:17:00Z) 次の複数target sliceとして、resolved impact-distance／LoS relationsを消費する合成multi-target Radialを実装した。爆心座標・地形・LoS・実ゲームfalloffは導出せず、actionに明示した合成線形falloff境界だけを適用する。
- [x] (2026-07-30 11:17:00Z) Ruleset `0.12.0`のRadial target展開／集約Rule、4-target Golden、線形falloff/LoS property、Trace replay、Runtime、formal CLI、installed CLI aliasを追加し、Node 26/24で41 Clauses、8 Contracts、生成24ファイル、21ファイル339テストを通した。
- [x] (2026-07-30 11:20:00Z) repository-local skillへresolved multi-target Radial操作例と停止境界を追加した。empirical-prompt-tuningはfeature commit後の第1・第2回で対応7/7・非対応6/6、不明点0を連続達成し、action／relationのimpact ID不一致hold-outも暗黙修正せず拒否した。
- [x] (2026-07-30 11:20:00Z) Resolved multi-target Radialマイルストーンを `f96fdb9` としてコミットした。
- [x] (2026-07-30 11:42:00Z) 次のTarget Graph sliceとして、target別の解決済みpellet命中数とmiss数を消費する合成Pellet allocationを実装した。Spread、命中判定、確率分布、pellet別Critical roll、Multishot合成は導出しない。
- [x] (2026-07-30 11:42:00Z) Scenario Contract `0.3.0`、Ruleset `0.13.0`のPellet allocation展開／集約Rule、3-target Golden、count/property、複数hit Trace replay、Runtime、formal CLI、installed CLI aliasを追加し、Node 26/24で43 Clauses、8 Contracts、生成24ファイル、21ファイル346テストを通した。
- [x] (2026-07-30 11:42:00Z) repository-local skillへresolved Pellet allocation操作例と停止境界を追加した。empirical-prompt-tuningはfeature commit後の第1・第2回で対応7/7・非対応6/6・hold-out 6/6、不明点0を連続達成した。
- [x] (2026-07-30 11:42:00Z) Resolved Pellet allocationマイルストーンを `274d33f` としてコミットした。
- [x] (2026-07-30 13:18:07Z) 元計画と実装済み依存関係を照合し、次の縦切りを同じresolved impactを親に持つDirect Hitとmulti-target Radialの合成に固定した。
- [x] (2026-07-30 13:31:53Z) Resolved Direct＋Radial impactのPkl Clause、Rule IR、Golden Scenarioを定義し、生成文書を逆翻訳として確認した。
- [x] (2026-07-30 13:31:53Z) 一つの親impactからDirect siblingを先に、Radial target childrenを後に同じWorld Stateへcommitし、Result／Trace replayを実装した。
- [x] (2026-07-30 13:31:53Z) property、Runtime／CLI E2E、repository-local skill評価、Node 26／24の全ゲートを通し、実装を `6857390` としてコミットした。
- [x] (2026-07-30 13:43:18Z) 次の縦切りを、既存impact actionの互換性を保ったままDirectとRadialが別の明示Catalog attack modeを参照できる拡張に固定した。
- [x] (2026-07-30 13:54:34Z) `IMP-002`と`GOL-015`でDirect用attack mode、Radial用attack mode、共有固定Critical tier、共通World Stateの境界を規定し、Ruleset `0.15.0`を生成した。
- [x] (2026-07-30 13:54:34Z) 合成Catalogへbase Damage 80のRadial modeを追加し、Domain／Kernel／Trace／CLI／skillを実装した。Node 26／24で47 Clauses、8 Contracts、生成24ファイル、21ファイル359テストを通した。
- [x] (2026-07-30 13:54:34Z) empirical-prompt-tuningはfeature commit後のIteration 2／3で対応・非対応・hold-outがすべて5/5、不明点0となった。対応fixtureはtracked／HEAD一致、未知modeはstale hashとCatalog参照失敗を区別した。
- [x] (2026-07-30 13:54:34Z) 別mode実装を `26e5712`、新Clauseのcapability誤分類修正を `bca8414` としてコミットした。
- [x] (2026-07-30 16:32:22Z) 次の縦切りを、既存impact actionの互換性を保ったままDirectとRadialへ別の明示固定Critical tierを適用できる拡張に固定した。
- [x] (2026-07-30 16:42:45Z) `IMP-003`と`GOL-016`でDirect／Radial別固定tier、旧共有tier、共有World Stateの境界を規定し、Ruleset `0.16.0`を生成した。
- [x] (2026-07-30 16:42:45Z) Domain／Kernel／Trace／CLI／skillを実装し、機能を `9c0ed5c` としてコミットした。
- [x] (2026-07-30 16:42:45Z) empirical-prompt-tuningはfeature commit後に対応・非対応を2回ずつ、破損入力hold-outを1回評価し、全checklist 100%、不明点0を確認した。対応側のtool-useは3回と8回で変動したため、定量的な速度収束は主張しない。
- [x] (2026-07-30 16:42:45Z) Node 26.0.0とNode 24.18.0で49 Clauses、8 Contracts、生成24ファイル、21テストファイル368テストを含む全ゲートを通した。
- [x] (2026-07-30 16:44:52Z) Ruleset `0.16.0`マイルストーンをpublic mainへpushし、`db357ae`に対するGitHub Actions `Check` run `30562770873`の成功を確認した。
- [x] (2026-07-30 23:48:00Z) 元計画の乱数単位とEvent DAG要件を照合し、次の縦切りを一つの明示Critical rollをDirect／Radial childrenで共有するresolved impactへ固定した。
- [x] (2026-07-31 00:04:17Z) `IMP-004`と`GOL-017`で親impactの共有explicit roll、一回のtier解決、全childへの継承を規定し、Ruleset `0.17.0`を生成した。
- [x] (2026-07-31 00:04:17Z) Domain／Kernel／Trace／CLI／skillを実装し、機能を `d85fb9b` としてコミットした。
- [x] (2026-07-31 00:04:17Z) Node 26.0.0とNode 24.18.0で51 Clauses、8 Contracts、生成24ファイル、21テストファイル382テストを含む全ゲートを通した。
- [x] (2026-07-31 00:04:17Z) empirical-prompt-tuningは対応・非対応を2回ずつ、改変Trace hold-outを1回評価し、全critical checklistを連続達成した。対応側のtool-useは9回で一致したが、非対応側は4回と7回、hold-outは10回だったため、全体の定量的な速度収束は主張しない。
- [x] (2026-07-31 00:06:37Z) Ruleset `0.17.0`マイルストーンをpublic mainへpushし、`7b79f91`に対するGitHub Actions `Check` run `30592492415`の成功を確認した。
- [x] (2026-08-01 05:12:33Z) 元計画のCommit 7以降の順序と実装済み境界を照合し、次の縦切りを解決済み固定tick数／間隔を持つ合成Beamに固定した。
- [x] (2026-08-01 05:19:25Z) `BEM-001`と`GOL-018`でBeam tickの有限schedule、固定Critical／Armor／Health pipeline、逐次commit、集約を規定し、Ruleset `0.18.0`を生成した。逆翻訳でBeam専用capabilityと6 Rulesを確認した。
- [x] (2026-08-01 05:36:00Z) Domain／Rules／Kernel／Trace replay／CLI／repository-local skillを実装した。base Damage 20、固定tier 1、Armor 300、Health 50、3 ticks／100msのGoldenはDamage 60、Health `50→30→10→0`、14 decisionsを再生する。
- [x] (2026-08-01 06:10:29Z) Ruleset更新で失効した既存17 Scenarioの参照とcontent hashを再計算し、全Catalog／ScenarioのContractとhashを検証した。adversarial Trace reviewの修正後、Node 26.0.0／24.18.0で53 Clauses、8 Contracts、生成24ファイル、21テストファイル411テストの全gateを通した。
- [x] (2026-08-01 06:23:20Z) Beam実装を `ce1fff9` としてコミットし、repository-local skillをfeature commit後のfresh executorで評価した。Iteration 0はdescription／body一致、対応Iteration 1／2は7/7、非対応Iteration 1／2は6/6、wrong-Catalog hold-outは6/6で、全回とも不明点0、retry 0だった。
- [x] (2026-08-01 06:26:51Z) Ruleset `0.18.0`マイルストーンをpublic mainの `9ed37ef` へpushし、GitHub Actions `Check` run `30687704748`の成功を確認した。
- [x] (2026-08-01 07:25:00Z) 元計画の次項目Experimentについて、codebase-investigatorの6段階静的調査を完了し、`docs/investigations/experiment-slice.md`へ証拠、矛盾、採用境界を記録した。
- [x] (2026-08-01 07:25:00Z) 最初のExperimentを、同一Catalog／Rulesetに束縛されたbase Scenarioと1〜15件の解決済みvariant Scenario参照を宣言順に評価し、一つのprimary metricの符号付き差 `variant - base` を返すall-or-nothing比較へ固定した。
- [x] (2026-08-01 07:12:43Z) Experiment／Comparison Contract、`EXP-001/002`、`packages/experiments`、SDK facade、合成fixture、境界／独立／敵対／統合テストを実装し、仕様を `88a846f`、runnerを `69e881a` としてコミットした。23テストファイル438件のローカル回帰が通過した。
- [x] (2026-08-01 07:36:10Z) `SCP-003`のDirect＋Radial記述漏れをPklで修正し、READMEとAGENTSの現状態をRuleset `0.18.0`、55 Clauses、10 Contracts、Experiment SDK／skill境界へ更新した。
- [x] (2026-08-01 07:36:10Z) empirical-prompt-tuningを比較対応／符号解釈／未対応Patch等で2回、custom Beam比較hold-outと修正後targeted rerunで実施した。最終2件は100%、critical全通過、retry 0、target-instruction不明点0。helper追跡状態、紹介と代替実行、unsupported routingの3点を修正した。tool-use／durationは取得不能のため定量収束を主張しない。
- [x] (2026-08-01 07:57:57Z) 最終adversarial／contract reviewを反映し、SDKの最初のawait前snapshot、accessor非実行／秘密非漏洩、extra field拒否、1〜15 variantsのfast-check propertyを `9965e5b` としてコミットした。独立再レビューにactionable findingは残らなかった。
- [x] (2026-08-01 07:57:57Z) Node 26.0.0とNode 24.18.0の双方で、26生成ファイルのfreshness、55 Clauses、10 Contracts、23テストファイル444件を含む `just check` を通した。
- [x] (2026-08-01 08:06:59Z) 最終skill／README／AGENTS／ExecPlanを `acf1616` としてpublic mainへpushし、GitHub Actions `Check` run `30691057997` がhead `acf1616` に対して1分11秒で成功した。
- [x] (2026-08-01 08:38:11Z) 唯一のplanned Clause `TRC-002`をactive化し、同じ `critical.roll` phaseの既存二RuleだけをRuleset宣言順で検査する境界をPklから26生成ファイルへ反映した。generated reverse translationはactive 55／planned 0、`kernel.foundation` supportedである。
- [x] (2026-08-01 08:38:11Z) Rulesへevent-kindだけを読むpredicate判定、KernelへDirect／共有impactの双方向rejection Trace、3 literal Golden更新、完全read比較、50-run property、hash改変試験を実装した。固定tier／expected／他phaseは従来どおり候補不一致を列挙しない。
- [x] (2026-08-01 08:38:11Z) README／AGENTS／repository-local skillを現境界へ更新した。empirical-prompt-tuningの変更前2件と変更後2件はすべて100%、critical全通過、retry 0、変更後のtarget-instruction不明点0だった。tool-use／durationは取得不能のため定量収束を主張しない。
- [x] (2026-08-01 08:38:11Z) skill validation／smoke、Node 26.0.0とNode 24.18.0の双方で26生成ファイル、55 Clauses、10 Contracts、24テストファイル453件を含む全 `check` を通した。
- [x] (2026-08-01 08:48:00Z) 最終独立reviewで指摘されたfingerprint再利用を防ぐためKernel Engineを`0.19.0`へ上げ、Ruleset IR `0.18.0`とは分離した。修正後reviewにactionable findingは残らず、機能を `80571a0` としてコミットした。
- [x] (2026-08-01 08:50:34Z) 最終文書を `d8ae3cc` としてpublic mainへpushし、GitHub Actions `Check` run `30692501313` がhead `d8ae3cc` に対して1分10秒で成功した。
- [x] (2026-08-01 09:06:47Z) 次のScenario Patchについてcodebase-investigatorの6段階静的調査を完了し、`docs/investigations/scenario-patch-slice.md`へ現行surface、矛盾、security、採用境界、独立oracle条件を記録した。
- [x] (2026-08-01 09:06:47Z) 最初のPatchを、完全参照したbase Scenarioの既存non-null scalar leafへ1〜64件の一意なsame-type `replace`を宣言順に適用し、通常のcontent-addressed Scenarioを事前materializeする有限sliceへ固定した。現行Experiment、Kernel、formal CLIは変更しない。
- [x] (2026-08-01 09:25:52Z) `ScenarioPatch 0.1.0`、`SCN-001`、生成Schema／capability、原子的materializer、SDK facade、literal fixture、repository-local helperを実装し、Node 26／24で25テストファイル473件を通した縦切りを `09ce13a` としてコミットした。
- [x] (2026-08-01 09:34:00Z) feature commit後のfresh executorでempirical-prompt-tuningを2回実行し、対応・構造編集拒否・誤base拒否の各5項目を両回100%で通した。materialize-only holdoutも5/5、不明点0、実行retry 0だった。full-file出力制限による非対応executorの再読は各回1件で、定量収束には数えない。
- [x] (2026-08-01 09:41:00Z) 独立仕様reviewを反映し、成功不能だった`null` operationをContractから除外し、result identityを`(id, revision)` pairとして明文化して片側変更の成功回帰を追加し、3 literal fixtureをSDK regression gateへ接続した。
- [x] (2026-08-01 09:51:29Z) 独立runtime／security reviewを反映し、descriptor snapshotのProxy trap境界を正確化して構造trap例外非漏洩を回帰化し、Patch hashをgoldenへpinし、helperのexit 0／1／2 subprocess testを追加した。skill validation／smokeとNode 26.0.0／24.18.0の双方で27生成ファイル、56 Clauses、11 Contracts、26テストファイル480件を含む全`check`を通した。修正後targeted re-reviewにactionable findingは残らなかった。
- [x] (2026-08-01 09:54:29Z) Scenario Patch実装 `09ce13a` とreview強化 `69803b9` をpublic mainへpushし、GitHub Actions `Check` run `30694606897` がhead `69803b9` に対して1分23秒で成功した。
- [x] (2026-08-01 10:02:00Z) Scenario Patch最終文書 `083c0f8` をpublic mainへpushし、GitHub Actions `Check` run `30694696206` が同headに対して1分10秒で成功した。
- [x] (2026-08-01 13:01:02Z) Scenario Patch後の候補についてcodebase-investigatorの6段階静的調査を完了し、`docs/investigations/patch-backed-experiment-slice.md`へ順序、現行flow、security、矛盾、採用境界、独立oracle条件を記録した。
- [x] (2026-08-01 13:01:02Z) 次の縦切りを、同じexact baseへ束縛された1〜15件のScenarioPatchを全件materializeしてから既存比較を開始するall-or-nothing Patch-backed Experimentへ固定した。次段は単一軸有限Sweep、その後をBreakpointとする。
- [x] (2026-08-01 13:22:55Z) Experiment Contractを`0.2.0`へ上げ、homogeneous resolved配列またはPatch-backed配列のunionと`EXP-003`をPklで規定した。27生成ファイルの逆翻訳は57 active／0 planned、11 Contracts、`experiments.resolved-comparison` supportedを示す。
- [x] (2026-08-01 13:22:55Z) exact baseと1〜15件のexact Patchを全件materialize後に比較するrunner、SDK facade、literal fixture、repository-local helper、独立property／敵対／SDK／subprocessテストを実装した。checked-in例はbase 100、variant 150、delta +50を返す。
- [x] (2026-08-01 13:22:55Z) Node 26.0.0で27生成ファイルのfreshness、57 Clauses、11 Contracts、28テストファイル504件を含む`just check`を通した。
- [x] (2026-08-01 13:34:07Z) 機能を`a85a038`としてコミットし、Node 24.18.0でも28テストファイル504件の全`check`を通した。feature commit後のfresh executorは対応／非対応を2回とも6/6、holdoutの単体Patch routingも6/6で通し、新規不明点0だった。usage metadataは取得不能のため定量収束は主張しない。
- [x] (2026-08-01 13:34:07Z) 最終独立静的reviewはPkl／generated union、complete-set検査、全materialization barrier、派生Scenario integrity、resolved互換、SDK snapshot、oracle discovery、operator fixtureを照合し、actionable findingなしで完了した。
- [ ] 最終進捗記録をコミットし、public mainへpushしてGitHub Actions CIを確認する。

## Surprises & Discoveries

- Observation: 公開済みのCommit 7以降の変更は、Critical tier一般化と解析的期待値が同じ未コミット作業ツリーに重なっていた。
  Evidence: `git status --short` は46件の追跡済み変更と7件の未追跡ファイルを示した。履歴を後から分割するより、全ゲートを通した一つのマイルストーンとして保存するほうが安全である。

- Observation: Scenario ContractはMonte Carloや複数targetを表現できるが、Kernelのdomain parserは現在の垂直スライス外として明示的に拒否する。
  Evidence: `packages/kernel/src/scenario-domain.ts` はMonte Carlo、target数が1以外、action数が1以外を構造化エラーとして返す。

- Observation: `result.aggregate` phaseだけでは単発expected集約とMultishot集約を区別できず、Ruleset順に全Ruleを適用すると異種eventへ誤適用される。
  Evidence: KernelのRule選択をphaseと`eventKind`の両方で絞り、既存expectedと新規Multishotの全回帰テストが同時に通るようにした。

- Observation: Scenario Contractのaction parameterは既に有限scalar mapを許していたため、`hitCount`追加にScenario schema version更新は不要だった。
  Evidence: `action.multishot-direct-hit`と`hitCount`はdomain parserで狭め、Ruleset `0.5.0`側が最大64の実行上限を担う。

- Observation: 同じ逐次Damage集約アルゴリズムでも、MultishotとPelletは異なるevent kindへ厳密に束縛する必要があった。
  Evidence: Rules packageのoperation declarationはphase、event kind、reads、writesを完全一致で検査するため、Pelletには `damage-vector.aggregate-sequential-pellets` を追加し、内部の安全な集約実装だけを共有した。

- Observation: Kernel側は固定Multishot evaluatorを固定grouped-hit evaluatorへ一般化でき、Direct Hitの意味論を複製せずPelletへ再利用できた。
  Evidence: `evaluateFixedHitGroupRuntime` がaction kindに応じて発生／集約Ruleとmetric名だけを切り替え、Critical、Armor、Health commitは既存Rule列をそのまま使う。

- Observation: 同じcopy、Critical、Armor、Health commit操作をRadialへ再利用しても、Rulesetのevent kind完全一致検査を弱める必要はなかった。
  Evidence: operation declarationは許可event kindの有限集合を持ち、生成Ruleは引き続き一つの `damage.radial` に厳密束縛される。falloffだけは専用operationと独立executorを持つ。

- Observation: Radial falloffを汎用scaleとしてTrace再生するだけでは、宣言済み入力との一致を検査できない。
  Evidence: replayはoperationの `factor`、`multiplier`、decision readの `event.radial-falloff-multiplier` が一致しないTraceを構造化エラーとして拒否する。

- Observation: Status tickの順序だけをTraceへ残しても、論理時刻が改ざんされるとEvent Queueの因果性を再生できない。
  Evidence: tick metadataへ予定時刻を含め、construct／commit／aggregateの `eventTimeMs` とinterval倍数の一致をreplayで検査する。時刻だけを再hashしたTraceも回帰テストで拒否する。

- Observation: repository-local skillの旧境界はStatus全体をunsupportedとしており、新しいresolved sliceも拒否した。
  Evidence: empirical-prompt-tuning初回の対応シナリオは実行を停止した。resolved Health Damage、tick数、間隔だけを許可し、chance／type／stack等を個別に拒否する記述へ直した第2ラウンドは対応・非対応とも全項目を満たした。

- Observation: Scenarioは当初から複数targetsを構文上許したが、対象間関係を表す場所がなく、配列順へ意味を暗黙付与する危険があった。
  Evidence: Scenario `0.2.0`はtarget配列と独立した `targetGraph.relations` を必須化し、impact-distanceとordered-pathだけを閉じたunionとして生成する。既存Goldenは全て空relationsを明示する。

- Observation: 複数targetの因果再生では、従来の単一 `target.health` だけでは同じDamage合計でもtarget割当の改ざんを検出できない。
  Evidence: path子Ruleの全operationへ `path.id`、`path.index`、`path.count`、`target.id` を残し、target別初期Healthをアンカーに再生する。target AのDirect Hit metadataだけをBへ変えてTraceを再hashした回帰試験は `invalid-operation-parameters` で拒否する。

- Observation: Resultへtarget別終端状態を追加すると、既存の単一target sliceも同じ公開Contractを満たす必要がある。
  Evidence: Result Contract `0.2.0`は `targetStates` を必須化し、Direct、expected、Multishot、Pellet、Radial、Statusも単一キーの終端Health projectionを出す。全既存GoldenとCLI契約試験が同時に通る。

- Observation: Scenarioの `targets` 配列順を安定IDの一覧として保持しながら、実行順をTarget Graph relationだけで決定できる。
  Evidence: Ricochet Goldenのtargets配列はA→B→C、relationはC→A→Bである。Domain、14 decisionのpath metadata、target別Health replayは一貫してC→A→Bとなり、Result `targetStates` は順序に依存しないID keyとして一致する。

- Observation: skillの実行説明が正しくても、開発中の未追跡fixtureを「checked-in」と呼ぶとempirical評価のcritical項目は満たせない。
  Evidence: chain第1回対応評価はrun/trace、順序、全metric、14 decision、停止境界を正しく報告したが、`git ls-files`でScenarioが未追跡だったため7項目中1項目をpartialと自己判定した。feature commit後に同じ条件を再評価する。

- Observation: 一つのimpact actionで `radialAttackModeId` と `radialCriticalTier` を独立に省略可能にすると、固定の二択key集合では四通りの互換入力を表せない。
  Evidence: Domain parserは各optional parameterの存在を別々に判定してexact-key集合を構築する。共有mode／別mode、共有tier／別tierの既存・新Goldenと50-run property testが全組合せの決定論的評価を保つ。

- Observation: empirical評価が2回連続で全項目を満たしても、executorがCLI呼出しをまとめるか分けるかでtool-useは3回から8回へ変動した。
  Evidence: 両回とも不明点0、retry 0、結果と境界は同一だった。質的再現性は確認できたが、step countの±10%収束条件は満たさないため速度改善の根拠には使わない。

- Observation: LoS falseや範囲外のRadial targetは子Damage eventを持たないため、従来のpath-target replayだけでは全targetの終端Healthを再構成できない。
  Evidence: Radial aggregate operationは命中2体の子eventに加えて非命中2体のzero Damage、初期Health、終端Healthを列挙する。replayはScenarioのtarget別初期Healthをアンカーに非命中のHealth不変を検査し、4体すべての `healthByTarget` を復元する。

- Observation: 同じtargetへDirectとRadialが連続commitされる因果Traceは、target数とDamage event数が一致しない。
  Evidence: 3 targetのGoldenはDirect 1件とRadial target event 3件の計4 event slotを使う。Trace replayは親impactの対象数3を検査しつつ、path metadataのcount 4と安定したindexを使い、Aの二つのcommitを `180→130→80` と連続再生する。

- Observation: skillのempirical評価で「checked-in fixture」と実装途中の未追跡状態が一時的に矛盾した。
  Evidence: feature commit前のexecutorはCLI結果を正しく再現したが、`git ls-files`でcritical項目をpartialとした。`6857390`後のfresh executorはHEAD blob一致、clean worktree、CLI成功を確認し、対応・非対応・hold-outすべて5/5、不明点0となった。

- Observation: target IDだけをTrace replay状態のkeyにすると、同じtargetへ複数Pelletが命中する二発目を「metadata変更」と誤判定する。
  Evidence: resolved Pellet GoldenはAへ2回連続commitする。replay内部はallocationのglobal path indexで各hitを識別し、同一targetの直前commit Healthを次hitの入力として検査した後、終端だけをtarget IDごとに再集約する。

- Observation: capability generatorがimpact Clauseを `IMP-001`、Goldenを `GOL-014` に固定列挙していたため、新しい `IMP-002/GOL-015` が汎用Direct capabilityへ誤分類された。
  Evidence: 初回の `vt describe` は新Clauseだけを `mechanics.direct-critical-armor` に含めた。generatorを `IMP-*` と二つのimpact Goldenへ拡張し、回帰テスト後は `mechanics.resolved-direct-radial-impact` が `GOL-014`、`GOL-015`、`IMP-001`、`IMP-002`を列挙する。

- Observation: skillのempirical評価は、未追跡fixtureでもexecutorが名前だけから「checked-in」と報告しうる。
  Evidence: feature commit前のIteration 1は数値を正しく再現したが、criticalなtracked状態を確認しなかった。`git ls-files --error-unmatch` とHEAD byte一致を実行前条件へ追加し、commit後のIteration 2／3では明示的に確認した。

- Observation: 親impactでDamageを発生させずrollだけを解決するdecisionは、従来のDamage child向けTrace replay状態とは別に検証する必要がある。
  Evidence: replayは親decisionのchance、roll、resolved tier、zero Damage、Health不変を再計算し、そのeventをDirectと全Radial constructの共通親として検査する。`resolvedTier`だけを1から0へ変えてTraceを正しく再hashしたhold-outも `invalid-operation-parameters` で拒否した。

- Observation: 同じCritical roll operationを単独Direct eventと親impact eventへ使うには、Rule宣言の許可event kindを広げても各生成Ruleのevent kind束縛を維持する必要がある。
  Evidence: operation declarationは `damage.direct` と `impact.direct-radial` の有限集合だけを許可し、Ruleset validatorは生成Ruleごとのphase、event kind、reads、writesの完全一致を引き続き検査する。

- Observation: explicit scalar parameterは値が `null` の場合、keyの存在だけではresolution modeを安全に決定できない。
  Evidence: Domain parserは `criticalTier` または `criticalRoll` のちょうど一方が有効な数値であることを検査し、null、範囲外roll、tierとrollの併記、rollとRadial固有parameterの併記を部分Artifactなしで拒否する。

- Observation: 新しいBeam ClauseとGoldenを生成した初回のcapability manifestは、それらを汎用Direct capabilityへ誤分類した。
  Evidence: 初回の `just spec-gen` は `BEM-001/GOL-018` を `mechanics.direct-critical-armor` へ列挙した。生成器の有限分類と回帰試験を追加し、再生成後は `mechanics.resolved-beam-ticks` が両Clauseだけをsupportedとした。

- Observation: Rulesetのcontent hash更新後は、新規Beam Scenarioだけでなく既存Golden全件の `rulesetRef` と自己hashも意図どおり失効した。
  Evidence: 初回のKernel回帰は既存Scenarioを `ruleset-reference-mismatch` で拒否した。生成Ruleset `0.18.0` revision `1` の参照へ既存17件を機械的に更新し、全ScenarioのContractとcanonical content hashを独立に再検証した。

- Observation: Beam専用metricを大域のsupported IDへ追加しただけでは、単発Direct Scenarioがそのmetricをdomainで受理し、投影時まで失敗を遅延させた。
  Evidence: 既存のmetric-subset propertyが `beam.tick-interval-ms` をDirectへ選んで失敗した。Beam-only集合を明示し、非Beam actionで `unsupported-metric` として事前拒否する回帰試験を追加した。

- Observation: 正常Traceの再生だけでは、Beam tickごとのCritical tier／Armor根拠改変とStatus tickへのscale操作混入を検出できなかった。
  Evidence: adversarial review後、Beam replayへCritical tier／multiplier／factor式、Armor／constant／factor式、全tick共通入力、Health commit readsを追加した。さらにdecision sequence、単一終端aggregate、Status tickのscale拒否を固定し、再hashした5種のtamper回帰試験を追加した。

- Observation: tick metadataを持つ不正scaleだけを拒否しても、schedule直後へmetadataなしfactor 1のglobal scaleを挿入でき、二つ目のscheduleは期待tick種別を上書きできた。
  Evidence: follow-up adversarial reviewを受け、Status／Beamのschedule後は各sliceの有限なtick operation列と終端aggregate以外を拒否するmode whitelistを追加した。metadataなしglobal scale、二重Status schedule、Beam global scaleを正しく再hashした回帰試験はすべて `invalid-operation-parameters` となる。

- Observation: tick内部の演算式とschedule後のoperation集合を閉じても、tick間のbase Damage変更、schedule前のglobal copy、論理時刻を逆行させるtick interleaveは独立に可能だった。
  Evidence: 二回目のadversarial reviewを受け、最初のBeam base Damage totalを全tickへ固定し、Beam／Status scheduleを最初のapplied decisionへ限定し、applied decisionの時刻を非減少にした。Health 0でも成立する完全整合tamperを含む3回帰試験を追加し、Node 26／24の全gateで拒否を確認した。

- Observation: Beamで追加したtick replay不変条件を既存Statusへ対称に適用しないと、Status Damageのtick間変更、aggregate複製、event topology改変が残った。
  Evidence: 最終adversarial reviewを受け、Statusの最初のresolved Damage totalを全tickへ固定し、Status／Beam共通のterminal aggregate状態とexactly-one footerを追加し、Status schedule／copy／commit／aggregateのcanonical event鎖を検査した。完全整合Damage tamper、aggregate複製、4段階のtopology改変を再hashした回帰試験はすべて拒否される。

- Observation: Trace-only replayはBeam construct時のbase Damage合計をCatalog由来のscalar readへ束縛するが、合計を保ったDamage type間の付け替えまでは独立に証明しない。
  Evidence: evaluatorとCatalog fingerprintは元入力を束縛し、正常Artifactの生成を検証する。一方、Trace単体でcomponent vectorまで根拠化するには、component別readを契約へ追加するかCatalog-aware replayへ拡張する別マイルストーンが必要であり、今回のsynthetic Beam sliceでは境界を拡張しない。

- Observation: 複数Scenarioの比較では、供給配列順を実行順にするとExperiment宣言順と入力transport順が混同される。
  Evidence: runnerは供給Scenarioをid／revisionで完全照合してからbaseとvariant宣言順へ再解決する。逆順供給のSDK／runnerテストは100／100／75とdelta 0／0／-25を同じComparison hashで再現した。

- Observation: 注入可能な単一Scenario evaluatorの失敗codeをそのまま公開causeCodeへ複写すると、任意の内部文字列を漏らせた。
  Evidence: adversarial executorが `code` と `causeCode` の両方へ秘密文字列を入れ、初期実装からの露出を再現した。runnerは失敗理由を固定 `evaluator-reported-failure` へ正規化し、exception、extra field、任意failure payloadの非漏洩回帰を通した。

- Observation: SDK facadeがRulesetロードをawaitしてからrequest fieldを読むと、runner自身の同期snapshotより前にcaller mutationやthrowing accessorが介入できた。
  Evidence: 最終adversarial reviewが `runExperiment` のawait境界を指摘した。SDKはexact 3-field requestを最初のawait前にdescriptor snapshotし、呼出し直後のmutation、accessor非実行／秘密非漏洩、extra field拒否の回帰を通した。

- Observation: `EXP-001/002`を`property-tested`として公開するには、有限なexample matrixだけでは検証方法の表記と実証が一致しなかった。
  Evidence: fast-check propertyを追加し、1〜15 variants、供給順permutation、有限小数／負の0の符号付きdelta、missing／duplicate／extra／undeclared集合、任意evaluator失敗位置を生成した。全runで宣言順、非丸め、hash、事前拒否、call prefix、部分row禁止を検査する。

- Observation: Experiment完了後も `TRC-002`だけがplannedで、Trace Contractのpredicate／guard／operation拒否shapeとKernelの変換分岐は存在する一方、現在のdispatcherがphaseとevent kindを先に完全一致させるためrejected decisionは一件も生成されない。
  Evidence: generated coverageはactive 54／planned 1、全Goldenの `rejectedRules` は空である。Ruleset宣言順では同じ `critical.roll` phaseにimpact共有roll Rule、Direct explicit-roll Ruleが並ぶため、この二候補だけで新しい戦闘メカニクスなしに非適用Ruleの因果記録を検証できる。

- Observation: rejected decisionを一件追加するとTraceとそれを参照するResultのcontent hashは変わるが、Scenario／Catalog／Ruleset入力hashとmetric projectionだけのComparison Goldenは変わらない。
  Evidence: formal comparison helperはexplicit-roll variantの新Trace／Result hashを含めてintegrity-checkを通し、`--check-golden`のbase／variant metric値とsigned deltaは従来どおり一致した。checked-in literal出力hashは存在しない。

- Observation: Traceの可観測decisionを変えてKernel Engine `0.18.0`を据え置くと、旧実装と新実装が同じexecution-input `resultHash`を共有する。
  Evidence: `engineVersion`はCatalog／Ruleset／Scenario hash、seedとともにResult／Trace fingerprintの入力である。Ruleset IRは不変のためRuleset `0.18.0`を保ち、Kernel実装だけを`0.19.0`へ上げてcache／再現境界を分離した。

- Observation: skillの変更前baselineは共有rollを17 decisionsと書いたままでも、fresh executorがformal Traceから18へ自己修正して100%になった。
  Evidence: empirical baseline 2件はcritical checklistを通したが、この成功はinstruction/runtime driftを隠す。本文へ二候補、非失敗のrejection意味、Direct 6件／共有impact 18件を近接して明記し、変更後fresh 2件も100%／retry 0だった。

- Observation: 計画メモのScenario Patchは三つのwire shapeと現行Scenarioに存在しないpath例を含み、操作上限、output identity、envelope差分、失敗原子性を確定していなかった。
  Evidence: Pkl／生成物にはPatch定義がなく、現行有限Contract IRにも再帰JSON値nodeはない。一方、Scenario `0.3.0`のconfiguration／parametersはflat scalar recordなので、allowlist付きscalar replaceならIR拡張なしで検証できる。

- Observation: `SCN-001`の「指定Path外は不変」を派生Scenarioへそのまま適用すると、必須の`id`、`revision`、`createdFrom`、`contentHash`変更と矛盾する。
  Evidence: Artifact envelopeは派生identityとhashをContract化している。Patch isolation oracleではこの四fieldだけをmaterialization差分として除外し、それ以外のcanonical差分を宣言pathへ厳密に束縛する必要がある。

- Observation: Scenario Patch後の順序は規範仕様にもExecPlanにも固定されておらず、元計画にはPatch-backed variant、Sweep、Breakpointの粒度が混在する。
  Evidence: P0-Bと後半のpackage構成はvariant PatchをSweepより前、SweepをBreakpointより前に置く。現行Pklには完成Scenario比較と単体Patch materializationだけがあり、Sweep／BreakpointのContract、Clause pattern、capabilityは存在しない。

- Observation: Sweepを先に実装すると、現在分離しているPatch materializationとComparisonの原子性、exact membership、派生Scenario identity、failure topologyをSweep固有に再定義する必要がある。
  Evidence: 現行runnerは完全Scenario集合を要求し、materializerはExperimentを開始しない。Patch-backed Experimentを先に合成すれば、次の単一軸Sweepは同じ有限orchestrationへordered Patch pointsを供給するだけに狭められる。

## Decision Log

- Decision: 進捗記録は `docs/execplans/kernel-gun-semantics.md` に置き、実装開始前、各マイルストーン完了時、停止時に更新する。
  Rationale: `VoidTrace計画.md` は設計履歴であり規範仕様ではない。生成ドキュメントも手編集できないため、再開可能な手書きの実行記録を独立させる必要がある。
  Date/Author: 2026-07-30 07:22:00Z / Codex

- Decision: 次の垂直スライスは、最終ロードマップの並びに従いMultishotから始める。
  Rationale: Direct Hit、Critical、Armor、Health commit、Event Queue、Traceがすでに一周している。Multishotは既存の一発評価を複数イベントへ拡張し、後続のPellet、Radial、Status、複数targetへ進む前にイベント反復とWorld State更新を検証できる。
  Date/Author: 2026-07-30 07:22:00Z / Codex

- Decision: Multishotを暗黙の最終倍率として実装せず、明示的な子Direct Hitイベントとして評価する。
  Rationale: 単一倍率に畳むと、各弾のCritical、Status、派生イベント、target選択を将来追跡できない。VoidTraceの価値である因果Traceも失われる。
  Date/Author: 2026-07-30 07:22:00Z / Codex

- Decision: 最初のMultishot入力は、Scenarioに明示された正のsafe-integer hit countと固定Critical tierだけを受理する。
  Rationale: 確率的Multishot、各弾のCritical roll、expected modeを同時に入れると確率分岐の直積が必要になる。まず順次World State更新とTrace因果性を独立に検証し、確率モデルは後続Clauseとして追加する。
  Date/Author: 2026-07-30 07:24:11Z / Codex

- Decision: Multishot後の次の垂直スライスは、元計画の列挙順に従いPelletとする。
  Rationale: Pelletは同じ一回の射撃に属する複数の命中単位を表し、既存の順序付きDirect Hit反復を再利用しつつ、Multishot由来の追加射撃単位と区別できるかを先に検証できる。RadialやStatusより新しいDamage式・時間状態が少ない。
  Date/Author: 2026-07-30 07:46:00Z / Codex

- Decision: 最初のPellet sliceは明示された正のsafe-integer pellet countと共通固定Critical tierだけを受理し、Multishotとの直積を扱わない。
  Rationale: Pellet単体の親子関係、順序、集約名を独立に固定する。Multishotとの組合せ、pellet別Critical roll、命中分配、Spread、確率的pellet数は後続Clauseに分離する。
  Date/Author: 2026-07-30 07:46:00Z / Codex

- Decision: 最初のRadial sliceは、Scenarioに明示された有限な `0〜1` の解決済みfalloff multiplierと固定Critical tierを持つ単一targetの単独Radial Hitとする。
  Rationale: 元計画は距離や配置をHitPlan入力としてKernelへ渡し、Kernel自身は物理シミュレーションしない。現在のWarframe距離式を未検証のまま埋め込まず、Radial固有のevent kind、Rule適用位置、Result／Traceを先に検証できる。
  Date/Author: 2026-07-30 07:58:00Z / Codex

- Decision: 初回RadialではDirect sibling、Projectile親、Multishot、Pellet、複数target、距離からのfalloff解決を扱わない。
  Rationale: Direct／Radial共有rollや親子DAG、Target Graphは別の構造マイルストーンである。単独RadialのDamage pipelineとresolved input境界を先に固定する。
  Date/Author: 2026-07-30 07:58:00Z / Codex

- Decision: 最初のStatus sliceは、`status.synthetic-resolved-dot` の1 tickあたり解決済みHealth Damage、正のtick数、正の間隔を持つ単一targetの独立actionとする。
  Rationale: Status chance、type抽選、Damage式、Armor、防御変化、stack、duration refresh、snapshot元を同時に推測せず、Event Queueの時間進行、逐次Health commit、Trace因果性だけを先に検証できる。
  Date/Author: 2026-07-30 08:14:00Z / Codex

- Decision: 最初のStatus sliceは最大64 tickとし、最後のtickがScenarioの `timeLimitMs` を超える入力、安全に表現できない時刻、expected／Monte Carloを受理しない。
  Rationale: 部分Resultを返さず有限実行を保証し、これまで未使用だったScenarioの実行時間 horizonを初めて検証可能な境界として固定する。
  Date/Author: 2026-07-30 08:14:00Z / Codex

- Decision: 初回StatusではDirect／Radialからの付与、Critical、Status chance、forced Proc、type weighting、stack、refresh、実ゲーム固有DoT式を扱わない。
  Rationale: 入力名を `resolvedHealthDamagePerTick` として防御後の確定値に限定し、未実装の計算をゼロ効果や暗黙formulaとして混入させない。
  Date/Author: 2026-07-30 08:14:00Z / Codex

- Decision: Status後の次の構造マイルストーンは、元計画で複数targetの中心に置かれたTarget Graphとする。
  Rationale: 現在のScenario Contractはtargets配列を持つが、Kernelは単一targetだけへ狭めている。Radial、Punch Through、Chain、Ricochet、Pellet配分を個別の座標計算として足す前に、解決済みの対象関係をArtifactとして表す共通境界が必要である。
  Date/Author: 2026-07-30 08:26:00Z / Codex

- Decision: 最初のTarget Graph変更は関係入力のContractと明示的なunsupported境界を先に固定し、複数target Damage評価を同じ変更へ暗黙に含めない。
  Rationale: 対象関係の表現とWorld State／Result／Traceの複数target化は別の検証課題である。Contractだけを受理して単体評価へ無視することは、unsupported mechanicをゼロ効果へ縮退するため禁止する。
  Date/Author: 2026-07-30 08:26:00Z / Codex

- Decision: 最初に実行するTarget Graph relationは、`pathKind: punch-through` の解決済みordered pathとする。
  Rationale: 順序が明示された複数targetへ既存Direct Hit Ruleを再利用し、World State、Result、Trace replayのtarget identityを検証できる。貫通減衰、壁厚、物理衝突、chain選択、ricochet角度は同時に導入しない。
  Date/Author: 2026-07-30 08:32:00Z / Codex

- Decision: punch-through actionは一つの `action.resolved-punch-through-direct-hits` とし、`targetPathRelationId`で一つのordered-path relationを参照する。
  Rationale: actionPlan配列順やtargets配列順へ意味を暗黙付与せず、命中順の唯一の根拠をTarget Graphへ置く。各targetには同じ固定Critical tierのDirect Hitを一度ずつ適用する。
  Date/Author: 2026-07-30 08:36:00Z / Codex

- Decision: Result Contractをtarget別終端Healthを持つ `targetStates` へ拡張し、複数target集約metricはtarget数、撃破数、残Health総和、Damage総和だけを公開する。
  Rationale: `target.health.remaining`を複数targetへ曖昧に流用せず、個別状態と集約値を分離する。Traceにはpath／target identityを残し、target別初期Healthをアンカーに再生する。
  Date/Author: 2026-07-30 08:36:00Z / Codex

- Decision: punch-through後の次のTarget Graph relationは、`pathKind: ricochet` の解決済みordered pathとする。
  Rationale: 既存Contractが表せる明示順を再利用しつつ、target配列順と命中順を分離できる。Chainは候補edgeと選択戦略のContractがまだないため後続とし、反射角、物理軌道、target自動選択、減衰、rollを同時に導入しない。
  Date/Author: 2026-07-30 10:38:00Z / Codex

- Decision: ricochetはpunch-throughと別action、別Rule ID、別operation、別capability、別aggregate metricを持ち、安全なtarget別Direct Hit実行器だけを共有する。
  Rationale: 同じordered pathでも意味論と将来の補正点は異なる。汎用pathという名前へ早期に畳んでTraceから由来を失わず、Kernel内のCritical／Armor／Health pipeline重複も避ける。
  Date/Author: 2026-07-30 10:38:00Z / Codex

- Decision: 最初のchain sliceは候補edgeや選択戦略をKernelへ与えず、`pathKind: chain` の外部解決済みordered pathとmatching actionだけを受理する。
  Rationale: 現在のScenario Contractで表現できる因果順とtarget別World Stateを先に検証する。nearest、highest-health、random、all-eligible等の選択戦略、距離、branch、再訪、減衰は別のContractとClauseが必要であり、暗黙実装しない。
  Date/Author: 2026-07-30 10:55:00Z / Codex

- Decision: chainもpunch-through／ricochetと別action、Rule ID、operation、capability、aggregate metricを持ち、target別Direct Hit pipelineとTrace replayだけを共有する。
  Rationale: `damage.chain.total` とchain由来RuleをTraceへ残し、同じordered path表現を理由に将来異なる補正点を混同しない。
  Date/Author: 2026-07-30 10:55:00Z / Codex

- Decision: chain後の次のTarget Graph sliceは、既存の `target-relation.impact-distance` を消費する `action.resolved-radial-targets` とする。
  Rationale: ordered path三種が実行可能になったため、残る既存relation vocabularyを部分Artifactなしのunsupportedから実行可能へ進める。単独RadialのCritical→falloff→Armor→Health pipelineをtarget別に再利用し、物理座標や地形計算は追加しない。
  Date/Author: 2026-07-30 11:10:00Z / Codex

- Decision: 最初のmulti-target Radialは、actionが `impactId`、非負のfalloff開始距離、それより大きい終了距離、`[0, 1]` の最小倍率、固定Critical tierを明示する合成線形モデルとする。
  Rationale: 現行Warframe式やCatalog値を未検証のまま埋め込まず、距離が開始以下なら倍率1、開始と終了の間なら1から最小倍率へ線形補間、終了超またはresolved LoS falseなら非命中とする有限な実験契約をGoldenとpropertyで検証できる。
  Date/Author: 2026-07-30 11:10:00Z / Codex

- Decision: 一つのmulti-target Radial actionは、全relationが同じimpact IDを持つ1〜64件のimpact-distance relationだけを受理し、relation配列順で対象を検査する。
  Rationale: 複数impact、ordered pathとの混在、重複target、64件超を同時に扱わず、距離／LoSによる非命中targetも終端Healthを変更せずResult `targetStates`へ残す。命中targetだけに既存5-Rule Radial pipelineを適用し、別Ruleで集約する。
  Date/Author: 2026-07-30 11:10:00Z / Codex

- Decision: multi-target Radial後の次のTarget Graph sliceは、`target-relation.pellet-allocation` と `action.resolved-pellet-allocation` による解決済みPellet配分とする。
  Rationale: 元計画はSpreadの幾何計算ではなくtarget別命中数をScenario入力に置く。既存の固定Pelletと複数target World Stateを結び、同じtargetへの反復命中、別targetへの配分、missを一つの有限Traceで検証できる。
  Date/Author: 2026-07-30 11:22:00Z / Codex

- Decision: 一つのresolved Pellet allocationは、1〜64の総pellet数、同じallocation IDを持つtarget別0以上のsafe-integer命中数、固定Critical tierを受理し、relation順、次にtarget内pellet index順で評価する。
  Rationale: target別命中数の合計が総pellet数以下なら差分をmissとして明示できる。全targetに一つずつrelationを要求して非命中targetも `targetStates` に残し、合計超過、重複target、異なるallocation ID、未解決の確率入力は部分Artifactなしで拒否する。
  Date/Author: 2026-07-30 11:22:00Z / Codex

- Decision: Pellet allocation追加ではScenario Contractを `0.3.0` へ上げ、既存Goldenも新しいschema identifierへ一括移行する。
  Rationale: 新しいTarget Graph relation variantは受理可能な永続入力集合を変える。actionの自由形式scalar parameters追加だけとは異なりschema unionの変更なので、同じ `0.2.0` 識別子の意味を黙って書き換えない。
  Date/Author: 2026-07-30 11:22:00Z / Codex

- Decision: Pellet allocation後の次の構造sliceは、`action.resolved-direct-radial-impact` とし、一つのresolved impactを親に一つのDirect Hitと既存のmulti-target Radialを兄弟イベントとして評価する。
  Rationale: 元計画がv0要件に置く「DirectとExplosionの親子関係」と全イベントの因果追跡を、すでに独立検証済みのDirect、Radial、Target Graph、target別World Stateを組み合わせて最小に検証できる。Projectile軌道、衝突、爆心、実ゲームfalloffは追加しない。
  Date/Author: 2026-07-30 13:18:07Z / Codex

- Decision: 初回の合成impactは一つのCatalog attack modeと一つの固定Critical tierをDirect／Radial双方へ明示的に共有し、Direct targetを先にcommitしてからrelation順のRadial targetを評価する。
  Rationale: 複数attack mode参照やDirect／Radial別rollを未検証のまま先取りせず、同一targetが両方を受ける場合のWorld State共有とTrace親子関係に検証焦点を置く。別base Damage、roll共有規則、Status、Multishot／Pellet合成は後続Clauseで明示する。
  Date/Author: 2026-07-30 13:18:07Z / Codex

- Decision: 新actionは既存Scenario Contract `0.3.0` のscalar parameterとimpact-distance relationだけで表し、Contract versionは変更しない。
  Rationale: 永続wire shapeやrelation unionは変えず、手書きdomainが受理するaction kindとparameter集合だけを増やす。Ruleとcapabilityの意味変更はRuleset `0.14.0`で識別する。
  Date/Author: 2026-07-30 13:18:07Z / Codex

- Decision: 別attack mode版は新しいaction kindを増やさず、既存 `action.resolved-direct-radial-impact` に明示的な `radialAttackModeId` がある場合だけ有効化する。省略時はRuleset `0.14.0`で確立した共有attack mode挙動を保つ。
  Rationale: Direct用参照はattackerの `weaponId`／`attackModeId`として既に明示されている。Radial用ID一つを追加すれば、既存Goldenを互換性試験として残しつつ二つのCatalog解決を曖昧なdefaultなしで区別できる。action kindを分けるほどEvent DAGや集約意味は変わらない。
  Date/Author: 2026-07-30 13:43:18Z / Codex

- Decision: 最初の別attack mode impactは、同じweapon内のhitscan attack mode二つと一つの固定Critical tierだけを受理する。DirectとRadialのbase Damage／Critical multiplierは各Catalog参照から読み、Direct commit後にRadialを既存relation順でcommitする。
  Rationale: この縦切りはCatalog参照分離だけを検証する。Projectile delivery、別Critical tier／roll、roll共有、Status、Multishot、Pellet、実ゲームCatalog値を同時に導入せず、Radial decisionがDirectとは異なる `attack.base-damage` を読んだことをTraceで検査できる。
  Date/Author: 2026-07-30 13:43:18Z / Codex

- Decision: `radialAttackModeId` は既存Scenario Contract `0.3.0` のscalar parameter mapで表し、Scenario schemaは据え置く。新Clause、Golden、受理可能なdomain挙動はRuleset `0.15.0`で識別する。
  Rationale: relation unionや永続wire shapeは変わらない一方、同じaction kindが受理する明示parameter集合とCatalog bindingが増えるため、Ruleset参照を更新して旧評価境界と混同しない。
  Date/Author: 2026-07-30 13:43:18Z / Codex

- Decision: 別固定tier版も既存 `action.resolved-direct-radial-impact` を使い、`criticalTier` をDirectへ、明示された `radialCriticalTier` をRadialへ適用する。`radialCriticalTier` 省略時は従来どおり `criticalTier` を共有する。
  Rationale: 固定tierの分離はEvent DAGやCatalog bindingを変えず、attack mode分離と直交する。新action kindや暗黙defaultを増やさず、共有mode／別modeの既存Goldenを互換性試験として残せる。
  Date/Author: 2026-07-30 16:32:22Z / Codex

- Decision: `radialCriticalTier` は非負safe-integerだけを受理し、Direct／Radial双方とも既存の一般化tier倍率Ruleを使う。roll、Critical chance、roll共有、expected分岐は扱わない。
  Rationale: この縦切りは二つの明示固定値を正しいchild eventへbindすることだけを検証する。確率解決や共有roll規則を同時に入れると、入力契約と分岐集約が別の検証課題になる。
  Date/Author: 2026-07-30 16:32:22Z / Codex

- Decision: 新Goldenは別attack modeと別固定tierを組み合わせ、Directにtier 1、Radialにtier 2を与える。Direct target AのHealthは300とし、Health-zero clampで因果差が隠れない値を使う。
  Rationale: Direct base 100×tier 1×Armor 0.5=100、Radial Aはbase 80×tier 2×Armor 0.5=120、Cは80×3×falloff 0.7×Armor 0.25=42となる。Aを300→200→80、Cを90→48へ更新すれば、各tierのTrace読取と共有World Stateをliteral値で同時に検査できる。
  Date/Author: 2026-07-30 16:32:22Z / Codex

- Decision: `radialCriticalTier` は既存Scenario Contract `0.3.0` のscalar parameter mapで表し、Scenario schemaは据え置く。新Clauseと受理可能domainはRuleset `0.16.0`で識別する。
  Rationale: relation unionとArtifact wire typeは変わらないが、同じactionが受理する明示parameter集合と評価bindingは増える。Ruleset参照を更新して旧境界と混同しない。
  Date/Author: 2026-07-30 16:32:22Z / Codex

- Decision: 最初のroll共有版は既存 `action.resolved-direct-radial-impact` で `criticalTier` の代わりに一つの `criticalRoll` を受理し、親impactの `critical.roll` phaseでprimary attack modeのCritical chanceからtierを一度だけ解決する。
  Rationale: 同じ明示rollを各childで再解決すると数値が同じでも共有という因果関係をTraceできない。親decisionを一つにすれば、Directと全Radial childrenが同じ解決済みtierを継承したことをEvent DAG上で検査できる。
  Date/Author: 2026-07-30 23:48:00Z / Codex

- Decision: Ruleset `0.17.0`のroll共有版はprimary attack modeをDirect／Radialで共有する場合だけ受理し、`radialAttackModeId`、`radialCriticalTier`、子別roll、生成乱数、expected分岐を拒否する。
  Rationale: 異なるattack modeのCritical chanceへ同じ乱数値を適用する場合、同じrollでも解決tierが異なり得る。その意味論と独立rollを同時に先取りせず、最初の縦切りは一つのchance、一つのroll、一つのresolved tierに閉じる。
  Date/Author: 2026-07-30 23:48:00Z / Codex

- Decision: 新Goldenはprimary modeのCritical chance `0.25` と明示roll `0.2`からtier 1を解決し、Direct target AのHealthを300とする。Directは100 Damage、RadialはAへ100、Cへ35を与える。
  Rationale: Aを `300→200→100`、Cを `90→55`、Bを60のまま保てば、Health-zero clampで因果差を隠さず、Direct 100、Radial 135、合計235、残Health合計215をliteral値として検査できる。Traceは親expand、親roll、Direct 4件、Radial 5件×2、aggregateの17 decisionsになる。
  Date/Author: 2026-07-30 23:48:00Z / Codex

- Decision: `criticalRoll` は既存Scenario Contract `0.3.0` のscalar parameter mapで表し、Scenario schemaは据え置く。新Clause、親roll Rule、受理可能domainはRuleset `0.17.0`で識別する。
  Rationale: Artifact wire typeは変わらず、既存の `[0, 1)` 明示roll契約を別actionへ適用するだけである。一方、同じactionが受理するresolution modeとRulesetのEvent DAGが増えるため、Ruleset versionで旧境界と区別する。
  Date/Author: 2026-07-30 23:48:00Z / Codex

- Decision: Ruleset `0.18.0`の次マイルストーンは、単一targetへ明示された1以上64以下のtick数と正のsafe-integer間隔でDamageをcommitする `action.resolved-beam-ticks` とする。
  Rationale: 元計画の銃器意味論拡張順でMultishot、Pellet、Radial、Status、複数targetは実装済みだがBeamが残る。解決済みtick列なら物理や現行ゲーム式を導入せず、既存Event QueueとDamage pipelineを時間付き銃器eventへ再利用できる。
  Date/Author: 2026-08-01 05:12:33Z / Codex

- Decision: 最初のBeamは合成Catalogの `delivery: beam`、固定Critical tier、resolved Armor／Healthだけを使い、各tickをbase Damage copy、Critical scale、Armor scale、Health commitの順で評価する。
  Rationale: held durationからのtick数導出、ramp、Fire Rate、Magazine／Ammo／Reload、Chain Beam、tick別roll、Status、expected分岐を同時に入れると、時間scheduleとDamage pipeline再利用を独立に検証できない。
  Date/Author: 2026-08-01 05:12:33Z / Codex

- Decision: Beam Goldenはbase Damage 20、Critical tier 1、multiplier 2、Armor 300、Health 50、tick数3、間隔100msとする。
  Rationale: 各tickは `20→40→20`となり、Healthを `50→30→10→0` へ更新する。Beam Damage合計60と14 decisionsをliteralに固定すれば、CriticalとArmorの再利用、時刻100／200／300ms、Health clamp、最終集約を一つの例で検査できる。
  Date/Author: 2026-08-01 05:12:33Z / Codex

- Decision: 最初のExperiment Contractは `catalogRef`、`rulesetRef`、`baseScenarioRef`、1〜15件の `{ id, scenarioRef }`、`primaryMetric`だけを持つ解決済み比較とし、JSON Patch、Sweep、Breakpoint、ruleset branch、Monte Carloを含めない。
  Rationale: 現行の有限Contract IRは完全なArtifactRefを表現できる一方、再帰JSON値やJSON Pointer／Patch操作の意味論を持たない。すでに解決済みのScenario revisionを比較すれば、差分生成を先取りせずcontent-addressed provenanceと宣言順を独立に検証できる。
  Date/Author: 2026-08-01 07:25:00Z / Codex

- Decision: 最初のExperiment runnerは `packages/experiments`へ置き、baseの後にvariant宣言順で単一Scenario Kernel evaluatorを呼ぶ。全ScenarioはExperimentと同じCatalog／Ruleset／game buildを参照し、variant IDとScenario参照は一意、primary metricは全Resultに存在しなければならず、一件でも失敗した場合はComparisonも部分evaluation列も返さない。
  Rationale: Kernelの単一戦闘意味論を変更せず、SDKがApplication向け構成を担う既存依存方向を保てる。ゼロ補完や成功branchだけの返却を禁止すれば、比較として見える不完全Artifactを生成しない。
  Date/Author: 2026-08-01 07:25:00Z / Codex

- Decision: ComparisonはExperimentとは別のcontent-addressed Artifactとし、Experiment参照、primary metric、baseおよびvariantごとのScenario／Result参照、値、baseからの符号付き差 `variant - base` だけを保持する。
  Rationale: Result値そのものを再計算せず、比較入力と出力のprovenanceをSchemaとhashで検査できる。比率、優劣方向、tie、ranking、統計量はmetric意味論を必要とするためこのsliceでは生成しない。
  Date/Author: 2026-08-01 07:25:00Z / Codex

- Decision: Experiment後の次の縦切りはScenario Patchより先に `TRC-002`をactive化し、候補列挙を `critical.roll` phaseの既存二Ruleだけへ限定する。
  Rationale: `TRC-002`は現在唯一のplanned Clauseであり、`kernel.foundation`のpartial状態を残している。全phaseの全候補を記録すると最大64 hit／tickでTraceが不必要に急増する一方、既存二RuleならDirectと共有impactの両方向で宣言順、predicate不一致、状態非変更、安定reasonを独立に検証できる。guard／operation rejection、全phase候補監査、Scenario Patch、Sweep、Breakpointはこのsliceへ含めない。
  Date/Author: 2026-08-01 08:20:01Z / Codex

- Decision: `TRC-002`後の次の縦切りは `ScenarioPatch 0.1.0` と `SCN-001`による事前materializationとし、現行Experiment `0.1.0`へPatch variantを埋め込まない。
  Rationale: 完全Scenarioへ解決してから既存Experiment／Kernelへ渡せば、比較順序、戦闘意味論、Result／Trace integrityを変更せず、差分生成の安全性を独立に検証できる。Patch-aware Experiment、Sweep、Breakpointは別のplanning sliceを要する。
  Date/Author: 2026-08-01 09:06:47Z / Codex

- Decision: 最初のPatchは1〜64件の`replace`だけを受理し、既存allowlist pathのsame-type non-null scalar leafだけを変更する。完全なbase ArtifactRefをstale-base preconditionとし、出力`(id, revision)` pairはPatchが宣言、`createdFrom`はbase完全参照、`contentHash`は再計算する。
  Rationale: 現行有限Contract IRで表現でき、Critical tier、Armor、Health、resolved falloff／relation値、時間上限など実用的な合成variationを扱える。`add/remove/test/move/copy`、object／array値、構造変更を同時に入れると再帰JSON値、index shift、conflict、provenanceの意味論が必要になる。
  Date/Author: 2026-08-01 09:06:47Z / Codex

- Decision: Scenario Patch後の次の縦切りはPatch-backed Experimentとし、その後に単一軸有限Sweep、さらに後にBreakpointを置く。
  Rationale: 元計画はExperimentがScenarioをPatchで展開してからparameter Sweepへ進む。現行の単体Patchと完成Scenario比較を先にall-or-nothingで合成すれば、Sweepが別のmaterialization／comparison意味論を持たず、BreakpointもSweepの明示的な点列とfailure semanticsを前提に設計できる。
  Date/Author: 2026-08-01 13:01:02Z / Codex

- Decision: `Experiment`を`0.2.0`へ上げ、variant sourceは既存の全resolved `{ id, scenarioRef }` または全Patch-backed `{ id, patchRef }` のどちらか一方とする。Patch modeはexact base Scenarioとexact Patch集合を全件検査・materializeしてからbase、variant宣言順で評価し、既存`Comparison 0.1.0`へ通常Scenario／Result参照を残す。
  Rationale: wire shape変更を`0.1.0`へ黙って追加せず、既存resolved modeを維持できる。混在source、部分materialization、Sweep、Breakpointを除外すると、最大15 variantsと各Patch最大64 operationsの有限境界でPatch provenanceとComparison integrityを一つのExperiment参照から再現できる。
  Date/Author: 2026-08-01 13:01:02Z / Codex

## Outcomes & Retrospective

Critical／expectedマイルストーンは、固定の非負safe-integer tier、非負Critical chanceの隣接tier明示roll、終端Health commit後の解析的期待値を同じRule IRとKernel境界で評価できる基準線になった。ResultとTraceはcontent hashとfingerprintを持ち、Trace再生が最終Damage VectorとHealthを検査する。

Multishotマイルストーンでは、明示された1〜64の固定hit countを安定した子Direct Hitへ展開し、共通の固定Critical tier、Armor、逐次Health commitを適用した後、終端Damage Vectorを集約できるようになった。Resultは共通の一発値と全hit集約値を分離し、Traceは各hitのID、index、count、親子関係、Health遷移を保持する。65以上は部分Artifactを返さずCLI exit 4の実行上限となる。確率的Multishot、hitごとのCritical roll、Multishot expected valueは引き続き非対応である。

Pelletマイルストーンでは、明示された1〜64の固定pellet countを一回の射撃に属する安定した子Direct Hitへ展開し、Multishotと別のRule、capability、Trace identity、Result aggregateとして扱えるようになった。4-pellet Goldenは共通の固定Critical tierとArmorを各pelletへ適用し、Healthを `350→250→150→50→0` と逐次commitする。Multishotとの合成、命中分配、Spread、pellet別roll、pellet expected valueは非対応である。

Radialマイルストーンでは、有限な `[0, 1]` の解決済みfalloff multiplierを持つ単独Radial Hitを、Directと別のevent kind、Rule ID、capability、Result metricで評価できるようになった。Goldenは `base 100 → Critical後 200 → falloff後 150 → Armor後 75 → Health 925` の5 decisionを固定する。距離式、物理配置、Direct sibling、Projectile親、Multishot／Pellet合成、複数target、Radialのroll／expected valueは非対応である。

Statusマイルストーンでは、`status.synthetic-resolved-dot` の最終Health Damage、tick数、間隔を明示する単独actionを、論理時刻つきEvent Queueで評価できるようになった。Goldenは40 Damageを1000ms間隔で3回commitし、Healthを `100→60→20→0` と更新する8 decisionを固定する。64 tick超、time horizon超過、安全でない時刻は部分Artifactなしで拒否する。Status chance／type、付与元、Critical／Armor導出、stack、refresh、snapshot、防御変化、期待値、生成rollは非対応である。

Target Graph契約境界では、Scenario `0.2.0`にKernel外で解決済みのimpact距離／LoSとordered pathを表す有限relation unionを追加した。全既存Goldenは空graphを明示し、既存の単一target Result／Traceを維持する。非空graphは構造化unsupportedとなり、関係を無視した単体計算へ縮退しない。複数target Damage評価、falloff導出、punch-through減衰、chain／ricochet選択は次の実行sliceである。

Resolved punch-throughマイルストーンでは、一つの `pathKind: punch-through` ordered pathを参照する固定Critical Direct Hit actionを実行可能にした。3-target GoldenはA→B→Cの順に既存Direct／Critical／Armor／Health commit Ruleを適用し、Healthを `150→50`、`80→0`、`60→10` へ独立更新する。ResultはDamage合計350、残Health合計60、撃破1とtarget別終端Healthを持ち、Traceの14 decisionはtarget identityを含めて再生できる。壁厚、衝突、貫通減衰、geometry、target選択、impact-distance、chain、ricochet、target別Critical、rollは引き続き非対応である。

Resolved ricochetマイルストーンでは、一つの `pathKind: ricochet` ordered pathとmatching actionを、punch-throughと別Rule、operation、capability、metricで実行可能にした。Goldenはtargets配列A→B→Cに対してrelation順C→A→Bを使い、固定Critical tier 2とtarget別ArmorによりHealthを `100→25`、`250→100`、`80→0` へ更新する。ResultはDamage合計525、残Health合計125、撃破1を持つ。反射角、軌道、衝突、自動target選択、減衰、chain、rollは引き続き非対応である。

Resolved chainマイルストーンでは、一つの `pathKind: chain` ordered pathとmatching actionを、punch-through／ricochetと別Rule、operation、capability、metricで実行可能にした。Goldenはtargets配列B→A→Cに対してrelation順A→C→Bを使い、固定Critical tier 0とtarget別ArmorによりHealthを `120→70`、`90→65`、`60→0` へ更新する。ResultはDamage合計175、残Health合計135、撃破1を持つ。候補探索、分岐、距離、自動target選択、減衰、再訪規則、rollは引き続き非対応である。

Resolved multi-target Radialマイルストーンでは、一つの `impactId` を持つ4件のimpact-distance／LoS relationを宣言順A→C→B→Dで検査し、明示された開始2m、終了8m、最小倍率0.4の合成線形falloffを適用する。Aは距離0で倍率1、Cは距離5で倍率0.7となり、Bは範囲外、Dはresolved LoS falseとしてHealth不変である。Resultは命中2、Damage合計67.5、全target残Health合計242.5、撃破0を持つ。爆心座標、地形、LoS、距離、Catalog／現行ゲームfalloff parameter、Direct sibling、Projectile親、rollは引き続き非対応である。

Resolved Pellet allocationマイルストーンでは、総pellet 4をrelation順A=2、C=0、B=1へ解決済み配分し、残る1をmissとして扱う。子Direct HitはA→A→Bの順に固定Critical tier 0とtarget別Armor／Healthを読み、Aを150→100→50、Cを90のまま、Bを80→0へ更新する。Resultは総数4、命中3、miss 1、Damage合計200、全target残Health合計140、撃破1を持つ。Spread、命中判定、確率分布、pellet別Critical roll、Multishot合成は引き続き非対応である。

Resolved Direct＋Radial impactマイルストーンでは、一つの親impactからDirect childとrelation順のRadial target childrenを生成し、同じtarget別World Stateへ順番にcommitできるようになった。Goldenはtargets配列B→A→C、relation順A→C→Bで、DirectがAを180→130、RadialがAを130→80とCを90→72.5へ更新し、範囲外Bを60に保つ。ResultはDirect 50、Radial 67.5、合計117.5、残Health合計212.5、撃破0を分離し、16 decisionsが共通親と順序を保って再生される。Projectile軌道・衝突、複数attack mode、別Critical tier／roll、Status、Multishot、Pellet合成は引き続き非対応である。

別attack mode Direct＋Radialマイルストーンでは、同じactionとEvent DAGを保ったまま、attackerのprimary modeをDirectへ、明示 `radialAttackModeId` をRadialへ別々にCatalog解決できるようになった。GoldenはDirect base Damage 100、Radial base Damage 80をTraceで読み、Direct 50、Radial 54、合計104、終端Health A=90、C=76、B=60、残Health合計226を16 decisionsで再生する。`radialAttackModeId`を省略した旧Goldenは共有modeとして残る。任意mode合成、別Critical tier／roll、Projectile物理、実ゲーム値は引き続き非対応である。

別固定tier Direct＋Radialマイルストーンでは、既存actionとEvent DAGを保ったまま、Directへ `criticalTier: 1`、Radialへ `radialCriticalTier: 2` をbindできるようになった。GoldenはDirect 100、Radial 162、合計262、終端Health A=80、C=48、B=60、残Health合計188を16 decisionsで再生する。`radialCriticalTier`省略時は既存Goldenの共有tier挙動を保つ。負数、非整数、安全でないtierは構造化拒否となり、roll、Critical chance、roll共有、expected分岐、Projectile物理、現行Warframe値は引き続き非対応である。

共有explicit-roll Direct＋Radialマイルストーンでは、親impactがprimary modeのCritical chance `0.25` と明示roll `0.2`からtier 1を一度だけ解決し、Directと全Radial childrenへ継承できるようになった。GoldenはDirect 100、Radial 135、合計235、終端Health A=100、C=55、B=60、残Health合計215を17 applied decisionsと1 predicate-rejected candidateの計18 decisionsで再生する。DirectとRadialのconstructは共通の親roll eventを持ち、改変Traceはhash一致後もchance／roll／tierの因果整合性を再検査される。別attack mode chance、child-specific roll、生成乱数、expected分岐、Projectile物理、現行Warframe値は引き続き非対応である。

Resolved Beam tickマイルストーンでは、`delivery: beam` の合成attack modeを、明示tick数と間隔で安定した時刻付きchildrenへ展開し、各tickへbase Damage、共通固定Critical tier、resolved Armor、逐次Health commitを適用できるようになった。Goldenは各tickを `20→40→20` と評価して100／200／300msでHealthを `50→30→10→0` へ更新し、Damage合計60を14 decisionsで再生する。64 tick超、time horizon超過、安全でない時刻、非Beam delivery、expected／roll入力は部分Artifactなしで拒否する。held duration、ramp、Fire Rate、Magazine／Ammo／Reload、Chain Beam、tick別roll、Status、現行ゲーム式は引き続き非対応である。

Resolved Experiment comparisonマイルストーンでは、Experiment `0.1.0` とComparison `0.1.0`を追加し、同一Catalog／Rulesetに束縛されたbaseと1〜15件の解決済みvariant Scenarioをbase、次に宣言順で評価できるようになった。checked-in fixtureは入力ファイルを逆順に供給してもDirect base 100、explicit-roll 100、Radial 75を返し、符号付き差 `variant - base` は0、0、-25となる。Comparisonは入力と各ResultのArtifactRef、metric値、差、content hashを持ち、一件でも不整合または評価失敗があれば部分rowを返さない。fast-checkはvariant数、供給順permutation、有限小数と負の0、Scenario集合のmissing／duplicate／extra、任意の失敗位置を生成して順序、非丸め、hash、事前拒否、call prefixを検証する。SDKはrequestを最初のawait前にsnapshotし、accessorを実行せず、秘密をfailureへ漏らさない。操作面はSDKとrepository-local skillに限定し、formal CLIの `describe`／`run`／`trace` は変更していない。JSON Patch、Sweep、Breakpoint、ruleset branch、Monte Carlo、比率、勝者、rankingは非対応である。

Scenario Patchマイルストーンでは、`ScenarioPatch 0.1.0`と`SCN-001`を追加し、完全参照したbase Scenarioのallowlist済み既存non-null scalar leafへ1〜64件の一意なsame-kind変更を宣言順で適用できるようになった。入力は最初のawait前にproperty value getterを実行しないdescriptor snapshotへ取られ、Contract、hash、game build、base完全参照を検査する。portable JavaScriptの構造reflectionがProxy trapを実行して失敗しても、その例外内容は外部failureへ漏らさない。出力は明示された新しい`(id, revision)` pair、baseへの完全な`createdFrom`、再計算したcontent hashを持つ通常のScenarioであり、失敗時に部分Scenarioを返さない。checked-in PatchはCritical tierを1から2へ変更し、materialize-only hashをliteral Scenarioへ照合したうえで、別のSDK評価がHealth Damage 150、残Health 850を返す。`null`、add／remove／test／move／copy、object／array／root、Patch-aware Experiment、Sweep、Breakpoint、Ruleset branchは非対応である。Kernel、runtime-node、formal CLIは変更していない。

## Context and Orientation

リポジトリの規範仕様は `specs/**/*.pkl` だけである。挙動変更はPklから始め、`just spec-gen` で `packages/spec-artifacts/` と `docs/generated/` を生成し、手書き実装を追加してから `just check` を通す。生成先を直接編集してはならない。

`specs/main.pkl` は唯一の仕様入口であり、Clause、Contract、Ruleset、Golden Scenarioを列挙する。Clauseとは、実装が満たすべき検証可能な主張である。Rule IRとは、Pklから生成される有限種類のRuleデータで、`packages/rules/` が検証・実行する。

`packages/kernel/src/scenario-domain.ts` は汎用Scenario Contractを現在の実装可能なdomainへ狭め、非対応メカニクスを明示的に拒否する。`packages/kernel/src/evaluate.ts` はCatalogとRulesetを検証し、Event Queueを処理してResultとTraceを生成する。`packages/kernel/src/trace-replay.ts` はTraceだけから最終Damage VectorとHealthを再構成する。

`packages/sdk/src/index.ts` はApplication向けFacadeであり、CLIや将来のLabがKernelパッケージを組み直さないための境界である。`packages/runtime-node/src/application.ts` はfilesystem、stdin、JSON失敗を扱う。`apps/cli/` は `describe`、`run`、`trace` だけを公開し、意味論を実装しない。

`data/fixtures/catalog-mini/` と `data/fixtures/golden/` は合成CatalogとGolden Scenarioを持つ。Golden Scenarioとは、入力と期待出力を固定して回帰を検出する小さな実行例である。`.agents/skills/voidtrace/` は同じSDK境界を使う仮操作面であり、別の計算式を持たない。

## Plan of Work

最初に現在のCritical／expected差分と本ExecPlanを一つの検証済みコミットとして保存する。次にMultishotの意味をPklで固定する。最初のMultishotは合成Scenarioの解決済み入力とし、物理的な弾道、命中率、ランダム生成を扱わない。一回のactionが、安定した順序とIDを持つ複数のDirect Hit子イベントへ展開されることをClauseで要求する。

Contractを拡張する必要がある場合は `specs/contracts/` を先に変更する。ただし、将来の全銃器モデルを先取りせず、現在の垂直スライスを表せる最小の入力だけを追加する。Rule IRへ新しい操作が必要なら `specs/contracts/ruleset.pkl` と `specs/rules/model.pkl` で有限操作として宣言し、生成後に `packages/rules/` へ独立executorとoracleを追加する。

Kernelでは、actionをMultishot数だけDirect Hitイベントへ展開し、各イベントを既存のCritical、Armor、Health commitパイプラインへ通す。前の弾で減ったHealthを次の弾が読み、Healthは0未満にならない。各子イベントは安定したID、順序、親actionをTraceへ残す。Resultの集約値は各弾の終端結果から作り、Trace replayも同じ最終状態を再構成する。

Resolved Pellet allocationでは、Pklにtarget別解決済み命中数relation、action、展開／集約Rule、capability、Goldenを追加する。Kernelはrelation順、次にrelation内index順で既存Direct Hit pipelineを実行し、総pellet数との差をmissとして集約する。0-hit targetも初期HealthのままResultとTrace replayへ残し、合計hit数が総pellet数を超える入力は実行前に拒否する。

Resolved Direct＋Radial impactでは、同じimpact IDを参照する一つのDirect targetと全target分のimpact-distance relationを入力とする。Kernelは親impact展開イベントの下でDirect Hitを先に評価し、その終端World StateをRadial siblingへ渡す。Radialはrelation順と既存の合成線形falloffを使い、Direct target自身も範囲内なら更新後Healthへ追加Damageをcommitする。最後にDirect、Radial、全target終端Healthを専用Ruleで集約する。

Resolved Beam ticksでは、`action.resolved-beam-ticks` を明示されたtick数と間隔で安定IDを持つ `damage.beam-tick` childrenへscheduleする。各childは合成Beam attack modeのbase Damage、共通固定Critical tier、resolved Armor、直前tickの残Healthを読む。最後tickは `timeLimitMs` 以下とし、最終時刻にBeam Damageと残Healthを専用Ruleで集約する。

最後にGolden Scenario、Rule oracle、Kernel property test、Runtime/CLI E2E、skillの操作例を更新する。生成物freshnessとNode 24/26の全ゲートを通した後、本ExecPlanのProgress、発見、結果を更新してコミットする。

## Concrete Steps

作業ディレクトリは `/Users/annenpolka/ghq/github.com/annenpolka/voidtrace` とする。

現在のマイルストーンを検証する。

    just check
    mise x node@24 -- just check
    .agents/skills/voidtrace/scripts/smoke.sh
    node .agents/skills/voidtrace/scripts/evaluate-slice.ts --expected --check-golden

期待結果は、両Node版で24 generated filesがfresh、21 test filesと231 testsがpassし、両skill確認が `passed: true` を返すことである。

Multishotの仕様を変更したら生成する。

    just spec-gen
    just spec-check

期待結果は、Pkl evaluationが成功し、生成先と再生成結果に差分がないことである。

手書き実装後は全体を検証する。

    just check
    mise x node@24 -- just check

CLIで新しいGolden Scenarioを実行する。

    pnpm exec vt run data/fixtures/golden/multishot-critical-armor.scenario.json \
      --catalog data/fixtures/catalog-mini/catalog.json
    pnpm exec vt trace data/fixtures/golden/multishot-critical-armor.scenario.json \
      --catalog data/fixtures/catalog-mini/catalog.json

Beamマイルストーンでは次も実行する。

    pnpm exec vt run data/fixtures/golden/resolved-beam-ticks.scenario.json \
      --catalog data/fixtures/catalog-mini/catalog-beam.json
    pnpm exec vt trace data/fixtures/golden/resolved-beam-ticks.scenario.json \
      --catalog data/fixtures/catalog-mini/catalog-beam.json

期待する観察結果は、複数のDirect Hitが順番にHealthへcommitされ、Traceに安定した子イベントIDと親子関係があり、Resultの最終HealthとTrace replayが一致することである。

## Validation and Acceptance

Critical／expected基準線は、Node 24とNode 26の `just check` が成功し、固定tierと期待値のskill goldenが一致することで受け入れる。

Multishotマイルストーンは、同じScenario、Catalog、Ruleset、seedを二度評価するとResultとTraceがbyte-equivalentなcanonical JSONになることを要求する。Multishot数が2のScenarioでは、Direct HitからHealth commitまでのRule系列が2回現れ、2発目のHealth commitが1発目の残Healthを読む。初期Healthより合計Damageが大きい場合もHealthは0で止まる。

Multishot数が0、負数、非整数、安全に表現できない整数、現在未対応の確率的Multishot入力は、部分的なResultやTraceを返さずContractまたはdomainの構造化エラーになる。既存の単発Golden Scenarioのcontent hash、期待値、CLIのstdout/stderr規律も意図したVersion変更以外では退行しない。

Resolved Pellet allocationは、target配列順と異なるrelation順、同じtargetへの複数hit、0-hit target、一つ以上のmissを含むGoldenで受け入れる。Resultは総pellet数、hit数、miss数、Pellet Damage総和、全targetの終端Healthを持ち、Trace replayが同じDamage Vectorとtarget別Healthを復元する。hit数合計超過、65 pellet以上、重複target、allocation ID不一致、確率分布、Spread、pellet別Critical rollは部分Artifactなしで拒否する。

Resolved Direct＋Radial impactは、targets配列順と異なるrelation順、Direct targetがRadialにも命中するGoldenで受け入れる。TraceではDirectとRadial target eventsが同じ親impact eventをたどれ、DirectのHealth commit後にRadialが同一targetの更新済みHealthを読む。ResultはDirect Damage、Radial Damage、合計Damage、Radial命中数、全target終端Healthを区別する。Direct target不明、impact ID不一致、重複relation、別Critical tier／roll、Projectile軌道、複数attack modeは部分Artifactなしで拒否する。

別attack mode Direct＋Radial impactは、attackerの `attackModeId` をDirectへ、actionの `radialAttackModeId` をRadialへ解決する合成Goldenで受け入れる。Direct decisionはDirect modeのbase Damage、Radial decisionはRadial modeのbase Damageを読み、既存の親子順序と同一target Health連鎖を保つ。未知のRadial mode、別weaponに属するmode、非hitscan delivery、別Critical tier／roll、roll共有規則、Projectile物理は部分Artifactなしで拒否する。`radialAttackModeId` を省略した既存Goldenは共有mode挙動のまま回帰試験に残す。

別固定tier Direct＋Radial impactは、`criticalTier: 1`をDirectへ、`radialCriticalTier: 2`をRadialへbindする合成Goldenで受け入れる。TraceはDirectの `event.critical-tier` 1とRadial二件の2を区別し、Direct Damage 100、Radial Damage 162、合計262、終端Health A=80／C=48／B=60、残Health合計188を再生する。負数、非整数、安全でないtierは部分Artifactなしで拒否する。`radialCriticalTier`を省略した共有mode／別mode既存Goldenは共有tier挙動のまま残す。roll、Critical chance、roll共有規則、expected分岐、Projectile物理は扱わない。

共有explicit-roll Direct＋Radial impactは、`criticalRoll: 0.2`を親impactで一度だけ解決し、primary modeのCritical chance `0.25`から得たtier 1をDirectと全Radial childrenへ継承する合成Goldenで受け入れる。Traceは一つの親roll decisionと各childのtier 1読取を区別し、Direct Damage 100、Radial Damage 135、合計235、終端Health A=100／C=55／B=60、残Health合計215を17 applied decisionsと1 predicate-rejected candidateの計18 decisionsで再生する。`criticalTier`との併記、範囲外roll、別Radial mode、別Radial tier、子別roll、生成乱数、expected分岐は部分Artifactなしで拒否する。固定tierの既存Goldenは回帰試験に残す。

Resolved Beam ticksは、base Damage 20、Critical tier 1、Armor 300、Health 50、tick数3、間隔100msの合成Goldenで受け入れる。Traceはscheduleの後、100／200／300msで各tickのBeam construct、Critical、Armor、Health commitを順に記録し、Health `50→30→10→0`、Beam Damage合計60、14 decisionsを再生する。tick数0／65以上、非整数、間隔0以下、safe integer overflow、time horizon超過は部分Artifactなしで拒否する。held durationからの導出、ramp、Fire Rate、Magazine／Ammo／Reload、Chain Beam、tick別roll、Status、expected値、生成乱数、現行WarframeのBeam式は扱わない。

## Idempotence and Recovery

`just spec-gen`、`just spec-check`、`just check`、skillのgolden確認は繰り返し実行してよい。生成途中で失敗した場合も、Pkl正本を修正して `just spec-gen` を再実行すれば生成先全体が再構築される。

コミット前には `git status --short` と `git diff --check` で対象を確認する。既存コミットを書き換えず、各マイルストーンを新しいコミットとして追加する。失敗した試作を捨てる必要がある場合も、ユーザーの既存変更を含む作業ツリー全体へresetやcheckoutを行わず、対象ファイルだけを明示的なpatchで戻す。

## Artifacts and Notes

Critical／expected基準線の検証記録は次のとおりである。

    Node.js 26.0.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 231 passed

    Node.js 24.18.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 231 passed

    golden.direct-critical-armor passed: true
    golden.expected-critical-armor passed: true

Multishotマイルストーンの検証記録は次のとおりである。

    Node.js 26.0.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 251 passed

    Node.js 24.18.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 251 passed

    mechanics.fixed-multishot: supported
    golden.direct-critical-armor passed: true
    golden.expected-critical-armor passed: true
    multishot decisions: 14

Pelletマイルストーンの検証記録は次のとおりである。

    Node.js 26.0.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 268 passed

    Node.js 24.18.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 268 passed

    mechanics.fixed-pellets: supported
    pellet count: 4
    pellet decisions: 18
    final Health: 0

Radialマイルストーンの検証記録は次のとおりである。

    Node.js 26.0.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 280 passed

    Node.js 24.18.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 280 passed

    mechanics.resolved-radial: supported
    radial decisions: 5
    base / post-critical / post-falloff / post-armor: 100 / 200 / 150 / 75

Statusマイルストーンの検証記録は次のとおりである。

    Node.js 26.0.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 297 passed

    Node.js 24.18.0
    Specification is valid, 24 generated files are fresh.
    Test Files 21 passed
    Tests 297 passed

    mechanics.resolved-status-ticks: supported
    status ticks / interval / damage per tick: 3 / 1000 / 40
    status event times: 0 / 1000 / 1000 / 2000 / 2000 / 3000 / 3000 / 3000
    final Health: 0
    empirical skill evaluation: supported 100%, unsupported 100%, retry 0, fill-in 0

Target Graph契約境界の検証記録は次のとおりである。

    Scenario Contract 0.2.0
    Clauses / Contracts: 33 / 8
    Node.js 26.0.0: 21 files, 299 tests passed
    Node.js 24.18.0: 21 files, 299 tests passed
    non-empty relation result: unsupported-target-graph
    partial Result / Trace: absent
    final Health: 925

Resolved punch-throughマイルストーンの検証記録は次のとおりである。

    Ruleset / Result Contract: 0.9.0 / 0.2.0
    Clauses / Contracts / generated files: 35 / 8 / 24
    Node.js 26.0.0: 21 files, 311 tests passed
    Node.js 24.18.0: 21 files, 311 tests passed
    target order: actor.target-a / actor.target-b / actor.target-c
    target Health: 50 / 0 / 10
    aggregate Damage / remaining Health / defeated: 350 / 60 / 1
    Trace decisions: 14
    empirical skill evaluation: supported 100%, unsupported 100%, hold-out accepted, retry 0

Resolved ricochetマイルストーンの検証記録は次のとおりである。

    Ruleset / Result Contract: 0.10.0 / 0.2.0
    Clauses / Contracts / generated files: 37 / 8 / 24
    Node.js 26.0.0: 21 files, 320 tests passed
    Node.js 24.18.0: 21 files, 320 tests passed
    targets array / target path: A-B-C / C-A-B
    path target Health: 25 / 100 / 0
    aggregate Damage / remaining Health / defeated: 525 / 125 / 1
    Trace decisions: 14
    empirical skill evaluation: supported 100%, unsupported 100%, hold-out accepted, retry 0

Resolved chainマイルストーンの検証記録は次のとおりである。

    Ruleset / Result Contract: 0.11.0 / 0.2.0
    Clauses / Contracts / generated files: 39 / 8 / 24
    Node.js 26.0.0: 21 files, 329 tests passed
    Node.js 24.18.0: 21 files, 329 tests passed
    targets array / target path: B-A-C / A-C-B
    path target Health: 70 / 65 / 0
    aggregate Damage / remaining Health / defeated: 175 / 135 / 1
    Trace decisions: 14
    empirical skill evaluation: iterations 2/3 supported 100%, unsupported 100%, hold-out accepted, unclear points 0

Resolved multi-target Radialマイルストーンの検証記録は次のとおりである。

    Ruleset / Result Contract: 0.12.0 / 0.2.0
    Clauses / Contracts / generated files: 41 / 8 / 24
    Node.js 26.0.0: 21 files, 339 tests passed
    Node.js 24.18.0: 21 files, 339 tests passed
    targets array / relation order / hit order: B-D-A-C / A-C-B-D / A-C
    target Health: A=70 / C=72.5 / B=60 / D=40
    hit count / aggregate Damage / remaining Health / defeated: 2 / 67.5 / 242.5 / 0
    Trace decisions: 12
    empirical skill evaluation: iterations 1/2 supported 100%, unsupported 100%, hold-out accepted, unclear points 0

Resolved Pellet allocationマイルストーンの検証記録は次のとおりである。

    Scenario / Ruleset / Result Contract: 0.3.0 / 0.13.0 / 0.2.0
    Clauses / Contracts / generated files: 43 / 8 / 24
    Node.js 26.0.0: 21 files, 346 tests passed
    Node.js 24.18.0: 21 files, 346 tests passed
    targets array / relation allocation / emitted hits: B-A-C / A2-C0-B1 / A-A-B
    pellet total / hit / miss: 4 / 3 / 1
    target Health: A=50 / C=90 / B=0
    aggregate Damage / remaining Health / defeated: 200 / 140 / 1
    Trace decisions: 14
    empirical skill evaluation: iterations 1/2 supported 100%, unsupported 100%, hold-out accepted, unclear points 0

Resolved Direct＋Radial impactマイルストーンの検証記録は次のとおりである。

    Scenario / Ruleset / Result Contract: 0.3.0 / 0.14.0 / 0.2.0
    Clauses / Contracts / generated files: 45 / 8 / 24
    Node.js 26.0.0: 21 files, 353 tests passed
    Node.js 24.18.0: 21 files, 353 tests passed
    targets array / relation order / event order: B-A-C / A-C-B / Direct A-Radial A-Radial C
    Direct / Radial / total Damage: 50 / 67.5 / 117.5
    target Health: A=80 / C=72.5 / B=60
    remaining Health / defeated: 212.5 / 0
    Trace decisions: 16
    empirical skill evaluation: final supported 5/5, unsupported 5/5, hold-out 5/5, unclear points 0

公開済みremote基準線は `e4cee8b feat: add binary critical roll resolution` である。Ruleset `0.4.0` revision `1` と解析的期待値を含むローカル基準線は `2639b6a feat: generalize critical and add analytic expected values` としてコミット済みである。

Ruleset `0.5.0` revision `1` と解決済み固定count Multishotを含むローカル基準線は `92019a6 feat: add fixed multishot vertical slice` としてコミット済みである。

Ruleset `0.6.0` revision `1` と解決済み固定count Pelletを含むローカル基準線は `0b43a63 feat: add fixed pellet vertical slice` としてコミット済みである。

Ruleset `0.7.0` revision `1` と単独解決済みRadial falloffを含むローカル基準線は `1e7a3ea feat: add resolved radial vertical slice` としてコミット済みである。

Ruleset `0.9.0` revision `1`、Result Contract `0.2.0`、resolved punch-through target pathを含むローカル基準線は `bd0b659 feat: add resolved punch-through target path` としてコミット済みである。

Ruleset `0.10.0` revision `1` とresolved ricochet target pathを含むローカル基準線は `27aaefd feat: add resolved ricochet target path` としてコミット済みである。

Ruleset `0.11.0` revision `1` とresolved chain target pathを含むローカル基準線は `abde40d feat: add resolved chain target path` としてコミット済みである。

Ruleset `0.12.0` revision `1` とresolved multi-target Radialを含むローカル基準線は `f96fdb9 feat: add resolved multi-target radial` としてコミット済みである。

Scenario Contract `0.3.0`、Ruleset `0.13.0` revision `1` とresolved Pellet allocationを含むローカル基準線は `274d33f feat: add resolved pellet allocation` としてコミット済みである。

Scenario Contract `0.3.0`、Ruleset `0.14.0` revision `1` とresolved Direct＋Radial impactを含むローカル基準線は `6857390 feat: add resolved direct radial impact` としてコミット済みである。

Scenario Contract `0.3.0`、Ruleset `0.15.0` revision `1` と別Catalog attack modeのresolved Direct＋Radial impactを含むローカル基準線は `26e5712 feat: resolve distinct direct radial modes`、capability分類修正は `bca8414 fix: classify distinct impact capability` としてコミット済みである。

別固定tier Direct＋Radial impactマイルストーンの検証記録は次のとおりである。

    Scenario / Ruleset / Result Contract: 0.3.0 / 0.16.0 / 0.2.0
    Clauses / Contracts / generated files: 49 / 8 / 24
    Node.js 26.0.0: 21 files, 368 tests passed
    Node.js 24.18.0: 21 files, 368 tests passed
    event order: Direct A-Radial A-Radial C
    Direct tier / Radial tier: 1 / 2
    Direct / Radial / total Damage: 100 / 162 / 262
    target Health: A=80 / C=48 / B=60
    remaining Health / defeated: 188 / 0
    Trace decisions: 16
    invalid radial tier: unsupported-critical-tier at /actionPlan/0/parameters/radialCriticalTier
    empirical skill evaluation: two qualitative clears at 5/5 plus hold-out 5/5, unclear points 0
    empirical tool-use: supported 3 then 8; quantitative convergence not claimed

Scenario Contract `0.3.0`、Ruleset `0.16.0` revision `1` と別固定Critical tierのresolved Direct＋Radial impactを含むローカル基準線は `9c0ed5c feat: resolve distinct direct radial tiers` としてコミット済みである。

共有explicit-roll Direct＋Radial impactマイルストーンの検証記録は次のとおりである。

    Scenario / Ruleset / Result Contract: 0.3.0 / 0.17.0 / 0.2.0
    Clauses / Contracts / generated files: 51 / 8 / 24
    Node.js 26.0.0: 21 files, 382 tests passed
    Node.js 24.18.0: 21 files, 382 tests passed
    event order: parent expand-parent shared roll-Direct A-Radial A-Radial C-aggregate
    Critical chance / explicit roll / resolved tier: 0.25 / 0.2 / 1
    Direct / Radial / total Damage: 100 / 135 / 235
    target Health: A=100 / C=55 / B=60
    remaining Health / defeated: 215 / 0
    Trace decisions: 17
    invalid combinations: tier plus roll, roll plus radial mode or tier, null, roll outside [0, 1)
    empirical skill evaluation: supported and unsupported critical checklists cleared twice; rehashed semantic-tamper hold-out rejected
    empirical tool-use: supported 9 then 9; unsupported 4 then 7; hold-out 10; overall quantitative convergence not claimed
    empirical note: unsupported iteration 2 recorded one non-blocking interpretation of decimal roll wording, then correctly stopped without a question or substitution

Scenario Contract `0.3.0`、Ruleset `0.17.0` revision `1` と共有explicit Critical rollのresolved Direct＋Radial impactを含むローカル基準線は `d85fb9b feat: share direct radial critical roll` としてコミット済みである。

Resolved Beam tickマイルストーンのローカル検証記録は次のとおりである。

    Scenario / Ruleset / Result Contract: 0.3.0 / 0.18.0 / 0.2.0
    Clauses / Contracts / generated files: 53 / 8 / 24
    Node.js 26.0.0: 21 files, 411 tests passed
    Node.js 24.18.0: 21 files, 411 tests passed
    Beam ticks / interval: 3 / 100ms
    per-tick base / post-Critical / post-Armor Damage: 20 / 40 / 20
    Beam total Damage / remaining Health: 60 / 0
    Health sequence: 50 -> 30 -> 10 -> 0
    Trace decisions: 14
    invalid inputs: zero/non-integer/65 ticks, zero/non-integer/overflow interval, time horizon, expected/roll, non-Beam delivery
    unsupported: held duration, ramp, Fire Rate, resource behavior, Chain Beam, per-tick rolls, Status, expected values, current-game formulas
    empirical Iteration 0: frontmatter description and body scope aligned
    empirical supported Iteration 1 / 2: 7/7 / 7/7, unclear 0 / 0, retries 0 / 0
    empirical unsupported Iteration 1 / 2: 6/6 / 6/6, unclear 0 / 0, retries 0 / 0
    empirical wrong-Catalog hold-out: 6/6, catalog-reference-mismatch exit 2, no mutation or substitution
    empirical usage metadata: Agent tool_uses / duration_ms unavailable; quantitative convergence not claimed
    public GitHub Check: run 30687704748 for 9ed37ef succeeded in 1m16s

Scenario Contract `0.3.0`、Ruleset `0.18.0` revision `1` とresolved synthetic Beam ticksを含むローカル基準線は `ce1fff9 feat: add resolved beam tick vertical slice` としてコミット済みである。

Experimentマイルストーンの受け入れ結果は次のとおりである。

    Experiment / Comparison: 0.1.0 / 0.1.0
    Ruleset / Scenario / Result: 0.18.0 / 0.3.0 / 0.2.0
    Clauses / Contracts / generated files: 55 / 10 / 26
    Node 26.0.0: 23 test files / 444 tests
    Node 24.18.0: 23 test files / 444 tests
    checked-in comparison members: base + 2 variants
    primary metric values: 100 / 100 / 75
    signed deltas: 0 / 0 / -25
    execution order: base, then Experiment declaration order despite reverse supplied order
    property coverage: 1-15 variants, permutations, fractions, negative zero, set mismatches, arbitrary failure positions
    SDK boundary: pre-await snapshot, no accessor execution, no accessor-secret leakage
    unsupported: Patch, Sweep, Breakpoint, ruleset branch, Monte Carlo, ratio, winner, ranking
    empirical targeted final: 2/2 at 100%, retries 0, target-instruction unclear 0
    empirical usage metadata: tool uses and duration unavailable; quantitative convergence not claimed
    implementation commits: 88a846f, 69e881a, e3192a3, 9965e5b
    public GitHub Check: run 30691057997 for acf1616 succeeded in 1m11s
    formal CLI: unchanged

`TRC-002`マイルストーンのローカル受け入れ結果は次のとおりである。

    Kernel Engine / Ruleset: 0.19.0 / 0.18.0 revision 1
    coverage: 55 active / 0 planned Clauses; kernel.foundation supported
    candidate scope: critical.roll only; impact shared-roll then Direct explicit-roll in Ruleset declaration order
    Direct explicit-roll Trace: 5 applied + 1 predicate-rejected = 6 decisions
    shared-impact explicit-roll Trace: 17 applied + 1 predicate-rejected = 18 decisions
    rejection reason: predicate.event-kind-mismatch with exact actual / expected event-kind reads
    non-effects: no mechanic-context read, operation execution, World State mutation, or metric change
    adversarial coverage: Rule-property Proxy, exact rejection reads/reason, deterministic property, Trace hash and Result traceRef binding
    Node 26.0.0: 24 test files / 453 tests
    Node 24.18.0: 24 test files / 453 tests
    empirical baseline / targeted rerun: 4/4 at 100%, retries 0; quantitative convergence not claimed
    unsupported: guard rejection, operation rejection, all-phase candidate audit, Scenario Patch, Sweep, Breakpoint
    formal CLI: unchanged (`describe` / `run` / `trace`)
    implementation commit: 80571a0
    documentation commit: d8ae3cc
    public GitHub Check: run 30692501313 for d8ae3cc succeeded in 1m10s

Scenario Patchマイルストーンのローカル受け入れ結果は次のとおりである。

    ScenarioPatch / Scenario: 0.1.0 / 0.3.0
    Kernel Engine / Ruleset: unchanged at 0.19.0 / 0.18.0 revision 1
    Clauses / Contracts / generated files: 56 active / 11 / 27
    operation boundary: 1-64 unique ordered replace-only same-kind non-null existing scalar paths
    integrity: exact Patch/base Contract and hash, exact base ref/game build, new verified Scenario hash
    provenance: declared distinct (id, revision) pair and exact base createdFrom
    checked-in change: /actionPlan/0/parameters/criticalTier from 1 to 2
    materialized Scenario hash: sha256:d05c1ee15020a5e443c6c701e40a76a5a136de6fd11158d0562d20fd1ceaa973
    optional SDK evaluation: tier 2, Health Damage 150, remaining Health 850
    stale-base behavior: base-scenario-reference-mismatch with no partial Scenario
    adversarial coverage: accessors, structural Proxy traps, hidden properties, sparse arrays, prototype-named keys, escaped pointers
    Node 26.0.0: 26 test files / 480 tests
    Node 24.18.0: 26 test files / 480 tests
    empirical Iteration 1 / 2: 15/15 / 15/15, unclear 0; holdout 5/5
    quantitative empirical convergence: not claimed because metadata was not uniformly available
    unsupported: null, add/remove/test/move/copy, root/object/array, Patch-aware Experiment, Sweep, Breakpoint, ruleset branch
    formal CLI: unchanged (`describe` / `run` / `trace`)
    implementation commit: 09ce13a
    review and documentation commit: 69803b9
    public GitHub Check: run 30694606897 for 69803b9 succeeded in 1m23s

Patch-backed Experimentマイルストーンのローカル受け入れ結果は次のとおりである。

    Experiment / Comparison: 0.2.0 / 0.1.0
    ScenarioPatch / Scenario: 0.1.0 / 0.3.0
    Kernel Engine / Ruleset: unchanged at 0.19.0 / 0.18.0 revision 1
    Clauses / Contracts / generated files: 57 active / 11 / 27
    source modes: homogeneous resolved Scenario refs or homogeneous ScenarioPatch refs
    patch boundary: exact base plus 1-15 exact Patches; supplied order is not declaration order
    atomicity: every Patch validates and materializes before the first Scenario evaluation
    evaluation order: base, then materialized variants in Experiment declaration order
    derived integrity: Contract, content hash, result identity, createdFrom, Catalog, Ruleset, game build, metric, non-Monte Carlo
    checked-in comparison: base 100 / tier-2 variant 150 / signed delta +50
    fixture Experiment hash: sha256:8a9043b2971c277c750927d17b70c232dae5d9fad457e5dce95b1c0dc9c71a3d
    property/adversarial coverage: 1-15 variants, permutations, exact sets/refs, duplicate identities, late materializer failure, arbitrary evaluator failure, mutation/accessor/Proxy containment
    SDK boundary: caller graph snapshotted before Ruleset-load await
    Node 26.0.0: 28 test files / 504 tests
    Node 24.18.0: 28 test files / 504 tests
    empirical Iteration 1 / 2: supported 6/6 and unsupported 6/6 in both rounds, new unclear points 0
    empirical standalone-materialization holdout: 6/6, no comparison-helper substitution
    empirical usage metadata: tool uses and duration unavailable; quantitative convergence not claimed
    independent review: no actionable findings
    residual risks: pre-count descriptor snapshot has no byte/depth budget; oracle pattern-to-test linkage remains a reviewed whitelist
    unsupported: mixed source modes, Patch chains, Sweep, Breakpoint, ruleset branches, Monte Carlo, ratio, winner, ranking, tie, interpolation, concurrency
    formal CLI: unchanged (`describe` / `run` / `trace`)
    feature commit: a85a038

## Interfaces and Dependencies

既存の公開SDK関数 `evaluateScenario(request: { scenario: unknown; catalog: unknown }): Promise<EvaluationOutcome>` を維持する。CLIと単一Scenario向けskill helperは引き続きこの境界を通る。比較helperは公開SDK関数 `runExperiment` を通り、そのSDKが単一Scenario evaluatorを構成する。Patch helperは公開SDK関数 `materializeScenarioPatch(request: { patch: unknown; scenario: unknown })`だけで通常Scenarioを生成し、評価が明示された場合だけその出力を`evaluateScenario`へ渡す。いずれのhelperもKernelやRulesを直接組み立てない。

MultishotとPellet入力はScenarioの別actionに属する解決済み値として定義し、Catalogの生データや確率的rollを暗黙に読み込まない。Kernelが生成する子イベントはEvent Queueの論理時刻、sequence、stable ID順序に従う。Rule executionは生成Rulesetだけから行い、Kernel、CLI、skillへgrouped-hit計算を重複させない。

新しい外部ライブラリは追加しない。既存のPkl 0.32、Ajv、TypeScript、Vitest、fast-check、Commanderだけを使う。
