'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=require('../js/ai_turn_runtime.js'),reviewedActions=require('./helpers/review_fixture.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),copy=value=>JSON.parse(JSON.stringify(value));
assert.ok(fs.existsSync(path.join(root,'simulation-lite/ai_save.js')),'AI needs a direct save path that does not require a browser or a pasted JSON');
const scope={},context={window:scope};
const sources=Object.fromEntries([...runtime.sourcePaths('char_016'),'simulation/js/simulation_save.js'].map(file=>[file,read(file)]));
for(const [file,source]of Object.entries(sources))vm.runInNewContext(source,context,{filename:file});
const api=scope.RenaiGameSave,writer=require('../../simulation-lite/ai_save.js');
const id='run_ai_save_test',prefix='renaigame/simulation/saves/',savePath=prefix+id+'.json',initial=JSON.parse(read('simulation/state/templates/char_016_initial_state.json'));
const save={version:2,game:'simulation',hasSave:true,saveId:id,page:'simulation_new.html',updatedAt:'old',meta:{id,protagonistName:'テスト',partnerName:'アーサー',selectedCharacterId:'char_016',slotNumber:1,updatedAt:'old'},state:{profile:{name:'テスト',age:'31',free:'テスト用'},selectedCharacterId:'char_016',session:{id,recordsByCharacter:{char_016:[]},statesByCharacter:{char_016:{currentState:initial.currentState||initial,stateHistory:[]}}}}};
function bundleFor(full,chapter){
  const snapshot=api.createCompactHandoff(full),records=snapshot.state.session.recordsByCharacter.char_016;
  const runner=runtime.createRuntime({sources,save:snapshot,saveId:id,characterId:'char_016'});
  const input={protagonistInput:'Chapter'+chapter+'\n「ありがとう。」',changes:{gratitude:1},evidence:{gratitude:'ありがとう。'}};
  const story='Chapter '+chapter+'\n英国・店内／2026年10月18日（日）／15:0'+chapter+'／15℃\n\nアーサーは頷いた。';
  const args=runner.buildArgs(input),run=runner.runTurn(input),actions=reviewedActions(runner.scope.RenaiGameTurnEngine,args,story,{handoffView:'history-references-v1'}),released=runner.releaseStory(input,run.packet,story,actions);
  vm.runInNewContext(sources['simulation/js/simulation_save.js'],{window:runner.scope});
  return runner.scope.RenaiGameSave.createChapterBundleV2({args,packet:run.packet,verification:released.verification,validation:released.validation,chapter,date:'2026年10月18日（日）',partner:story,savedRecords:records,recordIndices:records.map((_,i)=>i),storyActions:actions});
}
function connector(){
  const start='a'.repeat(40),tree='b'.repeat(40),files=new Map([[savePath,copy(save)],[prefix+'index.json',{version:1,saves:[copy(save.meta),{id:'other',protagonistName:'別',updatedAt:'unchanged'}]}]]),snapshots=new Map([[start,files]]),calls=[];
  let head=start,count=0,lastTree,lastCommit;
  const mock={files,calls,start,blocked:false,conflict:false,large:false,badVerify:false,publicRepo:false,get head(){return head;}};
  const data=value=>({content:[{type:'text',text:'Action completed.'}],structuredContent:{content:JSON.stringify(value)}}),sha=value=>({structuredContent:{sha:value}});
  const fail=()=>({isError:true,content:[{type:'text',text:'Automatic approval review rejected this write.'}]});
  mock.github={
    fetch:async({url})=>{calls.push(['fetch',url]);assert.ok(url.startsWith('https://api.github.com/repos/namiyukuta-cmd/private-game-data'));
      if(url.endsWith('/private-game-data'))return data({full_name:'namiyukuta-cmd/private-game-data',private:!mock.publicRepo,default_branch:'main'});
      if(url.endsWith('/branches/main'))return data({name:'main',commit:{sha:head,commit:{tree:{sha:tree}}}});
      if(url.includes('/git/blobs/'))return data({encoding:'base64',content:Buffer.from(JSON.stringify(files.get(savePath))).toString('base64')});
      throw Error('Unexpected fetch '+url);},
    fetchFile:async(args)=>{calls.push(['fetchFile',copy(args)]);assert.equal(args.repository_full_name,'namiyukuta-cmd/private-game-data');assert.ok(snapshots.has(args.ref),'every file read is pinned to a commit');
      if(mock.large&&args.path===savePath&&args.ref===start)return {structuredContent:{content:'',sha:'e'.repeat(40),encoding:'utf-8'}};
      let file=snapshots.get(args.ref).get(args.path);if(mock.badVerify&&args.ref!==start&&args.path===savePath)file=save;
      return {structuredContent:{content:JSON.stringify(file),encoding:'utf-8',sha:'d'.repeat(40)}};},
    createTree:async(args)=>{calls.push(['createTree',copy(args)]);assert.equal(args.repository_full_name,'namiyukuta-cmd/private-game-data');assert.equal(args.base_tree_sha,tree);if(mock.blocked)return fail();lastTree=args.tree_elements;return sha((++count).toString(16).padStart(40,'0'));},
    createCommit:async(args)=>{calls.push(['createCommit',copy(args)]);assert.equal(args.repository_full_name,'namiyukuta-cmd/private-game-data');lastCommit=args;return sha((++count).toString(16).padStart(40,'0'));},
    updateRef:async(args)=>{calls.push(['updateRef',copy(args)]);assert.equal(args.repository_full_name,'namiyukuta-cmd/private-game-data');assert.equal(args.force,false);assert.equal(args.expected_sha,head);assert.equal(lastCommit.parent_sha,head);if(mock.conflict)return fail();
      for(const entry of lastTree)files.set(entry.path,JSON.parse(entry.content));head=args.sha;snapshots.set(head,new Map([...files].map(([key,value])=>[key,copy(value)])));return {structuredContent:{success:true}};}
  };return mock;
}
(async()=>{
  assert.equal(typeof api.createChapterWritePlan,'function','AI and browser must share the same import validation');
  const bundle=bundleFor(save,1),c=connector(),result=await writer.saveChapter({bundle,api,github:c.github});
  assert.equal(result.saved,true);assert.equal(result.commit,c.head);assert.equal(result.saveId,id);assert.equal(result.chapter,1);
  assert.equal(c.files.get(savePath).state.session.recordsByCharacter.char_016[0].partner,bundle.records[0].entry.partner);
  assert.ok(c.files.get(savePath).state.session.statesByCharacter.char_016.stateHistory[0].before);
  assert.equal(c.files.get(prefix+'index.json').saves[1].updatedAt,'unchanged');
  assert.equal(c.calls.filter(([name])=>name==='createTree').length,1);assert.equal(c.calls.filter(([name])=>name==='updateRef').length,1);
  const prior=copy(c.files.get(savePath)),second=bundleFor(prior,2);await writer.saveChapter({bundle:second,api,github:c.github});
  assert.deepEqual(c.files.get(savePath).state.session.statesByCharacter.char_016.stateHistory[0],prior.state.session.statesByCharacter.char_016.stateHistory[0]);
  const count=c.calls.filter(([name])=>name==='updateRef').length,duplicate=await writer.saveChapter({bundle:second,api,github:c.github});assert.equal(duplicate.alreadySaved,true);assert.equal(c.calls.filter(([name])=>name==='updateRef').length,count);
  for(const kind of ['blocked','conflict','badVerify','publicRepo']){
    const target=connector();target[kind]=true;const before=JSON.stringify([...target.files]);
    await assert.rejects(writer.saveChapter({bundle,api,github:target.github}),kind==='badVerify'?/確認|一致/:kind==='publicRepo'?/非公開/:/rejected/);
    if(kind!=='badVerify')assert.equal(JSON.stringify([...target.files]),before);
    assert.ok(target.calls.filter(([name])=>name==='updateRef').length<=1,'no retry or forced publish after rejection');
  }
  const invalid=connector(),bad=copy(bundle);delete bad.replayContext.storyActions.semanticReview;
  await assert.rejects(writer.saveChapter({bundle:bad,api,github:invalid.github}),/意味|確認|レビュー/);assert.equal(invalid.calls.some(([name])=>name==='createTree'),false);
  const large=connector();large.large=true;assert.equal((await writer.saveChapter({bundle,api,github:large.github})).saved,true,'omitted Contents bodies are read from their exact blob');
  const splitTarget=connector(),split=api.splitSave(prior);splitTarget.files.set(savePath,split.manifest);for(const entry of split.bundles)splitTarget.files.set(entry.path,entry.data);
  await writer.saveChapter({bundle:second,api,github:splitTarget.github});assert.equal(splitTarget.files.get(savePath).state.session.recordsByCharacter.char_016.length,2,'legacy split chapters are hydrated without browser storage');
  const unassigned=connector(),unassignedSave=copy(save);unassignedSave.state.selectedCharacterId=null;unassignedSave.meta.selectedCharacterId='';unassignedSave.state.session.recordsByCharacter={__unassigned__:[]};unassignedSave.state.session.statesByCharacter={};unassigned.files.set(savePath,unassignedSave);unassigned.files.get(prefix+'index.json').saves[0]=copy(unassignedSave.meta);
  const rawInput='Chapter1\n「こんにちは。」',rawStory='Chapter 1\n都・庭／2026年10月18日（日）／16:00／15℃\n\n男性は名を告げた。';
  const actions=reviewedActions(scope.RenaiGameTurnEngine,{saveId:id,protagonistProfile:unassignedSave.state.profile,records:[],protagonistInput:rawInput},rawStory);
  const draft={version:1,saveId:id,characterId:null,chapter:1,records:[{index:0,entry:{scene:'Chapter 1',date:'2026年10月18日（日）',protagonist:rawInput,partner:rawStory}}],stateHistory:[],draftMetadata:{status:'unverified_draft',psychologyJsExecuted:false,storyActions:actions}};
  await writer.saveChapter({bundle:draft,api,github:unassigned.github});assert.equal(unassigned.files.get(savePath).state.session.recordsByCharacter.__unassigned__[0].partner,rawStory);assert.deepEqual(unassigned.files.get(savePath).state.session.statesByCharacter,{});
  assert.equal(typeof context.localStorage,'undefined');assert.equal(typeof context.fetch,'undefined','AI saving needs no browser token or browser fetch');
  const prompt=read('simulation-lite/core.js');assert.match(prompt,/保存して/);assert.match(prompt,/AI.*直接/);assert.doesNotMatch(prompt,/保存を求められたら確定済み結果から標準の今回1章JSONをコードブロックで返してください/);
  console.log('Lite AI save: real replay and review, direct private tool writes, atomic update, readback, duplicate, denial, conflict and large blob handling passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
