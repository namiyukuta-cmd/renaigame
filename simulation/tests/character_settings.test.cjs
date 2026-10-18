"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "../..");
const validator = require("../js/character_settings_validator.js");
const engine = require("../js/ai_turn_engine.js");
const window = {};
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const run = p => vm.runInNewContext(read(p),{window},{filename:p});
const clone = x => JSON.parse(JSON.stringify(x));
const registry = read("simulation/js/simulation_characters.js");
const files = [...registry.matchAll(/"simulation_character_(\d{3})\.js"/g)].map(x=>x[0].slice(1,-1));
assert.ok(files.length >= 8);
const authoredFiles=fs.readdirSync(path.join(root,"simulation/js")).filter(name=>/^simulation_character_\d{3}\.js$/.test(name)).sort();
assert.deepEqual([...files].sort(),authoredFiles,"全人物JSを登録一覧と照合する");
for(const name of files){
  const id=name.match(/(\d{3})/)[1];
  assert.ok(fs.existsSync(path.join(root,"simulation/js/simulation_character_"+id+"_behavior.js")),name+": behavior必須");
  assert.ok(fs.existsSync(path.join(root,"simulation/state/templates/char_"+id+"_initial_state.json")),name+": 心理テンプレート必須");
}
for(const name of files) run("simulation/js/"+name);
for(const character of Object.values(window.SimulationCharacters)){
  const result = validator.inspect(character);
  if(validator.requiresCompleteSettings(character)) assert.equal(result.complete,true,character.id+": "+result.errors.join("; "));
  else assert.equal(result.legacy,true);
}
const character = window.SimulationCharacter008;
assert.equal(validator.inspect(character).complete,true);
assert.equal(character.common.protagonist.name,null,"主人公の未指定プロフィールは保持する");
assert.equal(character.assets.default,null,"画像は任意");
function invalid(mutate, pattern){
  const copy=clone(character); mutate(copy);
  const result=validator.inspect(copy);
  assert.equal(result.ok,false);
  assert.match(result.errors.join("; "),pattern);
  return copy;
}
invalid(c=>delete c.settingsVersion,/settingsVersion/);
invalid(c=>delete c.protagonistProtection,/protagonistProtection/);
invalid(c=>c.protagonistProtection.deathRoute=true,/deathRoute/);
invalid(c=>c.common.occupation="主人公は現在の殺害依頼の対象である。",/殺害・排除/);
invalid(c=>c.common.coreConflict="主人公を殺したいと考えている。",/殺害・排除/);
invalid(c=>c.common.storyDirection="主人公を消滅させる物語。",/殺害・排除/);
invalid(c=>c.roleLabel="殺人請負人",/殺害・排除/);
invalid(c=>c.common.coreConflict="主人公を殺す。普段は殺意を持たない。",/殺害・排除/);
for(const id of ["char_009","char_010"]){
  const candidate=clone(character);candidate.id=id;
  assert.equal(validator.inspect(candidate).ok,true);
  candidate.common.occupation="主人公は現在の殺害依頼の対象である。";
  assert.equal(validator.inspect(candidate).ok,false,id+": 保護フラグがあっても殺害設定を拒否する");
}
const protectedNotes=clone(character);
protectedNotes.common.notes.push("主人公を殺す設定は禁止する。");
assert.equal(validator.inspect(protectedNotes).ok,true,"禁止ルールは殺害意図と区別する");
invalid(c=>{c.common.setting.city=null;delete c.common.residence;},/city|residence/);
invalid(c=>c.common.initialScene.time=null,/initialScene.time/);
invalid(c=>c.common.initialScene.date="2026年10月15日（金）",/曜日/);
invalid(c=>c.common.initialScene.temperatureC=null,/temperatureC/);
invalid(c=>c.common.past="詳細未設定",/past/);
invalid(c=>c.common.extraAuthorSetting=null,/extraAuthorSetting/);
invalid(c=>c.common.setting.residence="別の住居",/一致/);
invalid(c=>c.common.baseRomanticInitiative=0,/baseRomanticInitiative/);
const future=clone(character);future.id="char_009";delete future.settingsVersion;
assert.equal(validator.inspect(future).ok,false);
run("js/renaigame_policy.js");
run("js/renaigame_psychology_parameters.js");
run("simulation/js/simulation_character_008_behavior.js");
const initial=JSON.parse(read("simulation/state/templates/char_008_initial_state.json"));
const args={
 saveId:"character-settings-regression",characterId:"char_008",character,
 behavior:window.SimulationCharacter008Behavior,
 psychology:window.RenaiGamePsychologyParameters,
 stateEntry:{currentState:initial,stateHistory:[]},records:[],
 protagonistInput:"「こんにちは」",changes:{},evidence:{}
};
const packet=engine.runTurn(args);
assert.equal(engine.verifyTurn(args,packet).ok,true);
assert.throws(()=>engine.runTurn({...args,character:invalid(c=>c.common.setting.city=null,/city/)}),/人物設定が未完成/);
assert.throws(()=>engine.runTurn({...args,character:invalid(c=>c.common.occupation="主人公は現在の殺害依頼の対象である。",/殺害・排除/)}),/人物設定が未完成/);
const greeting="Chapter 1\nイングランド・ヨーク／2026年10月15日（木）／17:40／12℃\n“Hello.”\n「こんにちは。」";
const reviewActions=require('./helpers/review_fixture.cjs')(engine,args,greeting);
assert.equal(engine.validateStory(args,packet,greeting,reviewActions).ok,true);
console.log("Character settings: all registered sources inspected; incomplete new settings blocked; char_008 runTurn / verifyTurn / validateStory passed.");

async function checkLoader(incomplete){
  const browserWindow={};
  const scripts=new Map();
  const document={
    querySelector(selector){return scripts.get(selector.match(/="([^"]+)"/)[1]) || null;},
    createElement(){
      const listeners={};
      return {dataset:{},addEventListener(event,callback){listeners[event]=callback;},listeners};
    },
    head:{appendChild(script){
      scripts.set(script.dataset.simulationCharacter,script);
      let source=read("simulation/"+script.src.split("?")[0]);
      if(incomplete===true && script.dataset.simulationCharacter==="simulation_character_008.js") source=source.replace('"time": "17:40"','"time": null');
      if(incomplete==="harm" && script.dataset.simulationCharacter==="simulation_character_008.js") source=source.replace('"roleLabel": "イギリスの古書修復職人"','"roleLabel": "殺人請負人"');
      vm.runInNewContext(source,{window:browserWindow});
      script.listeners.load();
    }}
  };
  vm.runInNewContext(registry,{window:browserWindow,document,localStorage:{getItem(){return null;},setItem(){},removeItem(){}}});
  if(incomplete) await assert.rejects(browserWindow.RenaiGameCharacters.loadAll(),/設定が未完成/);
  else assert.equal((await browserWindow.RenaiGameCharacters.loadAll()).length,files.length);
}
(async()=>{
  await checkLoader(false);
  await checkLoader(true);
  await checkLoader("harm");
  console.log("Character loader: validator loads before character sources; incomplete new character rejected.");
})().catch(error=>{console.error(error);process.exitCode=1;});

