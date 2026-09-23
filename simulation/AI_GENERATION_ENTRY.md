# 恋愛シミュレーション AI生成入口

このファイルは、ChatGPTが恋愛シミュレーションの文章生成・継続・記録・状態更新を行うときの入口。

## 最初に必ず読む

1. `simulation/AI_GENERATION_ENTRY.md`（このファイル）
2. `simulation/AI_SAVE_WORKFLOW.md`

`AI_SAVE_WORKFLOW.md` が、以下の詳細な運用仕様を定める。

- 現在セーブの特定方法
- 文章生成前に読むファイルと順番
- Chapter実ログの保存方法
- 恋愛度・感情・フラグ等のstate更新方法
- 同じChapterの重複防止
- 別主人公・別周回を混ぜない方法
- 別スレッドから再開する方法
- 旧共有state / 旧recordの扱い

この2ファイルを読まずに、過去の記憶だけで生成・保存してはいけない。

---

## 最重要：セーブJSONが正本

恋愛進行状態とChapter記録は、攻略対象ごとの共通ファイルに保存しない。

正本は `namiyukuta-cmd/private-game-data` の各セーブJSON。

保存場所：

`renaigame/simulation/saves/<saveId>.json`

旧形式のセーブだけは：

`renaigame/simulation/save.json`

各セーブ内：

- `state.session.recordsByCharacter[characterId]` = そのセーブ・その攻略対象だけのChapter実ログ
- `state.session.statesByCharacter[characterId]` = そのセーブ・その攻略対象だけの恋愛進行状態

**同じ攻略対象でも、別主人公・別周回・別saveIdの情報を混ぜない。**

---

## 生成前に必ず読むもの

### 共通

1. `simulation/AI_SAVE_WORKFLOW.md`
2. `js/renaigame_romance_rules.js`
3. `js/renaigame_psychology_parameters.js`

### char_001 アレクサンダー・クロス

4. `simulation/js/simulation_character_001.js`
5. `simulation/js/simulation_character_001_behavior.js`

### char_002 エリオット・グレイ

4. `simulation/js/simulation_character_002.js`
5. `simulation/js/simulation_character_002_behavior.js`

### char_003 フローリアン・ブレンナー

4. `simulation/js/simulation_character_003.js`
5. `simulation/js/simulation_character_003_behavior.js`

最後に現在進行中のセーブJSONを読む。

6. `private-game-data/renaigame/simulation/saves/<saveId>.json`

現在saveIdが会話中ですでに確定している場合はそれを使う。
不明なら `private-game-data/renaigame/simulation/saves/index.json` を読み、主人公名・攻略対象ID・実ログ内容を照合して現在周回を特定する。

最新という理由だけで別周回を選ばない。

---

## 新規セーブでstateがない場合

現在セーブの `state.session.statesByCharacter[characterId]` がまだ存在しない場合のみ、初期テンプレートを使う。

- char_001: `simulation/state/templates/char_001_initial_state.json`
- char_002: `simulation/state/templates/char_002_initial_state.json`
- char_003: `simulation/state/templates/char_003_initial_state.json`

テンプレートは新規周回の初期値専用。
プレイ中の状態を書き戻さない。

`simulation/state/simulation_character_XXX_state.json` は旧方式のスナップショット／移行前バックアップであり、現在stateとして使用・更新しない。

---

## 過去章ログ（記憶）

現在セーブの `state.session.recordsByCharacter[characterId]` を、その周回の会話記憶として扱う。

- 続きのChapter生成前に、少なくとも直前Chapterの実ログを読む。
- 現在シーンに関係する過去の約束・台詞・誤解・傷つき・伏線がある場合、その該当Chapterも読む。
- `protagonist` / `partner` / `transcript` の実ログは `summary` より優先する。
- 過去ログにユーザーが書いた主人公の台詞・心理・行動は確定済み内容として参照してよい。
- 新しい主人公の台詞・心理・行動・受諾・身体反応をAIが追加してはいけない。

`simulation/record/char_XXX_chapter_XXX.md` は旧方式の移行前バックアップ。新規Chapterの保存先には使わない。

---

## 生成時の扱い

