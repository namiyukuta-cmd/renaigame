"use strict";

// node simulation/tests/ai_turn_engine.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const rootDir = path.join(__dirname, "..", "..");
const engine = require("../js/ai_turn_engine.js");

function loadBrowserScript(relativePath, window) {
  vm.runInNewContext(fs.readFileSync(path.join(rootDir, relativePath), "utf8"),
    { window }, { filename: relativePath });
}
const window = {};
loadBrowserScript("js/renaigame_romance_rules.js", window);
loadBrowserScript("js/renaigame_psychology_parameters.js", window);
loadBrowserScript("simulation/js/simulation_character_003.js", window);
loadBrowserScript("simulation/js/simulation_character_003_behavior.js", window);
const initial = JSON.parse(fs.readFileSync(
  path.join(rootDir, "simulation/state/templates/char_003_initial_state.json"), "utf8"));

function options(extra = {}) {
  return {
    saveId: "test-save-001",
    characterId: "char_003",
    character: window.SimulationCharacter003,
    behavior: window.SimulationCharacter003Behavior,
    psychology: window.RenaiGamePsychologyParameters,
    stateEntry: { currentState: initial, stateHistory: [] },
    records: [],
    protagonistInput: "「また会いたいです」",
    changes: { trust: 3, seekHeroine: 5 },
    evidence: { trust: "また会いたい", seekHeroine: "また会いたい" },
    ...extra
  };
}

