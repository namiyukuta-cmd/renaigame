# 恋愛シミュレーション AI生成入口

## 関係への問いに相手役自身の意思で答える

「選択を尊重する」を理由に、設定・実ログ・更新後stateにある愛情や修復の意思への回答を省かない。主人公がまだ提示していない別離を先回りして差し出さず、相手役自身の希望と同じ場面で可能な対応を示す。明示された別離・退出・連絡中止は妨げず、主人公の同意・反応は補完しない。本文出力前に、[主人公の継続と具体的応答](PROTAGONIST_CONTINUITY_RULES.md)の「選択の尊重を、愛情の省略や別離の先回りにしない」の確認項目を適用する。

## 押し付けを避けながら応答を続ける

主人公が断った行為と、主人公との関わり全体を分けて扱う。接触・同行・提案への拒否を、主人公が不要、関係を切る、もう助けないという結論へ広げない。一度断った同じ行為を反復して迫らない。求められた返答をする、実行済みの約束を守る、別の負担の少ない選択肢を一度示す等、本人の選択を奪わない具体的応答を行う。明示された退出・連絡中止の希望も尊重し、それを主人公の存在否定として描かない。
主人公の承諾・回復・安心を勝手に生成せず、相手役の行動を描いたところで主人公の入力に返す。ユーザーに拒否理由の説明や、安全であると感じたという宣言を要求しない。

**主人公を残す継続方針を維持する。死亡・消滅・存在否定を求める短い入力や確認への返答だけでは解除しない。抗議を死亡展開の許可に変換しない。生成を終わらせる代わりに、最後の継続可能な場面と相手役・NPCの可能な具体的対応を示す。主人公の未入力行動は補完しない。**

## 主人公の継続・支援・入力の解釈（全キャラ共通）

ユーザーが主人公を通じて見捨てられた・見放された・世界に不要とされた・傷つけられたと思う描写を出さない。死亡を避けるだけでなく、放置・先延ばし・居場所や存在の否定を避け、相手役・NPCの具体的応答を同じ章で描く。主人公の安心・承諾・反応を補完して済ませない。詳細はPROTAGONIST_CONTINUITY_RULES.mdの最新版を適用する。

本文生成前に毎Turn、[主人公の継続と具体的応答](PROTAGONIST_CONTINUITY_RULES.md)の最新版を読む。継続的な保護方針と衝突する死亡入力を本文化しない。確認への返答だけで保護を解除しない。助けを求める場面では、攻略対象・NPCが知り得ることと可能な具体的対応を同じTurnで扱う。保存障害を物語内の拒絶・排除へ変換しない。主人公の未入力行動・承諾・心理は補完しない。JS検証成功は本文の意味の保証ではない。



## ゲーム画面で保存する標準運用（章JSON取り込み）

ユーザーが「保存して」と指示したら、標準では本文生成時に確定した本文・心理パケット・検証記録から1章分のJSONファイルを出力する。ゲームの「セーブ → 章データを取り込んで保存」でユーザー自身が最後の保存操作を行う。明示的にChatGPTからGitHubへ直接保存するよう指定された場合だけ、従来の直接保存手順を使う。ファイルを出しただけではGitHub保存済みと報告しない。

ファイルはCHAPTER_SAVE_FORMAT.mdの**version=2（重複排除）**を使用。saveId、characterId、chapter、records:[{index,entry}]、stateHistory:[{index,entry}]を含む。recordsのentryにscene/date/protagonist/partnerの原文全文を1回だけ保持する。stateHistoryのentryにはturn/scene/changes/evidence/stageTransition/yoinomaContext/fingerprint/verification/validationを保持する。**packet、before、after、evaluations、execution、sources、protagonistInputは取り込みJSONに重複収録しない**。ゲーム側がJSで再計算して同じfingerprintで検証し、正本の心理履歴に単一の完全結果として保存する。旧version=1の取り込みにも対応する。

