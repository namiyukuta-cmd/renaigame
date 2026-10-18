# 章JSON取り込みと1スロット1ファイル保存

機械処理の項目・標準version・ファイル名の定義元は`js/renaigame_policy.js`。自動生成の[AI_POLICY_REFERENCE.md](AI_POLICY_REFERENCE.md)と照合する。作成・形式検査・AI引き継ぎは同じ定義を使う。この文書は運用上の意味と互換手順を説明し、項目を独自に再定義しない。

## AIが出力する形式の決定規則

**保存JSONの運用仕様はこの文書。機械処理の項目は`js/renaigame_policy.js`から取得し、標準はversion 2の1章取り込みJSONだけです。** AI向け入口・運用文書・「AIに渡す」の文章が形式について食い違う場合も、正本の定義とこの運用へ統一します。ユーザー自身の今回の明示指示は優先します。

| 入力・用途 | 適用する形式 |
|---|---|
| 「保存して」「記録と情報更新」「保存JSONを出して」 | 標準version 2の1章取り込みJSONを出力。ゲームで貼り付け／ファイル選択してGitHubへ保存 |
| 「GitHubに直接保存」と明示 | AIの書込みが許可される場合のみ試行。遮断されたら未保存と伝え、version 2の章JSONを渡す。書込み制限の回避はしない |
| 「完全に保存」「心理パケット全項目を保持」、旧文書の「全文保持」「全項目を展開」 | 保存方法と無関係。version 1への切替理由にしない。章ファイルは標準version 2 |
| ユーザー自身が今回の出力ファイルを「version 1で」と明示 | 下記の旧形式の出力例外。互換対応を標準の選択肢として提案しない |
| 恋愛相手未選択の本文下書き | 下記の専用規定。心理計算済みの章と混同しない |

**取り込み用の章JSONと、GitHub上の完全な正本セーブは役割が違います。** version 2は心理情報を捨てる指示ではありません。確定済みパケットをAI側で保持し、取り込み時に正本から同じ結果を再計算・指紋検証して、完全な心理履歴を正本へ保存します。パケット内部の`version: 1`も、章JSONをversion 1にする理由にはなりません。

ファイル名は必ず`<saveId>_<characterId>_<4桁chapter>.json`。標準を「軽量版」と呼び分けず、`_light`・`_full`等の派生ファイルを独断で作りません。訂正時も同じ標準形式・標準ファイル名で、既に確定した本文・数値・指紋・検証結果を保持します。ファイル出力だけでGitHub保存済みと報告しません。

## AIの書込みが遮断されても保存できる経路

AIのGitHub書込みは安全性判定等によって失敗し得るため、標準は**version 2の1章JSON出力→ゲームで貼り付け／ファイル選択→ゲーム自身のJS再計算とGitHub保存**とする。ユーザーによる明示的な直接保存の依頼がある場合だけAIが書込みを試みるが、遮断された場合は無理に再試行しない。標準version 2の内容・心理指紋・検証記録はそのまま保ち、保存経路だけ変える。ブラウザーで保存完了が確認されるまでGitHub保存済みとは報告しない。

## 正本セーブ

正本は private-game-data の `renaigame/simulation/saves/<saveId>.json`。**1スロット＝1つの完全JSON**。本文・心理履歴・プロフィールを含む。別スロットや別キャラの内容は混ぜない。旧分割chapter-files-v1は読み込み時に復元する。

- `state.session.recordsByCharacter[characterId]`：各章の主人公原文と相手本文を1度だけ保持する。
- `state.session.statesByCharacter[characterId].currentState`：最新の心理状態（高速取得用）。
- `state.session.statesByCharacter[characterId].stateHistory`：各Turnの計算結果・検証結果を1組だけ保持する。**新しく保存する履歴には二重の`packet`と`protagonistInput`を格納しない。**
- `state.profile`：主人公プロフィール。
- `chapterImportMetadataByCharacter[characterId][chapter]`：`replayContext.recordIndices`、`recordsFingerprint`、`storyActions`など。過去ログ全文をここに複製しない。

