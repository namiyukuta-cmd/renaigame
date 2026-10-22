'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const runtime=require('../js/ai_turn_runtime.js'),reviewedActions=require('./helpers/review_fixture.cjs');
const romantic=require('./helpers/romance_declaration.cjs');
const copy=value=>JSON.parse(JSON.stringify(value));
const local=new Map(),files=new Map(),trees=new Map(),commits=new Map(),requests=[];
let head='original',counter=0,failPublish=false;
const response=(data,status=200)=>({ok:status<400,status,json:async()=>copy(data)});
const scope={TextEncoder,TextDecoder,Date,Math,
  btoa:value=>Buffer.from(value,'binary').toString('base64'),atob:value=>Buffer.from(value,'base64').toString('binary'),
  localStorage:{getItem:key=>local.has(key)?local.get(key):null,setItem:(key,value)=>local.set(key,String(value)),removeItem:key=>local.delete(key)},
  fetch:async(url,options={})=>{
    requests.push({url,method:options.method||'GET'});
    if(url.startsWith('state/templates/')) return response(JSON.parse(read('simulation/'+url)));
    assert.ok(url.startsWith('https://api.github.com/repos/namiyukuta-cmd/private-game-data'),'all cloud reads and writes use the private repository');
    const route=new URL(url).pathname.split('/').slice(4).join('/'),body=options.body&&JSON.parse(options.body);
    if(!route) return response({default_branch:'main'});
    if(route.startsWith('contents/')){
      const name=decodeURIComponent(route.slice(9));
      return files.has(name)?response({content:Buffer.from(JSON.stringify(files.get(name))).toString('base64')}):response({},404);
    }
    if(route==='git/ref/heads/main') return response({object:{sha:head}});
    if(route.startsWith('git/commits/')&&!body) return response({tree:{sha:'base'}});
    if(route==='git/trees'){const sha='tree'+ ++counter;trees.set(sha,body.tree);return response({sha});}
    if(route==='git/commits'){const sha='commit'+ ++counter;commits.set(sha,body);return response({sha});}
    if(route==='git/refs/heads/main'){
      if(failPublish||commits.get(body.sha).parents[0]!==head) return response({},422);
      for(const entry of trees.get(commits.get(body.sha).tree)) files.set(entry.path,JSON.parse(entry.content));
      head=body.sha;return response({object:{sha:head}});
    }
    throw Error('Unexpected route: '+route);
  }};
scope.window=scope;
const context=vm.createContext(scope);
for(const file of ['js/renaigame_policy.js','simulation/js/character_settings_validator.js','js/renaigame_psychology_parameters.js','simulation/js/ai_turn_engine.js','simulation/js/simulation_character_016.js','simulation/js/simulation_character_016_behavior.js','simulation/js/simulation_save.js']) vm.runInContext(read(file),context,{filename:file});
const api=scope.RenaiGameSave,id='run_lite_private_test',characterId='char_016',key='renaigame/simulation/saves/'+id+'.json';
const initial=JSON.parse(read('simulation/state/templates/char_016_initial_state.json'));
const base={version:2,game:'simulation',hasSave:true,saveId:id,page:'simulation_new.html',updatedAt:'old',
  meta:{id,protagonistName:'テスト主人公',partnerName:'アーサー',selectedCharacterId:characterId,updatedAt:'old'},
  state:{profile:{name:'テスト主人公',age:'31',free:'テスト用の設定'},selectedCharacterId:characterId,
    session:{id,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:initial}}}};
