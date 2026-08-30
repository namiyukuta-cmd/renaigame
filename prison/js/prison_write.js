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

  function loadGameData() {
    gameData = PrisonGame.state.loadCurrent();

    if (!gameData) {
      location.href = "prison.html";
      return false;
    }

    return true;
  }

  function getDraft() {
    const draft = gameData?.letterDraft;

    if (!draft) {
      return {
        date: "",
        body: "",
        signature: "Buchi Usagi"
      };
    }

    return {
      date: draft.date || "",
      body: draft.body || "",
      signature: draft.signature || "Buchi Usagi"
    };
  }

  function renderDraft() {
    const draft = getDraft();

    byId("letterDate").value = draft.date;
    byId("letterBody").value = draft.body;
    byId("letterSignature").value = draft.signature;

    const partnerName =
      gameData?.partner?.name ||
      window.PrisonCharacter001?.name ||
      "Caleb Ward";

    byId("recipientText").textContent = `Dear Mr. ${partnerName},`;
  }

  function saveDraft() {
    gameData = PrisonGame.state.saveCurrent({
      ...gameData,
      letterDraft: {
        date: byId("letterDate").value.trim(),
        body: byId("letterBody").value,
        signature: byId("letterSignature").value.trim()
      }
    });
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

  function renderPartnerLetter(container, letter) {
    container.replaceChildren();

    if (!letter) {
      container.textContent = "まだCalebからの手紙はありません。";
      return;
    }

    const segments = Array.isArray(letter.segments)
      ? letter.segments
      : [];

    if (segments.length === 0) {
      const text = document.createElement("p");
      text.className = "history-text";
      text.textContent = letter.text || "";
      container.appendChild(text);
      return;
    }

    segments.forEach(segment => {
      const pair = document.createElement("div");
      pair.className = "letter-pair";

      const english = document.createElement("p");
      english.className = "letter-en";
      english.textContent = String(segment?.en || "");

      const japanese = document.createElement("p");
      japanese.className = "letter-ja";
      japanese.textContent = String(segment?.ja || "");

      pair.append(english, japanese);
      container.appendChild(pair);
    });
  }

  function openLatestLetter() {
    saveDraft();
    renderPartnerLetter(
      byId("latestLetterContent"),
      getLatestPartnerLetter()
    );
    byId("latestLetterOverlay").classList.add("show");
  }

  function closeLatestLetter() {
    byId("latestLetterOverlay").classList.remove("show");
  }

  function renderHistory() {
    const container = byId("historyContent");
    container.replaceChildren();

    const letters = Array.isArray(gameData?.correspondence?.letters)
      ? gameData.correspondence.letters
      : [];

    if (letters.length === 0) {
      container.textContent = "まだやり取りはありません。";
      return;
    }

    letters.forEach(letter => {
      const card = document.createElement("section");
      card.className = "history-card";

      const header = document.createElement("div");
      header.className = "history-title";
      header.textContent = letter.type === "partner"
        ? `Caleb　${letter.number || ""}通目`
        : `あなた　${letter.number || ""}通目`;
      card.appendChild(header);

      if (
        letter.type === "partner" &&
        Array.isArray(letter.segments) &&
        letter.segments.length > 0
      ) {
        letter.segments.forEach(segment => {
          const pair = document.createElement("div");
          pair.className = "letter-pair";

          const english = document.createElement("p");
          english.className = "letter-en";
          english.textContent = String(segment?.en || "");

          const japanese = document.createElement("p");
          japanese.className = "letter-ja";
          japanese.textContent = String(segment?.ja || "");

          pair.append(english, japanese);
          card.appendChild(pair);
        });
      } else {
        const text = document.createElement("p");
        text.className = "history-text";
        text.textContent = letter.text || "";
        card.appendChild(text);
      }

      container.appendChild(card);
    });
  }

  function openHistory() {
    saveDraft();
    renderHistory();
    byId("historyOverlay").classList.add("show");
  }

  function closeHistory() {
    byId("historyOverlay").classList.remove("show");
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

  function openProfile() {
    saveDraft();
    renderProfile();
    byId("profileOverlay").classList.add("show");
  }

  function closeProfile() {
    byId("profileOverlay").classList.remove("show");
  }

  function buildLetterText() {
    const date = byId("letterDate").value.trim();
    const body = byId("letterBody").value.trim();
    const signature = byId("letterSignature").value.trim();
    const partnerName = gameData?.partner?.name || "Caleb Ward";
    const parts = [];

    if (date) {
      parts.push(date);
    }

    parts.push(`Dear Mr. ${partnerName},`);

    if (body) {
      parts.push(body);
    }

    if (signature) {
      parts.push(signature);
    }

    return parts.join("\n\n");
  }

  function sendLetter() {
    const body = byId("letterBody").value.trim();

    if (!body) {
      showMessage("手紙の本文を入力してください。");
      return;
    }

    const text = buildLetterText();

    gameData = PrisonGame.state.saveCurrent({
      ...gameData,
      playerText: text,
      letterDraft: {
        date: byId("letterDate").value.trim(),
        body: byId("letterBody").value,
        signature: byId("letterSignature").value.trim()
      }
    });

    location.href = "prison_main.html";
  }

  function returnTop() {
    saveDraft();

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
    byId("historyButton").addEventListener("click", openHistory);
    byId("latestLetterButton").addEventListener("click", openLatestLetter);
    byId("closeHistoryButton").addEventListener("click", closeHistory);
    byId("closeLatestLetterButton").addEventListener("click", closeLatestLetter);
    byId("profileButton").addEventListener("click", openProfile);
    byId("closeProfileButton").addEventListener("click", closeProfile);
    byId("topButton").addEventListener("click", returnTop);
    byId("sendButton").addEventListener("click", sendLetter);

    byId("letterDate").addEventListener("change", saveDraft);
    byId("letterSignature").addEventListener("change", saveDraft);
    byId("letterBody").addEventListener("input", saveDraft);

    byId("historyOverlay").addEventListener("click", event => {
      if (event.target === byId("historyOverlay")) {
        closeHistory();
      }
    });

    byId("latestLetterOverlay").addEventListener("click", event => {
      if (event.target === byId("latestLetterOverlay")) {
        closeLatestLetter();
      }
    });

    byId("profileOverlay").addEventListener("click", event => {
      if (event.target === byId("profileOverlay")) {
        closeProfile();
      }
    });
  }

  function init() {
    if (!loadGameData()) {
      return;
    }

    renderDraft();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
