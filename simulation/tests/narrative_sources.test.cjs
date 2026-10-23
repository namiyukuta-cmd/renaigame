'use strict';
// Synthetic source/version regression; no private save is read or modified.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=require('../js/ai_turn_runtime.js');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const old=JSON.parse(read('simulation/tests/fixtures/char_004_source_v3.json'));
const id=old.save.state.selectedCharacterId,sources=Object.fromEntries(runtime.sourcePaths(id).map(p=>[p,read(p)]));
const r=runtime.createRuntime({sources,save:old.save,saveId:old.save.saveId,characterId:id}),e=r.scope.RenaiGameTurnEngine,args=r.buildArgs(old.input);
assert.equal(args.character.aiInitialState.flags.currentRomanticLoveForMilia,true,
  'a character-specific fixed false must not veto the common protagonist-first romance');
assert.doesNotMatch(args.behavior.priorityRules.join('\n'),/恋愛接近を起こさない|恋愛.*発生させない|true 相当へ読み替えない/);
assert.equal(args.sourceHistory.length,1);
assert.equal(e.fingerprint(args.sourceHistory[0].character),old.packet.sources.character,'archived character is the exact original source');
assert.equal(e.fingerprint(args.sourceHistory[0].behavior),old.packet.sources.behavior,'archived behavior is the exact original source');
const measured=r.runTurn(old.input),snapshot=JSON.stringify({old,args});
for(const key of ['before','after','evaluations','changes','evidence'])assert.equal(JSON.stringify(measured.packet[key]),JSON.stringify(old.packet[key]),key+' is not inflated to manufacture romance');
assert.notEqual(measured.packet.sources.character,old.packet.sources.character,'new turns identify the corrected active source');
assert.equal(e.verifyTurn(args,old.packet).ok,true,'a complete historic packet still replays exactly');
assert.equal(e.validateStory(args,old.packet,old.story,old.actions).ok,true,'a historic v3 review retains its original binding');
const replay=e.replayTurn(args,old.packet.fingerprint);
assert.equal(JSON.stringify(replay.packet),JSON.stringify(old.packet));
assert.equal(replay.args.replaySourceRevision,old.sourceRevision);
const reviewed=require('./helpers/review_fixture.cjs');
const currentActions=reviewed(e,args,old.story,{romanceProgress:old.actions.romanceProgress});
assert.equal(r.releaseStory(old.input,measured.packet,old.story,currentActions).story,old.story);
assert.throws(()=>r.releaseStory(old.input,old.packet,old.story,currentActions),/過去版/,'an archived packet cannot drive a fresh chapter');
assert.throws(()=>e.releaseStory(replay.args,old.packet,old.story,reviewed(e,replay.args,old.story,{romanceProgress:old.actions.romanceProgress})),/過去版/);
for(const mutate of [p=>p.after.trust++,p=>p.sources.behavior='00000000',p=>p.protagonistInput+='変更']){
  const bad=JSON.parse(JSON.stringify(old.packet));mutate(bad);assert.equal(e.verifyTurn(args,bad).ok,false,'history support cannot waive packet identity or actual replay');
}
const changed=old.story+'\n別の出来事を付け加えた。';
assert.equal(e.validateStory(args,old.packet,changed,old.actions).ok,false,'history support cannot reuse a review for edited prose');
assert.equal(JSON.stringify({old,args}),snapshot,'neither active nor historic source checks rewrite the save');

(async()=>{
  new Function('window',read('simulation/js/simulation_save.js'))(r.scope);
  const api=r.scope.RenaiGameSave,source={head:'a'.repeat(40),save:old.save,index:{version:1,saves:[old.save.meta]}};
  const before=JSON.stringify({old,source});
  assert.equal((await api.prepareChapterImport(old.bundle,source)).fingerprint,old.packet.fingerprint,'standard compact chapter v2 replays its exact former source');
  const full=JSON.parse(JSON.stringify(old.bundle));full.version=1;
  full.stateHistory[0].entry={...full.stateHistory[0].entry,...old.packet,packet:old.packet};
  assert.equal((await api.prepareChapterImport(full,source)).fingerprint,old.packet.fingerprint,'legacy complete packet import also retains its exact source');
  const corrupt=JSON.parse(JSON.stringify(old.bundle));corrupt.stateHistory[0].entry.fingerprint='00000000';
  await assert.rejects(api.prepareChapterImport(corrupt,source),/指紋/);
  assert.equal(JSON.stringify({old,source}),before,'reading old chapters never alters original prose, psychology, hashes or receipts');
  console.log('PASS: active romance sources, exact v3 source/review replay, full and compact imports, tampering rejection, unchanged psychology and fresh-source release');
})().catch(error=>{console.error(error);process.exitCode=1;});
