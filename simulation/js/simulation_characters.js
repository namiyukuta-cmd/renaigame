(() => {
  "use strict";

  const SELECTED_KEY = "renaigame_simulation_selected_character_v1";

  // 攻略対象を追加するときは、個別JSを作成してここに1行追加する。
  // HTML側は変更しなくてよい。各個別JSは window.SimulationCharacters に自己登録する。
  const CHARACTER_SCRIPTS = [
    "simulation_character_001.js"
  ];

  let loadPromise = null;

  function loadScript(fileName) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-simulation-character="${fileName}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") resolve();
        else {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", () => reject(new Error(`${fileName} を読み込めませんでした。`)), { once: true });
        }
        return;
      }

      const script = document.createElement("script");
      script.src = `js/${fileName}`;
      script.async = false;
      script.dataset.simulationCharacter = fileName;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`${fileName} を読み込めませんでした。`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function loadAll() {
    if (!loadPromise) {
      loadPromise = CHARACTER_SCRIPTS.reduce(
        (promise, fileName) => promise.then(() => loadScript(fileName)),
        Promise.resolve()
      ).then(() => getAll());
    }
    return loadPromise;
  }

  function getAll() {
    const characters = window.SimulationCharacters || {};
    return Object.values(characters);
  }

  function getById(id) {
    if (!id) return null;
    const characters = window.SimulationCharacters || {};
    return characters[id] || null;
  }

  function getSelectedId() {
    const id = localStorage.getItem(SELECTED_KEY);
    return id || null;
  }

  function getSelected() {
    return getById(getSelectedId());
  }

  function setSelectedId(id) {
    if (!id) {
      localStorage.removeItem(SELECTED_KEY);
      return null;
    }

    const character = getById(id);
    if (!character) throw new Error("選択した恋愛相手のデータが見つかりません。 ");
    localStorage.setItem(SELECTED_KEY, id);
    return character;
  }

  function clearSelected() {
    localStorage.removeItem(SELECTED_KEY);
  }

  function getHomeAsset(character) {
    if (!character || !character.assets) return "";
    return character.assets.home || character.assets.default || "";
  }

  window.RenaiGameCharacters = Object.freeze({
    SELECTED_KEY,
    loadAll,
    getAll,
    getById,
    getSelectedId,
    getSelected,
    setSelectedId,
    clearSelected,
    getHomeAsset
  });
})();
