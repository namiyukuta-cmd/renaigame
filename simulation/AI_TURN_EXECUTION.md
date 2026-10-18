# AIターン実行手順（実コード）

共通の段階・補正・保存形式・意味確認軸の正本は`js/renaigame_policy.js`。説明は自動生成の[AI_POLICY_REFERENCE.md](AI_POLICY_REFERENCE.md)を使う。各ファイルで定義を複製せず、変更後は`node simulation/scripts/check_ai_turn.cjs`でCIと同じ全検査を実行する。

本文の最終出力は[STORY_REVIEW_GATE.md](STORY_REVIEW_GATE.md)に従う。小説は[AI_NOVEL_GENERATION_RULES.md](AI_NOVEL_GENERATION_RULES.md)の「小説としての仕上げ」に従い、**下書きの文学的推敲を終えてから**意味確認票を作る。形式のために文章を説明調へ戻さない。下書き後に`engine.prepareStoryReview(runner.buildArgs(input),draft,storyActions)`で未完了の確認票を作り、AIが仕上げを含む全確認軸を実際に照合して`storyActions.semanticReview`へ記録する。`checks.literaryQuality`の各観点は本文引用と理由、`revisionNote`を必須とする。`validateStory/validateContinuity`は意味確認未完了なら`ok:false`となる。`runner.releaseStory(input,packet,draft,storyActions).story`を最終本文に使う。確認票を自動で全passにしない。

Nodeの`run_ai_turn.cjs review <save.json> <input.json> <packet.json> <story.txt>`は未完了の確認票を返す。確認記録を入力ファイルのstoryActionsへ保持した後、同じ引数で`release`を使うと、検証成功時だけ本文が出力される。`run`や`review`の段階は本文出力の許可ではない。

GitHubから取得した本物のJSを実行し、現在saveIdの正本から計算する。読んだだけで実行済みと扱わない。
本文生成前にrunTurnとverifyTurnを成功させ、下書き生成後にvalidateStoryを成功させてから本文を返す。まだ下書きがない段階でvalidateStoryの成功を求めて処理を止めない。

## 必須ファイルと読込順

1. `simulation/js/ai_turn_runtime.js`（取得済みソースを同じwindowへ読み込む共通ローダー）
2. ローダーの`sourcePaths(characterId)`が返すすべてのファイルを、同じリポジトリの同じコミットから取得する。ファイル数や順序を別途固定しない。
   - `js/renaigame_policy.js`（共通の機械規則。最初に読み込む）
   - `simulation/js/character_settings_validator.js`
   - `js/renaigame_romance_rules.js`
   - `js/renaigame_psychology_parameters.js`
   - `simulation/js/ai_turn_engine.js`
   - 対象の`simulation_character_XXX.js`
   - 対象の`simulation_character_XXX_behavior.js`
3. 指定saveIdの完全な正本セーブをprivate-game-dataから取得する。旧分割形式は先に全章を復元する。
4. 今回の主人公入力原文を保持し、設定・現在心理・実ログに基づくchangesと入力原文からのevidenceを用意する。

設定検証JSは、特にchar_008以降のrunTurnに必要。取得しただけで読み込みを省略しない。全ソースを同じwindowへ登録し、同じセーブのプロフィール・currentState・実ログを渡す。

GitHubツールの`content[0].text`が`Action completed.`の場合、それは完了通知でありJSではない。fetch_fileをUTF-8で取得し、`structuredContent.content`のソース本文を使う。ローダーはこのツール応答オブジェクトを直接受け取ることもできる。base64は先にUTF-8へデコードする。

取得済みソースをコードモードのローダーへ直接渡せる場合、実行のためだけにローカルファイルを再作成しない。Nodeでファイルが必要な場合は内容またはblob SHAを比較し、同一なら変更しない。更新は1回の置換とし、同じパッチで同一路径を削除・追加する重複操作は使わない。ファイル操作に失敗しても保持中の入力・計算結果を作り直さず、操作だけを修正する。

## 実行方法A：コードモード等で取得済みソースを実行する

ファイルシステム・Node・ブラウザー・DOMは不要。JavaScriptを実行できるツールで、取得した文字列を次のように読み込む。sourcesはパスをキー、本物のJS文字列またはfetch_fileの応答を値にするオブジェクト。ユーザーの本文や入力をソースとして評価しない。

```js
const loaderScope = {};
new Function('window', runtimeJsSource)(loaderScope);
const runner = loaderScope.RenaiGameTurnRuntime.createRuntime({
  sources, save: saved, saveId: actualSaveId, characterId: selectedCharacterId,
  recordIndices: actualRecordIndices
});
const input = {
  protagonistInput: rawProtagonistInput,
  changes: actualChanges,
  evidence: actualEvidence,
  stageTransition: actualStageTransition,
  yoinomaContext: actualYoinomaContext
};
const turn = runner.runTurn(input);
// turn.packet.after/evaluations、人物設定・行動設定、実ログから本文を下書きする。
const checked = runner.validateStory(input, turn.packet, generatedStory, actualStoryActions);
// checked.validation.ok === trueを確認し、意味と主人公の未入力描写も照合してから本文を返す。
```

