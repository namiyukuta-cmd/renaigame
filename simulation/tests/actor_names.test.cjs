'use strict';
// Fixed synthetic scenes for identity/replay checks, never real chapter saves.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=require('../js/ai_turn_runtime.js');
const reviewed=require('./helpers/review_fixture.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const id='char_024',saveId='run_actor_names';
const initial=JSON.parse(read('simulation/state/templates/'+id+'_initial_state.json'));
const save={saveId,state:{profile:{name:'検査役',age:'30'},selectedCharacterId:id,
  session:{id:saveId,recordsByCharacter:{[id]:[]},statesByCharacter:{[id]:{currentState:initial,stateHistory:[]}}}}};
const sources=Object.fromEntries(runtime.sourcePaths(id).map(file=>[file,read(file)]));
const runner=runtime.createRuntime({sources,save,saveId,characterId:id}),engine=runner.scope.RenaiGameTurnEngine;
const input={protagonistInput:'「お話を聞かせてください。」',changes:{},evidence:{}};
const args=runner.buildArgs(input),packet=runner.runTurn(input).packet;
const action='髭黒は、自分で文を届けた。',intent='「あなたに会いたくて参りました」';
const story='Chapter 1\n都・門前／2026年10月23日（金）／15:00／18℃\n'+action+'\n'+intent;
const progress={kind:'initiative',actor:'髭黒',actorGender:'male',bloodRelatedToProtagonist:false,
  relationshipToProtagonist:'unrelated',characterId:id,actionQuote:action,romanticIntentQuote:intent,
  origin:'canon',motivation:{source:'input',quote:input.protagonistInput}};
assert.equal(engine.validateRomanceProgress(args,story,{romanceProgress:progress}).ok,true,
  'the narrative name Higekuro denotes the same registered man as Higekuro no Taisho');
for(const actor of ['髭黒大将','髭黒右大将','髭黒の大将','髭黒殿','Higekuro no Taisho']){
  const p={...progress,actor},actions=reviewed(engine,args,story,{romanceProgress:p});
  assert.equal(runner.releaseStory(input,packet,story,actions).story,story,actor+' is the selected man even when the prose says 髭黒');
}
for(const actor of ['玉鬘','式部卿宮','父親','大将','髭','髭黒ではない男']){
  const badStory=story+'\n'+actor+'という呼称も本文にはある。';
  assert.equal(engine.validateRomanceProgress(args,badStory,{romanceProgress:{...progress,actor}}).ok,false,
    'an unrelated person, ambiguous title or substring cannot reuse the selected ID: '+actor);
}
assert.equal(engine.validateRomanceProgress(args,story,{romanceProgress:{...progress,characterId:'char_021'}}).ok,false);
assert.equal(engine.validateRomanceProgress(args,story.replaceAll('髭黒','別の男'),{romanceProgress:{...progress,actor:'髭黒大将'}}).ok,false,
  'a registered alias still needs an actual reference in the current story');
const frozen=JSON.stringify({save,args,packet,story,progress});
const support={continuity:{supportProgress:{kind:'relationship_response',actor:'髭黒大将',
  problem:{source:'input',quote:input.protagonistInput},actionQuote:action,outcomeQuote:intent}}};
assert.equal(engine.validateSupportProgress(args,story,support).ok,true,'support shares the same selected-person name matching');
const combined={...support,romanceProgress:{...progress,actor:'髭黒右大将'}};
assert.equal(runner.releaseStory(input,packet,story,reviewed(engine,args,story,combined)).story,story);
assert.equal(JSON.stringify({save,args,packet,story,progress}),frozen,'name matching preserves the prose, raw input, psychology, receipt inputs and save');

const ids=[...read('simulation/js/simulation_characters.js').matchAll(/"simulation_character_(\d{3})\.js"/g)].map(m=>'char_'+m[1]);
for(const characterId of ids){
  const currentSaveId='run_names_'+characterId,currentInitial=JSON.parse(read('simulation/state/templates/'+characterId+'_initial_state.json'));
  const currentSave={saveId:currentSaveId,state:{profile:{name:'検査役'+characterId,age:'30'},selectedCharacterId:characterId,
    session:{id:currentSaveId,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:{currentState:currentInitial,stateHistory:[]}}}}};
  const currentSources=Object.fromEntries(runtime.sourcePaths(characterId).map(file=>[file,read(file)]));
  const r=runtime.createRuntime({sources:currentSources,save:currentSave,saveId:currentSaveId,characterId}),a=r.buildArgs(input),p=r.runTurn(input).packet,e=r.scope.RenaiGameTurnEngine;
  const c=a.character,short=e.policy.actorAliases[c.id]?.[0]||c.name.split(/[・\s]/)[0].replace(/親王$/,'');
  for(const [narrativeName,actor] of [[short,c.name],[c.name,short],[short,short+'殿'],[short,c.englishName.toLowerCase()]]){
    const q=narrativeName+'は、自分で文を届けた。',s=story.replace(action,q);
    const declared={...progress,actor,characterId,actionQuote:q};
    const before=JSON.stringify({currentSave,a,p,s,declared});
    assert.equal(r.releaseStory(input,p,s,reviewed(e,a,s,{romanceProgress:declared})).story,s,c.id+': '+actor);
    assert.equal(JSON.stringify({currentSave,a,p,s,declared}),before);
    assert.equal(e.verifyTurn(a,p).ok,true,'identity matching does not change the measured psychology packet');
  }
}
console.log('PASS: formal/narrative names for all '+ids.length+' partners, shared romance/support matching, different-person rejection and unchanged text/psychology');