- 主人公の台詞・心理・行動・受諾・身体反応・未設定プロフィールを勝手に作らない。
- 攻略対象は主人公に従属する受け身の存在にしない。
- 現在セーブの恋愛段階、恋愛度、信頼、感情、未解決事項を確認する。
- `seekHeroine` を最優先の恋愛駆動値として確認する。恋愛段階が進んでいるのに理由なく低値へ戻して受け身化しない。
- `renaigame_psychology_parameters.js` の心理項目を確認し、束縛欲・独占欲・嫉妬・疑い・信頼・情熱・浮かれ・理性・倫理・自制等を別々に保持する。
- 相反する値を自動相殺しない。例：嫉妬80＋信頼80、束縛欲70＋倫理95は同時に成立する。
- 欲求側と抑制側を `evaluateConflict` で確認し、理性が勝つ／感情が漏れる／拮抗する／欲求が部分的に勝つ／欲求が強く勝つを描写へ反映する。
- 親密さの場面では `evaluateIntimacyInitiative` も確認し、その人物が自分から行けるか、遠回しになるか、寸前で止まるかを性格と現在状態から決める。
- 成人同士では、実際の性行為を露骨に描かなくても、自宅へ誘う、帰したくないと伝える、もっと二人でいたいと匂わせる等のより深い親密さを望むニュアンスを出してよい。
- 段階・性格・状況が許せば、攻略対象側から髪や手に触れる、抱きしめる、キスする等の軽い接触を起こしてよい。主人公側の受諾・反応は補完しない。
- `hurt / sadness / anger / jealousy / longing / unresolvedEmotion` を理由なく消さない。
- 現在段階で可能なら、攻略対象自身の欲求から具体的な行動を起こす。
- 無条件の肯定、即時理解、即時許し、何でも主人公に合わせる反応は禁止。
- 明確な拒絶がある場合は追跡・接触・説得を続けない。
- 個別JS・behaviorにあるその人物固有の欲求・弱点・葛藤・追い方を一般的な「優しい男」へ平板化しない。

---

## 生成しただけではGitHubを更新しない

文章を生成しただけではChapter記録・恋愛度・stateを書き換えない。

ユーザーから明示的に、例えば以下の指示があった場合のみ更新する。

- 「記録と情報更新」
- 「状態更新」
- 「GitHubに保存」
- 「記録して」
- 「このChapterを保存」

更新手順は `simulation/AI_SAVE_WORKFLOW.md` の「記録と情報更新」と言われた時の処理順に従う。

---

## 保存時の絶対条件

現在進行中の **1つのsaveIdだけ** を更新する。

Chapter実ログ：

`state.session.recordsByCharacter[characterId]`

恋愛進行state：

`state.session.statesByCharacter[characterId]`

絶対にしない：

- 別saveIdを更新する。
- 同じ攻略対象の別主人公セーブを更新する。
- `simulation/state/simulation_character_XXX_state.json` をプレイ進行で更新する。
- `simulation/record/char_XXX_chapter_XXX.md` を新規ログ保存先にする。
- ユーザー本文・AI本文を要約だけに置き換えて実ログを捨てる。
- 未確定事項を確定事項としてstateへ保存する。

---

## 優先順位

矛盾がある場合：

1. ユーザーの現在の明示指示
2. 現在セーブの実ログ `state.session.recordsByCharacter[characterId]`
3. `simulation/AI_GENERATION_ENTRY.md`
4. `simulation/AI_SAVE_WORKFLOW.md`
5. 対象キャラの `simulation_character_XXX_behavior.js`
6. 対象キャラの `simulation_character_XXX.js`
7. `renaigame_romance_rules.js`
8. `js/renaigame_psychology_parameters.js`
9. 現在セーブのstate要約・数値

実ログとstate要約が食い違う場合は実ログを優先し、次回の明示的状態更新時にstateを整合させる。

主人公の未指定設定をAIが補完してはいけない。

---

## 一言での原則

**キャラ設定は renaigame、プレイした出来事・Chapter全文・恋愛進行は saveId ごとの private-game-data。生成時は両方読む。保存時は現在saveIdだけを書き換える。**
