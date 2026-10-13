const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Node {
  constructor(tag){ this.tag = tag; this.children = []; this.events = {}; this.classList = { add: value => { this.current = value; } }; }
  append(...children){ this.children.push(...children); }
  appendChild(child){ this.children.push(child); }
  setAttribute(){}
  addEventListener(name, fn){ this.events[name] = fn; }
  querySelectorAll(tag){ return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
  showModal(){ this.open = true; }
  close(){ this.open = false; }
  remove(){ this.removed = true; }
}
const document = { body: new Node('body'), createElement: tag => new Node(tag) };
const calls = [], saves = [{ id: 'a', protagonistName: 'マリー', partnerName: 'ニコラス' }, { id: 'b', protagonistName: '別の主人公', partnerName: '別の相手' }];
let confirmResult = false;
const sandbox = { window: {}, document, alert: message => calls.push(['alert', message]), confirm: () => confirmResult,
  RenaiGameSave: { getToken: () => 'test', getCurrentSaveId: () => 'a', listSaves: async () => saves,
    loadSaveById: async id => { calls.push(['load', id]); return { hasSave: true, page: 'simulation_new.html' }; },
    saveToGitHub: async (state, options) => calls.push(['save', state, options]), isSafePage: () => true }
};
vm.runInNewContext(fs.readFileSync(__dirname + '/../js/simulation_slots.js', 'utf8'), sandbox);
const options = { readState: () => ({ state: 'current' }), onLoaded: save => calls.push(['loaded', save.page]) };
const latest = () => document.body.children.at(-1);
async function main(){
  await sandbox.window.RenaiGameSlots.open('load', options);
  let dialog = latest(), cards = dialog.children[2].children;
  assert.equal(cards.length, 2);
  assert.equal(calls.length, 0, 'opening slots does not load anything');
  await cards[1].events.click();
  assert.deepEqual(calls[0], ['load', 'b'], 'explicitly selected slot is loaded');
  assert.ok(dialog.removed);
  calls.length = 0;
  await sandbox.window.RenaiGameSlots.open('save', options);
  dialog = latest(); cards = dialog.children[2].children;
  assert.equal(cards.length, 3, 'new slot plus existing slots');
  await cards[2].events.click();
  assert.equal(calls.length, 0, 'cancel overwrite does not write');
  await cards[0].events.click();
  assert.equal(calls[0][0], 'save');
  assert.equal(calls[0][2].newSlot, true);
  assert.ok(dialog.removed);
  console.log('PASS: load selection, save selection, new slot, overwrite cancellation');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