## 新規の章取り込みJSON：標準version 2

AIは`runTurn`→`verifyTurn`→`validateStory`を実行・確認した後、**今回1章分のみ**を次の構造で出力する。ファイル名：`<saveId>_<characterId>_<4桁chapter>.json`。

```json
{
  "version": 2,
  "saveId": "run_example",
  "characterId": "char_007",
  "chapter": 2,
  "records": [
    {
      "index": 1,
      "entry": {
        "scene": "Chapter 2",
        "date": "2026年10月14日（水）",
        "protagonist": "今回の主人公入力全文",
        "partner": "生成本文全文"
      }
    }
  ],
  "stateHistory": [
    {
      "index": 1,
      "entry": {
        "turn": 2,
        "scene": "Chapter 2",
        "changes": {"gratitude": 2},
        "evidence": {"gratitude": "ありがとう"},
        "stageTransition": null,
        "yoinomaContext": {},
        "fingerprint": "実行したrunTurnのfingerprint",
        "verification": {"ok": true, "errors": [], "replayFingerprint": "同じfingerprint"},
        "validation": {"ok": true, "errors": [], "warnings": [], "replayFingerprint": "同じfingerprint", "requiresSemanticReview": true}
      }
    }
  ],
  "replayContext": {"recordIndices": [0], "storyActions": {}}
}
```

上記は**構造例**。実際の`changes`・`evidence`・`yoinomaContext`・`fingerprint`・検証結果を使う。空の心理情報を計算済みとして捏造しない。

- ルートの必須項目は`version/saveId/characterId/chapter/records/stateHistory/replayContext`だけ。`version`は数値の`2`、`chapter`は1以上の整数。`records`と`stateHistory`は各1要素の配列。
- 各要素は`{index,entry}`。`index`は正本の対応する配列末尾の0始まりの位置であり、Chapter番号の機械的な代用ではない。`records.entry`の必須項目は`scene/date/protagonist/partner`、`stateHistory.entry`の必須項目は`turn/scene/changes/evidence/stageTransition/yoinomaContext/fingerprint/verification/validation`だけ。`scene`は`Chapter <chapter>`、`turn`は`chapter`と一致させる。
- `replayContext`は`{recordIndices,storyActions}`を必ず指定し、空の場合も省略しない。未規定の補助データや過去本文を章JSONに追加しない。
- `verification`と`validation`は元の実測結果を全文保持する。ともに`ok:true`、`errors:[]`、`replayFingerprint`が元の8桁の指紋と一致していること。`validation.warnings`と`requiresSemanticReview:true`も保持し、意味の確認を省略しない。
- **入れない**：`stateHistory[0].entry.packet`、`before`、`after`、`evaluations`、`execution`、`sources`、`protagonistInput`。これらは取り込み時の`runTurn`で正本から再生成し、指紋で一致検査する。主人公入力は`records[0].entry.protagonist`にだけ置く。
- `history.entry.changes/evidence/stageTransition/yoinomaContext`は生成時に検証したpacketと**完全一致**させる。`history.entry.fingerprint`は元のpacketの指紋。`verification`・`validation`も元の実測結果を記録する。ファイル出力のために心理変化や本文を再生成しない。
- `replayContext.recordIndices`は実際の計算に渡した過去実ログの**正本内の0始まりの添字**。全ログ利用時も使用順に記す。Chapter 1は`[]`。`replayContext.storyActions`は`validateStory`に使った宣言。過去の本文を複製しない。
- 取り込み側は、保存済み`currentState`・指定された過去ログ・主人公プロフィール・人物JS・行動JSから**実際に`runTurn`し直す**。指紋不一致や`verifyTurn/validateStory`の失敗時は保存しない。
- 検証成功時に保存される心理履歴は、再生成した`before/changes/evidence/stageTransition/yoinomaContext/after/evaluations/execution/sources/fingerprint`と`verification/validation`を**各1回**保持する。`packet`ネスト・主人公入力の複製は付けない。

