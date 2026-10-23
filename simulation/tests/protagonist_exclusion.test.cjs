'use strict';
// Synthetic assertions only. These fixtures are not private chapters or saves.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engine=require('../js/ai_turn_engine.js');
const runtime=require('../js/ai_turn_runtime.js');
const reviewed=require('./helpers/review_fixture.cjs');
const romance=require('./helpers/romance_declaration.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const header='Chapter 1\n都・邸／2026年10月23日（金）／19:00／18℃\n';
const args={saveId:'run_exclusion',protagonistInput:'「お話を聞かせてください。」',protagonistProfile:{name:'検査役'},records:[]};
const prohibited=[
  '主人公は見捨てられていないが、主人公の居場所はない。',
  '主人公には居場所がないが、父は見捨てられていない。',
  '主人公に居場所がないわけではないが、誰も彼女を助けない。',
  '主人公は見捨てられたが、父に居場所がないという事実はない。',
  '主人公がいない方がいいとは言えないが、誰も彼女を必要としない。',
  '主人公は見捨てられたという事実はないが、誰も彼女を助けない。',
  '誰も主人公を助けないが、誰も彼女を助けないという事実はない。'
];
for(const [index,claim] of prohibited.entries()){
  const story=header+claim,actions=reviewed(engine,args,story),before=JSON.stringify({args,story,actions});
  const validation=engine.validateContinuity(args,story,actions);
  assert.equal(validation.mechanicalOk,false,'a denial must not exempt a separate exclusion assertion: '+index);
  assert.equal(validation.readyForOutput,false);
  assert.throws(()=>engine.releaseStory(args,null,story,actions),/見捨て|居場所|不要扱い/,
    'a completed synthetic review cannot override the exclusion check: '+index);
  assert.equal(JSON.stringify({args,story,actions}),before,'checking must preserve input, prose and review');
}
for(const [index,claim] of [
  '主人公は見捨てられていない。',
  '主人公は見捨てられたわけではない。',
  '主人公は見捨てられたという事実はない。',
  '主人公は見捨てられた、という記録はない。',
  '主人公に居場所がないわけではない。',
  '主人公の居場所はないという事実はない。',
  '主人公がいない方がいいとは思っていない。',
  '主人公がいない方が良いとは言えない。',
  '誰も主人公を助けないわけではない。',
  '誰も主人公を必要としないという事実はない。',
  '主人公を見捨てないが、相手は不公平な言葉に傷ついた。',
  '相手は主人公の断った同行をやめ、尋ねられた道順を答えた。'
].entries()){
  const story=header+claim,actions=reviewed(engine,args,story);
  assert.equal(engine.releaseStory(args,null,story,actions).story,story,'a local denial, partner emotion or respected boundary remains valid: '+index);
}

// The shared check must also stop a selected route with a valid psychology
// packet and an otherwise valid romance declaration, for every registered man.
const registry=[...read('simulation/js/simulation_characters.js').matchAll(/"simulation_character_(\d{3})\.js"/g)].map(match=>'char_'+match[1]);
for(const characterId of registry){
  const saveId='run_exclusion_'+characterId,initial=JSON.parse(read('simulation/state/templates/'+characterId+'_initial_state.json'));
  const save={version:2,game:'simulation',saveId,state:{profile:{name:'検査役',age:'30'},selectedCharacterId:characterId,
    session:{id:saveId,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:{currentState:initial,stateHistory:[]}}}}};
  const sources=Object.fromEntries(runtime.sourcePaths(characterId).map(file=>[file,read(file)]));
  const runner=runtime.createRuntime({sources,save,saveId,characterId}),e=runner.scope.RenaiGameTurnEngine;
  const turn={protagonistInput:args.protagonistInput,changes:{},evidence:{}},turnArgs=runner.buildArgs(turn),packet=runner.runTurn(turn).packet;
  const action=turnArgs.character.name+'は、主人公との会話を続けるために自分から声をかけた。';
  const intent='「もっとあなたのことを知りたい。次に会える時も、私からお声をかけたいのです」';
  const valid=header+action+'\n'+intent,progress=romance(turnArgs,action,intent);
  const before=JSON.stringify({save,turn,turnArgs,packet});
  assert.equal(runner.releaseStory(turn,packet,valid,reviewed(e,turnArgs,valid,progress)).story,valid);
  const invalid=valid+'\n'+prohibited[0],actions=reviewed(e,turnArgs,invalid,progress);
  assert.equal(e.validateStory(turnArgs,packet,invalid,actions).mechanicalOk,false,characterId+' cannot bypass protection with a romance declaration');
  assert.throws(()=>runner.releaseStory(turn,packet,invalid,actions),/見捨て|居場所|不要扱い/);
  assert.equal(JSON.stringify({save,turn,turnArgs,packet}),before,'protection must not alter scores, fingerprints, raw input or saves');
}
console.log('PASS: assertion-local exclusion checks, completed-review rejection, valid denials/boundaries/emotion and all '+registry.length+' selected routes; synthetic fixtures only');
