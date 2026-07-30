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
- [ ] 次のTarget Graph sliceとして、target別の解決済みpellet命中数とmiss数を消費する合成Pellet allocationを実装する。（2026-07-30 11:22:00Z開始。Spread、命中判定、確率分布、pellet別Critical roll、Multishot合成は導出しない）

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

- Observation: LoS falseや範囲外のRadial targetは子Damage eventを持たないため、従来のpath-target replayだけでは全targetの終端Healthを再構成できない。
  Evidence: Radial aggregate operationは命中2体の子eventに加えて非命中2体のzero Damage、初期Health、終端Healthを列挙する。replayはScenarioのtarget別初期Healthをアンカーに非命中のHealth不変を検査し、4体すべての `healthByTarget` を復元する。

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

期待する観察結果は、複数のDirect Hitが順番にHealthへcommitされ、Traceに安定した子イベントIDと親子関係があり、Resultの最終HealthとTrace replayが一致することである。

## Validation and Acceptance

Critical／expected基準線は、Node 24とNode 26の `just check` が成功し、固定tierと期待値のskill goldenが一致することで受け入れる。

Multishotマイルストーンは、同じScenario、Catalog、Ruleset、seedを二度評価するとResultとTraceがbyte-equivalentなcanonical JSONになることを要求する。Multishot数が2のScenarioでは、Direct HitからHealth commitまでのRule系列が2回現れ、2発目のHealth commitが1発目の残Healthを読む。初期Healthより合計Damageが大きい場合もHealthは0で止まる。

Multishot数が0、負数、非整数、安全に表現できない整数、現在未対応の確率的Multishot入力は、部分的なResultやTraceを返さずContractまたはdomainの構造化エラーになる。既存の単発Golden Scenarioのcontent hash、期待値、CLIのstdout/stderr規律も意図したVersion変更以外では退行しない。

Resolved Pellet allocationは、target配列順と異なるrelation順、同じtargetへの複数hit、0-hit target、一つ以上のmissを含むGoldenで受け入れる。Resultは総pellet数、hit数、miss数、Pellet Damage総和、全targetの終端Healthを持ち、Trace replayが同じDamage Vectorとtarget別Healthを復元する。hit数合計超過、65 pellet以上、重複target、allocation ID不一致、確率分布、Spread、pellet別Critical rollは部分Artifactなしで拒否する。

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

公開済みremote基準線は `e4cee8b feat: add binary critical roll resolution` である。Ruleset `0.4.0` revision `1` と解析的期待値を含むローカル基準線は `2639b6a feat: generalize critical and add analytic expected values` としてコミット済みである。

Ruleset `0.5.0` revision `1` と解決済み固定count Multishotを含むローカル基準線は `92019a6 feat: add fixed multishot vertical slice` としてコミット済みである。

Ruleset `0.6.0` revision `1` と解決済み固定count Pelletを含むローカル基準線は `0b43a63 feat: add fixed pellet vertical slice` としてコミット済みである。

Ruleset `0.7.0` revision `1` と単独解決済みRadial falloffを含むローカル基準線は `1e7a3ea feat: add resolved radial vertical slice` としてコミット済みである。

Ruleset `0.9.0` revision `1`、Result Contract `0.2.0`、resolved punch-through target pathを含むローカル基準線は `bd0b659 feat: add resolved punch-through target path` としてコミット済みである。

Ruleset `0.10.0` revision `1` とresolved ricochet target pathを含むローカル基準線は `27aaefd feat: add resolved ricochet target path` としてコミット済みである。

Ruleset `0.11.0` revision `1` とresolved chain target pathを含むローカル基準線は `abde40d feat: add resolved chain target path` としてコミット済みである。

Ruleset `0.12.0` revision `1` とresolved multi-target Radialを含むローカル基準線は `f96fdb9 feat: add resolved multi-target radial` としてコミット済みである。

## Interfaces and Dependencies

既存の公開SDK関数 `evaluateScenario(request: { scenario: unknown; catalog: unknown }): Promise<EvaluationOutcome>` を維持する。CLIとskillは引き続きこの境界を通り、KernelやRulesを直接組み立てない。

MultishotとPellet入力はScenarioの別actionに属する解決済み値として定義し、Catalogの生データや確率的rollを暗黙に読み込まない。Kernelが生成する子イベントはEvent Queueの論理時刻、sequence、stable ID順序に従う。Rule executionは生成Rulesetだけから行い、Kernel、CLI、skillへgrouped-hit計算を重複させない。

新しい外部ライブラリは追加しない。既存のPkl 0.32、Ajv、TypeScript、Vitest、fast-check、Commanderだけを使う。
