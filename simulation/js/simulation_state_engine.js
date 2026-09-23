(() => {
  "use strict";

  const SESSION_KEY = "renaigame_simulation_session_v1";
  const PSYCHOLOGY = () => window.RenaiGamePsychologyParameters || null;
  const scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src)
    : new URL("js/simulation_state_engine.js", location.href);
  const TEMPLATE_BASE = new URL("../state/templates/", scriptUrl);

  const SIGNAL_KEYS = Object.freeze([
    "affection",
    "praise",
    "trust",
    "vulnerability",
    "reassuranceRequest",
    "relationshipQuestion",
    "distancing",
    "rejection",
    "explicitRefusal",
    "breakupThreat",
    "conflict",
    "accusation",
    "apology",
    "repairOffer",
    "jealousyTrigger",
    "rivalPresence",
    "intimacyInvitation",
    "affectionateTouch",
    "kissSignal",
    "futureCommitment",
    "uncertainty",
    "absence",
    "returnAfterDistance"
  ]);

  const CRITICAL_STATE_KEYS = Object.freeze([
    "stage","stageName","romanceScore","seekHeroine","pursuitDrive","attachment","trust",
    "romanticAwareness","passion","longing","emotionalNeed","physicalNeed",
    "jealousy","possessiveness","controlUrge","fearOfLoss","abandonmentFear",
    "hurt","sadness","anger","frustration","resentment","loneliness",
    "repairDrive","apologyImpulse","forgivenessReadiness","stubbornResistance",
    "approachImpulse","withdrawalImpulse","returnImpulse","clingImpulse",
    "needForReciprocity","needForClarity","reassuranceSeeking",
    "touchImpulse","embraceImpulse","kissImpulse","privateTimeWish","reluctanceToPart",
    "invitationImpulse","sexualIntimacyWish","confessionImpulse",
    "reason","selfControl","ethics","socialRestraint","respectForHeroine",
    "emotionalPressure","stress","fatigue","pride","shame","guilt","hesitation",
    "perceivedAffection","perceivedRejection","perceivedBondThreat","perceivedRivalThreat",
    "certaintyOfHerAffection","certaintyOfOwnFeelings","relationshipHope",
    "fearOfRejection","missedChanceFear","romanticMomentum","latentAffection",
    "boundaryState","unresolvedEmotion"
  ]);

  function clamp(value, min = 0, max = 100) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function objectMap(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function normalizeSession(raw) {
    const source = objectMap(raw);
    return {
      id: typeof source.id === "string" && source.id
        ? source.id
        : "run_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      recordsByCharacter: objectMap(source.recordsByCharacter),
      statesByCharacter: objectMap(source.statesByCharacter)
    };
  }

  function readSession() {
    try {
      return normalizeSession(JSON.parse(localStorage.getItem(SESSION_KEY) || "null"));
    } catch (_) {
      return normalizeSession(null);
    }
  }

  function writeSession(session) {
    const normalized = normalizeSession(session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    return normalized;
  }

  async function loadTemplate(characterId) {
    const safeId = String(characterId || "").match(/^char_\d{3}$/);
    if (!safeId) throw new Error("攻略対象IDが正しくありません。");
    const url = new URL(safeId[0] + "_initial_state.json", TEMPLATE_BASE);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("初期心理stateを読み込めませんでした。");
    return response.json();
  }

  async function getState(characterId) {
    const session = readSession();
    const saved = session.statesByCharacter[characterId];
    const raw = saved && typeof saved === "object" ? clone(saved) : await loadTemplate(characterId);
    const psychology = PSYCHOLOGY();
    return psychology && typeof psychology.normalizeState === "function"
      ? psychology.normalizeState(raw, characterId)
      : raw;
  }

  function setState(characterId, nextState) {
    const session = readSession();
    session.statesByCharacter[characterId] = clone(nextState);
    writeSession(session);
    return clone(session.statesByCharacter[characterId]);
  }

  function getRecords(characterId) {
    const session = readSession();
    const records = session.recordsByCharacter[characterId];
    return Array.isArray(records) ? clone(records) : [];
  }

  function signalValue(analysis, key) {
    return clamp(analysis && analysis.signals ? analysis.signals[key] : 0);
  }

  function trait(state, key, fallback = 50) {
    const traits = state && state.psychologyTraits ? state.psychologyTraits : {};
    return clamp(traits[key] == null ? fallback : traits[key]);
  }

  function add(state, key, delta) {
    if (!Number.isFinite(delta) || delta === 0) return;
    state[key] = clamp((Number(state[key]) || 0) + delta);
  }

  function lower(state, key, delta) {
    add(state, key, -Math.abs(delta));
  }

  function weight(signal, maxDelta, sensitivity = 50) {
    const s = clamp(signal) / 100;
    const traitFactor = 0.65 + (clamp(sensitivity) / 100) * 0.7;
    return s * maxDelta * traitFactor;
  }

  function applyAnalysis(rawState, analysis, characterId) {
    const psychology = PSYCHOLOGY();
    let state = psychology && psychology.normalizeState
      ? psychology.normalizeState(clone(rawState || {}), characterId)
      : clone(rawState || {});

    const rejectionSensitivity = trait(state, "rejectionSensitivityTrait");
    const jealousySensitivity = trait(state, "jealousySensitivity");
    const repairTendency = trait(state, "repairTendency");
    const closenessNeed = trait(state, "closenessNeedTrait");
    const shameSensitivity = trait(state, "shameSensitivity");
    const angerReactivity = trait(state, "angerReactivity");
    const forgivenessTendency = trait(state, "forgivenessTendency");

    const affection = signalValue(analysis, "affection");
    const praise = signalValue(analysis, "praise");
    const trustSignal = signalValue(analysis, "trust");
    const vulnerabilitySignal = signalValue(analysis, "vulnerability");
    const reassurance = signalValue(analysis, "reassuranceRequest");
    const relationshipQuestion = signalValue(analysis, "relationshipQuestion");
    const distancing = signalValue(analysis, "distancing");
    const rejection = signalValue(analysis, "rejection");
    const explicitRefusal = signalValue(analysis, "explicitRefusal");
    const breakupThreat = signalValue(analysis, "breakupThreat");
    const conflict = signalValue(analysis, "conflict");
    const accusation = signalValue(analysis, "accusation");
    const apology = signalValue(analysis, "apology");
    const repairOffer = signalValue(analysis, "repairOffer");
    const jealousyTrigger = signalValue(analysis, "jealousyTrigger");
    const rivalPresence = signalValue(analysis, "rivalPresence");
    const intimacyInvitation = signalValue(analysis, "intimacyInvitation");
    const affectionateTouch = signalValue(analysis, "affectionateTouch");
    const kissSignal = signalValue(analysis, "kissSignal");
    const futureCommitment = signalValue(analysis, "futureCommitment");
    const uncertainty = signalValue(analysis, "uncertainty");
    const absence = signalValue(analysis, "absence");
    const returnAfterDistance = signalValue(analysis, "returnAfterDistance");

    // Positive attachment. AI never chooses these deltas; JS owns the mapping.
    add(state, "trust", weight(trustSignal + affection * 0.35, 10, 60));
    add(state, "perceivedAffection", weight(affection + praise * 0.45, 16, closenessNeed));
    add(state, "certaintyOfHerAffection", weight(affection + futureCommitment * 0.5, 11, closenessNeed));
    add(state, "joy", weight(affection + praise * 0.5, 14, 55));
    add(state, "relief", weight(affection + repairOffer * 0.6, 10, 55));
    add(state, "relationshipHope", weight(affection + repairOffer + futureCommitment, 10, 60));
    add(state, "romanticConfidence", weight(praise + affection * 0.5, 8, 55));
    add(state, "perceivedSafety", weight(trustSignal + vulnerabilitySignal * 0.5, 9, 60));
    add(state, "tenderness", weight(vulnerabilitySignal + affection * 0.4, 9, trait(state, "tendernessTendency")));
    add(state, "empathy", weight(vulnerabilitySignal, 6, 60));

    // Being asked for reassurance should pull the character toward the heroine, not erase romance.
    add(state, "reassuranceSeeking", weight(reassurance + relationshipQuestion, 15, trait(state, "reassuranceNeedTendency")));
    add(state, "needForClarity", weight(reassurance + relationshipQuestion + uncertainty, 13, 60));
    add(state, "seekHeroine", weight(reassurance + relationshipQuestion, 5, trait(state, "pursuitTendency")));
    add(state, "approachImpulse", weight(reassurance + relationshipQuestion, 8, trait(state, "pursuitTendency")));

    // Distance/rejection hurts and raises loss pressure. Feelings remain; explicit refusal controls behavior separately.
    add(state, "hurt", weight(rejection + distancing * 0.5 + accusation * 0.45, 18, rejectionSensitivity));
    add(state, "rejectionPain", weight(rejection + explicitRefusal, 18, rejectionSensitivity));
    add(state, "perceivedRejection", weight(rejection + explicitRefusal + distancing * 0.45, 20, rejectionSensitivity));
    add(state, "fearOfRejection", weight(rejection + explicitRefusal, 14, rejectionSensitivity));
    add(state, "fearOfLoss", weight(distancing + breakupThreat + absence * 0.35, 18, trait(state, "abandonmentSensitivity")));
    add(state, "separationDistress", weight(distancing + breakupThreat + absence, 17, trait(state, "attachmentAnxiety")));
    add(state, "perceivedBondThreat", weight(distancing + breakupThreat + rejection * 0.5, 20, trait(state, "attachmentAnxiety")));
    add(state, "longing", weight(absence + distancing * 0.45, 12, closenessNeed));
    add(state, "returnImpulse", weight(distancing + returnAfterDistance + breakupThreat * 0.4, 12, trait(state, "pursuitTendency")));
    add(state, "missedChanceFear", weight(breakupThreat + distancing, 12, rejectionSensitivity));

    // Conflict can coexist with attachment.
    add(state, "anger", weight(conflict + accusation * 0.7, 15, angerReactivity));
    add(state, "frustration", weight(conflict + accusation, 15, angerReactivity));
    add(state, "resentment", weight(conflict + accusation * 0.5, 10, trait(state, "grudgeTendency")));
    add(state, "unresolvedConflictWeight", weight(conflict + accusation, 18, trait(state, "memoryOfHurtPersistence")));
    add(state, "confrontationDrive", weight(conflict + accusation + relationshipQuestion * 0.35, 12, trait(state, "assertiveness")));
    add(state, "emotionalPressure", weight(conflict + rejection + breakupThreat, 14, trait(state, "emotionalVolatility")));

    // Apology and repair reduce pain gradually; they never zero it instantly.
    add(state, "repairDrive", weight(apology + repairOffer + returnAfterDistance, 16, repairTendency));
    add(state, "forgivenessReadiness", weight(apology + repairOffer, 14, forgivenessTendency));
    add(state, "apologyImpulse", weight(repairOffer * 0.5, 7, repairTendency));
    lower(state, "resentment", weight(apology + repairOffer, 8, forgivenessTendency));
    lower(state, "unresolvedConflictWeight", weight(apology + repairOffer, 7, forgivenessTendency));
    lower(state, "hurt", weight(apology + repairOffer, 5, forgivenessTendency));
    lower(state, "perceivedRejection", weight(returnAfterDistance + affection, 8, 55));

    // Jealousy.
    add(state, "jealousy", weight(jealousyTrigger + rivalPresence, 20, jealousySensitivity));
    add(state, "possessiveness", weight(jealousyTrigger + rivalPresence, 10, trait(state, "possessiveTendency")));
    add(state, "rivalry", weight(rivalPresence, 14, jealousySensitivity));
    add(state, "perceivedRivalThreat", weight(jealousyTrigger + rivalPresence, 18, jealousySensitivity));
    add(state, "exclusivityNeed", weight(jealousyTrigger + rivalPresence, 11, trait(state, "possessiveTendency")));

    // Intimacy.
    add(state, "physicalNeed", weight(intimacyInvitation + affectionateTouch + kissSignal, 13, trait(state, "physicalInitiative")));
    add(state, "touchImpulse", weight(intimacyInvitation + affectionateTouch, 14, trait(state, "physicalInitiative")));
    add(state, "embraceImpulse", weight(affectionateTouch + intimacyInvitation * 0.5, 12, trait(state, "physicalInitiative")));
    add(state, "kissImpulse", weight(kissSignal + intimacyInvitation * 0.5, 15, trait(state, "physicalInitiative")));
    add(state, "privateTimeWish", weight(intimacyInvitation + affection * 0.25, 12, closenessNeed));
    add(state, "sexualIntimacyWish", weight(intimacyInvitation + kissSignal * 0.7, 12, trait(state, "sexualDirectness")));
    add(state, "passion", weight(intimacyInvitation + kissSignal + affection * 0.3, 9, trait(state, "chemistrySensitivity")));

    // Future / uncertainty.
    add(state, "futureThinking", weight(futureCommitment, 15, 60));
    add(state, "attachment", weight(futureCommitment + affection * 0.25 + returnAfterDistance * 0.35, 8, closenessNeed));
    add(state, "needForReciprocity", weight(futureCommitment + reassurance * 0.5, 8, closenessNeed));
    add(state, "anxiety", weight(uncertainty + breakupThreat, 13, rejectionSensitivity));
    add(state, "confusion", weight(uncertainty, 12, 55));
    add(state, "hesitation", weight(uncertainty + rejection * 0.4, 10, shameSensitivity));

    // Long-term romantic movement.
    add(state, "memoryFrequency", weight(affection + intimacyInvitation + conflict * 0.25, 6, trait(state, "ruminationTendency")));
    add(state, "spontaneousThought", weight(affection + intimacyInvitation + absence * 0.45, 6, trait(state, "ruminationTendency")));
    add(state, "anticipation", weight(affection + futureCommitment + returnAfterDistance, 8, 55));
    add(state, "romanticMomentum", weight(affection + intimacyInvitation + futureCommitment + repairOffer * 0.4, 8, 55));
    add(state, "latentAffection", weight(affection + intimacyInvitation * 0.4, 5, closenessNeed));

    // Explicit refusal is a behavioral boundary, not a magic eraser for feelings.
    if (explicitRefusal >= 70) {
      state.boundaryState = {
        active: true,
        type: "explicit_refusal",
        strength: Math.round(explicitRefusal),
        rule: "接触・説得・追跡を継続しない。感情は保持する。"
      };
      state.pursuitDrive = 0;
      state.touchImpulse = 0;
      state.hairTouchImpulse = 0;
      state.handTouchImpulse = 0;
      state.embraceImpulse = 0;
      state.kissImpulse = 0;
      state.invitationImpulse = 0;
    } else if (returnAfterDistance >= 70 || repairOffer >= 70) {
      if (state.boundaryState && state.boundaryState.type === "explicit_refusal") {
        // Do not infer consent from reconciliation. Only clear if analyzer explicitly says boundaryClear.
        if (analysis && analysis.flags && analysis.flags.boundaryClear === true) {
          state.boundaryState = { active: false, type: "cleared", strength: 0 };
        }
      }
    }

    if (analysis && analysis.flags && analysis.flags.boundaryClear === true) {
      state.boundaryState = { active: false, type: "cleared", strength: 0 };
    }

    state.lastInputAnalysis = {
      version: Number(analysis && analysis.analysisVersion) || 1,
      observedFacts: Array.isArray(analysis && analysis.observedFacts)
        ? analysis.observedFacts.slice(0, 20).map(String)
        : [],
      signals: SIGNAL_KEYS.reduce((acc, key) => {
        acc[key] = signalValue(analysis, key);
        return acc;
      }, {}),
      flags: objectMap(analysis && analysis.flags)
    };

    if (psychology && typeof psychology.normalizeState === "function") {
      state = psychology.normalizeState(state, characterId);
    }

    const derived = evaluateState(state, characterId);
    return { state, derived };
  }

  function evaluateState(rawState, characterId) {
    const psychology = PSYCHOLOGY();
    const state = psychology && psychology.normalizeState
      ? psychology.normalizeState(clone(rawState || {}), characterId)
      : clone(rawState || {});

    const derived = {
      romanceOnset: psychology && psychology.evaluateRomanceOnset
        ? psychology.evaluateRomanceOnset(state, characterId)
        : null,
      conflict: psychology && psychology.evaluateConflict
        ? psychology.evaluateConflict(state, characterId)
        : null,
      approachAvoidance: psychology && psychology.evaluateApproachAvoidance
        ? psychology.evaluateApproachAvoidance(state, characterId)
        : null,
      attachmentTension: psychology && psychology.evaluateAttachmentTension
        ? psychology.evaluateAttachmentTension(state, characterId)
        : null,
      repair: psychology && psychology.evaluateRepairDrive
        ? psychology.evaluateRepairDrive(state, characterId)
        : null,
      intimacy: psychology && psychology.evaluateIntimacyInitiative
        ? psychology.evaluateIntimacyInitiative(state, characterId)
        : null
    };

    state.lastRomanceOnsetEvaluation = derived.romanceOnset;
    state.lastPsychologyConflict = derived.conflict;
    state.lastApproachAvoidance = derived.approachAvoidance;
    state.lastAttachmentTension = derived.attachmentTension;
    state.lastRepairEvaluation = derived.repair;
    state.lastIntimacyInitiative = derived.intimacy;

    return { state, derived };
  }

  function chooseActionPlan(rawState, derived) {
    const state = rawState || {};
    const plan = [];
    const boundary = state.boundaryState;

    if (boundary && boundary.active) {
      return {
        mode: "respect_boundary",
        must: ["明確な拒絶境界を守る", "追跡・説得・身体接触を続けない"],
        may: ["傷つき・未練・嫉妬・悲しみは内面に残してよい"],
        mustNot: ["主人公の拒絶を覆そうとする", "主人公の受諾や心理を勝手に書く"]
      };
    }

    if (derived && derived.repair) {
      if (derived.repair.mode === "repair_now") plan.push("自分から関係修復へ動く");
      if (derived.repair.mode === "repair_cautiously") plan.push("傷を残したまま慎重に修復を試みる");
      if (derived.repair.mode === "repair_conflicted") plan.push("仲直りしたい気持ちと意地の両方を出す");
      if (derived.repair.mode === "wants_repair_but_resists") plan.push("関係を捨てず、すぐには折れない");
    }

    if (derived && derived.approachAvoidance) {
      if (derived.approachAvoidance.mode === "approach") plan.push("攻略対象側から明確に近づく");
      if (derived.approachAvoidance.mode === "approach_with_fear") plan.push("拒絶不安を抱えたまま自分から近づく");
      if (derived.approachAvoidance.mode === "push_pull") plan.push("近づきたい／逃げたいの揺れを同じ場面に残す");
      if (derived.approachAvoidance.mode === "withdraw_but_attached") plan.push("一時的に距離を取っても愛着は消さない");
    }

    if (derived && derived.intimacy) {
      if (derived.intimacy.mode === "direct_initiative") plan.push("性格と段階が許す軽い接触・誘いを自分から起こす");
      if (derived.intimacy.mode === "clear_signal") plan.push("帰したくない・二人でいたい等を明確に示す");
      if (derived.intimacy.mode === "indirect_signal") plan.push("親密欲求を遠回しに漏らす");
      if (derived.intimacy.mode === "suppressed_desire") plan.push("欲求はあるが抑えていることを視線・間・言い淀みで残す");
    }

    if ((Number(state.needForClarity) || 0) >= 60) plan.push("曖昧な関係や発言の意味を確認する");
    if ((Number(state.reassuranceSeeking) || 0) >= 60) plan.push("主人公の気持ちを確かめようとする");
    if ((Number(state.fearOfLoss) || 0) >= 70 && (Number(state.seekHeroine) || 0) >= 60) plan.push("失いたくない気持ちを行動に出す");
    if ((Number(state.jealousy) || 0) >= 65) plan.push("嫉妬を無関心で消さず、その人物らしい形で漏らす");

    return {
      mode: plan.length ? "active" : "normal",
      must: plan.length ? Array.from(new Set(plan)).slice(0, 6) : ["現在stateに沿って自然に応答する"],
      may: [],
      mustNot: [
        "主人公の新しい台詞・行動・心理・身体反応を作る",
        "攻略対象の感情を一返答で都合よく消す",
        "主人公が動かなければ何もしない受け身へ固定する",
        "倫理や配慮を理由に恋愛欲求そのものを消す"
      ]
    };
  }

  function selectRelevantState(state) {
    const source = state || {};
    const result = {};
    CRITICAL_STATE_KEYS.forEach(key => {
      if (source[key] !== undefined) result[key] = clone(source[key]);
    });

    const defaults = PSYCHOLOGY() && PSYCHOLOGY().stateDefaults ? PSYCHOLOGY().stateDefaults : {};
    const candidates = Object.keys(defaults)
      .filter(key => !CRITICAL_STATE_KEYS.includes(key))
      .map(key => {
        const value = Number(source[key]);
        const baseline = Number(defaults[key]);
        return {
          key,
          value,
          distance: Number.isFinite(value) && Number.isFinite(baseline) ? Math.abs(value - baseline) : 0
        };
      })
      .filter(item => Number.isFinite(item.value) && item.distance >= 15)
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 28);

    candidates.forEach(item => { result[item.key] = item.value; });
    return result;
  }

  function nextChapterNumber(records) {
    let max = 0;
    (Array.isArray(records) ? records : []).forEach(entry => {
      const text = String(entry && entry.scene || "");
      const match = text.match(/Chapter\s*(\d+)/i);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
    return max + 1;
  }

  function commitLocalTurn({ characterId, protagonistInput, partnerText, summary, nextState, header }) {
    const session = readSession();
    const records = Array.isArray(session.recordsByCharacter[characterId])
      ? session.recordsByCharacter[characterId].slice()
      : [];
    const chapter = nextChapterNumber(records);
    const entry = {
      scene: "Chapter " + chapter,
      date: header && header.date ? String(header.date) : "",
      protagonist: String(protagonistInput || ""),
      partner: String(partnerText || ""),
      summary: String(summary || "")
    };
    if (header && typeof header === "object") entry.header = clone(header);
    records.push(entry);
    session.recordsByCharacter[characterId] = records;
    session.statesByCharacter[characterId] = clone(nextState);
    writeSession(session);
    return clone(entry);
  }

  window.RenaiGameStateEngine = Object.freeze({
    SESSION_KEY,
    SIGNAL_KEYS,
    readSession,
    writeSession,
    loadTemplate,
    getState,
    setState,
    getRecords,
    applyAnalysis,
    evaluateState,
    chooseActionPlan,
    selectRelevantState,
    nextChapterNumber,
    commitLocalTurn
  });
})();