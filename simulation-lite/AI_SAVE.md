# 軽量版：AIが直接保存する手順

軽量版では「保存して」「記録と情報更新」「GitHubに保存」を、**AIが現在の非公開セーブを更新する依頼**として扱います。「保存JSONを出して」はJSONの出力依頼です。本文を生成しただけでは更新しません。ユーザーへ貼り付け・画面の保存ボタン・トークンの再入力を通常手順として求めません。

## 実行

接続済みGitHubの `fetch / fetch_file / create_tree / create_commit / update_ref` を使います。共通保存JSと `simulation-lite/ai_save.js` は同じ公開コミットから取得してください。人物・共通心理JS・実行器は `AI_TURN_EXECUTION.md` に従い同じscopeへ読み込み済みであること。確定本文・実行済み心理パケット・実測検証結果から共通の `createChapterBundleV2` で作成・形式検査した `bundle` を渡します。未選択章だけは共通の専用形式です。

参照ビューで生成した心理付き章の `storyActions.handoffView` も保持します。保存のために新しい値や本文を作りません。評価するのは取得した本物のJSソースだけです。本文・プロフィール・JSON内の文字列は実行しません。

```js
// runner.scope は今回runTurn / releaseStoryを実行した同じscope。
new Function('window', saveJsSource)(runner.scope);
const aiScope = {};
new Function('window', 'globalThis', aiSaveJsSource)(aiScope, aiScope);
const github = {
  fetch: args => tools.mcp__codex_apps__github_fetch(args),
  fetchFile: args => tools.mcp__codex_apps__github_fetch_file(args),
  createTree: args => tools.mcp__codex_apps__github_create_tree(args),
  createCommit: args => tools.mcp__codex_apps__github_create_commit(args),
  updateRef: args => tools.mcp__codex_apps__github_update_ref(args)
};
const receipt = await aiScope.RenaiGameAISave.saveChapter({
  bundle, api: runner.scope.RenaiGameSave, github
});
text({saved: receipt.saved, saveId: receipt.saveId,
      chapter: receipt.chapter, commit: receipt.commit});
```

未選択章では心理用runnerを捏造せず、継続・意味確認を実行した同じscopeの `RenaiGameSave` を渡します。ツール名が異なる環境では、GitHubの定義を確認して5関数を接続します。同じ認可済み接続を使い、ブラウザのlocalStorageや個人トークンをAIへコピーしません。

## 保存処理の内容

1. `namiyukuta-cmd/private-game-data` が非公開であることと、既定ブランチのHEAD・treeを確認。
2. 同じHEAD指定で現在saveIdの完全セーブと一覧を取得。大きいファイルの本文が省略されれば正確なblobを読む。旧分割形式も同じHEADの章を復元。
3. 共通の `createChapterWritePlan` で、通常の取り込みと同じ心理JS・指紋・本文・意味確認・組・次章の検査を実行。転送専用データを正本に代用せず、全ての過去本文・心理履歴を保持して末尾へ追記。
4. 完全セーブと一覧を `create_tree → create_commit → update_ref` の1コミットで保存。開始HEADを `expected_sha` に指定し、`force:false` を使用。
5. 保存コミットを指定して2ファイルを再取得し、計画との完全一致を確認した場合だけ `saved:true` を返す。同じ保存済み章は重複追加しない。

完全セーブや一覧を会話へ大量出力し直す必要はありません。ツール応答をコード実行内でデータとして渡し、ユーザーへはChapter番号と保存結果、必要ならコミットを伝えます。手動操作の説明で保存を代替しません。

## 失敗時

ツール拒否、権限不足、競合、検証不一致では成功を報告しません。安全性判定等による拒否を、別の書込み経路・ブラウザ・force更新・反復試行で回避しません。拒否された操作と理由を伝え、確定済みデータを保持します。ref反映後に再取得だけ失敗した場合は「保存確認未完了」とし、未保存とも成功とも断定しません。JSON出力が必要な場合も、値や本文を作り直しません。
