(() => {
  "use strict";

  const clamp = (value, min = 0, max = 100) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  };

  const psychology = {
    version: 1,

    principle: [
      "恋愛相手の心理は、好意1個で決めない。複数の矛盾する感情・欲求・判断・抑制を同時に保持する。",
      "最重要の恋愛駆動値は seekHeroine（主人公を求める強さ）。嫉妬・傷つき・怒り・不安・倫理・遠慮を、seekHeroineを都合よくゼロにする理由へ変換しない。",
      "束縛したい・独占したい・嫉妬するという欲求と、理性・倫理・主人公への尊重は同時に高くてよい。矛盾を消さず、その衝突を人物描写へ出す。",
      "理性が勝つ場合、欲求そのものが消えるのではなく、行動を抑える。理性が負ける場合も人格全体が別人になるのではなく、普段なら抑える言葉・要求・接近・引き止め等が部分的または強く漏れる。",
      "明確な拒絶がある場合は追跡・説得・接触を継続しない。ただし、傷つき・悲しみ・嫉妬・未練など内面の感情まで即時消去しない。"
    ],

    scale: {
      min: 0,
      max: 100,
      note: "原則0〜100。高いほどその感情・欲求・抑制が現在強い。高い値同士が矛盾していても正常。"
    },

    dimensions: {
      centralDrive: {
        seekHeroine: "主人公そのものを求める強さ。会いたい、選ばれたい、そばにいたい、失いたくない等を束ねる最重要値。",
        pursuitDrive: "自分から会いに行く、連絡する、誘う、引き止める、関係を動かす力。",
        emotionalNeed: "主人公の存在・言葉・愛情を精神的に必要とする強さ。",
        physicalNeed: "触れたい、抱きたい、キスしたい等の身体的親密欲求。性的欲求だけを意味しない。",
        passion: "恋愛感情の熱量。冷静さを保ちにくくなるほど強く惹かれ、求める情熱。",
        euphoria: "恋がうまくいっている、主人公に選ばれた・会えた等による浮かれ、高揚、嬉しさ。",
        longing: "会えない・離れている時の恋しさ、会いたさ。"
      },

      exclusivityAndControl: {
        exclusivityNeed: "自分を特別な一人として選んでほしい欲求。",
        possessiveness: "主人公を自分の側に置きたい、自分の恋人・特別な相手だと感じたい独占欲。",
        controlUrge: "行動・予定・交友関係へ口を出したい、束縛したい衝動。実際に束縛するかは別判定。",
        jealousy: "他者へ向く主人公の関心・親密さに対する嫉妬。",
        rivalry: "競争相手に負けたくない、自分を選ばせたい競争心。"
      },

      lossAndUncertainty: {
        fearOfLoss: "主人公を失うことへの恐怖。",
        abandonmentFear: "見捨てられる、置いていかれることへの恐れ。",
        insecurity: "自分は選ばれないのではないかという不安。",
        suspicion: "主人公の言葉・関係・行動への疑い。",
        anxiety: "先行きが分からないことへの不安。",
        ambivalence: "進みたい気持ちと退きたい気持ち等、相反する気持ちの強さ。",
        confusion: "自分の感情や状況を整理できない度合い。",
        hesitation: "したい行動があるのに踏み切れない度合い。"
      },

      bondAndPositiveRegard: {
        trust: "主人公を信頼している強さ。",
        wantToBelieve: "疑いがあっても主人公を信じたい気持ち。",
        attachment: "主人公との関係が自分の生活・感情に根付いている強さ。",
        empathy: "主人公の事情や感情を理解しようとする力。自己犠牲や無条件肯定とは別。",
        tenderness: "主人公を優しく扱いたい、守りたい、労わりたい気持ち。",
        needForReciprocity: "自分だけでなく主人公からも選ばれ、求められ、返してほしい欲求。",
        needForClarity: "曖昧な関係・説明不足を解消し、答えを得たい欲求。"
      },

      painfulEmotion: {
        hurt: "傷つき。",
        sadness: "悲しみ。",
        anger: "怒り。",
        loneliness: "孤独感。",
        frustration: "思い通りにならないことへの苛立ち。",
        resentment: "解消されていない不満・恨み・わだかまり。",
        guilt: "自分の言動や欲求に対する罪悪感。",
        shame: "欲望・弱さ・嫉妬等を見られることへの羞恥。",
        pride: "自尊心・意地。求めていても素直になれない力にもなる。"
      },

      actionImpulse: {
        confrontationDrive: "問いただす、反論する、責める、話し合いを要求する衝動。",
        reassuranceSeeking: "愛情・関係・選択を確かめたい衝動。",
        touchImpulse: "身体的に触れたい衝動。",
        confessionImpulse: "好意・欲求・本音を言葉にしたい衝動。",
        restraintBreakingImpulse: "普段守っている自分のルールを破ってでも主人公へ踏み込みたい衝動。",
        desireForContact: "会話・連絡・接触を持ちたい現在欲求。"
      },

      restraint: {
        reason: "状況・結果・立場を考えて衝動を止める理性。",
        selfControl: "感情を行動へ直結させず制御する力。",
        ethics: "本人が正しい・守るべきだと考えている倫理観。",
        socialRestraint: "社会的立場、仕事、世間、関係性を考えて行動を抑える力。",
        respectForHeroine: "主人公の意思・自由・境界を尊重する力。",
        fearOfHurtingHeroine: "自分の言動で主人公を傷つけることへの恐れ。"
      },

      pressureAndCondition: {
        emotionalPressure: "感情全体の圧力。高いほど平静を維持しづらい。",
        stress: "外的・内的ストレス。",
        fatigue: "疲労。高いほど普段の自制が弱くなりやすい。",
        vulnerability: "弱さ・本音が表へ出やすい状態。",
        romanticAwareness: "自分の恋愛感情を自覚している度合い。",
        futureThinking: "主人公との将来を現実的に考える度合い。"
      }
    },

    stateDefaults: {
      seekHeroine: 0,
      pursuitDrive: 0,
      emotionalNeed: 0,
      physicalNeed: 0,
      passion: 0,
      euphoria: 0,
      exclusivityNeed: 0,
      possessiveness: 0,
      controlUrge: 0,
      rivalry: 0,
      fearOfLoss: 0,
      abandonmentFear: 0,
      insecurity: 0,
      suspicion: 0,
      anxiety: 0,
      wantToBelieve: 0,
      empathy: 50,
      tenderness: 0,
      loneliness: 0,
      frustration: 0,
      resentment: 0,
      confrontationDrive: 0,
      reassuranceSeeking: 0,
      touchImpulse: 0,
      confessionImpulse: 0,
      restraintBreakingImpulse: 0,
      reason: 70,
      selfControl: 70,
      ethics: 70,
      socialRestraint: 70,
      respectForHeroine: 80,
      fearOfHurtingHeroine: 30,
      ambivalence: 0,
      confusion: 0,
      guilt: 0,
      shame: 0,
      hesitation: 0,
      emotionalPressure: 0,
      stress: 0,
      fatigue: 0,
      pride: 50,
      needForReciprocity: 0,
      needForClarity: 0
    },

    traitDefaults: {
      rationality: 50,
      impulseControl: 50,
      ethicalRigidity: 50,
      socialCaution: 50,
      respectForAutonomy: 70,
      possessiveTendency: 50,
      jealousySensitivity: 50,
      abandonmentSensitivity: 50,
      suspicionTendency: 50,
      prideTendency: 50,
      emotionalExpressiveness: 50,
      pursuitTendency: 50,
      dependencyTendency: 50,
      conflictAvoidance: 50,
      tendernessTendency: 50
    },

    characterTraitFallbacks: {
      char_001: {
        rationality: 88,
        impulseControl: 86,
        ethicalRigidity: 84,
        socialCaution: 82,
        respectForAutonomy: 88,
        possessiveTendency: 62,
        jealousySensitivity: 52,
        abandonmentSensitivity: 58,
        suspicionTendency: 42,
        prideTendency: 66,
        emotionalExpressiveness: 30,
        pursuitTendency: 64,
        dependencyTendency: 40,
        conflictAvoidance: 35,
        tendernessTendency: 72
      },
      char_002: {
        rationality: 82,
        impulseControl: 68,
        ethicalRigidity: 96,
        socialCaution: 90,
        respectForAutonomy: 95,
        possessiveTendency: 72,
        jealousySensitivity: 75,
        abandonmentSensitivity: 58,
        suspicionTendency: 50,
        prideTendency: 42,
        emotionalExpressiveness: 58,
        pursuitTendency: 61,
        dependencyTendency: 58,
        conflictAvoidance: 62,
        tendernessTendency: 78
      },
      char_003: {
        rationality: 91,
        impulseControl: 90,
        ethicalRigidity: 94,
        socialCaution: 92,
        respectForAutonomy: 92,
        possessiveTendency: 55,
        jealousySensitivity: 50,
        abandonmentSensitivity: 40,
        suspicionTendency: 82,
        prideTendency: 68,
        emotionalExpressiveness: 25,
        pursuitTendency: 57,
        dependencyTendency: 35,
        conflictAvoidance: 32,
        tendernessTendency: 58
      }
    },

    seekHeroineFloorByStageName: {
      "他人": 0,
      "警戒": 0,
      "興味": 10,
      "親しみ": 25,
      "親しさ": 25,
      "特別": 35,
      "意識": 45,
      "恋愛自覚前": 45,
      "恋愛自覚": 60,
      "欲求": 60,
      "恋愛緊張": 70,
      "告白前": 75,
      "告白・合意": 75,
      "交際": 80,
      "交際後": 80
    },

    compatibility: {
      rule: "既存セーブに新しい心理項目が無くても壊さない。不足項目だけをstateDefaultsで補完して生成に使い、既存値・実ログ・他フィールドは保持する。",
      traitRule: "psychologyTraitsが無い場合はcharacterTraitFallbacks[characterId]を使う。そこにも無い項目だけtraitDefaultsを使う。",
      persistenceRule: "補完値をGitHubへ書き戻すのは、通常のstate更新と同じくユーザーが記録・状態更新を明示した時だけ。"
    },

    conflictModel: {
      note: "これは人間心理の医学的モデルではなく、恋愛ゲーム生成用の行動決定ヒューリスティック。単純な一感情最大値ではなく、欲求側と抑制側の拮抗を見る。",

      desireDrivers: [
        "seekHeroine",
        "exclusivityNeed",
        "possessiveness",
        "controlUrge",
        "jealousy",
        "fearOfLoss",
        "emotionalNeed",
        "physicalNeed",
        "passion",
        "longing",
        "pursuitDrive",
        "restraintBreakingImpulse",
        "needForReciprocity",
        "needForClarity"
      ],

      restraintDrivers: [
        "reason",
        "selfControl",
        "ethics",
        "socialRestraint",
        "respectForHeroine",
        "fearOfHurtingHeroine"
      ],

      destabilizers: [
        "emotionalPressure",
        "stress",
        "fatigue",
        "hurt",
        "anger",
        "sadness",
        "anxiety",
        "insecurity",
        "frustration",
        "fearOfLoss"
      ],

      outcomes: {
        restraint_wins: "理性・倫理・自制が優勢。欲求は消さず、視線、沈黙、言い淀み、予定確認など小さな漏れとして出してよい。seekHeroineが高いなら無関心・撤退へ変換しない。",
        restraint_leaks: "抑制が勝っているが完全には隠せない。嫉妬を認める、理由を聞く、会いたいと言う、少し強く引き止める等が漏れる。",
        conflict: "欲求と抑制が拮抗。言う／言わない、近づく／止まる、責めたい／信じたい等の矛盾を同じ場面に残す。",
        desire_partly_wins: "欲求が部分的に勝つ。普段なら抑える本音、要求、悋気、引き止め、接近が明確に出る。ただし人格全体や倫理観が消えるわけではない。",
        desire_wins: "欲求が強く勝つ。本人が『するべきではない』と理解している行動や強い言葉まで出る可能性がある。ただし主人公の明確な拒絶・境界は越えて追跡や接触を継続しない。"
      }
    },

    combinationEffects: [
      "jealousy + anger が高い → 問いただす、責める、言葉が硬くなる方向。",
      "jealousy + sadness が高い → 落ち込み、口数減少、切なさ。ただしseekHeroineが高ければそのまま消えず、後で関係を求める。",
      "jealousy + insecurity が高い → 自分が選ばれているか確認したくなる。",
      "jealousy + possessiveness + controlUrge が高い → 束縛したい衝動。reason / ethics / respectForHeroine が高ければ強い葛藤になる。",
      "suspicion + wantToBelieve が高い → 疑っているのに信じたい。即断せず質問・確認・迷いとして出す。",
      "fearOfLoss + longing + seekHeroine が高い → 離れたくない、会いに行く、引き止める方向。",
      "hurt + seekHeroine が高い → 傷ついたから関係を捨てるのではなく、傷ついたまま理由・説明・修復を求める。",
      "anger + tenderness がともに高い → 怒っていても相手を傷つけたくない。怒りを消さず表現方法だけ変わる。",
      "passion + physicalNeed / emotionalNeed + guilt / shame が高い → 欲しいのに自分を恥じ、近づいては止まる。",
      "stress / fatigue / emotionalPressure が高い → 普段よりselfControlの実効値が下がり、隠していた感情が漏れやすい。",
      "pride + hurt が高い → seekHeroineが高くても素直に追えず、冷たさ・意地・遠回りな接近になりうる。",
      "needForClarity + unresolvedEmotion がある → 曖昧なまま時間で消さず、話し合い・確認を起こす。"
    ],

    updateRules: [
      "全項目を毎回動かす必要はない。出来事に直接影響された項目だけ維持・増減する。",
      "相反する項目を自動相殺しない。例：jealousy 80 と trust 80、controlUrge 70 と ethics 95 は同時に成立する。",
      "一時的な感情状態と固定的な性格傾向を混同しない。性格はpsychologyTraits、現在状態はstate各値として扱う。",
      "恋愛段階が進んだ後、理由なくseekHeroineだけを低値へ戻して受け身化しない。",
      "謝罪・説明があってもhurt / resentment / suspicion等を即0にしない。納得度と人物傾向に応じて段階的に変える。",
      "主人公が何もしなくても、seekHeroine / pursuitDrive / longing / needForClarity 等が高ければ攻略対象自身を起点に行動を開始する。"
    ]
  };

  psychology.normalizeState = (rawState = {}, characterId = rawState.characterId) => {
    const state = { ...rawState };

    for (const [key, defaultValue] of Object.entries(psychology.stateDefaults)) {
      if (state[key] === undefined || state[key] === null || Number.isNaN(Number(state[key]))) {
        state[key] = defaultValue;
      } else {
        state[key] = clamp(state[key]);
      }
    }

    const fallbackTraits = psychology.characterTraitFallbacks[characterId] || {};
    state.psychologyTraits = {
      ...psychology.traitDefaults,
      ...fallbackTraits,
      ...(rawState.psychologyTraits || {})
    };

    for (const key of Object.keys(state.psychologyTraits)) {
      state.psychologyTraits[key] = clamp(state.psychologyTraits[key]);
    }

    const floor = psychology.seekHeroineFloorByStageName[state.stageName];
    if (Number.isFinite(floor) && state.seekHeroine < floor) {
      state.seekHeroine = floor;
    }

    return state;
  };

  psychology.evaluateConflict = (rawState = {}, characterId = rawState.characterId) => {
    const state = psychology.normalizeState(rawState, characterId);
    const avg = keys => keys.reduce((sum, key) => sum + clamp(state[key]), 0) / keys.length;

    const desirePressure = avg(psychology.conflictModel.desireDrivers);
    const destabilization = avg(psychology.conflictModel.destabilizers);

    const trait = state.psychologyTraits;
    const traitRestraint =
      (trait.rationality + trait.impulseControl + trait.ethicalRigidity + trait.socialCaution + trait.respectForAutonomy) / 5;

    const rawRestraint = avg(psychology.conflictModel.restraintDrivers);
    const effectiveRestraint = clamp(
      (rawRestraint * 0.65) +
      (traitRestraint * 0.35) -
      (destabilization * 0.35)
    );

    const delta = desirePressure - effectiveRestraint;

    let outcome = "conflict";
    if (delta <= -25) outcome = "restraint_wins";
    else if (delta <= -6) outcome = "restraint_leaks";
    else if (delta < 15) outcome = "conflict";
    else if (delta < 35) outcome = "desire_partly_wins";
    else outcome = "desire_wins";

    return {
      desirePressure: Math.round(desirePressure),
      restraintPressure: Math.round(effectiveRestraint),
      destabilization: Math.round(destabilization),
      delta: Math.round(delta),
      outcome,
      meaning: psychology.conflictModel.outcomes[outcome]
    };
  };

  window.RenaiGamePsychologyParameters = Object.freeze(psychology);
})();