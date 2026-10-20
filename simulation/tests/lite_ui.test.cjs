'use strict';
// DOM/network fixture only: all actions below run the real lightweight UI,
// standard save backend, psychology JS and review engine.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=require('../js/ai_turn_runtime.js'),reviewedActions=require('./helpers/review_fixture.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),copy=value=>JSON.parse(JSON.stringify(value));
class Element{
  constructor(tag,doc){Object.assign(this,{tagName:tag.toUpperCase(),doc,value:'',children:[],listeners:{},dataset:{},files:[],hidden:false,disabled:false,open:false,_text:'',attrs:{}});}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
  async trigger(type){const event={type,target:this,preventDefault(){this.prevented=true;}};for(const fn of this.listeners[type]||[])await fn(event);return event;}
  async click(){if(!this.disabled)return this.trigger('click');}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];this._text='';}
  set textContent(text){this._text=String(text);this.children=[];}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  getAttribute(name){return this.attrs[name];}
  focus(){this.doc.activeElement=this;}
  select(){}
  setSelectionRange(){}
  scrollIntoView(){this.scrolled=true;}
}
function storage(){const map=new Map();return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),map};}
function cloud(){return {files:new Map(),trees:new Map(),commits:new Map(),requests:[],head:'original',counter:0,failPublish:false,failSources:false};}
async function ui(local=storage(),remote=cloud()){
  const document={elements:{},anchors:[],activeElement:null,listeners:{},visibilityState:'visible'},html=read('simulation-lite/index.html');
  document.addEventListener=(type,fn)=>(document.listeners[type]||=[]).push(fn);
  document.createElement=tag=>new Element(tag,document);document.getElementById=id=>document.elements[id];
  for(const [,tag,attrs,id]of html.matchAll(/<([a-z][\w-]*)([^>]*\bid="([^"]+)"[^>]*)>/g)){
    const e=new Element(tag,document);e.id=id;e.hidden=/\bhidden\b/.test(attrs);e.disabled=/\bdisabled\b/.test(attrs);document.elements[id]=e;
  }
  for(const [,href]of html.slice(html.indexOf('<nav class="bottom-nav"')).matchAll(/<a href="([^"]+)"/g)){const e=new Element('a',document);e.attrs.href=href;document.anchors.push(e);}
  document.elements.character.append(new Element('option',document));
  document.querySelectorAll=selector=>selector==='.bottom-nav a'?document.anchors:[];
  let copied='';document.execCommand=()=>{copied=document.activeElement.value;return true;};
  const response=(value,status=200)=>({ok:status<400,status,json:async()=>copy(value),text:async()=>typeof value==='string'?value:JSON.stringify(value)});
  const scope={document,localStorage:local,console,TextEncoder,TextDecoder,Date,Math,navigator:{},
    btoa:value=>Buffer.from(value,'binary').toString('base64'),atob:value=>Buffer.from(value,'base64').toString('binary'),
    fetch:async(url,options={})=>{
      remote.requests.push({url,method:options.method||'GET'});
      if(url.startsWith('https://raw.githubusercontent.com/')){
        if(remote.failSources)throw Error('source unavailable');return response(read(new URL(url).pathname.split('/').slice(4).join('/')));
      }
      if(url==='https://api.github.com/repos/namiyukuta-cmd/renaigame/commits/main')return response({sha:'c'.repeat(40)});
      if(!url.startsWith('https:')){
        const file=new URL(url,'https://example.test/renaigame/simulation/').pathname.slice('/renaigame/'.length);return response(JSON.parse(read(file.split('?')[0])));
      }
      assert.ok(url.startsWith('https://api.github.com/repos/namiyukuta-cmd/private-game-data'),'private cloud endpoint');
      const route=new URL(url).pathname.split('/').slice(4).join('/'),body=options.body&&JSON.parse(options.body);
      if(!route)return response({default_branch:'main'});
      if(route.startsWith('contents/')){const name=decodeURIComponent(route.slice(9));return remote.files.has(name)?response({content:Buffer.from(JSON.stringify(remote.files.get(name))).toString('base64')}):response({},404);}
      if(route==='git/ref/heads/main')return response({object:{sha:remote.head}});
      if(route.startsWith('git/commits/')&&!body)return response({tree:{sha:'base'}});
      if(route==='git/trees'){const sha='tree'+ ++remote.counter;remote.trees.set(sha,body.tree);return response({sha});}
      if(route==='git/commits'){const sha='commit'+ ++remote.counter;remote.commits.set(sha,body);return response({sha});}
      if(route==='git/refs/heads/main'){
        if(remote.failPublish||remote.commits.get(body.sha).parents[0]!==remote.head)return response({},422);
        for(const entry of remote.trees.get(remote.commits.get(body.sha).tree))remote.files.set(entry.path,JSON.parse(entry.content));
        remote.head=body.sha;return response({object:{sha:remote.head}});
      }
      throw Error('Unexpected route '+route);
    }};
  scope.window=scope;const context=vm.createContext(scope);
  for(const file of ['js/renaigame_policy.js','simulation/js/simulation_save.js','simulation/js/ai_turn_runtime.js','simulation-lite/core.js','simulation-lite/app.js'])vm.runInContext(read(file),context,{filename:file});
  for(let turn=0;turn<80&&document.elements.workspace.disabled;turn++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.elements.workspace.disabled,false,'initialization finishes');
  return {scope,context,local,remote,$:id=>document.elements[id],anchors:document.anchors,get copied(){return copied;},show:async()=>{for(const fn of document.listeners.visibilitychange||[])await fn();}};
}
function chapter(api,save,number){
  const characterId=save.state.selectedCharacterId,snapshot=api.createCompactHandoff(save),all=snapshot.state.session.recordsByCharacter[characterId];
  const sources=Object.fromEntries([...runtime.sourcePaths(characterId),'simulation/js/simulation_save.js'].map(file=>[file,read(file)]));
  const runner=runtime.createRuntime({sources,save:snapshot,saveId:save.saveId,characterId});
  const input={protagonistInput:'Chapter'+number+'\n「ありがとう。」',changes:{gratitude:1},evidence:{gratitude:'ありがとう。'}};
  const story='Chapter '+number+'\n英国・店内／2026年10月18日（日）／15:0'+number+'／15℃\n\nアーサーは頷いた。';
  const args=runner.buildArgs(input),run=runner.runTurn(input),actions=reviewedActions(runner.scope.RenaiGameTurnEngine,args,story,{handoffView:'history-references-v1'}),released=runner.releaseStory(input,run.packet,story,actions);
  vm.runInNewContext(sources['simulation/js/simulation_save.js'],{window:runner.scope});
  return {input,story,bundle:runner.scope.RenaiGameSave.createChapterBundleV2({args,packet:run.packet,verification:released.verification,validation:released.validation,chapter:number,date:'2026年10月18日（日）',partner:story,savedRecords:all,recordIndices:all.map((_,i)=>i),storyActions:actions})};
}
(async()=>{
  const local=storage(),remote=cloud();let app=await ui(local,remote),$=app.$,api=app.scope.RenaiGameSave;
  assert.equal($('settings').open,true);assert.equal($('play').hidden,true);
  $('token').value='test-token';await $('connect').click();assert.equal($('token').value,'');assert.equal(api.getToken(),'test-token');
  $('name').value='テスト主人公';$('age').value='31';$('free').value='テスト用の設定';$('character').value='char_016';
  await $('start').click();assert.equal($('play').hidden,false,$('status').textContent);
  const id=api.getCurrentSaveId(),key='renaigame/simulation/saves/'+id+'.json';
  assert.ok(remote.files.has(key));const original=copy(remote.files.get(key));
  assert.equal(original.game,'simulation');assert.equal(original.state.selectedCharacterId,'char_016');
  assert.equal(remote.requests.some(r=>r.url.includes('simulation_character_001.js')),false,'start does not load every character');
  const first=chapter(api,original,1);
  $('draft').value=first.input.protagonistInput;await $('draft').trigger('input');await $('copy').click();
  assert.ok(app.copied.includes('private-game-data'));assert.ok(app.copied.includes(id));assert.ok(!app.copied.includes('test-token'));
  assert.ok(app.copied.includes(first.input.protagonistInput));
  assert.match(app.copied,/liteRulePaths\(characterId\)/,'the actual copied AI prompt selects the lightweight retrieval plan');
  assert.match(app.copied,/恋愛相手自身の傷つき・悲しみ・怒り/);
  assert.match(app.copied,/主人公への異議や反論/);
  const before=JSON.stringify([...remote.files]);$('chapterJson').value='invalid';await $('chapterJson').trigger('input');await $('saveChapter').click();
  assert.equal(JSON.stringify([...remote.files]),before);assert.equal($('chapterJson').value,'invalid');
  const raw='```json\n'+JSON.stringify(first.bundle)+'\n```';$('chapterJson').value=raw;await $('chapterJson').trigger('input');
  remote.failSources=true;await $('saveChapter').click();assert.match($('status').textContent,/source unavailable/);assert.equal($('chapterJson').value,raw);assert.equal(JSON.stringify([...remote.files]),before);
  remote.failSources=false;await $('saveChapter').click();assert.match($('status').textContent,/再取得して確認しました/);
  assert.equal(remote.files.get(key).state.session.recordsByCharacter.char_016[0].partner,first.story);
  assert.equal($('draft').value,'');assert.equal($('chapterJson').value,'');assert.ok($('records').textContent.includes(first.story));
  const publishes=remote.requests.filter(r=>r.method==='PATCH').length;
  app=await ui(local,remote);$=app.$;api=app.scope.RenaiGameSave;
  assert.ok($('records').textContent.includes(first.story),'reload reads the same private canon');
  assert.equal(remote.requests.filter(r=>r.method==='PATCH').length,publishes,'reload never writes');
  const second=chapter(api,remote.files.get(key),2),secondText=JSON.stringify(second.bundle);
  $('draft').value=second.input.protagonistInput;await $('draft').trigger('input');$('chapterJson').value=secondText;await $('chapterJson').trigger('input');
  remote.failPublish=true;await $('saveChapter').click();assert.equal(remote.files.get(key).state.session.recordsByCharacter.char_016.length,1);assert.equal($('chapterJson').value,secondText);
  remote.failPublish=false;await $('saveChapter').click();assert.equal(remote.files.get(key).state.session.recordsByCharacter.char_016.length,2,$('status').textContent);
  $('chapterJson').value=secondText;await $('chapterJson').trigger('input');await $('saveChapter').click();assert.match($('status').textContent,/保存済み/);assert.equal(remote.files.get(key).state.session.recordsByCharacter.char_016.length,2);
  const oldHistory=copy(remote.files.get(key).state.session.statesByCharacter.char_016.stateHistory);
  $('editFree').value='更新したテスト設定';await $('saveProfile').click();assert.deepEqual(remote.files.get(key).state.session.statesByCharacter.char_016.stateHistory,oldHistory,'profile save retains complete packets');
  const third=chapter(api,remote.files.get(key),3);
  for(const file of runtime.sourcePaths('char_016'))vm.runInContext(read(file),app.context,{filename:file});
  const plan=await api.createChapterWritePlan(third.bundle,{head:'a'.repeat(40),save:copy(remote.files.get(key)),index:copy(remote.files.get('renaigame/simulation/saves/index.json'))});
  for(const file of plan.files)remote.files.set(file.path,copy(file.data));
  $('draft').value='Chapter4\n次の入力';await $('draft').trigger('input');$('editFree').value='未保存のプロフィール編集';
  await app.show();assert.ok($('records').textContent.includes(third.story),'returning from ChatGPT automatically reads the AI-saved canon');assert.equal($('draft').value,'Chapter4\n次の入力');assert.equal($('editFree').value,'未保存のプロフィール編集');
  $('character').value='';$('name').value='未選択テスト';await $('start').click();const other=api.getCurrentSaveId();assert.notEqual(other,id);assert.equal($('draft').value,'');
  const unassigned=remote.files.get('renaigame/simulation/saves/'+other+'.json');assert.deepEqual(unassigned.state.session.statesByCharacter,{});
  $('chapterJson').value=secondText;await $('chapterJson').trigger('input');const untouched=JSON.stringify([...remote.files]);await $('saveChapter').click();assert.match($('status').textContent,/現在開いている物語/);assert.equal(JSON.stringify([...remote.files]),untouched);
  const unassignedScope={};for(const file of ['js/renaigame_policy.js','simulation/js/ai_turn_engine.js'])vm.runInNewContext(read(file),{window:unassignedScope});
  const rawInput='Chapter1\n「こんにちは。」',rawStory='Chapter 1\n都・庭／2026年10月18日（日）／16:00／15℃\n\n男性は名を告げた。';
  const draftArgs={saveId:other,protagonistProfile:unassigned.state.profile,records:[],protagonistInput:rawInput};
  const draftBundle={version:1,saveId:other,characterId:null,chapter:1,records:[{index:0,entry:{scene:'Chapter 1',date:'2026年10月18日（日）',protagonist:rawInput,partner:rawStory}}],stateHistory:[],draftMetadata:{status:'unverified_draft',psychologyJsExecuted:false,storyActions:reviewedActions(unassignedScope.RenaiGameTurnEngine,draftArgs,rawStory)}};
  $('chapterJson').value=JSON.stringify(draftBundle);await $('chapterJson').trigger('input');await $('saveChapter').click();
  const unassignedSaved=remote.files.get('renaigame/simulation/saves/'+other+'.json');assert.equal(unassignedSaved.state.session.recordsByCharacter.__unassigned__[0].partner,rawStory,$('status').textContent);assert.deepEqual(unassignedSaved.state.session.statesByCharacter,{});assert.match($('status').textContent,/心理計算のない未選択章/);
  $('stories').value=id;await $('loadButton').click();assert.ok($('records').textContent.includes(second.story));
  $('profilePanel').open=false;const nav=app.anchors.find(a=>a.getAttribute('href')==='#profilePanel'),event=await nav.click();assert.equal(event.prevented,true);assert.equal($('profilePanel').open,true);assert.equal($('profilePanel').scrolled,true,'base URL cannot navigate fragments away from the lightweight page');
  for(const request of remote.requests.filter(r=>r.method!=='GET'))assert.ok(request.url.startsWith('https://api.github.com/repos/namiyukuta-cmd/private-game-data/'));
  assert.equal(local.map.has('renaigame_lite_workspace_v1'),false);
  assert.ok(!/<img\b/i.test(read('simulation-lite/index.html')));
  for(const partner of [
    {id:'char_021',name:'藤原朝澄',age:'29歳',occupation:'正五位下・右近衛少将'},
    {id:'char_022',name:'源顕守',age:'35歳',occupation:'従四位下・左近衛中将'}
  ]){
    const option=$('character').children.find(option=>option.value===partner.id);
    assert.equal(option?.textContent,partner.name,'軽量版の一覧から新規の恋愛相手を選べる');
    const previousSaveId=api.getCurrentSaveId(),previousKey='renaigame/simulation/saves/'+previousSaveId+'.json';
    const existingStory=JSON.stringify(remote.files.get(previousKey));
    $('character').value=partner.id;await $('character').trigger('change');
    assert.ok($('characterInfo').textContent.includes(partner.age));
    assert.ok($('characterInfo').textContent.includes(partner.occupation));
    $('name').value=partner.name+'ルート検査';await $('start').click();
    const newId=api.getCurrentSaveId();
    assert.notEqual(newId,previousSaveId);
    const newSave=remote.files.get('renaigame/simulation/saves/'+newId+'.json');
    assert.equal(newSave.state.selectedCharacterId,partner.id,$('status').textContent);
    assert.equal(newSave.meta.partnerName,partner.name);
    assert.ok($('pairName').textContent.includes(partner.name));
    assert.deepEqual(Object.keys(newSave.state.session.statesByCharacter),[partner.id]);
    assert.equal(newSave.state.session.statesByCharacter[partner.id].currentState.characterId,partner.id);
    assert.equal(newSave.state.session.statesByCharacter[partner.id].currentState.romanceScore,0);
    assert.equal(JSON.stringify(remote.files.get(previousKey)),existingStory,'別の相手を選んでも既存の物語を書き換えない');
  }
  console.log('Lite UI: private new/load/reload, one-button chapter save, source/publish failures, duplicate/wrong-slot protection, profiles and navigation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
