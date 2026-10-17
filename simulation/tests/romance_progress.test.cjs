"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const engine = require("../js/ai_turn_engine.js");
const validator = require("../js/character_settings_validator.js");
const root = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const copy = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(engine.romancePolicy, {
  partnerGender: "male", bloodRelativesAllowed: false, supportCountsAsRomance: false
});

const input = "恋愛を進めてください。";
const args = {protagonistInput: input, protagonistProfile: {name: "テスト主人公"}, records: []};
const action = "青年セシルは自分で門を訪れた。";
const intent = "「あなたに会いたくて来ました。今日、あなたとお話しする時間をいただきたいのです」";
const story = "Chapter 1\n庭／2026年10月17日（土）／15:00／15℃\n" + action + "\n" + intent;
const progress = {
  kind: "initiative", actor: "セシル", actorGender: "male",
  bloodRelatedToProtagonist: false, relationshipToProtagonist: "unrelated",
  actionQuote: action, romanticIntentQuote: intent
};
const actions = p => ({romanceProgress: p});
assert.equal(engine.validateContinuity(args, story).mechanicalOk, false, "an explicit romance request cannot be completed by support alone");
assert.equal(engine.validateContinuity(args, story, actions(progress)).mechanicalOk, true);
assert.equal(engine.validateContinuity({}, "Chapter 1\n庭／2026年10月17日（土）／15:00／15℃\n女房が膳を整え、父親が家計を確かめた。").mechanicalOk, true,
  "family and women may remain ordinary supporting characters");
for (const mutate of [
  p => {p.actorGender = "female";},
  p => {delete p.actorGender;},
  p => {p.bloodRelatedToProtagonist = true;},
  p => {delete p.bloodRelatedToProtagonist;},
  p => {p.relationshipToProtagonist = "father";},
  p => {p.relationshipToProtagonist = "brother";},
  p => {p.kind = "care";},
  p => {p.romanticIntentQuote = "本文にない好意";},
  p => {p.actionQuote = "まだ実行していない訪問";}
]) {
  const invalid = copy(progress); mutate(invalid);
  assert.equal(engine.validateContinuity(args, story, actions(invalid)).mechanicalOk, false);
}
for (const actor of ["女房", "父親", "実父", "祖父", "実兄", "実弟"]) {
  const fake = {...progress, actor};
  assert.equal(engine.validateContinuity(args, actor + "は訪れた。\n" + story, actions(fake)).mechanicalOk, false,
    actor + " cannot be relabeled as an unrelated male romance partner");
}
assert.equal(engine.validateContinuity(args, story, actions({...progress, relationshipToProtagonist: "in_law"})).mechanicalOk, true,
  "a user-defined unrelated brother-in-law route is not confused with a blood relative");
const snapshot = JSON.stringify({args, progress});
engine.validateContinuity(args, story, actions(progress));
assert.equal(JSON.stringify({args, progress}), snapshot);

// Regression for stalled chapters: support can succeed while romance fails.
const repeated = {
  protagonistInput: "翌日。",
  records: [
    {protagonist: "何も変わらない。", partner: "女房は食事を運んだ。"},
    {protagonist: "変わり映えのない時間。", partner: "父親は湯を届けた。"}
  ]
};
const supportAction = "管理人は面会を禁じる札を撤去した。";
const supportOutcome = "面会の制限が解消し、親族が毎日訪ねられるようになった。";
const supportedStory = supportAction + supportOutcome;
const support = {continuity: {supportProgress: {
  kind: "circumstance_change", actor: "管理人",
  problem: {source: "record", index: 0, field: "protagonist", quote: "何も変わらない"},
  actionQuote: supportAction, outcomeQuote: supportOutcome
}}};
assert.equal(engine.validateSupportProgress(repeated, supportedStory, support).ok, true);
assert.equal(engine.validateRomanceProgress(repeated, supportedStory, support).ok, false);
assert.equal(engine.validateContinuity(repeated, supportedStory, support).mechanicalOk, false);
assert.equal(engine.validateContinuity(repeated, story + supportedStory, {...support, ...actions(progress)}).mechanicalOk, true);
const maleSupport = {continuity: {supportProgress: {
  kind: "relationship_response", actor: progress.actor,
  problem: support.continuity.supportProgress.problem,
  actionQuote: action, outcomeQuote: intent
}}, ...actions(progress)};
assert.equal(engine.validateContinuity(repeated, story, maleSupport).mechanicalOk, true,
  "the male partner's own response can address isolation without inserting a family-care subplot");
