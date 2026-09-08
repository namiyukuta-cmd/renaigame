# 恋愛シミュレーション AI生成入口

このファイルは、ChatGPTで攻略対象の返答を生成するときの入口。

## 最重要：セーブJSONが正本

恋愛進行状態とChapter記録は、攻略対象ごとの共通ファイルに保存しない。

正本は `namiyukuta-cmd/private-game-data` の各セーブJSON。

保存場所：

`renaigame/simulation/saves/<saveId>.json`

旧形式のセーブだけは `renaigame/simulation/save.json`。

各セーブ内では以下を使う。

- `state.session.recordsByCharacter[characterId]` = そのセーブ・その攻略対象だけのChapter記録
- `state.session.statesByCharacter[characterId]` = そのセーブ・その攻略対象だけの恋愛進行状態

同じ攻略対象でも、別主人公・別周回・別saveIdの情報を混ぜない。

## 生成前に必ず読むもの

生成対象になっている攻略対象を確認する。

共通：

1. `js/renaigame_romance_rules.js`

攻略対象ごと：

### char_001 アレクサンダー・クロス

2. `simulation/js/simulation_character_001.js`
3. `simulation/js/simulation_character_001_behavior.js`

### char_002 エリオット・グレイ

2. `simulation/js/simulation_character_002.js`
3. `simulation/js/simulation_character_002_behavior.js`

### char_003 フローリアン・ブレンナー

2. `simulation/js/simulation_character_003.js`
3. `simulation/js/simulation_character_003_behavior.js`

最後に、現在進行中のセーブJSONを読む。

4. `private-game-data/renaigame/simulation/saves/<saveId>.json`

現在のsaveIdが会話中ですでに確定している場合はそのsaveIdを使う。
確定していない場合は `private-game-data/renaigame/simulation/saves/index.json` を読み、現在の主人公名・攻略対象ID・会話中のセーブと一致するものを特定する。

別セーブのstateや記録を「同じキャラだから」という理由で参照してはいけない。

## 新規セーブでまだ状態がない場合

`state.session.statesByCharacter[characterId]` がまだ存在しない新規セーブでは、次の初期テンプレートを使う。

- char_001: `simulation/state/templates/char_001_initial_state.json`
- char_002: `simulation/state/templates/char_002_initial_state.json`
- char_003: `simulation/state/templates/char_003_initial_state.json`

初期テンプレートは新しい周回を始めるためだけのもの。
プレイ中の進行状態を書き戻してはいけない。

`simulation/state/simulation_character_XXX_state.json` は旧方式で保存されたスナップショット／移行前バックアップであり、現在のセーブ状態として使用・更新しない。

## 過去章ログ（記憶）

現在セーブの `state.session.recordsByCharacter[characterId]` をそのセーブの会話記憶として扱う。

- 続きのChapterを生成する前に、少なくとも直前Chapterの記録を読む。
- 以前の台詞・行動・誤解・約束・未解決事項が現在章に関係する場合、その該当Chapterも読む。
- `protagonist` / `partner` / `transcript` に保存された実ログは `summary` より優先する。
- 過去ログに主人公が書いた台詞・心理・行動がある場合、それはユーザーがすでに確定した内容として参照してよい。
- ただし新しい主人公の台詞・心理・行動・受諾・身体反応をAIが追加してはいけない。
- `simulation/record/char_XXX_chapter_XXX.md` は旧方式の移行前バックアップ。新規Chapterの保存先に使わない。

## 生成時の扱い

- 主人公の台詞・心理・行動・受諾・身体反応を勝手に書かない。
- 攻略対象は主人公に従属する受け身の存在にしない。
- 現在セーブの恋愛段階、好意、信頼、未解決感情を確認する。
- `hurt / sadness / anger / jealousy / longing / unresolvedEmotion` が残っている場合、理由なく消さない。
- 主人公の最新入力への反応だけで終えず、現在段階で許されるなら攻略対象自身の欲求から具体的な行動を1つ起こす。
- 無条件の肯定、即時理解、即時許し、何でも主人公に合わせる反応は禁止。
- 明確な拒絶がある場合は追跡・接触・説得を続けない。
- 個別JS・behaviorにあるその人物固有の欲求、弱点、葛藤、追い方を共通的な「優しい男」へ平板化しない。

## 「記録と情報更新」「保存」「状態更新」と言われた場合

現在進行中のセーブJSONだけを更新する。

### Chapter記録

`state.session.recordsByCharacter[characterId]` に、そのChapterの記録を追加する。

可能な限り以下を保存する。

- `scene`: Chapter番号
- `date`: 日付
- `protagonist`: ユーザーが書いた主人公側本文の全文
- `partner`: AIが生成した攻略対象側本文の全文
- `transcript`: 旧記録など、主人公・攻略対象へ分離できない実ログ全文
- `summary`: 章の要約

主人公側も攻略対象側も、要約だけに置き換えて全文を捨てない。

### 恋愛進行状態

`state.session.statesByCharacter[characterId]` を更新する。

恋愛度・信頼・執着・嫉妬・傷つき・未解決感情・重要フラグ・履歴等は、現在セーブ内だけで更新する。

### 絶対にしないこと

- 別saveIdを更新しない。
- 同じ攻略対象の別主人公セーブを更新しない。
- `simulation/state/simulation_character_XXX_state.json` をプレイ進行で更新しない。
- `simulation/record/char_XXX_chapter_XXX.md` を新規ログ保存先にしない。
- 返答を生成しただけではGitHub状態を書き換えない。

## 優先順位

矛盾がある場合の優先順位：

1. ユーザーの現在の明示指示
2. `AI_GENERATION_ENTRY.md`
3. 現在セーブの実ログ `state.session.recordsByCharacter[characterId]`
4. 生成対象の `simulation_character_XXX_behavior.js`
5. 生成対象の `simulation_character_XXX.js`
6. `renaigame_romance_rules.js`
7. 現在セーブのstate要約・数値

実ログとstate要約が食い違う場合は実ログを優先し、次回の明示的な状態更新時に現在セーブのstateを整合させる。

設定を勝手に補完・改変しない。