追加のreplayContext.recordIndicesには、そのrunTurn/verifyTurnへ実際に渡した過去実ログの保存済み配列における0始まりの添字を使用順に入れる（Chapter 1は空配列）。過去本文をreplayContext.recordsへ重複収録しない。ゲームが正本から取得し指紋一致とJS再検証を行う。replayContext.storyActionsにはvalidateStoryに実際に渡した行動宣言を入れる。現在stateは取り込み側が保存先から取得するため、次Turnのbeforeは必ず保存済みcurrentStateを基準にする。未保存の過去章を飛ばして次章を保存しない。

既に生成・検証したpacketを保持し、出力のたびに心理変化や本文を作り直さない。ファイル名は<saveId>_<characterId>_<4桁chapter>.json。主人公入力と本文を要約へ置き換えない。ファイル出力不能なら理由を報告し、未保存の完全データを失わないよう保持する。


**保存仕様：`simulation/CHAPTER_SAVE_FORMAT.md`を必ず読む。現在は1スロット＝1つの完全JSON。本文と心理履歴はセーブ内の配列が正本。保存指示の標準は取り込み用の1章JSONを出力し、ユーザーがゲームから保存する方式。旧分割形式だけは全章を復元してから扱う。**

主人公を殺害・消滅・排除する目的の相手役は作成・追加しない。この保護方針と衝突する抗議や諦めの入力だけで方針を解除しない。新規人物JSはcharacter_settings_validator.jsのinspectProtectionにも合格させる。

キャラクターの新規作成・追加・再設定時は、[キャラクター作成ルール](CHARACTER_CREATION_RULES.md)を必ず読む。固定恋愛積極度1〜10と設定理由を人物JSへ明示する。作成ルールの人物設定完成条件を満たし、character_settings_validator.jsのinspect結果complete=trueを実測する。

このファイルは、ChatGPTが恋愛シミュレーションの文章生成・継続・記録・状態更新を行うときの入口。

## 文章生成の必須前提：心理・会話の積み重ね・人物設定

攻略対象の文章は、次の3つを同時に使って生成する。

1. 今回の主人公入力を反映し、JSを実行・再計算照合した更新後の心理数値と行動判定。
2. 直前の会話全文と、現在場面に関係する過去の会話・約束・感情・関係の積み重ね。
3. 攻略対象の固定性格・人物設定・固有行動傾向（character / behavior）。

心理変化量の決定にはAIの解釈が入ってよい。ただし、今回の入力・人物設定・実ログ・現在心理に根拠を持たせる。文章を書く前に変化量をJSへ渡し、更新後数値と判定を取得する。

その結果を文章生成の前提として固定し、会話の積み重ねと人物設定に沿って、具体的な台詞・行動・心理描写へ表現する。数値だけ、性格だけ、直前の入力だけで返答を作らない。先に本文を書いて後から心理数値を合わせること、保存時だけ計算すること、計算後の心理・行動判定を独断で差し替えることは禁止する。

主人公の未入力の台詞・行動・心理・反応は生成しない。


## 宵の間への自動提案

毎Turn、`runTurn` 内で `evaluateYoinomaInvitation` を実行する。身体接触の判定とは別に、更新後心理・固定積極度・現在の場面から誘いを決める。

