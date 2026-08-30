(() => {
  "use strict";

  if (!window.RenaiGame) {
    throw new Error("renaigame_common.js を先に読み込んでください。");
  }

  const GAME_ID = "prison";
  const SAVE_DIRECTORY = "prison/saves";
  const DEFAULT_SLOT_COUNT = 3;

  function createInitialState(overrides = {}) {
    const now = RenaiGame.util.nowIso();

    return {
      version: 1,
      game: GAME_ID,

      partner: {
        id: "",
        name: ""
      },

      progress: {
        stage: "文通開始前",
        scene: 0
      },

      romance: {
        stage: 0,
        stageName: "他人",
        romanceScore: 0,
        trust: 0,
        attachment: 0,
        romanticAwareness: 0,
        jealousy: 0,
        vulnerability: 0,
        futureThinking: 0,
        lastChangeReason: "",
        lastProgress: ""
      },

      correspondence: {
        count: 0,
        letters: []
      },

      story: "",
      playerText: "",
      history: [],

      createdAt: now,
      updatedAt: now,

      ...overrides
    };
  }

  function normalizeSlot(slotNumber) {
    const slot = Number(slotNumber);

    if (!Number.isInteger(slot) || slot < 1) {
      throw new Error("セーブスロット番号が不正です。");
    }

    return slot;
  }

  function getSavePath(slotNumber) {
    const slot = normalizeSlot(slotNumber);
    const number = String(slot).padStart(3, "0");

    return `${SAVE_DIRECTORY}/prison_save_${number}.json`;
  }

  function saveCurrent(state) {
    const data = {
      ...state,
      game: GAME_ID,
      updatedAt: RenaiGame.util.nowIso()
    };

    RenaiGame.storage.saveCurrentGame(GAME_ID, data);
    return data;
  }

  function loadCurrent() {
    return RenaiGame.storage.loadCurrentGame(GAME_ID);
  }

  function clearCurrent() {
    RenaiGame.storage.clearCurrentGame(GAME_ID);
  }

  function startNewGame(overrides = {}) {
    const state = createInitialState(overrides);
    return saveCurrent(state);
  }

  async function saveSlot(slotNumber, state) {
    const slot = normalizeSlot(slotNumber);
    const now = RenaiGame.util.nowIso();

    const data = {
      ...state,
      game: GAME_ID,
      updatedAt: now,
      save: {
        slot,
        savedAt: now
      }
    };

    const path = getSavePath(slot);

    await RenaiGame.github.writeJson(path, data, {
      message: `Save PRISON slot ${String(slot).padStart(3, "0")}`
    });

    saveCurrent(data);
    return data;
  }

  async function loadSlot(slotNumber) {
    const slot = normalizeSlot(slotNumber);
    const path = getSavePath(slot);
    const data = await RenaiGame.github.readJson(path);

    if (!data) {
      return null;
    }

    saveCurrent(data);
    return data;
  }

  async function getSaveSlotInfo(slotNumber) {
    const slot = normalizeSlot(slotNumber);
    const path = getSavePath(slot);
    const data = await RenaiGame.github.readJson(path);

    if (!data) {
      return {
        slot,
        exists: false,
        path,
        data: null
      };
    }

    return {
      slot,
      exists: true,
      path,
      savedAt: data.save?.savedAt || data.updatedAt || "",
      partnerName: data.partner?.name || "",
      stage: data.progress?.stage || "",
      data
    };
  }

  async function getSaveSlots(slotCount = DEFAULT_SLOT_COUNT) {
    const count = Number(slotCount);

    if (!Number.isInteger(count) || count < 1) {
      throw new Error("セーブスロット数が不正です。");
    }

    const results = [];

    for (let slot = 1; slot <= count; slot += 1) {
      results.push(await getSaveSlotInfo(slot));
    }

    return results;
  }

  function setPartner(state, character) {
    const next = {
      ...state,
      partner: {
        id: character?.id || "",
        name: character?.name || ""
      }
    };

    return saveCurrent(next);
  }

  function setProgress(state, progress = {}) {
    const next = {
      ...state,
      progress: {
        ...(state.progress || {}),
        ...progress
      }
    };

    return saveCurrent(next);
  }

  function setRomance(state, romance = {}) {
    const next = {
      ...state,
      romance: {
        ...(state.romance || {}),
        ...romance
      }
    };

    return saveCurrent(next);
  }

  function setStory(state, story) {
    const next = {
      ...state,
      story: String(story || "")
    };

    return saveCurrent(next);
  }

  function setPlayerText(state, text) {
    const next = {
      ...state,
      playerText: String(text || "")
    };

    return saveCurrent(next);
  }

  function addHistory(state, entry) {
    const history = Array.isArray(state.history)
      ? [...state.history]
      : [];

    history.push({
      ...entry,
      time: entry?.time || RenaiGame.util.nowIso()
    });

    const next = {
      ...state,
      history
    };

    return saveCurrent(next);
  }

  function addCorrespondenceLetter(state, entry) {
    const correspondence = state.correspondence || {};
    const letters = Array.isArray(correspondence.letters)
      ? [...correspondence.letters]
      : [];

    const letter = {
      ...entry,
      time: entry?.time || RenaiGame.util.nowIso()
    };

    letters.push(letter);

    const next = {
      ...state,
      correspondence: {
        ...correspondence,
        count: Number(correspondence.count || 0) + (letter.type === "partner" ? 1 : 0),
        letters
      }
    };

    return saveCurrent(next);
  }

  window.PrisonGame = Object.freeze({
    config: Object.freeze({
      gameId: GAME_ID,
      saveDirectory: SAVE_DIRECTORY,
      defaultSlotCount: DEFAULT_SLOT_COUNT
    }),

    state: Object.freeze({
      createInitial: createInitialState,
      startNew: startNewGame,
      saveCurrent,
      loadCurrent,
      clearCurrent,
      setPartner,
      setProgress,
      setRomance,
      setStory,
      setPlayerText,
      addHistory,
      addCorrespondenceLetter
    }),

    saves: Object.freeze({
      getPath: getSavePath,
      save: saveSlot,
      load: loadSlot,
      getInfo: getSaveSlotInfo,
      getAll: getSaveSlots
    })
  });
})();
