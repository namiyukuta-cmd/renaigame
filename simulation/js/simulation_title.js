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
      const save = await RenaiGameSave.loadFromGitHub();
      if(!save.hasSave || !save.page){
        setStatus('セーブデータはまだありません。', 'info');
        return;
      }
      if(!RenaiGameSave.isSafePage(save.page)){
        throw new Error('セーブデータの移動先が正しくありません。');
      }
      location.href = save.page;
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

  function init(){
    setText();
    $('startButton').addEventListener('click', () => {
      location.href = 'simulation_new.html';
    });
    $('continueButton').addEventListener('click', continueGame);
    $('settingsButton').addEventListener('click', () => openSettings());
    $('saveTokenButton').addEventListener('click', saveToken);
    $('deleteTokenButton').addEventListener('click', deleteToken);
    $('checkTokenButton').addEventListener('click', checkToken);
    $('closeSettingsButton').addEventListener('click', closeSettings);
    $('settingsDialog').addEventListener('click', event => {
      if(event.target === $('settingsDialog')) closeSettings();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
