(() => {
  "use strict";

  const STATE_PATH = "state/simulation_character_001_state.json";

  async function loadRecordState() {
    const response = await fetch(STATE_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("記録を読み込めませんでした。");
    }
    return response.json();
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
        <div id="recordList" class="record-list">読み込み中…</div>
      </section>
    `;

    const list = document.getElementById("recordList");

    try {
      const state = await loadRecordState();
      const history = Array.isArray(state.history) ? state.history : [];

      list.innerHTML = "";

      if (!history.length) {
        list.textContent = "まだ記録はありません。";
        return;
      }

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

        appendTextBlock(article, "record-block", "美織", entry.protagonist);
        appendTextBlock(article, "record-block", "アレクサンダー", entry.alexander);
        appendTextBlock(article, "record-block record-summary", "要約", entry.summary);

        list.appendChild(article);
      });
    } catch (error) {
      list.textContent = error.message || "記録を読み込めませんでした。";
    }
  }

  window.RenaiGameRecord = {
    render
  };
})();
