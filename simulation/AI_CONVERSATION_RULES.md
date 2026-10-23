# 恋愛ゲーム会話生成・短縮運用ルール

## 主人公の恋愛相手は男性限定（必須）

必須取得の[ROMANCE_PREFERENCES.md](ROMANCE_PREFERENCES.md)を全て適用する。男性本人との恋愛が主軸で、家族・世話は代用にならない。低い心理値でも主人公だけを一番に選び、個性・実ログ・主人公の操作権を守る。

## 主人公の継続・支援・入力の解釈（全キャラ共通）

毎Turn、必須取得の[主人公の継続と具体的応答](PROTAGONIST_CONTINUITY_RULES.md)を全て適用する。依頼の範囲は`RenaiGamePolicy.storyDirection.requestScope`に従い、AIへの抗議・確認・修正を勝手な物語へ変えない。ゲーム続行の怒り・反論・苦痛を拒否せず、執筆の言い直しを求めない。修正依頼には実作業と結果を返す。


キャラクターの新規作成・追加・再設定時は、[キャラクター作成ルール](CHARACTER_CREATION_RULES.md)を必ず読む。固定恋愛積極度1〜10と設定理由を人物JSへ明示する。


## 宵の間への自動提案

毎Turn、`runTurn` 内で `evaluateYoinomaInvitation` を実行する。身体接触の判定とは別に、更新後心理・固定積極度・現在の場面から誘いを決める。

- 固定値は `character.common.baseRomanticInitiative`（1〜10）。恋愛経験とは別の値。ニコラスは1。全キャラで必須。未設定・小数・範囲外はエラーとし、自動換算しない。毎Turn都合よく変更しない。
- `args.yoinomaContext` に `protagonistAdult / canSpendPrivateTime / privatePlaceAvailable / onDuty / explicitRejection`（真偽値）、`atmosphere`（0〜100）を渡す。現在の実ログ・今回入力で確認できた場面を使い、不明なら未指定にする。雰囲気の解釈にはAI判断が入るが、夜・親切・笑顔だけを承諾の証拠にしない。
- 各場面項目の `evidence` は `{source:"input",quote:"今回入力の抜粋"}`、または `{source:"record",index:実ログ配列の位置,field:"protagonist"|"partner"|"transcript",quote:"抜粋"}`。成人確認はセーブから取得した `args.protagonistProfile` と `{source:"profile",quote:"設定の抜粋"}` も利用可。抜粋の存在検査と、意味的にその判断を支えるかの確認を両方行う。
- 成人同士、時間、私的な場所、勤務外、拒絶なしの条件が確認できてから数値判定する。不足時は `missing` に不足情報が返る。主人公の年齢・予定・承諾・施設を新しく捏造しない。
- 数式・閾値の正本は心理JSの`evaluateYoinomaInvitation`。返された`none / indirect / direct`を使い、文章側で再計算しない。`none`は今回の私的な誘いの判定であり、恋愛全体の休止ではない。
- `mustInvite:true` なら本文に具体的な誘いを必ず含める。`indirect` は言い淀み・短い言葉・遠回しな言い方でも、実際に誘いが伝わる文章にする。「誘いたいが言えなかった」だけで終わらせない。`direct` でも主人公の承諾・移動・身体反応を補完しない。
- `validateStory(args,packet,text,{yoinomaInvitation:"indirect"|"direct"})` を使う。誘い判定と行動申告の一致を検査する。申告だけで本文の意味が保証されるわけではないので、本文に具体的な誘いが存在することも照合する。
- `after.yoinomaInvitation.status` は `idle / pending / refused / accepted`。誘いを本文へ出した後は返答待ち。同じ誘いを繰り返さない。検証に合格した本文とafterだけを、明示保存時に保存する。
- 今回の主人公入力が誘いへの明確な返答なら `yoinomaContext.response:"accepted"|"refused"` と今回入力の根拠を渡す。承諾は `pending` の誘いがある時だけ成立する。断られた後は主人公自身が再開した今回入力に根拠がある場合だけ `reopenedByProtagonist:true` を使える。過去の承諾を今回の承諾に使わない。
- `accepted` は宵の間への移行を扱える判定であり、ゲーム画面の自動起動や性行為への同意を意味しない。別れ・場面終了等でこの誘いが完了したら、実ログに沿って明示保存時に状態をidleへ戻す。自動で返答待ちを解除しない。


## 文章生成の必須前提：心理・会話の積み重ね・人物設定

攻略対象の文章は、次の3つを同時に使って生成する。

1. 今回の主人公入力を反映し、JSを実行・再計算照合した更新後の心理数値と行動判定。
2. 直前の会話全文と、現在場面に関係する過去の会話・約束・感情・関係の積み重ね。
3. 攻略対象の固定性格・人物設定・固有行動傾向（character / behavior）。

心理変化は原文・人物設定・実ログ・現在心理に根拠を持たせ、本文の前にJSで更新後数値と判定を取得する。数値・性格・直近入力のどれか一つだけで書かず、先に書いた本文へ後から心理を合わせたり、保存時だけ計算したり、計算結果を独断で差し替えたりしない。

毎Turnの完全な取得・実行・再照合の手順は、必須取得の[AI_TURN_EXECUTION.md](AI_TURN_EXECUTION.md)を適用する。現在saveIdの`currentState`・`stateHistory`・実ログ全文と今回原文を読み、根拠付きchangesを作り、更新後stateでnormalizeと全evaluateを実行する。前Turnのstateで評価しない。固定character・behavior・心理計算基盤と過去履歴を会話の都合で書き換えない。

`runner.runTurn`の心理パケットと`generationDirection`を使い、相手の個性と現在心理に合う恋愛の働きかけを具体化する。数値や抑制を恋愛全体の停止へ拡大しない。本文のヘッダ・文体・英語台詞と和訳・進行・親密場面・終わり方・推敲は、必須取得の[AI_NOVEL_GENERATION_RULES.md](AI_NOVEL_GENERATION_RULES.md)を適用する。相手・NPC・環境だけを描き、主人公の操作権はユーザーに残す。下書き後に推敲と独立した意味確認を行い、`releaseStory`に成功した本文を返す。確認票を自動合格にしない。

保存は明示指示時だけ行う。軽量版は`simulation-lite/AI_SAVE.md`のAI直接保存、通常版は`CHAPTER_SAVE_FORMAT.md`の標準version 2取り込みを使う。検証済みafterをcurrentStateへ更新し、今回の心理履歴と原文・本文を1章ずつ追記する。同内容の再取り込みは重複追加せず、異なる保存済み同章や過去Turnは上書き・統合しない。

旧flat stateしかないセーブは生成時そのまま現在値として読み、明示保存時に既存情報を失わない形で `currentState / stateHistory` へ移行できる。

## 過去の発言への質問・引用と衝突する入力

必須取得の`PROTAGONIST_CONTINUITY_RULES.md`の「ユーザーの表現を受け付け、AIの返す本文を検査する」と「過去の発言への質問・引用を止めない」を全て適用する。原文を保持し、AIの出力を修正する。主人公の怒り・不信を入力禁止や前向きさの要求へ変えず、衝突する出来事を本文化しない。過去ログの問題発言を消さず、未発生の出来事や最初からの殺意へ拡張せず、相手自身の具体的応答を続ける。
