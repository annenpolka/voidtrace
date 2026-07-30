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
- [ ] PelletのPkl Clause、Rule IR、Scenario入力、Golden Scenarioを定義する。（開始: Multishotと合成しない単独Pellet actionの境界を設計）
- [ ] Pelletを既存Direct Hitパイプラインへ流し、Result／Trace／replayを実装する。
- [ ] 独立oracle、境界/propertyテスト、Runtime/CLI E2E、skill操作例を追加して検証・コミットする。

## Surprises & Discoveries

- Observation: 公開済みのCommit 7以降の変更は、Critical tier一般化と解析的期待値が同じ未コミット作業ツリーに重なっていた。
  Evidence: `git status --short` は46件の追跡済み変更と7件の未追跡ファイルを示した。履歴を後から分割するより、全ゲートを通した一つのマイルストーンとして保存するほうが安全である。

- Observation: Scenario ContractはMonte Carloや複数targetを表現できるが、Kernelのdomain parserは現在の垂直スライス外として明示的に拒否する。
  Evidence: `packages/kernel/src/scenario-domain.ts` はMonte Carlo、target数が1以外、action数が1以外を構造化エラーとして返す。

- Observation: `result.aggregate` phaseだけでは単発expected集約とMultishot集約を区別できず、Ruleset順に全Ruleを適用すると異種eventへ誤適用される。
  Evidence: KernelのRule選択をphaseと`eventKind`の両方で絞り、既存expectedと新規Multishotの全回帰テストが同時に通るようにした。

- Observation: Scenario Contractのaction parameterは既に有限scalar mapを許していたため、`hitCount`追加にScenario schema version更新は不要だった。
  Evidence: `action.multishot-direct-hit`と`hitCount`はdomain parserで狭め、Ruleset `0.5.0`側が最大64の実行上限を担う。

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

## Outcomes & Retrospective

Critical／expectedマイルストーンは、固定の非負safe-integer tier、非負Critical chanceの隣接tier明示roll、終端Health commit後の解析的期待値を同じRule IRとKernel境界で評価できる基準線になった。ResultとTraceはcontent hashとfingerprintを持ち、Trace再生が最終Damage VectorとHealthを検査する。

Multishotマイルストーンでは、明示された1〜64の固定hit countを安定した子Direct Hitへ展開し、共通の固定Critical tier、Armor、逐次Health commitを適用した後、終端Damage Vectorを集約できるようになった。Resultは共通の一発値と全hit集約値を分離し、Traceは各hitのID、index、count、親子関係、Health遷移を保持する。65以上は部分Artifactを返さずCLI exit 4の実行上限となる。確率的Multishot、hitごとのCritical roll、Multishot expected valueは引き続き非対応である。

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

公開済みremote基準線は `e4cee8b feat: add binary critical roll resolution` である。Ruleset `0.4.0` revision `1` と解析的期待値を含むローカル基準線は `2639b6a feat: generalize critical and add analytic expected values` としてコミット済みである。

Ruleset `0.5.0` revision `1` と解決済み固定count Multishotを含むローカル基準線は `92019a6 feat: add fixed multishot vertical slice` としてコミット済みである。

## Interfaces and Dependencies

既存の公開SDK関数 `evaluateScenario(request: { scenario: unknown; catalog: unknown }): Promise<EvaluationOutcome>` を維持する。CLIとskillは引き続きこの境界を通り、KernelやRulesを直接組み立てない。

Multishot入力はScenarioのactionに属する解決済み値として定義し、Catalogの生データや確率的rollを暗黙に読み込まない。Kernelが生成する子イベントはEvent Queueの論理時刻、sequence、stable ID順序に従う。Rule executionは生成Rulesetだけから行い、Kernel、CLI、skillへMultishot倍率の式を重複させない。

新しい外部ライブラリは追加しない。既存のPkl 0.32、Ajv、TypeScript、Vitest、fast-check、Commanderだけを使う。
