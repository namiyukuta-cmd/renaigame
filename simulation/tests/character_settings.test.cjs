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
// The newly selected lightweight partner uses his own complete sources and
// fresh state, rather than another Heian character's existing romance/history.
const asazumi=window.SimulationCharacter021;
assert.ok(asazumi,'藤原朝澄を人物一覧へ登録する');
assert.equal(asazumi.name,'藤原朝澄');
assert.equal(asazumi.nameKana,'ふじわらのあさずみ');
assert.equal(asazumi.common.age,29);
assert.equal(asazumi.common.gender,'male');
assert.match(asazumi.common.occupation,/正五位下・右近衛少将/);
assert.match(asazumi.common.residence,/左京二条、東洞院の邸/);
assert.equal(asazumi.common.signatureLine,'歌は人を欺けても、恋する心までは欺けませぬ。');
assert.match(asazumi.common.personality,/本気の恋.*余裕を失う/);
assert.match(asazumi.common.changesAfterDating,/甘え/);
assert.equal(asazumi.common.protagonist.name,null);
assert.equal(asazumi.common.protagonist.age,null);
run('simulation/js/simulation_character_021_behavior.js');
const asazumiInitial=JSON.parse(read('simulation/state/templates/char_021_initial_state.json'));
assert.equal(asazumiInitial.characterId,'char_021');
assert.equal(asazumiInitial.romanceScore,0);
assert.equal(asazumiInitial.seekHeroine,0);
assert.equal(asazumiInitial.romanceOnsetEstablished,false);
assert.deepEqual(asazumiInitial.history,[]);
const asazumiSnapshot=JSON.stringify({asazumi,asazumiInitial});
const asazumiArgs={...args,saveId:'asazumi-settings-regression',characterId:'char_021',character:asazumi,
 behavior:window.SimulationCharacter021Behavior,stateEntry:{currentState:asazumiInitial,stateHistory:[]},
 protagonistInput:'「あなたは私を待っていて当然でしょう。」',
 changes:{hurt:4,anger:3},evidence:{hurt:'待っていて当然',anger:'待っていて当然'}};
const asazumiTurn=engine.runTurn(asazumiArgs);
assert.equal(engine.verifyTurn(asazumiArgs,asazumiTurn).ok,true);
assert.equal(asazumiTurn.evaluations.evaluateYoinomaInvitation.baseRomanticInitiative,9);
assert.equal(asazumiTurn.after.hurt,asazumiTurn.before.hurt+4);
assert.equal(asazumiTurn.after.anger,asazumiTurn.before.anger+3);
assert.equal(JSON.stringify({asazumi,asazumiInitial}),asazumiSnapshot,'新規相手の実行で固定設定と初期テンプレートを変更しない');
const akimori=window.SimulationCharacter022;
assert.ok(akimori,'源顕守を人物一覧へ登録する');
assert.equal(akimori.name,'源顕守');
assert.equal(akimori.nameKana,'みなもとのあきもり');
assert.equal(akimori.common.age,35);
assert.equal(akimori.common.gender,'male');
assert.match(akimori.common.occupation,/従四位下・左近衛中将/);
assert.equal(akimori.common.signatureLine,'歌にせねば伝わらぬ思ひなど、浅いものと思うておりました。');
assert.match(akimori.common.poetryStyle,/幽玄・余情/);
assert.equal(akimori.common.protagonist.name,null);
assert.equal(akimori.common.protagonist.age,null);
run('simulation/js/simulation_character_022_behavior.js');
const akimoriInitial=JSON.parse(read('simulation/state/templates/char_022_initial_state.json'));
assert.equal(akimoriInitial.characterId,'char_022');
assert.equal(akimoriInitial.romanceScore,0);
assert.equal(akimoriInitial.seekHeroine,0);
assert.equal(akimoriInitial.romanceOnsetEstablished,false);
assert.deepEqual(akimoriInitial.history,[]);
assert.ok(akimoriInitial.psychologyTraits.emotionalExpressiveness<asazumiInitial.psychologyTraits.emotionalExpressiveness);
const akimoriSnapshot=JSON.stringify({akimori,akimoriInitial});
const akimoriArgs={...args,saveId:'akimori-settings-regression',characterId:'char_022',character:akimori,
 behavior:window.SimulationCharacter022Behavior,stateEntry:{currentState:akimoriInitial,stateHistory:[]},
 protagonistInput:'「またお会いして、お話ししたいです。」',
 changes:{trust:2,anticipation:3},evidence:{trust:'またお会いして',anticipation:'お話ししたい'}};
