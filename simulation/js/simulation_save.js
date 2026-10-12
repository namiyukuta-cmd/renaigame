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
    char_003: 'フローリアン・ブレンナー',
    char_004: 'マテオ・ルッソ'
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
      statesByCharacter: normalizeObjectMap(source.statesByCharacter),
      ...(source.archive ? { archive: source.archive } : {})
    };
  }

  function recordKey(entry){
    if(!entry || typeof entry !== 'object') return String(entry || '');
    return JSON.stringify([
      entry.scene || '',
      entry.date || '',
      entry.protagonist || '',
      entry.partner || entry.alexander || '',
      entry.transcript || '',
      entry.summary || ''
    ]);
  }

  function mergeRecordArrays(remoteRecords, localRecords){
    const merged = [];
    const seen = new Set();
    [remoteRecords, localRecords].forEach(list => {
      if(!Array.isArray(list)) return;
      list.forEach(entry => {
        const key = recordKey(entry);
        if(entry && entry.__chapterRef) return;
        if(seen.has(key)) return;
        seen.add(key);
        merged.push(entry);
      });
    });
    return merged;
  }

  function mergeSessions(remoteValue, localValue){
    const remote = normalizeSession(remoteValue);
    const local = normalizeSession(localValue);
    const recordsByCharacter = {};
    const statesByCharacter = Object.assign({}, local.statesByCharacter, remote.statesByCharacter);
    const characterIds = new Set([
      ...Object.keys(remote.recordsByCharacter),
      ...Object.keys(local.recordsByCharacter)
    ]);

    characterIds.forEach(characterId => {
      recordsByCharacter[characterId] = mergeRecordArrays(
        remote.recordsByCharacter[characterId],
        local.recordsByCharacter[characterId]
      );
    });

    return {
      id: local.id || remote.id,
      recordsByCharacter,
      statesByCharacter
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


  // The manifest stays small. A chapter bundle retains original objects verbatim.
  function isSplit(save){ return !!(save && save.storage && save.storage.format === 'chapter-files-v1'); }
  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function chapterNumber(entry, index){
    const match = String(entry.scene || '').match(/Chapter\s*(\d+)/i);
    return match ? Number(match[1]) : (Number(entry.turn) > 0 ? Number(entry.turn) : index + 1);
  }
  function splitSave(source){
    const save = clone(source);
    const session = save.state.session;
    delete session.archive;
    const bundles = [];
    const characters = {};
    const ids = new Set([...Object.keys(session.recordsByCharacter || {}), ...Object.keys(session.statesByCharacter || {})]);
    ids.forEach(id => {
      if(!/^char_\d{3}$/.test(id)) throw new Error('攻略対象IDが正しくありません。');
      const groups = new Map();
      const refs = characters[id] = { records: [], history: [] };
      function add(kind, entry, index){
        const chapter = chapterNumber(entry, index);
        const path = CLOUD.savesDir + '/' + safeSaveId(save.saveId) + '/chapters/' + id + '_' + String(chapter).padStart(4, '0') + '.json';
        if(!groups.has(path)) groups.set(path, { path, data: { version: 1, saveId: save.saveId, characterId: id, chapter, records: [], stateHistory: [] } });
        const bundle = groups.get(path);
        bundle.data[kind].push({ index, entry });
        const ref = { path, index, chapter };
        if(kind === 'records'){
          ref.scene = entry.scene || ''; ref.date = entry.date || '';
          refs.records.push(ref);
        }else refs.history.push(ref);
      }
      (session.recordsByCharacter[id] || []).forEach((entry, index) => add('records', entry, index));
      const state = session.statesByCharacter[id];
      if(state && Array.isArray(state.stateHistory)){
        state.stateHistory.forEach((entry, index) => add('stateHistory', entry, index));
        state.stateHistory = [];
      }
      session.recordsByCharacter[id] = [];
      refs.lastSavedChapter = Math.max(0, ...refs.records.map(ref => ref.chapter));
      bundles.push(...groups.values());
    });
    save.storage = { format: 'chapter-files-v1', characters };
    return { manifest: save, bundles };
  }
  function checkRef(save, id, ref){
    const prefix = CLOUD.savesDir + '/' + safeSaveId(save.saveId) + '/chapters/' + id + '_';
    if(typeof ref.path !== 'string' || !ref.path.startsWith(prefix) || !/^[A-Za-z0-9_/-]+\.json$/.test(ref.path) || ref.path.includes('..')) throw new Error('章の保存先が正しくありません。');
  }
  async function readBundle(token, save, id, ref, cache){
    checkRef(save, id, ref);
    if(!cache.has(ref.path)) cache.set(ref.path, fetchCloudFile(token, ref.path).then(file => parseCloudJson(file)));
    const bundle = await cache.get(ref.path);
    if(bundle.saveId !== save.saveId || bundle.characterId !== id || bundle.chapter !== ref.chapter) throw new Error('章の識別情報が一致しません。');
    return bundle;
  }
  async function hydrateSave(token, source){
    if(!isSplit(source)) return source;
    const save = clone(source), cache = new Map();
    for(const [id, refs] of Object.entries(save.storage.characters)){
      const records = [];
      for(const ref of refs.records){
        const bundle = await readBundle(token, save, id, ref, cache);
        const item = bundle.records.find(item => item.index === ref.index);
        if(!item) throw new Error('章本文が不足しています。');
        records[ref.index] = item.entry;
      }
      save.state.session.recordsByCharacter[id] = records;
      if(refs.history.length){
        const history = [];
        for(const ref of refs.history){
          const bundle = await readBundle(token, save, id, ref, cache);
          const item = bundle.stateHistory.find(item => item.index === ref.index);
          if(!item) throw new Error('心理履歴が不足しています。');
          history[ref.index] = item.entry;
        }
        save.state.session.statesByCharacter[id].stateHistory = history;
      }
    }
    delete save.storage;
    return save;
  }
  function lazySave(source){
    if(!isSplit(source)) return source;
    const save = clone(source), session = save.state.session;
    session.archive = { saveId: save.saveId, storage: save.storage };
    for(const [id, refs] of Object.entries(save.storage.characters)){
      session.recordsByCharacter[id] = refs.records.map(ref => ({ scene: ref.scene, date: ref.date, __chapterRef: ref }));
    }
    return save;
  }
  async function loadRecordPage(characterId, chapters){
    const session = ensureLocalSession();
    if(!session.archive) return session.recordsByCharacter[characterId] || [];
    const source = { saveId: session.archive.saveId, storage: session.archive.storage };
    const records = session.recordsByCharacter[characterId] || [];
    const cache = new Map();
    // Read only the selected page; commit the cache only after all reads succeed.
    const updates = await Promise.all(records.map(async (entry, index) => {
      if(!entry.__chapterRef || !chapters.includes(entry.__chapterRef.chapter)) return null;
      const bundle = await readBundle(getToken(), source, characterId, entry.__chapterRef, cache);
      const item = bundle.records.find(item => item.index === entry.__chapterRef.index);
      if(!item) throw new Error('章本文が不足しています。');
      return { index, entry: item.entry };
    }));
    // A load/navigation in another tab must not overwrite a different session.
    const fresh = ensureLocalSession();
    if(fresh.id !== session.id || fresh.archive?.saveId !== source.saveId) throw new Error('セーブが切り替わりました。記録を開き直してください。');
    updates.filter(Boolean).forEach(item => { fresh.recordsByCharacter[characterId][item.index] = item.entry; });
    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
    return fresh.recordsByCharacter[characterId];
  }
  async function githubJson(token, path, method = 'GET', body){
    const response = await fetch(repoUrl() + '/' + path, {
      method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers(token)),
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if(!response.ok) throw githubError(response.status, method === 'GET' ? 'から読み込み' : 'へ保存');
    return response.json();
  }
  async function commitFiles(token, files, expectedHead){
    const branch = (await githubJson(token, '')).default_branch;
    const refPath = 'git/ref/heads/' + encodeURIComponent(branch);
    const head = (await githubJson(token, refPath)).object.sha;
    if(expectedHead && head !== expectedHead) throw new Error('別の保存で更新されました。ロードしてから再度保存してください。');
    const commit = await githubJson(token, 'git/commits/' + head);
    const tree = await githubJson(token, 'git/trees', 'POST', { base_tree: commit.tree.sha, tree: files.map(file => ({ path: file.path, mode: '100644', type: 'blob', content: JSON.stringify(file.data, null, 2) })) });
    const next = await githubJson(token, 'git/commits', 'POST', { message: 'Save simulation chapters and current state together', tree: tree.sha, parents: [head] });
    // Non-forced update rejects a concurrent save instead of overwriting it.
    await githubJson(token, 'git/refs/heads/' + encodeURIComponent(branch), 'PATCH', { sha: next.sha, force: false });
    return next.sha;
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
    let save = parseCloudJson(file, '恋愛シュミレーションのセーブデータを読み込めません。');
    if(!save || typeof save !== 'object' || Array.isArray(save)){
      throw new Error('恋愛シュミレーションのセーブデータを読み込めません。');
    }
    if(isSplit(save) && save.saveId !== id) throw new Error('セーブIDが一致しません。');
    save = lazySave(save);
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
    const localSession = ensureLocalSession();

    let saveId = getCurrentSaveId();
    if(!saveId) saveId = localSession.id || makeSession().id;

    const branch = (await githubJson(token, '')).default_branch;
    const expectedHead = (await githubJson(token, 'git/ref/heads/' + encodeURIComponent(branch))).object.sha;
    const path = saveId === LEGACY_SAVE_ID ? CLOUD.legacyPath : savePath(saveId);
    const existing = await fetchJsonIfExists(token, path);
    const remoteSave = existing.exists ? await hydrateSave(token, existing.data) : null;
    const remoteSession = existing.exists && existing.data && existing.data.state
      ? remoteSave.state.session
      : null;

    const mergedSession = remoteSession
      ? mergeSessions(remoteSession, localSession)
      : normalizeSession(localSession);

    const preservedState = Object.assign({}, remoteSave && remoteSave.state || {}, state);
    preservedState.session = mergedSession;
    prepared.state = preservedState;
    const updatedAt = new Date().toISOString();
    const meta = buildMeta(prepared, saveId, updatedAt);
    const data = Object.assign({}, remoteSave || {}, prepared, {
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

    const index = await loadIndex(token);
    const next = index.saves.filter(item => item && item.id !== saveId);
    next.push(meta);
    next.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const split = splitSave(data);
    const oldBundles = remoteSave ? splitSave(remoteSave).bundles : [];
    const oldMap = new Map(oldBundles.map(file => [file.path, JSON.stringify(file.data)]));
    const files = split.bundles.filter(file => oldMap.get(file.path) !== JSON.stringify(file.data) || !isSplit(existing.data));
    files.push({ path: savePath(saveId), data: split.manifest }, { path: CLOUD.indexPath, data: { version: 1, saves: next } });
    await commitFiles(token, files, expectedHead);
    const confirmed = parseCloudJson(await fetchCloudFile(token, savePath(saveId)));
    if(JSON.stringify(confirmed) !== JSON.stringify(split.manifest)) throw new Error('保存の確認ができませんでした。ロードして確認してください。');
    applyLocalSession(lazySave(split.manifest));
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
    isSafePage,
    loadRecordPage,
    splitSave,
    hydrateSave,
    isSplit
  };
})();

