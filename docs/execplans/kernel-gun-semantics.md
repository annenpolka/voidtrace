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

## Outcomes & Retrospective

Critical／expectedマイルストーンは、固定の非負safe-integer tier、非負Critical chanceの隣接tier明示roll、終端Health commit後の解析的期待値を同じRule IRとKernel境界で評価できる基準線になった。ResultとTraceはcontent hashとfingerprintを持ち、Trace再生が最終Damage VectorとHealthを検査する。

Multishotマイルストーンでは、明示された1〜64の固定hit countを安定した子Direct Hitへ展開し、共通の固定Critical tier、Armor、逐次Health commitを適用した後、終端Damage Vectorを集約できるようになった。Resultは共通の一発値と全hit集約値を分離し、Traceは各hitのID、index、count、親子関係、Health遷移を保持する。65以上は部分Artifactを返さずCLI exit 4の実行上限となる。確率的Multishot、hitごとのCritical roll、Multishot expected valueは引き続き非対応である。

Pelletマイルストーンでは、明示された1〜64の固定pellet countを一回の射撃に属する安定した子Direct Hitへ展開し、Multishotと別のRule、capability、Trace identity、Result aggregateとして扱えるようになった。4-pellet Goldenは共通の固定Critical tierとArmorを各pelletへ適用し、Healthを `350→250→150→50→0` と逐次commitする。Multishotとの合成、命中分配、Spread、pellet別roll、pellet expected valueは非対応である。

Radialマイルストーンでは、有限な `[0, 1]` の解決済みfalloff multiplierを持つ単独Radial Hitを、Directと別のevent kind、Rule ID、capability、Result metricで評価できるようになった。Goldenは `base 100 → Critical後 200 → falloff後 150 → Armor後 75 → Health 925` の5 decisionを固定する。距離式、物理配置、Direct sibling、Projectile親、Multishot／Pellet合成、複数target、Radialのroll／expected valueは非対応である。

Statusマイルストーンでは、`status.synthetic-resolved-dot` の最終Health Damage、tick数、間隔を明示する単独actionを、論理時刻つきEvent Queueで評価できるようになった。Goldenは40 Damageを1000ms間隔で3回commitし、Healthを `100→60→20→0` と更新する8 decisionを固定する。64 tick超、time horizon超過、安全でない時刻は部分Artifactなしで拒否する。Status chance／type、付与元、Critical／Armor導出、stack、refresh、snapshot、防御変化、期待値、生成rollは非対応である。

Target Graph契約境界では、Scenario `0.2.0`にKernel外で解決済みのimpact距離／LoSとordered pathを表す有限relation unionを追加した。全既存Goldenは空graphを明示し、既存の単一target Result／Traceを維持する。非空graphは構造化unsupportedとなり、関係を無視した単体計算へ縮退しない。複数target Damage評価、falloff導出、punch-through減衰、chain／ricochet選択は次の実行sliceである。

Resolved punch-throughマイルストーンでは、一つの `pathKind: punch-through` ordered pathを参照する固定Critical Direct Hit actionを実行可能にした。3-target GoldenはA→B→Cの順に既存Direct／Critical／Armor／Health commit Ruleを適用し、Healthを `150→50`、`80→0`、`60→10` へ独立更新する。ResultはDamage合計350、残Health合計60、撃破1とtarget別終端Healthを持ち、Traceの14 decisionはtarget identityを含めて再生できる。壁厚、衝突、貫通減衰、geometry、target選択、impact-distance、chain、ricochet、target別Critical、rollは引き続き非対応である。

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

公開済みremote基準線は `e4cee8b feat: add binary critical roll resolution` である。Ruleset `0.4.0` revision `1` と解析的期待値を含むローカル基準線は `2639b6a feat: generalize critical and add analytic expected values` としてコミット済みである。

Ruleset `0.5.0` revision `1` と解決済み固定count Multishotを含むローカル基準線は `92019a6 feat: add fixed multishot vertical slice` としてコミット済みである。

Ruleset `0.6.0` revision `1` と解決済み固定count Pelletを含むローカル基準線は `0b43a63 feat: add fixed pellet vertical slice` としてコミット済みである。

Ruleset `0.7.0` revision `1` と単独解決済みRadial falloffを含むローカル基準線は `1e7a3ea feat: add resolved radial vertical slice` としてコミット済みである。

Ruleset `0.9.0` revision `1`、Result Contract `0.2.0`、resolved punch-through target pathを含むローカル基準線は `bd0b659 feat: add resolved punch-through target path` としてコミット済みである。

## Interfaces and Dependencies

既存の公開SDK関数 `evaluateScenario(request: { scenario: unknown; catalog: unknown }): Promise<EvaluationOutcome>` を維持する。CLIとskillは引き続きこの境界を通り、KernelやRulesを直接組み立てない。

MultishotとPellet入力はScenarioの別actionに属する解決済み値として定義し、Catalogの生データや確率的rollを暗黙に読み込まない。Kernelが生成する子イベントはEvent Queueの論理時刻、sequence、stable ID順序に従う。Rule executionは生成Rulesetだけから行い、Kernel、CLI、skillへgrouped-hit計算を重複させない。

新しい外部ライブラリは追加しない。既存のPkl 0.32、Ajv、TypeScript、Vitest、fast-check、Commanderだけを使う。
