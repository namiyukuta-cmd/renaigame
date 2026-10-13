# 章JSON取り込みと1スロット1ファイル保存

## 現在の保存方式

正本は private-game-data の `renaigame/simulation/saves/<saveId>.json`。**1スロットの本文・心理状態・心理履歴・主人公プロフィールをこの1つのJSONに保持する。章ファイルへ分割して新規保存しない。** セーブ一覧 index.json は名前・相手・固定slotNumber・更新日時のみ。主人公名＋selectedCharacterIdの組で一覧をまとめ、その中のスロットを選ぶ。

- `state.session.recordsByCharacter[characterId]`：主人公入力と攻略対象本文等の全文を章順に保持する。
- `state.session.statesByCharacter[characterId].currentState`：最新の心理状態。
- `state.session.statesByCharacter[characterId].stateHistory`：各Turnのbefore・changes・evidence・after・evaluations・execution・verification・validation・packet全文。
- `state.profile`：主人公プロフィール。
- `chapterImportMetadataByCharacter[characterId][chapter]`：取り込み用JSONの補助情報。過去ログはreplayContext.recordIndices（0始まりの配列添字、使用順）とrecordsFingerprintで参照し、本文を重複保存しない。storyActionsと未知の補助項目は保持する。

同じ攻略対象でも別主人公・別スロットの内容を混ぜない。既存の未知のフィールドを削除しない。主要心理値が不足する旧stateを勝手に0で補完しない。

## AIが出すファイル

ユーザーが「保存して」と言ったら、標準ではゲームで取り込む**今回の1章分だけ**のJSONファイルを出す。GitHubに保存したとは報告しない。直接GitHubへ保存するよう明示された場合のみ直接保存を行う。

ファイル名：`<saveId>_<characterId>_<4桁chapter>.json`。

```json
{
  "version": 1,
  "saveId": "run_example",
  "characterId": "char_007",
  "chapter": 2,
  "records": [{"index": 1, "entry": {"scene": "Chapter 2", "date": "", "protagonist": "主人公入力の全文", "partner": "本文全文"}}],
  "stateHistory": [{"index": 1, "entry": {"turn": 2, "scene": "Chapter 2", "before": {}, "changes": {}, "evidence": {}, "after": {}, "evaluations": {}, "execution": {}, "sources": {}, "fingerprint": "", "verification": {}, "validation": {}, "packet": {}}}],
  "replayContext": {"recordIndices": [0], "storyActions": {}}
}
```

これは構造例。空の心理項目を本物のデータとして使わない。history.entryには実際のpacketの全フィールドを保持し、verificationとvalidationの成功結果、packet自体も元のまま含める。主人公入力・本文を要約に置き換えない。

replayContext.recordIndicesにはrunTurn/verifyTurnに実際に渡した過去実ログの、保存済みrecordsByCharacter[characterId]における0始まりの添字を使用順に入れる。全ログを使った場合もその添字一覧を出す。Chapter 1は空配列。storyActionsにはvalidateStoryへ実際に渡した行動宣言を含める。過去ログ全文のreplayContext.recordsは今後の出力には不要。ゲームが同じスロットから実ログを取得し、packet.sources.recordsの指紋一致と実際のJS再検証を必須にする。旧JSONのreplayContext.recordsも受け入れ、保存時には参照番号へ変換する。生成時の計算結果と検証記録を保持し、ファイル出力のために文章・心理変化を作り直さない。

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
