"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const engine = require("../js/ai_turn_engine.js");
const copy = value => JSON.parse(JSON.stringify(value));

const input = "助けてください。状況を変えてください。";
const story = "Chapter 3\n館／2026年10月17日（土）／15:00／15℃\n管理人は面会を禁じる札を撤去した。\n面会の制限はなくなり、親族が毎日訪ねられるようになった。";
const progress = {
  kind: "circumstance_change", actor: "管理人",
  problem: {source: "input", quote: "状況を変えてください"},
  actionQuote: "管理人は面会を禁じる札を撤去した。",
  outcomeQuote: "面会の制限はなくなり、親族が毎日訪ねられるようになった。"
};
const args = {protagonistInput: input, protagonistProfile: {name: "テスト主人公"}, records: []};
const actions = p => ({continuity: {supportProgress: p}});
const original = JSON.stringify({args, progress});
assert.equal(engine.validateContinuity({}, "Chapter 1\n庭／2026年10月17日（土）／15:00／15℃\n庭に花が咲いた。").mechanicalOk, true);
assert.equal(engine.validateSupportProgress(args, null).ok, false);
assert.equal(engine.validateContinuity(args, story).mechanicalOk, false, "a statement of intent is not evidence");
assert.equal(engine.validateContinuity(args, story, actions(progress)).mechanicalOk, true);
assert.equal(JSON.stringify({args, progress}), original, "checks do not rewrite story inputs or evidence");
for (const mutate of [
  p => {p.kind = "offer";}, p => {p.actor = "存在しない人物";},
  p => {p.actionQuote = "実行していない対応";},
  p => {p.outcomeQuote = "本文にない結果";},
  p => {p.problem = {source: "input", quote: "入力にない問題"};},
  p => {p.problem = {source: "record", index: 9, field: "protagonist", quote: "問題"};}
]) {
  const invalid = copy(progress); mutate(invalid);
  assert.equal(engine.validateContinuity(args, story, actions(invalid)).mechanicalOk, false);
}
const control = {...progress, actor: "テスト主人公"};
assert.equal(engine.validateContinuity(args, story + "\nテスト主人公は部屋を出た。", actions(control)).mechanicalOk, false);

const repeated = {
  ...args, protagonistInput: "翌日。",
  records: [
    {protagonist: "何も変わらない。助けてください。", partner: "女房は食事を運んだ。"},
    {protagonist: "変わり映えのない時間が続く。", partner: "女房は湯を替え、火桶を整えた。"}
  ]
};
const careStory = "Chapter 3\n館／2026年10月17日（土）／15:00／15℃\n女房は夕食を運んだ。火桶の炭を足した。";
const care = {...progress, actor: "女房", problem: {source: "record", index: 0, field: "protagonist", quote: "何も変わらない"},
  actionQuote: "女房は夕食を運んだ。", outcomeQuote: "火桶の炭を足した。"};
assert.equal(engine.validateContinuity(repeated, careStory, actions(care)).mechanicalOk, false,
  "fresh wording for repeated care must not count as a changed circumstance");
const grounded = {...progress, problem: care.problem};
assert.equal(engine.validateContinuity(repeated, story, actions(grounded)).mechanicalOk, false,
  "improved family access is support, not progress with a male romance partner");
assert.equal(engine.validateContinuity(repeated, story).mechanicalOk, false, "a short next-day input retains relevant context");
const waiting = {...grounded, actionQuote: "管理人は手紙を送った。", outcomeQuote: "返答を待っていた。"};
assert.equal(engine.validateContinuity(repeated, waiting.actionQuote + waiting.outcomeQuote, actions(waiting)).mechanicalOk, false);
const duplicate = {...args, records: [{protagonist: "昨日の入力", partner: story}]};
assert.equal(engine.validateContinuity(duplicate, story, actions(progress)).mechanicalOk, false, "old outcomes are not new progress");
const hungry = {...repeated, protagonistInput: "空腹です。助けてください。"};
const food = {...care, problem: {source: "input", quote: "空腹です"}, outcomeQuote: "温かい食事を御簾の前に置いた。"};
assert.equal(engine.validateContinuity(hungry, careStory + food.outcomeQuote, actions(food)).mechanicalOk, true,
  "care that addresses the stated immediate problem is still allowed");
const relationStory = "Chapter 3\n館／2026年10月17日（土）／15:00／15℃\n親族は会いに来た。\n「あなたに会いたくて来た。これからも一緒に時間を過ごしたい」";
const relation = {...progress, kind: "relationship_response", actor: "親族",
  actionQuote: "親族は会いに来た。", outcomeQuote: "「あなたに会いたくて来た。これからも一緒に時間を過ごしたい」"};
assert.equal(engine.validateContinuity(args, relationStory, actions(relation)).mechanicalOk, true,
  "another person's expressed wish does not invent the protagonist's acceptance");

// The same guard runs after actual psychology and replay verification.
const root = path.resolve(__dirname, "../.."), window = {};
for (const file of ["js/renaigame_psychology_parameters.js", "simulation/js/simulation_character_003.js",
  "simulation/js/simulation_character_003_behavior.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), {window});
}
const turnArgs = {...args, saveId: "run_support_test", characterId: "char_003",
  character: window.SimulationCharacter003, behavior: window.SimulationCharacter003Behavior,
  psychology: window.RenaiGamePsychologyParameters,
  stateEntry: JSON.parse(fs.readFileSync(path.join(root, "simulation/state/templates/char_003_initial_state.json"), "utf8")),
  changes: {}, evidence: {}};
const packet = engine.runTurn(turnArgs), packetBefore = JSON.stringify(packet);
assert.equal(engine.verifyTurn(turnArgs, packet).ok, true);
assert.equal(engine.validateStory(turnArgs, packet, story).mechanicalOk, false);
assert.equal(engine.validateStory(turnArgs, packet, story, actions(progress)).mechanicalOk, true);
assert.equal(JSON.stringify(packet), packetBefore, "progress checks do not adjust psychology to fit the story");

// AI handoffs carry the outcome rule; no dependency on a browser DOM.
const scope = {window: {}, document: {addEventListener() {}}};
vm.runInNewContext(fs.readFileSync(path.join(root, "simulation/js/simulation_handoff.js"), "utf8"), scope);
const prompt = scope.window.RenaiGameHandoff.buildPrompt({
  character: {id: "char_003", name: "テスト相手"}, profile: {}, saveId: "run_support_test"
});
assert.match(prompt, /storyActions\.continuity\.supportProgress/);
assert.match(prompt, /同じ章/);
console.log("PASS: substantive support evidence, repeated-care and delay rejection, psychology replay, and handoff");

