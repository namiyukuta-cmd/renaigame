# 章ごとのセーブ形式（chapter-files-v1）

この仕様は分割形式のセーブに適用する。AI_SAVE_WORKFLOW.md・AI_GENERATION_ENTRY.md内の「実ログ・stateHistoryを1つのセーブJSONに追記」という旧形式の物理保存手順より、この仕様を優先する。主人公入力、心理JS実行、生成前検証、明示保存の条件は変わらない。

## 保存場所

- `renaigame/simulation/saves/<saveId>.json`：現在状態と章への参照を含む小さなセーブ（manifest）。入口パスとsaveIdは以前と同じ。
- `renaigame/simulation/saves/<saveId>/chapters/<characterId>_0001.json`：Chapter 1の本文・心理履歴の原文。
- `renaigame/simulation/saves/index.json`：名前・相手・更新日時・移動先のみ。

章ファイル例（entryは既存のオブジェクトを全文、全フィールド保持する）：

```json
{
  "version": 1,
  "saveId": "run_example",
  "characterId": "char_006",
  "chapter": 1,
  "records": [{"index": 0, "entry": {"scene": "Chapter 1", "protagonist": "主人公の原文", "partner": "攻略対象の本文"}}],
  "stateHistory": [{"index": 0, "entry": {"turn": 1, "scene": "Chapter 1", "before": {}, "changes": {}, "evidence": [], "after": {}, "evaluations": {}, "execution": {}, "verification": {}}}]
}
```

上記は構造例であり、空の心理パケットを実際の保存に使ってはいけない。新Turnではbefore・changes・evidence・after・evaluations・execution・verificationの全文と本文検証を保持する。実際のrunTurnパケット自体も、元の形のまま保持する。旧章の不足フィールドを計算済みと偽って補完しない。

セーブの`storage`：

```json
{
  "format": "chapter-files-v1",
  "characters": {
    "char_006": {
      "lastSavedChapter": 1,
      "records": [{"path": "renaigame/simulation/saves/run_example/chapters/char_006_0001.json", "index": 0, "chapter": 1, "scene": "Chapter 1", "date": ""}],
      "history": [{"path": "renaigame/simulation/saves/run_example/chapters/char_006_0001.json", "index": 0, "chapter": 1}]
    }
  }
}
```

`state.session.statesByCharacter[id].currentState`は従来どおり最新心理状態。flatな旧stateもそのまま保持する。分割形式の`recordsByCharacter[id]`と`stateHistory`は空配列で、実体は参照先にある。空配列を「履歴なし」と解釈しない。`index`は元の配列内の位置であり、Chapter番号とは別。各配列はindex順に復元する。複数記録・複数Turnが同じ章にある場合も省略しない。

## 生成前に読む

1. 確定したsaveIdのセーブを読む。storage.formatを確認する。
2. 分割形式なら現在stateをセーブから取得し、対象キャラのrecords/history参照先を読む。少なくとも直前Chapterの全文と心理履歴を読む。約束・人物関係・未解決事項・舞台の事実などに関わる章も読む。
3. 必要な参照先が取得不能なら生成を停止する。目次のscene/dateや端末内の`__chapterRef`は本文の代用ではない。読んでいない章を読んだと申告しない。
4. 実行器へは参照を解決した実ログを渡す。今回のrunTurn/verifyTurnは必ず同じ実ログ集合とbeforeを用いる。再検証時もsourcesの元データ集合を再取得する。
5. 旧形式（storageなし）は以前の配列をそのまま読む。

## 明示保存時

1. mainのhead SHAとセーブ・一覧・対象章を再取得する。別saveIdの情報を混ぜない。
2. 本文の重複・心理履歴の不足・beforeと現在stateの一致を確認する。未保存パケット全文が取得不能なら勝手に作らず停止する。
3. 今回章のファイルに本文と心理パケットを追加する。既存の同章本文がある場合は重複追加せず不足する心理履歴だけを補う。過去のパケット・本文・未知のフィールドを削除しない。
4. セーブのcurrentStateを今回afterへ更新し、records/historyの参照とlastSavedChapter、updatedAtを更新する。プロフィール等の既存情報を保持する。
5. 一覧の当該saveIdだけの更新日時を同期する。他のセーブは保持する。
6. **今回章・セーブ・一覧を1つのGitコミットとしてまとめて確定する。** Git Data APIのbase treeで必要なファイルだけを変え、開始headを親にcommitを作り、forceせずbranch refを更新する。開始headの不一致なら再読込して差分を確認する。古い状態で上書きしない。create_tree/create_commit/update_ref等が利用できないときは、順番にupdate_fileして部分保存を完了扱いにせず、停止して不足機能を報告する。
7. 更新後のセーブ・今回章・一覧を再取得し、本文全文・心理パケット・currentState・参照・日時を照合する。ref更新前の失敗は公開セーブの更新失敗として扱う。

