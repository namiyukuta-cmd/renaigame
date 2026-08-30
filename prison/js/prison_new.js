(() => {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function getCharacter() {
    return window.PrisonCharacter001 || null;
  }

  function openProfile() {
    const character = getCharacter();
    const profile = character?.publicProfile;

    if (!profile) {
      return;
    }

    byId("profileContent").innerHTML = "";

    const rows = [
      ["名前", profile.name],
      ["年齢", `${profile.age}歳`],
      ["服役前の仕事", profile.formerOccupation],
      ["罪名", profile.crime],
      ["刑期", profile.sentence],
      ["服役", `${profile.yearsServed}目`],
      ["好きなもの", profile.likes.join("、")]
    ];

    for (const [label, value] of rows) {
      const row = document.createElement("div");
      row.className = "profile-row";

      const labelEl = document.createElement("div");
      labelEl.className = "profile-label";
      labelEl.textContent = label;

      const valueEl = document.createElement("div");
      valueEl.textContent = value;

      row.append(labelEl, valueEl);
      byId("profileContent").appendChild(row);
    }

    const intro = document.createElement("p");
    intro.className = "profile-introduction";
    intro.textContent = profile.introduction;
    byId("profileContent").appendChild(intro);

    byId("profileOverlay").classList.add("show");
  }

  function closeProfile() {
    byId("profileOverlay").classList.remove("show");
  }

  function startGame() {
    const character = getCharacter();

    let state = PrisonGame.state.startNew({
      partner: {
        id: character?.id || "",
        name: character?.name || ""
      },
      progress: {
        stage: "最初の手紙",
        scene: 1
      },
      story: `${character?.name || "相手"}への最初の手紙を書く。`
    });

    if (character) {
      state = PrisonGame.state.setPartner(state, character);
    }

    location.href = "prison_main.html";
  }

  function init() {
    byId("profileButton").addEventListener("click", openProfile);
    byId("closeProfileButton").addEventListener("click", closeProfile);
    byId("nextButton").addEventListener("click", startGame);

    byId("profileOverlay").addEventListener("click", event => {
      if (event.target === byId("profileOverlay")) {
        closeProfile();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