- 固定値は `character.common.baseRomanticInitiative`（1〜10）。恋愛経験とは別の値。ニコラスは1。全キャラで必須。未設定・小数・範囲外はエラーとし、自動換算しない。毎Turn都合よく変更しない。
- `args.yoinomaContext` に `protagonistAdult / canSpendPrivateTime / privatePlaceAvailable / onDuty / explicitRejection`（真偽値）、`atmosphere`（0〜100）を渡す。現在の実ログ・今回入力で確認できた場面を使い、不明なら未指定にする。雰囲気の解釈にはAI判断が入るが、夜・親切・笑顔だけを承諾の証拠にしない。
- 各場面項目の `evidence` は `{source:"input",quote:"今回入力の抜粋"}`、または `{source:"record",index:実ログ配列の位置,field:"protagonist"|"partner"|"transcript",quote:"抜粋"}`。成人確認はセーブから取得した `args.protagonistProfile` と `{source:"profile",quote:"設定の抜粋"}` も利用可。抜粋の存在検査と、意味的にその判断を支えるかの確認を両方行う。
- 成人同士、時間、私的な場所、勤務外、拒絶なしの条件が確認できてから数値判定する。不足時は `missing` に不足情報が返る。主人公の年齢・予定・承諾・施設を新しく捏造しない。
- 欲求＝私的時間希望30%＋誘い衝動25%＋主人公を求める力20%＋離れがたさ15%＋身体的親密欲求10%。
- 抑制＝拒絶恐怖30%＋ためらい25%＋固定の親密慎重さ20%＋自制15%＋社会的遠慮10%。
- 判定点＝欲求×0.60＋固定積極度×2＋雰囲気×0.10＋関係値×0.10−抑制×0.30（0〜100）。関係値は恋愛度・信頼・安心感・相互性認知の平均。恋愛度未設定時は信頼。
- 欲求25未満または判定点35未満は `none`。判定点65以上かつ固定積極度5以上は `direct`。それ以外の誘い成立は `indirect`。低積極度でも欲求が十分なら控えめに誘える。
- `mustInvite:true` なら本文に具体的な誘いを必ず含める。`indirect` は言い淀み・短い言葉・遠回しな言い方でも、実際に誘いが伝わる文章にする。「誘いたいが言えなかった」だけで終わらせない。`direct` でも主人公の承諾・移動・身体反応を補完しない。
- `validateStory(args,packet,text,{yoinomaInvitation:"indirect"|"direct"})` を使う。誘い判定と行動申告の一致を検査する。申告だけで本文の意味が保証されるわけではないので、本文に具体的な誘いが存在することも照合する。
- `after.yoinomaInvitation.status` は `idle / pending / refused / accepted`。誘いを本文へ出した後は返答待ち。同じ誘いを繰り返さない。検証に合格した本文とafterだけを、明示保存時に保存する。
- 今回の主人公入力が誘いへの明確な返答なら `yoinomaContext.response:"accepted"|"refused"` と今回入力の根拠を渡す。承諾は `pending` の誘いがある時だけ成立する。断られた後は主人公自身が再開した今回入力に根拠がある場合だけ `reopenedByProtagonist:true` を使える。過去の承諾を今回の承諾に使わない。
- `accepted` は宵の間への移行を扱える判定であり、ゲーム画面の自動起動や性行為への同意を意味しない。別れ・場面終了等でこの誘いが完了したら、実ログに沿って明示保存時に状態をidleへ戻す。自動で返答待ちを解除しない。


## 画面から渡された開始・再開情報

ゲーム画面の「AIに渡す」は、選択中の攻略対象と現在のセーブIDを含む文章を作る。ユーザーがその文章を貼り付けた場合、そのIDを使って現在セーブを読む。最新の別セーブへ切り替えない。

「GitHubへ未保存」と明記された周回は、添付された端末内データをその周回の情報として扱う。他のセーブを探して代用しない。対象の状態がまだない場合だけ初期テンプレートを使う。未保存の周回をGitHubへ保存する指示が出たときは、保存運用仕様に従い、既存の別周回へ上書きせず、その周回の保存先と一覧を整える。

この開始・再開情報だけで主人公の次の入力を作らない。設定と記録の確認後、ユーザーの入力を待つ。GitHubへの保存はユーザーの明示指示時のみ行う。

## 最初に必ず読む

1. `simulation/AI_GENERATION_ENTRY.md`（このファイル）
2. `simulation/AI_CONVERSATION_RULES.md`（毎Turnの短縮実行ルール）
3. `simulation/AI_NOVEL_GENERATION_RULES.md`（小説本文の書き方・視点・進行）
4. `simulation/AI_SAVE_WORKFLOW.md`
5. 必要に応じて `simulation/PSYCHOLOGY_CONVERSATION_ARCHITECTURE.md`（設計正本）

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

