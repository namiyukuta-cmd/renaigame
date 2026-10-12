(() => {
  "use strict";

  const SESSION_KEY = "renaigame_simulation_session_v1";
  const PROFILE_KEY = "renaigame_simulation_profile_v1";

  function makeSession() {
    return {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recordsByCharacter: {},
      statesByCharacter: {}
    };
  }

  function normalizeObjectMap(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function normalizeSession(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return makeSession();
    return {
      id: typeof value.id === "string" && value.id ? value.id : makeSession().id,
      recordsByCharacter: normalizeObjectMap(value.recordsByCharacter),
      statesByCharacter: normalizeObjectMap(value.statesByCharacter),
      ...(value.archive ? { archive: value.archive } : {})
    };
  }

  function readSession() {
    try {
      return normalizeSession(JSON.parse(localStorage.getItem(SESSION_KEY) || "null"));
    } catch (_) {
      return makeSession();
    }
  }

  function writeSession(session) {
    const normalized = normalizeSession(session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function ensureSession() {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return readSession();
    return writeSession(makeSession());
  }

  function resetSession() {
    return writeSession(makeSession());
  }

  function exportSession() {
    return readSession();
  }

  function importSession(session) {
    return writeSession(session);
  }

  function getRecords(characterId) {
    if (!characterId) return [];
    const session = ensureSession();
    const value = session.recordsByCharacter[characterId];
    return Array.isArray(value) ? value : [];
  }

  function setRecords(characterId, records) {
    if (!characterId) return [];
    const session = ensureSession();
    session.recordsByCharacter[characterId] = Array.isArray(records) ? records : [];
    writeSession(session);
    return session.recordsByCharacter[characterId];
  }

  function addEntry(characterId, entry) {
    if (!characterId || !entry || typeof entry !== "object") return null;
    const records = getRecords(characterId).slice();
    records.push(entry);
    setRecords(characterId, records);
    return entry;
  }

  function getCharacterState(characterId) {
    if (!characterId) return null;
    const session = ensureSession();
    const value = session.statesByCharacter[characterId];
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function setCharacterState(characterId, state) {
    if (!characterId) return null;
    const session = ensureSession();
    if (state && typeof state === "object" && !Array.isArray(state)) {
      session.statesByCharacter[characterId] = state;
    } else {
      delete session.statesByCharacter[characterId];
    }
    writeSession(session);
    return session.statesByCharacter[characterId] || null;
  }

  function clearCharacter(characterId) {
    if (!characterId) return;
    const session = ensureSession();
    delete session.recordsByCharacter[characterId];
    delete session.statesByCharacter[characterId];
    writeSession(session);
  }

  function readProtagonistName() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      return typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : "主人公";
    } catch (_) {
      return "主人公";
    }
  }

  function appendTextBlock(parent, className, label, text) {
    if (!text) return;

    const block = document.createElement("div");
    block.className = className;

    const heading = document.createElement("div");
    heading.className = "record-label";
    heading.textContent = label;

    const body = document.createElement("div");
    body.className = "record-text";
    body.textContent = text;

    block.appendChild(heading);
    block.appendChild(body);
    parent.appendChild(block);
  }

  const selectedPages = new Map();

  function buildRecordPages(history) {
    const groups = new Map();
    history.forEach((entry, index) => {
      const match = String(entry.scene || "").match(/Chapter\s*(\d+)/i);
      const chapter = match ? Number(match[1]) : index + 1;
      const start = Math.floor((Math.max(1, chapter) - 1) / 10) * 10 + 1;
      if (!groups.has(start)) groups.set(start, []);
      groups.get(start).push({ entry, chapter, index });
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([start, items]) => ({
      start, end: start + 9,
      entries: items.sort((a, b) => a.chapter - b.chapter || a.index - b.index).map(item => item.entry),
      lastChapter: Math.max(...items.map(item => item.chapter))
    }));
  }

  async function render(app) {
    app.innerHTML = '<section class="content-panel record-panel" aria-labelledby="recordTitle">' +
      '<h2 id="recordTitle">記録</h2><div class="record-reader" id="recordReader">' +
      '<div class="record-scroll" id="recordScroll" tabindex="0" aria-label="Chapter本文"><div id="recordList" class="record-list"></div></div>' +
      '<button type="button" id="recordTocToggle" class="record-toc-toggle" aria-controls="recordToc" aria-expanded="false" aria-label="目次を開く">◀</button><nav id="recordToc" class="record-toc" aria-label="記録の目次" aria-hidden="true" inert><h3>目次</h3><div id="recordPages" class="record-pages"></div></nav></div></section>';
    const list = document.getElementById("recordList");
    const scroll = document.getElementById("recordScroll");
    const toc = document.getElementById("recordPages");
    const reader = document.getElementById("recordReader");
    const drawer = document.getElementById("recordToc");
    const toggle = document.getElementById("recordTocToggle");
    let tocOpen = false;
    function setTocOpen(open, returnFocus = false) {
      tocOpen = open;
      reader.classList.toggle("toc-open", open);
      drawer.inert = !open;
      drawer.setAttribute("aria-hidden", String(!open));
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "目次を閉じる" : "目次を開く");
      toggle.textContent = open ? "▶" : "◀";
      if (returnFocus) toggle.focus({ preventScroll: true });
    }
    toggle.addEventListener("click", () => setTocOpen(!tocOpen));
    reader.addEventListener("keydown", event => {
      if (event.key === "Escape" && tocOpen) {
        setTocOpen(false, true);
        event.stopPropagation();
      }
    });
    scroll.addEventListener("click", () => { if (tocOpen) setTocOpen(false); });

    const character = window.RenaiGameCharacters && typeof RenaiGameCharacters.getSelected === "function"
      ? RenaiGameCharacters.getSelected() : null;
    if (!character) { list.textContent = "まだ記録はありません。"; return; }
    const history = getRecords(character.id);
    if (!history.length) { list.textContent = "まだ記録はありません。"; return; }
    const pages = buildRecordPages(history);
    const latest = pages[pages.length - 1];
    const pageKey = ensureSession().id + ":" + character.id;
    const remembered = selectedPages.get(pageKey);
    let currentStart = pages.some(page => page.start === remembered) ? remembered : pages[0].start;
    const protagonistName = readProtagonistName();
    const characterName = character.name || "恋愛相手";
    let requestId = 0;
    async function showPage(page) {
      const request = ++requestId;
      list.textContent = "読み込んでいます…";
      try {
        const chapters = page.entries.map((entry, index) => entry.__chapterRef?.chapter || Number(String(entry.scene || "").match(/Chapter\s*(\d+)/i)?.[1]) || page.start + index);
        const loaded = await RenaiGameSave.loadRecordPage(character.id, chapters);
        if(request !== requestId || !list.isConnected) return;
        page = buildRecordPages(loaded).find(item => item.start === page.start) || page;
      } catch(error) {
        if(request === requestId && list.isConnected) list.textContent = error.message || "記録を読み込めませんでした。目次から再度選んでください。";
        return;
      }
      currentStart = page.start;
      selectedPages.set(pageKey, page.start);
      list.replaceChildren();
      page.entries.forEach((entry) => {
        const article = document.createElement("article");
        article.className = "record-entry";
        const title = document.createElement("h3");
        title.textContent = entry.scene || "記録";
        article.appendChild(title);
        if (entry.date) {
          const date = document.createElement("div");
          date.className = "record-date";
          date.textContent = entry.date;
          article.appendChild(date);
        }
        appendTextBlock(article, "record-block", protagonistName, entry.protagonist);
        appendTextBlock(article, "record-block", characterName, entry.partner || entry.alexander);
        appendTextBlock(article, "record-block", "ログ", entry.transcript);
        appendTextBlock(article, "record-block record-summary", "要約", entry.summary);
        list.appendChild(article);
      });
      scroll.scrollTop = 0;
      toc.querySelectorAll("button").forEach(button => {
        const active = Number(button.dataset.start) === currentStart;
        button.classList.toggle("selected", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
    }
    pages.forEach((page) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "record-page-button";
      button.dataset.start = String(page.start);
      const range = document.createElement("span");
      range.className = "record-page-range";
      range.textContent = page === latest && page.lastChapter < page.end ? page.start + "〜" : page.start + "〜" + page.end;
      button.appendChild(range);
      button.setAttribute("aria-label", "Chapter " + page.start + "〜" + Math.min(page.end, page.lastChapter) + (page === latest ? "、最新ページ" : ""));
      if (page === latest) {
        const badge = document.createElement("span");
        badge.className = "record-new";
        badge.textContent = "new";
        button.appendChild(badge);
      }
      button.addEventListener("click", () => { showPage(page); setTocOpen(false, true); });
      toc.appendChild(button);
    });
    await showPage(pages.find(page => page.start === currentStart));
  }

  window.RenaiGameRecord = Object.freeze({
    SESSION_KEY,
    ensureSession,
    resetSession,
    exportSession,
    importSession,
    getRecords,
    setRecords,
    addEntry,
    getCharacterState,
    setCharacterState,
    clearCharacter,
    render
  });
})();

