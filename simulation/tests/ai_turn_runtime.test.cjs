'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const runtime = require('../js/ai_turn_runtime.js');
const root = path.resolve(__dirname,'../..');
const read = file=>fs.readFileSync(path.join(root,file),'utf8');
const copy = value=>JSON.parse(JSON.stringify(value));
const characterId='char_016',saveId='run_runtime_test';
const sources = Object.fromEntries(runtime.sourcePaths(characterId).map(file=>[file,read(file)]));
const initial=JSON.parse(read('simulation/state/templates/char_016_initial_state.json'));
const save={saveId,state:{profile:{name:'実行検査',age:'22',free:''},selectedCharacterId:characterId,session:{id:saveId,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:initial}}}};
const input={saveId,characterId,protagonistInput:'Chapter1\n「ありがとう。」',changes:{gratitude:2},evidence:{gratitude:'ありがとう。'},recordIndices:[],storyActions:{}};
const story='Chapter 1\n英国・大学／2026年10月17日（土）／15:20／13℃\n\nアーサーは頷いた。';
const setup = overrides=>runtime.createRuntime({sources,save,saveId,characterId,...overrides});

// Regression: the former documented loader omits the settings validator.
const oldScope={};
for(const file of ['js/renaigame_psychology_parameters.js','simulation/js/ai_turn_engine.js','simulation/js/simulation_character_016.js','simulation/js/simulation_character_016_behavior.js']) new Function('window','module','require',sources[file])(oldScope,undefined,undefined);
assert.throws(()=>oldScope.RenaiGameTurnEngine.runTurn({...input,character:oldScope.SimulationCharacters[characterId],behavior:oldScope.SimulationCharacter016Behavior,psychology:oldScope.RenaiGamePsychologyParameters,stateEntry:initial,records:[]}),/character_settings_validator.js/);

const original=JSON.stringify({save,input});
const runner=setup(),turn=runner.runTurn(input);
assert.equal(turn.verification.ok,true);
assert.equal(turn.packet.execution.invoked.length,7);
assert.equal(runner.validateStory(input,turn.packet,story,{}).validation.ok,true);
assert.equal(turn.packet.sources.protagonistProfile,runner.scope.RenaiGameTurnEngine.fingerprint(save.state.profile));
assert.equal(JSON.stringify({save,input}),original,'loading, running and validation do not mutate the save or input');

// Identical source strings also work without require, module, process, DOM or filesystem.
const isolated={window:{}};
vm.runInNewContext(read('simulation/js/ai_turn_runtime.js'),isolated);
const fetched=Object.fromEntries(Object.entries(sources).map(([file,source])=>[file,{content:[{type:'text',text:'Action completed.'}],structuredContent:{content:source,encoding:'utf-8'}}]));
const codeMode=isolated.window.RenaiGameTurnRuntime.createRuntime({sources:fetched,save,saveId,characterId});
const codeTurn=codeMode.runTurn(input);
assert.equal(codeTurn.packet.fingerprint,turn.packet.fingerprint,'code mode and Node use the same packet');
assert.equal(codeMode.validateStory(input,codeTurn.packet,story,{}).validation.ok,true);
assert.equal(globalThis.RenaiGameTurnEngine,undefined,'source evaluation does not pollute the host global');

for(const overrides of [{saveId:'other'},{characterId:'char_015'},{save:{...save,storage:{format:'chapter-files-v1'}}},{recordIndices:[0]}]) assert.throws(()=>setup(overrides));
const missing={...sources};delete missing['simulation/js/character_settings_validator.js'];
assert.throws(()=>setup({sources:missing}),/character_settings_validator.js.*ソース本文/);
assert.throws(()=>setup({sources:{...sources,'simulation/js/ai_turn_engine.js':'const = ;'}}),/ai_turn_engine.jsの読込失敗:.*Unexpected token/);
assert.throws(()=>setup({sources:{...sources,'simulation/js/ai_turn_engine.js':{content:[{text:'Action completed.'}]}}}),/ソース本文/);
assert.throws(()=>runtime.sourceText({encoding:'base64',content:'YQ=='},'test.js'),/デコード/);
assert.throws(()=>runner.runTurn({protagonistInput:input.protagonistInput}),/changes・evidence/);
const corrupt=copy(turn.packet);corrupt.after.gratitude++;
assert.throws(()=>runner.validateStory(input,corrupt,story),/元の心理パケット/);
assert.throws(()=>runner.validateStory(input,turn.packet,'invalid story'),/本文検証失敗/);

