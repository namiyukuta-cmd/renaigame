# 恋愛シミュレーション軽量版：AIへの入口

この版は、生成時の転送量と保存操作を減らすための画面です。主人公の保護、人物設定、心理計算、原文の保持、意味確認を省略しません。正本セーブの保存先は **namiyukuta-cmd/private-game-data** の `renaigame/simulation/saves/<saveId>.json`。通常版と同じ非公開セーブを使います。

## 引き継ぎを読む

ゲームの引き継ぎ文には、非公開セーブからロードした現在スロットのプロフィール、実ログ本文全文、現在心理の全項目があります。過去の心理履歴だけが `turn/scene/fingerprint` の参照です。完全な計算履歴は非公開正本に保持しています。`handoffOnly:true` は転送用であり、完全セーブへの上書きや復元に使えません。未収録の過去数値を推測しません。

この引き継ぎがある場合、生成のためだけに完全セーブやセーブ一覧を再取得しません。引き継ぎにない過去情報が実際に必要なときは、同じsaveIdの非公開正本を確認します。別周回・別人物の履歴で代用せず、既存の本文や心理を初期化しません。

## 共通の生成手順を使う

[AI_GENERATION_ENTRY.md](../simulation/AI_GENERATION_ENTRY.md)、[ROMANCE_PREFERENCES.md](../simulation/ROMANCE_PREFERENCES.md)、[PROTAGONIST_CONTINUITY_RULES.md](../simulation/PROTAGONIST_CONTINUITY_RULES.md)、[AI_NOVEL_GENERATION_RULES.md](../simulation/AI_NOVEL_GENERATION_RULES.md)、[STORY_REVIEW_GATE.md](../simulation/STORY_REVIEW_GATE.md)を適用します。共通入口のセーブ取得だけを上記の引き継ぎに置き換えます。主人公の未入力の発話・行動・心理・同意・結末を足さず、男性本人の動機と接近・応答で恋愛を進めます。継続方針への抗議を死亡・消滅・存在否定の許可にしません。

心理付き章は[AI_TURN_EXECUTION.md](../simulation/AI_TURN_EXECUTION.md)の最短手順を使います。現在mainの完全SHAを確認し、`RenaiGameTurnRuntime.loadSources`で同一コミットの必須依存をまとめて取得してください。同一SHAの再利用可能なソースは保持済みキャッシュを使い、毎Turn必須の再取得は続けます。選択中の人物JS・behaviorと必要な世界資料を読みます。char_013では瑞梛国の3資料も必須です。

`createRuntime`の`save`へ引き継ぎデータを渡し、同じ現在stateと実ログで `runTurn` を実行します。**意味確認票を作る前から、`storyActions.handoffView = "history-references-v1"` を付けてください。** ゲームの取り込みは非公開正本から同じ参照ビューを再構成し、心理計算と意味確認のbindingを再検証します。この印は本文検証の免除ではありません。`stateEntry.stateHistory`を独自に削除・変更せず、渡された参照履歴をそのまま使います。

実行後に本文を執筆・推敲し、独立した意味確認を行い、`releaseStory`で成功した本文を返します。心理の成功だけで本文を適切と宣言せず、確認票を自動合格にしません。

恋愛相手未選択のスロットでは共通の未選択章手順を使い、心理を捏造しません。引き継ぎにある `recordsByCharacter.__unassigned__`、プロフィール、今回入力を使い、`releaseStory(args,null,story,actions)`の継続検査・意味確認を完了してください。名前が登録されていないことを本文保存禁止や恋愛禁止の理由にしません。

## 保存

[CHAPTER_SAVE_FORMAT.md](../simulation/CHAPTER_SAVE_FORMAT.md)が保存形式の正本です。「保存JSON」には、確定済み本文と実測結果から `createChapterBundleV2` と `assertChapterBundleV2` で標準version 2の今回1章JSONを作り、JSONコードブロックで返してください。過去の本文・心理計算をやり直さず、心理付き章の `replayContext.storyActions` に上記handoffViewと実施済みsemanticReviewを保持します。ファイル名を示す場合は共通の標準名です。未選択章だけは同文書の専用規定に従います。

ユーザーはゲーム画面へJSONを貼り付け、「検証して非公開に保存」を1回押します。ゲームが非公開正本から検証し、完全な本文・心理履歴・現在stateと一覧を同じコミットに保存し、そのコミットを再取得して確認します。AI自身のGitHub書込みやファイル作成を必須手順にしません。AIへ直接の書込みが明示された場合は既存の規定に従い、失敗したときは保存済みと報告しません。公開のrenaigameリポジトリへ本文や主人公設定を置きません。
