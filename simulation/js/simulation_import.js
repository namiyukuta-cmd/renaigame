(() => {
  'use strict';
  const scripts = new Map();
  function loadScript(path){
    if(!scripts.has(path)) scripts.set(path, new Promise((resolve,reject) => {
      const script = document.createElement('script'); script.src = path;
      script.onload = resolve; script.onerror = () => { scripts.delete(path); reject(new Error('検証設定を読み込めません。')); };
      document.head.appendChild(script);
    }));
    return scripts.get(path);
  }
  let active = null;
  function open(){
    if(active) return;
    const dialog = document.createElement('dialog'); dialog.className = 'simulation-slot-dialog';
    dialog.innerHTML = '<h2>章データを取り込んで保存</h2><p>AIが出したJSONファイルを選んでください。</p><input type="file" accept=".json,application/json" aria-label="章データJSON"><p class="import-status" role="status"></p><div class="import-preview"></div><button type="button" class="import-save" disabled>この章をGitHubへ保存</button><button type="button" class="simulation-slot-close">閉じる</button>';
    document.body.appendChild(dialog); active = dialog; dialog.showModal();
    const input = dialog.querySelector('input'), status = dialog.querySelector('.import-status'), details = dialog.querySelector('.import-preview'), save = dialog.querySelector('.import-save'), close = dialog.querySelector('.simulation-slot-close');
    let preview = null, busy = false, request = 0, savedResult = null;
    function dismiss(){ if(busy) return; ++request; dialog.close(); dialog.remove(); active = null; if(savedResult) location.reload(); }
    close.onclick = dismiss; dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    input.onchange = async () => {
      const current = ++request; preview = null; save.disabled = true; details.replaceChildren();
      const file = input.files[0]; if(!file) return;
      status.textContent = 'ファイルと保存先を確認しています…';
      try {
        if(file.size > 10 * 1024 * 1024) throw new Error('ファイルが大きすぎます。1章分のJSONを選んでください。');
        const data = JSON.parse(await file.text());
        if(!/^char_\d{3}$/.test(data.characterId || '')) throw new Error('恋愛相手IDがありません。');
        await Promise.all([loadScript('../js/renaigame_psychology_parameters.js'), loadScript('js/ai_turn_engine.js'), loadScript('js/simulation_character_' + data.characterId.slice(5) + '_behavior.js')]);
        if(!window.RenaiGameCharacters?.getById(data.characterId)) await window.RenaiGameCharacters?.loadAll();
        const result = await RenaiGameSave.prepareChapterImport(data);
        if(current !== request || active !== dialog) return;
        preview = result;
        const summary = document.createElement('p'); summary.textContent = result.protagonistName + ' ＋ ' + result.partnerName + '\nスロット ' + result.slotNumber + ' ／ Chapter ' + result.chapter;
        const body = document.createElement('details'), heading = document.createElement('summary'), text = document.createElement('pre');
        heading.textContent = '保存する本文を確認'; text.textContent = result.protagonist + '\n\n' + result.partner;
        body.append(heading,text); details.append(summary,body);
        status.textContent = result.alreadySaved ? 'この章は同じ内容で保存済みです。二重追加はしません。' : '心理計算と本文検証に合格しました。保存先をご確認ください。';
        save.disabled = result.alreadySaved;
      } catch(error){ if(current === request && active === dialog) status.textContent = error.message || 'JSONを読み込めません。'; }
    };
    save.onclick = async () => {
      if(!preview || busy) return; busy = true; input.disabled = true; close.disabled = true; save.disabled = true;
      status.textContent = 'GitHubへ保存しています…';
      try {
        savedResult = await RenaiGameSave.commitChapterImport(preview);
        localStorage.setItem('renaigame_simulation_profile_v1', JSON.stringify(savedResult.state.profile || {}));
        window.RenaiGameCharacters.setSelectedId(savedResult.state.selectedCharacterId);
        status.textContent = '本文・心理履歴・現在状態を保存し、再取得して確認しました。閉じるとこのセーブを表示します。'; preview = null;
      }
      catch(error){ status.textContent = error.message || '保存できませんでした。'; preview = null; status.textContent += ' JSONはそのまま残ります。ファイルを選び直して再確認してください。'; }
      finally { busy = false; input.disabled = false; input.value = ''; close.disabled = false; }
    };
  }
  window.RenaiGameImport = Object.freeze({ open });
})();
