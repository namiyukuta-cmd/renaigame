const reviewedActions=require('./helpers/review_fixture.cjs');
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const files = new Map(), local = new Map(), pending = new Map(), commits = new Map();
let head = 'original', sequence = 0, failPublish = false;
let verificationReads = [];
const response = (data,status=200) => ({ ok: status < 400, status, json: async()=>data });
const sandbox = { window: {}, TextEncoder, TextDecoder, Date,
  btoa: x=>Buffer.from(x,'binary').toString('base64'), atob: x=>Buffer.from(x,'base64').toString('binary'),
  localStorage: { getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k) },
  fetch: async(url,options={}) => {
    if(url.startsWith('state/templates/')) return response(JSON.parse(fs.readFileSync(root+'/simulation/'+url)));
    const route = url.split('?')[0].replace('https://api.github.com/repos/namiyukuta-cmd/private-game-data','').replace(/^\//,'');
    const body = options.body && JSON.parse(options.body);
    if(!route) return response({default_branch:'main'});
    if(route.startsWith('contents/')) {
      const key=decodeURIComponent(route.slice(9));
      const ref = new URL(url).searchParams.get('ref');
      if(ref) verificationReads.push(ref);
      // Model an old contents response after a successful publish. Only the
      // explicit commit can reliably identify the bytes just written.
      if(head !== 'original' && !ref && key.includes('/chapters/') && verificationReads.length === 0) return response({},404);
      return files.has(key)?response({content:Buffer.from(JSON.stringify(files.get(key))).toString('base64')}):response({},404);
    }
    if(route==='git/ref/heads/main') return response({object:{sha:head}});
    if(route.startsWith('git/commits/') && !body) return response({tree:{sha:'base'}});
    if(route==='git/trees') {const sha='tree'+ ++sequence;pending.set(sha,body.tree);return response({sha});}
    if(route==='git/commits') {const sha='commit'+ ++sequence;commits.set(sha,body);return response({sha});}
    if(route==='git/refs/heads/main') {
      if(failPublish || commits.get(body.sha).parents[0]!==head) return response({},422);
      pending.get(commits.get(body.sha).tree).forEach(file=>files.set(file.path,JSON.parse(file.content)));head=body.sha;return response({object:{sha:head}});
    }
    throw Error('Unexpected route '+route);
  }
};
for(const file of ['js/renaigame_policy.js','js/renaigame_psychology_parameters.js','simulation/js/ai_turn_engine.js','simulation/js/simulation_character_007.js','simulation/js/simulation_character_007_behavior.js','simulation/js/simulation_save.js']) vm.runInNewContext(fs.readFileSync(root+'/'+file,'utf8'),sandbox);
const api=sandbox.window.RenaiGameSave, engine=sandbox.window.RenaiGameTurnEngine, psychology=sandbox.window.RenaiGamePsychologyParameters;
const initial=JSON.parse(fs.readFileSync(root+'/simulation/state/templates/char_007_initial_state.json'));
const prefix='renaigame/simulation/saves/', id='run_import_test', characterId='char_007', profile={name:'取込テスト',age:'41',free:''};
const current={version:2,saveId:id,hasSave:true,game:'simulation',page:'simulation_new.html',updatedAt:'old',meta:{id,protagonistName:profile.name,partnerName:'エミール',selectedCharacterId:characterId,updatedAt:'old'},state:{profile,selectedCharacterId:characterId,session:{id,recordsByCharacter:{},statesByCharacter:{}}},storage:{format:'chapter-files-v1',characters:{}}};
const args={saveId:id,characterId,character:sandbox.window.SimulationCharacter007,behavior:sandbox.window.SimulationCharacter007Behavior,psychology,stateEntry:initial,records:[],protagonistProfile:profile,protagonistInput:'Chapter1\n「ありがとう。」',changes:{gratitude:2},evidence:{gratitude:'ありがとう。'},yoinomaContext:{}};
const packet=engine.runTurn(args), story='Chapter 1\nスウェーデン・家／2026年10月13日（火）／08:00／10℃\n\nエミールは静かに頷いた。';
const actions=reviewedActions(engine,args,story);
const bundle={version:1,saveId:id,characterId,chapter:1,records:[{index:0,entry:{scene:'Chapter 1',date:'2026-10-13',protagonist:args.protagonistInput,partner:story}}],stateHistory:[{index:0,entry:{turn:1,scene:'Chapter 1',...packet,verification:engine.verifyTurn(args,packet),validation:engine.validateStory(args,packet,story,actions),packet}}],replayContext:{recordIndices:[],storyActions:actions}};
const copy=x=>JSON.parse(JSON.stringify(x));
function v2Bundle(value){
  const result=copy(value); result.version=2;
  result.replayContext ||= {recordIndices:[],storyActions:{}};
  const h=result.stateHistory[0].entry;
  for(const key of ['version','saveId','characterId','protagonistInput','before','after','evaluations','sources','execution','packet']) delete h[key];
  return result;
}
async function main(){
  api.setToken('test');files.set(prefix+id+'.json',copy(current));files.set(prefix+'index.json',{version:1,saves:[copy(current.meta),{id:'unrelated',protagonistName:'別',selectedCharacterId:'char_006',updatedAt:'unchanged'}]});
  const before=JSON.stringify([...files]);
  const extended=copy(bundle);
  extended.stateHistory[0].entry.packet.futureAudit={kept:"all"};
  const extendedCompact=api.compactChapterBundle(extended).stateHistory[0].entry;
  assert.equal(extendedCompact.futureAudit.kept,"all");
  assert.ok(extendedCompact.packetFieldNames.includes("futureAudit"));
  assert.deepEqual(JSON.parse(JSON.stringify(api.compactChapterBundle(api.compactChapterBundle(bundle)))),copy(api.compactChapterBundle(bundle)),"compaction is idempotent");
  const compact=api.compactChapterBundle(bundle);
  assert.equal(compact.stateHistory[0].entry.packet,undefined);
  assert.deepEqual(compact.stateHistory[0].entry.before,bundle.stateHistory[0].entry.before);
  assert.equal(JSON.stringify(bundle.stateHistory[0].entry.packet),JSON.stringify(packet),'source bundle remains unchanged');
  const fromNested=copy(bundle);
  for(const key of Object.keys(packet)) delete fromNested.stateHistory[0].entry[key];
  const nestedPreview=await api.prepareChapterImport(fromNested);
  assert.equal(nestedPreview.chapter,1,'nested-only packet compatibility');
  const v2Preview=await api.prepareChapterImport(v2Bundle(bundle));
  assert.equal(v2Preview.chapter,1,'standard v2 format stays compatible');
  const corruptV2=v2Bundle(bundle);corruptV2.stateHistory[0].entry.fingerprint='invalid';corruptV2.stateHistory[0].entry.verification.replayFingerprint='invalid';
  await assert.rejects(api.prepareChapterImport(corruptV2),/指紋/);
  const unknown=copy(bundle);
  unknown.records[0].entry.partner=story.replace('2026年10月13日（火）／08:00／10℃','不明／不明／不明℃');
  unknown.replayContext.storyActions=reviewedActions(engine,args,unknown.records[0].entry.partner);
  await assert.rejects(api.prepareChapterImport(unknown),/Chapterヘッダ/,'selected import rechecks the actual header instead of trusting an old ok:true');
  const preview=await api.prepareChapterImport(compact);
  assert.equal(preview.chapter,1);assert.equal(preview.protagonistName,profile.name);
  assert.equal(JSON.stringify([...files]),before,'preview never writes');
  const bad=copy(bundle);bad.stateHistory[0].entry.packet.after.gratitude++;
  await assert.rejects(api.prepareChapterImport(bad));
  const other=copy(bundle);other.characterId='char_006';await assert.rejects(api.prepareChapterImport(other));
  failPublish=true;await assert.rejects(api.commitChapterImport(preview));assert.equal(JSON.stringify([...files]),before,'failed commit never publishes partial state');failPublish=false;
  const saved=await api.commitChapterImport(preview);
  assert.equal(verificationReads.length,2,'each published file is checked at its exact commit');
  assert.ok(verificationReads.every(ref=>ref===head));
  // The old local screen can be recovered by loading the saved slot, even
  // when a previous attempt failed after GitHub accepted the commit.
  local.set(api.SESSION_KEY,JSON.stringify(current.state.session));
  await api.loadSaveById(id);
  assert.equal(JSON.parse(local.get(api.SESSION_KEY)).recordsByCharacter.char_007.length,1);
  assert.equal(saved.state.session.recordsByCharacter.char_007.length,1);
  const storedHistory=saved.state.session.statesByCharacter.char_007.stateHistory[0];
  assert.equal(storedHistory.packet,undefined,'store packet values only once');
  assert.deepEqual(JSON.parse(JSON.stringify(storedHistory)),JSON.parse(JSON.stringify(compact.stateHistory[0].entry)));
  // A previously saved legacy entry and a new compact upload are the same chapter.
  const persisted=files.get(prefix+id+'.json');
  persisted.state.session.statesByCharacter.char_007.stateHistory[0]=copy(bundle.stateHistory[0].entry);
  assert.equal((await api.prepareChapterImport(compact)).alreadySaved,true);
  persisted.state.session.statesByCharacter.char_007.stateHistory[0]=copy(storedHistory);
  const metadata=copy(bundle);metadata.stateHistory[0].entry.customAudit={retained:true};
  assert.equal(api.compactChapterBundle(metadata).stateHistory[0].entry.customAudit.retained,true);
  assert.equal(JSON.stringify(saved.state.session.statesByCharacter.char_007.currentState),JSON.stringify(packet.after));
  assert.equal(files.get(prefix+'index.json').saves[1].updatedAt,'unchanged');
  const duplicate=await api.prepareChapterImport(bundle);assert.equal(duplicate.alreadySaved,true);
  await assert.rejects(api.commitChapterImport(duplicate));
  const conflict=copy(bundle);conflict.records[0].entry.partner+='違う本文';await assert.rejects(api.prepareChapterImport(conflict),/異なる記録/);
  for(const chapter of [2,3,4]){
    const slot=files.get(prefix+id+'.json');
    const logs=slot.state.session.recordsByCharacter.char_007;
    // Chapter 3 deliberately replays a subset; use exactly the same selection.
    const indices=chapter===2?[0]:chapter===3?[1]:[2];
    const turnArgs={...args,protagonistProfile:chapter===4?{}:profile,stateEntry:slot.state.session.statesByCharacter.char_007,records:indices.map(i=>logs[i]),protagonistInput:'Chapter'+chapter+'\n「ありがとう。」'};
    const turnPacket=engine.runTurn(turnArgs);
    const turnStory=story.replace('Chapter 1','Chapter '+chapter);
    const turnActions=reviewedActions(engine,turnArgs,turnStory);
    const next={version:1,saveId:id,characterId,chapter,records:[{index:chapter-1,entry:{scene:'Chapter '+chapter,date:'2026-10-13',protagonist:turnArgs.protagonistInput,partner:turnStory}}],stateHistory:[{index:chapter-1,entry:{turn:chapter,scene:'Chapter '+chapter,...turnPacket,verification:engine.verifyTurn(turnArgs,turnPacket),validation:engine.validateStory(turnArgs,turnPacket,turnStory,turnActions),packet:turnPacket}}],replayContext:chapter===2?{records:copy(turnArgs.records),storyActions:turnActions}:{recordIndices:indices,storyActions:turnActions}};
    const wrong=copy(next);wrong.replayContext={recordIndices:[999]};await assert.rejects(api.prepareChapterImport(wrong),/参照番号/);
    const mismatch=copy(next);mismatch.replayContext={recordIndices:chapter===2?[]:[0]};await assert.rejects(api.prepareChapterImport(mismatch),/指紋/);
    const incoming=chapter===4?v2Bundle(next):chapter===3?api.compactChapterBundle(next):next;
    const result=await api.commitChapterImport(await api.prepareChapterImport(incoming));
    const metadata=result.chapterImportMetadataByCharacter.char_007[chapter];
    assert.equal(metadata.replayContext.records,undefined,'past story bodies are not saved twice');
    assert.equal(JSON.stringify(metadata.replayContext.recordIndices),JSON.stringify(indices));
    assert.equal(metadata.replayContext.recordsFingerprint,turnPacket.sources.records);
    const expectedHistory=copy(api.compactChapterBundle(next).stateHistory[0].entry);
    if(chapter===4) delete expectedHistory.protagonistInput;
    assert.deepEqual(JSON.parse(JSON.stringify(result.state.session.statesByCharacter.char_007.stateHistory.at(-1))),expectedHistory,'all psychology and verification survive without nested duplicate');
    assert.equal((await api.prepareChapterImport(incoming)).alreadySaved,true);
    assert.equal(result.state.session.recordsByCharacter.char_007.length,chapter);
    assert.equal((await api.prepareChapterImport(next)).alreadySaved,true);
  }

  console.log('PASS: legacy version 1 + compact version 2, JS replay, duplicate and tamper protection, no nested history packet');
}
main().catch(error=>{console.error(error);process.exitCode=1;});