const akimoriTurn=engine.runTurn(akimoriArgs);
assert.equal(engine.verifyTurn(akimoriArgs,akimoriTurn).ok,true);
assert.equal(akimoriTurn.evaluations.evaluateYoinomaInvitation.baseRomanticInitiative,8);
assert.equal(akimoriTurn.after.trust,akimoriTurn.before.trust+2);
assert.equal(akimoriTurn.after.anticipation,akimoriTurn.before.anticipation+3);
assert.equal(JSON.stringify({akimori,akimoriInitial}),akimoriSnapshot,'顕守の実行で固定設定と初期心理を変更しない');
const sadatsugu=window.SimulationCharacter023;
assert.ok(sadatsugu,'藤原定継を人物一覧へ登録する');
assert.equal(sadatsugu.name,'藤原定継');
assert.equal(sadatsugu.nameKana,'ふじわらのさだつぐ');
assert.equal(sadatsugu.common.age,41);
assert.equal(sadatsugu.common.gender,'male');
assert.match(sadatsugu.common.occupation,/正四位下・左中弁/);
assert.equal(sadatsugu.common.signatureLine,'わたくしの歌が気に入らぬ？　それは結構。では、どこが気に入らぬのかお聞かせ願おう。');
assert.equal(sadatsugu.common.poetryStyle.startsWith('理知的、技巧的、挑発的。'),true);
assert.match(sadatsugu.common.personality,/歌壇の嫌われ者/);
assert.match(sadatsugu.common.personality,/つまらぬ歌を褒めることこそ不誠実/);
assert.match(sadatsugu.common.personality,/自分より優れた歌には驚くほど素直に感服/);
assert.match(sadatsugu.common.personality,/一度読んだ歌を何年も覚え/);
assert.match(sadatsugu.common.romance,/相手の言葉を誰より真剣に聞く/);
assert.match(sadatsugu.common.romance,/自分から文を送り/);
assert.match(sadatsugu.common.romance,/返歌を待ちきれずに次の歌を考え/);
assert.equal(sadatsugu.common.protagonist.name,null);
run('simulation/js/simulation_character_023_behavior.js');
const sadatsuguInitial=JSON.parse(read('simulation/state/templates/char_023_initial_state.json'));
assert.equal(sadatsuguInitial.characterId,'char_023');
assert.equal(sadatsuguInitial.romanceScore,0);
assert.equal(sadatsuguInitial.seekHeroine,0);
assert.equal(sadatsuguInitial.romanceOnsetEstablished,false);
assert.deepEqual(sadatsuguInitial.history,[]);
assert.ok(sadatsuguInitial.psychologyTraits.conflictAvoidance<akimoriInitial.psychologyTraits.conflictAvoidance);
assert.ok(sadatsuguInitial.psychologyTraits.prideTendency>akimoriInitial.psychologyTraits.prideTendency);
const sadatsuguSnapshot=JSON.stringify({sadatsugu,sadatsuguInitial});
const sadatsuguArgs={...args,saveId:'sadatsugu-settings-regression',characterId:'char_023',character:sadatsugu,
 behavior:window.SimulationCharacter023Behavior,stateEntry:{currentState:sadatsuguInitial,stateHistory:[]},
 protagonistInput:'「あなたの意見を真剣に聞きたいです。また文をください。」',
 changes:{trust:2,anticipation:3},evidence:{trust:'意見を真剣に聞きたい',anticipation:'また文をください'}};
