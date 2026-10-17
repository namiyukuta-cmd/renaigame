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
        // Reload stale import code before using the strict standard v2 check.
        if(data.characterId != null && data.version === 2 &&
           typeof window.RenaiGameSave?.assertChapterBundleV2 !== 'function'){
          await loadScript('js/simulation_save.js?v=20261017-standard-v2');
        }
        if(data.characterId != null && data.version === 2 &&
           typeof window.RenaiGameSave?.assertChapterBundleV2 !== 'function'){
          throw new Error('旧版の取り込み処理が残っています。画面を再読み込みしてからJSONを選び直してください。');
        }
        if(data.characterId != null && !/^char_\d{3}$/.test(data.characterId || '')) throw new Error('恋愛相手IDがありません。');
        if(!window.RenaiGameCharacterSettings || typeof window.RenaiGameCharacterSettings.inspect !== 'function') await loadScript('js/character_settings_validator.js?v=20261015-validator-bootstrap-v2');
        if(!window.RenaiGameCharacterSettings || typeof window.RenaiGameCharacterSettings.inspect !== 'function') throw new Error('人物設定の検証JSが有効になっていません。最新版のゲーム画面を開いてください。');
        if(!window.RenaiGameTurnEngine || typeof window.RenaiGameTurnEngine.validateChapterHeader !== 'function') await loadScript('js/ai_turn_engine.js?v=20261017-chapter-header');
        if(!window.RenaiGameTurnEngine || typeof window.RenaiGameTurnEngine.verifyTurn !== 'function') throw new Error('心理JSの実行器が有効になっていません。最新版のゲーム画面を開いてください。');
        if(data.characterId != null) await Promise.all([loadScript('../js/renaigame_psychology_parameters.js'), loadScript('js/simulation_character_' + data.characterId.slice(5) + '_behavior.js')]);
        if(!window.RenaiGameCharacters?.getById(data.characterId)) await window.RenaiGameCharacters?.loadAll();
        const result = await RenaiGameSave.prepareChapterImport(data);
        if(current !== request || active !== dialog) return;
        preview = result;
        const summary = document.createElement('p'); summary.textContent = result.protagonistName + ' ＋ ' + result.partnerName + '\nスロット ' + result.slotNumber + ' ／ Chapter ' + result.chapter;
        const body = document.createElement('details'), heading = document.createElement('summary'), text = document.createElement('pre');
        heading.textContent = '保存する本文を確認'; text.textContent = result.protagonist + '\n\n' + result.partner;
        body.append(heading,text); details.append(summary,body);
        status.textContent = result.unverifiedDraft ? (result.alreadySaved ? 'この本文は保存済みです。心理計算は行っていません。' : '恋愛相手未選択の本文を保存します。心理計算・本文検証は行っていません。') : result.alreadySaved ? 'この章は同じ内容でGitHubに保存済みです。下のボタンでゲーム画面にも反映できます。' : '心理計算と本文検証に合格しました。保存先をご確認ください。';
        save.textContent = result.alreadySaved ? '保存済みデータをゲームに反映' : 'この章をGitHubへ保存';
        save.disabled = false;
      } catch(error){ if(current === request && active === dialog) status.textContent = error.message || 'JSONを読み込めません。'; }
    };
    save.onclick = async () => {
      if(!preview || busy) return; busy = true; input.disabled = true; close.disabled = true; save.disabled = true;
      status.textContent = 'GitHubへ保存しています…';
      try {
        savedResult = preview.alreadySaved ? await RenaiGameSave.loadSaveById(preview.saveId) : await RenaiGameSave.commitChapterImport(preview);
        localStorage.setItem('renaigame_simulation_profile_v1', JSON.stringify(savedResult.state.profile || {}));
        if(savedResult.state.selectedCharacterId) window.RenaiGameCharacters.setSelectedId(savedResult.state.selectedCharacterId);
        else window.RenaiGameCharacters.clearSelected();
        status.textContent = preview.unverifiedDraft ? '本文を保存し、再取得して確認しました。心理状態は未作成です。閉じると記録に表示します。' : '本文・心理履歴・現在状態を保存し、再取得して確認しました。閉じるとこのセーブを表示します。'; preview = null;
      }
      catch(error){ status.textContent = error.message || '保存できませんでした。'; preview = null; status.textContent += ' JSONはそのまま残ります。ファイルを選び直して再確認してください。'; }
      finally { busy = false; input.disabled = false; input.value = ''; close.disabled = false; }
    };
  }
  window.RenaiGameImport = Object.freeze({ open });
})();