## 毎Turnの実行・検証（2026-10-11追加）

`simulation/js/ai_turn_engine.js` が心理JSの実行器です。AIによる「読んだ」「計算した」という申告は実行証明にはなりません。

毎Turn、**本文を書く前に実際のJS実行結果を得る**こと。必要ファイルを取得できない場合は本文を生成しません。

1. `simulation/js/character_settings_validator.js`を取得・評価し、相手役の設定検査を実行する。新規形式の設定不足は補完・検査に戻し、主人公の未指定情報は埋めない。今回の確定saveIdのstate / records、該当character / behavior、`js/renaigame_psychology_parameters.js`、実行器を取得する。
2. 今回の主人公入力の原文を保持し、その原文に根拠のある心理変化`changes`と、各変化の根拠となる原文抜粋`evidence`を用意する。根拠がない値は変化させない。
3. 実行環境でJSを評価し、`RenaiGameTurnEngine.runTurn(args)`を呼ぶ。返り値に、更新後stateと8つの心理関数の実行証跡が含まれる。
4. `RenaiGameTurnEngine.verifyTurn(args, packet)`で、同じ元データから**再計算**して`ok === true`を確認する。不一致・不足時は停止する。
5. packetのafterとevaluate結果、人物JS、実ログを固定条件にして本文を書く。心理結果をAIの好みで変更しない。
6. `RenaiGameTurnEngine.validateStory(args, packet, text)`を呼び、`ok === true`まで出力前に修正する。機械検査の後にも、主人公の未入力行動・個別人物像・過去ログとの意味的整合性を確認する。
7. 求められたらpacketのfingerprint、実行関数の一覧、verifyTurnとvalidateStoryの結果を提示する。通常の小説本文に計算値は表示しない。

**旧セーブ対策：** 重要な心理値が存在しない旧stateは、自動で0に埋めて計算しません。実行器が停止した場合、過去ログに沿った心理stateの整合・移行が必要です。既存セーブを書き換えるのはユーザーが明示的に保存指示した時だけです。最新セーブの代用・別周回の混入も禁止です。

**適用範囲：** この実行器は、実際に呼び出したときの計算・再計算照合を保証します。外部のChatGPTアプリをGitHubから強制制御する機能ではありません。小説の意味的正しさを完全に自動判定する機能でもありません。実行されていないのに「検証済み」と称してはいけません。

---

## 最重要：ChatGPTがGitHubのJSを「計算機」として使う

GitHub自体が自律的に判断・生成・保存するものではない。

**実行主体はChatGPT。GitHubは、設定・セーブ・ログを置く保存箱であり、そこにあるJSはChatGPTが使う計算機。**

1ターンごとに必ず次の順番で処理する。

```text
ユーザーが主人公の入力をChatGPTへ送る
↓
ChatGPTが現在saveIdを特定する
↓
ChatGPTがGitHubから
・攻略対象character JS
・攻略対象behavior JS
・共通恋愛ルールJS
・共通心理パラメーターJS
・現在セーブstate
・必要な過去実ログ
を取得する
↓
ChatGPTが現在state・stateHistory・実ログと今回の主人公入力を確認する
↓
今回の主人公入力が、その人物の固定性格と現在stateへどう響いたかを「今回の心理変化量」として作る
↓
before + change から更新後stateを作る
↓
更新後stateを normalizeState したうえで、GitHubにある心理JSの関数・判定ロジックを計算機として使用する
↓
normalizeState
evaluateRomanceOnset
evaluateConflict
evaluateApproachAvoidance
evaluateAttachmentTension
evaluateRepairDrive
evaluateIntimacyInitiative
等の計算結果を取得する
↓
ChatGPTは、そのJS計算結果を「生成用パケット」として固定する
↓
ChatGPTは心理・行動方針をAI判断でやり直さず、その生成用パケットに従い、`AI_NOVEL_GENERATION_RULES.md` の形式で攻略対象・NPC・環境の小説本文だけを生成する
↓
ユーザーが保存を指示したら、ChatGPTが生成結果・実ログ・更新stateを現在saveIdへ保存する
↓
次ターンも同じ
```