assert.equal(engine.validateRomanceProgress({...repeated, protagonistInput: "今は一人にして。"}, supportedStory).required, false,
  "respecting an explicit boundary does not require another romantic approach");

// Check the selected partner's identity and gender with real psychology sources.
const window = {};
for (const file of ["js/renaigame_psychology_parameters.js", "simulation/js/simulation_character_003.js",
  "simulation/js/simulation_character_003_behavior.js", "simulation/js/simulation_character_016.js"]) {
  vm.runInNewContext(read(file), {window});
}
const character = window.SimulationCharacter003;
const turnArgs = {...args, saveId: "run_romance_test", characterId: "char_003", character,
  behavior: window.SimulationCharacter003Behavior, psychology: window.RenaiGamePsychologyParameters,
  stateEntry: JSON.parse(read("simulation/state/templates/char_003_initial_state.json")), changes: {}, evidence: {}};
const selectedStory = story.replaceAll("セシル", character.name);
const selected = {...progress, characterId: character.id, actor: character.name,
  actionQuote: action.replaceAll("セシル", character.name)};
const packet = engine.runTurn(turnArgs), packetBefore = JSON.stringify(packet);
assert.equal(engine.verifyTurn(turnArgs, packet).ok, true);
assert.equal(engine.validateStory(turnArgs, packet, selectedStory).mechanicalOk, false);
assert.equal(engine.validateStory(turnArgs, packet, selectedStory, actions(selected)).mechanicalOk, true);
const firstName = character.name.split(/[・\s]/)[0];
const shortStory = selectedStory.replaceAll(character.name, firstName);
assert.equal(engine.validateStory(turnArgs, packet, shortStory, actions({...selected, actor: firstName,
  actionQuote: selected.actionQuote.replaceAll(character.name, firstName)})).mechanicalOk, true,
  "the current partner's established given name is accepted without requiring a full-name recital");
assert.equal(engine.validateStory(turnArgs, packet, selectedStory, actions({...selected, characterId: "char_007"})).mechanicalOk, false);
assert.equal(engine.validateStory(turnArgs, packet, selectedStory + story, actions({...selected, actor: "セシル"})).mechanicalOk, false);
assert.throws(() => engine.runTurn({...turnArgs, character: {...character, common: {...character.common, gender: "female"}}}), /男性限定/);
assert.equal(JSON.stringify(packet), packetBefore, "the story rule never changes psychology to manufacture attraction");
const authored = copy(window.SimulationCharacters.char_016);
authored.common.gender = "female";
assert.equal(validator.inspect(authored).ok, false);
authored.id = "char_017"; delete authored.common.gender;
assert.equal(validator.inspect(authored).ok, false, "new characters need explicit male metadata");
authored.common.gender = "male";
assert.equal(validator.inspect(authored).complete, true);

const scope = {window: {}, document: {addEventListener() {}}};
vm.runInNewContext(read("simulation/js/simulation_handoff.js"), scope);
const prompt = scope.window.RenaiGameHandoff.buildPrompt({character, profile: {}, saveId: "run_romance_test"});
assert.match(prompt, /主人公の恋愛相手は男性限定/);
assert.match(prompt, /ROMANCE_PREFERENCES\.md/);
assert.match(prompt, /storyActions\.romanceProgress/);
assert.match(read("AGENTS.md"), /恋愛相手は男性限定/);
console.log("PASS: male-only romance, blood-relative and NPC substitution guards, independent support, selected identity, real JS replay, and handoff");

