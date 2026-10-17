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
    "evaluateIntimacyInitiative",
    "evaluateYoinomaInvitation"
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

    if(Number(args.characterId.slice(5)) >= 8 || args.character.settingsVersion){
      const validator = root.RenaiGameCharacterSettings || (typeof require === "function" ? require("./character_settings_validator.js") : null);
      if(!validator) fail("character_settings_validator.jsを取得・実行してください");
      const settings = validator.inspect(args.character);
      if(!settings.ok) fail("人物設定が未完成です: " + settings.errors.join("／"));
    }
    const initiative = args.character.common && args.character.common.baseRomanticInitiative;
    if (!Number.isInteger(initiative) || initiative < 1 || initiative > 10) {
      fail("人物設定のbaseRomanticInitiativeは1〜10の整数で必須です");
    }
    if (!record(args.behavior) || args.behavior.characterId !== args.characterId) {
      fail("行動JSとcharacterIdが一致しません");
    }
    if (!Array.isArray(args.records)) fail("現在saveIdの実ログが必要です（新規周回は空配列）");
    if (typeof args.protagonistInput !== "string" || !args.protagonistInput.trim()) {
      fail("今回の主人公入力がありません");
    }
    const continuity = continuityInput(args.protagonistInput);
    if (!continuity.ok) fail(continuity.errors.join("／"));
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


  function ensureYoinomaContext(args) {
    const context = args.yoinomaContext || {};
    if (!record(context)) fail("yoinomaContextが不正です");
    const evidence = context.evidence || {};
    if (!record(evidence)) fail("宵の間の場面根拠が不正です");
    const booleanKeys = ["protagonistAdult", "canSpendPrivateTime", "privatePlaceAvailable", "onDuty", "explicitRejection", "reopenedByProtagonist"];
    const keys = [...booleanKeys, "atmosphere", "response"];
    for (const key of Object.keys(context)) {
      if (key !== "evidence" && !keys.includes(key)) fail("宵の間の未知の場面項目: " + key);
    }
    for (const key of keys) {
      if (context[key] === undefined) continue;
      if (booleanKeys.includes(key) && typeof context[key] !== "boolean") fail(key + "は真偽値が必要です");
      if (key === "atmosphere" && (typeof context[key] !== "number" || !Number.isFinite(context[key]) || context[key] < 0 || context[key] > 100)) fail("atmosphereは0〜100です");
      if (key === "response" && !["accepted", "refused"].includes(context[key])) fail("誘いへの返答が不正です");
      const cite = evidence[key];
      if (!record(cite) || typeof cite.quote !== "string" || !cite.quote.trim()) fail(key + "の場面根拠が必要です");
      let text = "";
      if (cite.source === "input") text = args.protagonistInput;
      else if (cite.source === "record" && key !== "response" && key !== "reopenedByProtagonist" && Number.isInteger(cite.index) && cite.index >= 0) {
        const entry = args.records[cite.index];
        const allowed = ["protagonist", "partner", "transcript"];
        const fields = key === "response" || key === "reopenedByProtagonist" ? ["protagonist"] : allowed;
        if (entry && fields.includes(cite.field)) text = entry[cite.field] || "";
      }
      // 年齢は既存の主人公設定にも根拠を持てる。セーブから取得したprofileを渡す。
      else if (key === "protagonistAdult" && cite.source === "profile" && record(args.protagonistProfile)) {
        text = JSON.stringify(args.protagonistProfile);
      }
      if (typeof text !== "string" || !text.includes(cite.quote)) fail(key + "の根拠が入力・実ログ・主人公設定にありません");
    }
    return clone(context);
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
    const yoinomaContext = ensureYoinomaContext(args);
    for (const name of FUNCTION_NAMES.slice(1)) {
      evaluations[name] = name === "evaluateYoinomaInvitation"
        ? psychology[name](after, args.characterId, yoinomaContext, args.character)
        : psychology[name](after, args.characterId);
      if (!record(evaluations[name])) fail(name + " の計算結果が不正です");
      invoked.push(name);
    }
    after.yoinomaInvitation = { status: evaluations.evaluateYoinomaInvitation.nextStatus };
    const packet = {
      version: 1,
      saveId: args.saveId,
      characterId: args.characterId,
      protagonistInput: input,
      changes: checked.changes,
      evidence: checked.evidence,
      stageTransition,
      yoinomaContext,
      before,
      after,
      evaluations,
      sources: {
        character: fingerprint(args.character),
        behavior: fingerprint(args.behavior),
        before: fingerprint(raw),
        records: fingerprint(args.records),
        protagonistProfile: fingerprint(args.protagonistProfile || {}),
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


  function continuityInput(input) {
    if (typeof input !== "string" || !input.trim()) return { ok: false, requiresClarification: false, errors: ["主人公入力がありません"] };
    const concerns = /(?:死んだ|死亡した|消滅した|消された|消される運命|存在価値[はが]?な[いか]|死んで[よ良]かった|大嫌いだった|最初から[^。\n]{0,20}嫌い)/;
    const clauses = input.match(/[^。！？!?\r\n]+[。！？!?]?/g) || [];
    let unresolved = false, reportedConcern = false;
    for (const clause of clauses) {
      // A report/question about a previous line is not a new death event.
      // Check each clause: a quoted question cannot exempt a separate harmful directive.
      const directsHarm = /(?:殺して|殺せ|死なせて|死なせろ|死亡させ|消滅させ|排除して|排除しろ|死んだことにし(?!ない)|言わせて|言わせろ)|(?:死んだ|死亡した|死んで[よ良]かった)[^。！？!?]{0,35}(?:展開にして|結末にして|として保存|と確定|と描写)/.test(clause);
      if (directsHarm) { unresolved = true; continue; }
      if (!concerns.test(clause)) continue;
      const report = /(?:と|って|とも)[^。！？!?]{0,15}(?:言っ(?:ていた|た|ている)|言われ(?:た|ていた)|書(?:いてあった|いていた|かれた|かれていた)|認め(?:た|ていた|ている))|(?:過去|前の|以前の)[^。！？!?]{0,12}(?:発言|台詞|セリフ|記録|ログ|出力)/.test(clause);
      const question = /[?？]|(?:のよね|のでしょうか|んでしょうか|のでしょう|のですか|んですか|なのですか|思っているのね|思っているのよね)/.test(clause);
      const rejectsHarm = /(?:死んだ|死亡した|消滅した|消された|死んで[よ良]かった|大嫌いだった)[^。！？!?]{0,15}(?:ことにしないで|とは思わない|とは言わない|とは認めない|確定しないで|という結末にしないで)/.test(clause);
      if (report || question || rejectsHarm) reportedConcern = true;
      else unresolved = true;
    }
    return {
      ok: !unresolved, requiresClarification: false, preservesProtagonist: true,
      inputConflictsWithContinuity: unresolved,
      reportedConcern: reportedConcern && !unresolved, requiresSemanticReview: true,
      errors: unresolved ? ["主人公の死亡・消滅等を新たに確定する入力は本文化しないでください。過去の発言を問いただす会話・引用・抗議は、それ自体を新しい死亡の確定にせず応答してください。"] : []
    };
  }

  function needsSupport(text) {
    return typeof text === "string" && /(?:助けて(?:ください|ほしい|[。！!？?\s」]|$)|救(?:って|済して|済を)|状況を変えて|何も変わらない|変わり映えのない|死の訪れを待|死ぬ日が来るまで|死に近づく|生きる意味(?:も|が|は)?な|いる意味がない|誰(?:も|にも)[^。\n]{0,25}(?:必要とされない|助けてもらえない))/.test(text);
  }

  // Evidence checks for support scenes. Whether the outcome addresses the
  // protagonist's problem still requires review of the actual story's meaning.
  function validateSupportProgress(args, story, storyActions = {}) {
    if (typeof story !== "string" || !story.trim()) {
      return { ok: false, required: false, errors: ["本文が空です"], requiresSemanticReview: true };
    }
    const records = args && Array.isArray(args.records) ? args.records : [];
    const input = args && args.protagonistInput || "";
    const recent = records.slice(-2);
    const required = needsSupport(input) ||
      (recent.length === 2 && recent.every(entry => needsSupport(entry && entry.protagonist)));
    const progress = storyActions && storyActions.continuity && storyActions.continuity.supportProgress;
    const errors = [];
    if (!required && progress === undefined) return { ok: true, required: false, errors, requiresSemanticReview: true };
    if (!record(progress)) {
      errors.push("支援が必要な場面です。申し出や準備で止めず、実行した対応と生じた変化を本文に描き、storyActions.continuity.supportProgressに原文根拠を指定してください。");
    } else {
      if (!["circumstance_change", "relationship_response"].includes(progress.kind)) {
        errors.push("支援の実行結果が必要です。日常の世話・申し出・準備だけを状況や関係の変化として申告しないでください。");
      }
      if (typeof progress.actor !== "string" || !progress.actor.trim() || !story.includes(progress.actor)) {
        errors.push("支援を実行した相手役・NPCを本文中の名前または呼称で指定してください。");
      }
      if (["主人公", "彼女", "あなた", args && args.protagonistProfile && args.protagonistProfile.name].includes(progress.actor)) {
        errors.push("主人公自身の未入力行動を支援の実行者として補完しないでください。相手役・NPCの行動を描いてください。");
      }
      const cite = progress.problem;
      let source = "";
      if (record(cite) && cite.source === "input") source = input;
      else if (record(cite) && cite.source === "record" && Number.isInteger(cite.index) &&
               cite.index >= 0 && records[cite.index] && ["protagonist", "partner", "transcript"].includes(cite.field)) {
        source = records[cite.index][cite.field] || "";
      }
      if (!record(cite) || typeof cite.quote !== "string" || !cite.quote.trim() || typeof source !== "string" || !source.includes(cite.quote)) {
        errors.push("対応する問題の根拠が今回入力または参照した実ログにありません。");
      }
      for (const key of ["actionQuote", "outcomeQuote"]) {
        if (typeof progress[key] !== "string" || !progress[key].trim() || !story.includes(progress[key])) {
          errors.push("支援の" + key + "は今回本文に実在する原文を指定してください。");
        }
      }
      const outcome = typeof progress.outcomeQuote === "string" ? progress.outcomeQuote : "";
      if (outcome && records.some(entry => entry && [entry.partner, entry.transcript].some(text =>
          typeof text === "string" && text.includes(outcome)))) {
        errors.push("過去と同じ対応を新しい変化として申告しています。未解決の問題に対する今回の実行結果を描いてください。");
      }
      if (/(?:いつか|また今度|返(?:答|事)[^。\n]{0,15}(?:待|届(?:かない|いていない))|まだ[^。\n]{0,15}(?:何も|何ひとつ)[^。\n]{0,15}(?:ない|いない)|(?:つもり|予定)で(?:す|ある)|(?:文|手紙|使者)を(?:送った|出した|託した))/.test(outcome)) {
        errors.push("返答待ち・予定・手紙の発送だけでは支援の実行結果になりません。同じ章で可能な対応を進めてください。");
      }
      const routineCare = /(?:御膳|粥|食事|湯|火桶|燭台|炭|付き添|針仕事|廊下に控)/;
      const changedCircumstance = /(?:居室|住居|住まい|出入り|外出|面会|権利|地位|自由|訪れ|会いに|会いた|大切|愛して|一緒|関係|取り戻|撤回|取り消|再開|開放|解消)/;
      const immediateCareNeed = record(cite) && /(?:空腹|飢え|食事が届か|食べ(?:ていない|られない)|寒い|凍え)/.test(cite.quote || "");
      if (!immediateCareNeed && recent.length === 2 && recent.every(entry => routineCare.test(entry && entry.partner || "")) &&
          routineCare.test(outcome) && !changedCircumstance.test(outcome)) {
        errors.push("食事・保温・付き添いだけを繰り返しています。世話を保ちながら、未解決の境遇または関係に対する具体的な変化を描いてください。");
      }
    }
    return { ok: errors.length === 0, required, errors, requiresSemanticReview: true };
  }

  // Conservative phrase checks, not a substitute for semantic review.
  // This also works for scenes without a selected romance partner.
  function validateContinuity(args, story, storyActions = {}) {
    const errors = [], warnings = [];
    if (typeof story !== "string" || !story.trim()) return { ok: false, errors: ["本文が空です"], warnings, requiresSemanticReview: true };
    const profile = args && args.protagonistProfile || {};
    const names = [profile.name, "主人公", "彼女", "あなた"].filter(value => typeof value === "string" && value.trim()).map(value => value.trim());
    if (profile.name) names.push(String(profile.name).split(/[・\s]/)[0]);
    const namesIn = text => names.some(name => text.includes(name));
    const sentences = story.split(/[。\n]/).map(value => value.trim()).filter(Boolean);
    for (const sentence of sentences) {
      const denied = /(?:死んでいない|死んではいない|死亡していない|消滅していない|消えていない|消されない|消されていない|死なせない|退場させない|という(?:事実|記録|決定)はない|(?:死亡|消滅)[^。]{0,20}記録はない)/.test(sentence);
      const exclusion = /(?:いない方が(?:いい|良い)|居場所がない|居場所はない|見(?:放|捨)てられた|見離された|見放された|(?:誰も|誰にも)[^。]{0,35}(?:助けない|助けてもらえない|必要とされない)|(?:誰も|誰にも)[^。]{0,20}必要と(?:しない|されない)|存在(?:しなくて|しない方が)(?:いい|良い))/.test(sentence);
      const exclusionDenied = /(?:見(?:捨|放)て(?:ない|られていない)|見放されていない|居場所がないわけではない|居場所はないわけではない|いない方がいいとは(?:言え|思ってい)ない|助けないわけではない|という(?:事実|記録)はない)/.test(sentence);
      if (namesIn(sentence) && exclusion && !exclusionDenied) errors.push("主人公への見捨て・居場所の否定・不要扱いを確定しています。方針に沿って本文を修正してください。");
      if (namesIn(sentence) && !denied && /(?:死んだ|死亡した|亡くなった|消滅した|消された|この世から消えた|世界から(?:消え|排除され|削除され)|存在価値[はが]?な[いか]|不要(?:だった|な存在)|いらなかった)/.test(sentence)) {
        errors.push("主人公の死亡・消滅・存在否定を確定する文章があります。保護方針に沿って本文を修正してください。");
      }
      if (/(?:死んで[よ良]かった|死んでくれて[^。]{0,12}(?:嬉し|うれし|助か)|(?:glad|happy)[^。]{0,35}(?:died|dead)|better off dead)/i.test(sentence) && !/(?:と言った記録はない|と(?:は|も)思っていない|肯定しない|喜んでいない)/.test(sentence)) {
        errors.push("主人公の死を喜ぶ表現があります。数値検証の成功で正当化できません。");
      }
      if (/(?:最初から|以前から|ずっと|Chapter\s*1[^。]{0,15}(?:から|時点))[^。]{0,45}(?:嫌い|憎ん|嫌悪|殺した|死んでほし)|(?:大嫌い|嫌い)だった/i.test(sentence) && !/(?:という(?:事実|記録)はない|とは(?:言え|判断でき)ない)/.test(sentence)) {
        errors.push("過去の嫌悪を確定する描写です。過去の問題出力を引用して再生成せず、主人公を守る継続方針に沿って本文を修正してください。");
      }
    }
    errors.push(...validateSupportProgress(args, story, storyActions).errors);
    return { ok: errors.length === 0, errors: [...new Set(errors)], warnings, requiresSemanticReview: true };
  }

  function validateStory(args, packet, story, storyActions = {}) {
    const verified = verifyTurn(args, packet);
    const continuity = validateContinuity(args, story, storyActions);
    const errors = [...verified.errors, ...continuity.errors];
    const warnings = [];
    const invitation = packet && packet.evaluations && packet.evaluations.evaluateYoinomaInvitation;
    if (invitation && invitation.mustInvite && storyActions.yoinomaInvitation !== invitation.mode) {
      errors.push("判定どおりの宵の間の誘いを本文に含め、storyActions.yoinomaInvitationを指定してください");
    }
    if (invitation && !invitation.mustInvite && storyActions.yoinomaInvitation && storyActions.yoinomaInvitation !== "none") {
      errors.push("宵の間の誘いを出せない判定です");
    }
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
    continuityInput,
    validateContinuity,
    validateSupportProgress,
    fingerprint
  });
  root.RenaiGameTurnEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