### AIの出力手順と出力前検査

新規章は[STORY_REVIEW_GATE.md](STORY_REVIEW_GATE.md)の全確認軸を必須とし、小説としての仕上げの`checks.literaryQuality`も省略しない。確認記録は既存の`replayContext.storyActions.semanticReview`（未選択章は`draftMetadata.storyActions.semanticReview`）に保持し、本文作成・取り込みで再検査する。`mechanicalOk:true`だけの本文を保存JSONとして出さない。標準version 2のルート・ファイル名は変更しない。既に保存済みの同内容の章への再取り込みでは、旧確認票を無断で追加・書き換えない。

1. 本文生成時の`args/packet/verification/validation`と確定本文を保持する。保存のために心理変化や物語を生成し直さない。
2. `simulation/js/simulation_save.js`を評価し、`RenaiGameSave.createChapterBundleV2({args,packet,verification,validation,chapter,date,partner,savedRecords,recordIndices,storyActions})`で組み立てる。`savedRecords`はそのsaveIdの正本の全実ログ、`args.records`は実際に計算に渡した選択ログ、`partner`は確定本文全文。`args.stateEntry`も同じ正本の心理状態・履歴を使う。
3. この関数は元パケットと元の検証結果を再照合し、参照ログが正本の添字と一致すること、正本の次章であることを確認する。本文・パケットを再生成せず、既存オブジェクトを書き換えない。
4. 標準名でUTF-8のJSONとして書き、`RenaiGameSave.assertChapterBundleV2(bundle, filename)`または次のコマンドで形式とファイル名を検査する。失敗したファイルを通常の保存JSONとして渡さない。欠けた実測値を捏造しない。

```sh
node simulation/scripts/validate_chapter_bundle.cjs /path/to/<saveId>_<characterId>_<4桁chapter>.json
```

形式検査は必須項目・禁止項目・型・指紋の整合・ファイル名を検査するもので、心理JS実行済みの証明や正本との照合の代用ではない。ゲームでの取り込みは別途、正本から心理JSを実行し直す。検査のためにversion番号だけを書き換えたり、既存データを黙って削って合格させたりしない。`compactChapterBundle`はversion 1の二重ネストを整理する互換関数であり、標準version 2を作る出力関数ではない。

### 旧形式との互換性

既存の**version 1**（`history.entry`内に計算項目と同じ内容の`packet`を両方持つ）も引き続き取り込める。すでに保存した旧章の心理履歴は**無断で削除・変換しない**。新規のversion 2だけ重複を排除する。旧形式のゲームや古い端末ではversion 2を扱えないため、最新版を開き直すこと。

## ゲームでの保存

1. 「セーブ → 章データを取り込んで保存」でJSONを選ぶ。
2. ゲームが指定saveIdから完全な既存セーブを取得し、組・Chapter順・現在stateとbeforeの一致を検査する。
3. 実際の心理JSでパケットと本文を再検証する。必要な設定の不一致や取得不能時は停止する。
4. 組・スロット・Chapterを表示する。ユーザーが保存ボタンを押すまではGitHubを変更しない。
5. 記録と心理履歴をそのスロットの配列末尾に追記し、currentStateをafterに更新する。過去ログと過去心理履歴を保持する。
6. **完全なスロットJSONと更新した一覧を1コミットで保存する。** 開始headを親にしてforceせずrefを更新し、競合時は上書きしない。
7. 保存したコミットSHAを指定して両ファイルを再取得し、一致を確認する。確認成功後、端末内のセッションも完全な記録で更新する。

同じ内容の保存済みChapterは二重追加しない。異なる内容の同じChapterは勝手に上書きしない。「保存済みデータをゲームに反映」で画面に読み込める。

## 互換・移行

旧chapter-files-v1形式は読み込み時に全章と心理履歴を復元する。次の保存は単一ファイルにまとめる。既存の美奈／エミールとマリー／ニコラスは、全本文・心理履歴・currentStateの一致を確認して単一ファイルへ移行する。旧分割ファイルと移行前manifestはバックアップとして残し、現在stateの代用に使わない。

