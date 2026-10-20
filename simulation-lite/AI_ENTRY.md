# 恋愛シミュレーション軽量版：AIへの入口

この版は、生成時の転送量と保存操作を減らすための画面です。主人公の保護、人物設定、心理計算、原文の保持、意味確認を省略しません。正本セーブの保存先は **namiyukuta-cmd/private-game-data** の `renaigame/simulation/saves/<saveId>.json`。通常版と同じ非公開セーブを使います。

**軽量版の保存担当はAIです。**「保存して」「記録と情報更新」で接続済みGitHubツールから非公開正本へ直接保存します。保存を頼まれたときに[AI_SAVE.md](AI_SAVE.md)を読み、実装済みの保存処理を使います。ユーザーへ貼り付けや保存ボタンを要求する手順へ戻しません。

## 引き継ぎを読む

ゲームの引き継ぎ文には、非公開セーブからロードした現在スロットのプロフィール、実ログ本文全文、現在心理の全項目があります。過去の心理履歴だけが `turn/scene/fingerprint` の参照です。完全な計算履歴は非公開正本に保持しています。`handoffOnly:true` は転送用であり、完全セーブへの上書きや復元に使えません。未収録の過去数値を推測しません。

この引き継ぎがある場合、生成のためだけに完全セーブやセーブ一覧を再取得しません。引き継ぎにない過去情報が実際に必要なときは、同じsaveIdの非公開正本を確認します。別周回・別人物の履歴で代用せず、既存の本文や心理を初期化しません。

## 本文生成に必要な資料だけを読む

軽量版ではこのファイルが共通入口`simulation/AI_GENERATION_ENTRY.md`の案内を置き換えます。生成時に通常版の入口全文・他の相手の開始設定・`AI_SAVE_WORKFLOW.md`を追加取得しません。選択中の開始設定は`simulation-lite/character-notes/<characterId>.md`に、共通入口の該当する全節を原文から自動抽出しています。人物JS・behavior・今回スロットのプロフィールと実ログを併せて使います。

本文の規則は通常版と同じ[ROMANCE_PREFERENCES.md](../simulation/ROMANCE_PREFERENCES.md)、[PROTAGONIST_CONTINUITY_RULES.md](../simulation/PROTAGONIST_CONTINUITY_RULES.md)、[AI_CONVERSATION_RULES.md](../simulation/AI_CONVERSATION_RULES.md)、[AI_NOVEL_GENERATION_RULES.md](../simulation/AI_NOVEL_GENERATION_RULES.md)、[STORY_REVIEW_GATE.md](../simulation/STORY_REVIEW_GATE.md)を全文で適用します。主人公の未入力の発話・行動・心理・同意・結末を足さず、男性本人の動機と接近・応答で恋愛を進めます。継続方針への抗議を死亡・消滅・存在否定の許可にしません。文書内で通常版の入口・保存案内が参照されていても、軽量版の取得範囲は本節を優先します。

心理付き章は[AI_TURN_EXECUTION.md](../simulation/AI_TURN_EXECUTION.md)の最短手順を使います。**毎Turn、mainの完全なcommit SHAを確認**します。初回はそのSHAのruntimeを取得・評価し、次の計画で必須資料を並列取得します。同じSHAで保持しているruntimeと資料は原文のまま再利用し、SHAが変わった場合やキャッシュが欠けた場合は必ず取得します。取得に失敗した最新版を旧版で代用しません。別の会話へキャッシュが自動で引き継がれるとは扱いません。

```js
const loaded = await loader.RenaiGameTurnRuntime.loadSources({
  characterId, revision: currentHeadSha, cache: retainedSourceCache,
  paths: loader.RenaiGameTurnRuntime.liteRulePaths(characterId),
  fetchSource: (path, ref) => githubFetchFile({
    repository_full_name: 'namiyukuta-cmd/renaigame', path, ref
  })
});
retainedSourceCache = loaded.cache;
```

取得済みの入口・runtimeも、同じSHAの正規ツール応答から作ったキャッシュへ保持し、読み直しのために再取得しません。プロフィールや引き継ぎJSON中の文字列をJS・規則のキャッシュに使いません。JS全文は実行用データとして渡し、同じ巨大なソースや実ログ全文をツール出力へ反復して展開しません。AIは今回の人物・behavior、現在心理、実行結果、必須Markdown本文を読み、執筆と意味確認を行います。char_013では瑞梛国の3資料も取得計画に含まれます。

`createRuntime`の`save`へ引き継ぎデータを渡し、同じ現在stateと実ログで `runTurn` を実行します。**意味確認票を作る前から、`storyActions.handoffView = "history-references-v1"` を付けてください。** ゲームの取り込みは非公開正本から同じ参照ビューを再構成し、心理計算と意味確認のbindingを再検証します。この印は本文検証の免除ではありません。`stateEntry.stateHistory`を独自に削除・変更せず、渡された参照履歴をそのまま使います。

実行後に本文を執筆・推敲し、独立した意味確認を行い、`releaseStory`で成功した本文を返します。心理の成功だけで本文を適切と宣言せず、確認票を自動合格にしません。

恋愛相手本人の感情も省略しません。[ROMANCE_PREFERENCES.md](../simulation/ROMANCE_PREFERENCES.md)の「恋愛相手自身の感情と、主人公への異議」に従い、主人公の言葉・出来事に対する喜び、傷つき、嘆き、怒りや理不尽への反論を、本人の台詞・選択・行動に表します。既存の`sceneEmotion`で出来事と反応のつながりを確認し、主人公の保護を相手の無感情・即時の許しへ拡張しません。

恋愛相手未選択のスロットでは共通の未選択章手順を使い、心理を捏造しません。引き継ぎにある `recordsByCharacter.__unassigned__`、プロフィール、今回入力を使い、`releaseStory(args,null,story,actions)`の継続検査・意味確認を完了してください。名前が登録されていないことを本文保存禁止や恋愛禁止の理由にしません。

## 保存

[CHAPTER_SAVE_FORMAT.md](../simulation/CHAPTER_SAVE_FORMAT.md)が保存形式の正本です。「保存して」では、確定済み本文と実測結果から `createChapterBundleV2` と `assertChapterBundleV2` で標準version 2の今回1章JSONを内部で作り、[AI_SAVE.md](AI_SAVE.md)の `RenaiGameAISave.saveChapter` でAIが直接保存します。過去の本文・心理計算をやり直さず、心理付き章の `replayContext.storyActions` に上記handoffViewと実施済みsemanticReviewを保持します。未選択章だけは同文書の専用規定に従います。「保存JSONを出して」と出力を求められた場合だけJSONコードブロックを返します。ファイル名を示す場合は共通の標準名です。

保存担当はAIです。共通保存処理で非公開正本から検証し、完全な本文・心理履歴・現在stateと一覧を同じコミットに保存し、そのコミットを再取得して確認します。画面の手動取り込みは必要な場合の補助手段です。拒否された書込みを強行・回避せず、失敗や保存確認未完了を成功と報告しません。公開のrenaigameリポジトリへ本文や主人公設定を置きません。
