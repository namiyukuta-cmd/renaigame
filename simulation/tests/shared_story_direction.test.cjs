'use strict';
// Synthetic stories only. Exercise the shared paths with every registered
// partner, different protagonists and an unassigned slot; never real saves.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const runtime=require('../js/ai_turn_runtime.js'),engine=require('../js/ai_turn_engine.js');
const reviewed=require('./helpers/review_fixture.cjs'),copy=value=>JSON.parse(JSON.stringify(value));
const romantic=require('./helpers/romance_declaration.cjs');
const header='Chapter 1\n都・庭／2026年10月22日（木）／15:00／18℃\n';
const unnamed={saveId:'run_shared_unnamed',protagonistInput:'「お話ししたいです。」',protagonistProfile:{},records:[]};
const vanished=header+'女君は存在を保てず霧散しました。\n男性は大喜びでした。';
assert.equal(engine.validateContinuity(unnamed,vanished,reviewed(engine,unnamed,vanished)).mechanicalOk,false,
  'a nameless protagonist cannot disappear merely because no character-specific rule names her');

const registry=[...read('simulation/js/simulation_characters.js').matchAll(/"simulation_character_(\d{3})\.js"/g)].map(match=>'char_'+match[1]);
function installUI(scope){
  for(const file of ['simulation/js/simulation_save.js','simulation-lite/core.js'])
    new Function('window','globalThis','module','require',read(file))(scope,scope,undefined,undefined);
  new Function('window','document',read('simulation/js/simulation_handoff.js'))(scope,{addEventListener(){}});
}
function check(scope,args,packet,save,character){
  const e=scope.RenaiGameTurnEngine,p=scope.RenaiGamePolicy,before=JSON.stringify({args,packet,save});
  const sceneHeader=header.replace('Chapter 1','Chapter '+(args.records.length+1));
  assert.ok(p.storyDirection.instruction.includes('全攻略対象・全主人公'));
  const normal=scope.RenaiGameHandoff.buildPrompt({character,profile:save.state.profile,saveId:save.saveId,protagonistInput:args.protagonistInput});
  const lite=scope.RenaiGameLite.buildPrompt(save,args.protagonistInput,scope.RenaiGameSave);
  for(const prompt of [normal,lite])assert.ok(prompt.includes(p.storyDirection.instruction),'both handoffs use the same shared instruction');
  for(const prompt of [normal,lite])assert.ok(prompt.includes(p.storyDirection.beforeDraft),'both handoffs require original records and actual execution before drafting');
  for(const prompt of [normal,lite]){
    assert.ok(prompt.includes(p.storyDirection.protagonistCare),'both handoffs carry the shared user-as-protagonist protection before the chapter input');
    assert.ok(prompt.includes(p.storyDirection.turnInstruction),'ordinary chapters receive the romance objective');
    assert.ok(prompt.includes(p.storyDirection.expressionRule),'restraint controls expression, not whether romance is allowed');
    assert.ok(prompt.includes(p.storyDirection.sourcePriority),'character-specific vetoes cannot reverse the shared romance direction');
  }
  const requestScope=p.storyDirection.requestScope;
  assert.equal(typeof requestScope,'string','the shared contract must distinguish a chapter request from rules, complaints and diagnostics');
  const ruleOnly='Chapter 2\n規則を確認してください。物語は書かないでください。';
  for(const prompt of [
    scope.RenaiGameHandoff.buildPrompt({character,profile:save.state.profile,saveId:save.saveId,protagonistInput:ruleOnly}),
    scope.RenaiGameLite.buildPrompt(save,ruleOnly,scope.RenaiGameSave)
  ]){
    assert.ok(prompt.includes(ruleOnly),'a non-story request remains unchanged');
    assert.ok(prompt.indexOf(requestScope)>=0 && prompt.indexOf(requestScope)<prompt.indexOf(ruleOnly),'request scope precedes the original input in both handoffs');
    assert.ok(!prompt.includes('心理変化・JS実行・検証を行いChapter本文を生成してください。'),'a nonempty field does not unconditionally authorize a chapter');
    assert.ok(!prompt.includes('実際の心理JS実行、推敲、意味確認と本文検証を終えた本文を返してください。'),'lite handoff does not override the request with an unconditional story command');
  }
  const actor=character?.name||'青年',approach=actor+'は、自分から声をかけた。',intent='「あなたと話せるのを楽しみにしていました」';
  const good=sceneHeader+approach+'\n'+intent;
  const declarations=romantic(args,approach,intent,actor);
  if(!character)declarations.romanceProgress.motivation={source:'profile',field:'free',quote:args.protagonistProfile.free};
  const pending=e.prepareStoryReview(args,good);
  for(const [axis,guidance]of Object.entries(p.storyDirection.reviewGuidance)){
    assert.equal(pending.checks[axis].status,'pending');
    assert.equal(pending.checks[axis].guidance,guidance,'review guidance is shared across all protagonists');
  }
  assert.equal(pending.checks.literaryQuality.aspects.concreteProgress.guidance,p.storyDirection.reviewGuidance.romanceMotivation);
  assert.equal(e.releaseStory(args,packet,good,reviewed(e,args,good,declarations)).story,good);
  const name=args.protagonistProfile.name;
  for(const text of [name+'は霧散した。',name+'は誰にも必要とされない存在だった。','女君は霧散しました。']){
    const bad=sceneHeader+text,actions=reviewed(e,args,bad);
    const result=e.validateContinuity(args,bad,actions);
    assert.equal(result.mechanicalOk,false,'a completed test receipt cannot exempt exclusion or disappearance');
    assert.throws(()=>e.releaseStory(args,packet,bad,actions),/死亡|消滅|存在否定|見捨て|不要/);
  }
  for(const text of ['庭の霧が霧散しました。',name+'の前で庭の霧が霧散しました。','女君の前で庭の霧が霧散しました。','もし'+name+'が霧散したら、と男性はその仮定を打ち消した。']){
    const allowed=sceneHeader+text+'\n'+approach+'\n'+intent;
    assert.equal(e.releaseStory(args,packet,allowed,reviewed(e,args,allowed,declarations)).story,allowed,'ordinary fog and hypothetical events remain distinct');
  }
  assert.equal(JSON.stringify({args,packet,save}),before,'shared rules do not rewrite scores, protagonists, stories or saves');
}
for(const characterId of registry){
  const saveId='run_shared_'+characterId,profile={name:'検査役'+characterId,age:'30',free:'テスト用の主人公'};
  const initial=JSON.parse(read('simulation/state/templates/'+characterId+'_initial_state.json'));
  const save={version:2,game:'simulation',saveId,state:{profile,selectedCharacterId:characterId,session:{id:saveId,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:{currentState:initial,stateHistory:[]}}}}};
  const sources=Object.fromEntries(runtime.sourcePaths(characterId).map(file=>[file,read(file)]));
  const runner=runtime.createRuntime({sources,save,saveId,characterId});installUI(runner.scope);
  const input={protagonistInput:unnamed.protagonistInput,changes:{},evidence:{}};
  const run=runner.runTurn(input),args=runner.buildArgs(input);
  assert.equal(run.generationDirection.protagonistCare,runner.scope.RenaiGamePolicy.storyDirection.protagonistCare,'every selected partner receives the same protection before drafting');
  assert.equal(run.generationDirection.requestScope,runner.scope.RenaiGamePolicy.storyDirection.requestScope,'a calculated packet is not independent authorization to write a chapter');
  check(runner.scope,args,run.packet,save,args.character);
  const continued=copy(save);
  continued.state.session.recordsByCharacter[characterId]=[{scene:'Chapter 1',date:'2026年10月22日（木）',protagonist:input.protagonistInput,partner:header+args.character.name+'は話を聞きたいと伝えた。'}];
  continued.state.session.statesByCharacter[characterId]={currentState:copy(run.packet.after),stateHistory:[{turn:1,scene:'Chapter 1',fingerprint:run.packet.fingerprint}]};
  const next=runtime.createRuntime({sources,save:continued,saveId,characterId});installUI(next.scope);
  check(next.scope,next.buildArgs(input),next.runTurn(input).packet,continued,args.character);
}
const scope={};
for(const file of ['js/renaigame_policy.js','simulation/js/ai_turn_engine.js'])
  new Function('window','globalThis','module','require',read(file))(scope,scope,undefined,undefined);
installUI(scope);
const args={...unnamed,protagonistProfile:{name:'新しい主人公',free:'隣家の青年は、主人公に会って話をしたいと願っている。'},characterId:null};
const save={version:2,game:'simulation',saveId:args.saveId,state:{profile:copy(args.protagonistProfile),selectedCharacterId:null,session:{id:args.saveId,recordsByCharacter:{__unassigned__:[]},statesByCharacter:{}}}};
check(scope,args,null,save,null);
const continuingSave=copy(save),past={scene:'Chapter 1',protagonist:args.protagonistInput,partner:header+'青年は話を聞きたいと伝えた。'};
continuingSave.state.session.recordsByCharacter.__unassigned__=[past];
check(scope,{...args,records:[copy(past)]},null,continuingSave,null);
console.log('PASS: shared romance direction, pending review and protagonist continuity for all '+registry.length+' partners plus unassigned chapters, fresh and continuing; no score/save rewrite');
