'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const reviewedActions = require('./helpers/review_fixture.cjs');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root,file), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const scope = { window: {}, document: { addEventListener() {} } };
for(const file of [
  'js/renaigame_psychology_parameters.js', 'simulation/js/character_settings_validator.js',
  'simulation/js/ai_turn_engine.js', 'simulation/js/simulation_character_016.js',
  'simulation/js/simulation_character_016_behavior.js', 'simulation/js/simulation_save.js',
  'simulation/js/simulation_handoff.js'
]) vm.runInNewContext(read(file),scope);
const api = scope.window.RenaiGameSave, engine = scope.window.RenaiGameTurnEngine;
const args = {
  saveId: 'run_format_test', characterId: 'char_016',
  character: scope.window.SimulationCharacters.char_016,
  behavior: scope.window.SimulationCharacter016Behavior,
  psychology: scope.window.RenaiGamePsychologyParameters,
  stateEntry: JSON.parse(read('simulation/state/templates/char_016_initial_state.json')),
  records: [], protagonistProfile: {name:'形式検査'},
  protagonistInput: 'Chapter1\n「ありがとう。」',
  changes: {gratitude:2}, evidence: {gratitude:'ありがとう。'}
};
const packet = engine.runTurn(args);
const partner = 'Chapter 1\n英国・店内／2026年10月17日（土）／15:00／15℃\n\nアーサーは頷いた。';
const actions = reviewedActions(engine,args,partner);
const input = {
  args, packet, partner, chapter:1, date:'2026年10月17日（土）',
  verification:engine.verifyTurn(args,packet), validation:engine.validateStory(args,packet,partner,actions),
  savedRecords:[], recordIndices:[], storyActions:actions
};

