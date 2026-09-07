(function(){
  const TEXT = {
    title: '恋愛シュミレーション',
    start: '始めから',
    continue: '続きから',
    settings: '設定',
    settingsTitle: '設定',
    tokenLabel: 'GitHubトークン',
    tokenSave: '保存',
    tokenDelete: '削除',
    tokenCheck: '接続確認',
    close: '閉じる'
  };

  const PROFILE_KEY = 'renaigame_simulation_profile_v1';
  const SELECTED_CHARACTER_KEY = 'renaigame_simulation_selected_character_v1';
  const SESSION_KEY = 'renaigame_simulation_session_v1';
  const $ = id => document.getElementById(id);

  function setText(){
    $('titleText').textContent = TEXT.title;
    $('startButton').textContent = TEXT.start;
    $('continueButton').textContent = TEXT.continue;
    $('settingsButton').textContent = TEXT.settings;
    $('settingsTitle').textContent = TEXT.settingsTitle;
    $('tokenLabel').textContent = TEXT.tokenLabel;
    $('saveTokenButton').textContent = TEXT.tokenSave;
    $('deleteTokenButton').textContent = TEXT.tokenDelete;
    $('checkTokenButton').textContent = TEXT.tokenCheck;
    $('closeSettingsButton').textContent = TEXT.close;
  }

  function setStatus(message, kind){
    const el = $('statusText');
    el.textContent = message || '';
    el.dataset.kind = kind || '';
  }

  function setSettingsStatus(message, kind){
    const el = $('settingsStatus');
    el.textContent = message || '';
    el.dataset.kind = kind || '';
  }

  function openSettings(message){
    const dialog = $('settingsDialog');
    $('tokenInput').value = RenaiGameSave.getToken();
    setSettingsStatus(message || '', message ? 'error' : '');
    if(typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeSettings(){
    const dialog = $('settingsDialog');
    if(typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function openLoadDialog(){
    const dialog = $('loadDialog');
    if(typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeLoadDialog(){
    const dialog = $('loadDialog');
    if(typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function newSession(){
    return {
      id: 'run_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      recordsByCharacter: {}
    };
  }

  function applyLoadedState(save){
    const state = save && save.state ? save.state : {};

    if(state.profile && typeof state.profile === 'object'){
      localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
    }else{
      localStorage.removeItem(PROFILE_KEY);
    }

    if(state.selectedCharacterId){
      localStorage.setItem(SELECTED_CHARACTER_KEY, state.selectedCharacterId);
    }else{
      localStorage.removeItem(SELECTED_CHARACTER_KEY);
    }

    if(state.session && typeof state.session === 'object'){
      localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
    }else{
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession()));
    }
  }

  function formatDate(value){
    if(!value) return '';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function loadSelectedSave(id, button){
    setStatus('', '');
    button.disabled = true;
    try{
      const save = await RenaiGameSave.loadSaveById(id);
      if(!save.hasSave || !save.page){
        throw new Error('このセーブデータを読み込めません。');
      }
      if(!RenaiGameSave.isSafePage(save.page)){
        throw new Error('セーブデータの移動先が正しくありません。');
      }
      applyLoadedState(save);
      location.href = save.page;
    }catch(error){
      button.disabled = false;
      setStatus(error.message || 'セーブデータを読み込めませんでした。', 'error');
      closeLoadDialog();
    }
  }

  function renderSaveList(saves){
    const list = $('loadList');
    list.innerHTML = '';

    if(!saves.length){
      const empty = document.createElement('div');
      empty.className = 'load-empty';
      empty.textContent = 'セーブデータはまだありません。';
      list.appendChild(empty);
      return;
    }

    saves.forEach(save => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'save-card';

      const title = document.createElement('span');
      title.className = 'save-card-title';
      const protagonist = save.protagonistName || '主人公';
      const partner = save.partnerName || '未選択';
      title.textContent = protagonist + ' ＋ ' + partner;

      const date = document.createElement('span');
      date.className = 'save-card-date';
      date.textContent = formatDate(save.updatedAt);

      button.appendChild(title);
      if(date.textContent) button.appendChild(date);
      button.addEventListener('click', () => loadSelectedSave(save.id, button));
      list.appendChild(button);
    });
  }

  async function continueGame(){
    setStatus('', '');
    if(!RenaiGameSave.getToken()){
      openSettings('「続きから」を使うにはGitHubトークンを設定してください。');
      return;
    }

    const button = $('continueButton');
    button.disabled = true;
    setStatus('セーブデータを読み込んでいます…', 'loading');

    try{
      const saves = await RenaiGameSave.listSaves();
      renderSaveList(saves);
      setStatus('', '');
      openLoadDialog();
    }catch(error){
      setStatus(error.message || 'セーブデータを読み込めませんでした。', 'error');
    }finally{
      button.disabled = false;
    }
  }

  function saveToken(){
    const token = $('tokenInput').value;
    if(!RenaiGameSave.setToken(token)){
      setSettingsStatus('GitHubトークンを入力してください。', 'error');
      return;
    }
    setSettingsStatus('この端末にトークンを保存しました。', 'success');
  }

  function deleteToken(){
    RenaiGameSave.clearToken();
    $('tokenInput').value = '';
    setSettingsStatus('保存していたトークンを削除しました。', 'info');
  }

  async function checkToken(){
    const token = $('tokenInput').value;
    if(token) RenaiGameSave.setToken(token);
    const button = $('checkTokenButton');
    button.disabled = true;
    setSettingsStatus('GitHubに接続しています…', 'loading');
    try{
      await RenaiGameSave.checkToken();
      setSettingsStatus('private-game-data に接続できました。', 'success');
    }catch(error){
      setSettingsStatus(error.message || 'GitHubに接続できませんでした。', 'error');
    }finally{
      button.disabled = false;
    }
  }

  function startNewGame(){
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(SELECTED_CHARACTER_KEY);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession()));
    RenaiGameSave.clearCurrentSaveId();
    location.href = 'simulation_new.html';
  }

  function init(){
    setText();
    $('startButton').addEventListener('click', startNewGame);
    $('continueButton').addEventListener('click', continueGame);
    $('settingsButton').addEventListener('click', () => openSettings());
    $('saveTokenButton').addEventListener('click', saveToken);
    $('deleteTokenButton').addEventListener('click', deleteToken);
    $('checkTokenButton').addEventListener('click', checkToken);
    $('closeSettingsButton').addEventListener('click', closeSettings);
    $('closeLoadButton').addEventListener('click', closeLoadDialog);
    $('settingsDialog').addEventListener('click', event => {
      if(event.target === $('settingsDialog')) closeSettings();
    });
    $('loadDialog').addEventListener('click', event => {
      if(event.target === $('loadDialog')) closeLoadDialog();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