記録の10章ごとのページと開閉目次は表示上の区切り。保存は分割しない。大きなセーブはContents APIのcontentが省略される場合も、指定されたGit blobから全文を取得する。



### 大きなセーブのAIからの取得

fetch_file/Contents APIが空のcontentとshaを返した場合、セーブが空・消失したとは扱わない。返されたshaを使って `https://api.github.com/repos/namiyukuta-cmd/private-game-data/git/blobs/<sha>` を取得し、全文を読む。GitHubツールがblobをデコード済みのJSONとして返す場合はその内容を正本とする。本文・心理履歴・currentStateを取得できないまま初期値へ戻さない。


## 恋愛相手未選択の本文保存

恋愛相手を選ぶ前の章も、同じ主人公の未選択スロットへ本文として保存できます。
この形式は心理計算済みの章と区別します。心理状態・心理履歴を捏造して補完しません。

専用の`version: 1`の章構造に `characterId: null`、`stateHistory: []`、`draftMetadata.status: "unverified_draft"`、`draftMetadata.psychologyJsExecuted: false` を指定します。この専用形式は標準version 2の心理付き出力関数・形式検査の対象外です。
`saveId` はゲームで作成済みの未選択スロットのID、`records` は原文と本文を含む1章分とします。
支援の求めや停滞のある新規章は、`draftMetadata.storyActions.continuity.supportProgress`に対応した問題の原文参照・実行者・対応と結果の本文引用を保持します。取り込み時の`validateContinuity`へ今回の主人公入力・保存済み実ログ・この行動宣言を渡して再検査します。詳細は`PROTAGONIST_CONTINUITY_RULES.md`の支援の実行結果の規定に従います。心理計算済みとは扱いません。変更のない保存済み章の再取り込みで新しい支援宣言を遡って要求しません。
本文は `recordsByCharacter.__unassigned__` に追記し、元の取り込みJSONも保持します。記録画面では恋愛相手未選択の本文として表示します。
恋愛相手のいるスロットへの取り込み・異なる本文での上書き・章の飛ばし保存は拒否します。
心理計算・本文検証の成功と案内してはいけません。後から恋愛相手を選んだ場合の心理状態への移行は、この本文保存では実施しません。

## 既存version 1の互換性と明示指定時だけの出力例外

**「全文保持」「全項目保持」だけではこの例外を適用しない。** ユーザー自身が今回のファイルをversion 1で出力すると明示した場合だけ、version=1のhistory.entryへ `{turn, scene, ...packet, verification, validation}` の形で各値を1回だけ展開し、同じ値を入れたpacketオブジェクトを再度付けない。標準の保存指示にはversion 2だけを出力する。互換形式が取り込めることは、新規出力で自由に選べることを意味しない。

旧version 1の二重形式・packet内だけの形式も、重複値がすべて一致することを確認したうえで取り込める。新しく取り込む履歴は二重packetを除き、すでに保存済みの同じ章も形式差だけでは内容の衝突と扱わない。beforeとafterは異なる時点なので、それぞれ残す。検証時はentryから元のpacketを復元する。

未知の履歴補助項目は保持する。未知のpacket項目がある場合は値をentryへ1回保持し、復元用のpacketFieldNamesに項目名だけを残す。生成時の指紋・検証記録・本文・数値を変更しない。既存セーブの過去履歴をこの処理のために一括書き換えない。



## 男性の相手との恋愛進展の宣言

`ROMANCE_PREFERENCES.md`の方針は全章共通。恋愛進展の宣言`romanceProgress`は心理付き章の`replayContext.storyActions`、未選択章の`draftMetadata.storyActions`へ保持し、本文原文と現在の相手・設定から再検査する。家族の支援を恋愛進展の宣言へ変換しない。ルートの必須項目や標準version 2の形式は変更しない。
