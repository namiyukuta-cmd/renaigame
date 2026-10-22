'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const engine = require('../js/ai_turn_engine.js');
const reviewed = require('./helpers/review_fixture.cjs');
const romantic=require('./helpers/romance_declaration.cjs');
const window = {};
for (const path of ['../../js/renaigame_policy.js','../../js/renaigame_psychology_parameters.js','../js/simulation_character_003.js','../js/simulation_character_003_behavior.js']) {
  vm.runInNewContext(fs.readFileSync(require.resolve(path),'utf8'),{window});
}
const args = {saveId:'run_header',characterId:'char_003',character:window.SimulationCharacter003,
  behavior:window.SimulationCharacter003Behavior,psychology:window.RenaiGamePsychologyParameters,
  stateEntry:require('../state/templates/char_003_initial_state.json'),records:[],
  protagonistInput:'「こんにちは」',changes:{},evidence:{}};
const packet = engine.runTurn(args);
const unassigned={saveId:'run_header_unassigned',characterId:null,records:[],protagonistInput:args.protagonistInput};
const approach=args.character.name+'は自分から声をかけた。',intent='「あなたと話せるのを楽しみにしていました」';
const story = (detail,chapter=1) => `Chapter ${chapter}\n${detail}\n${approach}\n${intent}`;
const valid = '庭／2026年10月17日（土）／16:00／18.5℃';
for (const detail of [valid,'都・門前／1001年10月17日（土）／09:05／-2℃',
  '庭／2024年2月29日（木）／00:00／0℃','庭／0001年1月1日（月）／23:59／+12℃']) {
  const text = story(detail), actions = reviewed(engine,args,text,romantic(args,approach,intent));
  assert.equal(engine.validateChapterHeader(text).ok,true,detail);
  assert.equal(engine.releaseStory(args,packet,text,actions).story,text);
  assert.throws(()=>engine.releaseStory(args,null,text,actions),/心理計算パケット/,'a selected partner cannot masquerade as an unassigned chapter');
  assert.equal(engine.releaseStory(unassigned,null,text,reviewed(engine,unassigned,text)).story,text,'a genuinely unselected path uses the same header check');
}
const invalid = [
  '庭／不明／不明／不明℃','不明／2026年10月17日（土）／16:00／18℃',
  '庭／2026年10月17日（土）／午後／18℃','庭／2026年10月17日（土）／朝／18℃',
  '庭／2026年2月29日（日）／16:00／18℃','庭／2026年4月31日（金）／16:00／18℃',
  '庭／2026年13月1日（火）／16:00／18℃','庭／2026年10月0日（水）／16:00／18℃',
  '庭／2026年10月17日（日）／16:00／18℃','庭／YYYY年M月D日（曜）／HH:MM／気温℃',
  '庭／2026年10月17日（土）／24:00／18℃','庭／2026年10月17日（土）／16:60／18℃',
  '庭／2026年10月17日（土）／9:00／18℃','庭／2026年10月17日（土）／16:00／NaN℃',
  '庭／2026年10月17日（土）／16:00／18','庭／2026年10月17日（土）／16:00／18℃／余分'
];
for (const chapter of [1,3]) for (const detail of invalid) {
  const text = story(detail,chapter), actions = reviewed(engine,args,text,romantic(args,approach,intent));
  const snapshot = JSON.stringify({args,packet,text,actions});
  assert.equal(engine.validateChapterHeader(text).ok,false,detail);
  const unassignedActions=reviewed(engine,unassigned,text);
  for (const result of [engine.validateStory(args,packet,text,actions),engine.validateContinuity(unassigned,text,unassignedActions)]) {
    assert.equal(result.ok,false); assert.equal(result.readyForOutput,false);
    assert.equal(result.mechanicalOk,false); assert.equal(result.checks.chapterHeader.ok,false);
    assert.ok(result.errors.some(error=>error.includes('Chapterヘッダ')));
  }
  assert.throws(()=>engine.releaseStory(args,packet,text,actions),/Chapterヘッダ/);
  assert.throws(()=>engine.releaseStory(unassigned,null,text,unassignedActions),/Chapterヘッダ/);
  assert.equal(JSON.stringify({args,packet,text,actions}),snapshot,'validation cannot rewrite source data');
}
for (const text of ['',story(valid).replace('Chapter 1','Chapter 0'),story(valid).split('\n').slice(1).join('\n')]) {
  assert.equal(engine.validateChapterHeader(text).ok,false);
}
console.log('PASS: concrete chapter headers, real dates/weekdays, historical years, both release paths, invalid completed reviews and no data rewriting');
