(() => {
  'use strict';
  const C=window.RenaiGameLite, runtime=window.RenaiGameTurnRuntime, $=id=>document.getElementById(id);
  const DRAFT='renaigame_lite_draft:', PENDING='renaigame_lite_pending:', FORM='renaigame_lite_new_profile';
  let workspace, catalog=[], prepared=null, busy=false, filename;
  function message(text,error=false){ $('status').textContent=text; $('status').dataset.error=String(error); }
  function current(){ return workspace?.saves[workspace.activeId] || null; }
  function records(save=current()){ return save ? save.state.session.recordsByCharacter[save.state.selectedCharacterId] : []; }
  function persist(next){
    if(!C.equal(C.read(localStorage),workspace)) throw Error('別の画面で保存データが更新されました。再読み込みしてから続けてください。');
    C.write(localStorage,next); workspace=next;
  }
  async function perform(action){
    if(busy) return;
    busy=true; $('workspace').disabled=true;
    try { await action(); } catch(error){ message(error.message || '処理できませんでした。入力は残っています。',true); }
    finally { busy=false; $('workspace').disabled=false; }
  }
  function option(value,text){ const e=document.createElement('option'); e.value=value; e.textContent=text; return e; }
  function clearPreview(){ prepared=null; $('preview').hidden=true; }
  function storyLabel(save){ return (save.state.profile.name || '主人公')+' ＋ '+save.partnerName; }
  function render(){
    clearPreview(); filename=undefined; $('chapterFile').value=''; $('prompt').value='';
    $('stories').replaceChildren();
    const saves=Object.values(workspace.saves).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    if(!saves.length) $('stories').append(option('','まだ物語がありません'));
    for(const save of saves) $('stories').append(option(save.saveId,storyLabel(save)+' ／ '+records(save).length+'章'));
    $('stories').value=workspace.activeId || '';
    const save=current(); $('play').hidden=!save; $('profileView').hidden=!save;
    $('setup').open=!save;
    $('storyInfo').textContent=save ? 'Chapter '+(records().length+1)+'から ／ 保存先：この端末' : '主人公と相手を設定して始めます。保存先はこの端末です。';
    $('profileText').textContent=save ? [storyLabel(save),save.state.profile.age ? '年齢：'+save.state.profile.age : '',save.state.profile.free || '', 'セーブID：'+save.saveId].filter(Boolean).join('\n') : '';
    $('draft').value=save ? localStorage.getItem(DRAFT+save.saveId) || '' : '';
    $('chapterJson').value=save ? localStorage.getItem(PENDING+save.saveId) || '' : '';
    $('pages').replaceChildren(); const count=records().length;
    for(let start=0;start<count;start+=10) $('pages').append(option(String(start),'Chapter '+(start+1)+'〜'+Math.min(start+10,count)));
    if(count) $('pages').value=String(Math.floor((count-1)/10)*10);
    renderRecords();
  }
  function renderRecords(){
    $('records').replaceChildren(); const save=current(), all=records();
    if(!save || !all.length){ $('records').textContent='保存した章はまだありません。'; return; }
    const start=Number($('pages').value) || 0;
    for(const record of all.slice(start,start+10)){
      const article=document.createElement('article'); article.className='record';
      const heading=document.createElement('h3'); heading.textContent=record.scene; article.append(heading);
      for(const [label,text] of [[save.state.profile.name || '主人公',record.protagonist],[save.partnerName,record.partner]]){
        const name=document.createElement('div'), body=document.createElement('p'); name.className='record-label'; name.textContent=label; body.className='prose'; body.textContent=text; article.append(name,body);
      }
      $('records').append(article);
    }
  }
  async function json(url){ const response=await fetch(url,{cache:'no-store'}); if(!response.ok) throw Error('データを読み込めません：'+response.status); return response.json(); }
  async function sourcesFor(id){
    const head=await json('https://api.github.com/repos/namiyukuta-cmd/renaigame/commits/main');
    if(!/^[0-9a-f]{40}$/i.test(head.sha || '')) throw Error('検証用JSの取得元を確認できません。');
    const paths=[...runtime.sourcePaths(id),'simulation/js/simulation_save.js'];
    return Object.fromEntries(await Promise.all(paths.map(async path=>{
      const response=await fetch('https://raw.githubusercontent.com/namiyukuta-cmd/renaigame/'+head.sha+'/'+path);
      if(!response.ok) throw Error('検証用JSを取得できません：'+path);
      return [path,await response.text()];
    })));
  }
  function handoff(){ const save=current(); if(!save) throw Error('先に物語を始めてください。'); return C.buildPrompt(save,$('draft').value); }
  function download(data,name){
    const blob=new Blob([data],{type:'application/json;charset=utf-8'}), url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url; link.download=name; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function parse(source){
    if(new TextEncoder().encode(source).byteLength > 25*1024*1024) throw Error('JSONが大きすぎます。');
    const raw=source.trim(), fence=/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i.exec(raw);
    if(!raw) throw Error('JSONを貼り付けるか、ファイルを選んでください。');
    return JSON.parse(fence ? fence[1] : raw);
  }
  for(const id of ['name','age','free','character']) $(id).addEventListener('input',()=>{
    try { localStorage.setItem(FORM,JSON.stringify(Object.fromEntries(['name','age','free','character'].map(key=>[key,$(key).value])))); }
    catch(error){ message('設定の下書きを残せません：'+error.message,true); }
  });
  $('character').addEventListener('change',()=>{
    const c=catalog.find(item=>item.id===$('character').value); $('characterInfo').textContent=c ? [c.age ? c.age+'歳' : '',c.occupation].filter(Boolean).join(' ／ ') : '';
  });
  $('start').addEventListener('click',()=>perform(async()=>{
    const character=catalog.find(item=>item.id===$('character').value);
    if(!character) throw Error('男性の恋愛相手を選んでください。');
    message('新しい物語を準備しています…');
    const initialState=await json('../simulation/state/templates/'+character.id+'_initial_state.json');
    const save=C.createSave({profile:{name:$('name').value,age:$('age').value,free:$('free').value},characterId:character.id,partnerName:character.name,initialState});
    const next=C.clone(workspace); next.saves[save.saveId]=save; next.activeId=save.saveId; persist(next); render();
    message('新しい物語を作成して端末に保存しました。主人公の台詞・行動を入力できます。');
  }));
  $('stories').addEventListener('change',()=>{
    try { const next=C.clone(workspace); next.activeId=$('stories').value; persist(next); render(); message('物語を切り替えました。'); }
    catch(error){ message(error.message,true); }
  });
  $('draft').addEventListener('input',()=>{
    try { if(current()) localStorage.setItem(DRAFT+current().saveId,$('draft').value); $('prompt').value=''; }
    catch(error){ message('下書きを保存できません：'+error.message,true); }
  });
  $('copy').addEventListener('click',async()=>{
    try {
      $('prompt').value=handoff(); $('handoff').open=true; $('prompt').focus(); $('prompt').select(); $('prompt').setSelectionRange(0,$('prompt').value.length);
      let copied=false; try { copied=typeof document.execCommand==='function' && document.execCommand('copy'); } catch {}
      if(!copied){ try { await navigator.clipboard.writeText($('prompt').value); copied=true; } catch {} }
      if(copied){ $('handoff').open=false; $('copy').focus(); message('コピーしました。ChatGPTへ貼り付けてください。'); }
      else message('引き継ぎ文を選択しました。長押ししてコピーしてください。');
    }catch(error){ message(error.message,true); }
  });
  $('handoff').addEventListener('toggle',()=>{
    if(!$('handoff').open || $('prompt').value) return;
    try { $('prompt').value=handoff(); } catch(error){ message(error.message,true); }
  });
  $('chapterJson').addEventListener('input',()=>{
    clearPreview(); filename=undefined;
    try { if(current()) localStorage.setItem(PENDING+current().saveId,$('chapterJson').value); } catch(error){ message(error.message,true); }
  });
  $('chapterFile').addEventListener('change',()=>perform(async()=>{
    const file=$('chapterFile').files[0]; if(!file) return;
    if(file.size>25*1024*1024) throw Error('JSONファイルが大きすぎます。');
    const text=await file.text(); clearPreview(); $('chapterJson').value=text; filename=file.name;
    if(current()) localStorage.setItem(PENDING+current().saveId,text);
    message('JSONファイルを読み込みました。「章を確認する」を押してください。');
  }));
  $('inspect').addEventListener('click',()=>perform(async()=>{
    clearPreview(); const save=current(); if(!save) throw Error('先に物語を始めてください。');
    const bundle=parse($('chapterJson').value);
    if(bundle.saveId!==save.saveId || bundle.characterId!==save.state.selectedCharacterId) throw Error('この物語の章JSONを選んでください。');
    message('心理計算と本文を検証しています…');
    const sources=await sourcesFor(save.state.selectedCharacterId);
    prepared=C.prepareChapter(save,bundle,{runtime,sources,filename});
    $('previewTitle').textContent=storyLabel(save)+' ／ Chapter '+prepared.chapter;
    $('previewText').textContent=prepared.record.protagonist+'\n\n'+prepared.record.partner; $('preview').hidden=false;
    $('saveChapter').textContent=prepared.alreadySaved ? 'この章は保存済みです' : 'この章を端末に保存'; $('saveChapter').disabled=prepared.alreadySaved;
    message(prepared.alreadySaved ? '同じ内容の章は保存済みです。二重追加しません。' : '心理計算と本文検査を確認しました。保存する本文をご確認ください。');
  }));
  $('saveChapter').addEventListener('click',()=>{
    try {
      if(!prepared || prepared.alreadySaved) return;
      const saveId=prepared.save.saveId, chapter=prepared.chapter, input=prepared.record.protagonist;
      const next=C.commitPrepared(C.read(localStorage),prepared); persist(next);
      if(localStorage.getItem(DRAFT+saveId)===input) localStorage.removeItem(DRAFT+saveId);
      localStorage.removeItem(PENDING+saveId); render(); $('importPanel').open=false;
      message('Chapter '+chapter+'の本文と心理状態を、この端末に保存しました。');
    }catch(error){ message(error.message,true); }
  });
  $('pages').addEventListener('change',renderRecords);
  $('export').addEventListener('click',()=>{
    try {
      const drafts=Object.fromEntries(Object.keys(workspace.saves).map(id=>[id,localStorage.getItem(DRAFT+id) || '']));
      download(JSON.stringify(C.makeBackup(C.read(localStorage),drafts),null,2),'renaigame-lite-backup_'+new Date().toISOString().slice(0,10)+'.json');
      message('全物語のバックアップJSONを書き出しました。');
    }catch(error){ message(error.message,true); }
  });
  $('backupFile').addEventListener('change',()=>perform(async()=>{
    const file=$('backupFile').files[0]; if(!file) return;
    if(file.size>25*1024*1024) throw Error('バックアップが大きすぎます。');
    const backup=parse(await file.text()), next=C.mergeBackup(workspace,backup);
    for(const [id,text] of Object.entries(backup.drafts)) if(Object.hasOwn(next.saves,id) && localStorage.getItem(DRAFT+id)===null) localStorage.setItem(DRAFT+id,text);
    persist(next); render(); $('backupFile').value=''; message('バックアップを端末へ復元しました。');
  }));
  $('rawBackup').addEventListener('click',()=>download(localStorage.getItem(C.STORAGE_KEY) || '', 'renaigame-lite-recovery.json'));
  async function init(){
    try { workspace=C.read(localStorage); render(); }
    catch(error){ message(error.message,true); $('rawBackup').hidden=false; return; }
    try {
      const data=await json('characters.json?v=20261018'); catalog=data.characters;
      for(const character of catalog) $('character').append(option(character.id,character.name));
      const form=JSON.parse(localStorage.getItem(FORM) || '{}');
      for(const key of ['name','age','free','character']) if(typeof form[key]==='string') $(key).value=form[key];
      $('character').dispatchEvent(new Event('change'));
      message(current() ? '前回の物語を開きました。' : '主人公と男性の相手を設定して始められます。');
    }catch(error){ $('start').disabled=true; message('相手一覧を読み込めません。保存済みの物語とバックアップは利用できます。',true); }
    $('workspace').disabled=false;
  }
  init();
})();
