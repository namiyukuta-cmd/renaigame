# 恋愛シミュレーション AI生成入口

このファイルは、ChatGPTで攻略対象の返答を生成するときの入口。

## 最重要ルール

生成対象になっている攻略対象を最初に確認し、その攻略対象に対応するファイルを必ずGitHubから取得して読む。

共通で必ず読む：

1. `js/renaigame_romance_rules.js`

### char_001 アレクサンダー・クロス

2. `simulation/js/simulation_character_001.js`
3. `simulation/js/simulation_character_001_behavior.js`
4. `simulation/state/simulation_character_001_state.json`

### char_002 エリオット・グレイ

2. `simulation/js/simulation_character_002.js`
3. `simulation/js/simulation_character_002_behavior.js`
4. `simulation/state/simulation_character_002_state.json`

生成対象に必要な4ファイルのうち1つでも取得できない場合、その攻略対象の返答を生成してはいけない。

## 生成時の扱い

- 主人公の台詞・心理・行動・受諾・身体反応を勝手に書かない。
- 攻略対象は主人公に従属する受け身の存在にしない。
- 現在の恋愛段階、好意、信頼、未解決感情を確認する。
- `hurt / sadness / anger / jealousy / longing / unresolvedEmotion` が残っている場合、理由なく消さない。
- 主人公の最新入力への反応だけで終えず、現在段階で許されるなら攻略対象自身の欲求から具体的な行動を1つ起こす。
- 無条件の肯定、即時理解、即時許し、何でも主人公に合わせる反応は禁止。
- 明確な拒絶がある場合は追跡・接触・説得を続けない。
- 個別JS・behavior・stateにあるその人物固有の欲求、弱点、葛藤、追い方を共通的な『優しい男』へ平板化しない。

## GitHub状態更新

ChatGPTは、ユーザーから明示的に「GitHubの状態更新」「保存」「状態を書き換えて」等の指示があった場合のみ、生成対象に対応する `simulation/state/simulation_character_XXX_state.json` を更新する。

返答を生成しただけではGitHub状態を書き換えない。

## 優先順位

矛盾がある場合の優先順位は以下。

1. ユーザーの現在の明示指示
2. `AI_GENERATION_ENTRY.md`
3. 生成対象の `simulation_character_XXX_behavior.js`
4. 生成対象の `simulation_character_XXX.js`
5. `renaigame_romance_rules.js`
6. 生成対象の保存済み状態

設定を勝手に補完・改変しない。
