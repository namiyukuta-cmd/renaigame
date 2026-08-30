(() => {
  "use strict";

  const CONFIG = {
    githubOwner: "namiyukuta-cmd",
    githubRepo: "renaigame",
    githubBranch: "main",
    githubApiVersion: "2022-11-28",
    tokenStorageKey: "renaigame_github_token",
    currentGamePrefix: "renaigame_current_"
  };

  function getGitHubToken() {
    return localStorage.getItem(CONFIG.tokenStorageKey) || "";
  }

  function setGitHubToken(token) {
    const value = String(token || "").trim();

    if (!value) {
      return false;
    }

    localStorage.setItem(CONFIG.tokenStorageKey, value);
    return true;
  }

  function clearGitHubToken() {
    localStorage.removeItem(CONFIG.tokenStorageKey);
  }

  function requestGitHubToken() {
    const current = getGitHubToken();

    if (current) {
      return current;
    }

    const token = window.prompt(
      "GitHubトークンを入力してください。\nこの端末内に保存されます。"
    );

    if (!token) {
      return "";
    }

    setGitHubToken(token);
    return getGitHubToken();
  }

  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(String(text));
    let binary = "";

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary);
  }

  function base64ToUtf8(base64) {
    const binary = atob(String(base64).replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new TextDecoder().decode(bytes);
  }

  function makeGitHubHeaders(token = "", includeContentType = false) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": CONFIG.githubApiVersion
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  function makeContentsUrl(path) {
    const safePath = String(path)
      .split("/")
      .map(part => encodeURIComponent(part))
      .join("/");

    return `https://api.github.com/repos/${CONFIG.githubOwner}/${CONFIG.githubRepo}/contents/${safePath}`;
  }

  async function getGitHubFile(path, options = {}) {
    const token = options.token || getGitHubToken();
    const url = `${makeContentsUrl(path)}?ref=${encodeURIComponent(CONFIG.githubBranch)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: makeGitHubHeaders(token)
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub読み込み失敗: ${response.status}`);
    }

    return response.json();
  }

  async function readJson(path, options = {}) {
    const file = await getGitHubFile(path, options);

    if (!file || !file.content) {
      return null;
    }

    return JSON.parse(base64ToUtf8(file.content));
  }

  async function writeJson(path, data, options = {}) {
    const token = options.token || requestGitHubToken();

    if (!token) {
      throw new Error("GitHubトークンがありません。");
    }

    const currentFile = await getGitHubFile(path, { token });
    const content = JSON.stringify(data, null, 2);

    const body = {
      message: options.message || `Update ${path}`,
      content: utf8ToBase64(content),
      branch: CONFIG.githubBranch
    };

    if (currentFile && currentFile.sha) {
      body.sha = currentFile.sha;
    }

    const response = await fetch(makeContentsUrl(path), {
      method: "PUT",
      headers: makeGitHubHeaders(token, true),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let detail = "";

      try {
        const errorData = await response.json();
        detail = errorData.message ? ` ${errorData.message}` : "";
      } catch (_) {
        // GitHubからJSON以外が返った場合はステータスだけ使う。
      }

      throw new Error(`GitHub保存失敗: ${response.status}${detail}`);
    }

    return response.json();
  }

  function getCurrentGameStorageKey(gameId) {
    return `${CONFIG.currentGamePrefix}${String(gameId)}`;
  }

  function saveCurrentGame(gameId, data) {
    if (!gameId) {
      throw new Error("gameId が必要です。");
    }

    localStorage.setItem(
      getCurrentGameStorageKey(gameId),
      JSON.stringify(data)
    );
  }

  function loadCurrentGame(gameId) {
    if (!gameId) {
      return null;
    }

    const raw = localStorage.getItem(getCurrentGameStorageKey(gameId));

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("現在ゲームデータの読み込みに失敗しました。", error);
      return null;
    }
  }

  function clearCurrentGame(gameId) {
    if (!gameId) {
      return;
    }

    localStorage.removeItem(getCurrentGameStorageKey(gameId));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  window.RenaiGame = Object.freeze({
    config: Object.freeze({ ...CONFIG }),

    github: Object.freeze({
      getToken: getGitHubToken,
      setToken: setGitHubToken,
      clearToken: clearGitHubToken,
      requestToken: requestGitHubToken,
      getFile: getGitHubFile,
      readJson,
      writeJson
    }),

    storage: Object.freeze({
      saveCurrentGame,
      loadCurrentGame,
      clearCurrentGame
    }),

    util: Object.freeze({
      utf8ToBase64,
      base64ToUtf8,
      nowIso
    })
  });
})();
