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
      statesByCharacter: normalizeObjectMap(value.statesByCharacter)
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

  async function render(app) {
    app.innerHTML = `
      <section class="content-panel" aria-labelledby="recordTitle">
        <h2 id="recordTitle">記録</h2>
        <div id="recordList" class="record-list"></div>
      </section>
    `;

    const list = document.getElementById("recordList");
    const character = window.RenaiGameCharacters && typeof RenaiGameCharacters.getSelected === "function"
      ? RenaiGameCharacters.getSelected()
      : null;

    if (!character) {
      list.textContent = "まだ記録はありません。";
      return;
    }

    const history = getRecords(character.id);
    if (!history.length) {
      list.textContent = "まだ記録はありません。";
      return;
    }

    const protagonistName = readProtagonistName();
    const characterName = character.name || "恋愛相手";

    [...history].reverse().forEach((entry) => {
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
