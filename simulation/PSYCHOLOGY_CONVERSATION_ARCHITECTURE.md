# 恋愛ゲーム：心理計算・会話生成・履歴保存の正式構造

この文書は、恋愛相手の心理計算・会話生成・履歴保存の設計正本。
他スレッドでもこの構造を基準にする。

## 1. 中心原則

恋愛相手は、単純な好意度だけで動かさない。

```text
固定性格
＋ 積み重なった過去
＋ 現在心理
＋ 今回の主人公入力
＋ 共通心理計算
↓
今回の会話ステータス
↓
ChatGPTが攻略対象・NPC・環境だけを文章生成
```

AIがその場の感覚だけで人格・感情・行動を作り直してはいけない。

## 2. 変更しない固定データ

### `simulation/js/simulation_character_XXX.js`
攻略対象本人の固定人物情報・性格・価値観・恋愛傾向・嫉妬傾向・独占欲・プライド・愛着傾向・積極性・拒絶への弱さ・感情表現傾向など。

通常会話では上書きしない。

### `simulation/js/simulation_character_XXX_behavior.js`
その人物固有の行動傾向。

同じ心理値でも、
- 怖くても近づく
- 一度黙ってから戻る
- 問いただす
- 嫉妬を表へ出す
- 意地を張る
など、人物ごとの違いを決める。

通常会話では上書きしない。

### `js/renaigame_psychology_parameters.js`
全攻略対象共通の心理計算基盤。

心理パラメーター、固定性格値、normalize、複雑心理計算、各evaluate関数を持つ。
会話ごとに書き換えない。壊さない。呼び出して使う。

主な計算：
- `normalizeState`
- `evaluateRomanceOnset`
- `evaluateConflict`
- `evaluateApproachAvoidance`
- `evaluateAttachmentTension`
- `evaluateRepairDrive`
- `evaluateIntimacyInitiative`

## 3. 変化する心理状態

固定性格とは別に、現在の心理状態を持つ。

例：
`seekHeroine / attachment / trust / fearOfLoss / abandonmentFear / jealousy / possessiveness / hurt / sadness / anger / resentment / longing / repairDrive / reassuranceSeeking / needForClarity / physicalNeed / passion / embraceImpulse / kissImpulse / reluctanceToPart / privateTimeWish / reason / selfControl / ethics / guilt / shame / pride / anxiety / ambivalence / unresolvedEmotion`

矛盾する値は同時に存在してよい。
信頼が高くても嫉妬してよい。愛していても怒ってよい。触れたくても自制してよい。

## 4. セーブ内の正式構造

各 `statesByCharacter[characterId]` は、最終的に次の2層を持つ。

### `currentState`
現在の最新心理状態。
次Turnの計算開始地点。
これは最新値へ更新してよい。

### `stateHistory`
Turnごとの心理変化履歴。
原則追記のみ。過去Turnを後から新しい値へ上書きしない。

推奨Turn形式：

```json
{
  "turn": 14,
  "scene": "Chapter 4",
  "input": "主人公の今回入力全文",
  "before": {
    "seekHeroine": 80,
    "hurt": 40,
    "fearOfLoss": 55
  },
  "change": {
    "seekHeroine": 3,
    "hurt": 18,
    "fearOfLoss": 22
  },
  "after": {
    "seekHeroine": 83,
    "hurt": 58,
    "fearOfLoss": 77
  },
  "evaluation": {
    "romanceOnset": {},
    "conflict": {},
    "approachAvoidance": {},
    "attachmentTension": {},
    "repair": {},
    "intimacy": {}
  }
}
```

Turn 14の結果をTurn 13へ書き戻してはいけない。

## 5. 旧セーブ互換

旧セーブで `statesByCharacter[characterId]` がflatなstateの場合、生成時はそのflat stateを現在値として読んでよい。

明示的な保存指示が来た時に、新形式へ移行する場合は、
- 旧flat stateを `currentState` の初期値として保持する
- `stateHistory` を追加する
- 過去の確定ログ・既存データを削除しない
- 移行のために人物設定・心理基盤を書き換えない

