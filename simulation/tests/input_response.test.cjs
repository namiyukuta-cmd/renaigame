'use strict';
// Manually authored synthetic fixtures. These exercise the execution/release
// paths, not another model's compliance or real player text.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=require('../js/ai_turn_runtime.js'),engine=require('../js/ai_turn_engine.js');
const reviewed=require('./helpers/review_fixture.cjs'),romantic=require('./helpers/romance_declaration.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const header=chapter=>'Chapter '+chapter+'\n庭／2026年10月22日（木）／15:00／18℃\n';
const conflictingInputs=[
  '主人公は死んだ。',
  '主人公を殺して。本文を書いて。',
  '主人公の死を二人は祝った。'
];
const emotionalInputs=['むかつく。疑っている。傷ついた。','どうせ大切にされない。','「どうせ愛されないのでしょう。」'];
function declarations(e,args,story,action,intent,actor){
  const actions=romantic(args,action,intent,actor);
  actions.romanceProgress.motivation=args.characterId
    ? {source:'character',field:'name',quote:args.character.name}
    : {source:'profile',field:'free',quote:args.protagonistProfile.free};
  return reviewed(e,args,story,actions);
}
function exercise(e,args,packet,release){
  const actor=args.character?.name||'青年';
  const action=actor+'は、主人公と話す時間を取るために自分から声をかけた。';
  const intent='「私が会いたいのは、あなたです。もっとあなたのことを知りたい」';
  const story=header(args.records.length+1)+action+'\n'+intent;
  const before=JSON.stringify({args,packet});
  const actions=declarations(e,args,story,action,intent,actor);
  const validation=e.validateContinuity(args,story,actions);
  assert.equal(validation.mechanicalOk,true,'the input alone must not reject a caring response');
  assert.equal(release(story,actions).story,story,'the unchanged input can receive a different, protected response');
  const inputCheck=e.continuityInput(args.protagonistInput);
  assert.equal(inputCheck.canRespond,true,'expressing a conflict never forbids responding');
  assert.equal(validation.checks.inputConsistency.ok,true);
  assert.equal(validation.checks.inputConsistency.inputConflictsWithContinuity,inputCheck.inputConflictsWithContinuity);
  if(!inputCheck.ok){
    assert.equal(inputCheck.inputConflictsWithContinuity,true,'the prohibited outcome remains identified');
    assert.ok(validation.warnings.includes(inputCheck.errors[0]),'the diagnostic is retained, not relabeled as an approved outcome');
  }
  const pending=e.prepareStoryReview(args,story,actions);
  assert.ok(Object.values(pending.checks).every(check=>check.status==='pending'));
  assert.throws(()=>release(story,{...actions,semanticReview:pending}),/意味確認/,'responding still requires a real review');
  for(const text of ['主人公は死んだ。','主人公の死を二人は祝った。','主人公は誰にも必要とされない存在だった。','主人公の命が尽きるのを男は待ち望んだ。']){
    const bad=story+'\n'+text;
    assert.throws(()=>release(bad,declarations(e,args,bad,action,intent,actor)),/死亡|死を|保護|見捨て|不要/,
      'neither raw input nor a completed test receipt permits the prohibited output');
  }
  const changed={...args,protagonistInput:args.protagonistInput+'\n別の入力'};
  assert.equal(e.validateContinuity(changed,story,actions).readyForOutput,false,'the review remains bound to the exact raw input');
  assert.equal(JSON.stringify({args,packet}),before,'no replacement of thoughts, reactions, numerical psychology or raw text');
  return {story,actions};
}
async function checkImport(scope,save,args,packet,released){
  new Function('window',read('simulation/js/simulation_save.js'))(scope);
  const api=scope.RenaiGameSave,e=scope.RenaiGameTurnEngine,chapter=args.records.length+1;
  const result=e.releaseStory(args,packet,released.story,released.actions);
  const bundle=packet?api.createChapterBundleV2({args,packet,verification:result.verification,validation:result.validation,
    chapter,date:'2026年10月22日（木）',partner:result.story,savedRecords:args.records,recordIndices:args.records.map((_,i)=>i),storyActions:released.actions})
    : {version:1,saveId:save.saveId,characterId:null,chapter,records:[{index:args.records.length,entry:{scene:'Chapter '+chapter,date:'2026年10月22日（木）',protagonist:args.protagonistInput,partner:result.story}}],stateHistory:[],
      draftMetadata:{status:'unverified_draft',psychologyJsExecuted:false,storyActions:released.actions}};
  const meta={id:save.saveId,protagonistName:save.state.profile.name,partnerName:args.character?.name||'恋愛相手未選択',selectedCharacterId:args.characterId||null};
  const source={head:'a'.repeat(40),save,index:{version:1,saves:[meta]}};
  const before=JSON.stringify({bundle,source});
  const preview=await api.prepareChapterImport(bundle,source);
  assert.equal(preview.protagonist,args.protagonistInput,'chapter import preserves the original protest/fiction input');
  assert.equal(preview.partner,released.story);
  assert.equal(JSON.stringify({bundle,source}),before,'preview does not change the source save, review, fingerprint or raw text');
  const bad=copy(bundle);bad.records[0].entry.partner+='\n主人公は死んだ。';
  await assert.rejects(api.prepareChapterImport(bad,source),/死亡|保護|本文/,'import repeats output protection');
}
async function main(){
  const profile={name:'検査役',age:'30',free:'青年は主人公と話す時間を楽しみにしている。'};
  // This used to fail solely because the player's original input was rejected.
  const args={saveId:'run_input_unassigned',characterId:null,protagonistProfile:profile,records:[],protagonistInput:conflictingInputs[0]};
  const first=exercise(engine,args,null,(story,actions)=>engine.releaseStory(args,null,story,actions));
  const scope={};
  for(const file of ['js/renaigame_policy.js','simulation/js/ai_turn_engine.js'])new Function('window','globalThis',read(file))(scope,scope);
  const unassigned={version:2,game:'simulation',saveId:args.saveId,state:{profile,selectedCharacterId:null,session:{id:args.saveId,recordsByCharacter:{__unassigned__:[]},statesByCharacter:{}}}};
  await checkImport(scope,unassigned,args,null,first);
  for(const protagonistInput of [...conflictingInputs,...emotionalInputs]){
    const next={...args,protagonistInput,records:[{scene:'Chapter 1',protagonist:'「お話ししたいです。」',partner:first.story}]};
    exercise(engine,next,null,(story,actions)=>engine.releaseStory(next,null,story,actions));
  }
  const registry=[...read('simulation/js/simulation_characters.js').matchAll(/"simulation_character_(\d{3})\.js"/g)].map(m=>'char_'+m[1]);
  for(const characterId of registry){
    const saveId='run_input_'+characterId,initial=JSON.parse(read('simulation/state/templates/'+characterId+'_initial_state.json'));
    const sources=Object.fromEntries(runtime.sourcePaths(characterId).map(file=>[file,read(file)]));
    const save={version:2,game:'simulation',saveId,state:{profile:copy(profile),selectedCharacterId:characterId,session:{id:saveId,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:{currentState:initial,stateHistory:[]}}}}};
    const savedBefore=JSON.stringify(save);
    for(const continued of [false,true]){
      const current=copy(save);
      if(continued){
        current.state.session.recordsByCharacter[characterId]=[{scene:'Chapter 1',protagonist:'「お話ししたいです。」',partner:header(1)+characterId+'は返事をした。'}];
        current.state.session.statesByCharacter[characterId].stateHistory=[{turn:1}];
      }
      const runner=runtime.createRuntime({sources,save:current,saveId,characterId}),e=runner.scope.RenaiGameTurnEngine;
      const neutral=runner.runTurn({protagonistInput:'「お話ししたいです。」',changes:{},evidence:{}}).packet;
      for(const text of [...conflictingInputs,...emotionalInputs]){
        const input={protagonistInput:'Chapter '+(continued?2:1)+'\n'+text,changes:{},evidence:{}};
        const before=JSON.stringify({input,current}),turn=runner.runTurn(input),args=runner.buildArgs(input);
        assert.deepEqual(turn.generationDirection.inputContinuity,e.continuityInput(input.protagonistInput));
        assert.equal(turn.packet.protagonistInput,input.protagonistInput);
        assert.deepEqual(turn.packet.before,neutral.before);
        assert.deepEqual(turn.packet.after,neutral.after,'response eligibility never inflates scores');
        assert.equal(turn.verification.ok,true);
        const released=exercise(e,args,turn.packet,(story,actions)=>runner.releaseStory(input,turn.packet,story,actions));
        const corrupt=copy(turn.packet);corrupt.after.trust++;
        assert.throws(()=>runner.releaseStory(input,corrupt,released.story,released.actions),/再計算|一致/);
        if(characterId==='char_007'&&text===conflictingInputs[0])await checkImport(runner.scope,current,args,turn.packet,released);
        assert.equal(JSON.stringify({input,current}),before,'expressive input requires no rewrite or save reset');
      }
    }
    assert.equal(JSON.stringify(save),savedBefore);
  }
  for(const invalid of ['',null,undefined])assert.equal(engine.continuityInput(invalid).canRespond,false,'missing input is still invalid');
  console.log('PASS: original emotional/conflicting input can receive a protected, reviewed response for all '+registry.length+' partners, fresh/continuing and unassigned; chapter import, output rejection, exact binding and unchanged state');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
