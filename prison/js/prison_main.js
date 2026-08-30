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
      romanceScore: 0,
      trust: 0,
      attachment: 0,
      romanticAwareness: 0,
      jealousy: 0,
      vulnerability: 0,
      futureThinking: 0,
      lastChangeReason: "",
      lastProgress: ""
    };
  }

  function ensureBilingualStoryStyles() {
    if (document.getElementById("prisonBilingualStoryStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "prisonBilingualStoryStyles";
    style.textContent = `
      .story-text.bilingual-letter {
        white-space: normal;
      }

      .letter-intro {
        display: block;
        margin: 0 0 1em;
        white-space: pre-wrap;
      }

      .letter-pair {
        display: block;
        margin: 0 0 1em;
      }

      .letter-pair:last-child {
        margin-bottom: 0;
      }

      .letter-en,
      .letter-ja {
        display: block;
        margin: 0;
        line-height: 1.45;
      }

      .letter-ja {
        margin-top: 2px;
      }
    `;

    document.head.appendChild(style);
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

  function getLatestPartnerLetter() {
    const letters = Array.isArray(gameData?.correspondence?.letters)
      ? gameData.correspondence.letters
      : [];

    for (let index = letters.length - 1; index >= 0; index -= 1) {
      if (letters[index]?.type === "partner") {
        return letters[index];
      }
    }

    return null;
  }

  function renderStory() {
    const storyElement = byId("storyText");
    const latestPartnerLetter = getLatestPartnerLetter();
    const segments = Array.isArray(latestPartnerLetter?.segments)
      ? latestPartnerLetter.segments
      : [];
    const canShowBilingualReply =
      gameData?.aiRequest?.status !== "waiting" && segments.length > 0;

    storyElement.replaceChildren();

    if (!canShowBilingualReply) {
      storyElement.classList.remove("bilingual-letter");
      storyElement.textContent = gameData?.story || "まだ物語は始まっていません。";
      return;
    }

    storyElement.classList.add("bilingual-letter");

    const intro = document.createElement("span");
    intro.className = "letter-intro";
    intro.textContent = `数日後。\n\n${gameData?.partner?.name || "相手"}から返事が届いた。`;
    storyElement.appendChild(intro);

    segments.forEach(segment => {
      const pair = document.createElement("span");
      pair.className = "letter-pair";

      const english = document.createElement("span");
      english.className = "letter-en";
      english.textContent = String(segment?.en || "");

      const japanese = document.createElement("span");
      japanese.className = "letter-ja";
      japanese.textContent = String(segment?.ja || "");

      pair.append(english, japanese);
      storyElement.appendChild(pair);
    });
  }

  function renderGame() {
    byId("partnerName").textContent = gameData?.partner?.name || "未設定";
    byId("progressText").textContent = gameData?.progress?.stage || "文通開始前";
    renderStory();
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
          "主人公の今回の手紙がCalebにどう響いたかを判断し、romanceScore・trust等を必要に応じて維持・増減する",
          "文通回数だけを理由に恋愛度や恋愛段階を上げない",
          "恋愛度・信頼・性格・状況から自然な場合だけ恋愛段階を進める",
          "恋愛度が上がっているのに無難な関係へ意図的に薄めない",
          "返答本文とromance状態を一致させる",
          "Calebの返事は英語で書き、自然な切れ目ごとに日本語訳を付ける",
          "correspondence.letters の partner返答に segments: [{en, ja}] を保存する",
          "segmentsは 英文→直下に日本語訳 の順にし、次の英文との区切りは別segmentにする"
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
    ensureBilingualStoryStyles();
    prepareGameData();
    renderGame();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
