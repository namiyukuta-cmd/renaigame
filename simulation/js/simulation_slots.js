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
      status.textContent = mode === 'save' ? '保存するスロットを選んでください。' : (saves.length ? '読み込むスロットを選んでください。' : 'セーブはまだありません。');
      function card(label, slot, newSlot){
        const button = document.createElement('button'); button.type = 'button'; button.className = 'simulation-slot-card';
        const heading = document.createElement('strong'); heading.textContent = label;
        button.appendChild(heading);
        if(slot){
          const info = document.createElement('span');
          const date = new Date(slot.updatedAt);
          info.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ja-JP');
          if(slot.id === RenaiGameSave.getCurrentSaveId()){
            button.classList.add('current'); info.textContent = '現在のスロット　' + info.textContent;
          }
          button.appendChild(info);
        }
        button.addEventListener('click', () => select(slot, newSlot)); list.appendChild(button);
      }
      if(mode === 'save') card('＋ 新しいスロットに保存', null, true);
      saves.forEach(slot => card((slot.protagonistName || '主人公') + ' ＋ ' + (slot.partnerName || '未選択'), slot, false));
    } catch(error) {
      if(active === dialog) { status.textContent = error.message || 'スロットを読み込めませんでした。'; status.dataset.error = 'true'; }
    }
  }
  window.RenaiGameSlots = Object.freeze({ open });
})();
