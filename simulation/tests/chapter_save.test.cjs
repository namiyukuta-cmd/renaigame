const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../js/simulation_save.js', 'utf8');
const prefix = 'renaigame/simulation/saves/';
const original = {
  version: 2, saveId: 'run_test', game: 'simulation', page: 'simulation_new.html', hasSave: true,
  state: { profile: { name: 'テスト' }, selectedCharacterId: 'char_006', session: {
    id: 'run_test', recordsByCharacter: {
      char_006: Array.from({ length: 21 }, (_, i) => ({ scene: 'Chapter ' + (i + 1), protagonist: '原文' + i, partner: '本文' + i, extra: { retained: true } })),
      char_001: [{ scene: 'Chapter 1', transcript: '別の人物' }]
    }, statesByCharacter: {
      char_006: { currentState: { romanceScore: 13 }, extra: '残す', stateHistory: Array.from({ length: 21 }, (_, i) => ({ turn: i + 1, before: { n: i }, after: { n: i + 1 }, packet: { fingerprint: 'f' + i, evidence: ['原文'] } })) },
      char_001: { romanceScore: 1 }
    }
  } }
};
const files = new Map(), local = new Map();
let head = 'h0', counter = 0, failRef = false, reads = [], mutations = [];
const pendingTrees = new Map(), commits = new Map();
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const sandbox = {
  window: {}, TextEncoder, TextDecoder, Date, console,
  btoa: value => Buffer.from(value, 'binary').toString('base64'),
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  localStorage: { getItem: key => local.get(key) || null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) },
  fetch: async (url, options = {}) => {
    // GitHub OPTIONS on the repository URL with a trailing slash returns 404,
    // causing Safari's authenticated cross-origin fetch to report Load failed.
    if(url === 'https://api.github.com/repos/namiyukuta-cmd/private-game-data/') throw new TypeError('Load failed');
    const route = url.split('?')[0].replace('https://api.github.com/repos/namiyukuta-cmd/private-game-data', '').replace(/^\//, '');
    const body = options.body && JSON.parse(options.body), method = options.method || 'GET';
    if(method !== 'GET') mutations.push({ route, body });
    if(!route) return response({ default_branch: 'main' });
    if(route.startsWith('contents/')){
      const path = decodeURIComponent(route.slice(9)); reads.push(path);
      if(!files.has(path)) return response({}, 404);
      return response({ sha: 'sha', content: Buffer.from(JSON.stringify(files.get(path))).toString('base64') });
    }
    if(route === 'git/ref/heads/main') return response({ object: { sha: head } });
    if(route.startsWith('git/commits/') && method === 'GET') return response({ tree: { sha: 'base' } });
    if(route === 'git/trees') { const sha = 'tree' + ++counter; pendingTrees.set(sha, body.tree); return response({ sha }); }
    if(route === 'git/commits') { const sha = 'commit' + ++counter; commits.set(sha, body); return response({ sha }); }
    if(route === 'git/refs/heads/main'){
      if(failRef || commits.get(body.sha).parents[0] !== head) return response({}, 422);
      pendingTrees.get(commits.get(body.sha).tree).forEach(entry => files.set(entry.path, JSON.parse(entry.content)));
      head = body.sha; return response({ object: { sha: head } });
    }
    throw Error('Unexpected route ' + route);
  }
};
vm.runInNewContext(source, sandbox);
const api = sandbox.window.RenaiGameSave;
const json = value => JSON.stringify(value);
async function main(){
  api.setToken('test');
  const split = api.splitSave(original);
  split.manifest.storage.legacyBackup = prefix + 'run_test/legacy-backup.json';
  assert.equal(split.bundles.length, 22);
  split.bundles.forEach(file => files.set(file.path, file.data));
  files.set(prefix + 'run_test.json', split.manifest);
  files.set(prefix + 'index.json', { version: 1, saves: [{ id: 'other', updatedAt: 'old' }] });
  const restored = await api.hydrateSave('test', split.manifest);
  assert.equal(json(restored), json(original), 'all original fields and history survive');
  reads = [];
  const loaded = await api.loadSaveById('run_test');
  assert.equal(reads.filter(path => path.includes('/chapters/')).length, 0, 'load reads manifest only');
  assert.equal(loaded.state.session.statesByCharacter.char_006.currentState.romanceScore, 13);
  const records = await api.loadRecordPage('char_006', [11,12,13,14,15,16,17,18,19,20]);
  assert.equal(reads.filter(path => path.includes('/chapters/')).length, 10, 'page reads just ten chapter files');
  assert.equal(records[10].partner, '本文10');
  assert.ok(records[0].__chapterRef);
  const beforeCache = local.get(api.SESSION_KEY);
  const missing = prefix + 'run_test/chapters/char_006_0021.json';
  const chapter21 = files.get(missing); files.delete(missing);
  await assert.rejects(api.loadRecordPage('char_006', [21]));
  assert.equal(local.get(api.SESSION_KEY), beforeCache, 'failed read does not alter local data');
  files.set(missing, chapter21);
  mutations = [];
  await api.saveToGitHub({ game: 'simulation', page: 'simulation_new.html', state: { profile: original.state.profile, selectedCharacterId: 'char_006' } });
  let tree = mutations.find(item => item.route === 'git/trees').body.tree;
  assert.equal(tree.filter(file => file.path.includes('/chapters/')).length, 0, 'unchanged chapters are not sent');
  assert.equal(files.get(prefix + 'run_test.json').storage.legacyBackup, prefix + 'run_test/legacy-backup.json', 'backup reference is retained');
  assert.equal(json((await api.hydrateSave('test', files.get(prefix + 'run_test.json'))).state.session), json(original.state.session));
  let session = JSON.parse(local.get(api.SESSION_KEY));
  session.recordsByCharacter.char_006.push({ scene: 'Chapter 22', protagonist: '新しい原文', partner: '新しい本文' });
  local.set(api.SESSION_KEY, json(session));
  mutations = [];
  await api.saveToGitHub({ game: 'simulation', page: 'simulation_new.html', state: { profile: original.state.profile, selectedCharacterId: 'char_006' } });
  tree = mutations.find(item => item.route === 'git/trees').body.tree;
  assert.equal(tree.filter(file => file.path.includes('/chapters/')).length, 1, 'only new chapter is sent');
  assert.ok(files.get(prefix + 'index.json').saves.some(item => item.id === 'other'));
  const before = json([...files]);
  session = JSON.parse(local.get(api.SESSION_KEY)); session.recordsByCharacter.char_006.push({ scene: 'Chapter 23', partner: '追加' }); local.set(api.SESSION_KEY, json(session));
  failRef = true;
  await assert.rejects(api.saveToGitHub({ game: 'simulation', page: 'simulation_new.html', state: {} }));
  assert.equal(json([...files]), before, 'failed commit does not publish partial chapters or state');
  failRef = false;
  const sourcePath = prefix + 'run_test.json';
  const sourceSnapshot = json(files.get(sourcePath));
  const copied = await api.saveToGitHub({ game: 'simulation', page: 'simulation_new.html', state: { profile: original.state.profile, selectedCharacterId: 'char_006' } }, { newSlot: true });
  assert.notEqual(copied.saveId, 'run_test');
  assert.equal(copied.state.session.recordsByCharacter.char_006.length, 23, 'new slot copies full remote history and local additions');
  assert.equal(copied.state.session.statesByCharacter.char_006.stateHistory.length, 21, 'psychology is preserved when copying');
  assert.equal(json(files.get(sourcePath)), sourceSnapshot, 'saving a copy leaves original slot intact');
  files.set(prefix + 'foreign.json', { ...original, saveId: 'foreign', state: { ...original.state, session: { id: 'foreign', recordsByCharacter: { char_001: [{ scene: 'Chapter 1', partner: 'FOREIGN STORY' }] }, statesByCharacter: { char_001: { romanceScore: 999 } } } } });
  files.get(prefix + 'foreign.json').state.selectedCharacterId = 'char_003';
  const beforeOtherPair = json([...files]);
  await assert.rejects(api.saveToGitHub({ game: 'simulation', page: 'simulation_new.html', state: { profile: original.state.profile, selectedCharacterId: 'char_006' } }, { targetId: 'foreign' }), /別の主人公/);
  assert.equal(json([...files]), beforeOtherPair, 'a different pair cannot be overwritten');
  files.get(prefix + 'foreign.json').state.selectedCharacterId = 'char_006';
  const replaced = await api.saveToGitHub({ game: 'simulation', page: 'simulation_new.html', state: { profile: original.state.profile, selectedCharacterId: 'char_006' } }, { targetId: 'foreign' });
  assert.equal(replaced.saveId, 'foreign');
  assert.equal(replaced.state.session.id, 'foreign');
  assert.equal(replaced.state.session.recordsByCharacter.char_006.length, 23);
  assert.ok(!json(replaced).includes('FOREIGN STORY'), 'target story is never merged into current run');
  assert.equal(replaced.state.session.statesByCharacter.char_001.romanceScore, 1);
  const numbered = api.numberSlots([{ id: 'one', protagonistName: 'A', selectedCharacterId: 'char_006', updatedAt: '1' }, { id: 'two', protagonistName: 'A', selectedCharacterId: 'char_006', updatedAt: '2' }, { id: 'other', protagonistName: 'B', selectedCharacterId: 'char_006', updatedAt: '0' }]);
  assert.equal(numbered[0].slotNumber, 1); assert.equal(numbered[1].slotNumber, 2); assert.equal(numbered[2].slotNumber, 1);
  numbered[0].updatedAt = '9';
  assert.equal(api.numberSlots(numbered)[0].slotNumber, 1, 'slot numbers survive update-date changes');
  assert.equal(api.groupSlots(numbered).length, 2);
  files.set(prefix + 'legacy_test.json', { ...original, saveId: 'legacy_test' });
  api.setCurrentSaveId('legacy_test'); local.set(api.SESSION_KEY, json({ ...original.state.session, id: 'legacy_test' }));
  await api.saveToGitHub({ game: 'simulation', page: 'simulation_new.html', state: original.state });
  assert.ok(api.isSplit(files.get(prefix + 'legacy_test.json')), 'old saves migrate on their next save');
  console.log('PASS: lossless migration, lazy ten-chapter reads, unchanged/new chapter writes, missing data, atomic failure, legacy compatibility');
}
main().catch(error => { console.error(error); process.exitCode = 1; });



