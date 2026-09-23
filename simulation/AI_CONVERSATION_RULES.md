# 恋愛ゲーム会話生成・短縮運用ルール

毎Turn、以下を必ず守る。

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

6. 固定character・behavior・更新後state・evaluate結果から「今回の会話ステータス」を確定する。

7. ChatGPTはその会話ステータスに従って攻略対象・NPC・環境だけを生成する。計算後に心理・恋愛度・行動方針をAI判断でやり直さない。

8. 主人公の台詞・行動・心理・感情・身体反応・表情・受諾・拒否・未設定プロフィールを勝手に生成しない。

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
