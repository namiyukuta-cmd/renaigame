# AIターン実行手順（実コード）

既存の「AIに渡す」からChatGPTでプレイする方法を維持する。
設定を読んだだけで心理JSを実行済みと扱ってはいけない。

## 毎ターン取得
- 現在saveIdのJSONをprivate-game-dataから取得
- 該当character JS、behavior JS、共通恋愛ルールJSを取得
- js/renaigame_psychology_parameters.jsを取得
- simulation/js/ai_turn_engine.jsを取得
- 直近実ログ、今回の主人公入力を原文で保持

## JavaScript実行例

以下は取得済みの実コード・セーブを使う例。placeholder変数は実データに置き換える。

~~~js
const scope = {};
new Function("window", psychologyJsSource)(scope);
new Function("window", turnEngineJsSource)(scope);
new Function("window", characterJsSource)(scope);
new Function("window", behaviorJsSource)(scope);

const args = {
  saveId: actualSaveId,
  characterId: selectedCharacterId,
  character: scope.SimulationCharacters[selectedCharacterId],
  behavior: scope["SimulationCharacter" + selectedCharacterId.slice(5) + "Behavior"],
  psychology: scope.RenaiGamePsychologyParameters,
  stateEntry: saved.state.session.statesByCharacter[selectedCharacterId],
  records: saved.state.session.recordsByCharacter[selectedCharacterId] || [],
  protagonistInput: rawProtagonistInput,
  changes: changeDeltasBasedOnThisInput,
  evidence: exactQuotesFromThisInput
};

const engine = scope.RenaiGameTurnEngine;
const packet = engine.runTurn(args);
const replay = engine.verifyTurn(args, packet);
if (!replay.ok) throw new Error(replay.errors.join("; "));

// packet.after、packet.evaluations、人物固有設定・実ログで小説本文を生成する。
const inspection = engine.validateStory(args, packet, generatedStory);
if (!inspection.ok) throw new Error(inspection.errors.join("; "));
~~~

changesは心理値の変化量を示すオブジェクト（例 {trust: 2}）。
evidenceは、変化した項目それぞれについて主人公の今回入力に含まれる原文の一節。
根拠のある変化がなければ双方とも {} とする。上記の変数は実際の値を取得して使う。

## 自動検査の限界と失敗時処理

- runTurnは実在するnormalizeStateと6つのevaluate関数を呼び出す
- verifyTurnは再計算した結果とパケット全文を比較する
- validateStoryはChapterヘッダ・英語台詞の和訳など形式を検査する
- 主要心理項目が欠ける旧セーブでは、根拠なく0埋めして恋愛を後退させず、停止する
- 機械検査が通っても、本文の意味、人物らしさ、主人公の行動の捏造がないかは実ログと人物JSで追加確認する
- 実行していないのに実行したと申告しない
- GitHubへの保存はユーザーの明示的な保存指示時だけ

証跡は packet.execution.invoked、packet.fingerprint、replay.ok、inspection.ok。
fingerprintは照合値であり暗号署名ではない。
この仕組みは、実際に呼び出したターンの計算を照合するものであり、外部ChatGPTアプリにツール利用を強制するものではない。

## 保存JSONの出力

出力形式の正本は[CHAPTER_SAVE_FORMAT.md](CHAPTER_SAVE_FORMAT.md)。通常の保存指示と全文保持の要求には標準version 2を使う。パケット内部のversion:1を章JSONのversionとしてコピーしない。

取得済みの`simulation/js/simulation_save.js`も同じscopeへ評価した後、確定した本文・パケット・元の検証結果から組み立てる。以下の変数は実際の値を使う。

```js
const bundle = scope.RenaiGameSave.createChapterBundleV2({
  args, packet, verification: replay, validation: inspection,
  chapter: actualChapter, date: actualDate, partner: generatedStory,
  savedRecords: allRecordsFromThisSave,
  recordIndices: actualRecordIndices,
  storyActions: actualStoryActions
});
const filename = `${bundle.saveId}_${bundle.characterId}_${String(bundle.chapter).padStart(4, '0')}.json`;
scope.RenaiGameSave.assertChapterBundleV2(bundle, filename);
// JSON.stringify(bundle, null, 2)をUTF-8のファイルとして書く。
```

`inspection`は同じ`actualStoryActions`をvalidateStoryに渡して取得する。形式だけのファイル検査は`node simulation/scripts/validate_chapter_bundle.cjs <JSONファイル>`。このコマンド自体は心理JSの再実行やGitHub保存を行わない。