const withLogs=copy(save);
withLogs.state.session.recordsByCharacter[characterId]=[{scene:'Chapter 1',protagonist:'原文1',partner:'本文1'},{scene:'Chapter 2',protagonist:'原文2',partner:'本文2'}];
withLogs.state.session.statesByCharacter[characterId]={currentState:initial,stateHistory:[{turn:1},{turn:2}]};
const selection=setup({save:withLogs,recordIndices:[1,0]});
const selected=selection.runTurn(input);
assert.deepEqual(selected.context.recordIndices,[1,0]);
assert.equal(selected.packet.sources.records,selection.scope.RenaiGameTurnEngine.fingerprint(withLogs.state.session.recordsByCharacter[characterId].slice().reverse()));
const missingLogs=copy(withLogs);delete missingLogs.state.session.recordsByCharacter[characterId];
assert.throws(()=>setup({save:missingLogs}),/正本の実ログがありません/);
const malformedHistory=copy(withLogs);malformedHistory.state.session.statesByCharacter[characterId].stateHistory={};
assert.throws(()=>setup({save:malformedHistory}),/心理履歴が不正/);
delete withLogs.state.session.statesByCharacter[characterId];
assert.throws(()=>setup({save:withLogs,initialState:initial}),/初期値で代用/);
const newSlot=copy(save);delete newSlot.state.session.statesByCharacter[characterId];
assert.equal(setup({save:newSlot,initialState:initial}).runTurn(input).verification.ok,true,'explicit initial state is allowed only for an empty slot');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-turn-runtime-'));
try{
  const saveFile=path.join(dir,'save.json'),inputFile=path.join(dir,'input.json'),packetFile=path.join(dir,'packet.json'),storyFile=path.join(dir,'story.txt');
  fs.writeFileSync(saveFile,JSON.stringify(save));fs.writeFileSync(inputFile,JSON.stringify(input));fs.writeFileSync(storyFile,story);
  const before=fs.readFileSync(saveFile,'utf8');
  const command=path.join(root,'simulation/scripts/run_ai_turn.cjs');
  const run=(...args)=>spawnSync(process.execPath,[command,...args],{cwd:dir,encoding:'utf8'});
  const result=run('run',saveFile,inputFile);assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).packet.fingerprint,turn.packet.fingerprint);
  fs.writeFileSync(packetFile,result.stdout);
  const validation=run('validate',saveFile,inputFile,packetFile,storyFile);assert.equal(validation.status,0,validation.stderr);
  assert.equal(JSON.parse(validation.stdout).validation.ok,true);
  fs.writeFileSync(packetFile,JSON.stringify(corrupt));
  const invalid=run('validate',saveFile,inputFile,packetFile,storyFile);assert.equal(invalid.status,1);assert.match(invalid.stderr,/元の心理パケット/);
  assert.equal(fs.readFileSync(saveFile,'utf8'),before,'CLI never rewrites its source save');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

const promptScope={window:{},document:{addEventListener(){}}};
vm.runInNewContext(read('simulation/js/simulation_handoff.js'),promptScope);
const prompt=promptScope.window.RenaiGameHandoff.buildPrompt({character:runner.scope.SimulationCharacters[characterId],profile:save.state.profile,saveId,session:save.state.session});
assert.match(prompt,/ai_turn_runtime.js/);assert.match(prompt,/元のエラー全文/);
console.log('PASS: former loader failure reproduced; Node and code-mode execution, source extraction, original packet validation, save isolation and CLI');
