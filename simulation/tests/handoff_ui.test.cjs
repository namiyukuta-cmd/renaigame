"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."), read = file => fs.readFileSync(path.join(root, file), "utf8");

// DOM/event fixture only; all selection, draft and handoff behavior comes from
// the actual page scripts below.
class Element {
  constructor(tag, doc) {
    Object.assign(this, {tag, doc, children: [], listeners: {}, className: "", value: "", hidden: false, disabled: false, open: false, dataset: {}});
    this.classList = {
      add: name => {const names = new Set(this.className.split(/\s+/).filter(Boolean)); names.add(name); this.className = [...names].join(" ");},
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, enabled) => {const names = new Set(this.className.split(/\s+/).filter(Boolean)); enabled ? names.add(name) : names.delete(name); this.className = [...names].join(" ");}
    };
  }
  appendChild(child) {child.parent = this; this.children.push(child); return child;}
  setAttribute(key, value) {if(key === "class") this.className = value; else this[key] = value;}
  removeAttribute(key) {if(key === "open") this.open = false; else delete this[key];}
  addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);}
  async trigger(type) {for(const fn of this.listeners[type] || []) await fn({target: this});}
  async click() {if(!this.disabled) await this.trigger("click");}
  matches(selector) {
    return selector.startsWith(".") ? this.className.split(/\s+/).includes(selector.slice(1))
      : selector.startsWith("#") ? this.id === selector.slice(1) : this.tag === selector;
  }
  querySelectorAll(selector) {
    const parts = selector.split(/\s+/);
    if(parts.length > 1) return this.querySelectorAll(parts[0]).flatMap(node => node.querySelectorAll(parts.slice(1).join(" ")));
    return this.children.flatMap(node => [...(node.matches(selector) ? [node] : []), ...node.querySelectorAll(selector)]);
  }
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
  set innerHTML(value) {
    this.html = value; this.children = [];
    for(const match of value.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)) {
      const attrs = [...match[2].matchAll(/([:\w-]+)(?:="([^"]*)")?/g)];
      if(!attrs.some(a => a[1] === "id" || a[1] === "class")) continue;
      const child = new Element(match[1].toLowerCase(), this.doc);
      for(const [, key, v] of attrs) {
        if(["hidden", "disabled", "readonly"].includes(key)) child[key] = true;
        else child.setAttribute(key, v || "");
      }
      this.appendChild(child);
    }
  }
  get innerHTML() {return this.html || "";}
  showModal() {this.open = true;}
  close() {this.open = false;}
  focus() {this.doc.activeElement = this;}
  select() {}
  setSelectionRange() {}
}
async function main() {
  const document = {listeners: {}, activeElement: null};
  document.body = new Element("body", document);
  document.createElement = tag => new Element(tag, document);
  document.querySelector = s => document.body.querySelector(s);
  document.querySelectorAll = s => document.body.querySelectorAll(s);
  document.getElementById = id => document.querySelector("#" + id);
  document.addEventListener = (type, fn) => {(document.listeners[type] ||= []).push(fn);};
  let copied = "";
  document.execCommand = command => {assert.equal(command, "copy"); copied = document.activeElement.value; return true;};
  const add = (tag, id, parent = document.body) => {const e = new Element(tag, document); e.id = id; parent.appendChild(e); return e;};
  for(const id of ["saveButton", "loadButton"]) add("button", id);
  const nav = add("nav", "nav"); nav.className = "bottom-nav";
  for(const id of ["homeButton", "romanceButton", "recordButton", "profileButton", "writeButton"]) add("button", id, nav);
  add("main", "app");
  const local = new Map(), localStorage = {getItem: k => local.get(k) || null, setItem: (k, v) => local.set(k, String(v)), removeItem: k => local.delete(k)};
  const events = {}, scope = {document, localStorage, Date, Math, CustomEvent, navigator: {}, location: {}, console};
  scope.window = scope;
  scope.addEventListener = (type, fn) => {(events[type] ||= []).push(fn);};
  scope.dispatchEvent = event => {for(const fn of events[event.type] || []) fn(event);};
  scope.RenaiGameSave = {getCurrentSaveId: () => localStorage.getItem("renaigame_simulation_current_save_id_v1")};
  const context = vm.createContext(scope);
  for(const file of ["simulation/js/simulation_characters.js", "simulation/js/simulation_record.js"]) vm.runInContext(read(file), context);
  scope.SimulationCharacters = {char_003: {id: "char_003", name: "男性相手", common: {age: 30}}};
  let failLoad = false;
  scope.RenaiGameCharacters = {...scope.RenaiGameCharacters, loadAll: async () => {
    if(failLoad) throw new Error("candidate load failure");
    return scope.RenaiGameCharacters.getAll();
  }};
  const selectSlot = id => {
    scope.RenaiGameRecord.importSession({id, recordsByCharacter: {__unassigned__: [{scene: "Chapter 1", protagonist: "原文", partner: "保存済み本文"}]}, statesByCharacter: {}});
    localStorage.setItem("renaigame_simulation_current_save_id_v1", id);
    localStorage.setItem("renaigame_simulation_profile_v1", JSON.stringify({name: id, free: "このスロットの世界設定"}));
    scope.RenaiGameCharacters.clearSelected();
  };
  selectSlot("run_ui_slot_a");
  const pageScript = [...read("simulation/simulation_new.html").matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  vm.runInContext(pageScript, context);
  vm.runInContext(read("js/renaigame_policy.js"), context);
  vm.runInContext(read("simulation/js/simulation_handoff.js"), context);
  for(const init of document.listeners.DOMContentLoaded || []) init();
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush();
  await document.getElementById("writeButton").click();
  let input = document.getElementById("protagonistWriting");
  assert.ok(input, "an unassigned slot must have a real writing input");
  const raw = "Chapter2\n「今日はお話ししたいです。」\n";
  input.value = raw; await input.trigger("input");
  assert.equal(local.get("renaigame_simulation_protagonist_draft_v1:run_ui_slot_a:__unassigned__"), raw);
  const originalSession = local.get("renaigame_simulation_session_v1");
  await document.getElementById("writingHandoff").click(); await flush();
  const copy = document.querySelector(".handoff-copy"), textarea = document.querySelector(".handoff-text"), dropdown = document.querySelector(".handoff-character");
  assert.equal(copy.hidden, false); assert.equal(copy.disabled, false);
  assert.equal(dropdown.children[0].disabled, false);
  assert.match(dropdown.children[0].textContent, /未選択/);
  assert.equal(dropdown.value, "");
  assert.match(textarea.value, /現在saveId: run_ui_slot_a/);
  assert.match(textarea.value, /このスロットの世界設定/);
  assert.ok(textarea.value.endsWith(raw));
  await copy.click(); assert.equal(copied, textarea.value);
  assert.equal(local.get("renaigame_simulation_session_v1"), originalSession, "copying does not alter saved records or psychology");
  await document.querySelector(".handoff-close").click();
  selectSlot("run_ui_slot_b");
  await document.getElementById("writeButton").click();
  input = document.getElementById("protagonistWriting");
  assert.equal(input.value, "", "another slot must not inherit the draft");
  input.value = "別スロットの入力"; await input.trigger("input");
  selectSlot("run_ui_slot_a");
  await document.getElementById("writeButton").click();
  assert.equal(document.getElementById("protagonistWriting").value, raw);
  await document.querySelector(".handoff-open").click();
  dropdown.value = "char_003"; await dropdown.trigger("change");
  assert.equal(document.getElementById("protagonistWriting").value, "", "selected-partner drafts remain separate");
  dropdown.value = ""; await dropdown.trigger("change");
  assert.equal(scope.RenaiGameCharacters.getSelectedId(), null);
  assert.equal(document.getElementById("protagonistWriting").value, raw);
  assert.ok(textarea.value.endsWith(raw)); assert.equal(copy.disabled, false);
  await document.querySelector(".handoff-close").click();
  failLoad = true;
  await document.querySelector(".handoff-open").click();
  assert.equal(copy.disabled, false, "a failing candidate list does not block the unassigned handoff");
  assert.match(document.querySelector(".handoff-status").textContent, /コピーできます/);
  assert.ok(textarea.value.endsWith(raw));
  await document.querySelector(".handoff-close").click();
  localStorage.removeItem("renaigame_simulation_session_v1");
  localStorage.removeItem("renaigame_simulation_current_save_id_v1");
  await document.getElementById("writeButton").click();
  const freshId = JSON.parse(local.get("renaigame_simulation_session_v1")).id;
  input = document.getElementById("protagonistWriting");
  input.value = "新しい未保存スロットの入力"; await input.trigger("input");
  assert.equal(scope.RenaiGameDraft.read(), input.value);
  assert.equal(JSON.parse(local.get("renaigame_simulation_session_v1")).id, freshId,
    "a fresh slot must persist one session ID before deriving any draft key");
  await document.getElementById("writeButton").click();
  assert.equal(document.getElementById("protagonistWriting").value, "新しい未保存スロットの入力");
  await document.querySelector(".handoff-open").click();
  assert.match(textarea.value, /GitHubへ未保存/);
  assert.ok(textarea.value.includes(freshId));
  assert.ok(textarea.value.endsWith("新しい未保存スロットの入力"));
  console.log("PASS: actual unassigned writing/copy handlers, slot and partner draft isolation, selection reset, and candidate-load failure");
}
main().catch(error => {console.error(error); process.exit(1);});
