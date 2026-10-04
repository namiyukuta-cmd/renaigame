# 恋愛ゲーム

[ゲームを開く](https://namiyukuta-cmd.github.io/renaigame/)

## 恋愛シミュレーションで遊ぶ

1. [恋愛シミュレーション](https://namiyukuta-cmd.github.io/renaigame/simulation/simulation.html)を開き、「始めから」または「続きから」を選びます。
2. 「恋愛相手」で相手を選びます。新規周回では「プロフィール」に自分で設定を入力します。
3. 右下の「AIに渡す」を押し、「コピー」を押します。
4. ChatGPTへ貼り付けます。AIが設定と現在の記録を確認したら、主人公の台詞や行動を入力して遊びます。
5. 会話と心理状態を保存するときは、ChatGPTへ「記録と情報更新」と伝えます。

保存済みの周回は現在のセーブIDを渡します。未保存の周回は端末内のプロフィールと対象相手の記録を渡すので、別のセーブを探す必要はありません。保存済みの周回でプロフィールや相手を変えた場合、先に画面の「セーブ」を押してください。

画面の「セーブ」は画面内のデータを保存します。ChatGPT内で遊んだ会話は、ChatGPTへの保存指示で記録します。自動保存はしません。

## AIが最初に読む入口

**[AI生成入口](simulation/AI_GENERATION_ENTRY.md)** から、必要な設定・心理計算・現在セーブの読み方へ進みます。

| 内容 | 場所 |
|---|---|
| 会話の実行順 | [短縮運用ルール](simulation/AI_CONVERSATION_RULES.md) |
| セーブ・記録の読み書き | [保存運用仕様](simulation/AI_SAVE_WORKFLOW.md) |
| 共通恋愛ルール | [恋愛ルール](js/renaigame_romance_rules.js) |
| 心理計算 | [心理パラメーター](js/renaigame_psychology_parameters.js) |
| 現在のセーブ | `namiyukuta-cmd/private-game-data` の `renaigame/simulation/saves/<saveId>.json` |
| 旧形式のセーブ | 同リポジトリの `renaigame/simulation/save.json` |

## 相手ごとの設定

| 相手 | 人物設定 | 行動設定 | 新規周回の初期値 |
|---|---|---|---|
| アレクサンダー・クロス | [人物](simulation/js/simulation_character_001.js) | [行動](simulation/js/simulation_character_001_behavior.js) | [初期値](simulation/state/templates/char_001_initial_state.json) |
| エリオット・グレイ | [人物](simulation/js/simulation_character_002.js) | [行動](simulation/js/simulation_character_002_behavior.js) | [初期値](simulation/state/templates/char_002_initial_state.json) |
| フローリアン・ブレンナー | [人物](simulation/js/simulation_character_003.js) | [行動](simulation/js/simulation_character_003_behavior.js) | [初期値](simulation/state/templates/char_003_initial_state.json) |
| マテオ・ルッソ | [人物](simulation/js/simulation_character_004.js) | [行動](simulation/js/simulation_character_004_behavior.js) | [初期値](simulation/state/templates/char_004_initial_state.json) |

初期値は新規周回で状態がないときだけ使います。現在の心理・実ログはセーブごとに保持します。`simulation/state/simulation_character_XXX_state.json` と `simulation/record/` は移行前の資料です。

## 囚人との文通

[PRISONを開く](https://namiyukuta-cmd.github.io/renaigame/prison/prison.html) ／ [ファイル一覧](prison/)
