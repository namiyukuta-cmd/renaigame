# 恋愛シミュレーション AI生成・記録・状態更新 運用仕様

このファイルは、別スレッドを含むChatGPTが恋愛シミュレーションを継続するときの共通運用仕様。

**文章生成、Chapter記録、恋愛度・感情・フラグ更新を行う前に必ず読む。**

`simulation/AI_GENERATION_ENTRY.md` とこのファイルを入口とし、現在のセーブを正本として扱う。

---

## 1. データの役割

### renaigame リポジトリ

攻略対象本人の共通設定・行動ルール・恋愛共通ルール・新規周回用テンプレートを置く。

- 共通恋愛ルール
  - `js/renaigame_romance_rules.js`
- 攻略対象の人物設定
  - `simulation/js/simulation_character_XXX.js`
- 攻略対象固有の行動・恋愛進行ルール
  - `simulation/js/simulation_character_XXX_behavior.js`
- 新規セーブ用の初期stateテンプレート
  - `simulation/state/templates/char_XXX_initial_state.json`

これらは原則として**全周回共通**。

### private-game-data リポジトリ

プレイごと・主人公ごと・周回ごとの実データを置く。

正本：

`renaigame/simulation/saves/<saveId>.json`

セーブ一覧：

`renaigame/simulation/saves/index.json`

旧形式のみ：

`renaigame/simulation/save.json`

---

## 2. 最重要原則：進行データは saveId ごと

同じ攻略対象でも別主人公・別周回なら完全に別データ。

各セーブJSON内の以下が、その周回の正本。

```json
state.session.recordsByCharacter[characterId]
```

= Chapter実ログ・記憶。

```json
state.session.statesByCharacter[characterId]
```

= 恋愛度、信頼、執着、嫉妬、傷つき、未解決感情、重要フラグ、履歴などの現在状態。

**キャラクターIDだけで進行データを選んではいけない。必ず saveId まで一致させる。**

---

## 3. 現在セーブの特定方法

### A. 会話中に saveId が分かっている

その saveId をそのまま使う。

例：

`run_1788824156171_xgtk9t`

なら

`private-game-data/renaigame/simulation/saves/run_1788824156171_xgtk9t.json`

を読む。

### B. saveId が分からない

まず

`private-game-data/renaigame/simulation/saves/index.json`

を読む。

次の情報を照合する。

1. 現在の主人公名
2. `selectedCharacterId`
3. 攻略対象名
4. 現在会話で扱っているChapter番号・直近内容

同じ主人公＋同じ攻略対象のセーブが複数ある場合、**最新という理由だけで決めない**。
各候補セーブの `recordsByCharacter` を読み、現在会話の実ログと一致する周回を特定する。

別周回の内容を混ぜない。

---

## 4. 文章生成前に必ず読む順番

攻略対象の返答・次シーンを生成する前に、以下を読む。

### 共通

1. `simulation/AI_GENERATION_ENTRY.md`
2. `simulation/AI_SAVE_WORKFLOW.md`（このファイル）
3. `js/renaigame_romance_rules.js`

### 攻略対象別

4. `simulation/js/simulation_character_XXX.js`
5. `simulation/js/simulation_character_XXX_behavior.js`

### 現在周回

6. `private-game-data/renaigame/simulation/saves/<saveId>.json`

その中から最低限、次を確認する。

- `state.profile`
- `state.selectedCharacterId`
- `state.session.statesByCharacter[characterId]`
- `state.session.recordsByCharacter[characterId]`

### 過去ログ

次シーン生成時は少なくとも直前Chapterの実ログを読む。

現在のシーンに関係する過去の約束・台詞・誤解・傷つき・伏線がある場合は、その該当Chapterも読む。

要約だけで済ませず、実ログがある場合は実ログを優先する。

---

## 5. 新規セーブでstateがまだ無い場合

現在セーブに

`state.session.statesByCharacter[characterId]`

が存在しない場合のみ、対応する初期テンプレートを読む。

