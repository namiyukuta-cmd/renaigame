'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=require('../js/ai_turn_runtime.js'),C=require('../../simulation-lite/core.js'),reviewedActions=require('./helpers/review_fixture.cjs');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sources=Object.fromEntries([...runtime.sourcePaths('char_016'),'simulation/js/simulation_save.js'].map(file=>[file,read(file)]));
class Element {
  constructor(tag,doc){ Object.assign(this,{tag,doc,value:'',children:[],listeners:{},dataset:{},files:[],hidden:false,disabled:false,open:false,_text:''}); }
  addEventListener(type,fn){ (this.listeners[type] ||= []).push(fn); }
  async dispatchEvent(event){ for(const fn of this.listeners[event.type] || []) await fn(event); }
  async trigger(type){ await this.dispatchEvent({type,target:this}); }
  async click(){ if(!this.disabled) await this.trigger('click'); }
  append(...children){ this.children.push(...children); }
  replaceChildren(...children){ this.children=[...children]; this._text=''; }
  set textContent(text){ this._text=String(text); this.children=[]; }
  get textContent(){ return this._text+this.children.map(child=>child.textContent).join(''); }
  focus(){ this.doc.activeElement=this; }
  select(){}
  setSelectionRange(){}
  remove(){}
}
function storage(){ const data=new Map(); return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)}; }
async function ui(local=storage()){
  const document={elements:{},activeElement:null};
  document.body=new Element('body',document);
  document.createElement=tag=>new Element(tag,document);
  document.getElementById=id=>document.elements[id];
  for(const [,tag,attrs,id] of read('simulation-lite/index.html').matchAll(/<([a-z][\w-]*)([^>]*\bid="([^"]+)"[^>]*)>/g)){
    const element=new Element(tag,document); element.id=id; element.disabled=/\bdisabled\b/.test(attrs); element.hidden=/\bhidden\b/.test(attrs); document.elements[id]=element;
  }
  document.elements.character.append(new Element('option',document));
  let copied='',failSources=false;
  document.execCommand=()=>{copied=document.activeElement.value;return true;};
  const scope={document,localStorage:local,console,Event,TextEncoder,Blob,URL,navigator:{},Date,Math,setTimeout}; scope.window=scope;
  scope.fetch=async url=>{
    let text;
    if(String(url).startsWith('https:')){
      if(failSources) throw Error('source unavailable');
      if(String(url).startsWith('https://api.github.com/')) text=JSON.stringify({sha:'a'.repeat(40)});
      else text=sources[new URL(url).pathname.split('/').slice(4).join('/')];
    }else{
      const file=String(url).startsWith('../') ? String(url).slice(3) : 'simulation-lite/'+String(url).split('?')[0];
      text=read(file);
    }
    return {ok:typeof text==='string',status:typeof text==='string'?200:404,json:async()=>JSON.parse(text),text:async()=>text};
  };
  const ctx=vm.createContext(scope);
  for(const file of ['simulation/js/ai_turn_runtime.js','simulation-lite/core.js','simulation-lite/app.js']) vm.runInContext(read(file),ctx,{filename:file});
  await new Promise(resolve=>setImmediate(resolve));
  return {scope,$:id=>document.elements[id],local,get copied(){return copied;},failSources(value){failSources=value;}};
}
function fixture(save){
  const runner=runtime.createRuntime({sources,save,saveId:save.saveId,characterId:'char_016',recordIndices:[]});
  const input={protagonistInput:'Chapter1\n「ありがとう。」',changes:{gratitude:2},evidence:{gratitude:'ありがとう。'}};
  const story='Chapter 1\n英国・店内／2026年10月17日（土）／15:00／15℃\n\nアーサーは頷いた。';
  const args=runner.buildArgs(input),run=runner.runTurn(input),actions=reviewedActions(runner.scope.RenaiGameTurnEngine,args,story),released=runner.releaseStory(input,run.packet,story,actions);
  vm.runInNewContext(sources['simulation/js/simulation_save.js'],{window:runner.scope});
  return {input,story,bundle:runner.scope.RenaiGameSave.createChapterBundleV2({args,packet:run.packet,verification:released.verification,validation:released.validation,chapter:1,date:'2026年10月17日（土）',partner:story,savedRecords:[],recordIndices:[],storyActions:actions})};
}
(async()=>{
  const local=storage(); local.setItem('renaigame_simulation_session_v1','ordinary-save-sentinel');
  let app=await ui(local),$=app.$;
  assert.equal($('workspace').disabled,false);
  assert.equal($('character').children.length,19,'small catalog supplies every existing partner');
  $('name').value='テスト主人公'; $('age').value='31'; $('free').value='テスト用の設定'; $('character').value='char_016';
  await $('start').click(); assert.equal($('play').hidden,false);
  let workspace=C.read(local); const id=workspace.activeId,{bundle,input,story}=fixture(workspace.saves[id]);
  $('draft').value=input.protagonistInput; await $('draft').trigger('input'); await $('copy').click();
  assert.ok(app.copied.includes(input.protagonistInput)); assert.ok(app.copied.includes(id));
  app=await ui(local); $=app.$; assert.equal($('draft').value,input.protagonistInput,'reload restores the exact draft');
  assert.equal(local.getItem('renaigame_simulation_session_v1'),'ordinary-save-sentinel','normal mode is isolated');
  $('chapterJson').value='invalid'; await $('chapterJson').trigger('input'); await $('inspect').click();
  assert.equal($('chapterJson').value,'invalid'); assert.equal(C.read(local).saves[id].state.session.recordsByCharacter.char_016.length,0);
  const source='```json\n'+JSON.stringify(bundle)+'\n```'; $('chapterJson').value=source; await $('chapterJson').trigger('input');
  app.failSources(true); await $('inspect').click(); assert.match($('status').textContent,/source unavailable/);
  assert.equal($('chapterJson').value,source); assert.equal($('preview').hidden,true);
  app.failSources(false); await $('inspect').click(); assert.equal($('preview').hidden,false);
  assert.equal(C.read(local).saves[id].state.session.recordsByCharacter.char_016.length,0,'preview never saves');
  await $('saveChapter').click(); workspace=C.read(local);
  assert.equal(workspace.saves[id].state.session.recordsByCharacter.char_016[0].partner,story);
  assert.equal($('draft').value,''); assert.equal($('chapterJson').value,'');
  $('chapterJson').value=source; await $('chapterJson').trigger('input'); await $('inspect').click(); assert.equal($('saveChapter').disabled,true);
  assert.equal(C.read(local).saves[id].state.session.recordsByCharacter.char_016.length,1,'repeat import never duplicates');
  app=await ui(local); $=app.$; assert.ok($('records').textContent.includes(story),'saved full text is readable after reload');
  const backup=C.makeBackup(C.read(local),{[id]:'次の章の原文'}),fresh=await ui();
  fresh.$('backupFile').files=[{size:1000,text:async()=>JSON.stringify(backup)}]; await fresh.$('backupFile').trigger('change');
  assert.match(fresh.$('status').textContent,/復元しました/);
  assert.ok(fresh.$('records').textContent.includes(story)); assert.equal(fresh.$('draft').value,'次の章の原文');
  const corrupt=storage(); corrupt.setItem(C.STORAGE_KEY,'{broken'); const broken=await ui(corrupt);
  assert.equal(broken.$('workspace').disabled,true); assert.equal(broken.$('rawBackup').hidden,false); assert.equal(corrupt.getItem(C.STORAGE_KEY),'{broken');
  console.log('Lite UI: start, copy, reload, failed/verified/duplicate imports, isolated saves and backup restoration passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
