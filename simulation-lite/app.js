(() => {
  'use strict';
  const api=window.RenaiGameSave,C=window.RenaiGameLite,runtime=window.RenaiGameTurnRuntime,$=id=>document.getElementById(id);
  const DRAFT='renaigame_lite_input:',PENDING='renaigame_lite_import:',FORM='renaigame_lite_profile_form';
  const PROFILE='renaigame_simulation_profile_v1',SELECTED='renaigame_simulation_selected_character_v1';
  let active=null,catalog=[],slots=[],busy=false,filename,view='home';
  const menuPanels=['menuTitle','settings','loadPanel','setup','menuFooter'];
  const storyPanels=['play','reader','profilePanel','savePanel'];
  function showView(id,focus=false){
    if(id!=='home'&&!active){message('メニューから物語を開くか、新しく作ってください。');id='home';}
    view=id;
    for(const panel of menuPanels)$(panel).hidden=id!=='home';
    for(const panel of storyPanels)$(panel).hidden=panel!==id;
    const target=id==='home'?$('menuTitle'):$(id);
    if(target.tagName==='DETAILS')target.open=true;
    for(const anchor of document.querySelectorAll('.bottom-nav a')){
      if(anchor.getAttribute('href')==='#'+id)anchor.setAttribute('aria-current','page');else anchor.removeAttribute('aria-current');
    }
    if(focus){target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}
  }
  function message(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
  async function perform(action){
    if(busy)return;busy=true;$('workspace').disabled=true;
    try{await action();}catch(error){message(error.message||'処理できませんでした。入力は残っています。',true);}
    finally{busy=false;$('workspace').disabled=false;}
  }
  const recordId=save=>save.state.selectedCharacterId||'__unassigned__';
  const records=()=>active?.state.session.recordsByCharacter[recordId(active)]||[];
  const label=save=>(save.state.profile.name||'主人公')+' ＋ '+(save.meta?.partnerName||catalog.find(c=>c.id===save.state.selectedCharacterId)?.name||'相手未選択');
  function option(value,text){const e=document.createElement('option');e.value=value;e.textContent=text;return e;}
  function checkActive(){
    if(!active)throw Error('非公開セーブを開いてください。');
    const session=JSON.parse(localStorage.getItem(api.SESSION_KEY)||'null');
    if(api.getCurrentSaveId()!==active.saveId||!session||!C.equal(session.recordsByCharacter,active.state.session.recordsByCharacter)||!C.equal(session.statesByCharacter,active.state.session.statesByCharacter))throw Error('別の画面でセーブが切り替わりました。この物語を開き直してください。');
  }
  function renderSlots(){
    const selected=active?.saveId||$('stories').value;
    $('stories').replaceChildren(option('','セーブを選んでください'));
    for(const slot of slots)$('stories').append(option(slot.id,(slot.protagonistName||'主人公')+' ＋ '+(slot.partnerName||'相手未選択')+' ／ スロット '+slot.slotNumber));
    $('stories').value=selected||'';
  }
  function adopt(save){
    api.createCompactHandoff(save);const switched=active?.saveId!==save.saveId;active=save;
    localStorage.setItem(PROFILE,JSON.stringify(save.state.profile));
    if(save.state.selectedCharacterId)localStorage.setItem(SELECTED,save.state.selectedCharacterId);else localStorage.removeItem(SELECTED);
    if(!slots.some(s=>s.id===save.saveId))slots.unshift({...save.meta,id:save.saveId});
    else slots=slots.map(slot=>slot.id===save.saveId?{...slot,...save.meta}:slot);
    if(switched)view='play';renderSlots();render();
  }
  function render(){
    const shown=!!active;
    showView(shown?view:'home');
    $('setup').open=!shown;$('prompt').value='';$('chapterFile').value='';filename=undefined;
    if(!shown){$('storyInfo').textContent='保存した物語を選んで開いてください。';renderRecords();return;}
    $('pairName').textContent=label(active);
    $('storyInfo').textContent='現在：'+label(active)+' ／ 次はChapter '+(records().length+1);
    $('playInfo').textContent='次はChapter '+(records().length+1);
    $('draft').value=localStorage.getItem(DRAFT+active.saveId)||'';
    $('chapterJson').value=localStorage.getItem(PENDING+active.saveId)||'';
    for(const [id,key] of [['editName','name'],['editAge','age'],['editFree','free']])$(id).value=active.state.profile[key]||'';
    $('pages').replaceChildren();
    for(let start=0;start<records().length;start+=10)$('pages').append(option(String(start),'Chapter '+(start+1)+'〜'+Math.min(start+10,records().length)));
    $('pages').value=String(Math.floor(Math.max(0,records().length-1)/10)*10);renderRecords();
  }
  function renderRecords(){
    $('records').replaceChildren();
    if(!records().length){$('records').textContent='保存した章はまだありません。';return;}
    for(const record of records().slice(Number($('pages').value)||0,(Number($('pages').value)||0)+10)){
      const article=document.createElement('article'),heading=document.createElement('h3');article.className='record';heading.textContent=record.scene;article.append(heading);
      const parts=record.transcript?[['本文',record.transcript]]:[[active.state.profile.name||'主人公',record.protagonist],[active.meta.partnerName||'本文',record.partner||record.alexander]];
      for(const [title,text]of parts){if(!text)continue;const name=document.createElement('div'),body=document.createElement('p');name.className='record-label';name.textContent=title;body.className='prose';body.textContent=text;article.append(name,body);}
      $('records').append(article);
    }
  }
  async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('データを読み込めません：'+r.status);return r.json();}
  async function refreshSlots(){slots=await api.listSaves();renderSlots();}
  async function load(id){if(!id)throw Error('セーブを選んでください。');message('物語を開いています…');adopt(await api.loadSaveById(id));showView('play');message('物語を開きました。');}
  async function validationApi(characterId){
    const head=await json('https://api.github.com/repos/namiyukuta-cmd/renaigame/commits/main');
    if(!/^[0-9a-f]{40}$/i.test(head.sha||''))throw Error('検証用JSの取得元を確認できません。');
    const paths=characterId?runtime.sourcePaths(characterId):['js/renaigame_policy.js','simulation/js/character_settings_validator.js','simulation/js/ai_turn_engine.js'];
    paths.push('simulation/js/simulation_save.js');
    const sources=await Promise.all(paths.map(async path=>{
      const r=await fetch('https://raw.githubusercontent.com/namiyukuta-cmd/renaigame/'+head.sha+'/'+path);
      if(!r.ok)throw Error('検証用JSを取得できません：'+path);return [path,await r.text()];
    }));
    const scope={};
    for(const [path,source]of sources){
      // Only pinned repository JavaScript is evaluated. Story, profile, chapter
      // JSON and private saves are data and never executable source.
      new Function('window','globalThis','module','require',runtime.sourceText(source,path))(scope,scope,undefined,undefined);
    }
    return scope.RenaiGameSave;
  }
  $('connect').addEventListener('click',()=>perform(async()=>{
    const token=$('token').value.trim();if(!token&&!api.getToken())throw Error('GitHubトークンを入力してください。');
    await api.checkToken(token||api.getToken());if(token)api.setToken(token);$('token').value='';$('settings').open=false;
    await refreshSlots();if(api.getCurrentSaveId())await load(api.getCurrentSaveId());else message('非公開セーブに接続しました。物語を開くか、新しく作れます。');
  }));
  $('refresh').addEventListener('click',()=>perform(async()=>{await refreshSlots();message('非公開セーブの一覧を更新しました。');}));
  $('loadButton').addEventListener('click',()=>perform(()=>load($('stories').value)));
  $('reloadSaved').addEventListener('click',()=>perform(()=>load(active?.saveId)));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible'||!active||busy||!api.getToken())return;
    return perform(async()=>{
      const id=active.saveId,count=records().length,keys=[['editName','name'],['editAge','age'],['editFree','free']];
      const edits=keys.filter(([field,key])=>$(field).value!==(active.state.profile[key]||'')).map(([field])=>[field,$(field).value]);
      const saved=await api.loadSaveById(id),all=saved.state.session.recordsByCharacter[recordId(saved)]||[];
      const draft=localStorage.getItem(DRAFT+id);
      if(draft&&all.slice(count).some(record=>record.protagonist===draft))localStorage.removeItem(DRAFT+id);
      adopt(saved);for(const [field,value]of edits)$(field).value=value;
      message(all.length>count?'AIが保存した最新の物語を読み込みました。':'非公開セーブを確認しました。');
    });
  });
  const formKeys=['name','age','free','character'];
  for(const id of formKeys)$(id).addEventListener('input',()=>{try{localStorage.setItem(FORM,JSON.stringify(Object.fromEntries(formKeys.map(key=>[key,$(key).value]))));}catch(error){message(error.message,true);}});
  $('character').addEventListener('change',()=>{const c=catalog.find(c=>c.id===$('character').value);$('characterInfo').textContent=c?[c.age?c.age+'歳':'',c.occupation].filter(Boolean).join(' ／ '):'世界設定に沿って始めます。相手未選択の章では心理数値を作りません。';});
  $('start').addEventListener('click',()=>perform(async()=>{
    if(!api.getToken()){showView('home');$('settings').open=true;throw Error('非公開セーブへの接続を設定してください。');}
    const characterId=$('character').value||null,character=catalog.find(c=>c.id===characterId);
    if(characterId&&!character)throw Error('相手一覧を読み直してください。');
    const save={version:2,game:'simulation',page:'simulation_new.html',meta:{partnerName:character?.name||'恋愛相手未選択'},state:{profile:{name:$('name').value,age:$('age').value,free:$('free').value},selectedCharacterId:characterId}};
    message('新しい物語を非公開で保存しています…');adopt(await api.saveToGitHub(save,{newSlot:true,freshStart:true}));message('新しい物語を非公開で保存しました。');
  }));
  $('draft').addEventListener('input',()=>{try{if(active)localStorage.setItem(DRAFT+active.saveId,$('draft').value);$('prompt').value='';}catch(error){message(error.message,true);}});
  function handoff(){checkActive();return C.buildPrompt(active,$('draft').value,api);}
  $('copy').addEventListener('click',async()=>{
    try{
      $('prompt').value=handoff();$('handoff').open=true;$('prompt').focus();$('prompt').select();$('prompt').setSelectionRange(0,$('prompt').value.length);
      let copied=false;try{copied=document.execCommand?.('copy');}catch{}
      if(!copied){try{await navigator.clipboard.writeText($('prompt').value);copied=true;}catch{}}
      if(copied){$('handoff').open=false;$('copy').focus({preventScroll:true});message('コピーしました。ChatGPTへ貼り付けてください。');}else message('引き継ぎ文を選択しました。長押ししてコピーしてください。');
    }catch(error){message(error.message,true);}
  });
  $('handoff').addEventListener('toggle',()=>{if($('handoff').open&&!$('prompt').value)try{$('prompt').value=handoff();}catch(error){message(error.message,true);}});
  $('chapterJson').addEventListener('input',()=>{filename=undefined;try{if(active)localStorage.setItem(PENDING+active.saveId,$('chapterJson').value);}catch(error){message(error.message,true);}});
  $('chapterFile').addEventListener('change',()=>perform(async()=>{
    checkActive();const file=$('chapterFile').files[0];if(!file)return;if(file.size>10*1024*1024)throw Error('JSONが大きすぎます。1章分だけを指定してください。');
    const text=await file.text();C.parseChapter(text);filename=file.name;$('chapterJson').value=text;localStorage.setItem(PENDING+active.saveId,text);message('章JSONを読み込みました。「検証して非公開に保存」を押してください。');
  }));
  $('saveChapter').addEventListener('click',()=>perform(async()=>{
    checkActive();const id=active.saveId,source=$('chapterJson').value,bundle=C.parseChapter(source);
    if(bundle.saveId!==id||(bundle.characterId||null)!==(active.state.selectedCharacterId||null))throw Error('現在開いている物語の章JSONを指定してください。');
    message('心理計算と本文を検証して、非公開で保存しています…');
    const validator=await validationApi(bundle.characterId);
    if(bundle.version===2)validator.assertChapterBundleV2(bundle,filename);
    const preview=await validator.prepareChapterImport(bundle);checkActive();
    const saved=preview.alreadySaved?await api.loadSaveById(id):await validator.commitChapterImport(preview);
    if(localStorage.getItem(DRAFT+id)===preview.protagonist)localStorage.removeItem(DRAFT+id);
    if(localStorage.getItem(PENDING+id)===source)localStorage.removeItem(PENDING+id);
    adopt(saved);showView('reader');
    message('Chapter '+preview.chapter+(preview.alreadySaved?'は非公開で保存済みです。':'を非公開で保存し、再取得して確認しました。')+(preview.unverifiedDraft?' 心理計算のない未選択章です。':''));
  }));
  $('saveProfile').addEventListener('click',()=>perform(async()=>{
    checkActive();const save=C.clone(active);save.state.profile={...save.state.profile,name:$('editName').value,age:$('editAge').value,free:$('editFree').value};
    message('プロフィールを非公開で保存しています…');adopt(await api.saveToGitHub(save));message('プロフィールを非公開で保存しました。');
  }));
  $('pages').addEventListener('change',renderRecords);
  for(const anchor of document.querySelectorAll('.bottom-nav a'))anchor.addEventListener('click',event=>{
    event.preventDefault();if(busy)return;showView(anchor.getAttribute('href').slice(1),true);
  });
  async function init(){
    render();
    try{
      const form=JSON.parse(localStorage.getItem(FORM)||'{}');for(const key of formKeys)if(typeof form[key]==='string')$(key).value=form[key];
      const data=await json('../simulation-lite/characters.json?v=20261020-char022-akimori');catalog=data.characters;
      for(const c of catalog)$('character').append(option(c.id,c.name));if(typeof form.character==='string')$('character').value=form.character;
    }catch(error){message('相手一覧を読み込めません。既存のセーブはロードできます。',true);}
    if(api.getToken()){
      const results=await Promise.allSettled([refreshSlots(),api.getCurrentSaveId()?load(api.getCurrentSaveId()):Promise.resolve()]);
      const failure=results.find(r=>r.status==='rejected');if(failure)message(failure.reason.message,true);else if(!active)message('非公開セーブから物語を選べます。');
    }else{$('settings').open=true;message('初回のみ接続が必要です。接続すると、物語を開くか新しく作れます。');}
    $('workspace').disabled=false;
  }
  init().catch(error=>{message(error.message,true);$('workspace').disabled=false;});
})();