- char_001 → `simulation/state/templates/char_001_initial_state.json`
- char_002 → `simulation/state/templates/char_002_initial_state.json`
- char_003 → `simulation/state/templates/char_003_initial_state.json`

テンプレートは**初期値を作るためだけ**に使う。

プレイ進行後の値をテンプレートへ書き戻さない。

---

## 6. 文章生成時のルール

生成時は、現在セーブのstateと実ログを使う。

### 主人公

- 主人公の新しい台詞を書かない。
- 主人公の新しい心理を書かない。
- 主人公の新しい行動・選択・受諾・拒否を書かない。
- 主人公の身体反応を勝手に決めない。
- 主人公の未設定プロフィールを補完しない。
- 過去ログにユーザーが実際に書いた主人公情報は確定済み情報として参照してよい。

### 攻略対象

- 攻略対象は主人公に従属しない。
- 性格・価値観・欲求・弱点・怒り・悲しみ・嫉妬・傷つきを持つ。
- 現在段階に応じて自分から話しかける、誘う、確認する、距離を詰める等の自発行動を行う。
- 主人公の希望を常に肯定しない。
- 傷つきや怒りを一返答で勝手に消さない。
- `unresolvedEmotion` を理由なく解消しない。
- 明確な拒絶があれば追跡・説得・接触を続けない。
- キャラ固有behaviorを一般的な「優しい男」に薄めない。

### 状態参照

最低限、以下を確認して生成へ反映する。

- stage / stageName
- romanceScore
- trust
- attachment
- romanticAwareness
- jealousy
- hurt
- sadness
- anger
- longing
- desireForContact
- vulnerability
- futureThinking
- unresolvedEmotion
- importantFlags
- history

キャラ固有state項目がある場合はそれも確認する。

---

## 7. 生成しただけでは保存しない

ユーザーがChapter本文を送ってAIが続きを生成しただけでは、GitHubの進行状態を更新しない。

以下のような明示指示があった場合のみ保存する。

- 「記録と情報更新」
- 「状態更新」
- 「GitHubに保存」
- 「記録して」
- 「このChapterを保存」

明示指示なしで恋愛度やstateを書き換えない。

---

## 8. 「記録と情報更新」と言われた時の処理順

### Step 1. 現在saveIdを再確認

更新対象が本当に現在周回のセーブか確認する。

### Step 2. 最新のセーブJSONを再取得

書き込み直前に

`private-game-data/renaigame/simulation/saves/<saveId>.json`

を再取得する。

古いコピーを使って他の記録を上書きしない。

### Step 3. Chapter実ログを保存

保存先：

`state.session.recordsByCharacter[characterId]`

推奨形式：

```json
{
  "scene": "Chapter 1",
  "date": "YYYY-MM-DD",
  "protagonist": "ユーザーが書いた主人公側本文の全文",
  "partner": "AIが生成した攻略対象側本文の全文",
  "summary": "この章の要約"
}
```

主人公側・攻略対象側へ分離できない旧ログは：

```json
{
  "scene": "Chapter 1",
  "transcript": "実ログ全文",
  "summary": "必要なら要約"
}
```

### Step 4. 同じChapterの重複を防ぐ

同じ `scene` / Chapter番号の記録がすでに存在する場合、新しい別エントリを無条件で追加しない。

- 同じChapterの続きまで含めた完全版に更新する。
- 既存全文を削らず、新しく確定したやりとりを統合する。
- Chapter1が二つ、Chapter2が二つ、という重複状態を作らない。

### Step 5. 攻略対象stateを更新

保存先：

`state.session.statesByCharacter[characterId]`

更新対象例：

- stage / stageName
- romanceScore
- trust
- attachment
- romanticAwareness
- jealousy
- hurt
- sadness
- anger
- longing
- desireForContact
- vulnerability
- futureThinking
- unresolvedEmotion
- lastChangeReason
- lastProgress
- lastSceneSummary
- importantFlags
- history
- キャラ固有フラグ

### Step 6. 数値は出来事に基づいて更新

恋愛度等をChapter数だけで機械的に上げない。

主人公の実際の言動が、その攻略対象の性格・価値観・現在関係にどう響いたかで判断する。

