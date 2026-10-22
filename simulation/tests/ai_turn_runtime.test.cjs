'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const runtime = require('../js/ai_turn_runtime.js');
const reviewedActions = require('./helpers/review_fixture.cjs');
const romantic=require('./helpers/romance_declaration.cjs');
const root = path.resolve(__dirname,'../..');
const read = file=>fs.readFileSync(path.join(root,file),'utf8');
const copy = value=>JSON.parse(JSON.stringify(value));
const characterId='char_016',saveId='run_runtime_test';
const sources = Object.fromEntries(runtime.sourcePaths(characterId).map(file=>[file,read(file)]));
const initial=JSON.parse(read('simulation/state/templates/char_016_initial_state.json'));
const save={saveId,state:{profile:{name:'実行検査',age:'22',free:''},selectedCharacterId:characterId,session:{id:saveId,recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:initial}}}};
const input={saveId,characterId,protagonistInput:'Chapter1\n「ありがとう。」',changes:{gratitude:2},evidence:{gratitude:'ありがとう。'},recordIndices:[],storyActions:{}};
const approach='アーサーは書物を閉じ、自分から声をかけた。',intent='「あなたと話せるのを楽しみにしていました」';
const story='Chapter 1\n英国・大学／2026年10月17日（土）／15:20／13℃\n\n'+approach+'\n'+intent;
const setup = overrides=>runtime.createRuntime({sources,save,saveId,characterId,...overrides});

// Regression: the former documented loader omits the settings validator.
const oldScope={};
for(const file of ['js/renaigame_policy.js','js/renaigame_psychology_parameters.js','simulation/js/ai_turn_engine.js','simulation/js/simulation_character_016.js','simulation/js/simulation_character_016_behavior.js']) new Function('window','module','require',sources[file])(oldScope,undefined,undefined);
assert.throws(()=>oldScope.RenaiGameTurnEngine.runTurn({...input,character:oldScope.SimulationCharacters[characterId],behavior:oldScope.SimulationCharacter016Behavior,psychology:oldScope.RenaiGamePsychologyParameters,stateEntry:initial,records:[]}),/character_settings_validator.js/);

const original=JSON.stringify({save,input});
const runner=setup(),turn=runner.runTurn(input);
const actions=reviewedActions(runner.scope.RenaiGameTurnEngine,runner.buildArgs(input),story,romantic(runner.buildArgs(input),approach,intent));
assert.equal(turn.generationDirection.objective,runner.scope.RenaiGamePolicy.storyDirection.turnInstruction);
assert.equal(turn.generationDirection.psychologyUse,runner.scope.RenaiGamePolicy.storyDirection.expressionRule);
assert.equal(turn.generationDirection.stage.id,turn.packet.after.stage);
assert.equal(turn.packet.generationDirection,undefined,'generation guidance is not part of persisted psychology');
assert.equal(turn.verification.ok,true);
assert.equal(turn.packet.execution.invoked.length,7);
assert.equal(runner.validateStory(input,turn.packet,story,actions).validation.ok,true);
assert.throws(()=>runner.releaseStory(input,null,story,actions),/心理計算パケット/,
  'a selected route cannot use the unassigned release path to skip psychology');
const fiveAxis=copy(actions);delete fiveAxis.semanticReview.checks.literaryQuality;
assert.throws(()=>runner.validateStory(input,turn.packet,story,fiveAxis),/literaryQuality/,'selected-character turns also require the finishing review');
assert.equal(turn.packet.sources.protagonistProfile,runner.scope.RenaiGameTurnEngine.fingerprint(save.state.profile));
assert.equal(JSON.stringify({save,input}),original,'loading, running and validation do not mutate the save or input');

// Identical source strings also work without require, module, process, DOM or filesystem.
const isolated={window:{}};
vm.runInNewContext(read('simulation/js/ai_turn_runtime.js'),isolated);
const fetched=Object.fromEntries(Object.entries(sources).map(([file,source])=>[file,{content:[{type:'text',text:'Action completed.'}],structuredContent:{content:source,encoding:'utf-8'}}]));
const codeMode=isolated.window.RenaiGameTurnRuntime.createRuntime({sources:fetched,save,saveId,characterId});
const codeTurn=codeMode.runTurn(input);
assert.equal(codeTurn.packet.fingerprint,turn.packet.fingerprint,'code mode and Node use the same packet');
assert.equal(codeMode.validateStory(input,codeTurn.packet,story,actions).validation.ok,true);
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

