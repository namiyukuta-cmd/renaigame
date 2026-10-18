"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const scope = {window: {}, document: {addEventListener() {}}};
vm.runInNewContext(fs.readFileSync(path.join(root, "js/renaigame_policy.js"), "utf8"), scope);
vm.runInNewContext(fs.readFileSync(path.join(root, "simulation/js/simulation_handoff.js"), "utf8"), scope);
const build = scope.window.RenaiGameHandoff.buildPrompt;
const profile = {name: "引き継ぎ確認", age: "", free: "架空の古都で暮らしています。\n設定の改行も保持します。"};
const protagonistInput = "Chapter1\n「お会いできて嬉しいです。」\n";
const session = {id: "run_handoff_session", recordsByCharacter: {
  __unassigned__: [{scene: "Chapter 1", protagonist: "このスロットの原文", partner: "このスロットの本文"}],
  char_003: [{partner: "他の相手の記録はコピーしない"}]
}, statesByCharacter: {char_003: {romanceScore: 99}}};
const snapshot = JSON.stringify({profile, session});
for (const character of [null, undefined]) {
  const saved = build({character, profile, saveId: "run_handoff_session", session, protagonistInput});
  assert.match(saved, /攻略対象: 未選択/);
  assert.match(saved, /現在saveId: run_handoff_session/);
  assert.match(saved, /読むセーブ: renaigame\/simulation\/saves\/run_handoff_session\.json/);
  assert.match(saved, /recordsByCharacter\.__unassigned__/);
  assert.ok(saved.includes(JSON.stringify(profile, null, 2)), "saved slots still include the full current profile");
  assert.ok(saved.endsWith(protagonistInput), "raw input survives with its original newlines");
  assert.match(saved, /男性限定/);
  assert.match(saved, /専用version 1/);
  assert.match(saved, /psychologyJsExecuted:false/);
  assert.doesNotMatch(saved, /simulation_character_null|char_null|char_undefined|runTurnで生成用パケットを作成/);
  assert.match(saved, /実ログをvalidateContinuityへ渡し/);
  assert.doesNotMatch(saved, /実ログをvalidateStoryへ渡し/);
  assert.doesNotMatch(saved, /まず必要な設定と現在の記録を確認し、私の次の入力を待って/);
  const unsaved = build({character, profile, saveId: null, session});
  assert.match(unsaved, /GitHubへ未保存/);
  assert.ok(unsaved.includes("このスロットの本文"));
  assert.ok(unsaved.includes('"selectedCharacterId": null'));
  assert.ok(unsaved.includes('"statesByCharacter": {}'));
  assert.doesNotMatch(unsaved, /他の相手の記録はコピーしない|romanceScore|char_003_initial_state/);
  assert.match(unsaved, /私の次の入力を待って/);
}
const character = {id: "char_003", name: "既存の男性相手"};
const selected = build({character, profile, saveId: "run_handoff_session", session, protagonistInput});
assert.match(selected, /simulation_character_003\.js/);
assert.match(selected, /標準version 2/);
assert.match(selected, /AI→GitHubの書込みは安全性判定等で遮断され得る/);
assert.match(selected, /ゲームのセーブ→章データを取り込んで保存でJSONを貼り付け/);
assert.match(selected, /小説としての仕上げ/);
assert.match(selected, /下書き後・意味確認の前/);
assert.match(selected, /runTurnで生成用パケットを作成/);
assert.doesNotMatch(selected, /未選択の専用version 1/);
assert.ok(selected.includes(JSON.stringify(profile, null, 2)));
const selectedLocal = build({character, profile, saveId: null, session});
assert.ok(selectedLocal.includes("他の相手の記録はコピーしない"));
assert.ok(!selectedLocal.includes("このスロットの本文"), "selected and unassigned records never mix");
assert.equal(JSON.stringify({profile, session}), snapshot, "building a prompt never rewrites profile, records or psychology");
assert.throws(() => build({character: {id: "invalid"}, profile, saveId: null}), /データ/);
assert.throws(() => build({character: null, profile, saveId: "../other"}), /セーブ/);
console.log("PASS: unassigned and selected handoff, exact profile/input, slot isolation, mode-specific JS/save rules, no state mutation");
