# 恋愛シミュレーションのAI作業規定

- 章の保存JSONを扱う前に`simulation/CHAPTER_SAVE_FORMAT.md`を読む。保存形式の正本はこの文書。
- 「保存して」「保存JSON」「記録と情報更新」「完全保存」「心理パケット全項目を保持」は、標準version 2の1章JSONを出力する指示。保持の要求からversion 1を選ばない。
- 標準ファイル名は`<saveId>_<characterId>_<4桁chapter>.json`。`_light`・`_full`等の別名を独断で作らない。
- 心理パケット内部のversionと章JSONのversionを混同しない。取り込みJSONと完全な正本セーブも混同しない。
- `createChapterBundleV2`で確定済みデータから組み立て、`assertChapterBundleV2`または`node simulation/scripts/validate_chapter_bundle.cjs <JSONファイル>`で形式・ファイル名を検査する。本文・数値・指紋・検証記録を作り直さない。
- 既存version 1の取り込み互換性を維持する。ユーザー自身が今回のファイルをversion 1で出すと明示した場合だけ出力の例外とする。恋愛相手未選択の下書きは専用規定に従う。
- 未実行の心理計算・本文検証を成功として記録しない。ファイル出力だけでGitHub保存済みと報告しない。
- JS読込は`simulation/AI_TURN_EXECUTION.md`に従い、`ai_turn_runtime.js`か`run_ai_turn.cjs`で設定検証JSを含む全依存を同じwindowへ読み込む。読込失敗時は実行したコマンド・失敗ファイル・元のエラーを残して修正・再実行する。ツールの完了通知をJSとして評価しない。
- 実行ローダーを変更したら`node simulation/tests/ai_turn_runtime.test.cjs`を実行する。
- このリポジトリのコード・規定の修正で、private-game-dataの既存セーブ・本文・心理履歴を変更しない。
- 形式・取り込み・AI引き継ぎを変更したら`node simulation/tests/chapter_format.test.cjs`と`node simulation/tests/chapter_import.test.cjs`を実行する。
- 生成規定・本文検査の修正時は`simulation/PROTAGONIST_CONTINUITY_RULES.md`を読み、`node simulation/tests/support_progress.test.cjs`と`node tests/unassigned-continuity-import.test.cjs`を実行する。支援の申し出や準備だけで対応を終えること、世話の反復だけを境遇・関係の改善と扱うことを防ぐ。
