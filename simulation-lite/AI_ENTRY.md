# 恋愛シミュレーション軽量版：AIへの入口

このモードは`simulation-lite/index.html`で遊ぶ、端末保存の独立した軽量版です。通常版の`private-game-data`は取得・変更しません。

## 今回の正本

引き継ぎ文には、この`saveId`の端末内正本から、プロフィール、選択中の男性、本文の実ログ全文、currentState全項目を渡します。stateHistoryはturn/scene/fingerprintの参照だけです。完全な心理計算履歴は端末の保存データに保持しています。参照履歴の件数を保ったまま実行器へ渡し、未収録の過去の数値は捏造しません。必要なら端末のバックアップで完全履歴を確認します。

`handoffOnly:true`は引き継ぎ用の印であり、復元用の完全セーブではありません。本文と現在心理は端末の正本と同一です。別スロットの本文や心理を混ぜません。入力の原文を保持し、主人公の未入力の発話・行動・心理・同意を加えません。

## 生成

通常版の[AI_GENERATION_ENTRY.md](../simulation/AI_GENERATION_ENTRY.md)を読み、本文の方針、男性との恋愛、主人公の継続、推敲と意味確認を適用します。保存先取得の部分は上記の端末内セーブで置き換えます。機械規則・心理項目・保存形式を軽量版のために再定義しません。

選択中の`characterId`の人物JS・behaviorと共通JSを取得し、[AI_TURN_EXECUTION.md](../simulation/AI_TURN_EXECUTION.md)の最短手順で`createRuntime({sources,save,saveId,characterId,recordIndices})`、`runTurn`、`releaseStory`を実行します。`save`には引き継がれた端末内セーブを渡します。心理状態は既に含まれているため、新しい初期値へ戻しません。人物・世界設定・実ログを読み、男性自身の動機と働きかけを描きます。意味確認を自動合格にしません。

## 保存

「保存JSON」という依頼には[CHAPTER_SAVE_FORMAT.md](../simulation/CHAPTER_SAVE_FORMAT.md)の標準version 2の今回1章JSONを返します。確定済みの本文、心理パケット、実測検証結果を保持し、`simulation/js/simulation_save.js`の`createChapterBundleV2`と`assertChapterBundleV2`で作成・検査します。形式・項目を独自に削りません。ファイル名を示す場合も共通の標準名を使います。

軽量版では**JSONコードブロックを返せば取り込めます**。ファイル生成とGitHubへの書込みを通常手順にしません。ゲーム画面で正本から心理JSと本文検査を再実行し、内容の確認後に端末へ保存します。端末へ保存したことをGitHub保存と呼びません。バックアップはゲームの「全物語をJSONに書き出す」から作ります。
