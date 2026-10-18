const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Node {
  constructor(tag){ this.tag = tag; this.children = []; this.events = {}; this.dataset = {}; this.classList = { add: value => { this.current = value; } }; }
  append(...children){ this.children.push(...children); }
  insertBefore(child, reference){ this.children.splice(this.children.indexOf(reference),0,child); }
  appendChild(child){ this.children.push(child); }
  replaceChildren(){ this.children = []; }
  replaceChild(child, old){ const i=this.children.indexOf(old); assert.ok(i>=0); this.children[i]=child; }
  setAttribute(){}
  addEventListener(name, fn){ this.events[name] = fn; }
  querySelectorAll(tag){ return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
  showModal(){ this.open = true; }
  close(){ this.open = false; }
  remove(){ this.removed = true; }
}
const document = { body: new Node('body'), createElement: tag => new Node(tag) };
const calls = [], saves = [{ id: 'a', protagonistName: 'マリー', partnerName: 'ニコラス', selectedCharacterId: 'char_006' }, { id: 'a2', protagonistName: 'マリー', partnerName: 'ニコラス', selectedCharacterId: 'char_006' }, { id: 'b', protagonistName: '別の主人公', partnerName: '別の相手', selectedCharacterId: 'char_007' }];
let confirmResult = false;
const sandbox = { window: {}, document, alert: message => calls.push(['alert', message]), confirm: () => confirmResult,
  RenaiGameSave: { getToken: () => 'test', getCurrentSaveId: () => 'a', listSaves: async () => saves,
    loadSaveById: async id => { calls.push(['load', id]); return { hasSave: true, page: 'simulation_new.html' }; },
    saveToGitHub: async (state, options) => calls.push(['save', state, options]), isSafePage: () => true }
};
const pure = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + '/../js/simulation_save.js', 'utf8'), pure);
Object.assign(sandbox.RenaiGameSave, { groupSlots: pure.window.RenaiGameSave.groupSlots, pairKey: pure.window.RenaiGameSave.pairKey, getPartnerName: () => 'ニコラス' });
vm.runInNewContext(fs.readFileSync(__dirname + '/../js/simulation_slots.js', 'utf8'), sandbox);
const options = { readState: () => ({ state: { profile: { name: 'マリー' }, selectedCharacterId: 'char_006' } }), onLoaded: save => calls.push(['loaded', save.page]) };
const latest = () => document.body.children.at(-1);
async function main(){
  await sandbox.window.RenaiGameSlots.open('load', options);
  let dialog = latest(), cards = dialog.children.find(child => child.className === "simulation-slot-list").children;
  assert.equal(cards.length, 2);
  assert.equal(calls.length, 0, 'opening slots does not load anything');
  await cards[1].events.click();
  cards = dialog.children.find(child => child.className === "simulation-slot-list").children;
  assert.equal(cards.length, 2, 'selected pair shows only its slot and back button');
  await cards[1].children[0].events.click();
  assert.deepEqual(calls[0], ['load', 'b'], 'explicitly selected slot is loaded');
  assert.ok(dialog.removed);
  calls.length = 0;
  await sandbox.window.RenaiGameSlots.open('save', options);
  dialog = latest(); cards = dialog.children.find(child => child.className === "simulation-slot-list").children;
  assert.equal(cards.length, 2, 'pair selection comes before slots');
  assert.equal(cards[1].disabled, true, 'other pair is disabled for save');
  await cards[0].events.click();
  cards = dialog.children.find(child => child.className === "simulation-slot-list").children;
  assert.equal(cards.length, 4, 'back button, new slot, two slots of this pair');
  await cards[3].children[0].events.click();
  assert.equal(calls.length, 0, 'cancel overwrite does not write');
  await cards[1].events.click();
  assert.equal(calls[0][0], 'save');
  assert.equal(calls[0][2].newSlot, true);
  assert.ok(dialog.removed);
  calls.length = 0;
  const renamed={...options,readState:()=>({state:{profile:{name:'マリー・ウォレット'},selectedCharacterId:'char_006'}})};
  await sandbox.window.RenaiGameSlots.open('save',renamed);
  dialog=latest();cards=dialog.children.find(child=>child.className==='simulation-slot-list').children;
  const oldNameGroup=cards.find(card=>card.children[0].textContent==='マリー ＋ ニコラス');
  assert.notEqual(oldNameGroup.disabled,true,'renaming the current protagonist must not disable the same saved slot');
  assert.equal(cards.find(card=>card.children[0].textContent==='別の主人公 ＋ 別の相手').disabled,true);
  await oldNameGroup.events.click();
  cards=dialog.children.find(child=>child.className==='simulation-slot-list').children;
  assert.notEqual(cards[2].children[0].disabled,true,'current save ID remains selectable');
  assert.equal(cards[3].children[0].disabled,true,'other slots of the old name are still protected');
  assert.equal(calls.length,0,'opening a renamed slot never writes');
  await cards[2].children[0].events.click();
  assert.equal(calls[0][2].targetId,'a','the same ID is saved without creating a different run');
  console.log('PASS: load selection, save selection, new slot, overwrite cancellation');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

