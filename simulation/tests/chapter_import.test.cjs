const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const files = new Map(), local = new Map(), pending = new Map(), commits = new Map();
let head = 'original', sequence = 0, failPublish = false;
const response = (data,status=200) => ({ ok: status < 400, status, json: async()=>data });
const sandbox = { window: {}, TextEncoder, TextDecoder, Date,
  btoa: x=>Buffer.from(x,'binary').toString('base64'), atob: x=>Buffer.from(x,'base64').toString('binary'),
  localStorage: { getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k) },
  fetch: async(url,options={}) => {
    if(url.startsWith('state/templates/')) return response(JSON.parse(fs.readFileSync(root+'/simulation/'+url)));
    const route = url.replace('https://api.github.com/repos/namiyukuta-cmd/private-game-data','').replace(/^\//,'');
    const body = options.body && JSON.parse(options.body);
    if(!route) return response({default_branch:'main'});
    if(route.startsWith('contents/')) { const key=decodeURIComponent(route.slice(9)); return files.has(key)?response({content:Buffer.from(JSON.stringify(files.get(key))).toString('base64')}):response({},404); }
    if(route==='git/ref/heads/main') return response({object:{sha:head}});
    if(route.startsWith('git/commits/') && !body) return response({tree:{sha:'base'}});
    if(route==='git/trees') {const sha='tree'+ ++sequence;pending.set(sha,body.tree);return response({sha});}
    if(route==='git/commits') {const sha='commit'+ ++sequence;commits.set(sha,body);return response({sha});}
    if(route==='git/refs/heads/main') {
      if(failPublish || commits.get(body.sha).parents[0]!==head) return response({},422);
      pending.get(commits.get(body.sha).tree).forEach(file=>files.set(file.path,JSON.parse(file.content)));head=body.sha;return response({object:{sha:head}});
    }
    throw Error('Unexpected route '+route);
  }
};
for(const file of ['js/renaigame_psychology_parameters.js','simulation/js/ai_turn_engine.js','simulation/js/simulation_character_007.js','simulation/js/simulation_character_007_behavior.js','simulation/js/simulation_save.js']) vm.runInNewContext(fs.readFileSync(root+'/'+file,'utf8'),sandbox);
const api=sandbox.window.RenaiGameSave, engine=sandbox.window.RenaiGameTurnEngine, psychology=sandbox.window.RenaiGamePsychologyParameters;
const initial=JSON.parse(fs.readFileSync(root+'/simulation/state/templates/char_007_initial_state.json'));
const prefix='renaigame/simulation/saves/', id='run_import_test', characterId='char_007', profile={name:'取込テスト',age:'41',free:''};
const current={version:2,saveId:id,hasSave:true,game:'simulation',page:'simulation_new.html',updatedAt:'old',meta:{id,protagonistName:profile.name,partnerName:'エミール',selectedCharacterId:characterId,updatedAt:'old'},state:{profile,selectedCharacterId:characterId,session:{id,recordsByCharacter:{},statesByCharacter:{}}},storage:{format:'chapter-files-v1',characters:{}}};
const args={saveId:id,characterId,character:sandbox.window.SimulationCharacter007,behavior:sandbox.window.SimulationCharacter007Behavior,psychology,stateEntry:initial,records:[],protagonistProfile:profile,protagonistInput:'Chapter1\n「ありがとう。」',changes:{gratitude:2},evidence:{gratitude:'ありがとう。'},yoinomaContext:{}};
const packet=engine.runTurn(args), story='Chapter 1\nスウェーデン・家／2026年10月13日（火）／朝／10℃\n\nエミールは静かに頷いた。';
const bundle={version:1,saveId:id,characterId,chapter:1,records:[{index:0,entry:{scene:'Chapter 1',date:'2026-10-13',protagonist:args.protagonistInput,partner:story}}],stateHistory:[{index:0,entry:{turn:1,scene:'Chapter 1',...packet,verification:engine.verifyTurn(args,packet),validation:engine.validateStory(args,packet,story),packet}}]};
const copy=x=>JSON.parse(JSON.stringify(x));
async function main(){
  api.setToken('test');files.set(prefix+id+'.json',copy(current));files.set(prefix+'index.json',{version:1,saves:[copy(current.meta),{id:'unrelated',protagonistName:'別',selectedCharacterId:'char_006',updatedAt:'unchanged'}]});
  const before=JSON.stringify([...files]);
  const preview=await api.prepareChapterImport(bundle);
  assert.equal(preview.chapter,1);assert.equal(preview.protagonistName,profile.name);
  assert.equal(JSON.stringify([...files]),before,'preview never writes');
  const bad=copy(bundle);bad.stateHistory[0].entry.packet.after.gratitude++;
  await assert.rejects(api.prepareChapterImport(bad));
  const other=copy(bundle);other.characterId='char_006';await assert.rejects(api.prepareChapterImport(other));
  failPublish=true;await assert.rejects(api.commitChapterImport(preview));assert.equal(JSON.stringify([...files]),before,'failed commit never publishes partial state');failPublish=false;
  const saved=await api.commitChapterImport(preview);
  assert.equal(saved.storage.characters.char_007.lastSavedChapter,1);
  assert.equal(JSON.stringify(saved.state.session.statesByCharacter.char_007.currentState),JSON.stringify(packet.after));
  assert.equal(files.get(prefix+'index.json').saves[1].updatedAt,'unchanged');
  const duplicate=await api.prepareChapterImport(bundle);assert.equal(duplicate.alreadySaved,true);
  await assert.rejects(api.commitChapterImport(duplicate));
  const conflict=copy(bundle);conflict.records[0].entry.partner+='違う本文';await assert.rejects(api.prepareChapterImport(conflict),/異なる記録/);
  console.log('PASS: real JS replay, preview, wrong slot, tampering, atomic failure, full packet, duplicate and conflict protection');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
