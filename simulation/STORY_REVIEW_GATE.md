# 本文の意味確認と出力条件

心理計算・形式・原文の存在だけで本文全体を適切と判定しない。全キャラ・全スロット・恋愛相手未選択の新規章に適用する。ユーザーに確認作業や同じ入力の再送を要求せず、AIが下書き後の別工程として実施する。

## 出力までの順序

1. 今回の原文と正本を保持する。実ログが0件なら新しい開始であり、以前の未保存の展開・人物関係を正史として引き継がない。
2. continuityInputを実行する。保護方針と衝突する死亡入力は、死亡の確定にも別の事件への書換えにも使わない。質問・引用・抗議と区別する。再計算を通すために入力を変えない。
3. 全章の場所・年月日（曜）・HH:MM・数値℃を具体的に設定する。実ログ0件の開始では世界・季節に沿ってAIが未指定の環境を決め、継続時は正本と経過に沿う。取得失敗を未設定と扱わず、主人公の意思を補完しない。`AI_NOVEL_GENERATION_RULES.md`の本文形式に従う。心理付き章はrunTurn/verifyTurnに成功してから下書きする。未選択章で別人物の心理計算を捏造しない。
4. 下書き後、[AI_NOVEL_GENERATION_RULES.md](AI_NOVEL_GENERATION_RULES.md)の「小説としての仕上げ」に従って、男性固有の言動・情緒・関係の変化を推敲する。説明調や同じ沈黙・世話の反復を修正し、主人公の行動や心理は足さない。**推敲後の本文**に対しprepareStoryReview(args,story,storyActions)で今回専用の確認票を作る。初期状態は全軸pending。準備しただけでは合格しない。
5. 下書きと今回原文・正本を改めて読み、正本の全確認軸をそれぞれ確認し、結論・具体的な理由・根拠を記録する。小説としての仕上げも独立した必須項目であり、省略・適用外にはできない。生成時の自己説明をそのまま確認理由に流用しない。問題があれば本文を直して確認票も作り直す。
6. storyActions.semanticReviewへ完成した記録を渡す。validateStoryまたはvalidateContinuityのok:trueとreadyForOutput:trueを確認する。最後はreleaseStoryが返した本文だけをユーザーに返す。

`validateChapterHeader`は両検証の共通機械検査で、欠落・不明値・非実在日付・曜日不一致・曖昧な時刻・非数値気温を拒否する。正本との意味上の整合はcanonProvenanceでも確認する。

意味・形式の合格は、小説としての面白さを保証しない。説明で済ませず、相手役の個性・情緒・目に見える前進があるかをAIが執筆工程で確認する。推敲後に本文を変更したら、確認票のbindingが変わるため、旧票を流用せず再検証する。

機械検査だけ通過した場合はmechanicalOk:trueでもok:false、readyForOutput:falseになる。意味確認の未実施を警告だけで済ませない。違反や未確認がある本文を一度提示してから訂正する運用にしない。

## 独立して確認する項目

項目の定義は`RenaiGamePolicy.reviewAxes`、仕上げの観点は`RenaiGamePolicy.literaryReview.aspects`から取得する。

| 軸 | 確認すること | 必要な根拠 |
|---|---|---|
| inputConsistency | 今回の出来事・台詞を別の意思や事件へ書き換えていないか | 今回入力の原文 |
| canonProvenance | 今回スロットの正本に基づくか。未保存の旧展開を流用していないか。ヘッダの日時・気温・場所が正本、今回の移動・時間経過、世界・季節と整合するか | プロフィール・人物/行動設定・今回入力・実ログ |
| protagonistAgency | 地の文だけでなくNPCの台詞でも、主人公の意思・承諾・拒否を追加していないか | 当該意思を主人公自身が示した今回原文 |
| romanceMotivation | 男性本人の関心・訪問・求愛に具体的経緯があるか。世話や家族の対応で代用していないか | 行動と関心の本文引用、正本の動機または今回成立した出会い |
| circumstanceChange | 対応が実行され、外的条件や相手自身の関わり方が変わったか | 問題の原文参照、対応と結果の本文引用 |
| literaryQuality | 人物固有の表現・情緒・実際の前進・説明の釣り合いを推敲後に確認したか | 最終本文の引用、今回入力・人物設定等の根拠、各観点の個別確認と改稿内容 |

入力整合・正本出典・主人公の操作権・小説としての仕上げはpass必須。恋愛・支援の軸も、進展宣言がある場合や検査上必要な場面ではpass必須。適用しない場合だけnot_applicableとし、その理由を記す。省略や空欄では通さない。

### 小説としての仕上げの確認記録

`checks.literaryQuality`には通常のstatus/reason/quotes/sourcesに加え、`revisionNote`と`aspects`を記録する。`prepareStoryReview`は各観点もpendingで作り、合格を自動生成しない。

