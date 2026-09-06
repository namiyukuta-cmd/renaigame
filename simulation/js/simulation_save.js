(function(){
  const TOKEN_KEY = 'renaigame_github_token_v1';
  const CLOUD = {
    owner: 'namiyukuta-cmd',
    repo: 'private-game-data',
    path: 'renaigame/simulation/save.json'
  };

  function cleanToken(token){
    return String(token || '').replace(/\s+/g, '');
  }

  function getToken(){
    return cleanToken(localStorage.getItem(TOKEN_KEY) || '');
  }

  function setToken(token){
    const value = cleanToken(token);
    if(value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
    return !!value;
  }

  function clearToken(){
    localStorage.removeItem(TOKEN_KEY);
  }

  function cloudUrl(){
    const path = CLOUD.path.split('/').map(encodeURIComponent).join('/');
    return 'https://api.github.com/repos/' + encodeURIComponent(CLOUD.owner) + '/' + encodeURIComponent(CLOUD.repo) + '/contents/' + path;
  }

  function headers(token){
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + cleanToken(token),
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function encodeBase64Utf8(text){
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for(let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function decodeBase64Utf8(text){
    const binary = atob(String(text || '').replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function githubError(status, action){
    let message = 'GitHub' + action + 'できませんでした (' + status + ')';
    if(status === 401){
      message = 'GitHubトークンが認証されませんでした。設定からトークンを入れ直してください。';
    }else if(status === 404){
      message = 'private-game-data の恋愛シュミレーション用セーブを読めません。トークンのRepository accessを確認してください。';
    }else if(status === 403){
      message = 'GitHubの権限が足りません。private-game-data のContents権限を Read and write にしてください。';
    }
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async function fetchCloudFile(token){
    const response = await fetch(cloudUrl(), { headers: headers(token) });
    if(!response.ok) throw githubError(response.status, 'から読み込み');
    return response.json();
  }

  async function checkToken(token){
    const value = cleanToken(token || getToken());
    if(!value) throw new Error('GitHubトークンが入力されていません。');
    const file = await fetchCloudFile(value);
    return { ok: true, sha: file.sha || '' };
  }

  async function loadFromGitHub(){
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');
    const file = await fetchCloudFile(token);
    let save;
    try{
      save = JSON.parse(decodeBase64Utf8(file.content));
    }catch(error){
      throw new Error('恋愛シュミレーションのセーブデータを読み込めません。');
    }
    if(!save || typeof save !== 'object' || Array.isArray(save)){
      throw new Error('恋愛シュミレーションのセーブデータを読み込めません。');
    }
    return save;
  }

  async function saveToGitHub(save){
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');

    let sha = '';
    try{
      const current = await fetchCloudFile(token);
      sha = current.sha || '';
    }catch(error){
      if(error.status !== 404) throw error;
    }

    const data = Object.assign({}, save, {
      version: Number(save && save.version) || 1,
      hasSave: true,
      updatedAt: new Date().toISOString()
    });

    const body = {
      message: 'Update romance simulation save',
      content: encodeBase64Utf8(JSON.stringify(data, null, 2))
    };
    if(sha) body.sha = sha;

    const response = await fetch(cloudUrl(), {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers(token)),
      body: JSON.stringify(body)
    });

    if(!response.ok) throw githubError(response.status, 'へ保存');
    return response.json();
  }

  function isSafePage(page){
    if(typeof page !== 'string' || !page) return false;
    if(page.includes('..')) return false;
    if(/^https?:/i.test(page)) return false;
    if(page.startsWith('//')) return false;
    return /^[A-Za-z0-9_./-]+\.html(?:[?#].*)?$/.test(page);
  }

  window.RenaiGameSave = {
    TOKEN_KEY,
    CLOUD,
    getToken,
    setToken,
    clearToken,
    checkToken,
    loadFromGitHub,
    saveToGitHub,
    isSafePage
  };
})();