const sadatsuguTurn=engine.runTurn(sadatsuguArgs);
assert.equal(engine.verifyTurn(sadatsuguArgs,sadatsuguTurn).ok,true);
assert.equal(sadatsuguTurn.evaluations.evaluateYoinomaInvitation.baseRomanticInitiative,8);
assert.equal(sadatsuguTurn.after.trust,sadatsuguTurn.before.trust+2);
assert.equal(sadatsuguTurn.after.anticipation,sadatsuguTurn.before.anticipation+3);
assert.equal(JSON.stringify({sadatsugu,sadatsuguInitial}),sadatsuguSnapshot,'定継の実行で固定設定と初期心理を変更しない');
const higekuro=window.SimulationCharacter024;
assert.ok(higekuro);
assert.equal(higekuro.common.gender,'male');
assert.equal(higekuro.common.baseRomanticInitiative,9);
assert.match(higekuro.common.past,/真木柱/);
assert.match(higekuro.common.romanceHistory,/玉鬘/);
assert.match(higekuro.common.initialRelationship,/元の北の方/);
assert.equal(higekuro.common.protagonist.name,null);
run('simulation/js/simulation_character_024_behavior.js');
assert.match(higekuro.common.initialFeeling,/実ログ0件/,'髭黒の初期感情は新規開始に限定する');
const higekuroRules=window.SimulationCharacter024Behavior.priorityRules.join('\n');
assert.match(higekuro.common.storyDirection,/主人公との恋愛を進める/,'主人公との恋愛の進行を人物編の目的にする');
assert.match(window.SimulationCharacter024Behavior.priorityRules[0],/恋愛を進める.*AIの都合で進展を避けない/,'恋愛進展の意図的な回避を最優先で禁じる');
assert.match(higekuroRules,/currentState/,'継続中は現在心理と実ログを使う');
assert.match(higekuroRules,/玉鬘[^\n]*恋愛進展/,'現在の妻との婚姻を主人公との恋愛禁止へ変換しない');
assert.match(higekuroRules,/死亡願望[^\n]*演技/,'恋愛値や過去の冷遇から加害意図や偽装を創作しない');
const higekuroInitial=JSON.parse(read('simulation/state/templates/char_024_initial_state.json'));
assert.equal(higekuroInitial.characterId,'char_024');
assert.equal(higekuroInitial.stage,4,'新規開始から主人公を恋愛相手として意識する');
assert.equal(higekuroInitial.stageName,engine.policy.stages.find(stage=>stage.id===4).name);
assert.ok(higekuroInitial.romanceScore>0,'恋愛度0の受動的な初期状態を既定にしない');
assert.equal(higekuroInitial.romanceOnsetEstablished,true);
assert.ok(higekuroInitial.romanticAwareness>0);
assert.ok(higekuroInitial.desireForContact>0);
assert.ok(higekuroInitial.seekHeroine>0);
assert.ok(higekuroInitial.pursuitDrive>0);
assert.equal(higekuroInitial.perceivedReciprocity,0,'主人公側の好意は初期値で決めない');
assert.equal(higekuroInitial.certaintyOfHerAffection,0);
assert.ok(higekuroRules.includes('恋愛の対象は主人公一人'),'恋愛相手の現在の恋情を主人公へ向ける');
assert.ok(higekuroRules.includes('二人を同時に愛する'),'他の女性との恋情を並行維持しない指示を保持する');
assert.equal(higekuroInitial.priorFamiliarity,95);
assert.deepEqual(higekuroInitial.history,[]);
const higekuroArgs={...args,saveId:'higekuro-regression',characterId:'char_024',character:higekuro,behavior:window.SimulationCharacter024Behavior,stateEntry:{currentState:higekuroInitial,stateHistory:[]},protagonistInput:'「あなたが私を顧みなかったことを、忘れはしません。」',changes:{hurt:3,guilt:4},evidence:{hurt:'顧みなかった',guilt:'顧みなかった'}};
const higekuroTurn=engine.runTurn(higekuroArgs);
assert.equal(engine.verifyTurn(higekuroArgs,higekuroTurn).ok,true);
assert.equal(higekuroTurn.evaluations.evaluateYoinomaInvitation.baseRomanticInitiative,9);
assert.equal(higekuroTurn.evaluations.evaluateRomanceOnset.onsetType,'reunion_rekindling');
assert.equal(higekuroTurn.evaluations.evaluateRomanceOnset.established,true);
assert.equal(higekuroTurn.evaluations.evaluateApproachAvoidance.mode,'approach','初期心理の実計算でも本人から接近する');
// A continuing state, not the fresh template, supplies this turn's feelings.
// Marriage and duty remain present while grounded attraction can still change.
const continuingHigekuro=clone(higekuroTurn.after),initialHigekuroSnapshot=JSON.stringify(higekuroInitial);
continuingHigekuro.emotionalAttraction=21;continuingHigekuro.romanticSpark=17;
const continuationArgs={...higekuroArgs,stateEntry:{currentState:continuingHigekuro,stateHistory:[{turn:1,scene:'Chapter 1',fingerprint:higekuroTurn.fingerprint}]},
 records:[{scene:'Chapter 1',protagonist:higekuroArgs.protagonistInput,partner:'髭黒は言葉を受け止めた。'}],
 protagonistInput:'「あなたのお考えを、もう少し聞かせてください。」',
 changes:{emotionalAttraction:2,romanticSpark:3},evidence:{emotionalAttraction:'もう少し聞かせてください',romanticSpark:'もう少し聞かせてください'}};
const continuedHigekuro=engine.runTurn(continuationArgs);
assert.equal(engine.verifyTurn(continuationArgs,continuedHigekuro).ok,true);
assert.equal(continuedHigekuro.before.emotionalAttraction,21);
assert.equal(continuedHigekuro.after.emotionalAttraction,23);
assert.equal(continuedHigekuro.after.romanticSpark,20);
assert.equal(continuedHigekuro.after.dutyPressure,continuingHigekuro.dutyPressure,'現妻子への責任は感情の更新と両立する');
assert.equal(JSON.stringify(higekuroInitial),initialHigekuroSnapshot,'新規用の初期値を継続心理で書き換えない');
assert.throws(()=>engine.runTurn({...args,character:invalid(c=>c.common.setting.city=null,/city/)}),/人物設定が未完成/);
assert.throws(()=>engine.runTurn({...args,character:invalid(c=>c.common.occupation="主人公は現在の殺害依頼の対象である。",/殺害・排除/)}),/人物設定が未完成/);
const approach=character.name+'は自分から声をかけた。',intent='「またあなたに会いたいと思っていました」';
const greeting="Chapter 1\nイングランド・ヨーク／2026年10月15日（木）／17:40／12℃\n"+approach+'\n'+intent;
const reviewActions=require('./helpers/review_fixture.cjs')(engine,args,greeting,require('./helpers/romance_declaration.cjs')(args,approach,intent));
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
      const assetVersion=read('simulation/simulation_new.html').match(/simulation_characters\.js\?v=([^"\s]+)/)?.[1];
      assert.ok(assetVersion&&script.src.endsWith('?v='+assetVersion),'the page and every character request use the same current cache revision');
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