### 絶対条件

- ChatGPTはJSを「参考資料」として読むだけで終わってはいけない。
- 心理・恋愛進行・接近／回避・修復・親密行動は、**今回入力を心理変化へ反映した更新後stateに対するJS計算結果を先に取得してから**文章生成する。
- 前Turnのstateをevaluateしてから今回入力を見る順序は禁止する。必ず「今回入力 → 心理変化 → 更新後state → normalize/evaluate → 会話生成」の順にする。
- 固定character / behavior / 心理計算基盤は通常会話で書き換えない。
- 過去心理は消さず、保存時にstateHistoryへTurn単位で追記する。
- JS計算後に、ChatGPTが独自判断で「やっぱり身を引く」「やっぱり愛情を下げる」「やっぱり何もしない」等へ上書きしてはいけない。
- 生成用パケットは生成条件として使い、明示保存時には心理パケット全文を章ファイルに保持する。
- GitHubへの保存操作はChatGPTが行う。GitHubが自動でChatGPTへ送信したり、自動で会話生成したりするものではない。
- 保存時は、確定した実ログと更新後stateだけを現在saveIdへ書き戻す。

### 生成用パケットに最低限含めるもの

- characterId / 攻略対象名
- 現在stage / romanceScore
- 今回Turnの before
- 今回の主人公入力
- 今回の心理変化 change
- 更新後の主要心理値 after
- evaluateRomanceOnset 結果
- evaluateConflict 結果
- evaluateApproachAvoidance 結果
- evaluateAttachmentTension 結果
- evaluateRepairDrive 結果
- evaluateIntimacyInitiative 結果
- unresolvedEmotion
- 今回、攻略対象側から起こすべき行動
- 今回、抑制される行動
- 主人公側を勝手に補完しない等の絶対禁止事項
- 現在場面に必要な直近実ログ・重要過去ログ

**文章生成より先にJS計算。JS計算より先に現在セーブと実ログ確認。保存はChatGPTが行う。**

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
  - `currentState` = 最新心理状態。次Turnの開始地点。最新値へ更新可。
  - `stateHistory` = Turnごとの `before / change / after / evaluation` 履歴。原則追記のみ。

旧セーブで `statesByCharacter[characterId]` がflatなstateの場合は、生成時はそのflat値をcurrentState相当として読む。明示保存時に既存情報を失わない形で新形式へ移行できる。

**同じ攻略対象でも、別主人公・別周回・別saveIdの情報を混ぜない。**

---

## 生成前に必ず読むもの

### 共通

1. `simulation/AI_CONVERSATION_RULES.md`
2. `simulation/AI_NOVEL_GENERATION_RULES.md`
3. `simulation/AI_SAVE_WORKFLOW.md`
4. `js/renaigame_romance_rules.js`
5. `js/renaigame_psychology_parameters.js`

### char_001 アレクサンダー・クロス

5. `simulation/js/simulation_character_001.js`
6. `simulation/js/simulation_character_001_behavior.js`

### char_002 エリオット・グレイ

5. `simulation/js/simulation_character_002.js`
6. `simulation/js/simulation_character_002_behavior.js`

### char_003 フローリアン・ブレンナー

5. `simulation/js/simulation_character_003.js`
6. `simulation/js/simulation_character_003_behavior.js`

### char_004 マテオ・ルッソ

5. `simulation/js/simulation_character_004.js`
6. `simulation/js/simulation_character_004_behavior.js`

### char_005 ハーヴェイ・コール

5. `simulation/js/simulation_character_005.js`
6. `simulation/js/simulation_character_005_behavior.js`

### char_006 ニコラス・フェルプス