変化なしも正しい更新。

例：初対面で挨拶しただけなら、警戒段階・恋愛度0・信頼0を維持してよい。

### Step 7. historyを残す

state内 `history` にはChapterごとの進展概要を残す。

実ログ全文は `recordsByCharacter` が正本。

`history` は検索・状態把握用の要約であり、実ログの代わりではない。

### Step 8. セーブJSON全体を壊さず保存

現在セーブの他のキャラ記録、プロフィール、meta等を保持したまま更新する。

必要部分だけ変更し、他フィールドを欠落させない。

---

## 9. Chapterログで絶対に守ること

- ユーザー本文を勝手に要約だけへ置き換えない。
- AI生成本文も勝手に要約だけへ置き換えない。
- 実際に書かれた台詞を別の台詞へ改変しない。
- 後から「そう言ったことにする」をしない。
- 未確定事項を確定事項として保存しない。
- 主人公の意図・恋愛感情・裏事情はユーザーが明示していない限り推測保存しない。

実ログとstate要約が矛盾する場合、**実ログを優先**する。

次の明示的な状態更新時にstate要約を実ログへ合わせる。

---

## 10. 別スレッドから再開する時

別スレッドでは会話履歴だけを信用せず、GitHubを読む。

処理：

1. `simulation/AI_GENERATION_ENTRY.md` を読む。
2. `simulation/AI_SAVE_WORKFLOW.md` を読む。
3. 現在の主人公・攻略対象を確認する。
4. `private-game-data/.../saves/index.json` から該当saveIdを特定する。
5. 該当セーブJSONを読む。
6. 攻略対象のcharacter JS / behavior JS / 共通恋愛ルールを読む。
7. セーブ内の現在stateと直近Chapter実ログを読む。
8. その続きとして生成する。

これにより、別スレッドでも同じ周回の恋愛度・出来事・実際の台詞を引き継ぐ。

---

## 11. 旧ファイルの扱い

以下は移行前バックアップ・旧方式。

- `simulation/state/simulation_character_XXX_state.json`
- `simulation/record/char_XXX_chapter_XXX.md`

新規生成時の現在state・新規Chapter保存先として使わない。

必要な旧データがまだ現行セーブへ移行されていない場合のみ、移行元として確認する。

移行後は現在セーブJSONを正本にする。

---

## 12. 書き込み先を間違えないための確認表

| 内容 | 読む場所 | 更新する場所 |
|---|---|---|
| 共通恋愛ルール | `js/renaigame_romance_rules.js` | 通常更新しない |
| キャラ人物設定 | `simulation/js/simulation_character_XXX.js` | 設定変更指示時のみ |
| キャラ行動ルール | `simulation/js/simulation_character_XXX_behavior.js` | 設定変更指示時のみ |
| 新規周回初期state | `simulation/state/templates/char_XXX_initial_state.json` | プレイ進行では更新しない |
| Chapter実ログ | 現在saveの `recordsByCharacter[characterId]` | 同じ場所 |
| 恋愛度・感情・進行state | 現在saveの `statesByCharacter[characterId]` | 同じ場所 |
| セーブ特定 | `private-game-data/.../saves/index.json` | 通常はゲーム側が更新 |
| 旧共有state | `simulation/state/simulation_character_XXX_state.json` | 更新しない |
| 旧共有Chapter | `simulation/record/...` | 新規保存しない |

---

## 13. 優先順位

矛盾時：

1. ユーザーの現在の明示指示
2. 現在セーブの実ログ
3. `simulation/AI_GENERATION_ENTRY.md`
4. `simulation/AI_SAVE_WORKFLOW.md`
5. 対象キャラbehavior
6. 対象キャラ人物設定
7. 共通恋愛ルール
8. 現在セーブのstate要約・数値

ただし、ユーザー未指定の主人公設定をAIが補完してよい、という意味にはならない。

---

## 14. 一言での原則

**キャラ設定は renaigame、プレイした出来事と恋愛進行は saveId ごとの private-game-data。生成時は両方読む。保存時は現在saveIdだけを書き換える。**