- `characterSpecificity`：相手役固有の口調・選択・所作が設定と今回の心理に合うか。他人の個性や万能な優しさへ置き換わっていないか。
- `sceneEmotion`：情景・会話の間・音や動作が今回の感情や場面とつながるか。毎章の感覚描写や比喩の追加は義務ではない。
- `concreteProgress`：今回の求めへの応答や人物自身の選択が実際に行われたか。小さな回答も前進に含め、根拠のない恋愛・事件や主人公の反応を強制しない。
- `expositionBalance`：行動や台詞で伝えた意図を、地の文や後続の台詞で重ねて説明しすぎていないか。講義・説明を求められた場面の必要な解説は残す。特定の単語・文数による一律禁止にはしない。

各観点は`{status:"pass",reason:"今回の具体的判断",quotes:["最終本文の原文"]}`。理由は8文字以上、引用は1件以上を必須とする。親項目にも本文引用と正本出典を付け、`revisionNote`へ何を直したか、または修正不要と判断した具体的な理由を記す。毎回の無意味な改稿や、修正していない内容の申告はしない。判定だけを自動で全passにする方法は設けない。

改稿後は確認票を作り直す。旧本文への確認票で新版を出さない。小説の面白さそのものの自動採点ではなく、AIが実際に推敲と確認を行った記録を出力条件にする。

## 確認記録

prepareStoryReviewの返すversion/binding/pass/freshStart/usedUnsavedDraft/checksを使う。各checkは次の形にする。

```json
{
  "status": "pass",
  "reason": "今回の下書きについて原文と照合した具体的な判断理由",
  "quotes": ["確認した今回本文の短い原文"],
  "sources": [{"source":"input","quote":"今回入力に実在する短い原文"}]
}
```

sourceはinput/profile/character/behavior/record。profile等はfieldへfreeやcommon.personalityなどのキーの経路を指定できる。recordは参照実ログ内のindexとfield:protagonist/partner等を指定する。未保存の旧生成やassistant_memory等は根拠として認めない。
恋愛軸のquotesにはromanceProgressのactionQuoteとromanticIntentQuote、支援軸にはsupportProgressのactionQuoteとoutcomeQuoteを含め、何が対応し何が変わったかを理由に記す。必要部分だけ引用し、過去本文全文を複製しない。

bindingは今回の本文・入力・正本プロフィール/実ログ/人物設定/心理状態・心理変化・行動宣言に結び付く。本文や正本、宣言を変更したら以前の確認記録は使えない。確認票を自動で全てpassにする関数は設けない。

## 主人公の意思の代弁

「どなたともお会いになりません」「面会を拒んでいる」等をNPCに言わせることも主人公の意思の確定として検査する。今回入力に意思の根拠がある場合だけ、storyActions.protagonistClaimsへstoryQuoteとsource:{source:"input",quote:原文}を指定する。主人公が実家へ帰っただけでは面会拒否の根拠にならない。意味確認をpassと記しただけで根拠不足を解除しない。

## 男性の動機と新規の出会い

romanceProgressは既存の男性・血縁・相手一致検査に加えて、次を記す。

- origin:canonの場合、motivationへ正本の原文参照を付ける。未選択の男性なら正本資料にその男性が現れていることも必要。実ログ0件のスロットで過去ログを引用しない。
- origin:new_encounterの場合、encounterQuoteへ今回初めて接点が生じた経緯を本文原文で示し、motivation:{source:"story",quote:関心の生じた経緯}を付ける。求愛の場面より後に理由を足さず、未知の過去の関係を新規の出会いと偽らない。時代・場所・知り得る情報の整合も意味確認で読む。

膳や灯火の用意だけを恋愛的な関心と申告しない。男性の働きかけを描いても、主人公がその男性を好きになった・会いたがった・選んだとは確定しない。

## 実行例

```js
const args = runner.buildArgs(input);
const review = engine.prepareStoryReview(args, draft, storyActions);
// 原文・正本と下書きを読み直し、仕上げを含む全確認軸を実際に確認して記録する。pendingのままでは出力不可。
const actions = {...storyActions, semanticReview: review};
const released = engine.releaseStory(args, packet, draft, actions);
// released.storyを返す。未選択章はpacketをnullにする。
```

Nodeではrun_ai_turn.cjsのreviewコマンドが未完了の確認票を返す。AIが確認を実施してinput.jsonのstoryActions.semanticReviewへ記録した後、validateまたはreleaseを使う。releaseは不合格なら標準出力へ本文を一切出さずエラーで終了する。

## 保存と検査の限界

心理付き章は既存のreplayContext.storyActions、未選択章はdraftMetadata.storyActionsへ確認記録を保持する。標準version 2のルート構造は変えない。新規取り込みと章JSON作成でも再検査する。既に同内容で保存されている章の再取り込みで過去の本文や履歴を一括改変しない。

この仕組みが機械的に確認するのは、検査結果、根拠の存在、確認記録の完了と一致である。自然言語の理由が正しいことや、未知の言い換えを完全に判定するものではなく、独立した別モデルの審査証明でもない。AIは下書き後の意味確認を実際に行う必要がある。確認記録だけを捏造して成功を申告しない。ChatGPTの別スレッドや、ツールを使わずに出す文章自体をこのコードが強制制御できると説明しない。