// One validation request must replay psychology once, while still rejecting
// changed packets. The old wrapper replayed before calling a second verifier.
const countedSources={...sources};
countedSources['js/renaigame_psychology_parameters.js'] += `
const originalPsychology=window.RenaiGamePsychologyParameters;
window.replayCalls=0;
window.RenaiGamePsychologyParameters={...originalPsychology,
  evaluateConflict(...args){window.replayCalls++;return originalPsychology.evaluateConflict(...args);}
};`;
const counted=setup({sources:countedSources});
counted.validateStory(input,turn.packet,story,actions);
assert.equal(counted.scope.replayCalls,1,'one validation must not replay the same packet twice');
counted.scope.replayCalls=0;
const released=counted.releaseStory(input,turn.packet,story,actions);
assert.equal(counted.scope.replayCalls,1);
assert.deepEqual(released.verification,turn.verification,'release returns the measured verification for saving');
assert.deepEqual(released.context,turn.context);
assert.equal(counted.settings.complete,true,'reuse the settings inspection already performed by the loader');

const withLogs=copy(save);
withLogs.state.session.recordsByCharacter[characterId]=[{scene:'Chapter 1',protagonist:'原文1',partner:'本文1'},{scene:'Chapter 2',protagonist:'原文2',partner:'本文2'}];
withLogs.state.session.statesByCharacter[characterId]={currentState:initial,stateHistory:[{turn:1},{turn:2}]};
const selection=setup({save:withLogs,recordIndices:[1,0]});
const selected=selection.runTurn(input);
assert.deepEqual(selected.context.recordIndices,[1,0]);
assert.equal(selected.packet.sources.records,selection.scope.RenaiGameTurnEngine.fingerprint(withLogs.state.session.recordsByCharacter[characterId].slice().reverse()));
const missingLogs=copy(withLogs);delete missingLogs.state.session.recordsByCharacter[characterId];
assert.throws(()=>setup({save:missingLogs}),/正本の実ログがありません/);
const emptyLogs=copy(withLogs);emptyLogs.state.session.recordsByCharacter[characterId]=[];
assert.throws(()=>setup({save:emptyLogs}),/実ログ.*不足/,'persisted psychology cannot continue from a fabricated empty history');
const truncatedLogs=copy(withLogs);truncatedLogs.state.session.recordsByCharacter[characterId].pop();
assert.throws(()=>setup({save:truncatedLogs}),/実ログ.*不足/,'a dropped chapter cannot be treated as complete canon');
for(const field of ['protagonist','partner']){
  const metadataOnly=copy(withLogs);delete metadataOnly.state.session.recordsByCharacter[characterId][0][field];
  assert.throws(()=>setup({save:metadataOnly}),/実ログ.*本文/,'chapter metadata is not the original text: '+field);
}
const malformedHistory=copy(withLogs);malformedHistory.state.session.statesByCharacter[characterId].stateHistory={};
assert.throws(()=>setup({save:malformedHistory}),/心理履歴が不正/);
delete withLogs.state.session.statesByCharacter[characterId];
assert.throws(()=>setup({save:withLogs,initialState:initial}),/初期値で代用/);
const newSlot=copy(save);delete newSlot.state.session.statesByCharacter[characterId];
assert.equal(setup({save:newSlot,initialState:initial}).runTurn(input).verification.ok,true,'explicit initial state is allowed only for an empty slot');

