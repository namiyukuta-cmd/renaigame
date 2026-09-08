(function(){
  const TOKEN_KEY = 'renaigame_github_token_v1';
  const SESSION_KEY = 'renaigame_simulation_session_v1';
  const CURRENT_SAVE_KEY = 'renaigame_simulation_current_save_id_v1';
  const CLOUD = {
    owner: 'namiyukuta-cmd',
    repo: 'private-game-data',
    legacyPath: 'renaigame/simulation/save.json',
    indexPath: 'renaigame/simulation/saves/index.json',
    savesDir: 'renaigame/simulation/saves'
  };

  const LEGACY_SAVE_ID = '__legacy__';
  const KNOWN_CHARACTER_NAMES = {
    char_001: 'アレクサンダー・クロス',
    char_002: 'エリオット・グレイ',
    char_003: 'フローリアン・ブレンナー'
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

  function getCurrentSaveId(){
    return localStorage.getItem(CURRENT_SAVE_KEY) || '';
  }

  function setCurrentSaveId(id){
    const value = String(id || '').trim();
    if(value) localStorage.setItem(CURRENT_SAVE_KEY, value);
    else localStorage.removeItem(CURRENT_SAVE_KEY);
    return value;
  }

  function clearCurrentSaveId(){
    localStorage.removeItem(CURRENT_SAVE_KEY);
  }

  function repoUrl(){
    return 'https://api.github.com/repos/' + encodeURIComponent(CLOUD.owner) + '/' + encodeURIComponent(CLOUD.repo);
  }

  function cloudUrl(path){
    const encodedPath = String(path || '').split('/').map(encodeURIComponent).join('/');
    return repoUrl() + '/contents/' + encodedPath;
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
      message = 'private-game-data を読めません。トークンのRepository accessを確認してください。';
    }else if(status === 403){
      message = 'GitHubの権限が足りません。private-game-data のContents権限を Read and write にしてください。';
    }
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async function fetchCloudFile(token, path){
    const response = await fetch(cloudUrl(path), { headers: headers(token) });
    if(!response.ok) throw githubError(response.status, 'から読み込み');
    return response.json();
  }

  async function checkToken(token){
    const value = cleanToken(token || getToken());
    if(!value) throw new Error('GitHubトークンが入力されていません。');
    const response = await fetch(repoUrl(), { headers: headers(value) });
    if(!response.ok) throw githubError(response.status, 'に接続');
    return { ok: true };
  }

  function parseCloudJson(file, errorMessage){
    try{
      return JSON.parse(decodeBase64Utf8(file.content));
    }catch(error){
      throw new Error(errorMessage || 'セーブデータを読み込めません。');
    }
  }

  async function fetchJsonIfExists(token, path){
    try{
      const file = await fetchCloudFile(token, path);
      return { exists: true, file, data: parseCloudJson(file) };
    }catch(error){
      if(error.status === 404) return { exists: false, file: null, data: null };
      throw error;
    }
  }

  async function putJson(token, path, data, message){
    let sha = '';
    try{
      const current = await fetchCloudFile(token, path);
      sha = current.sha || '';
    }catch(error){
      if(error.status !== 404) throw error;
    }

    const body = {
      message: message || 'Update romance simulation save',
      content: encodeBase64Utf8(JSON.stringify(data, null, 2))
    };
    if(sha) body.sha = sha;

    const response = await fetch(cloudUrl(path), {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers(token)),
      body: JSON.stringify(body)
    });
    if(!response.ok) throw githubError(response.status, 'へ保存');
    return response.json();
  }

  function normalizeObjectMap(value){
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function normalizeSession(value){
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      id: typeof source.id === 'string' && source.id ? source.id : 'run_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      recordsByCharacter: normalizeObjectMap(source.recordsByCharacter),
      statesByCharacter: normalizeObjectMap(source.statesByCharacter)
    };
  }

  function readLocalSession(){
    try{
      const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return value && typeof value === 'object' && !Array.isArray(value) ? normalizeSession(value) : null;
    }catch(_){
      return null;
    }
  }

  function makeSession(){
    return normalizeSession(null);
  }

  function ensureLocalSession(){
    let session = readLocalSession();
    if(!session){
      session = makeSession();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function applyLocalSession(save){
    const state = save && save.state;
    if(save && save.game === 'simulation' && state && state.session && typeof state.session === 'object'){
      localStorage.setItem(SESSION_KEY, JSON.stringify(normalizeSession(state.session)));
    }
  }

  function safeSaveId(id){
    return String(id || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
  }

  function savePath(id){
    return CLOUD.savesDir + '/' + safeSaveId(id) + '.json';
  }

  async function loadIndex(token){
    const result = await fetchJsonIfExists(token, CLOUD.indexPath);
    if(!result.exists) return { version: 1, saves: [] };
    const data = result.data;
    if(!data || typeof data !== 'object' || !Array.isArray(data.saves)) return { version: 1, saves: [] };
    return { version: Number(data.version) || 1, saves: data.saves };
  }

  async function writeIndex(token, index){
    return putJson(token, CLOUD.indexPath, index, 'Update romance simulation save index');
  }

  function getPartnerName(characterId){
    try{
      if(window.RenaiGameCharacters && typeof RenaiGameCharacters.getById === 'function'){
        const character = RenaiGameCharacters.getById(characterId);
        if(character && character.name) return character.name;
      }
    }catch(_){ }
    return KNOWN_CHARACTER_NAMES[characterId] || (characterId ? '恋愛相手' : '未選択');
  }

  function buildMeta(save, id, updatedAt){
    const state = save && save.state ? save.state : {};
    const profile = state.profile && typeof state.profile === 'object' ? state.profile : {};
    const protagonistName = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : '主人公';
    const selectedCharacterId = typeof state.selectedCharacterId === 'string' ? state.selectedCharacterId : '';
    const partnerName = save && save.meta && save.meta.partnerName
      ? save.meta.partnerName
      : getPartnerName(selectedCharacterId);
    return {
      id,
      protagonistName,
      partnerName,
      selectedCharacterId,
      updatedAt: updatedAt || (save && save.updatedAt) || '',
      page: (save && save.page) || 'simulation_new.html'
    };
  }

  async function listSaves(){
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');
    await checkToken(token);

    const index = await loadIndex(token);
    const result = index.saves
      .filter(item => item && typeof item.id === 'string' && item.id)
      .map(item => Object.assign({}, item));

    const legacy = await fetchJsonIfExists(token, CLOUD.legacyPath);
    if(legacy.exists && legacy.data && typeof legacy.data === 'object'){
      const meta = buildMeta(legacy.data, LEGACY_SAVE_ID, legacy.data.updatedAt || '');
      meta.legacy = true;
      result.push(meta);
    }

    result.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return result;
  }

  async function loadSaveById(id){
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');
    await checkToken(token);

    const path = id === LEGACY_SAVE_ID ? CLOUD.legacyPath : savePath(id);
    const file = await fetchCloudFile(token, path);
    const save = parseCloudJson(file, '恋愛シュミレーションのセーブデータを読み込めません。');
    if(!save || typeof save !== 'object' || Array.isArray(save)){
      throw new Error('恋愛シュミレーションのセーブデータを読み込めません。');
    }
    applyLocalSession(save);
    setCurrentSaveId(id);
    return save;
  }

  async function loadFromGitHub(){
    const currentId = getCurrentSaveId();
    if(currentId){
      return loadSaveById(currentId);
    }
    const saves = await listSaves();
    if(!saves.length) return { hasSave: false };
    return loadSaveById(saves[0].id);
  }

  async function saveToGitHub(save){
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');
    await checkToken(token);

    const prepared = Object.assign({}, save);
    const state = Object.assign({}, prepared.state || {});
    const session = ensureLocalSession();
    state.session = session;
    prepared.state = state;

    let saveId = getCurrentSaveId();
    if(!saveId) saveId = session.id || makeSession().id;

    const updatedAt = new Date().toISOString();
    const meta = buildMeta(prepared, saveId, updatedAt);
    const data = Object.assign({}, prepared, {
      version: Number(prepared && prepared.version) || 1,
      hasSave: true,
      saveId,
      updatedAt,
      meta
    });

    if(saveId === LEGACY_SAVE_ID){
      await putJson(token, CLOUD.legacyPath, data, 'Update romance simulation legacy save');
      setCurrentSaveId(LEGACY_SAVE_ID);
      return data;
    }

    await putJson(token, savePath(saveId), data, 'Update romance simulation save');

    const index = await loadIndex(token);
    const next = index.saves.filter(item => item && item.id !== saveId);
    next.push(meta);
    next.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    await writeIndex(token, { version: 1, saves: next });
    setCurrentSaveId(saveId);
    return data;
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
    SESSION_KEY,
    CURRENT_SAVE_KEY,
    LEGACY_SAVE_ID,
    CLOUD,
    getToken,
    setToken,
    clearToken,
    getCurrentSaveId,
    setCurrentSaveId,
    clearCurrentSaveId,
    checkToken,
    listSaves,
    loadSaveById,
    loadFromGitHub,
    saveToGitHub,
    isSafePage
  };
})();
