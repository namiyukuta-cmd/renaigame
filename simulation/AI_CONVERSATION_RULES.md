# 恋愛ゲーム会話生成・短縮運用ルール

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
