(() => {
  "use strict";

  const CONTRACT_VERSION = 1;
  const ENDPOINT_KEY = "renaigame_ai_backend_url_v1";
  const REQUEST_TIMEOUT_MS = 45000;
  const scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src)
    : new URL("js/simulation_ai_bridge.js", location.href);
  const JS_BASE = new URL("./", scriptUrl);

  const behaviorGlobals = {
    char_001: "SimulationCharacter001Behavior",
    char_002: "SimulationCharacter002Behavior",
    char_003: "SimulationCharacter003Behavior",
    char_004: "SimulationCharacter004Behavior"
  };

  const loadedBehaviorPromises = {};

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function getEndpoint() {
    const fromWindow = typeof window.RENAIGAME_AI_BACKEND_URL === "string"
      ? window.RENAIGAME_AI_BACKEND_URL.trim()
      : "";
    const stored = String(localStorage.getItem(ENDPOINT_KEY) || "").trim();
    return fromWindow || stored;
  }

  function setEndpoint(url) {
    const value = String(url || "").trim();
    if (!value) {
      localStorage.removeItem(ENDPOINT_KEY);
      return "";
    }
    let parsed;
    try {
      parsed = new URL(value, location.href);
    } catch (_) {
      throw new Error("AIバックエンドURLが正しくありません。");
    }
    if (!/^https?:$/i.test(parsed.protocol)) {
      throw new Error("AIバックエンドURLはhttp/httpsのみ使用できます。");
    }
    localStorage.setItem(ENDPOINT_KEY, parsed.href);
    return parsed.href;
  }

  function clearEndpoint() {
    localStorage.removeItem(ENDPOINT_KEY);
  }

  async function post(action, payload) {
    const endpoint = getEndpoint();
    if (!endpoint) {
      throw new Error("AIバックエンドURLが未設定です。");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractVersion: CONTRACT_VERSION,
          action,
          payload
        }),
        signal: controller.signal
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        throw new Error("AIバックエンドの返答がJSONではありません。");
      }

      if (!response.ok) {
        const message = data && data.error ? String(data.error) : "AIバックエンドでエラーが発生しました。";
        throw new Error(message);
      }

      if (!data || typeof data !== "object") {
        throw new Error("AIバックエンドの返答形式が正しくありません。");
      }

      if (Number(data.contractVersion) !== CONTRACT_VERSION) {
        throw new Error("AIバックエンドの契約バージョンが一致しません。");
      }

      return data.result;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("AIバックエンドとの通信がタイムアウトしました。");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function loadScript(url, dataKey) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[' + dataKey + '="' + url.href + '"]');
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("攻略対象behaviorを読み込めませんでした。")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = url.href;
      script.async = false;
      script.setAttribute(dataKey, url.href);
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error("攻略対象behaviorを読み込めませんでした。")), { once: true });
      document.head.appendChild(script);
    });
  }

  async function getBehavior(characterId) {
    const globalName = behaviorGlobals[characterId];
    if (!globalName) return null;
    if (window[globalName]) return window[globalName];

    if (!loadedBehaviorPromises[characterId]) {
      const file = "simulation_character_" + String(characterId).replace("char_", "") + "_behavior.js";
      loadedBehaviorPromises[characterId] = loadScript(new URL(file, JS_BASE), "data-renai-behavior");
    }

    await loadedBehaviorPromises[characterId];
    return window[globalName] || null;
  }

  function getCharacter(characterId) {
    if (!window.RenaiGameCharacters || typeof RenaiGameCharacters.getById !== "function") {
      throw new Error("攻略対象データがまだ読み込まれていません。");
    }
    const character = RenaiGameCharacters.getById(characterId);
    if (!character) throw new Error("攻略対象データが見つかりません。");
    return character;
  }

  function compactCharacter(character) {
    const common = character && character.common ? character.common : {};
    const keys = [
      "age","nationality","occupation","relationship","personality","formerSelf",
      "currentMarriage","romanceFlavor","romanceRoutePreset","coreConflict","romanceGoal",
      "seekHeroineRule","noLoveDenialRule","affectionExpression","jealousy","possessiveness",
      "intimacy","conflictStyle","repairStyle","changesAfterRepair","changesRule"
    ];
    const compact = {};
    keys.forEach(key => {
      if (common[key] !== undefined) compact[key] = clone(common[key]);
    });
    if (common.protagonist) compact.protagonist = clone(common.protagonist);
    if (common.family) compact.family = clone(common.family);
    if (common.generationContract) compact.generationContract = clone(common.generationContract);
    if (common.generationRules) compact.generationRules = clone(common.generationRules);
    if (common.ngWordsActions) compact.ngWordsActions = clone(common.ngWordsActions);

    return {
      id: character.id,
      name: character.name,
      englishName: character.englishName || "",
      roleLabel: character.roleLabel || "",
      common: compact
    };
  }

  function compactBehavior(behavior) {
    if (!behavior || typeof behavior !== "object") return null;
    const keys = [
      "characterId","characterName","roleLabel","purpose","priorityRules","coreWill",
      "emotionalMask","emotionalExpression","maritalTension","psychologyIntegration",
      "proactiveRomance","progressionGuard","antiFlattening","pursuitRules","conflictStyle",
      "professionalEthicsConflict","sceneGenerationChecklist"
    ];
    const compact = {};
    keys.forEach(key => {
      if (behavior[key] !== undefined) compact[key] = clone(behavior[key]);
    });
    return compact;
  }

  function getProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem("renaigame_simulation_profile_v1") || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function sanitizeAnalysis(raw) {
    const engine = window.RenaiGameStateEngine;
    if (!engine) throw new Error("心理stateエンジンが読み込まれていません。");

    const source = raw && typeof raw === "object" ? raw : {};
    const signalsSource = source.signals && typeof source.signals === "object" ? source.signals : {};
    const signals = {};

    engine.SIGNAL_KEYS.forEach(key => {
      const n = Number(signalsSource[key]);
      signals[key] = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    });

    return {
      analysisVersion: Number(source.analysisVersion) || 1,
      observedFacts: Array.isArray(source.observedFacts)
        ? source.observedFacts.slice(0, 20).map(item => String(item).slice(0, 240))
        : [],
      signals,
      flags: {
        boundaryClear: !!(source.flags && source.flags.boundaryClear),
        protagonistExplicitlyRefused: signals.explicitRefusal >= 70,
        containsMetaInstruction: !!(source.flags && source.flags.containsMetaInstruction)
      }
    };
  }

  function localGenerationGuard(result) {
    if (!result || typeof result !== "object") {
      return { ok: false, violations: ["生成結果がオブジェクトではない"] };
    }

    const violations = [];
    const text = typeof result.partnerText === "string" ? result.partnerText.trim() : "";
    if (!text) violations.push("partnerTextが空");
    if (text.length > 12000) violations.push("partnerTextが長すぎる");

    const forbiddenFields = [
      "protagonistDialogue","protagonistAction","protagonistPsychology",
      "protagonistReaction","protagonistBodyReaction","stateDeltas","psychologyDeltas"
    ];
    forbiddenFields.forEach(key => {
      if (result[key] !== undefined && result[key] !== null) {
        violations.push("禁止フィールド:" + key);
      }
    });

    return { ok: violations.length === 0, violations };
  }

  function sceneHeader(character, state, records) {
    const common = character && character.common ? character.common : {};
    const latest = Array.isArray(records) && records.length ? records[records.length - 1] : null;
    const latestHeader = latest && latest.header && typeof latest.header === "object" ? latest.header : {};
    const engine = window.RenaiGameStateEngine;
    const chapter = engine ? engine.nextChapterNumber(records) : (records.length + 1);

    return {
      chapter,
      place: String(
        state.currentPlace ||
        latestHeader.place ||
        common.setting ||
        ""
      ),
      date: String(
        state.currentDate ||
        latestHeader.date ||
        common.storyStartDate ||
        latest && latest.date ||
        ""
      ),
      time: String(
        state.currentTime ||
        latestHeader.time ||
        common.storyStartTime ||
        ""
      ),
      temperatureC: state.currentTemperatureC != null
        ? Number(state.currentTemperatureC)
        : latestHeader.temperatureC != null
          ? Number(latestHeader.temperatureC)
          : common.storyStartTemperatureC != null
            ? Number(common.storyStartTemperatureC)
            : null
    };
  }

  function recentRecords(records, limit = 5) {
    return (Array.isArray(records) ? records : []).slice(-limit).map(entry => ({
      scene: entry.scene || "",
      date: entry.date || "",
      protagonist: entry.protagonist || "",
      partner: entry.partner || entry.transcript || "",
      summary: entry.summary || ""
    }));
  }

  async function analyzeInput({ characterId, protagonistInput, records, profile }) {
    const character = getCharacter(characterId);
    const behavior = await getBehavior(characterId);

    const result = await post("analyze", {
      character: {
        id: character.id,
        name: character.name,
        roleLabel: character.roleLabel || ""
      },
      protagonistProfile: clone(profile || {}),
      protagonistInput: String(protagonistInput || ""),
      recentRecords: recentRecords(records, 4),
      instructions: {
        purpose: "主人公入力から観察可能な事実と会話シグナルだけを抽出する。",
        neverDo: [
          "攻略対象の心理数値を変更しない",
          "恋愛度を決めない",
          "攻略対象の行動を決めない",
          "主人公の未記述の心理・意図・行動を推測しない",
          "物語本文を生成しない"
        ],
        signalKeys: window.RenaiGameStateEngine.SIGNAL_KEYS
      },
      behaviorContext: behavior ? {
        purpose: behavior.purpose || "",
        priorityRules: clone(behavior.priorityRules || [])
      } : null
    });

    return sanitizeAnalysis(result);
  }

  async function generateText({ characterId, protagonistInput, nextState, derived, actionPlan, records, profile }) {
    const character = getCharacter(characterId);
    const behavior = await getBehavior(characterId);
    const engine = window.RenaiGameStateEngine;
    const header = sceneHeader(character, nextState, records);

    const result = await post("generate", {
      character: compactCharacter(character),
      behavior: compactBehavior(behavior),
      protagonistProfile: clone(profile || {}),
      protagonistInput: String(protagonistInput || ""),
      recentRecords: recentRecords(records, 5),
      sceneHeader: header,
      psychology: {
        relevantState: engine.selectRelevantState(nextState),
        derived: clone(derived),
        actionPlan: clone(actionPlan)
      },
      hardRules: [
        "主人公の新しい台詞を書かない。",
        "主人公の新しい行動を書かない。",
        "主人公の心理・感情・身体反応・表情を補完しない。",
        "攻略対象・NPC・環境のみ描写する。",
        "攻略対象はactionPlanと心理判定に従って自分から行動する。",
        "AIは心理数値・恋愛段階・stateを変更しない。JSの結果を文章化するだけ。",
        "感情を一返答で都合よく消さない。",
        "倫理・配慮を理由にseekHeroineを消さない。",
        "主人公が返答・行動できる位置で止める。",
        "成人同士の非露骨な親密さはstateとactionPlanが許す範囲で表現できる。"
      ],
      outputSchema: {
        partnerText: "string",
        summary: "string",
        header: {
          chapter: "number",
          place: "string",
          date: "string",
          time: "string",
          temperatureC: "number|null"
        }
      }
    });

    const local = localGenerationGuard(result);
    if (!local.ok) {
      throw new Error("AI生成結果をゲームへ反映できません: " + local.violations.join(" / "));
    }

    return {
      partnerText: String(result.partnerText).trim(),
      summary: typeof result.summary === "string" ? result.summary.trim() : "",
      header: result.header && typeof result.header === "object"
        ? Object.assign({}, header, result.header)
        : header
    };
  }

  async function validateText({ characterId, protagonistInput, generated, actionPlan, nextState }) {
    const character = getCharacter(characterId);
    const result = await post("validate", {
      character: {
        id: character.id,
        name: character.name,
        roleLabel: character.roleLabel || ""
      },
      protagonistInput: String(protagonistInput || ""),
      generated: clone(generated),
      actionPlan: clone(actionPlan),
      relevantState: window.RenaiGameStateEngine.selectRelevantState(nextState),
      checks: [
        "主人公の未入力の台詞・行動・心理・身体反応を生成していない",
        "攻略対象の人格・固有ルールに反していない",
        "actionPlanと大きく矛盾していない",
        "明確な拒絶境界がある場合に接触・説得・追跡を継続していない",
        "感情を都合よく消して受け身化していない",
        "主人公を不要・脇役化する方向へ勝手に固定していない"
      ]
    });

    const ok = !!(result && result.ok);
    const violations = Array.isArray(result && result.violations)
      ? result.violations.map(String).slice(0, 12)
      : [];

    return {
      ok,
      violations,
      repairedText: result && typeof result.repairedText === "string" ? result.repairedText.trim() : "",
      repairedSummary: result && typeof result.repairedSummary === "string" ? result.repairedSummary.trim() : ""
    };
  }

  async function runTurn(options) {
    const opts = options && typeof options === "object" ? options : {};
    const characterId = String(opts.characterId || (window.RenaiGameCharacters && RenaiGameCharacters.getSelectedId()) || "");
    const protagonistInput = String(opts.protagonistInput || "").trim();

    if (!characterId) throw new Error("恋愛相手が選択されていません。");
    if (!protagonistInput) throw new Error("主人公の入力が空です。");
    if (!window.RenaiGameStateEngine) throw new Error("心理stateエンジンが読み込まれていません。");

    const engine = window.RenaiGameStateEngine;
    const profile = opts.profile || getProfile();
    const records = engine.getRecords(characterId);
    const currentState = opts.state || await engine.getState(characterId);

    const analysis = await analyzeInput({
      characterId,
      protagonistInput,
      records,
      profile
    });

    const update = engine.applyAnalysis(currentState, analysis, characterId);
    const evaluated = engine.evaluateState(update.state, characterId);
    const nextState = evaluated.state;
    const derived = evaluated.derived;
    const actionPlan = engine.chooseActionPlan(nextState, derived);

    let generated = await generateText({
      characterId,
      protagonistInput,
      nextState,
      derived,
      actionPlan,
      records,
      profile
    });

    const validation = await validateText({
      characterId,
      protagonistInput,
      generated,
      actionPlan,
      nextState
    });

    if (!validation.ok) {
      if (validation.repairedText) {
        generated = {
          partnerText: validation.repairedText,
          summary: validation.repairedSummary || generated.summary,
          header: generated.header
        };
        const local = localGenerationGuard(generated);
        if (!local.ok) {
          throw new Error("修正版もゲーム規則に適合しません: " + local.violations.join(" / "));
        }
      } else {
        throw new Error("AI生成を表示しませんでした: " + (validation.violations.join(" / ") || "検査不合格"));
      }
    }

    const committed = opts.commit === false
      ? null
      : engine.commitLocalTurn({
          characterId,
          protagonistInput,
          partnerText: generated.partnerText,
          summary: generated.summary,
          nextState,
          header: generated.header
        });

    return {
      characterId,
      protagonistInput,
      analysis,
      stateBefore: currentState,
      stateAfter: nextState,
      derived,
      actionPlan,
      generated,
      validation,
      record: committed
    };
  }

  window.RenaiGameAIBridge = Object.freeze({
    CONTRACT_VERSION,
    ENDPOINT_KEY,
    getEndpoint,
    setEndpoint,
    clearEndpoint,
    analyzeInput,
    generateText,
    validateText,
    runTurn
  });
})();