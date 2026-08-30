(() => {
  "use strict";

  if (!window.RenaiGame) {
    throw new Error("renaigame_common.js を先に読み込んでください。");
  }

  if (!window.PrisonGame) {
    throw new Error("prison_common.js を先に読み込んでください。");
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function setSlotDisplay(button, info) {
    const detail = button.querySelector(".save-info");

    if (!info?.exists) {
      detail.textContent = "セーブデータなし";
      detail.classList.add("empty");
      button.disabled = true;
      return;
    }

    const lines = [];

    if (info.partnerName) {
      lines.push(info.partnerName);
    }

    if (info.stage) {
      lines.push(info.stage);
    }

    const savedAt = formatDate(info.savedAt);
    if (savedAt) {
      lines.push(savedAt);
    }

    detail.textContent = lines.join(" / ") || "セーブデータあり";
    detail.classList.remove("empty");
    button.disabled = false;
  }

  async function loadSlot(slotNumber) {
    try {
      const data = await PrisonGame.saves.load(slotNumber);

      if (!data) {
        return;
      }

      location.href = "prison_main.html";
    } catch (error) {
      console.error(error);
      window.alert(error?.message || "セーブデータの読み込みに失敗しました。");
    }
  }

  async function init() {
    const buttons = Array.from(document.querySelectorAll("[data-save-slot]"));

    buttons.forEach(button => {
      button.disabled = true;
      const detail = button.querySelector(".save-info");
      detail.textContent = "読み込み中…";
      detail.classList.add("empty");
    });

    try {
      const slots = await PrisonGame.saves.getAll(buttons.length);

      buttons.forEach(button => {
        const slotNumber = Number(button.dataset.saveSlot);
        const info = slots.find(item => item.slot === slotNumber);

        setSlotDisplay(button, info);

        button.addEventListener("click", () => {
          loadSlot(slotNumber);
        });
      });
    } catch (error) {
      console.error(error);
      buttons.forEach(button => {
        const detail = button.querySelector(".save-info");
        detail.textContent = "読み込み失敗";
        detail.classList.add("empty");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