const sources=Object.fromEntries([...runtime.sourcePaths(characterId),'simulation/js/simulation_save.js'].map(file=>[file,read(file)]));
function chapter(save,number,compact=false,reviewFullHistory=false){
  const view=compact&&!reviewFullHistory?api.createCompactHandoff(save):save;
  const records=view.state.session.recordsByCharacter[characterId];
  const runner=runtime.createRuntime({sources,save:view,saveId:id,characterId,recordIndices:records.map((_,i)=>i)});
  const input={protagonistInput:'Chapter'+number+'\n「ありがとう。」',changes:{gratitude:1},evidence:{gratitude:'ありがとう。'}};
  const approach='アーサーは書物を閉じ、自分から声をかけた。',intent='「あなたと話せるのを楽しみにしていました」';
  const story='Chapter '+number+'\n英国・店内／2026年10月18日（日）／15:0'+number+'／15℃\n\n'+approach+'\n'+intent;
  const args=runner.buildArgs(input),run=runner.runTurn(input);
  const declarations=compact?{handoffView:'history-references-v1'}:{};
  const actions=reviewedActions(runner.scope.RenaiGameTurnEngine,args,story,{...declarations,...romantic(args,approach,intent)});
  const released=runner.releaseStory(input,run.packet,story,actions);
  vm.runInNewContext(sources['simulation/js/simulation_save.js'],{window:runner.scope});
  return runner.scope.RenaiGameSave.createChapterBundleV2({args,packet:run.packet,verification:released.verification,validation:released.validation,
    chapter:number,date:'2026年10月18日（日）',partner:story,savedRecords:records,recordIndices:records.map((_,i)=>i),storyActions:actions});
}
(async()=>{
  assert.equal(typeof api.createCompactHandoff,'function','the lightweight handoff must retain canon without resending old psychology packets');
  api.setToken('test-token');files.set(key,copy(base));files.set('renaigame/simulation/saves/index.json',{version:1,saves:[copy(base.meta)]});
  const loaded=await api.loadSaveById(id);assert.deepEqual(copy(loaded),base);
  const first=chapter(loaded,1);await api.commitChapterImport(await api.prepareChapterImport(first));
  const full=copy(files.get(key)),snapshot=api.createCompactHandoff(full),state=snapshot.state.session.statesByCharacter[characterId];
  assert.deepEqual(copy(state.currentState),full.state.session.statesByCharacter[characterId].currentState);
  assert.deepEqual(copy(snapshot.state.session.recordsByCharacter[characterId]),full.state.session.recordsByCharacter[characterId]);
  assert.deepEqual(Object.keys(state.stateHistory[0]).sort(),['fingerprint','scene','turn']);
  assert.ok(JSON.stringify(snapshot).length<JSON.stringify(full).length,'complete old packets remain only in the private save');
  assert.equal(snapshot.handoffOnly,true);
  assert.deepEqual(files.get(key),full,'constructing the transfer view never changes private canon');
  await assert.rejects(api.saveToGitHub(snapshot),/短縮データ/,'a transfer view cannot replace the full save');
  const second=chapter(full,2,true),before=JSON.stringify([...files]);
  // AI can use the complete canon while retaining the lightweight handoff mark.
  // Its original receipt must match that exact full history on import, without
  // converting it to a compact-history receipt or weakening any review axis.
  const fullReviewed=chapter(full,2,true,true),fullReviewedBefore=JSON.stringify(fullReviewed);
  assert.notEqual(fullReviewed.replayContext.storyActions.semanticReview.binding,second.replayContext.storyActions.semanticReview.binding);
  assert.equal(fullReviewed.stateHistory[0].entry.fingerprint,second.stateHistory[0].entry.fingerprint);
  assert.equal((await api.prepareChapterImport(fullReviewed)).chapter,2,'a full-canon review remains valid with the lightweight handoff mark');
  assert.equal(JSON.stringify(fullReviewed),fullReviewedBefore,'import preserves the original receipt, story and psychology');
  const staleStory=copy(fullReviewed);staleStory.records[0].entry.partner+='\nアーサーは扉を開いた。';
  await assert.rejects(api.prepareChapterImport(staleStory),/意味|確認|レビュー/,'a changed story cannot reuse the full-history review');
  const absentReview=copy(fullReviewed);delete absentReview.replayContext.storyActions.semanticReview;
  await assert.rejects(api.prepareChapterImport(absentReview),/意味|確認|レビュー/);
  const falseEvidence=copy(fullReviewed);falseEvidence.replayContext.storyActions.semanticReview.checks.inputConsistency.sources[0].quote='今回入力にない引用';
  await assert.rejects(api.prepareChapterImport(falseEvidence),/根拠|原文/,'matching binding cannot bypass evidence validation');
  const changedMark=copy(fullReviewed);delete changedMark.replayContext.storyActions.handoffView;
  await assert.rejects(api.prepareChapterImport(changedMark),/意味|確認|レビュー/,'changing the reviewed declarations still invalidates the receipt');
  const changedCanon=copy(full);changedCanon.state.session.statesByCharacter[characterId].stateHistory[0].after.gratitude++;
  await assert.rejects(api.prepareChapterImport(fullReviewed,{head:'a'.repeat(40),save:changedCanon,index:files.get('renaigame/simulation/saves/index.json')}),/意味|確認|レビュー/,'full-history receipts remain bound to the exact saved history');
  assert.equal(JSON.stringify([...files]),before,'successful and rejected review checks never publish');
  const preview=await api.prepareChapterImport(second);assert.equal(JSON.stringify([...files]),before,'validation never publishes');
  failPublish=true;await assert.rejects(api.commitChapterImport(preview));assert.equal(JSON.stringify([...files]),before,'failed save leaves private canon intact');failPublish=false;
  await api.commitChapterImport(await api.prepareChapterImport(second));
  const saved=files.get(key);
  assert.equal(saved.state.session.recordsByCharacter[characterId].length,2);
  assert.deepEqual(saved.state.session.statesByCharacter[characterId].stateHistory[0],full.state.session.statesByCharacter[characterId].stateHistory[0],'all old calculations survive a compact handoff');
  assert.ok(Object.hasOwn(saved.state.session.statesByCharacter[characterId].stateHistory[1],'before'));
  assert.equal((await api.prepareChapterImport(second)).alreadySaved,true);
  const third=chapter(saved,3,true);delete third.replayContext.storyActions.semanticReview;
  await assert.rejects(api.prepareChapterImport(third),/意味|確認|レビュー/,'compact handoff cannot bypass story review');
  assert.equal(files.get(key).state.session.recordsByCharacter[characterId].length,2);
  assert.equal([...local.keys()].some(k=>k==='renaigame_lite_workspace_v1'),false,'no independent browser-only canon');
  const priorSession=local.get(api.SESSION_KEY),priorId=api.getCurrentSaveId();
  const fresh={version:2,game:'simulation',page:'simulation_new.html',meta:{partnerName:'未選択'},state:{profile:{name:'新規テスト'},selectedCharacterId:null}};
  failPublish=true;await assert.rejects(api.saveToGitHub(fresh,{newSlot:true,freshStart:true}));failPublish=false;
  assert.equal(local.get(api.SESSION_KEY),priorSession,'failed new game never replaces another open session');assert.equal(api.getCurrentSaveId(),priorId);
  const created=await api.saveToGitHub(fresh,{newSlot:true,freshStart:true});
  assert.deepEqual(copy(created.state.session.recordsByCharacter),{},'new story must not copy the currently open story');
  assert.deepEqual(copy(created.state.session.statesByCharacter),{},'new unassigned story cannot inherit another man psychology');
  assert.ok(requests.some(r=>r.method==='PATCH'));
  console.log('Lite private: canonical load, compact replay, full history preservation, review gate, atomic private saves passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