過去章が変わらない通常保存では過去の章ファイルを送信しない。全章をまとめた旧セーブJSONを再送しない。安全性チェックで拒否されたら理由を断定せず、その処理を停止する。この方式は拒否の解消を保証するものではない。

## 移行とゲーム画面

`simulation/js/simulation_save.js`の`RenaiGameSave.splitSave(save)`がmanifestと章ファイル一覧を作る。配列の実体を除く全フィールドを保持し、章ファイルのentryは変更しない。`hydrateSave(token, manifest)`は元配列を復元する。移行前後のデータが完全一致することを確認する。

ゲームは「続きから」で小さなセーブだけを読み、記録を開いた際に選択ページの最大10章を取得する。最新心理状態はロード時点で取得済み。目次は隠す方式を保持する。旧セーブは読み込み可能で、次のセーブ時に分割形式へ移行する。旧共有`save.json`は互換読み書きの対象であり、通常周回はsaveId形式を使う。

既存のマリー／ニコラスの移行では元セーブを`<saveId>/legacy-backup.json`にそのまま保持する。バックアップは移行前の記録専用で、現在stateの代用に使わない。新しい章は以後の明示保存時に追加する。

## 組とスロットの一覧

セーブ一覧は主人公名（前後の空白を除く）とselectedCharacterIdの組ごとに管理する。ゲーム内セーブ・ロードとタイトルの「続きから」は、組を選んでからその中のスロットを選ぶ。同じ組で複数saveIdを持てる。各スロットは独立した本文・心理状態・章ファイルを持つ。

一覧の各項目のslotNumberは組内の固定番号。既存番号を保持する。旧一覧の番号はRenaiGameSave.numberSlots(index.saves)で採番し、次の明示保存時に一覧へ保持する。新しいスロットは同じ組の最大番号+1を使う。更新日時によって番号を付け直さない。ChatGPTから保存する場合も既存meta/indexのslotNumberを保持し、選んだsaveIdだけの本文・心理状態を更新する。

別の主人公・恋愛相手の組には上書きしない。新しいスロットへのコピーでは現在の周回の実ログと心理履歴をコピーし、保存先にあった別周回の実ログを混ぜない。



## ゲーム画面で保存する標準運用（章JSON取り込み）

ユーザーが「保存して」と指示したら、標準では本文生成時に確定した本文・心理パケット・検証記録から1章分のJSONファイルを出力する。ゲームの「セーブ → 章データを取り込んで保存」でユーザー自身が最後の保存操作を行う。明示的にChatGPTからGitHubへ直接保存するよう指定された場合だけ、従来の直接保存手順を使う。ファイルを出しただけではGitHub保存済みと報告しない。

ファイルはCHAPTER_SAVE_FORMAT.mdの章ファイル構造に従う。version=1、saveId、characterId、chapter、records:[{index,entry}]、stateHistory:[{index,entry}]を含む。record.entryにscene/date/protagonist/partnerの原文全文を保持する。history.entryにturn/scene、packetの全項目、verification、validation、packet自体を原形で保持する。before・changes・evidence・after・evaluations・execution・sources・fingerprintを省略しない。

追加のreplayContext.recordsには、そのrunTurn/verifyTurnへ実際に渡した過去実ログの配列を変更せず入れる。replayContext.storyActionsにはvalidateStoryに実際に渡した行動宣言を入れる。現在stateは取り込み側が保存先から取得するため、次Turnのbeforeは必ず保存済みcurrentStateを基準にする。未保存の過去章を飛ばして次章を保存しない。

既に生成・検証したpacketを保持し、出力のたびに心理変化や本文を作り直さない。ファイル名は<saveId>_<characterId>_<4桁chapter>.json。主人公入力と本文を要約へ置き換えない。ファイル出力不能なら理由を報告し、未保存の完全データを失わないよう保持する。

