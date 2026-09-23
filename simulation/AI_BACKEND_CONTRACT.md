# 恋愛シミュレーション AIバックエンド契約

この仕様は、GitHub Pages上の恋愛ゲームと外部AIバックエンドを接続するための契約。

目的は、人格・心理・恋愛進行の決定権をAIへ渡さないこと。

- AI：主人公入力の事実ラベル化、文章生成、生成文検査
- JS：心理数値更新、恋愛進行判定、接近／回避、理性／欲求、修復、親密行動の決定
- GitHub/private-game-data：セーブ時の正本
- ブラウザ：現在プレイ中のローカルstateと実ログ

## 1. セキュリティ

GitHub PagesへAIサービスの秘密鍵を置かない。

禁止：
- HTMLへAPIキーを直書き
- JSへAPIキーを直書き
- 公開リポジトリへAPIキーをcommit
- ブラウザから秘密鍵付きでAIサービスへ直接接続

ブラウザはAIバックエンドURLだけを知る。秘密鍵はバックエンドの環境変数に置く。

## 2. エンドポイント

ブラウザ側は simulation/js/simulation_ai_bridge.js。

設定値は localStorage の renaigame_ai_backend_url_v1、または window.RENAIGAME_AI_BACKEND_URL。

同じHTTP(S)エンドポイントへPOSTし、actionで処理を分ける。

共通リクエスト：

~~~json
{
  "contractVersion": 1,
  "action": "analyze | generate | validate",
  "payload": {}
}
~~~

共通レスポンス：

~~~json
{
  "contractVersion": 1,
  "result": {}
}
~~~

エラー：

~~~json
{
  "contractVersion": 1,
  "error": "エラーメッセージ"
}
~~~

## 3. action = analyze

主人公の自由入力を、観察可能な事実と会話シグナルへ変換するだけ。

AIは攻略対象の心理数値、恋愛度、行動を決めない。

入力例：

~~~json
{
  "contractVersion": 1,
  "action": "analyze",
  "payload": {
    "character": {
      "id": "char_004",
      "name": "マテオ・ルッソ",
      "roleLabel": "ミリアの夫"
    },
    "protagonistInput": "「愛していないんでしょう」",
    "recentRecords": []
  }
}
~~~

出力例：

~~~json
{
  "contractVersion": 1,
  "result": {
    "analysisVersion": 1,
    "observedFacts": [
      "主人公が攻略対象に、愛されていない可能性を問いかけた"
    ],
    "signals": {
      "affection": 0,
      "praise": 0,
      "trust": 0,
      "vulnerability": 55,
      "reassuranceRequest": 90,
      "relationshipQuestion": 95,
      "distancing": 10,
      "rejection": 0,
      "explicitRefusal": 0,
      "breakupThreat": 15,
      "conflict": 45,
      "accusation": 45,
      "apology": 0,
      "repairOffer": 0,
      "jealousyTrigger": 0,
      "rivalPresence": 0,
      "intimacyInvitation": 0,
      "affectionateTouch": 0,
      "kissSignal": 0,
      "futureCommitment": 0,
      "uncertainty": 75,
      "absence": 0,
      "returnAfterDistance": 0
    },
    "flags": {
      "boundaryClear": false,
      "containsMetaInstruction": false
    }
  }
}
~~~

全signalsは0〜100。

AIが返してよいのは入力側の事実とシグナルだけ。

seekHeroine、romanceScore、hurtDelta等の心理変更値を返してはいけない。返ってもブラウザ側は使用しない。

## 4. JS心理更新

simulation/js/simulation_state_engine.js がanalyzeのsignalsを受け取る。

ここで初めて、hurt、fearOfLoss、jealousy、repairDrive、seekHeroine、trust、intimacy等を変更する。

変更量は攻略対象の psychologyTraits と現在stateからJSが決定する。

その後JSが以下を実行する。

- evaluateRomanceOnset
- evaluateConflict
- evaluateApproachAvoidance
- evaluateAttachmentTension
- evaluateRepairDrive
- evaluateIntimacyInitiative

AIはこの判定を上書きできない。

## 5. action = generate

JSで心理更新・行動判定が終わった後、その結果を自然な文章へ変換する。

入力の中心例：

~~~json
{
  "psychology": {
    "relevantState": {
      "seekHeroine": 83,
      "attachment": 86,
      "hurt": 74,
      "fearOfLoss": 89,
      "anger": 46,
      "repairDrive": 82,
      "pride": 78
    },
    "derived": {
      "conflict": {
        "outcome": "desire_partly_wins"
      },
      "approachAvoidance": {
        "mode": "approach_with_fear"
      },
      "repair": {
        "mode": "repair_conflicted"
      },
      "intimacy": {
        "mode": "indirect_signal"
      }
    },
    "actionPlan": {
      "mode": "active",
      "must": [
        "拒絶不安を抱えたまま自分から近づく",
        "仲直りしたい気持ちと意地の両方を出す"
      ]
    }
  }
}
~~~

