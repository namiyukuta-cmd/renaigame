(() => {
  'use strict';
  let active = null;
  async function open(mode, { readState, onLoaded }) {
    if(active) return;
    if(!RenaiGameSave.getToken()) { alert('タイトル画面の「設定」からGitHubトークンを設定してください。'); return; }
    const dialog = document.createElement('dialog');
    dialog.className = 'simulation-slot-dialog';
    dialog.setAttribute('aria-labelledby', 'simulationSlotTitle');
    const title = document.createElement('h2');
    title.id = 'simulationSlotTitle';
    title.textContent = mode === 'save' ? 'セーブ先を選ぶ' : 'ロードするスロットを選ぶ';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'スロットを読み込んでいます…';
    const list = document.createElement('div'); list.className = 'simulation-slot-list';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '閉じる'; close.className = 'simulation-slot-close';
    dialog.append(title, status, list, close); document.body.appendChild(dialog); active = dialog;
    let busy = false;
    function dismiss(){ if(busy) return; dialog.close(); dialog.remove(); active = null; }
    close.addEventListener('click', dismiss);
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    dialog.addEventListener('click', event => { if(event.target === dialog) dismiss(); });
    if(mode === 'save'){
      const importButton = document.createElement('button'); importButton.type = 'button'; importButton.className = 'simulation-slot-card'; importButton.textContent = '章データを取り込んで保存';
      dialog.insertBefore(importButton, status);
      importButton.addEventListener('click', () => { if(busy) return; dismiss(); window.dispatchEvent(new Event('renaigame:import-chapter')); });
    }
    dialog.showModal();
    function setBusy(value){ busy = value; close.disabled = value; list.querySelectorAll('button').forEach(button => { button.disabled = value; }); }
    async function select(slot, newSlot = false){
      if(busy) return;
      if(mode === 'save' && slot && slot.id !== RenaiGameSave.getCurrentSaveId()) {
        const name = (slot.protagonistName || '主人公') + ' ＋ ' + (slot.partnerName || '未選択');
        if(!confirm('「' + name + '」のスロットを、現在のゲーム内容に置き換えて保存しますか？')) return;
      }
      setBusy(true); status.textContent = mode === 'save' ? '保存しています…' : 'ロードしています…';
      try {
        if(mode === 'save'){
          await RenaiGameSave.saveToGitHub(readState(), newSlot ? { newSlot: true } : { targetId: slot.id });
          status.textContent = '選んだスロットにセーブしました。';
          busy = false; dismiss(); alert('セーブしました。');
        } else {
          const save = await RenaiGameSave.loadSaveById(slot.id);
          if(!save.hasSave || !RenaiGameSave.isSafePage(save.page)) throw new Error('このセーブを読み込めません。');
          onLoaded(save);
          busy = false; dismiss();
        }
      } catch(error) {
        status.textContent = error.message || '処理に失敗しました。'; status.dataset.error = 'true';
        setBusy(false);
      }
    }
    try {
      const saves = await RenaiGameSave.listSaves();
      if(active !== dialog) return;
      const groups = RenaiGameSave.groupSlots(saves);
      const currentState = mode === 'save' ? readState().state || {} : null;
      const currentMeta = currentState ? {
        protagonistName: currentState.profile?.name || '主人公',
        selectedCharacterId: currentState.selectedCharacterId || '',
        partnerName: RenaiGameSave.getPartnerName(currentState.selectedCharacterId)
      } : null;
      const currentPair = currentMeta ? RenaiGameSave.pairKey(currentMeta) : '';
      if(currentMeta && !groups.some(group => group.key === currentPair)) groups.unshift({ key: currentPair, ...currentMeta, slots: [] });
      function card(label, detail, action){
        const button = document.createElement('button'); button.type = 'button'; button.className = 'simulation-slot-card';
        const heading = document.createElement('strong'); heading.textContent = label; button.appendChild(heading);
        if(detail){ const info = document.createElement('span'); info.textContent = detail; button.appendChild(info); }
        button.addEventListener('click', action); list.appendChild(button);
        return button;
      }
      function showGroups(){
        list.replaceChildren();
        status.textContent = groups.length ? (mode === 'save' ? '現在の主人公と恋愛相手の組を選んでください。' : '主人公と恋愛相手の組を選んでください。') : 'セーブはまだありません。';
        groups.forEach(group => {
          const label = group.protagonistName + ' ＋ ' + group.partnerName;
          const button = card(label, group.slots.length + '個のスロット', () => showSlots(group));
          if(mode === 'save' && group.key !== currentPair){ button.disabled = true; button.children[1].textContent += '（別の組）'; }
        });
      }
      function showSlots(group){
        list.replaceChildren();
        status.textContent = group.protagonistName + ' ＋ ' + group.partnerName;
        card('← 組の一覧に戻る', '', showGroups);
        if(mode === 'save') card('＋ 新しいスロットに保存', '', () => select(null, true));
        group.slots.forEach(slot => {
          const date = new Date(slot.updatedAt);
          let detail = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ja-JP');
          const current = slot.id === RenaiGameSave.getCurrentSaveId();
          if(current) detail = '現在のスロット　' + detail;
          const button = card('スロット ' + slot.slotNumber, detail, () => select(slot, false));
          if(current) button.classList.add('current');
        });
      }
      showGroups();
    } catch(error) {
      if(active === dialog) { status.textContent = error.message || 'スロットを読み込めませんでした。'; status.dataset.error = 'true'; }
    }
  }
  window.RenaiGameSlots = Object.freeze({ open });
})();


