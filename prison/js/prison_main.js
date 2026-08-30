(() => {
  "use strict";

  if (!window.RenaiGame) {
    throw new Error("renaigame_common.js を先に読み込んでください。");
  }

  if (!window.PrisonGame) {
    throw new Error("prison_common.js を先に読み込んでください。");
  }

  let gameData = null;
  let messageTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function prepareGameData() {
    gameData = PrisonGame.state.loadCurrent();

    if (!gameData) {
      gameData = PrisonGame.state.startNew();
    }

    if (!gameData.partner?.id && window.PrisonCharacter001) {
      gameData = PrisonGame.state.setPartner(gameData, window.PrisonCharacter001);
    }
  }

  function renderGame() {
    byId("partnerName").textContent = gameData?.partner?.name || "未設定";
    byId("progressText").textContent = gameData?.progress?.stage || "文通開始前";
    byId("storyText").textContent = gameData?.story || "まだ物語は始まっていません。";
    byId("playerInput").value = gameData?.playerText || "";
  }

  function submitPlayerText() {
    const input = byId("playerInput");
    const text = input.value.trim();

    if (!text) {
      showMessage("入力してください。");
      return;
    }

    gameData = PrisonGame.state.setPlayerText(gameData, text);
    gameData = PrisonGame.state.addHistory(gameData, {
      type: "player",
      text
    });

    showMessage("入力内容を記録しました。");
  }

  function openSaveWindow() {
    byId("saveOverlay").classList.add("show");
  }

  function closeSaveWindow() {
    byId("saveOverlay").classList.remove("show");
  }

  async function saveGame(slotNumber) {
    const inputText = byId("playerInput").value;
    gameData = PrisonGame.state.setPlayerText(gameData, inputText);

    try {
      gameData = await PrisonGame.saves.save(slotNumber, gameData);
      closeSaveWindow();
      showMessage(`SAVE ${String(slotNumber).padStart(3, "0")} に保存しました。`);
    } catch (error) {
      console.error(error);
      showMessage(error?.message || "セーブに失敗しました。");
    }
  }

  function returnTop() {
    if (!window.confirm("PRISONのTOPへ戻りますか？")) {
      return;
    }

    location.href = "prison.html";
  }

  function showMessage(text) {
    const message = byId("message");

    if (messageTimer) {
      clearTimeout(messageTimer);
    }

    message.textContent = String(text || "");
    message.classList.add("show");

    messageTimer = setTimeout(() => {
      message.classList.remove("show");
      messageTimer = null;
    }, 2200);
  }

  function bindEvents() {
    byId("topButton").addEventListener("click", returnTop);
    byId("submitButton").addEventListener("click", submitPlayerText);
    byId("openSaveButton").addEventListener("click", openSaveWindow);
    byId("closeSaveButton").addEventListener("click", closeSaveWindow);

    document.querySelectorAll("[data-save-slot]").forEach(button => {
      button.addEventListener("click", () => {
        saveGame(Number(button.dataset.saveSlot));
      });
    });

    byId("saveOverlay").addEventListener("click", event => {
      if (event.target === byId("saveOverlay")) {
        closeSaveWindow();
      }
    });
  }

  function init() {
    prepareGameData();
    renderGame();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
