# 恋愛シミュレーションのAI作業規定

- 主人公をユーザー本人として扱う最優先方針は`RenaiGamePolicy.storyDirection.protagonistCare`と`simulation/PROTAGONIST_CONTINUITY_RULES.md`冒頭に従う。主人公を雑に扱うことや恋愛の意図から外れる描写も禁止対象とし、抗議・失敗例・短い返答で解除しない。

- **軽量版（simulation-lite）の保存はAIが直接行う。**「保存して」「記録と情報更新」「GitHubに保存」で、`simulation-lite/AI_SAVE.md`と`ai_save.js`を使い、現在saveIdの非公開`private-game-data`へ検証後に保存・再取得確認する。「保存JSONを出して」は出力依頼。以下の画面取り込みを前提とした保存手順は通常版のもの。標準version 2・心理計算・本文と意味の検査は共用し、拒否された書込みを回避・強行しない。

- 共通の機械規則は`js/renaigame_policy.js`、心理数値項目は`js/renaigame_psychology_parameters.js`の`stateDefaults`を正本とする。段階・補正・保存形式・意味確認軸を別ファイルへ手で複製しない。自動生成の`simulation/AI_POLICY_REFERENCE.md`は`node simulation/scripts/generate_policy_reference.cjs`で更新する。公開前は`node simulation/scripts/check_ai_turn.cjs`でCIと同じ全検査を行う。新しい不具合は修正前に再現し、回帰検査を追加する。検査成功を本文の意味全体の保証と報告しない。
- 軽量版の生成資料は`RenaiGameTurnRuntime.liteRulePaths`を使う。毎TurnのHEAD確認後、同じcommitの取得済み原文は実行器・規則も再利用し、版違い・欠落時は取得する。主人公の保護・心理計算・意味確認を省略しない。人物専用メモは`node simulation/scripts/generate_lite_ai_notes.cjs`で共通入口から生成し、計測表は`node simulation/scripts/benchmark_lite_loading.cjs --write`で更新する。秒単位の生成速度を、バイト数の削減率で代用して報告しない。

- 公開前に`.github/workflows/ai-turn-tests.yml`の全検査をローカルで実行する。設定・実装・関連テストを整えてから、1作業の複数ファイルを`create_tree`→`create_commit`→`update_ref`の1コミットにまとめて反映する。ファイルごとの途中コミットでmainへ公開しない。反映後は最新コミットのActionsの成功を確認し、失敗時は原因を修正してから完了を報告する。

- Chapterヘッダは`simulation/AI_NOVEL_GENERATION_RULES.md`に従い全章で具体的な場所・年月日（曜）・HH:MM・数値℃を設定する。実ログ0件の開始環境はAIが設定する。「不明」で済ませない。本文検査を変更したら`node simulation/tests/chapter_header.test.cjs`も実行する。

