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
  assert.equal(packet.execution.invoked.length, 6);
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

  const goodStory = "Chapter 1\nカフェ／不明／不明／不明℃\n“Hello.”\n「こんにちは」";
  assert.equal(engine.validateStory(args, packet, goodStory).ok, true);
  assert.equal(engine.validateStory(args, packet, "“Hello.”").ok, false);
  assert.equal(engine.validateStory(args, modified, goodStory).ok, false);

  const stage = engine.runTurn(options({
    stateEntry: { ...initial, stage: 2, stageName: "興味" },
    changes: {},
    evidence: {},
    stageTransition: { to: 3, stageName: "親しさ", evidence: "また会いたい" }
  }));
  assert.equal(stage.after.stage, 3);
  assert.throws(() => engine.runTurn(options({
    stateEntry: { ...initial, stage: 2, stageName: "興味" },
    changes: {},
    evidence: {},
    stageTransition: { to: 6, stageName: "告白前", evidence: "また会いたい" }
  })), /1段階/);

  console.log("PASS: actual psychology JS evaluation, replay integrity, save isolation, legacy guard, story validation");
}
test();
