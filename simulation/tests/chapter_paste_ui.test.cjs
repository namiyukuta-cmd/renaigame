'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'simulation/js/simulation_import.js'), 'utf8');
class Element {
  constructor(tag) {
    this.tag = tag; this.textContent = ''; this.value = ''; this.disabled = tag === '.import-save';
    this.files = []; this.children = []; this.handlers = {};
  }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.append(item); return item; }
  replaceChildren() { this.children = []; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  remove() { this.removed = true; }
  set innerHTML(value) { this.html = value; }
  querySelector(key) {
    this.fields ||= {};
    return this.fields[key] ||= new Element(key);
  }
}
async function main() {
  let dialog, prepared = 0, committed = 0, lastData;
  const document = {
    createElement: tag => new Element(tag),
    body: { appendChild(el) { dialog = el; } },
    head: { appendChild(script) { queueMicrotask(() => script.onload()); } }
  };
  const api = {
    assertChapterBundleV2() { return true; },
    async prepareChapterImport(data) {
      prepared++; lastData = data;
      return {protagonistName:'主人公',partnerName:'男性の相手',slotNumber:1,chapter:data.chapter,
        protagonist:'主人公入力',partner:'Chapter本文',saveId:'run_paste_test',alreadySaved:false};
    },
    async commitChapterImport() {
      committed++;
      return {state:{profile:{name:'主人公'},selectedCharacterId:'char_017'}};
    }
  };
  const window = {
    RenaiGameSave:api,
    RenaiGameCharacterSettings:{inspect(){}},
    RenaiGameTurnEngine:{validateChapterHeader(){},verifyTurn(){}},
    RenaiGameCharacters:{getById(){return {id:'char_017'};},async loadAll(){},setSelectedId(){},clearSelected(){}}
  };
  const context = {window,document,RenaiGameSave:api,TextEncoder,
    localStorage:{setItem(){}}, location:{reload(){}},queueMicrotask};
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/renaigame_policy.js'),'utf8'),context);
  window.RenaiGameTurnEngine.policy=window.RenaiGamePolicy;
  vm.runInNewContext(source,context);
  window.RenaiGameImport.open();
  assert.match(dialog.html,/章JSONを貼り付け/);
  const paste = dialog.querySelector('.import-json');
  const check = dialog.querySelector('.import-paste');
  const save = dialog.querySelector('.import-save');
  const status = dialog.querySelector('.import-status');
  const file = dialog.querySelector('input');
  assert.equal(save.disabled,true,'save must be disabled until preview');
  paste.value = ['```json','{"version":2,"characterId":"char_017","chapter":5}','```'].join('\n');
  await check.onclick();
  assert.equal(prepared,1);
  assert.equal(lastData.chapter,5);
  assert.equal(committed,0,'checking does not write to GitHub');
  assert.equal(save.disabled,false);
  await save.onclick();
  assert.equal(committed,1,'only explicit save commits');
  assert.match(status.textContent,/再取得して確認しました/);
  paste.value = 'invalid json';
  await check.onclick();
  assert.equal(save.disabled,true,'invalid JSON cannot be saved');
  assert.equal(prepared,1,'invalid JSON is not sent to importer');
  file.files = [{size:55,async text(){return '{"version":2,"characterId":"char_017","chapter":6}';}}];
  await file.onchange();
  assert.equal(prepared,2,'original file import still works');
  assert.equal(lastData.chapter,6);
  assert.equal(save.disabled,false);
  console.log('PASS: pasted JSON and file upload share verified import; explicit save only; malformed paste blocked');
}
main().catch(error => {console.error(error);process.exitCode=1;});