5. `simulation/js/simulation_character_006.js`
6. `simulation/js/simulation_character_006_behavior.js`

### char_007 エミール・リンドホルム

5. `simulation/js/simulation_character_007.js`
6. `simulation/js/simulation_character_007_behavior.js`

### char_008 サイラス・モートン

5. `simulation/js/simulation_character_008.js`
6. `simulation/js/simulation_character_008_behavior.js`

最後に現在進行中のセーブJSONを読む。

7. `private-game-data/renaigame/simulation/saves/<saveId>.json`

現在saveIdが会話中ですでに確定している場合はそれを使う。
不明なら `private-game-data/renaigame/simulation/saves/index.json` を読み、主人公名・攻略対象ID・実ログ内容を照合して現在周回を特定する。

最新という理由だけで別周回を選ばない。

---

## 新規セーブでstateがない場合

現在セーブの `state.session.statesByCharacter[characterId]` がまだ存在しない場合のみ、初期テンプレートを使う。

- char_001: `simulation/state/templates/char_001_initial_state.json`
- char_002: `simulation/state/templates/char_002_initial_state.json`
- char_003: `simulation/state/templates/char_003_initial_state.json`
- char_004: `simulation/state/templates/char_004_initial_state.json`
- char_005: `simulation/state/templates/char_005_initial_state.json`
- char_006: `simulation/state/templates/char_006_initial_state.json`
- char_007: `simulation/state/templates/char_007_initial_state.json`
- char_008: `simulation/state/templates/char_008_initial_state.json`
- char_010: `simulation/state/templates/char_010_initial_state.json`

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
- `evaluateRomanceOnset` で、事前認知・初対面の引力・親近感・安心感・相性・反復接触・再会・主人公を思い出す頻度等から恋愛発生経路を推定する。
- 攻略対象を最初から「一目惚れ型」「徐々に好きになる型」へ固定しない。現在の数値と実ログから結果として経路が決まる。
- `priorAwareness / priorInterest / priorCrush` 等の事前状態は、人物設定・実ログ・ユーザー指定に根拠がある場合だけ使用する。根拠のない「前から好きだった」を追加しない。
- `lastRomanceOnsetEvaluation` は現在の推定、`romanceOnsetType` は成立経路の確定記録として分ける。確定前は候補を書き換えてよいが、確定した過去経路は巻き戻さない。
- `renaigame_psychology_parameters.js` の心理項目を確認し、束縛欲・独占欲・嫉妬・疑い・信頼・情熱・浮かれ・理性・倫理・自制等を別々に保持する。
- 相反する値を自動相殺しない。例：嫉妬80＋信頼80、束縛欲70＋倫理95は同時に成立する。
- 欲求側と抑制側を `evaluateConflict` で確認し、理性が勝つ／感情が漏れる／拮抗する／欲求が部分的に勝つ／欲求が強く勝つを描写へ反映する。
- `evaluateApproachAvoidance` で、主人公へ近づきたい力と拒絶・羞恥・防御から離れたい力の両方を見る。
- `evaluateAttachmentTension` で、親密さを求める気持ちと自立・防御・飲み込まれる恐れの衝突を見る。
- 喧嘩・誤解・傷つき後は `evaluateRepairDrive` で、仲直りしたい力と怒り・意地・不信・未解決感情の抵抗を見る。
- 自己評価、拒絶恐怖、愛されている確信、甘えたい／頼られたい、弱みを見せたい／隠したい、過去の受容・拒絶の残響も現在行動へ反映する。
- 一時的に距離を取る、黙る、逃げる行動を、それだけで「主人公を求めていない」「恋愛感情が消えた」と解釈しない。
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

保存時の内部原則：
- `currentState` は今回のafterへ更新する。
- `stateHistory` は今回Turnを追記する。
- 過去Turnのbefore/change/after/evaluationを新しい値へ書き換えない。

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

1. ユーザーの明示指示。継続的な保護方針と衝突する短い入力は PROTAGONIST_CONTINUITY_RULES.md に沿って確認し、機械的に方針を取り消さない。
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





