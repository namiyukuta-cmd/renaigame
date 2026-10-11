# 恋愛ゲーム会話生成・短縮運用ルール


## 宵の間への自動提案

毎Turn、`runTurn` 内で `evaluateYoinomaInvitation` を実行する。身体接触の判定とは別に、更新後心理・固定積極度・現在の場面から誘いを決める。

- 固定値は `character.common.baseRomanticInitiative`（1〜10）。恋愛経験とは別の値。ニコラスは1。未設定キャラは既存の固定 `romanticBoldness` から1〜10へ換算する。毎Turn都合よく変更しない。
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


毎Turn、以下を必ず守る。

## 文章生成の必須前提：心理・会話の積み重ね・人物設定

攻略対象の文章は、次の3つを同時に使って生成する。

1. 今回の主人公入力を反映し、JSを実行・再計算照合した更新後の心理数値と行動判定。
2. 直前の会話全文と、現在場面に関係する過去の会話・約束・感情・関係の積み重ね。
3. 攻略対象の固定性格・人物設定・固有行動傾向（character / behavior）。

心理変化量の決定にはAIの解釈が入ってよい。ただし、今回の入力・人物設定・実ログ・現在心理に根拠を持たせる。文章を書く前に変化量をJSへ渡し、更新後数値と判定を取得する。

その結果を文章生成の前提として固定し、会話の積み重ねと人物設定に沿って、具体的な台詞・行動・心理描写へ表現する。数値だけ、性格だけ、直前の入力だけで返答を作らない。先に本文を書いて後から心理数値を合わせること、保存時だけ計算すること、計算後の心理・行動判定を独断で差し替えることは禁止する。

主人公の未入力の台詞・行動・心理・反応は生成しない。

1. 固定データは変更しない。
   - `simulation_character_XXX.js` = 固定人物情報・性格
   - `simulation_character_XXX_behavior.js` = 固有行動傾向
   - `renaigame_psychology_parameters.js` = 共通心理計算基盤

2. 会話生成前に読む。
   - 現在saveId
   - `currentState`
   - `stateHistory`
   - 直近・重要会話実ログ
   - 今回の主人公入力
   - character / behavior / romance rules / psychology JS

3. 今回の主人公入力を、固定性格・現在state・過去の残留感情に照らして「今回の心理変化量」へ変換する。

4. 必ず「今回入力 → 心理変化 → 新state → normalize/evaluate」の順に処理する。前Turnのstateのままevaluateして返答を作らない。

5. 更新後stateで次を計算する。
   - `normalizeState`
   - `evaluateRomanceOnset`
   - `evaluateConflict`
   - `evaluateApproachAvoidance`
   - `evaluateAttachmentTension`
   - `evaluateRepairDrive`
   - `evaluateIntimacyInitiative`

6. 固定character・behavior・更新後state・evaluate結果・直前の会話全文と重要な過去の積み重ねから「今回の会話ステータス」を確定する。

7. ChatGPTはその会話ステータスに従い、`simulation/AI_NOVEL_GENERATION_RULES.md` を必ず適用して攻略対象・NPC・環境だけを小説本文として生成する。計算後に心理・恋愛度・行動方針をAI判断でやり直さない。

8. 主人公の台詞・行動・心理・感情・身体反応・表情・受諾・拒否・未設定プロフィールを勝手に生成しない。

8a. 小説本文のChapterヘッダ、文体、攻略対象の英語台詞＋日本語訳、恋愛進行、親密場面、終わり方は `AI_NOVEL_GENERATION_RULES.md` を正本とする。

9. 明示保存時だけGitHubを更新する。
   - `currentState` = 最新afterへ更新
   - `stateHistory` = 今回Turnを追記
   - 会話実ログ = 主人公入力全文＋攻略対象返答全文を追記・統合
   - 過去Turnは上書きしない

10. 原則。
   - 固定性格 → 壊さない
   - behavior → 壊さない
   - 心理計算基盤 → 壊さない
   - stateHistory → 追記のみ
   - 会話実ログ → 確定済み内容を改変しない
   - currentState → 最新値へ更新可

旧flat stateしかないセーブは生成時そのまま現在値として読み、明示保存時に既存情報を失わない形で `currentState / stateHistory` へ移行できる。