既存プレイを壊す一括変換はしない。

## 6. 1Turnの正式処理順

```text
主人公の最新入力を現在スレッドから受け取る
↓
現在saveIdを読む
↓
currentState / stateHistory / 会話実ログを読む
↓
character.js を読む
↓
behavior.js を読む
↓
renaigame_romance_rules.js を読む
↓
renaigame_psychology_parameters.js を読む
↓
今回の主人公入力が、この人物の固定性格と現在stateにどう響いたかを心理変化量へ変換
↓
before + change から新しいstateを作る
↓
normalizeState
↓
evaluateRomanceOnset
evaluateConflict
evaluateApproachAvoidance
evaluateAttachmentTension
evaluateRepairDrive
evaluateIntimacyInitiative
↓
固定character・behavior・更新後state・evaluate結果から「今回の会話ステータス」を確定
↓
ChatGPTはそのステータスに従って攻略対象・NPC・環境だけを生成
↓
ユーザーが保存を指示した時だけ
currentState更新
＋ stateHistory追記
＋ 会話実ログ追記
```

重要：前Turnのstateでevaluateしてから今回入力を見るのは禁止。
必ず「今回入力 → 心理変化 → 新state → normalize/evaluate」の順。

## 7. 今回の心理変化

ChatGPTは今回入力そのものだけではなく、
- 固定性格
- 現在state
- 過去から残る感情
- 直近・重要実ログ
を使って、今回の心理変化量を決める。

例：

```text
hurt +8
fearOfLoss +15
anger +3
repairDrive +6
jealousy +0
```

同じ主人公入力でも、攻略対象によって変化量は違う。

## 8. 一時的な計算場所

そのTurnだけ、
`currentState + latestInput + change + characterTraits + behavior + psychologyEngine`
を統合して計算する。

この作業領域自体をGitHubへ別ファイルとして保存する必要はない。

## 9. 会話ステータス

更新後stateとevaluate結果を、そのTurnの文章生成条件として固定する。

ChatGPTは計算後に、
- 心理をやり直す
- `seekHeroine` を都合よく下げる
- behaviorを無視する
- 理性が高いから恋愛感情を消す
- 怒っているから愛情を消す
- 傷ついたから主人公を求めなくする
などの上書きをしてはいけない。

## 10. 生成対象

ChatGPTが新規生成してよい：
- 攻略対象の台詞・行動・心理
- NPC
- 環境・場面描写

ChatGPTが主人公について勝手に生成してはいけない：
- 台詞
- 行動
- 心理
- 感情
- 身体反応
- 表情
- 受諾・拒否
- 未設定プロフィール

## 11. 保存

ユーザーが「記録と情報更新」「状態更新」「GitHubに保存」「記録して」「このChapterを保存」等を指示した時だけChatGPTが保存する。

保存時：
- `currentState` = 今回のafterへ更新
- `stateHistory` = 今回Turnを追記
- `recordsByCharacter[characterId]` = 主人公入力全文＋攻略対象返答全文を追記・統合
- evaluate結果 = 今回Turnの履歴へ保存

GitHub自身が自動で判断・生成・保存するのではない。

## 12. 上書き規則

- 固定character → 通常会話では上書き禁止
- 固定behavior → 通常会話では上書き禁止
- 心理計算基盤 → 通常会話では上書き禁止
- stateHistory → 追記のみ
- 会話実ログ → 確定済み内容を改変しない
- currentState → 最新値へ更新可

## 13. 一言での正式構造

```text
最新主人公入力
↓
現在セーブ
↓
固定character
↓
固定behavior
↓
共通心理エンジン
↓
今回の心理変化
↓
新currentState
↓
normalize / evaluate
↓
今回の会話ステータス
↓
AI文章生成
↓
明示保存時だけ
currentState更新 + stateHistory追記 + 実ログ追記
```