recordIndicesは正本の全記録に対する0始まりの添字。省略時は全記録を保存順に使い、実際の選択はturn.context.recordIndicesに返る。Chapter 1は[]。
changes/evidenceは明示必須。根拠のある変化がない場合だけ両方{}にする。読込失敗を回避するために変化を空にしたり、現在stateを初期値へ戻したりしない。
未開始で記録も心理状態もないスロットだけ、対象の初期値JSONを明示的にinitialStateへ渡せる。既存ログがあるのにstateが欠ける場合は初期値で代用しない。

このローダーと同じコード・同じセーブで、Nodeとコードモードの指紋が一致することを回帰検査する。

## 実行方法B：Nodeで付属コマンドを使う

リポジトリの必要ファイルをローカルへ取得済みなら、依存ライブラリのインストールなしで実行できる。取得できないファイルを記憶から再作成しない。入力JSONのsaveId/characterIdは今回の対象を明示する。

```json
{
  "saveId": "run_example",
  "characterId": "char_016",
  "protagonistInput": "今回の主人公入力の原文全文",
  "changes": {"gratitude": 2},
  "evidence": {"gratitude": "入力に実在する原文抜粋"},
  "recordIndices": [],
  "storyActions": {}
}
```

上記は構造例。実際の入力・値・根拠・参照番号へ置き換える。シェルへ原文やJSを埋め込まず、ファイル書込API等でUTF-8の入力ファイルを作る。

```sh
node simulation/scripts/run_ai_turn.cjs run /path/to/save.json /path/to/input.json > /path/to/turn-result.json
node simulation/scripts/run_ai_turn.cjs validate /path/to/save.json /path/to/input.json /path/to/turn-result.json /path/to/story.txt
```

最初のコマンドはpacket/verification/contextを標準出力へ返す。次のコマンドは元のpacketを読み込み、同じ入力・正本から照合して、本文を検証する。新しいpacketに差し替えて合格させない。これらの診断・計算結果は章取り込みJSONとは異なる。
コマンド自体はネットワーク通信・正本保存を行わない。別の作業場所から実行する場合はスクリプトを絶対パスで指定する。

## 読込に失敗した場合

「取得したが実行環境へ読み込めない」だけで終了しない。利用できるJavaScript実行ツールまたはNodeで実際に試し、依存ファイル・ソース本文の抽出・読込順・同じwindowへの登録を確認する。
修正できる読込ミスはその場で修正し、保持している今回入力を使って再実行する。ユーザーに同じ入力を再送させない。心理計算の省略や偽の成功記録で回避しない。

解消できなかった場合は、実際に試したツール／コマンド、失敗したJSのパス、元のエラー全文、runTurn/verifyTurn/validateStoryのどこまで実行できたかを報告する。実行ツールが本当に提供されていない場合は、その事実とJS自体の失敗を区別する。別スレッドの環境や未確認の原因を断定しない。

## 保存JSONの出力

形式の正本は[CHAPTER_SAVE_FORMAT.md](CHAPTER_SAVE_FORMAT.md)。標準はversion 2。turn-result.jsonを章JSONの代わりに渡さない。パケット内部のversion:1を章JSONのversionとしてコピーしない。

取得済みのsimulation/js/simulation_save.jsを`new Function('window', saveJsSource)(runner.scope)`で同じwindowへ読み込んでから、確定データで組み立てる。

```js
const bundle = runner.scope.RenaiGameSave.createChapterBundleV2({
  args: runner.buildArgs(input), packet: turn.packet,
  verification: turn.verification, validation: checked.validation,
  chapter: actualChapter, date: actualDate, partner: generatedStory,
  savedRecords: saved.state.session.recordsByCharacter[selectedCharacterId] || [],
  recordIndices: turn.context.recordIndices, storyActions: actualStoryActions
});
const filename = `${bundle.saveId}_${bundle.characterId}_${String(bundle.chapter).padStart(4, '0')}.json`;
runner.scope.RenaiGameSave.assertChapterBundleV2(bundle, filename);
```

UTF-8のファイルとして書いた後の形式検査は`node simulation/scripts/validate_chapter_bundle.cjs <JSONファイル>`。この形式検査だけで心理JSを実行済みとは扱わない。

packet.execution.invokedは7個のevaluate関数の実行証跡で、正規化の実行はnormalizedBefore/normalizedAfterにも記録される。fingerprintは照合値であり暗号署名ではない。機械検査は本文の意味・人物らしさ・主人公の未入力描写を完全には保証しない。外部ChatGPTのツール利用自体をリポジトリから強制する機能でもない。

## 支援場面の本文検査

`PROTAGONIST_CONTINUITY_RULES.md`の支援の実行結果の規定を適用する。入力・過去ログの苦痛や停滞を検出した場合は、`storyActions.continuity.supportProgress`に対応した問題の原文参照、実行者、対応と結果の本文引用を渡す。申し出・準備・同じ世話だけを結果と申告しない。失敗時は同じ章の本文を修正して再検査し、説明だけで終了しない。心理計算・過去ログ・主人公の未入力心理を成果に合わせて書き換えない。


## 恋愛の進展を支援で置き換えない

主人公の恋愛相手は男性限定。`ROMANCE_PREFERENCES.md`に従い、恋愛の進行を求めた章や停滞が反復した章では`storyActions.romanceProgress`を`validateStory`へ渡す。女性NPC・血縁者・別の攻略対象は恋愛の実行者にしない。生活支援の`supportProgress`が合格しても恋愛の進展が成立したとは扱わない。男性自身の行動と個人的な関心・希望が本文にあるか照合する。
