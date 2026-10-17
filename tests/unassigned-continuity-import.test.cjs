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
 const need='助けてください。状況を変えてください。';
 const action='管理人は面会を禁じる札を撤去した。',outcome='面会の制限はなくなり、親族が毎日訪ねられるようになった。';
 const supported={...bundle,records:[{index:0,entry:{...bundle.records[0].entry,protagonist:need,partner:action+outcome}}]};
 await assert.rejects(()=>api.prepareChapterImport(supported),/継続検査/,'an unassigned draft must validate the actual protagonist input');
 supported.draftMetadata={...bundle.draftMetadata,storyActions:{continuity:{supportProgress:{
   kind:'circumstance_change',actor:'管理人',problem:{source:'input',quote:'状況を変えてください'},actionQuote:action,outcomeQuote:outcome
 }}}};
 assert.equal((await api.prepareChapterImport(supported)).unverifiedDraft,true);
 const forged=JSON.parse(JSON.stringify(supported));forged.draftMetadata.storyActions.continuity.supportProgress.outcomeQuote='本文にない結果';
 await assert.rejects(()=>api.prepareChapterImport(forged),/継続検査/);
 const romance=JSON.parse(JSON.stringify(supported));romance.records[0].entry.protagonist='恋愛を進めてください。';
 delete romance.draftMetadata.storyActions.continuity;
 await assert.rejects(()=>api.prepareChapterImport(romance),/恋愛の進展/,'support is not a substitute for the requested male romance');
 const maleAction='青年セシルは自分で門を訪れた。',maleIntent='「あなたに会いたくて来ました」';
 romance.records[0].entry.partner=maleAction+maleIntent;
 romance.draftMetadata.storyActions.romanceProgress={kind:'initiative',actor:'セシル',actorGender:'male',bloodRelatedToProtagonist:false,relationshipToProtagonist:'unrelated',actionQuote:maleAction,romanticIntentQuote:maleIntent};
 assert.equal((await api.prepareChapterImport(romance)).unverifiedDraft,true);
 const woman=JSON.parse(JSON.stringify(romance));woman.draftMetadata.storyActions.romanceProgress.actorGender='female';
 await assert.rejects(()=>api.prepareChapterImport(woman),/男性限定/);
 const blood=JSON.parse(JSON.stringify(romance));blood.draftMetadata.storyActions.romanceProgress.bloodRelatedToProtagonist=true;
 await assert.rejects(()=>api.prepareChapterImport(blood),/血縁者/);
 const historical=JSON.parse(JSON.stringify(bundle.records[0].entry));historical.protagonist=need;
 const oldSave=JSON.parse(JSON.stringify(save));oldSave.state.session.recordsByCharacter.__unassigned__=[historical];
 files.set(base+id+'.json',oldSave);
 const oldBundle={...bundle,records:[{index:0,entry:historical}]};
 assert.equal((await api.prepareChapterImport(oldBundle)).alreadySaved,true,'unchanged historical drafts need no retroactive outcome metadata');
 assert.equal(writes,0);assert.equal(Object.keys(save.state.session.statesByCharacter).length,0);assert.equal(Object.keys(save.state.session.recordsByCharacter).length,0);
 console.log('PASS: unassigned import checks continuity before any write; normal draft accepted; psychology unchanged');
}
main().catch(e=>{console.error(e);process.exit(1)});