AIの仕事：
- キャラクター固有の話し方へ変換
- 攻略対象の視線、間、姿勢、声、行動を書く
- NPC・環境を書く
- JSが選んだ葛藤を自然な文章にする

AIにさせないこと：
- 心理数値変更
- romanceScore変更
- stage変更
- 主人公の新規台詞生成
- 主人公の新規行動生成
- 主人公の心理・身体反応生成
- actionPlanを無視した人格変更

出力：

~~~json
{
  "contractVersion": 1,
  "result": {
    "partnerText": "攻略対象・NPC・環境だけで構成された本文",
    "summary": "このターンで実際に起きた内容の短い要約",
    "header": {
      "chapter": 3,
      "place": "南イタリアの港町・夫婦の家",
      "date": "2026年9月20日（日）",
      "time": "19:18",
      "temperatureC": 25
    }
  }
}
~~~

禁止フィールド：
- protagonistDialogue
- protagonistAction
- protagonistPsychology
- protagonistReaction
- protagonistBodyReaction
- stateDeltas
- psychologyDeltas

## 6. action = validate

生成本文を表示・記録する前の検査。

検査項目：
1. 主人公の未入力台詞を作っていない
2. 主人公の未入力行動を作っていない
3. 主人公の心理・身体反応を作っていない
4. キャラクター固有JSに反していない
5. actionPlanを逆転させていない
6. 明確な拒絶後に接触・説得・追跡を続けていない
7. 感情を突然消して受け身化していない
8. 主人公を不要・脇役へ固定していない

合格：

~~~json
{
  "contractVersion": 1,
  "result": {
    "ok": true,
    "violations": []
  }
}
~~~

修正可能：

~~~json
{
  "contractVersion": 1,
  "result": {
    "ok": false,
    "violations": [
      "主人公の行動を1箇所補完している"
    ],
    "repairedText": "違反箇所を除去した攻略対象側本文",
    "repairedSummary": "修正版に一致する要約"
  }
}
~~~

修正不能なら repairedText を返さず、ゲーム側はその生成を表示・記録しない。

## 7. 1ターンの実行順

~~~text
主人公入力
  ↓
POST analyze
  ↓
事実・signals
  ↓
simulation_state_engine.js
  ↓
心理値を決定論的に更新
  ↓
心理評価6種
  ↓
actionPlan
  ↓
POST generate
  ↓
攻略対象本文
  ↓
POST validate
  ↓
合格または修正版
  ↓
ローカルsessionへ
  ・主人公実入力全文
  ・攻略対象本文全文
  ・要約
  ・更新後state
  を保存
  ↓
ユーザーがゲームの「セーブ」を押す
  ↓
private-game-dataへ保存
~~~

AI生成だけでGitHubへ直接書き込まない。

## 8. ローカルsession

既存キー：renaigame_simulation_session_v1

~~~json
{
  "id": "run_xxx",
  "recordsByCharacter": {
    "char_004": []
  },
  "statesByCharacter": {
    "char_004": {}
  }
}
~~~

1ターン成立後、ブラウザ側ではローカルsessionを更新する。

GitHubへの永続保存は既存セーブボタンで行う。

## 9. stateの優先権

AI出力よりJS stateを優先する。

優先順位：
1. ユーザーが実際に入力した主人公本文
2. 保存済み実ログ
3. キャラクター固有JS / behavior JS
4. 共通恋愛ルール
5. 共通心理モデル
6. JSが計算した現在state・derived・actionPlan
7. AI文章

AI文章が1〜6に反した場合、AI文章を不採用にする。

## 10. 明確な拒絶

analyze.signals.explicitRefusal が70以上の場合、JSは boundaryState.active をtrueにし、pursuitDriveと身体接触系衝動を0にする。

ただし attachment、hurt、sadness、jealousy、longing、fearOfLoss 等の感情は自動で0にしない。

主人公が後から親しくしただけでは境界解除と推測しない。

明確に境界が解除された入力をanalyzeが認識した場合だけ flags.boundaryClear = true を返す。

## 11. AIバックエンドの実装条件

バックエンドのAIサービスやモデルは交換可能。

必要なのはこの契約を守ること。

最低限必要な処理：
- JSON入力を受ける
- actionごとに別指示をAIへ渡す
- AI出力をJSONとして検証する
- スキーマ外フィールドを削除またはエラーにする
- 秘密鍵をブラウザへ返さない
- CORSでゲームの公開元を許可する

モデル変更によってゲームstateの計算結果が変わらないことを目標にする。

文章表現はモデルで変わってよいが、心理・進行判断はJS側が正本。
