'use strict';
// Synthetic regression scenes only, not a claim about model-generated chapters.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engine=require('../js/ai_turn_engine.js');
const runtime=require('../js/ai_turn_runtime.js');
const reviewed=require('./helpers/review_fixture.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const header='Chapter 1\n庭／2026年10月22日（木）／15:00／18℃\n';
const input='あなたが嫌い。どうせ私より別の女が一番なのでしょう。';
const args={saveId:'run_priority',characterId:'char_007',protagonistInput:input,protagonistProfile:{name:'検査役'},records:[]};
const care=header+'男性は湯を用意した。';
assert.equal(engine.validateRomanceProgress(args,care).required,true,
  'anger and distrust require the man to answer; they are not permission to omit romance');
assert.equal(engine.validateContinuity(args,care,reviewed(engine,args,care)).readyForOutput,false,
  'a current review may not classify romantic distrust as not applicable');
assert.equal(engine.continuityInput('私はあなたが大嫌いだった。').ok,true,
  'the protagonist disliking the man is not the man disliking the protagonist');
for(const text of [
  input,'どうせ愛されない。','彼のことが嫌い。','どうせこうだろう。','大嫌い💢','「嫌い」',
  'どうせ「もう来ないで」って言うのでしょう。恋愛を進めてください。',
  '「もう来ないで」とは言っていない。どうせ私なんか二番なのでしょう。'
]) assert.equal(engine.validateRomanceProgress({...args,protagonistInput:text},care).required,true,text);
for(const text of ['今は一人にして。どうせ愛されない。','もう来ないで。','恋愛を休みたい。'])
  assert.equal(engine.validateRomanceProgress({...args,protagonistInput:text},care).required,false,'actual boundaries remain respected: '+text);
for(const text of ['私はあなたが大嫌いだった。','最初からあなたが嫌いだった。'])
  assert.equal(engine.continuityInput(text).ok,true,'her own hostility remains playable: '+text);
assert.equal(engine.continuityInput('私はあなたが大嫌いだった。主人公を殺して。').ok,false,
  'recognizing her hostility cannot exempt a separate harmful directive');

// The original binding was measured with the preceding version 1 sources.
// Do not relabel an old receipt to approve a newly generated chapter.
const legacy=reviewed(engine,args,care);
legacy.semanticReview.version=1;legacy.semanticReview.binding='4d2f90af';
assert.equal(engine.validateContinuity(args,care,legacy).ok,true,'unchanged legacy chapters remain importable');
assert.throws(()=>engine.releaseStory(args,null,care,legacy),/現行のprepareStoryReview/);
const relabeled=JSON.parse(JSON.stringify(legacy));relabeled.semanticReview.version=engine.policy.storyDirection.reviewVersion;
assert.equal(engine.validateContinuity(args,care,relabeled).ok,false,'changing a version number cannot update a historical review');

// Ordinary dialogue must not need an extra "advance romance" command.
const ordinary={saveId:'run_ordinary',characterId:'char_007',protagonistInput:'「お話を聞かせてください。」',protagonistProfile:{name:'検査役'},records:[]};
assert.equal(engine.validateRomanceProgress(ordinary,care).required,true,
  'romance is the default focus of a selected route, including its first chapter');
assert.equal(engine.validateContinuity(ordinary,care,reviewed(engine,ordinary,care)).readyForOutput,false,
  'a completed form cannot turn care-only prose into the main romance plot');
const oldOrdinary=reviewed(engine,ordinary,care);
oldOrdinary.semanticReview.version=2;oldOrdinary.semanticReview.binding='e7c0a29b';
assert.equal(engine.validateContinuity(ordinary,care,oldOrdinary).ok,true,'original version 2 chapters retain their original applicability and binding');
assert.throws(()=>engine.releaseStory(ordinary,null,care,oldOrdinary),/現行のprepareStoryReview/);

const registry=[...read('simulation/js/simulation_characters.js').matchAll(/"simulation_character_(\d{3})\.js"/g)].map(match=>'char_'+match[1]);
for(const characterId of registry){
  const saveId='run_priority_'+characterId,initial=JSON.parse(read('simulation/state/templates/'+characterId+'_initial_state.json'));
  const save={version:2,game:'simulation',saveId,state:{profile:{name:'検査役'+characterId,age:'30'},selectedCharacterId:characterId,
    session:{id:saveId,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:{currentState:initial,stateHistory:[]}}}}};
  const sources=Object.fromEntries(runtime.sourcePaths(characterId).map(file=>[file,read(file)]));
  const runner=runtime.createRuntime({sources,save,saveId,characterId}),e=runner.scope.RenaiGameTurnEngine;
  const turn={protagonistInput:input,changes:{},evidence:{}},turnArgs=runner.buildArgs(turn),packet=runner.runTurn(turn).packet;
  for(const protagonistInput of ['「こんにちは。」','「お話を聞かせてください。」','今日は寒い。']){
    const normalArgs=runner.buildArgs({...turn,protagonistInput});
    assert.equal(e.validateRomanceProgress(normalArgs,care).required,true,characterId+' must not wait for a romance keyword or exempt a care scene');
    assert.equal(e.validateContinuity(normalArgs,care,reviewed(e,normalArgs,care)).readyForOutput,false);
  }
  const normalTurn={protagonistInput:ordinary.protagonistInput,changes:{},evidence:{}},normalArgs=runner.buildArgs(normalTurn),normalRun=runner.runTurn(normalTurn);
  assert.equal(normalRun.generationDirection.stage.id,normalRun.packet.after.stage);
  assert.equal(normalRun.generationDirection.objective,e.policy.storyDirection.turnInstruction);
  const normalApproach=normalArgs.character.name+'は、主人公との会話を続けるために自分から声をかけた。';
  const normalIntent='「もっとあなたのことを知りたい。次に会える時も、私からお声をかけたいのです」';
  const normalStory=header+normalApproach+'\n'+normalIntent;
  const normalProgress=require('./helpers/romance_declaration.cjs')(normalArgs,normalApproach,normalIntent);
  assert.equal(runner.releaseStory(normalTurn,normalRun.packet,normalStory,reviewed(e,normalArgs,normalStory,normalProgress)).story,normalStory,
    characterId+' can initiate a normal chapter without changing its psychology values');
  const before=JSON.stringify({save,turnArgs,packet});
  const actor=turnArgs.character.name;
  const action=actor+'は、二人で過ごすために取っていた時間を人任せにせず、自分の言葉で伝えた。';
  const intent='「あなたに嫌われていても、私が一番に選ぶのはあなただけです。他の誰かの代わりではありません」';
  const story=header+action+'\n'+intent;
  const progress={kind:'affection',actor,actorGender:'male',bloodRelatedToProtagonist:false,relationshipToProtagonist:'unrelated',
    characterId,actionQuote:action,romanticIntentQuote:intent,origin:'canon',motivation:{source:'input',quote:input}};
  const pending=e.prepareStoryReview(turnArgs,story,{romanceProgress:progress});
  assert.equal(pending.version,e.policy.storyDirection.reviewVersion);
  assert.equal(pending.checks.romanceMotivation.status,'pending','guidance does not approve its own prose');
  assert.match(pending.checks.romanceMotivation.guidance,/主人公だけを一番/);
  assert.equal(e.validateStory(turnArgs,packet,care,reviewed(e,turnArgs,care)).readyForOutput,false,characterId+' cannot omit the reply');
  const actions=reviewed(e,turnArgs,story,{romanceProgress:progress});
  assert.equal(runner.releaseStory(turn,packet,story,actions).story,story,characterId+' uses the common path');
  const unsupported=JSON.parse(JSON.stringify(actions));unsupported.romanceProgress.actionQuote='本文にない選択';
  assert.equal(e.validateStory(turnArgs,packet,story,unsupported).readyForOutput,false);
  assert.equal(JSON.stringify({save,turnArgs,packet}),before,'priority does not grant consent, alter scores or rewrite saves');
}
assert.match(engine.policy.storyDirection.instruction,/男性の恋愛相手は主人公だけを一番/);
assert.match(engine.policy.storyDirection.instruction,/傷つき・悲しみ・怒り・反論/);
assert.doesNotMatch(read('js/renaigame_romance_rules.js'),/恋愛感情なし。ほぼ他人|主人公が拒絶していない限り|最低1つ検討する/,
  'the executable common rules must not reintroduce the old non-romance defaults');
console.log('PASS: anger/distrust response for all '+registry.length+' partners, actual boundaries, legacy review replay and no score/save mutation; synthetic scenes only');
