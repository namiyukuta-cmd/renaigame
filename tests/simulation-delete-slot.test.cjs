const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync(__dirname+'/../simulation/js/simulation_save.js','utf8');
function setup({current='run_b',concurrent=false,badVerification=false,legacy=false}={}){
 const base='renaigame/simulation/saves/',files=new Map(),storage=new Map([['renaigame_github_token_v1','fake'],['renaigame_simulation_current_save_id_v1',current],['renaigame_simulation_session_v1',JSON.stringify({id:current,recordsByCharacter:{char_006:[{partner:'残す本文'}]},statesByCharacter:{}})],['renaigame_simulation_profile_v1','{"name":"別主人公"}'],['renaigame_simulation_selected_character_v1','char_006']]);
 const metadata=(id,name,cid,slot)=>({id,protagonistName:name,selectedCharacterId:cid,partnerName:'相手',slotNumber:slot,updatedAt:'2026-10-15T00:00:00Z'});
 const a=metadata('run_a','主人公A','char_007',1),b=metadata('run_b','別主人公','char_006',1);
 const save=meta=>({game:'simulation',saveId:meta.id,updatedAt:meta.updatedAt,meta,state:{profile:{name:meta.protagonistName},selectedCharacterId:meta.selectedCharacterId,session:{id:meta.id,recordsByCharacter:{},statesByCharacter:{}}}});
 files.set(base+'run_a.json',save(a));files.set(base+'run_b.json',save(b));files.set(base+'index.json',{version:1,saves:[a,b]});
 if(legacy)files.set('renaigame/simulation/save.json',save(a));
 let treeEntries=null,writes=0,refReads=0,published=false;
 const fetch=async(url,opts={})=>{
  const path=url.split('/private-game-data')[1];let data,status=200;
  if(opts.method&&opts.method!=='GET')writes++;
  if(path==='')data={default_branch:'main'};
  else if(path==='/git/ref/heads/main'){refReads++;data={object:{sha:concurrent&&refReads>1?'other':'head'}};}
  else if(path==='/git/commits/head')data={tree:{sha:'base'}};
  else if(path==='/git/trees'){treeEntries=JSON.parse(opts.body).tree;data={sha:'tree'};}
  else if(path==='/git/commits')data={sha:'published'};
  else if(path==='/git/refs/heads/main'){assert.equal(JSON.parse(opts.body).force,false);for(const entry of treeEntries){if(entry.sha===null)files.delete(entry.path);else files.set(entry.path,JSON.parse(entry.content));}published=true;data={};}
  else if(path.startsWith('/contents/')){
   const key=decodeURIComponent(path.slice(10).split('?')[0]);let item=files.get(key);
   if(badVerification&&published&&key.endsWith('index.json'))item={version:1,saves:[]};
   if(!item)status=404;else data={content:Buffer.from(JSON.stringify(item)).toString('base64')};
  }else throw Error('Unexpected '+url);
  return {ok:status===200,status,json:async()=>data};
 };
 const window={};vm.runInNewContext(script,{window,fetch,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},TextEncoder,TextDecoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),Date,Math});
 return {api:window.RenaiGameSave,files,storage,a,b,base,get writes(){return writes},get treeEntries(){return treeEntries}};
}
async function main(){
 let x=setup(),bBefore=JSON.stringify(x.files.get(x.base+'run_b.json')),localBefore=x.storage.get(x.api.SESSION_KEY);
 const expected={pairKey:x.api.pairKey(x.a),updatedAt:x.a.updatedAt};
 const result=await x.api.deleteSaveById('run_a',expected);
 assert.equal(result.deleted,true);assert.equal(result.clearedCurrent,false);assert.equal(x.files.has(x.base+'run_a.json'),false);
 assert.equal(JSON.stringify(x.files.get(x.base+'run_b.json')),bBefore);assert.equal(x.storage.get(x.api.SESSION_KEY),localBefore);
 assert.equal(x.files.get(x.base+'index.json').saves.length,1);assert.equal(x.files.get(x.base+'index.json').saves[0].id,'run_b');
 assert.deepEqual(x.treeEntries.map(e=>e.path),[x.base+'run_a.json',x.base+'index.json']);assert.equal(x.treeEntries[0].sha,null);
 x=setup({current:'run_a'});assert.equal((await x.api.deleteSaveById('run_a',expected)).clearedCurrent,true);assert.equal(x.api.getCurrentSaveId(),'');assert.equal(x.storage.has('renaigame_simulation_profile_v1'),false);
 for(const wrong of [{...expected,pairKey:'wrong'},{...expected,updatedAt:'old'}]){x=setup();await assert.rejects(()=>x.api.deleteSaveById('run_a',wrong),/更新/);assert.equal(x.writes,0);}
 x=setup({concurrent:true});await assert.rejects(()=>x.api.deleteSaveById('run_a',expected),/別の保存/);assert.equal(x.writes,0);assert.equal(x.files.has(x.base+'run_a.json'),true);
 x=setup({current:'run_a',badVerification:true});await assert.rejects(()=>x.api.deleteSaveById('run_a',expected),/削除後の確認/);assert.equal(x.api.getCurrentSaveId(),'run_a');
 x=setup({current:'__legacy__',legacy:true});assert.equal((await x.api.deleteSaveById('__legacy__',expected)).clearedCurrent,true);assert.equal(x.files.has('renaigame/simulation/save.json'),false);assert.equal(x.files.has(x.base+'run_a.json'),true);
 console.log('PASS: selected slot only, atomic file/index deletion, local reset, wrong pair/stale/concurrent rejection, verification failure and legacy');
}
main().catch(e=>{console.error(e);process.exit(1)});