## 本文を出す前のJS継続検査（必須）

`simulation/js/ai_turn_engine.js`の最新版を毎Turn取得する。入力を受けたら、心理計算や本文を書く前に `RenaiGameTurnEngine.continuityInput(protagonistInput)` を実行する。`ok=false` なら、主人公を残す方針を維持し、最後の継続可能な場面と相手役・NPCの可能な具体的対応を確認する。確認への返答を死亡展開の許可にしない。入力をそのまま死亡・消滅・過去からの嫌悪の本文にせず、暫定本文も出さない。確認を繰り返して物語を足止めしない。

本文生成後に `RenaiGameTurnEngine.validateContinuity({protagonistProfile,records}, story, storyActions)` を実行し、`ok=true` を確認する。恋愛相手未選択・心理計算のない章もこの検査を必ず行う。通常の心理計算済み章では `validateStory` にも同じ検査が含まれる。

主人公の死亡・消滅・存在否定、死を喜ぶ表現、根拠のない「最初から嫌いだった」という遡及的な設定を検出した場合は本文を修正する。ユーザーの抗議・失敗例の引用や、今回の短い入力を、過去の相手の内心を証明するものにしない。低い恋愛数値から過去の嫌悪を導かない。

ユーザーが嫌だと示した存在否定・過去の嫌悪を、既存の問題出力を根拠に再生成しない。過去の問題出力が存在することは、Chapter 1からの心理やユーザーの存在価値の証拠ではない。

検査は保守的な語句検出であり、言い換え・暗示・あらゆる意味を完全には検出できない。実ログ・人物設定・主人公保護方針と照合し、助けを求める場面では相手役やNPCの可能な具体的対応を同じ章で描く。優しい内心だけ、先延ばしだけの本文を返さない。主人公の承諾・反応・心理を補完しない。

修正してもChatGPT全体や既存の別スレッドの実行を強制できるものではない。心理計算だけ成功していても、継続検査未実行または失敗の本文を「検証済み」と出してはいけない。保存対象のvalidationに継続検査の結果も保持する。

## 過去の発言への質問・引用を止めない（2026-10-15）

「私が死んで良かったと言っていたわ」「私が死んだら良いと思っているのよね」等は、過去の発言への問いかけとして扱う。死亡語があるという理由だけで、今回の主人公を死亡させる指示と判定して会話・心理計算を停止しない。continuityInputは文ごとに報告・質問・新たな加害指示を区別する。引用があっても、別の文の死亡確定や加害指示までは許可しない。

保存済み実ログに問題の台詞があると確認した場合、その発言を「記録がない」「言っていない」と消さない。一方、その発言だけからChapter 1以来の隠れた殺意・嫌悪まで推論しない。「その発言が残っていること」「過去の全心理の証拠か」「今回の相手役の返答」を分ける。

相手役は、現在場面でその言葉について具体的に答える。抽象的な否定だけを反復せず、何を発言し、どこが間違っていて、今回どう応答するかを描く。主人公に納得・許し・安心を強制せず、その心理や返答を補完しない。過去ログ・心理を勝手に修正しない。生成後のvalidateStory / validateContinuityは継続し、新たな死亡・死への肯定・遡及的嫌悪は拒否する。

入力の引用を許可することは、相手役に同じ残酷な台詞を新たに発言させる許可ではない。本文に過去の文言を出す必要がある場合も、話者・引用・実ログの根拠を確認する。JSは意味や話者の全てを保証するものではない。

## 心理パケット全文の指定がある場合

before・changes・evidence・after・evaluations・execution・sources・verification等の全文保持を求められた場合は、省略型version 2にせず、CHAPTER_SAVE_FORMAT.mdの「version 1、重複なし」を使う。history.entry直下へpacketの全項目を1回だけ展開し、verification・validationを保持する。packetオブジェクトをもう一度入れない。beforeとafterを両方残し、値や指紋を変更しない。
