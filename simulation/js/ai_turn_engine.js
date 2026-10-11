/*
 * 恋愛シミュレーション：1ターン心理計算・検証器
 * 既存の心理JS / セーブ形式は変更しない。
 * Browser: window.RenaiGameTurnEngine
 * Node: require("./ai_turn_engine.js")
 */
(function (root) {
  "use strict";

  const FUNCTION_NAMES = Object.freeze([
    "normalizeState",
    "evaluateRomanceOnset",
    "evaluateConflict",
    "evaluateApproachAvoidance",
    "evaluateAttachmentTension",
    "evaluateRepairDrive",
    "evaluateIntimacyInitiative"
  ]);

  function fail(message) {
    throw new Error("AIターン検証失敗: " + message);
  }

  function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function stable(value) {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (record(value)) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
    }
    return JSON.stringify(value);
  }

  // 破損・食い違いの検出用。認証用署名ではない。
  function fingerprint(value) {
    const input = stable(value);
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function requirePsychology(psychology) {
    if (!record(psychology) || !record(psychology.stateDefaults)) {
      fail("renaigame_psychology_parameters.js がありません");
    }
    for (const name of FUNCTION_NAMES) {
      if (typeof psychology[name] !== "function") fail(name + " が実装されていません");
    }
  }

  function getCurrentState(stateEntry) {
    if (!record(stateEntry)) fail("現在セーブのstateがありません");
    if (Object.prototype.hasOwnProperty.call(stateEntry, "currentState")) {
      if (!record(stateEntry.currentState)) fail("currentStateが不正です");
      return stateEntry.currentState;
    }
    return stateEntry; // 既存のflat stateとの互換性
  }

  function ensureSources(args) {
    if (!record(args)) fail("入力が不正です");
    if (typeof args.saveId !== "string" || !args.saveId || !/^(?:[A-Za-z0-9_-]{1,120}|__unsaved__)$/.test(args.saveId)) {
      fail("saveIdを明示してください。最新セーブへの代用は禁止です");
    }
    if (!/^char_\d{3}$/.test(args.characterId || "")) fail("characterIdが不正です");
    if (!record(args.character) || args.character.id !== args.characterId) {
      fail("人物JSとcharacterIdが一致しません");
    }
    if (!record(args.behavior) || args.behavior.characterId !== args.characterId) {
      fail("行動JSとcharacterIdが一致しません");
    }
    if (!Array.isArray(args.records)) fail("現在saveIdの実ログが必要です（新規周回は空配列）");
    if (typeof args.protagonistInput !== "string" || !args.protagonistInput.trim()) {
      fail("今回の主人公入力がありません");
    }
    requirePsychology(args.psychology);
    const raw = getCurrentState(args.stateEntry);
    const critical = ["seekHeroine", "pursuitDrive", "physicalNeed", "passion", "reason", "selfControl", "ethics"];
    const missing = critical.filter(key => typeof raw[key] !== "number" || !Number.isFinite(raw[key]));
    if (missing.length) {
      fail("旧セーブで主要心理項目が不足しています: " + missing.join(", ") + "。0として補完せず、実ログに基づいて移行したstateを渡してください");
    }
    if (raw.characterId && raw.characterId !== args.characterId) {
      fail("stateのcharacterIdと指定攻略対象が一致しません");
    }
    return raw;
  }

  function ensureChanges(changes, evidence, input, psychology) {
    if (!record(changes) || !record(evidence)) fail("changesとevidenceをオブジェクトで指定してください");
    const permitted = new Set([...Object.keys(psychology.stateDefaults), "romanceScore"]);
    const checked = {};
    const cites = {};
    for (const key of Object.keys(changes)) {
      if (!permitted.has(key)) fail("心理変化に使用できない項目: " + key);
      const value = changes[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < -100 || value > 100) {
        fail(key + " の変化量は有限数値（-100〜100）が必要です");
      }
      if (value === 0) continue;
      const quote = evidence[key];
      if (typeof quote !== "string" || !quote.trim() || !input.includes(quote)) {
        fail(key + " の変化根拠が今回入力の原文に存在しません");
      }
      checked[key] = value;
      cites[key] = quote;
    }
    return { changes: checked, evidence: cites };
  }

  function transitionStage(raw, transition, input, after) {
    if (transition === null || transition === undefined) return null;
    if (!record(transition)) fail("stageTransitionが不正です");
    const from = Number(raw.stage);
    if (!Number.isInteger(from) || !Number.isInteger(transition.to) ||
        transition.to < 1 || transition.to > 7 || transition.to !== from + 1) {
      fail("恋愛段階は現在段階から1段階ずつ進行してください");
    }
    const stageNames = {1: ["警戒"], 2: ["興味"], 3: ["親しさ", "親しみ"], 4: ["意識"], 5: ["欲求"], 6: ["告白前"], 7: ["交際", "交際後"]};
    if (!stageNames[transition.to].includes(transition.stageName)) {
      fail("stageとstageNameが一致しません");
    }
    if (typeof transition.evidence !== "string" || !transition.evidence.trim() ||
        !input.includes(transition.evidence)) {
      fail("段階変更の根拠は主人公の今回入力に存在する原文が必要です");
    }
    after.stage = transition.to;
    after.stageName = transition.stageName;
    return clone(transition);
  }

  function runTurn(args) {
    const raw = ensureSources(args);
    const psychology = args.psychology;
    const before = psychology.normalizeState(clone(raw), args.characterId);
    const input = args.protagonistInput;
    const checked = ensureChanges(args.changes, args.evidence, input, psychology);
    const afterDraft = clone(before);
    for (const [key, delta] of Object.entries(checked.changes)) {
      const current = Number(afterDraft[key]);
      if (!Number.isFinite(current)) fail(key + " の変更前値が数値ではありません");
      afterDraft[key] = Math.max(0, Math.min(100, current + delta));
    }
    const stageTransition = transitionStage(raw, args.stageTransition, input, afterDraft);
    const after = psychology.normalizeState(afterDraft, args.characterId);
    const evaluations = {};
    const invoked = [];
    for (const name of FUNCTION_NAMES.slice(1)) {
      evaluations[name] = psychology[name](after, args.characterId);
      if (!record(evaluations[name])) fail(name + " の計算結果が不正です");
      invoked.push(name);
    }
    const packet = {
      version: 1,
      saveId: args.saveId,
      characterId: args.characterId,
      protagonistInput: input,
      changes: checked.changes,
      evidence: checked.evidence,
      stageTransition,
      before,
      after,
      evaluations,
      sources: {
        character: fingerprint(args.character),
        behavior: fingerprint(args.behavior),
        before: fingerprint(raw),
        records: fingerprint(args.records),
        psychologyVersion: psychology.version
      },
      execution: {
        normalizedBefore: true,
        normalizedAfter: true,
        invoked,
        status: "executed"
      }
    };
    packet.fingerprint = fingerprint(packet);
    return packet;
  }

  function verifyTurn(args, packet) {
    try {
      if (!record(packet) || packet.version !== 1) fail("パケットが不正です");
      if (!record(args) || args.saveId !== packet.saveId || args.characterId !== packet.characterId ||
          args.protagonistInput !== packet.protagonistInput) {
        fail("現在のsaveId・攻略対象・主人公入力とパケットが一致しません");
      }
      const recomputed = runTurn({
        ...args,
        saveId: packet.saveId,
        characterId: packet.characterId,
        protagonistInput: packet.protagonistInput,
        changes: packet.changes,
        evidence: packet.evidence,
        stageTransition: packet.stageTransition
      });
      const matches = stable(packet) === stable(recomputed);
      return {
        ok: matches,
        errors: matches ? [] : ["JSの再計算結果と生成用パケットが一致しません"],
        replayFingerprint: recomputed.fingerprint
      };
    } catch (error) {
      return { ok: false, errors: [error.message], replayFingerprint: null };
    }
  }

  function validateStory(args, packet, story) {
    const verified = verifyTurn(args, packet);
    const errors = [...verified.errors];
    const warnings = [];
    if (typeof story !== "string" || !story.trim()) {
      errors.push("本文が空です");
    } else {
      const lines = story.trim().split(/\r?\n/);
      if (!/^Chapter\s+\d+\s*$/.test(lines[0].trim())) {
        errors.push("Chapterヘッダがありません");
      }
      const detail = (lines[1] || "").trim();
      if (!detail.includes("／") || !detail.includes("℃")) {
        errors.push("場所／日付／時間／気温のヘッダ形式を確認してください");
      }
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*“/.test(lines[i]) && !/^\s*「/.test(lines[i + 1] || "")) {
          errors.push("英語台詞の直後に日本語訳がありません（" + (i + 1) + "行）");
        }
      }
      if (/(?:normalizeState|evaluateConflict|stateHistory|生成用パケット)/.test(story)) {
        warnings.push("小説本文に内部計算用語が見つかりました");
      }
      if (/(?:主人公|彼女|あなた)は[^。\n]{0,35}(?:うなず|頷|微笑|抱き返|キスを返)/.test(story)) {
        warnings.push("主人公の未入力行動が書かれていないか手動で確認してください");
      }
      if (/(?:どうしますか[？?]|次はどうする[？?])/.test(story)) {
        warnings.push("物語末尾のメタ質問を確認してください");
      }
    }
    return {
      ok: errors.length === 0,
      errors,
      warnings,
      replayFingerprint: verified.replayFingerprint,
      // 内容・心理描写・主人公の勝手な補完は機械検査だけで完全保証できない。
      requiresSemanticReview: true
    };
  }

  const api = Object.freeze({
    version: 1,
    functionNames: FUNCTION_NAMES,
    runTurn,
    verifyTurn,
    validateStory,
    fingerprint
  });
  root.RenaiGameTurnEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