- 本文生成・検証では`simulation/STORY_REVIEW_GATE.md`を読む。入力整合・正本出典・主人公の操作権・男性の動機・境遇の変化を下書き後に別工程で確認する。`semanticReview`未完了なら本文は出力不可。`mechanicalOk:true`だけで合格と報告しない。`releaseStory`の成功した本文を使う。確認票を自動で全てpassにしない。
- 本文検証を変更したら`node simulation/tests/story_review.test.cjs`も実行する。
- **主人公の恋愛相手は男性限定。** このリポジトリは男性の相手との恋愛を進めるゲームであり、女性NPCや実父・祖父・実兄弟を恋愛相手にしない。家族・世話役の支援で恋愛の進展を代用しない。生成・規定・検査を扱う前に`simulation/ROMANCE_PREFERENCES.md`を読む。
- 章の保存JSONを扱う前に`simulation/CHAPTER_SAVE_FORMAT.md`を読む。保存形式の正本はこの文書。
- AIのGitHub書込みは安全性判定等で拒否される場合があるため、通常版の「保存して」「記録と情報更新」「保存JSON」は標準version 2の1章JSONを作る。ゲーム画面で貼り付け／ファイル取込し、ゲーム自身の検証・GitHub保存を実行する。AIの書込み成功を前提にしない。書込み拒否を理由に既存データを推測して作り直さない。
- 小説本文は形式・意味の検証前にAI_NOVEL_GENERATION_RULES.mdの「小説としての仕上げ」に従い、情緒・相手役の固有性・前進が乏しい下書きを書き直す。
- 恋愛相手自身の傷つき・悲しみ・怒り・理不尽への異議を、主人公の保護や人物の優しさを理由に消さない。`ROMANCE_PREFERENCES.md`の「恋愛相手自身の感情と、主人公への異議」を適用し、既存の`sceneEmotion`で出来事・感情・本人の応答を照合する。引き継ぎは`RenaiGamePolicy.partnerEmotion.instruction`を共用し、確認軸・心理値・保存形式を増やさない。
- `semanticReview.checks.literaryQuality`は全章必須。人物固有性・場面の情緒・実際の前進・説明の釣り合いを最終本文の引用と個別の理由で確認し、`revisionNote`へ改稿内容または修正不要の具体的な理由を記す。語句の一律禁止や主人公の補完で仕上げを代用しない。変更時は`node simulation/tests/literary_review.test.cjs`も実行する。
- 通常版の「保存して」「記録と情報更新」「保存JSON」は標準version 2の1章取り込みJSONの依頼。「完全保存」「心理パケット全項目を保持」もversion 1へ切り替える根拠にならない。
- 標準ファイル名は`<saveId>_<characterId>_<4桁chapter>.json`。`_light`・`_full`等の別名を独断で作らない。
- 心理パケット内部のversionと章JSONのversionを混同しない。取り込みJSONと完全な正本セーブも混同しない。
- `createChapterBundleV2`で確定済みデータから組み立て、`assertChapterBundleV2`または`node simulation/scripts/validate_chapter_bundle.cjs <JSONファイル>`で形式・ファイル名を検査する。本文・数値・指紋・検証記録を作り直さない。
- 既存version 1の取り込み互換性を維持する。ユーザー自身が今回のファイルをversion 1で出すと明示した場合だけ出力の例外とする。恋愛相手未選択の下書きは専用規定に従う。
- 未実行の心理計算・本文検証を成功として記録しない。ファイル出力だけでGitHub保存済みと報告しない。
- JS読込は`simulation/AI_TURN_EXECUTION.md`に従い、`ai_turn_runtime.js`か`run_ai_turn.cjs`で設定検証JSを含む全依存を同じwindowへ読み込む。読込失敗時は実行したコマンド・失敗ファイル・元のエラーを残して修正・再実行する。ツールの完了通知をJSとして評価しない。
- 実行ローダーを変更したら`node simulation/tests/ai_turn_runtime.test.cjs`を実行する。
- 取得計画・キャッシュを変更したら`node simulation/tests/ai_turn_sources.test.cjs`も実行する。最新版の必須取得失敗時に旧資料を代用せず、同一commit SHAだけを再利用する。通常TurnはAI_TURN_EXECUTION.mdの最短手順を使い、runner.runTurn/releaseStoryの内部検査を外から重複実行しない。AIによる原文の読み取り・推敲・意味確認は省略しない。
- このリポジトリのコード・規定の修正で、private-game-dataの既存セーブ・本文・心理履歴を変更しない。
- 形式・取り込み・AI引き継ぎを変更したら`node simulation/tests/chapter_format.test.cjs`と`node simulation/tests/chapter_import.test.cjs`を実行する。
- 生成規定・本文検査の修正時は`simulation/PROTAGONIST_CONTINUITY_RULES.md`を読み、`node simulation/tests/support_progress.test.cjs`と`node tests/unassigned-continuity-import.test.cjs`を実行する。支援の申し出や準備だけで対応を終えること、世話の反復だけを境遇・関係の改善と扱うことを防ぐ。


- 恋愛の方針・検査を修正したら`node simulation/tests/romance_progress.test.cjs`を実行する。女性NPC・血縁者・別の攻略対象を恋愛の実行者として通さず、男性の相手自身の働きかけを確認する。