async function main(){
  const original = JSON.stringify(input);
  const bundle = api.createChapterBundleV2(input);
  const filename = 'run_format_test_char_016_0001.json';
  assert.equal(api.assertChapterBundleV2(bundle,filename),true);
  assert.equal(JSON.stringify(input),original,'producer never rewrites its source data');
  assert.equal(bundle.version,2,'packet version 1 does not select chapter version 1');
  assert.equal(bundle.records[0].entry.protagonist,args.protagonistInput);
  assert.equal(bundle.records[0].entry.partner,partner);
  assert.deepEqual(copy(bundle.stateHistory[0].entry.verification),copy(input.verification));
  assert.deepEqual(copy(bundle.stateHistory[0].entry.validation),copy(input.validation));
  bundle.stateHistory[0].entry.changes.gratitude = 99;
  assert.equal(packet.changes.gratitude,2,'returned bundle is detached from the source packet');
  bundle.stateHistory[0].entry.changes.gratitude = 2;

  const forbidden = ['packet','before','after','evaluations','execution','sources','protagonistInput','packetFieldNames','version','saveId','characterId'];
  for(const key of forbidden){
    const bad = copy(bundle); bad.stateHistory[0].entry[key] = key === 'packet' ? copy(packet) : {};
    assert.throws(()=>api.assertChapterBundleV2(bad),/追加禁止/);
    await assert.rejects(api.prepareChapterImport(bad),/追加禁止/,'reject before legacy normalization or any network access');
  }
  for(const [get,keys] of [
    [x=>x,Object.keys(bundle)],
    [x=>x.records[0].entry,Object.keys(bundle.records[0].entry)],
    [x=>x.stateHistory[0].entry,Object.keys(bundle.stateHistory[0].entry)],
    [x=>x.replayContext,Object.keys(bundle.replayContext)]
  ]) for(const key of keys){
    const bad = copy(bundle); delete get(bad)[key];
    assert.throws(()=>api.assertChapterBundleV2(bad),/必須不足/);
  }
  for(const mutate of [
    x=>{x.version=1;}, x=>{x.records.push(copy(x.records[0]));},
    x=>{x.records[0].index=-1;}, x=>{x.stateHistory[0].index='0';},
    x=>{x.records[0].entry.scene='Chapter 2';}, x=>{x.stateHistory[0].entry.turn=2;},
    x=>{x.stateHistory[0].entry.changes.gratitude='2';},
    x=>{x.stateHistory[0].entry.evidence={};},
    x=>{x.stateHistory[0].entry.verification.ok=false;},
    x=>{x.stateHistory[0].entry.validation.errors=['failed'];},
    x=>{x.stateHistory[0].entry.validation.replayFingerprint='00000000';},
    x=>{x.stateHistory[0].entry.validation.requiresSemanticReview=false;},
    x=>{x.replayContext.recordIndices=[0];}, x=>{x.replayContext.records=[];},
    x=>{x.replayContext.storyActions=[];}, x=>{x.extra={};}
  ]){
    const bad=copy(bundle); mutate(bad); assert.throws(()=>api.assertChapterBundleV2(bad));
  }
  assert.throws(()=>api.assertChapterBundleV2(bundle,filename.replace('.json','_light.json')),/ファイル名/);
  const badPacket=copy(packet); badPacket.after.gratitude++;
  assert.throws(()=>api.createChapterBundleV2({...input,packet:badPacket}),/検証記録/);
  assert.throws(()=>api.createChapterBundleV2({...input,partner:'invalid story'}),/本文/);
  assert.throws(()=>api.createChapterBundleV2({...input,verification:{ok:true}}),/検証記録/);
  assert.throws(()=>api.createChapterBundleV2({...input,chapter:2}),/次のChapter/);

  const unknownStory=partner.replace('2026年10月17日（土）／15:00／15℃','不明／不明／不明℃');
  const unknownActions=reviewedActions(engine,args,unknownStory);
  assert.throws(()=>api.createChapterBundleV2({...input,partner:unknownStory,storyActions:unknownActions}),/本文/,'producer rejects an invalid header even with a completed review and an old passing validation');

  const savedRecords=[copy(bundle.records[0].entry)];
  const nextArgs={...args,stateEntry:{currentState:packet.after,stateHistory:[{turn:1}]},records:savedRecords,protagonistInput:args.protagonistInput.replace('Chapter1','Chapter2')};
  const nextPacket=engine.runTurn(nextArgs), nextStory=partner.replace('Chapter 1','Chapter 2');
  const nextActions=reviewedActions(engine,nextArgs,nextStory);
  const nextInput={...input,args:nextArgs,packet:nextPacket,partner:nextStory,chapter:2,savedRecords,recordIndices:[0],storyActions:nextActions,verification:engine.verifyTurn(nextArgs,nextPacket),validation:engine.validateStory(nextArgs,nextPacket,nextStory,nextActions)};
  const next=api.createChapterBundleV2(nextInput);
  assert.equal(next.records[0].index,1);
  assert.equal(next.stateHistory[0].index,1);
  assert.deepEqual(copy(next.replayContext.recordIndices),[0]);
  assert.throws(()=>api.createChapterBundleV2({...nextInput,recordIndices:[1]}),/参照番号/);

  for(const saveId of ['run_format_test',null]){
    const prompt=scope.window.RenaiGameHandoff.buildPrompt({character:args.character,profile:args.protagonistProfile,saveId,session:{}});
    assert.match(prompt,/標準version 2/);
    // Check the format policy, not one exact phrasing of the handoff text.
    assert.match(prompt,/(?:全文|全項目|完全保存)[^\n]*version 1[^\n]*(?:変更しない|切り替えず)/);
    assert.match(prompt,/assertChapterBundleV2/);
    assert.doesNotMatch(prompt,/心理パケットの値はstateHistoryのentry直下に1回だけ展開/);
  }
  // New releases update this cache key without changing the required policy.
  assert.match(read('simulation/simulation_new.html'),/simulation_handoff\.js\?v=[^"\s]+/);

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chapter-format-'));
  try{
    const file=path.join(dir,filename);
    fs.writeFileSync(file,JSON.stringify(bundle));
    const run=file=>spawnSync(process.execPath,[path.join(root,'simulation/scripts/validate_chapter_bundle.cjs'),file],{encoding:'utf8'});
    assert.equal(run(file).status,0,'offline CLI accepts a standard bundle');
    const renamed=file.replace('.json','_light.json'); fs.copyFileSync(file,renamed);
    assert.equal(run(renamed).status,1,'CLI rejects an alternate output filename');
    const legacy=copy(bundle); legacy.version=1; fs.writeFileSync(file,JSON.stringify(legacy));
    assert.equal(run(file).status,1,'standard output checker rejects a legacy output');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
  console.log('PASS: standard v2 producer, strict format and filename checks, real char_016 packet, handoff instructions and offline CLI');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

