# 章JSON取り込みと1スロット1ファイル保存

## 正本セーブ

正本は private-game-data の `renaigame/simulation/saves/<saveId>.json`。**1スロット＝1つの完全JSON**。本文・心理履歴・プロフィールを含む。別スロットや別キャラの内容は混ぜない。旧分割chapter-files-v1は読み込み時に復元する。

- `state.session.recordsByCharacter[characterId]`：各章の主人公原文と相手本文を1度だけ保持する。
- `state.session.statesByCharacter[characterId].currentState`：最新の心理状態（高速取得用）。
- `state.session.statesByCharacter[characterId].stateHistory`：各Turnの計算結果・検証結果を1組だけ保持する。**新しく保存する履歴には二重の`packet`と`protagonistInput`を格納しない。**
- `state.profile`：主人公プロフィール。
- `chapterImportMetadataByCharacter[characterId][chapter]`：`replayContext.recordIndices`、`recordsFingerprint`、`storyActions`など。過去ログ全文をここに複製しない。

## 新規の章取り込みJSON：version 2（重複排除）

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

- **入れない**：`stateHistory[0].entry.packet`、`before`、`after`、`evaluations`、`execution`、`sources`、`protagonistInput`。これらは取り込み時の`runTurn`で正本から再生成し、指紋で一致検査する。主人公入力は`records[0].entry.protagonist`にだけ置く。
- `history.entry.changes/evidence/stageTransition/yoinomaContext`は生成時に検証したpacketと**完全一致**させる。`history.entry.fingerprint`は元のpacketの指紋。`verification`・`validation`も元の実測結果を記録する。ファイル出力のために心理変化や本文を再生成しない。
- `replayContext.recordIndices`は実際の計算に渡した過去実ログの**正本内の0始まりの添字**。全ログ利用時も使用順に記す。Chapter 1は`[]`。`replayContext.storyActions`は`validateStory`に使った宣言。過去の本文を複製しない。
- 取り込み側は、保存済み`currentState`・指定された過去ログ・主人公プロフィール・人物JS・行動JSから**実際に`runTurn`し直す**。指紋不一致や`verifyTurn/validateStory`の失敗時は保存しない。
- 検証成功時に保存される心理履歴は、再生成した`before/changes/evidence/stageTransition/yoinomaContext/after/evaluations/execution/sources/fingerprint`と`verification/validation`を**各1回**保持する。`packet`ネスト・主人公入力の複製は付けない。

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

通常の章構造に `characterId: null`、`stateHistory: []`、`draftMetadata.status: "unverified_draft"`、`draftMetadata.psychologyJsExecuted: false` を指定します。
`saveId` はゲームで作成済みの未選択スロットのID、`records` は原文と本文を含む1章分とします。
本文は `recordsByCharacter.__unassigned__` に追記し、元の取り込みJSONも保持します。記録画面では恋愛相手未選択の本文として表示します。
恋愛相手のいるスロットへの取り込み・異なる本文での上書き・章の飛ばし保存は拒否します。
心理計算・本文検証の成功と案内してはいけません。後から恋愛相手を選んだ場合の心理状態への移行は、この本文保存では実施しません。

## 心理パケット全文を保持するJSON（version 1、重複なし）

ユーザーがbefore・after・evaluations・execution等の**心理パケット全文を保持する**よう指定した場合は、それらを省略しない。version=1のhistory.entryへ `{turn, scene, ...packet, verification, validation}` の形で各値を1回だけ展開し、同じ値を入れたpacketオブジェクトを再度付けない。この完全版と上記のversion 2の軽量版はどちらも取り込める。

旧version 1の二重形式・packet内だけの形式も、重複値がすべて一致することを確認したうえで取り込める。新しく取り込む履歴は二重packetを除き、すでに保存済みの同じ章も形式差だけでは内容の衝突と扱わない。beforeとafterは異なる時点なので、それぞれ残す。検証時はentryから元のpacketを復元する。

未知の履歴補助項目は保持する。未知のpacket項目がある場合は値をentryへ1回保持し、復元用のpacketFieldNamesに項目名だけを残す。生成時の指紋・検証記録・本文・数値を変更しない。既存セーブの過去履歴をこの処理のために一括書き換えない。