// A continuing eighth turn uses all seven original chapters and the actual
// preceding calculation, rather than another initial state or a summary.
const sevenChapters=copy(save);
for(let chapter=1;chapter<=7;chapter++){
  const current=setup({save:sevenChapters}),raw={...input,protagonistInput:'Chapter'+chapter+'\n「ありがとう。」'};
  const measured=current.runTurn(raw);
  sevenChapters.state.session.recordsByCharacter[characterId].push({scene:'Chapter '+chapter,protagonist:raw.protagonistInput,partner:story.replace('Chapter 1','Chapter '+chapter)});
  const old=sevenChapters.state.session.statesByCharacter[characterId];
  sevenChapters.state.session.statesByCharacter[characterId]={currentState:copy(measured.packet.after),stateHistory:[...(old.stateHistory||[]),{turn:chapter,fingerprint:measured.packet.fingerprint}]};
}
const next=setup({save:sevenChapters}),eighthInput={...input,protagonistInput:'Chapter8\n「ありがとう。」'};
const canonBefore=JSON.stringify(sevenChapters),eighth=next.runTurn(eighthInput);
assert.deepEqual(next.buildArgs(eighthInput).records,sevenChapters.state.session.recordsByCharacter[characterId]);
assert.deepEqual(eighth.packet.before,sevenChapters.state.session.statesByCharacter[characterId].currentState);
assert.equal(eighth.context.recordCount,7);assert.equal(eighth.context.stateHistoryCount,7);
assert.equal(eighth.packet.sources.records,next.scope.RenaiGameTurnEngine.fingerprint(next.buildArgs(eighthInput).records));
assert.equal(JSON.stringify(sevenChapters),canonBefore,'preparing the continuation never rewrites saved canon');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-turn-runtime-'));
try{
  const saveFile=path.join(dir,'save.json'),inputFile=path.join(dir,'input.json'),packetFile=path.join(dir,'packet.json'),storyFile=path.join(dir,'story.txt');
  fs.writeFileSync(saveFile,JSON.stringify(save));fs.writeFileSync(inputFile,JSON.stringify({...input,storyActions:actions}));fs.writeFileSync(storyFile,story);
  const before=fs.readFileSync(saveFile,'utf8');
  const command=path.join(root,'simulation/scripts/run_ai_turn.cjs');
  const run=(...args)=>spawnSync(process.execPath,[command,...args],{cwd:dir,encoding:'utf8'});
  const result=run('run',saveFile,inputFile);assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).packet.fingerprint,turn.packet.fingerprint);
  fs.writeFileSync(packetFile,result.stdout);
  const release=run('release',saveFile,inputFile,packetFile,storyFile);assert.equal(release.status,0,release.stderr);assert.equal(release.stdout.trim(),story);
  const receipt=run('release-result',saveFile,inputFile,packetFile,storyFile);
  assert.equal(receipt.status,0,receipt.stderr);
  const measured=JSON.parse(receipt.stdout);
  assert.equal(measured.story,story);assert.deepEqual(measured.verification,turn.verification);
  assert.equal(measured.validation.readyForOutput,true);
  const unreviewed=path.join(dir,'unreviewed.json');fs.writeFileSync(unreviewed,JSON.stringify(input));
  const blocked=run('release',saveFile,unreviewed,packetFile,storyFile);assert.equal(blocked.status,1);assert.equal(blocked.stdout,'','unreviewed prose is never printed by the release command');
  const blockedReceipt=run('release-result',saveFile,unreviewed,packetFile,storyFile);
  assert.equal(blockedReceipt.status,1);assert.equal(blockedReceipt.stdout,'');
  const oldReceiptFile=path.join(dir,'five-axis.json');fs.writeFileSync(oldReceiptFile,JSON.stringify({...input,storyActions:fiveAxis}));
  const unfinished=run('release',saveFile,oldReceiptFile,packetFile,storyFile);
  assert.equal(unfinished.status,1);assert.equal(unfinished.stdout,'','a five-axis-only receipt never leaks the unrevised story');
  const validation=run('validate',saveFile,inputFile,packetFile,storyFile);assert.equal(validation.status,0,validation.stderr);
  assert.equal(JSON.parse(validation.stdout).validation.ok,true);
  fs.writeFileSync(packetFile,JSON.stringify(corrupt));
  const invalid=run('validate',saveFile,inputFile,packetFile,storyFile);assert.equal(invalid.status,1);assert.match(invalid.stderr,/元の心理パケット/);
  assert.equal(fs.readFileSync(saveFile,'utf8'),before,'CLI never rewrites its source save');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

const promptScope={window:{},document:{addEventListener(){}}};
vm.runInNewContext(read('js/renaigame_policy.js'),promptScope);
vm.runInNewContext(read('simulation/js/simulation_handoff.js'),promptScope);
const prompt=promptScope.window.RenaiGameHandoff.buildPrompt({character:runner.scope.SimulationCharacters[characterId],profile:save.state.profile,saveId,session:save.state.session});
assert.match(prompt,/ai_turn_runtime.js/);assert.match(prompt,/元のエラー全文/);
console.log('PASS: former loader failure reproduced; Node and code-mode execution, source extraction, original packet validation, save isolation and CLI');
