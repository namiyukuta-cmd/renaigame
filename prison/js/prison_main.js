(() => {
  "use strict";

  if (!window.RenaiGame) {
    throw new Error("renaigame_common.js を先に読み込んでください。");
  }

  if (!window.PrisonGame) {
    throw new Error("prison_common.js を先に読み込んでください。");
  }

  const AI_CONTEXT_FILES = [
    "js/renaigame_romance_rules.js",
    "prison/js/prison_romance_rules.js",
    "prison/js/prison_character_001.js"
  ];

  let gameData = null;
  let messageTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function createDefaultRomanceState() {
    return {
      stage: 0,
      stageName: "他人",
      trust: 0,
      interest: 0,
      attachment: 0,
      romanticAwareness: 0,
      jealousy: 0,
      vulnerability: 0,
      futureThinking: 0,
      repliesWithoutProgress: 0,
      lastProgress: ""
    };
  }

  function prepareGameData() {
    gameData = PrisonGame.state.loadCurrent();

    if (!gameData) {
      gameData = PrisonGame.state.startNew();
    }

    if (!gameData.romance) {
      gameData = PrisonGame.state.saveCurrent({
        ...gameData,
        romance: createDefaultRomanceState()
      });
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

  function submitPlayerText() {
    const input = byId("playerInput");
    const text = input.value.trim();

    if (!text) {
      showMessage("入力してください。");
      return;
    }

    if (gameData?.aiRequest?.status === "waiting") {
      showMessage("Calebからの返事を待っています。");
      return;
    }

    const letterNumber = Number(gameData.correspondence?.count || 0) + 1;
    const now = RenaiGame.util.nowIso();

    gameData = PrisonGame.state.addCorrespondenceLetter(gameData, {
      type: "player",
      direction: "outgoing",
      number: letterNumber,
      text,
      time: now
    });

    gameData = PrisonGame.state.addHistory(gameData, {
      type: "player",
      number: letterNumber,
      text,
      time: now
    });

    gameData = PrisonGame.state.saveCurrent({
      ...gameData,
      romance: gameData.romance || createDefaultRomanceState(),
      aiRequest: {
        status: "waiting",
        type: "prison_letter_reply",
        characterId: window.PrisonCharacter001?.id || "char_001",
        letterNumber,
        playerLetter: text,
        requestedAt: now,
        requiredContextFiles: AI_CONTEXT_FILES,
        requirements: [
          "キャラクターデータと矛盾しない返答を書く",
          "共通恋愛ルールとPRISON恋愛ルールを必ず確認する",
          "主人公が拒絶していない限り恋愛関係を停滞させない",
          "返答本文とromance状態の両方に今回の進展を反映する"
        ]
      },
      progress: {
        ...(gameData.progress || {}),
        stage: `返事待ち ${letterNumber}通目`,
        scene: letterNumber
      },
      story: [
        "手紙を送りました。",
        "",
        "GitHubにセーブしてから、このチャットで「書いたよ」と伝えてください。",
        "",
        "Calebからの返事を待っています。"
      ].join("\n"),
      playerText: ""
    });

    renderGame();
    byId("storyText").parentElement.scrollTop = 0;
    showMessage("手紙を記録しました。次にセーブしてください。");
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
