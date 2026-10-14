const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const engine=require('../simulation/js/ai_turn_engine.js');
async function main(){
 const id='run_test',base='renaigame/simulation/saves/',files=new Map(),store=new Map([['renaigame_github_token_v1','test']]);let writes=0;
 const save={version:2,game:'simulation',saveId:id,meta:{id,protagonistName:'主人公A',selectedCharacterId:'',slotNumber:1},state:{profile:{name:'主人公A'},selectedCharacterId:null,session:{id,recordsByCharacter:{},statesByCharacter:{}}}};
 files.set(base+id+'.json',save);files.set(base+'index.json',{version:1,saves:[save.meta]});
 const fetch=async(url,options={})=>{let data,status=200;const p=url.split('/private-game-data')[1];if(options.method && options.method!=='GET')writes++;
 if(p==='')data={default_branch:'main'};
 else if(p==='/git/ref/heads/main')data={object:{sha:'head'}};
 else if(p.startsWith('/contents/')){const f=files.get(decodeURIComponent(p.slice(10).split('?')[0]));if(!f)status=404;else data={content:Buffer.from(JSON.stringify(f)).toString('base64')};}
 else throw Error('Unexpected '+url);
 return {ok:status===200,status,json:async()=>data};};
 const window={RenaiGameTurnEngine:engine};vm.runInNewContext(fs.readFileSync(__dirname+'/../simulation/js/simulation_save.js','utf8'),{window,fetch,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},TextEncoder,TextDecoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),Date,Math});
 const api=window.RenaiGameSave,bundle={version:1,saveId:id,characterId:null,chapter:1,records:[{index:0,entry:{scene:'Chapter 1',protagonist:'入力',partner:'相手は尋ねられた場所への道順を答えた。'}}],stateHistory:[],draftMetadata:{status:'unverified_draft',psychologyJsExecuted:false}};
 assert.equal((await api.prepareChapterImport(bundle)).unverifiedDraft,true);
 for(const text of ['主人公Aはいない方がいい。','誰も主人公Aを助けない。','主人公Aは見放された。'])await assert.rejects(()=>api.prepareChapterImport({...bundle,records:[{index:0,entry:{...bundle.records[0].entry,partner:text}}]}),/継続検査/);
 assert.equal(writes,0);assert.equal(Object.keys(save.state.session.statesByCharacter).length,0);assert.equal(Object.keys(save.state.session.recordsByCharacter).length,0);
 console.log('PASS: unassigned import checks continuity before any write; normal draft accepted; psychology unchanged');
}
main().catch(e=>{console.error(e);process.exit(1)});
