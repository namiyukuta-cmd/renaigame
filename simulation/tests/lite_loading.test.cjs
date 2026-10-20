'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=require('../js/ai_turn_runtime.js');
const notes=require('../scripts/generate_lite_ai_notes.cjs');
const benchmark=require('../scripts/benchmark_lite_loading.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
async function main(){
  const source=read('simulation/AI_GENERATION_ENTRY.md'),canonical=notes.sections(source),generated=notes.build();
  for(const [file,text] of Object.entries(generated)){
    assert.equal(read('simulation-lite/character-notes/'+file),text);
    for(const section of canonical[file.slice(0,-3)]||[])assert.ok(source.includes(section),'each extracted section comes from the actual canonical entry');
  }
  const own=read('simulation-lite/character-notes/char_022.md');
  assert.match(own,/35歳、従四位下・左近衛中将/);
  assert.doesNotMatch(own,/char_021|藤原朝澄/);
  assert.match(read('simulation-lite/character-notes/char_018.md'),/綴子11歳、兄帝13歳/,'character-specific protagonist/world facts survive extraction');
  const split=notes.sections('## char_001 A\nfirst\n### sub\ninside\n## common\nshared\n### char_001 extra\nmore\n### char_002 B\nother\n');
  assert.equal(split.char_001.length,2);
  assert.ok(split.char_001[0].includes('inside'));
  assert.ok(!split.char_001.join('').includes('shared'));
  assert.ok(!split.char_001.join('').includes('other'));
  for(const id of ['char_001','char_013','char_018','char_022',null]){
    const paths=runtime.liteRulePaths(id);
    const plan=runtime.sourceRequestPlan({characterId:id,revision:'a'.repeat(40),paths});
    for(const file of plan.fetchPaths)assert.ok(fs.existsSync(path.join(root,file)),file);
    assert.ok(!plan.fetchPaths.includes('simulation/AI_GENERATION_ENTRY.md'));
    assert.ok(!plan.fetchPaths.includes('simulation/AI_SAVE_WORKFLOW.md'));
    for(const required of ['ROMANCE_PREFERENCES.md','PROTAGONIST_CONTINUITY_RULES.md','AI_CONVERSATION_RULES.md','AI_NOVEL_GENERATION_RULES.md','STORY_REVIEW_GATE.md'])assert.ok(plan.fetchPaths.includes('simulation/'+required),required);
    if(id===null)assert.ok(!plan.fetchPaths.some(file=>/simulation_character_|psychology_parameters|character-notes/.test(file)),'unassigned chapters do not load a fabricated partner or psychology');
    else assert.deepEqual(plan.fetchPaths.filter(file=>/simulation_character_\d{3}/.test(file)).sort(),runtime.sourcePaths(id).filter(file=>/simulation_character_\d{3}/.test(file)).sort());
    const world=plan.fetchPaths.filter(file=>file.startsWith('simulation/world/'));
    assert.equal(world.length,id==='char_013'?3:0);
  }
  const result=await benchmark.measure();
  assert.equal(result.after.warm.requests,0);
  assert.equal(result.after.warm.bytes,0);
  assert.ok(result.after.cold.bytes<result.before.cold.bytes*.8,'cold loading remains at least 20% smaller than the measured former path');
  assert.equal(read('simulation-lite/LOAD_BENCHMARK.md'),benchmark.render(result),'the published measurement matches the current source bytes');
  assert.ok(read('simulation-lite/AI_ENTRY.md').includes('liteRulePaths(characterId)'),'the actual AI entry uses the measured retrieval plan');
  const loaded=await runtime.loadSources({characterId:null,revision:'a'.repeat(40),paths:runtime.liteRulePaths(null),fetchSource:async file=>read(file)});
  const scope={};
  for(const file of ['js/renaigame_policy.js','simulation/js/ai_turn_engine.js'])new Function('window','globalThis','module','require',loaded.sources[file])(scope,scope,undefined,undefined);
  const args={saveId:'run_unassigned_lite_loading',protagonistProfile:{name:'テスト'},records:[],protagonistInput:'「こんにちは。」'};
  const story='Chapter 1\n英国・店内／2026年10月20日（火）／14:00／15℃\n店員は挨拶を返した。';
  assert.throws(()=>scope.RenaiGameTurnEngine.releaseStory(args,null,story,{}),/意味確認/,'cached source retrieval never replaces the story review');
  const actions=require('./helpers/review_fixture.cjs')(scope.RenaiGameTurnEngine,args,story);
  assert.equal(scope.RenaiGameTurnEngine.releaseStory(args,null,story,actions).story,story,'unassigned real-JS continuity/review works without partner or psychology sources');
  console.log('PASS: exact canonical notes, selected-only dependencies, all shared guards, unassigned/world handling and measured cold/warm loading');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
