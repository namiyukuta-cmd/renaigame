'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const policy=require('../../js/renaigame_policy.js');
const runtime=require('../js/ai_turn_runtime.js');
const {render}=require('../scripts/generate_policy_reference.cjs');
const json=value=>JSON.parse(JSON.stringify(value));
const scope={window:{},document:{addEventListener(){}}};
for(const file of runtime.sourcePaths('char_018')) vm.runInNewContext(read(file),scope,{filename:file});
for(const file of ['simulation/js/simulation_save.js','simulation/js/simulation_handoff.js']) vm.runInNewContext(read(file),scope,{filename:file});
const w=scope.window;
function checkConsumers(window){
  const p=window.RenaiGamePolicy,r=window.RenaiGameRomanceRules,psych=window.RenaiGamePsychologyParameters;
  assert.equal(window.RenaiGameTurnEngine.policy,p,'実行器は同じ規則を参照する');
  assert.deepEqual(json(r.stages),json(p.stages.map(({id,name,goal})=>({id,name,goal}))));
  assert.deepEqual(json(r.selfInitiatedRomance.byStage),json(p.stages.map(({id,actions})=>({stage:id,actions}))));
  for(const stage of p.stages) for(const name of [stage.name,...stage.aliases])
    assert.equal(psych.seekHeroineFloorByStageName[name],stage.seekHeroineFloor,name);
}
checkConsumers(w);
// Reproduce the former mismatch without changing repository files.
assert.throws(()=>checkConsumers({...w,RenaiGamePsychologyParameters:{...w.RenaiGamePsychologyParameters,
  seekHeroineFloorByStageName:{...w.RenaiGamePsychologyParameters.seekHeroineFloorByStageName,'興味':10}}}));
assert.throws(()=>checkConsumers({...w,RenaiGameRomanceRules:{...w.RenaiGameRomanceRules,
  stages:[{id:0,name:'他人',goal:'古い定義'}]}}));
assert.ok(Object.isFrozen(policy.stages[0].actions));
assert.throws(()=>{policy.chapter.historyFields.push('packet');},TypeError);
const prompt=w.RenaiGameHandoff.buildPrompt({character:w.SimulationCharacter018,profile:{age:'21'},saveId:'run_policy_test'});
assert.ok(prompt.includes(w.RenaiGamePolicy.chapterInstruction()),'AI案内は手書きした項目一覧を使わない');
assert.ok(prompt.includes('js/renaigame_policy.js'));
assert.equal(read('simulation/AI_POLICY_REFERENCE.md'),render(),'説明は実行規則から生成する');
const changed=json(policy);changed.stages[1].seekHeroineFloor=10;changed.requiredPsychologyFields=policy.requiredPsychologyFields;
assert.notEqual(render(changed),read('simulation/AI_POLICY_REFERENCE.md'),'規則だけ変えて説明を更新し忘れると検出できる');
const formatExample=JSON.parse(read('simulation/CHAPTER_SAVE_FORMAT.md').match(/```json\s*([\s\S]*?)```/)[1]);
assert.deepEqual(Object.keys(formatExample).sort(),[...policy.chapter.rootFields].sort());
assert.deepEqual(Object.keys(formatExample.stateHistory[0].entry).sort(),[...policy.chapter.historyFields].sort(),'文書の例も同じ形式');
for(const name of fs.readdirSync(path.join(root,'simulation/state/templates'))){
  if(!/^char_\d{3}_initial_state\.json$/.test(name)) continue;
  const initial=JSON.parse(read('simulation/state/templates/'+name));
  for(const key of policy.requiredPsychologyFields(w.RenaiGamePsychologyParameters))
    assert.ok(typeof initial[key]==='number'&&Number.isFinite(initial[key]),name+': '+key);
  const stage=policy.stages.find(stage=>stage.id===initial.stage);
  assert.ok(stage&&[stage.name,...stage.aliases].includes(initial.stageName),name+': 段階名と番号');
}
for(const file of ['simulation/simulation_new.html','simulation/simulation.html']){
  const html=read(file),first=html.indexOf('renaigame_policy.js');
  assert.ok(first>=0&&first<html.indexOf('simulation_save.js'),file+': 形式規則を先にロードする');
}
assert.throws(()=>runtime.createRuntime({sources:Object.fromEntries(runtime.sourcePaths('char_018').filter(p=>!p.endsWith('/renaigame_policy.js')).map(p=>[p,read(p)])),
  save:{saveId:'run_policy_test',state:{profile:{},selectedCharacterId:'char_018',session:{recordsByCharacter:{char_018:[]},statesByCharacter:{char_018:JSON.parse(read('simulation/state/templates/char_018_initial_state.json'))}}}},saveId:'run_policy_test',characterId:'char_018'}),/renaigame_policy.js/);
console.log('PASS: shared stages, floors, schemas, templates, browser loading and generated instructions; former rule drift detected');
