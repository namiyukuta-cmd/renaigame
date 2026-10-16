"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname,"../..");
const load = p => fs.readFileSync(path.join(root,p),"utf8");
const parse = p => JSON.parse(load(p));
const d = "simulation/world/mizunagi/";
const people = parse(d+"characters.json");
const timeline = parse(d+"timeline.json");
const world = parse(d+"world.json");
assert.equal(people.worldId,"mizunagi");
assert.equal(people.characterId,"char_013");
assert.equal(timeline.worldId,"mizunagi");
assert.equal(world.id,"mizunagi");
const ids = new Set(people.characters.map(x=>x.id));
assert.equal(ids.size,people.characters.length);
for (const c of people.characters) {
  assert.ok(c.name && c.role && Array.isArray(c.notes));
  for (const v of Object.values(c.relations||{})) {
    for (const id of (Array.isArray(v)?v:[v])) {
      if (id==="冬篠" || id==="gitou") continue;
      assert.ok(ids.has(id),c.id+" references unknown "+id);
    }
  }
}
assert.ok(timeline.events.find(x=>x.year===770 && x.month===10 && x.day===23));
assert.ok(timeline.events.find(x=>x.year===772 && x.month===3 && x.day===2));
assert.ok(timeline.events.find(x=>x.year===817));
for (const f of [d+"characters.json",d+"timeline.json",d+"world.json"]) {
  assert.ok(load("simulation/js/simulation_handoff.js").includes(f), "handoff missing "+f);
  assert.ok(load("simulation/AI_GENERATION_ENTRY.md").includes(f), "entry missing "+f);
  assert.ok(load("simulation/AI_SAVE_WORKFLOW.md").includes(f), "workflow missing "+f);
  assert.ok(load("simulation/js/simulation_character_013.js").includes(f), "character missing "+f);
}
assert.ok(people.characters.find(x=>x.id==="ayahime").appearance.skin.includes("初雪"));
assert.ok(timeline.hiddenCourtTruth.planner==="korezato");

assert.equal(timeline.firstEncounter.year,770);
assert.equal(timeline.firstEncounter.ages.korezato,33);
assert.equal(timeline.firstEncounter.ages.ayahime,16);
assert.ok(timeline.firstEncounter.hisResponse.includes("執着"));
assert.ok(timeline.firstEncounter.heroineResponse.includes("確定しない"));
const c13 = load("simulation/js/simulation_character_013.js");
const b13 = load("simulation/js/simulation_character_013_behavior.js");
assert.ok(c13.includes('"firstEncounter"'));
assert.ok(b13.includes('"firstEncounter770"'));
assert.equal(timeline.storyOpening.watchingStatus,"confirmed");
assert.equal(world.authoring.watchStatus,"confirmed");
assert.ok(timeline.firstEncounter.followupMonitoring.includes("監視"));
assert.ok(people.characters.find(x=>x.id==="korezato").notes.some(x=>x.includes("監視")));
console.log("Mizunagi world references, NPC IDs, chronology and handoff: OK");
