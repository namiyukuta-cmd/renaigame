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

  async function fetchCloudFile(token, path, ref){
    const url = cloudUrl(path) + (ref ? '?ref=' + encodeURIComponent(ref) : '');
    const response = await fetch(url, { headers: headers(token), cache: 'no-store' });
    if(!response.ok) throw githubError(response.status, 'から読み込み');
    const file = await response.json();
    // Contents API omits content for large JSON files. Read the exact blob.
    if(!file.content && file.sha && file.type !== 'dir'){
      const blob = await githubJson(token, 'git/blobs/' + file.sha);
      return Object.assign({}, file, { content: blob.content, encoding: blob.encoding });
    }
    return file;
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

  async function fetchJsonIfExists(token, path, ref){
    try{
      const file = await fetchCloudFile(token, path, ref);
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
    const url = path ? repoUrl() + '/' + path : repoUrl();
    const response = await fetch(url, {
      cache: 'no-store',
      method, headers: body === undefined ? headers(token) : Object.assign({ 'Content-Type': 'application/json' }, headers(token)),
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
    const tree = await githubJson(token, 'git/trees', 'POST', { base_tree: commit.tree.sha, tree: files.map(file => ({ path: file.path, mode: '100644', type: 'blob', ...(file.delete ? { sha: null } : { content: JSON.stringify(file.data, null, 2) }) })) });
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

  function pairKey(meta){
    return JSON.stringify([String(meta.protagonistName || '主人公').trim() || '主人公', meta.selectedCharacterId || '']);
  }

  function numberSlots(saves){
    const result = saves.map(item => Object.assign({}, item));
    const groups = new Map();
    result.forEach(item => {
      const key = pairKey(item);
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    groups.forEach(items => {
      const used = new Set();
      items.sort((a,b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')) || a.id.localeCompare(b.id)).forEach(item => {
        if(Number.isInteger(item.slotNumber) && item.slotNumber > 0 && !used.has(item.slotNumber)) used.add(item.slotNumber);
        else delete item.slotNumber;
      });
      items.forEach(item => {
        if(item.slotNumber) return;
        let n = 1; while(used.has(n)) n++;
        item.slotNumber = n; used.add(n);
      });
    });
    return result;
  }

  function groupSlots(saves){
    const groups = new Map();
    numberSlots(saves).forEach(item => {
      const key = pairKey(item);
      if(!groups.has(key)) groups.set(key, { key, protagonistName: item.protagonistName || '主人公', partnerName: item.partnerName || '未選択', slots: [] });
      groups.get(key).slots.push(item);
    });
    return [...groups.values()].map(group => ({ ...group, slots: group.slots.sort((a,b) => a.slotNumber - b.slotNumber) }));
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
    return numberSlots(result);
  }

  async function loadSaveById(id){
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');
    await checkToken(token);

    const path = id === LEGACY_SAVE_ID ? CLOUD.legacyPath : savePath(id);
    const branch = (await githubJson(token, '')).default_branch;
    const head = (await githubJson(token, 'git/ref/heads/' + encodeURIComponent(branch))).object.sha;
    const file = await fetchCloudFile(token, path, head);
    let save = parseCloudJson(file, '恋愛シュミレーションのセーブデータを読み込めません。');
    if(!save || typeof save !== 'object' || Array.isArray(save)){
      throw new Error('恋愛シュミレーションのセーブデータを読み込めません。');
    }
    if(isSplit(save) && save.saveId !== id) throw new Error('セーブIDが一致しません。');
    save = await hydrateSave(token, save);
    delete save.state.session.archive;
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

  async function saveToGitHub(save, options = {}){
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');
    await checkToken(token);

    const prepared = Object.assign({}, save);
    const state = Object.assign({}, prepared.state || {});
    const localSession = ensureLocalSession();

    const sourceId = getCurrentSaveId();
    let saveId = options.newSlot ? makeSession().id : (options.targetId || sourceId);
    if(!saveId) saveId = localSession.id || makeSession().id;
    if(saveId !== LEGACY_SAVE_ID && !/^[A-Za-z0-9_-]{1,120}$/.test(saveId)) throw new Error('セーブ先が正しくありません。');
    const differentSlot = saveId !== sourceId && (options.newSlot || !!options.targetId);

    const branch = (await githubJson(token, '')).default_branch;
    const expectedHead = (await githubJson(token, 'git/ref/heads/' + encodeURIComponent(branch))).object.sha;
    const path = saveId === LEGACY_SAVE_ID ? CLOUD.legacyPath : savePath(saveId);
    const existing = await fetchJsonIfExists(token, path);
    const remoteSave = existing.exists ? await hydrateSave(token, existing.data) : null;
    if(options.targetId && differentSlot && remoteSave && pairKey(buildMeta(remoteSave, saveId)) !== pairKey(buildMeta(prepared, saveId))) {
      throw new Error('別の主人公・恋愛相手の組には上書きできません。現在の組のスロットを選んでください。');
    }
    // Saving into another slot copies the current run, never the target's story.
    let baseline = remoteSave;
    if(differentSlot){
      baseline = null;
      if(sourceId){
        const sourcePath = sourceId === LEGACY_SAVE_ID ? CLOUD.legacyPath : savePath(sourceId);
        const source = await fetchJsonIfExists(token, sourcePath);
        if(!source.exists) throw new Error('現在のセーブを取得できません。コピーを停止しました。');
        baseline = await hydrateSave(token, source.data);
      }
    }
    const remoteSession = baseline && baseline.state ? baseline.state.session : null;

    const mergedSession = remoteSession
      ? mergeSessions(remoteSession, localSession)
      : normalizeSession(localSession);
    if(differentSlot) mergedSession.id = saveId;
    // A new game has no chapter JSON. Persist its real initial state directly.
    const characterId = state.selectedCharacterId;
    if(characterId && !mergedSession.statesByCharacter[characterId]){
      if(!/^char_\d{3}$/.test(characterId)) throw new Error('恋愛相手のIDが正しくありません。');
      const response = await fetch('state/templates/' + characterId + '_initial_state.json', { cache: 'no-store' });
      if(!response.ok) throw new Error('初期心理状態を取得できません。保存は行っていません。');
      const initialState = await response.json();
      if(!initialState || typeof initialState !== 'object' || Array.isArray(initialState)) throw new Error('初期心理状態が正しくありません。');
      mergedSession.statesByCharacter[characterId] = initialState.currentState
        ? clone(initialState)
        : { currentState: clone(initialState), stateHistory: [] };
    }
    if(characterId && !mergedSession.recordsByCharacter[characterId]) mergedSession.recordsByCharacter[characterId] = [];


    const preservedState = Object.assign({}, baseline && baseline.state || {}, state);
    preservedState.session = mergedSession;
    prepared.state = preservedState;
    const updatedAt = new Date().toISOString();
    const meta = buildMeta(prepared, saveId, updatedAt);
    const data = Object.assign({}, baseline || {}, prepared, {
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
    const numbered = numberSlots(index.saves.filter(item => item && item.id));
    const previousMeta = numbered.find(item => item.id === saveId);
    const next = numbered.filter(item => item.id !== saveId);
    meta.slotNumber = previousMeta && pairKey(previousMeta) === pairKey(meta)
      ? previousMeta.slotNumber
      : Math.max(0, ...next.filter(item => pairKey(item) === pairKey(meta)).map(item => item.slotNumber)) + 1;
    next.push(meta);
    next.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    delete data.storage;
    delete data.state.session.archive;
    const files = [{ path: savePath(saveId), data }, { path: CLOUD.indexPath, data: { version: 1, saves: next } }];
    const publishedCommit = await commitFiles(token, files, expectedHead);
    for(const file of files){
      const confirmed = parseCloudJson(await fetchCloudFile(token, file.path, publishedCommit));
      if(!equal(confirmed,file.data)) throw new Error('保存したコミットの確認に失敗しました。ロードして確認してください。');
    }
    applyLocalSession(data);
    setCurrentSaveId(saveId);
    return data;
  }


  async function deleteSaveById(id, expected = {}){
    if(id !== LEGACY_SAVE_ID && !/^[A-Za-z0-9_-]{1,120}$/.test(id || '')) throw new Error('削除するスロットが正しくありません。');
    if(typeof expected.pairKey !== 'string' || typeof expected.updatedAt !== 'string') throw new Error('削除する組とスロットを選び直してください。');
    const token = getToken();
    if(!token) throw new Error('GitHubトークンが設定されていません。');
    const branch = (await githubJson(token, '')).default_branch;
    const head = (await githubJson(token, 'git/ref/heads/' + encodeURIComponent(branch))).object.sha;
    const path = id === LEGACY_SAVE_ID ? CLOUD.legacyPath : savePath(id);
    const found = await fetchJsonIfExists(token, path, head);
    if(!found.exists) throw new Error('このスロットは既に削除されています。一覧を開き直してください。');
    const indexResult = await fetchJsonIfExists(token, CLOUD.indexPath, head);
    const index = indexResult.exists ? indexResult.data : {version:1,saves:[]};
    if(!index || !Array.isArray(index.saves)) throw new Error('セーブ一覧が正しくありません。削除は行っていません。');
    const meta = id === LEGACY_SAVE_ID ? buildMeta(found.data,id,found.data.updatedAt || '') : index.saves.find(item => item.id === id);
    if(!meta || pairKey(meta) !== expected.pairKey || pairKey(buildMeta(found.data,id)) !== expected.pairKey || String(meta.updatedAt || '') !== expected.updatedAt || String(found.data.updatedAt || '') !== expected.updatedAt){
      throw new Error('選んだスロットが更新されています。一覧を開き直して確認してください。削除は行っていません。');
    }
    const nextIndex = {...index,saves:index.saves.filter(item => item.id !== id)};
    const files = [{path,delete:true},{path:CLOUD.indexPath,data:nextIndex}];
    const published = await commitFiles(token,files,head);
    const deleted = await fetchJsonIfExists(token,path,published);
    const confirmed = await fetchJsonIfExists(token,CLOUD.indexPath,published);
    if(deleted.exists || !confirmed.exists || !equal(confirmed.data,nextIndex)){
      throw new Error('削除後の確認に失敗しました。一覧を開き直してください。');
    }
    const clearedCurrent = getCurrentSaveId() === id;
    if(clearedCurrent){
      clearCurrentSaveId();
      localStorage.setItem(SESSION_KEY,JSON.stringify(makeSession()));
      localStorage.removeItem('renaigame_simulation_profile_v1');
      localStorage.removeItem('renaigame_simulation_selected_character_v1');
    }
    return {deleted:true,saveId:id,clearedCurrent};
  }

  function isSafePage(page){
    if(typeof page !== 'string' || !page) return false;
    if(page.includes('..')) return false;
    if(/^https?:/i.test(page)) return false;
    if(page.startsWith('//')) return false;
    return /^[A-Za-z0-9_./-]+\.html(?:[?#].*)?$/.test(page);
  }

  const importPlans = new WeakMap();
  function importError(message){ throw new Error('章データ：' + message); }
  function equal(a,b){
    function sorted(value){
      if(Array.isArray(value)) return value.map(sorted);
      if(value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
      return value;
    }
    return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
  }

  const PACKET_FIELDS = ['version','saveId','characterId','protagonistInput','changes','evidence','stageTransition','yoinomaContext','before','after','evaluations','sources','execution','fingerprint'];
  const HISTORY_FIELDS = new Set(['turn','scene','verification','validation','storyValidation','packet','packetFieldNames']);
  // Canonical history stores all packet values once, directly in the entry.
  // Accept old nested packets only after checking every duplicated field.
  function canonicalChapterHistory(value){
    if(!value || typeof value !== 'object' || Array.isArray(value)) importError('心理履歴がありません。');
    const history = clone(value);
    let packet;
    if(history.packet !== undefined){
      if(!history.packet || typeof history.packet !== 'object' || Array.isArray(history.packet)) importError('心理パケットが不正です。');
      packet = clone(history.packet);
      for(const [key,item] of Object.entries(packet)){
        if(HISTORY_FIELDS.has(key)) importError('心理パケットの項目名が履歴情報と衝突しています。');
        if(Object.prototype.hasOwnProperty.call(history,key) && !equal(history[key],item)) importError('心理履歴と生成用パケットの' + key + 'が一致しません。');
        history[key] = clone(item);
      }
      delete history.packet;
      // Preserve unknown future packet fields without a second copy of values.
      if(Object.keys(packet).some(key => !PACKET_FIELDS.includes(key))) history.packetFieldNames = Object.keys(packet);
      else delete history.packetFieldNames;
    } else {
      const keys = history.packetFieldNames === undefined ? PACKET_FIELDS : history.packetFieldNames;
      if(!Array.isArray(keys) || keys.some(key => typeof key !== 'string' || HISTORY_FIELDS.has(key)) || new Set(keys).size !== keys.length) importError('心理パケットの項目一覧が不正です。');
      packet = Object.fromEntries(keys.filter(key => Object.prototype.hasOwnProperty.call(history,key)).map(key => [key,clone(history[key])]));
    }
    return {history,packet};
  }
  function compactChapterBundle(value){
    const bundle = clone(value);
    if(bundle && bundle.characterId != null && Array.isArray(bundle.stateHistory)){
      bundle.stateHistory = bundle.stateHistory.map(item => ({...item,entry:canonicalChapterHistory(item.entry).history}));
    }
    return bundle;
  }

  // The AI's standard download is v2. This checks the original object before
  // any legacy normalization, so an expanded packet cannot slip through.
  const CHAPTER_V2_HISTORY_FIELDS = ['turn','scene','changes','evidence','stageTransition','yoinomaContext','fingerprint','verification','validation'];
  function assertChapterBundleV2(bundle, filename){
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    function fields(value, names, path){
      if(!object(value)) importError(path + 'はオブジェクトで指定してください。');
      const missing = names.filter(key => !Object.prototype.hasOwnProperty.call(value,key));
      const extra = Object.keys(value).filter(key => !names.includes(key));
      if(missing.length || extra.length) importError(path + 'の項目が標準version 2と異なります。必須不足：' + missing.join(',') + '／追加禁止：' + extra.join(','));
    }
    fields(bundle, ['version','saveId','characterId','chapter','records','stateHistory','replayContext'], '章JSON');
    if(bundle.version !== 2) importError('標準の章JSONはversion 2です。');
    if(typeof bundle.saveId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(bundle.saveId) ||
       typeof bundle.characterId !== 'string' || !/^char_\d{3}$/.test(bundle.characterId) ||
       !Number.isSafeInteger(bundle.chapter) || bundle.chapter < 1) importError('保存先またはChapter番号が不正です。');
    for(const key of ['records','stateHistory']){
      if(!Array.isArray(bundle[key]) || bundle[key].length !== 1) importError(key + 'は今回1章分だけ指定してください。');
      fields(bundle[key][0], ['index','entry'], key + '[0]');
      if(!Number.isSafeInteger(bundle[key][0].index) || bundle[key][0].index < 0) importError(key + 'の配列位置が不正です。');
    }
    const scene = 'Chapter ' + bundle.chapter;
    const record = bundle.records[0].entry, history = bundle.stateHistory[0].entry;
    fields(record, ['scene','date','protagonist','partner'], 'records.entry');
    for(const key of ['scene','date','protagonist','partner']) if(typeof record[key] !== 'string' || !record[key].trim()) importError('本文の' + key + 'がありません。');
    fields(history, CHAPTER_V2_HISTORY_FIELDS, 'stateHistory.entry');
    if(record.scene !== scene || history.scene !== scene || history.turn !== bundle.chapter) importError('本文・心理履歴のChapter番号が一致しません。');
    for(const key of ['changes','evidence','yoinomaContext']) if(!object(history[key])) importError('心理履歴の' + key + 'が不正です。');
    if(Object.values(history.changes).some(value => typeof value !== 'number' || !Number.isFinite(value)) ||
       Object.values(history.evidence).some(value => typeof value !== 'string' || !value.trim()) ||
       !equal(Object.keys(history.changes).sort(),Object.keys(history.evidence).sort())) importError('心理変化と根拠の項目・値が一致しません。');
    if(history.stageTransition !== null && !object(history.stageTransition)) importError('stageTransitionが不正です。');
    if(typeof history.fingerprint !== 'string' || !/^[0-9a-f]{8}$/.test(history.fingerprint)) importError('心理履歴の指紋が不正です。');
    for(const key of ['verification','validation']){
      const result = history[key];
      if(!object(result) || result.ok !== true || !Array.isArray(result.errors) || result.errors.length) importError(key + 'の検証成功記録がありません。');
      if(result.replayFingerprint !== history.fingerprint) importError('検証記録の指紋が一致しません。');
    }
    if(!Array.isArray(history.validation.warnings) || history.validation.warnings.some(value => typeof value !== 'string') || history.validation.requiresSemanticReview !== true) importError('本文の検証記録が不正です。');
    fields(bundle.replayContext, ['recordIndices','storyActions'], 'replayContext');
    if(!Array.isArray(bundle.replayContext.recordIndices) || bundle.replayContext.recordIndices.some(index => !Number.isSafeInteger(index) || index < 0) ||
       (bundle.chapter === 1 && bundle.replayContext.recordIndices.length)) importError('再検証用の過去ログ参照番号が不正です。');
    if(!object(bundle.replayContext.storyActions)) importError('storyActionsが不正です。');
    const expected = bundle.saveId + '_' + bundle.characterId + '_' + String(bundle.chapter).padStart(4,'0') + '.json';
    if(filename !== undefined && filename !== expected) importError('標準のファイル名は' + expected + 'です。');
    return true;
  }

  // Use the already generated story, packet and measured verification results.
  // The producer has no version/verbosity switch and never writes to GitHub.
  function createChapterBundleV2({args, packet, verification, validation, chapter, date, partner, savedRecords, recordIndices, storyActions}){
    const engine = window.RenaiGameTurnEngine;
    if(!engine || typeof engine.validateChapterHeader !== 'function') importError('最新版の本文検証JSを読み込めません。再読み込みしてください。');
    if(!args || !Array.isArray(savedRecords) || !Array.isArray(recordIndices) || !Array.isArray(args.records) ||
       recordIndices.length !== args.records.length || recordIndices.some((index,i) => !Number.isSafeInteger(index) || index < 0 || index >= savedRecords.length || !equal(savedRecords[index],args.records[i]))) importError('計算に使った過去ログと正本の参照番号が一致しません。');
    if(chapter !== Math.max(0,...savedRecords.map((entry,index) => chapterNumber(entry,index))) + 1) importError('正本の次のChapterだけ出力できます。');
    const replay = engine.verifyTurn(args,packet);
    if(!replay.ok || !equal(replay,verification)) importError('元の心理パケットと検証記録が一致しません。');
    const inspection = engine.validateStory(args,packet,partner,storyActions);
    if(!inspection.ok || !equal(inspection,validation)) importError('確定本文と元の本文検証記録が一致しません。');
    const scene = 'Chapter ' + chapter;
    const bundle = {
      version: 2, saveId: args.saveId, characterId: args.characterId, chapter,
      records: [{index: savedRecords.length, entry: {scene,date,protagonist: args.protagonistInput,partner}}],
      stateHistory: [{index: (args.stateEntry.stateHistory || []).length, entry: {
        turn: chapter, scene,
        ...Object.fromEntries(['changes','evidence','stageTransition','yoinomaContext','fingerprint'].map(key => [key,packet[key]])),
        verification, validation
      }}],
      replayContext: {recordIndices,storyActions}
    };
    assertChapterBundleV2(bundle);
    return clone(bundle);
  }


  // Unassigned story records have no partner psychology to calculate.
  // Retain the original bundle and explicitly keep it unverified.
  async function prepareUnassignedImport(value){
    const bundle = clone(value);
    if(bundle.version !== 1 || !/^[A-Za-z0-9_-]{1,120}$/.test(bundle.saveId || '') || bundle.characterId != null || !Number.isInteger(bundle.chapter) || bundle.chapter < 1) importError('未選択の章データの識別情報が不正です。');
    if(bundle.records?.length !== 1 || !Array.isArray(bundle.stateHistory) || bundle.stateHistory.length || bundle.draftMetadata?.status !== 'unverified_draft' || bundle.draftMetadata.psychologyJsExecuted !== false) importError('恋愛相手未選択の本文下書きではありません。');
    const record = bundle.records[0].entry;
    if(!record || typeof record.protagonist !== 'string' || typeof record.partner !== 'string' || !record.protagonist.trim() || !record.partner.trim() || chapterNumber(record,0) !== bundle.chapter) importError('Chapter番号または本文が不正です。');
    const token = getToken(); if(!token) importError('タイトル画面でGitHubトークンを設定してください。');
    const branch = (await githubJson(token, '')).default_branch;
    const head = (await githubJson(token, 'git/ref/heads/' + encodeURIComponent(branch))).object.sha;
    const found = await fetchJsonIfExists(token, savePath(bundle.saveId), head);
    if(!found.exists) importError('指定されたセーブ枠がありません。先に通常のセーブで枠を作ってください。');
    const save = await hydrateSave(token, found.data);
    if(save.saveId !== bundle.saveId || save.state?.selectedCharacterId) importError('恋愛相手未選択のスロットにだけ取り込めます。別の組へは保存しません。');
    const index = await loadIndex(token), meta = index.saves.find(item => item.id === bundle.saveId);
    if(!meta || meta.selectedCharacterId || meta.protagonistName !== buildMeta(save,bundle.saveId).protagonistName) importError('セーブ一覧と保存先が一致しません。');
    const session = save.state.session;
    const records = session.recordsByCharacter.__unassigned__ || [];
    if(!window.RenaiGameTurnEngine || typeof window.RenaiGameTurnEngine.validateChapterHeader !== 'function') importError('本文の継続検査JSを読み込めません。再読み込みしてください。');
    const existing = records.filter((entry,i) => chapterNumber(entry,i) === bundle.chapter);
    // Preserve idempotent imports of unchanged historical chapters. New chapters
    // must validate their actual input, history and declared support outcome.
    const continuityValidation = existing.length ? {ok:true,historicalUnchanged:true} : window.RenaiGameTurnEngine.validateContinuity({
      saveId:bundle.saveId,
      protagonistProfile:save.state.profile || {},
      records:existing.length ? [] : records,
      protagonistInput:record.protagonist
    },record.partner,bundle.draftMetadata.storyActions || {});
    if(!continuityValidation.ok) importError('本文の継続検査に失敗しました：' + continuityValidation.errors.join('／'));

    const preview = Object.freeze({saveId:bundle.saveId,protagonistName:meta.protagonistName,partnerName:'恋愛相手未選択',slotNumber:numberSlots(index.saves).find(item=>item.id===bundle.saveId).slotNumber,chapter:bundle.chapter,protagonist:record.protagonist,partner:record.partner,unverifiedDraft:true,alreadySaved:existing.length > 0});
    if(existing.length){
      if(!equal(existing,[record])) importError('同じChapterに異なる本文があります。上書きはしません。');
      return preview;
    }
    const last = Math.max(0,...records.map((entry,i)=>chapterNumber(entry,i)));
    if(bundle.chapter !== last + 1 || bundle.records[0].index !== records.length) importError('次に保存できるのはChapter ' + (last+1) + 'です。');
    session.recordsByCharacter.__unassigned__ = [...records,clone(record)];
    if(!save.unassignedChapterImports) save.unassignedChapterImports = {};
    save.unassignedChapterImports[bundle.chapter] = bundle;
    if(!save.unassignedChapterValidations) save.unassignedChapterValidations = {};
    save.unassignedChapterValidations[bundle.chapter] = clone(continuityValidation);
    importPlans.set(preview,{head,save,index});
    return preview;
  }

  async function prepareChapterImport(value){
    if(value && value.characterId == null) return prepareUnassignedImport(value);
    if(value && value.version === 2) assertChapterBundleV2(value);
    const bundle = compactChapterBundle(value);
    if(![1,2].includes(bundle.version) || !/^[A-Za-z0-9_-]{1,120}$/.test(bundle.saveId || '') || !/^char_\d{3}$/.test(bundle.characterId || '') || !Number.isInteger(bundle.chapter) || bundle.chapter < 1) importError('保存先またはChapter番号が不正です。');
    if(bundle.records?.length !== 1 || bundle.stateHistory?.length !== 1) importError('1章分の本文と心理履歴を入れてください。');
    const compact = bundle.version === 2;
    const record = bundle.records[0].entry, history = bundle.stateHistory[0].entry;
    let packet = compact ? null : canonicalChapterHistory(history).packet;
    if(!record || !history || typeof record.protagonist !== 'string' || !record.protagonist.trim() || typeof record.partner !== 'string' || !record.partner.trim()) importError('本文または心理履歴がありません。');
    if(chapterNumber(record, 0) !== bundle.chapter || history.turn !== bundle.chapter || (compact && history.scene !== 'Chapter ' + bundle.chapter)) importError('本文・心理履歴のChapter番号が一致しません。');
    if(compact){
      // Recalculate all derived psychology fields from the exact saved slot.
      if(history.packet !== undefined || history.before !== undefined || history.after !== undefined || history.protagonistInput !== undefined) importError('新形式に重複した心理パケットがあります。');
      for(const key of ['changes','evidence','stageTransition','yoinomaContext','fingerprint']) if(history[key] === undefined) importError('心理履歴の' + key + 'がありません。');
      if(typeof history.fingerprint !== 'string' || !history.fingerprint) importError('心理履歴の指紋が不正です。');
    } else {
      if(!packet) importError('旧形式の心理パケット全文がありません。');
      for(const key of ['before','changes','evidence','after','evaluations','execution','sources','fingerprint']) if(packet[key] === undefined) importError('心理パケットの' + key + 'がありません。');
      if(packet.saveId !== bundle.saveId || packet.characterId !== bundle.characterId || packet.protagonistInput !== record.protagonist || history.fingerprint !== packet.fingerprint) importError('本文・心理パケットの識別情報が一致しません。');
    }
    if(history.verification?.ok !== true || (history.validation || history.storyValidation)?.ok !== true) importError('心理計算または本文の検証成功記録がありません。');
    const expectedFingerprint = compact ? history.fingerprint : packet.fingerprint;
    if((history.verification.replayFingerprint && history.verification.replayFingerprint !== expectedFingerprint) ||
      ((history.validation || history.storyValidation).replayFingerprint && (history.validation || history.storyValidation).replayFingerprint !== expectedFingerprint)) importError('検証記録の指紋が一致しません。');
    if(typeof window.RenaiGameTurnEngine?.validateChapterHeader !== 'function' || !window.RenaiGamePsychologyParameters) importError('最新版の検証用JSを読み込めません。再読み込みしてください。');
    const token = getToken(); if(!token) importError('タイトル画面でGitHubトークンを設定してください。');
    const branch = (await githubJson(token, '')).default_branch;
    const head = (await githubJson(token, 'git/ref/heads/' + encodeURIComponent(branch))).object.sha;
    const found = await fetchJsonIfExists(token, savePath(bundle.saveId));
    if(!found.exists) importError('指定されたセーブ枠がありません。先にゲームでセーブ枠を作ってください。');
    const save = await hydrateSave(token, found.data);
    if(save.saveId !== bundle.saveId || save.state.selectedCharacterId !== bundle.characterId) importError('保存先の恋愛相手またはセーブ形式が一致しません。');
    const id = bundle.characterId;
    const savedRecords = save.state.session.recordsByCharacter[id] || [];
    const savedState = save.state.session.statesByCharacter[id];
    const savedHistory = savedState?.stateHistory || [];
    const lastChapter = Math.max(0, ...savedRecords.map((entry,index) => chapterNumber(entry,index)));
    const existingRecords = savedRecords.filter((entry,index) => chapterNumber(entry,index) === bundle.chapter);
    const existingHistory = savedHistory.filter((entry,index) => chapterNumber(entry,index) === bundle.chapter);
    const index = await loadIndex(token), meta = index.saves.find(item => item.id === bundle.saveId);
    if(!meta || meta.selectedCharacterId !== id || meta.protagonistName !== buildMeta(save, bundle.saveId).protagonistName) importError('セーブ一覧の組と保存先が一致しません。');
    const preview = Object.freeze({ saveId: bundle.saveId, protagonistName: meta.protagonistName, partnerName: meta.partnerName, slotNumber: numberSlots(index.saves).find(item => item.id === bundle.saveId).slotNumber, chapter: bundle.chapter, fingerprint: expectedFingerprint, protagonist: record.protagonist, partner: record.partner, alreadySaved: false });
    if(existingRecords.length){
      const sameHistory = compact ? (existingHistory.length === 1 && existingHistory[0].fingerprint === expectedFingerprint) : equal(existingHistory.map(entry => {
        const normalized = canonicalChapterHistory(entry).history;
        for(const key of ['version','saveId','characterId','protagonistInput']) if(normalized[key] === undefined) normalized[key] = packet[key];
        return normalized;
      }), [history]);
      if(!equal(existingRecords, [record]) || !sameHistory) importError('同じChapterに異なる記録があります。上書きはしません。');
      return Object.freeze({ ...preview, alreadySaved: true });
    }
    if(bundle.chapter !== lastChapter + 1) importError('次に保存できるのはChapter ' + (lastChapter + 1) + 'です。');
    if(compact && (bundle.records[0].index !== savedRecords.length || bundle.stateHistory[0].index !== savedHistory.length)) importError('記録・心理履歴の配列位置が正本と一致しません。');
    const full = save;
    let stateEntry = full.state.session.statesByCharacter[id];
    if(!stateEntry){
      const response = await fetch('state/templates/' + id + '_initial_state.json');
      if(!response.ok) importError('初期心理状態を読み込めません。');
      stateEntry = await response.json();
    }
    const engine = window.RenaiGameTurnEngine, psychology = window.RenaiGamePsychologyParameters;
    const before = stateEntry.currentState || stateEntry;
    if(!compact && !equal(psychology.normalizeState(before,id), packet.before)) importError('計算前の心理状態が現在のセーブと一致しません。');
    const actualRecords = full.state.session.recordsByCharacter[id] || [];
    const context = bundle.replayContext || {};
    if(context.records !== undefined && context.recordIndices !== undefined) importError('過去ログ本文と参照番号を同時に指定しないでください。');
    let records;
    if(context.recordIndices !== undefined){
      if(!Array.isArray(context.recordIndices) || context.recordIndices.some(index => !Number.isInteger(index) || index < 0 || index >= actualRecords.length)) importError('再検証用の過去ログ参照番号が不正です。');
      records = context.recordIndices.map(index => actualRecords[index]);
    } else records = context.records === undefined ? actualRecords : context.records;
    if(!Array.isArray(records) || records.some(entry => !actualRecords.some(original => equal(entry,original)))) importError('再検証用の過去ログが現在のセーブと一致しません。');
    if(!compact && engine.fingerprint(records) !== packet.sources.records) importError('再検証用の過去ログの指紋が一致しません。');
    let profile = save.state.profile;
    if(!compact && engine.fingerprint(profile) !== packet.sources.protagonistProfile && engine.fingerprint({}) === packet.sources.protagonistProfile) profile = {};
    const character = window.RenaiGameCharacters?.getById(id) || window.SimulationCharacters?.[id];
    const behavior = window['SimulationCharacter' + id.slice(5) + 'Behavior'];
    const args = { saveId: bundle.saveId, characterId: id, character, behavior, psychology, stateEntry, records, protagonistProfile: profile, protagonistInput: record.protagonist, changes: compact ? history.changes : packet.changes, evidence: compact ? history.evidence : packet.evidence, stageTransition: compact ? history.stageTransition : packet.stageTransition, yoinomaContext: compact ? history.yoinomaContext : packet.yoinomaContext };
    if(compact){
      try { packet = engine.runTurn(args); }
      catch(error){ importError('心理JSの計算に失敗しました：' + error.message); }
      if(packet.fingerprint !== expectedFingerprint && Object.keys(profile || {}).length){
        const withoutProfile = {...args, protagonistProfile: {}};
        const replay = engine.runTurn(withoutProfile);
        if(replay.fingerprint === expectedFingerprint){ args.protagonistProfile = {}; packet = replay; }
      }
      if(packet.fingerprint !== expectedFingerprint) importError('心理パケットの再計算指紋が一致しません。入力・心理状態・参照ログを確認してください。');
    }
    const verification = engine.verifyTurn(args, packet);
    if(!verification.ok) importError('心理JSの再検証に失敗しました：' + verification.errors.join('／'));
    const validation = engine.validateStory(args, packet, record.partner, context.storyActions || {});
    if(!validation.ok) importError('本文の再検証に失敗しました：' + validation.errors.join('／'));
    if(!compact) for(const key of ['before','changes','evidence','after','evaluations','execution']) if(!equal(history[key],packet[key])) importError('心理履歴と生成用パケットの' + key + 'が一致しません。');
    // Keep all original verification and auxiliary fields; store packet values once.
    const storedHistory = canonicalChapterHistory({...history, packet}).history;
    if(compact) delete storedHistory.protagonistInput; // v2 input is already preserved in the record.
    save.state.session.recordsByCharacter[id] = [...savedRecords, clone(record)];
    save.state.session.statesByCharacter[id] = { ...(savedState || {}), currentState: clone(packet.after), stateHistory: [...savedHistory, storedHistory] };
    if(!save.chapterImportMetadataByCharacter) save.chapterImportMetadataByCharacter = {};
    if(!save.chapterImportMetadataByCharacter[id]) save.chapterImportMetadataByCharacter[id] = {};
    save.chapterImportMetadataByCharacter[id][bundle.chapter] = Object.fromEntries(Object.entries(bundle).filter(([key]) => key !== 'records' && key !== 'stateHistory'));
    // Replay bodies already exist in the slot. Preserve their exact order via
    // references, including legacy imports, without deleting unknown metadata.
    for(const metadata of Object.values(save.chapterImportMetadataByCharacter[id])){
      const replay = metadata.replayContext;
      if(!replay) continue;
      const bodies = metadata === save.chapterImportMetadataByCharacter[id][bundle.chapter] ? records : replay.records;
      if(!Array.isArray(bodies)) continue;
      const indices = bodies.map(entry => savedRecords.findIndex(original => equal(entry,original)));
      if(indices.some(index => index < 0)) continue;
      replay.recordIndices = indices;
      replay.recordsFingerprint = engine.fingerprint(bodies);
      delete replay.records;
    }
    delete save.storage; delete save.state.session.archive;
    importPlans.set(preview, { head, save, index });
    return preview;
  }
  async function commitChapterImport(preview){
    const plan = importPlans.get(preview); if(!plan) importError('ファイルを選び直してください。');
    const token = getToken(); if(!token) importError('GitHubトークンがありません。');
    const { save, index, head } = clone(plan);
    const now = new Date().toISOString(); save.updatedAt = now; save.meta.updatedAt = now;
    const meta = index.saves.find(item => item.id === save.saveId); meta.updatedAt = now;
    meta.slotNumber = preview.slotNumber; save.meta.slotNumber = preview.slotNumber;
    const files = [{path:savePath(save.saveId),data:save},{path:CLOUD.indexPath,data:index}];
    const publishedCommit = await commitFiles(token, files, head);
    // Verify every published file. Do not report completion from a tool response alone.
    for(const file of files){ const confirmed = (await fetchJsonIfExists(token,file.path,publishedCommit)).data; if(!equal(confirmed,file.data)) importError('保存したコミットの確認に失敗しました。ロードして確認してください。'); }
    importPlans.delete(preview); applyLocalSession(save); setCurrentSaveId(save.saveId);
    return save;
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
    deleteSaveById,
    isSafePage,
    loadRecordPage,
    splitSave,
    hydrateSave,
    isSplit,
    pairKey, groupSlots, numberSlots, getPartnerName,
    assertChapterBundleV2, createChapterBundleV2,
    compactChapterBundle, prepareChapterImport, commitChapterImport
  };
})();