function test() {
  const args = options();
  const packet = engine.runTurn(args);
  assert.equal(packet.execution.status, "executed");
  assert.equal(packet.execution.invoked.length, 7);
  assert.deepEqual(Array.from(packet.execution.invoked), engine.functionNames.slice(1));
  assert.equal(packet.after.trust, Math.min(100, packet.before.trust + 3));
  assert.equal(packet.after.seekHeroine, Math.min(100, packet.before.seekHeroine + 5));
  assert.equal(engine.verifyTurn(args, packet).ok, true);
  assert.equal(packet.sources.records, engine.fingerprint([]));

  const modified = JSON.parse(JSON.stringify(packet));
  modified.evaluations.evaluateConflict.outcome = "falsified";
  assert.equal(engine.verifyTurn(args, modified).ok, false);
  assert.equal(engine.verifyTurn(options({ saveId: "another-save" }), packet).ok, false);
  assert.equal(engine.verifyTurn(options({ protagonistInput: "別の入力" }), packet).ok, false);

  assert.throws(() => engine.runTurn(options({ changes: { unknownMetric: 8 }, evidence: { unknownMetric: "会いたい" } })), /使用できない項目/);
  assert.throws(() => engine.runTurn(options({ changes: { trust: 50 }, evidence: { trust: "存在しない根拠" } })), /変化根拠/);
  assert.throws(() => engine.runTurn(options({ characterId: "char_001" })), /人物JS/);

  const legacy = { characterId: "char_003", stage: 6, stageName: "告白前", trust: 70 };
  assert.throws(() => engine.runTurn(options({ stateEntry: legacy })), /主要心理項目が不足/);

  const goodStory = "Chapter 1\nカフェ／2026年10月17日（土）／15:00／15℃\n“Hello.”\n「こんにちは」";
  assert.equal(engine.validateStory(args, packet, goodStory).mechanicalOk, true);
  assert.equal(engine.validateStory(args, packet, "“Hello.”").mechanicalOk, false);
  assert.equal(engine.validateStory(args, modified, goodStory).mechanicalOk, false);

  const stage = engine.runTurn(options({
    stateEntry: { ...initial, stage: 2, stageName: "興味" },
    changes: {},
    evidence: {},
    stageTransition: { to: 3, stageName: "親しさ", evidence: "また会いたい" }
  }));
  assert.equal(stage.after.stage, 3);

  // 共通ルールの段階名を、そのまま実行器へ渡して進行できることを確認する。
  // 旧0〜8段階では「1=興味」「7=告白・合意」が実行器に拒否されていた。
  const rules = window.RenaiGameRomanceRules;
  assert.equal(rules.stages.length, 7);
  assert.equal(rules.stateFields.stage, rules.stages[0].id);
  assert.equal(rules.stateFields.stageName, rules.stages[0].name);
  for (let index = 0; index < rules.stages.length; index++) {
    const next = rules.stages[index];
    const previous = rules.stages[index - 1];
    assert.equal(next.id, index + 1);
    const transitionArgs = options({
      stateEntry: { ...initial, stage: next.id - 1, stageName: previous?.name || "開始前" },
      changes: {}, evidence: {},
      stageTransition: { to: next.id, stageName: next.name, evidence: "また会いたい" }
    });
    const advanced = engine.runTurn(transitionArgs);
    assert.equal(engine.verifyTurn(transitionArgs, advanced).ok, true);
    assert.equal(advanced.after.stageName, next.name);
    assert.equal(rules.selfInitiatedRomance.byStage.filter(entry => entry.stage === next.id).length, 1);
  }
  assert.equal(rules.selfInitiatedRomance.byStage.length, rules.stages.length);
  assert.throws(() => engine.runTurn(options({
    stateEntry: { ...initial, stage: 2, stageName: "興味" },
    changes: {},
    evidence: {},
    stageTransition: { to: 6, stageName: "告白前", evidence: "また会いたい" }
  })), /1段階/);


  // 宵の間：低積極度でも欲求が十分なら実際に誘う。場所・返答の根拠も検証する。
  const sceneText = "成人です。今夜は仕事なし。時間があります。2人で過ごせる部屋があります。会話は弾んでいます。拒絶していません。";
  const scene = {
    protagonistAdult: true, canSpendPrivateTime: true, privatePlaceAvailable: true,
    onDuty: false, explicitRejection: false, atmosphere: 100,
    evidence: Object.fromEntries(["protagonistAdult", "canSpendPrivateTime", "privatePlaceAvailable", "onDuty", "explicitRejection", "atmosphere"]
      .map(key => [key, {source: "input", quote: sceneText}]))
  };
  const strong = {...initial, privateTimeWish: 100, invitationImpulse: 100, seekHeroine: 100,
    reluctanceToPart: 100, physicalNeed: 100, trust: 100, comfort: 100, perceivedReciprocity: 100,
    romanceScore: 100, fearOfRejection: 80, hesitation: 80, selfControl: 80, socialRestraint: 80,
    psychologyTraits: {intimacyCaution: 80}};
  const invitationArgs = options({
    protagonistInput: sceneText, changes: {}, evidence: {}, yoinomaContext: scene,
    character: {...window.SimulationCharacter003,
      common: {...window.SimulationCharacter003.common, age: 31, baseRomanticInitiative: 1}},
    stateEntry: {currentState: strong}
  });
  const shy = engine.runTurn(invitationArgs);
  assert.equal(shy.evaluations.evaluateYoinomaInvitation.mode, "indirect");
  assert.equal(shy.after.yoinomaInvitation.status, "pending");
  assert.equal(engine.verifyTurn(invitationArgs, shy).ok, true);
  assert.equal(engine.validateStory(invitationArgs, shy, goodStory).mechanicalOk, false);
  const inviteStory = goodStory + "\n“Would you like to spend a little more time with me at my place?”\n「よければ、僕の家でもう少し一緒に過ごしませんか」";
  assert.equal(engine.validateStory(invitationArgs, shy, inviteStory, {yoinomaInvitation: "indirect"}).mechanicalOk, true);
  const directArgs = {...invitationArgs, character: {...invitationArgs.character,
    common: {...invitationArgs.character.common, baseRomanticInitiative: 10}}};
  assert.equal(engine.runTurn(directArgs).evaluations.evaluateYoinomaInvitation.mode, "direct");
  for (const extra of [{onDuty: true}, {privatePlaceAvailable: false}, {protagonistAdult: false}, {explicitRejection: true}]) {
    assert.equal(engine.runTurn({...invitationArgs, yoinomaContext: {...scene, ...extra}}).evaluations.evaluateYoinomaInvitation.mustInvite, false);
  }
  assert.equal(engine.runTurn({...invitationArgs, yoinomaContext: {}}).evaluations.evaluateYoinomaInvitation.mustInvite, false);
  const pendingArgs = {...invitationArgs, stateEntry: {currentState: shy.after}};
  assert.equal(engine.runTurn(pendingArgs).evaluations.evaluateYoinomaInvitation.mustInvite, false);
  const refusal = engine.runTurn({...pendingArgs, protagonistInput: "お断りします。",
    yoinomaContext: {response: "refused", evidence: {response: {source: "input", quote: "お断りします。"}}}});
  assert.equal(refusal.after.yoinomaInvitation.status, "refused");
  assert.equal(engine.runTurn({...invitationArgs, stateEntry: {currentState: refusal.after}}).evaluations.evaluateYoinomaInvitation.mustInvite, false);
  const accepted = engine.runTurn({...pendingArgs, protagonistInput: "ええ、ご一緒します。",
    yoinomaContext: {response: "accepted", evidence: {response: {source: "input", quote: "ご一緒します"}}}});
  assert.equal(accepted.evaluations.evaluateYoinomaInvitation.mode, "accepted");
  assert.equal(accepted.after.yoinomaInvitation.status, "accepted");
  assert.throws(() => engine.runTurn({...invitationArgs, yoinomaContext: {...scene,
    evidence: {...scene.evidence, onDuty: {source: "input", quote: "根拠のない文章"}}}}), /根拠/);
  assert.equal(engine.verifyTurn({...invitationArgs, yoinomaContext: {...scene, atmosphere: 0}}, shy).ok, false);


  // 全登録キャラが固定積極度を持ち、算出値ではなく人物JSの値を使用する。
  const registrySource = fs.readFileSync(path.join(rootDir, "simulation/js/simulation_characters.js"), "utf8");
  const characterFiles = Array.from(registrySource.matchAll(/"(simulation_character_\d{3}\.js)"/g), match => match[1]);
  assert.ok(characterFiles.length >= 6);
  const allCharacters = {};
  for (const file of characterFiles) {
    loadBrowserScript("simulation/js/" + file, allCharacters);
  }
  for (const c of Object.values(allCharacters.SimulationCharacters)) {
    const value = c.common.baseRomanticInitiative;
    assert.ok(Number.isInteger(value) && value >= 1 && value <= 10, c.id);
    assert.ok(typeof c.common.baseRomanticInitiativeReason === "string" && c.common.baseRomanticInitiativeReason.trim(), c.id);
    const decision = window.RenaiGamePsychologyParameters.evaluateYoinomaInvitation(strong, c.id, scene, c);
    assert.equal(decision.baseRomanticInitiative, value, c.id);
  }
  for (const invalid of [undefined, null, "3", 0, 11, 2.5, NaN]) {
    const character = {...window.SimulationCharacter003,
      common: {...window.SimulationCharacter003.common, baseRomanticInitiative: invalid}};
    assert.throws(() => engine.runTurn(options({character})), /baseRomanticInitiative/);
    assert.throws(() => window.RenaiGamePsychologyParameters.evaluateYoinomaInvitation(initial, character.id, {}, character), /baseRomanticInitiative/);
  }


  // Regression: a protagonist may challenge a cruel saved line without authorizing death.
  const confrontation = "「私が死んで良かったと言っていたわ。私に死んで欲しいと思っていたとも認めていた。私が死んだら良いと思っているのよね。」";
  const allowedConcerns = [
    confrontation,
    "「私が死んで良かったって言ったの？」",
    "「最初から私が嫌いだったのですか？」",
    "過去のログに「死んで良かった」と書いてあった。",
    "死んだことにしないで。",
    "「私が死んだ？」"
  ];
  for(const input of allowedConcerns){
    const checked=engine.continuityInput(input);
    assert.equal(checked.ok,true,input);
    assert.equal(checked.reportedConcern,true,input);
    assert.equal(checked.preservesProtagonist,true);
  }
  for(const input of [
    "美奈は死んだ。", "「美奈は死んだ。」", "主人公は消滅した。",
    "主人公を殺して。", "「私が死んで良かったと言っていたわ。」\n美奈は死んだ。",
    "「死んで良かったと言っていたわ。だから主人公を殺して。」",
    "主人公が死んで良かったと相手に言わせて。",
    "最初から主人公が嫌いだった。"
  ]) assert.equal(engine.continuityInput(input).ok,false,input);
  const confrontationArgs=options({protagonistInput:confrontation,changes:{},evidence:{}});
  const confrontationPacket=engine.runTurn(confrontationArgs);
  assert.equal(engine.verifyTurn(confrontationArgs,confrontationPacket).ok,true);
  const response="Chapter 38\n家／2026年10月15日（木）／18:00／12℃\n“I said those words. I will answer for them.”\n「あの言葉を言った。言ったことについて、きちんと答える。」";
  assert.equal(engine.validateStory(confrontationArgs,confrontationPacket,response).mechanicalOk,true);
  assert.equal(engine.validateContinuity({protagonistProfile:{name:"美奈"}},"美奈は死んだ。").mechanicalOk,false);
  assert.equal(engine.validateContinuity({},"“I am glad you died.”").mechanicalOk,false);
  assert.equal(engine.validateContinuity({},"最初から主人公が嫌いだった。").mechanicalOk,false);

  console.log("PASS: actual psychology JS evaluation, replay integrity, save isolation, legacy guard, story validation");
}
test();

