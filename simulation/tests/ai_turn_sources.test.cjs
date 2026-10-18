'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=require('../js/ai_turn_runtime.js');
const root=path.resolve(__dirname,'../..');
const revision='a'.repeat(40),nextRevision='b'.repeat(40),characterId='char_018';
const paths=['simulation/AI_TURN_EXECUTION.md','simulation/AI_NOVEL_GENERATION_RULES.md','simulation/STORY_REVIEW_GATE.md'];
async function main(){
  let calls=[];
  const fetchSource=async(file,ref)=>{
    calls.push([file,ref]);
    return {content:[{type:'text',text:'Action completed.'}],structuredContent:{encoding:'utf-8',content:fs.readFileSync(path.join(root,file),'utf8')}};
  };
  const first=await runtime.loadSources({characterId,revision,paths,fetchSource});
  assert.equal(new Set(calls.map(([file])=>file)).size,calls.length,'each missing path is fetched once');
  assert.ok(calls.every(([,ref])=>ref===revision),'all requests pin the same commit');
  assert.equal(first.reusePaths.length,0);
  const snapshot=JSON.stringify(first.cache);
  calls=[];
  const second=await runtime.loadSources({characterId,revision,paths,fetchSource,cache:first.cache});
  assert.equal(calls.length,4,'unchanged turns fetch only engine, validator and the two per-turn rules');
  for(const file of ['simulation/js/ai_turn_engine.js','simulation/js/character_settings_validator.js','simulation/PROTAGONIST_CONTINUITY_RULES.md','simulation/ROMANCE_PREFERENCES.md']) assert.ok(calls.some(([path])=>path===file));
  assert.equal(second.changedPaths.length,0);
  assert.equal(JSON.stringify(first.cache),snapshot,'loading never mutates the previous cache');
  assert.deepEqual(second.sources,first.sources,'caching preserves the exact repository bytes');
  calls=[];
  const third=await runtime.loadSources({characterId,revision:nextRevision,paths,fetchSource,cache:second.cache});
  assert.equal(third.reusePaths.length,0,'a new commit invalidates all previous source bytes');
  assert.ok(calls.every(([,ref])=>ref===nextRevision));
  assert.throws(()=>runtime.sourceRequestPlan({characterId,revision:'main'}),/commit SHA/);
  assert.throws(()=>runtime.sourceRequestPlan({characterId,revision,paths:['../secret.js']}),/取得パス/);
  const broken={...first.cache,'js/renaigame_policy.js':{revision,source:''}};
  assert.ok(runtime.sourceRequestPlan({characterId,revision,cache:broken}).fetchPaths.includes('js/renaigame_policy.js'));
  await assert.rejects(runtime.loadSources({characterId,revision,cache:first.cache,fetchSource:async(file,ref)=>{
    if(file==='simulation/js/ai_turn_engine.js') throw Error('network failed');
    return fetchSource(file,ref);
  }}),/ai_turn_engine.jsの取得失敗: network failed/,'freshness failures do not silently use old bytes');
  await assert.rejects(runtime.loadSources({characterId,revision,fetchSource:async()=>({structuredContent:{content:'Action completed.'}})}),/ソース本文/);
  assert.equal(JSON.stringify(first.cache),snapshot);
  // Real sources obtained through either path still execute all psychology.
  const initial=JSON.parse(fs.readFileSync(path.join(root,'simulation/state/templates/char_018_initial_state.json'),'utf8'));
  const saveId='run_cached_sources';
  const save={saveId,state:{profile:{name:'綴子',age:'21',free:'内親王\n東宮'},selectedCharacterId:characterId,session:{recordsByCharacter:{[characterId]:[]},statesByCharacter:{[characterId]:initial}}}};
  const input={protagonistInput:'Chapter1\n「和歌を教えてください。」',changes:{intrigue:1},evidence:{intrigue:'和歌を教えてください。'}};
  const run=sources=>runtime.createRuntime({sources,save,saveId,characterId}).runTurn(input);
  const original=run(first.sources),cached=run(second.sources);
  assert.deepEqual(cached,original);
  assert.equal(cached.verification.ok,true);assert.equal(cached.packet.execution.invoked.length,7);
  console.log('PASS: commit-pinned source reuse, mandatory refresh, failed-fetch isolation and identical real-JS results');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
