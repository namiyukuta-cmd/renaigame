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

    if (
      window.PrisonCharacter001 &&
      (!gameData.partner?.id || gameData.partner.id === window.PrisonCharacter001.id)
    ) {
      gameData = PrisonGame.state.setPartner(gameData, window.PrisonCharacter001);
    }
  }

  function renderGame() {
    byId("partnerName").textContent = gameData?.partner?.name || "未設定";
    byId("progressText").textContent = gameData?.progress?.stage || "文通開始前";
    byId("storyText").textContent = gameData?.story || "まだ物語は始まっていません。";
    byId("playerInput").value = gameData?.playerText || "";
  }

  function addProfileRow(container, label, value) {
    const row = document.createElement("div");
    row.className = "profile-row";

    const labelElement = document.createElement("div");
    labelElement.className = "profile-label";
    labelElement.textContent = label;

    const valueElement = document.createElement("div");
    valueElement.textContent = value || "—";

    row.append(labelElement, valueElement);
    container.appendChild(row);
  }

  function renderProfile() {
    const container = byId("profileContent");
    const profile = window.PrisonCharacter001?.publicProfile;

    container.replaceChildren();

    if (!profile) {
      container.textContent = "プロフィールがありません。";
      return;
    }

    addProfileRow(container, "名前", profile.name);
    addProfileRow(container, "年齢", `${profile.age}歳`);
    addProfileRow(container, "服役前の仕事", profile.formerOccupation);
    addProfileRow(container, "罪名", profile.crime);
    addProfileRow(container, "刑期", profile.sentence);
    addProfileRow(container, "服役", `${profile.yearsServed}目`);
    addProfileRow(container, "好きなもの", profile.likes.join("、"));

    const introduction = document.createElement("p");
    introduction.className = "profile-introduction";
    introduction.textContent = profile.introduction;
    container.appendChild(introduction);
  }

  function openProfileWindow() {
    renderProfile();
    byId("profileOverlay").classList.add("show");
  }

  function closeProfileWindow() {
    byId("profileOverlay").classList.remove("show");
  }

  function buildCalebReply(playerText, replyNumber) {
    if (replyNumber === 1) {
      return [
        "手紙をありがとう。",
        "正直に言うと、最初の一通が本当に来るとはあまり思ってなかった。",
        "君が書いてくれたことは全部読んだ。ここじゃ、外の人間の普通の話の方が珍しい。",
        "俺は Caleb Ward。前は自動車整備の仕事をしてた。今はそれくらいからでいいと思ってる。",
        "次も書く気があるなら、君の普段の一日がどんなものか聞かせてほしい。長文じゃなくていい。",
        "Caleb"
      ].join("\n\n");
    }

    const text = String(playerText || "");
    let middle = "君の手紙は読んだ。前より少し、外の生活が見える気がした。";

    if (/車|自動車|整備/.test(text)) {
      middle = "車の話は久しぶりにまともに考えた。仕事をしてた頃のことは、今でも細かいところまで覚えてる。";
    } else if (/本|読書|小説/.test(text)) {
      middle = "本の話なら嫌いじゃない。ここでは時間だけはあるから、読む量は前より増えた。";
    } else if (/仕事|職場|会社/.test(text)) {
      middle = "仕事の話、読んだ。外にいた頃は面倒だと思ってたことまで、今になると妙に具体的に思い出す。";
    } else if (/家族|親|兄|弟|姉|妹/.test(text)) {
      middle = "家族の話は少し答えにくい。仲がいいとは言えない。でも、書いてくれたことは読んだ。";
    } else if (/事件|犯罪|強盗|刑期|刑務所/.test(text)) {
      middle = "事件のことは、まだ全部を手紙に書く気にはなれない。聞かれたことを無視したいわけじゃない。もう少し時間がほしい。";
    } else if (/[?？]/.test(text)) {
      middle = "質問も読んだ。全部にきれいに答えられるとは約束できないけど、答えられることなら書く。";
    }

    return [
      "また手紙が来た。ありがとう。",
      middle,
      "こっちは相変わらず変わり映えしない。だから、君が外で見たものや、どうでもいいと思うような話でも書いてくれると助かる。",
      "また書いてくれ。",
      "Caleb"
    ].join("\n\n");
  }

  function submitPlayerText() {
    const input = byId("playerInput");
    const text = input.value.trim();

    if (!text) {
      showMessage("入力してください。");
      return;
    }

    gameData = PrisonGame.state.setPlayerText(gameData, text);
    gameData = PrisonGame.state.addCorrespondenceLetter(gameData, {
      type: "player",
      text
    });
    gameData = PrisonGame.state.addHistory(gameData, {
      type: "player",
      text
    });

    const replyNumber = Number(gameData.correspondence?.count || 0) + 1;
    const reply = buildCalebReply(text, replyNumber);

    gameData = PrisonGame.state.addCorrespondenceLetter(gameData, {
      type: "partner",
      characterId: window.PrisonCharacter001?.id || "char_001",
      text: reply
    });
    gameData = PrisonGame.state.addHistory(gameData, {
      type: "partner",
      characterId: window.PrisonCharacter001?.id || "char_001",
      text: reply
    });
    gameData = PrisonGame.state.setProgress(gameData, {
      stage: `文通 ${replyNumber}通目`,
      scene: replyNumber
    });
    gameData = PrisonGame.state.setStory(
      gameData,
      `数日後。\n\nCaleb Ward から返事が届いた。\n\n${reply}`
    );
    gameData = PrisonGame.state.setPlayerText(gameData, "");

    renderGame();
    byId("storyText").parentElement.scrollTop = 0;
    showMessage("Calebから返事が届きました。");
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
    byId("profileButton").addEventListener("click", openProfileWindow);
    byId("closeProfileButton").addEventListener("click", closeProfileWindow);
    byId("topButton").addEventListener("click", returnTop);
    byId("submitButton").addEventListener("click", submitPlayerText);
    byId("openSaveButton").addEventListener("click", openSaveWindow);
    byId("closeSaveButton").addEventListener("click", closeSaveWindow);

    document.querySelectorAll("[data-save-slot]").forEach(button => {
      button.addEventListener("click", () => {
        saveGame(Number(button.dataset.saveSlot));
      });
    });

    byId("profileOverlay").addEventListener("click", event => {
      if (event.target === byId("profileOverlay")) {
        closeProfileWindow();
      }
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
