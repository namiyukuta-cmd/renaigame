(() => {
  "use strict";

  const clamp = (value, min = 0, max = 100) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  };

  const psychology = {
    version: 3,

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

      romanceOnset: {
        priorAwareness: "物語開始前から主人公の存在を知っていた度合い。名前だけ、顔だけ、職場で見かけた等も含む。",
        priorFamiliarity: "物語開始前から主人公を顔見知り・知人として認識していた親近度。",
        priorInterest: "物語開始前から主人公が気になっていた度合い。",
        priorCrush: "物語開始前からすでに恋愛的好意を持っていた度合い。",
        priorAdmiration: "物語開始前から主人公を尊敬・憧憬していた度合い。",
        priorCuriosity: "物語開始前からもっと知りたいと思っていた度合い。",
        priorFantasy: "物語開始前から主人公との私的な関係を想像したことがある度合い。",
        firstImpression: "初対面または初めて個人的に話した時の総合印象。",
        appearanceAttraction: "外見・雰囲気・表情・所作への魅力。",
        sexualAttraction: "成人同士として感じる身体的・性的魅力。露骨な性描写とは別。",
        intellectualAttraction: "知性・考え方・会話への魅力。",
        emotionalAttraction: "感情の在り方・人柄・一緒にいる時の感覚への魅力。",
        chemistry: "理由を説明しきれない相性・火花・妙に惹かれる感覚。",
        familiarity: "会う回数や共有経験によって増える親近感。",
        comfort: "一緒にいて落ち着く・安心できる感覚。",
        similarity: "価値観・趣味・考え方等の共通性を感じる度合い。",
        complementarity: "自分にないものを主人公が持つことへの魅力。",
        intrigue: "なぜか気になる、理解したいという引っかかり。",
        romanticOpenness: "現在どれだけ恋愛を受け入れられる心理状態か。",
        readinessForLove: "誰かを好きになり関係を深める準備が整っている度合い。",
        lonelinessCatalyst: "孤独や空白が恋愛感情の発生を後押ししている度合い。孤独だけで恋愛を成立させない。",
        memoryFrequency: "主人公を思い出す頻度。",
        spontaneousThought: "用事がないのに主人公をふと思い出す強さ。",
        anticipation: "次に会う・話すことへの期待。",
        encounterImpact: "直近の出会い・再会・会話が心に残した衝撃。",
        reunionImpact: "以前から知っていた主人公との再会が感情を再燃・変化させた強さ。",
        unexpectedDiscoveryImpact: "主人公の予想外の一面を知ったことが魅力を急上昇させた強さ。",
        attractionGrowth: "最近の出来事によって魅力が増している勢い。",
        romanticSpark: "恋愛として火がつきかけている瞬間的な発火値。",
        latentAffection: "本人がまだ恋愛と自覚していない潜在的な好意。",
        romanticMomentum: "恋愛感情が進行方向へ動いている勢い。",
        onsetCertainty: "自分の中で『これは恋だ』と認識し始めている確信。romanticAwarenessより発生初期に限定して使う。"
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
        admiration: "主人公への尊敬・感嘆。",
        fascination: "もっと知りたい、見ていたいという強い関心。",
        gratitude: "主人公から受け取ったものへの感謝。",
        joy: "主人公といること・関係が進むことへの純粋な嬉しさ。",
        relief: "拒絶されなかった、誤解が解けた、再会できた等による安堵。",
        relationshipHope: "二人の関係が良い方向へ進むと期待する気持ち。",
        needForReciprocity: "自分だけでなく主人公からも選ばれ、求められ、返してほしい欲求。",
        needForClarity: "曖昧な関係・説明不足を解消し、答えを得たい欲求。"
      },

      selfConcept: {
        selfWorth: "自分には人として価値があるという現在の感覚。",
        romanticConfidence: "恋愛相手として自分が選ばれうるという自信。",
        desirabilityConfidence: "主人公から魅力的だと思われうるという自信。",
        deservingLove: "自分は愛されてもよい、愛情を受け取ってよいという感覚。",
        inferiority: "主人公や競争相手に対する劣等感。",
        selfDoubt: "自分の判断・魅力・関係への自信の揺らぎ。",
        humiliation: "恥をかかされた、惨めにされたという感覚。",
        rejectionPain: "主人公から拒絶されたと感じる痛み。",
        rightToAsk: "主人公へ会いたい・答えてほしい・関係を確認したい等を自分から求めてよいという感覚。支配権ではない。"
      },

      attachmentNeeds: {
        needForAffection: "主人公から愛情表現を受けたい欲求。",
        needToBeChosen: "他者ではなく自分を選んでほしい欲求。",
        needToBeNeeded: "主人公に必要な存在でありたい欲求。",
        needToBeReliedOn: "主人公から頼られたい欲求。",
        needToProtect: "主人公を守りたい欲求。",
        needToCaretake: "世話をしたい、助けたい欲求。",
        needToReceiveCare: "主人公から心配・世話・労りを受けたい欲求。",
        needToDepend: "自分も主人公を頼りたい、弱さを預けたい欲求。",
        needForAutonomy: "恋愛中でも自分の自由・生活・判断を保ちたい欲求。",
        closenessComfort: "親密になり、弱みを見せ、距離を縮めることへの安心感。",
        fearOfEngulfment: "関係に飲み込まれ自由や自己を失うことへの恐れ。",
        separationDistress: "離別・長期不在・距離が空くことへの苦痛。"
      },

      approachAvoidance: {
        approachImpulse: "主人公へ近づく、話す、会う、触れる方向の総合衝動。",
        withdrawalImpulse: "一時的に距離を取りたい衝動。",
        escapeImpulse: "感情が重すぎて場や関係から逃げたい衝動。",
        clingImpulse: "離れないでほしい、そばにいたいと縋りたい衝動。",
        returnImpulse: "一度距離を取っても主人公のもとへ戻りたい衝動。",
        silenceImpulse: "本音を言わず黙り込みたい衝動。",
        protestImpulse: "無視・不機嫌・皮肉・強い要求等で『気づいてほしい』と抗議したい衝動。",
        appeasementImpulse: "関係悪化を避けるため自分が折れたり宥めたりしたい衝動。",
        repairDrive: "喧嘩・誤解・傷つきを修復したい力。",
        apologyImpulse: "自分に非がある時に謝りたい衝動。",
        forgivenessReadiness: "説明・謝罪・時間経過を受け入れ、許す方向へ進める現在の準備度。",
        stubbornResistance: "納得していなくても折れることを拒む意地。"
      },

      relationshipAppraisal: {
        perceivedReciprocity: "主人公からも自分が求められているという現在認知。",
        perceivedAffection: "主人公から好意・愛情を向けられているという認知。",
        perceivedRejection: "主人公から拒絶・拒否・距離を置かれているという認知。",
        perceivedBondThreat: "二人の関係が失われる危険の認知。",
        perceivedRivalThreat: "競争相手が主人公との関係を脅かすという認知。",
        perceivedBetrayal: "約束・信頼を裏切られたという認知。",
        perceivedFairness: "現在の関係や主人公の対応を公平だと感じる度合い。",
        perceivedSafety: "主人公の前で弱さ・本音を見せても安全だという感覚。",
        certaintyOfHerAffection: "主人公の好意への確信。",
        certaintyOfOwnFeelings: "自分が主人公を愛している・欲していることへの確信。",
        expectationOfRepair: "喧嘩や距離が生じても修復できるという期待。"
      },

      socialEvaluationAndRegret: {
        reputationConcern: "周囲からどう見られるかへの懸念。",
        roleConflict: "仕事・立場・責任と恋愛欲求が衝突している強さ。",
        dutyPressure: "職務・家族・約束等、恋愛以外の責任から受ける圧力。",
        privacyNeed: "恋愛感情や関係を他者に見せたくない欲求。",
        fearOfJudgment: "欲望・嫉妬・弱さを他者や主人公から評価される恐れ。",
        fearOfRidicule: "笑われる、格好悪いと思われる恐れ。",
        fearOfRejection: "求めた結果、主人公から拒絶される恐れ。",
        fearOfDependency: "主人公なしではいられなくなることへの恐れ。",
        fearOfLosingControl: "自分の感情・欲望・怒りを制御できなくなることへの恐れ。",
        regretAnticipation: "今行動したら後で後悔するかもしれないという予測。",
        missedChanceFear: "今動かなければ機会を失うという恐れ。"
      },

      relationalMemoryPressure: {
        recentAcceptanceImpact: "直近で主人公に受け入れられた経験が現在心理へ与える強さ。",
        recentRejectionImpact: "直近で拒絶・距離を置かれた経験の残響。",
        recentAffectionImpact: "直近の愛情・親密さの記憶の残響。",
        recentJealousyImpact: "直近の嫉妬事件が現在へ残っている強さ。",
        unresolvedConflictWeight: "未解決の喧嘩・誤解が現在判断へ与える重さ。",
        promiseImportance: "主人公との約束を現在どれだけ重大に受け止めているか。",
        positiveMemorySalience: "良い記憶が思い出されやすい強さ。",
        negativeMemorySalience: "傷ついた記憶が思い出されやすい強さ。"
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
        hairTouchImpulse: "髪や頬などへそっと触れたい衝動。",
        handTouchImpulse: "手に触れる、手を取る、手をつなぎたい衝動。",
        embraceImpulse: "抱きしめたい、腕の中へ引き寄せたい衝動。",
        kissImpulse: "キスしたい衝動。",
        privateTimeWish: "二人きりの時間をもっと続けたい、私的な場所で一緒にいたい欲求。",
        reluctanceToPart: "別れ際に帰したくない、離れたくない気持ち。",
        invitationImpulse: "自宅・部屋・もう一軒など、二人の時間が続く場所へ自分から誘いたい衝動。",
        sexualIntimacyWish: "成人同士として、キスより先を含むより深い親密さを望む気持ち。実際の性行為を露骨に描写するための値ではなく、誘い・躊躇・期待・切なさ等のニュアンス生成に使う。",
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
        emotionalActivation: "感情が強く動いている覚醒度。喜び・怒り・恋情いずれでも上がる。",
        calmness: "現在どれだけ落ち着いているか。",
        stress: "外的・内的ストレス。",
        fatigue: "疲労。高いほど普段の自制が弱くなりやすい。",
        courage: "怖さがあっても行動へ踏み出せる現在の勇気。",
        decisiveness: "迷いを切って決断できる現在の強さ。",
        patience: "結果や返事を待てる余裕。",
        vulnerability: "弱さ・本音が表へ出やすい状態。",
        romanticAwareness: "自分の恋愛感情を自覚している度合い。",
        futureThinking: "主人公との将来を現実的に考える度合い。"
      }
    },

    stateDefaults: {
      trust: 0,
      attachment: 0,
      romanticAwareness: 0,
      jealousy: 0,
      hurt: 0,
      sadness: 0,
      anger: 0,
      longing: 0,
      desireForContact: 0,
      vulnerability: 0,
      futureThinking: 0,

      priorAwareness: 0,
      priorFamiliarity: 0,
      priorInterest: 0,
      priorCrush: 0,
      priorAdmiration: 0,
      priorCuriosity: 0,
      priorFantasy: 0,
      firstImpression: 50,
      appearanceAttraction: 0,
      sexualAttraction: 0,
      intellectualAttraction: 0,
      emotionalAttraction: 0,
      chemistry: 0,
      familiarity: 0,
      comfort: 0,
      similarity: 0,
      complementarity: 0,
      intrigue: 0,
      romanticOpenness: 50,
      readinessForLove: 50,
      lonelinessCatalyst: 0,
      memoryFrequency: 0,
      spontaneousThought: 0,
      anticipation: 0,
      encounterImpact: 0,
      reunionImpact: 0,
      unexpectedDiscoveryImpact: 0,
      attractionGrowth: 0,
      romanticSpark: 0,
      latentAffection: 0,
      romanticMomentum: 0,
      onsetCertainty: 0,

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
      admiration: 0,
      fascination: 0,
      gratitude: 0,
      joy: 0,
      relief: 0,
      relationshipHope: 50,
      selfWorth: 60,
      romanticConfidence: 50,
      desirabilityConfidence: 50,
      deservingLove: 60,
      inferiority: 0,
      selfDoubt: 0,
      humiliation: 0,
      rejectionPain: 0,
      rightToAsk: 40,
      needForAffection: 0,
      needToBeChosen: 0,
      needToBeNeeded: 0,
      needToBeReliedOn: 0,
      needToProtect: 0,
      needToCaretake: 0,
      needToReceiveCare: 0,
      needToDepend: 0,
      needForAutonomy: 60,
      closenessComfort: 50,
      fearOfEngulfment: 0,
      separationDistress: 0,
      approachImpulse: 0,
      withdrawalImpulse: 0,
      escapeImpulse: 0,
      clingImpulse: 0,
      returnImpulse: 0,
      silenceImpulse: 0,
      protestImpulse: 0,
      appeasementImpulse: 0,
      repairDrive: 50,
      apologyImpulse: 0,
      forgivenessReadiness: 50,
      stubbornResistance: 0,
      perceivedReciprocity: 0,
      perceivedAffection: 0,
      perceivedRejection: 0,
      perceivedBondThreat: 0,
      perceivedRivalThreat: 0,
      perceivedBetrayal: 0,
      perceivedFairness: 50,
      perceivedSafety: 50,
      certaintyOfHerAffection: 0,
      certaintyOfOwnFeelings: 0,
      expectationOfRepair: 50,
      reputationConcern: 50,
      roleConflict: 0,
      dutyPressure: 0,
      privacyNeed: 50,
      fearOfJudgment: 0,
      fearOfRidicule: 0,
      fearOfRejection: 0,
      fearOfDependency: 0,
      fearOfLosingControl: 0,
      regretAnticipation: 0,
      missedChanceFear: 0,
      recentAcceptanceImpact: 0,
      recentRejectionImpact: 0,
      recentAffectionImpact: 0,
      recentJealousyImpact: 0,
      unresolvedConflictWeight: 0,
      promiseImportance: 50,
      positiveMemorySalience: 50,
      negativeMemorySalience: 50,
      loneliness: 0,
      frustration: 0,
      resentment: 0,
      confrontationDrive: 0,
      reassuranceSeeking: 0,
      touchImpulse: 0,
      hairTouchImpulse: 0,
      handTouchImpulse: 0,
      embraceImpulse: 0,
      kissImpulse: 0,
      privateTimeWish: 0,
      reluctanceToPart: 0,
      invitationImpulse: 0,
      sexualIntimacyWish: 0,
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
      emotionalActivation: 0,
      calmness: 70,
      stress: 0,
      fatigue: 0,
      courage: 50,
      decisiveness: 50,
      patience: 60,
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
      romanticBoldness: 50,
      physicalInitiative: 50,
      intimacyCaution: 50,
      sexualDirectness: 50,
      dependencyTendency: 50,
      conflictAvoidance: 50,
      tendernessTendency: 50,
      selfEsteemStability: 50,
      rejectionSensitivityTrait: 50,
      attachmentAnxiety: 50,
      attachmentAvoidance: 50,
      autonomyNeedTrait: 50,
      closenessNeedTrait: 50,
      needToBeNeededTendency: 50,
      protectivenessTendency: 50,
      caretakingTendency: 50,
      receivingCareComfort: 50,
      vulnerabilityTolerance: 50,
      shameSensitivity: 50,
      guiltSensitivity: 50,
      angerReactivity: 50,
      sadnessReactivity: 50,
      ruminationTendency: 50,
      forgivenessTendency: 50,
      grudgeTendency: 50,
      repairTendency: 50,
      reassuranceNeedTendency: 50,
      emotionalVolatility: 50,
      optimismTendency: 50,
      assertiveness: 50,
      stubbornness: 50,
      patienceTendency: 50,
      controlTendency: 50,
      dominanceTendency: 50,
      accommodationTendency: 50,
      romanticIdealism: 50,
      fearOfJudgmentTrait: 50,
      fearOfRejectionTrait: 50,
      privacyTendency: 50,
      dutyOrientation: 50,
      memoryOfHurtPersistence: 50,
      positiveMemoryBias: 50,
      loveAtFirstSightSusceptibility: 50,
      slowBurnTendency: 50,
      familiarityBondingTendency: 50,
      friendshipToLoveTendency: 50,
      admirationToLoveTendency: 50,
      physicalAttractionWeight: 50,
      intellectualAttractionWeight: 50,
      emotionalAttractionWeight: 50,
      chemistrySensitivity: 50,
      romanticOpennessTrait: 50,
      preexistingCrushPersistence: 50,
      noveltySeekingInLove: 50
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
        romanticBoldness: 58,
        physicalInitiative: 60,
        intimacyCaution: 76,
        sexualDirectness: 42,
        dependencyTendency: 40,
        conflictAvoidance: 35,
        tendernessTendency: 72,
        selfEsteemStability: 82,
        rejectionSensitivityTrait: 48,
        attachmentAnxiety: 44,
        attachmentAvoidance: 46,
        autonomyNeedTrait: 70,
        closenessNeedTrait: 66,
        needToBeNeededTendency: 55,
        protectivenessTendency: 68,
        caretakingTendency: 62,
        receivingCareComfort: 38,
        vulnerabilityTolerance: 42,
        shameSensitivity: 48,
        guiltSensitivity: 62,
        angerReactivity: 35,
        sadnessReactivity: 48,
        ruminationTendency: 55,
        forgivenessTendency: 64,
        grudgeTendency: 36,
        repairTendency: 72,
        reassuranceNeedTendency: 46,
        emotionalVolatility: 28,
        optimismTendency: 62,
        assertiveness: 76,
        stubbornness: 64,
        patienceTendency: 74,
        controlTendency: 52,
        dominanceTendency: 66,
        accommodationTendency: 54,
        romanticIdealism: 62,
        fearOfJudgmentTrait: 42,
        fearOfRejectionTrait: 48,
        privacyTendency: 72,
        dutyOrientation: 84,
        memoryOfHurtPersistence: 58,
        positiveMemoryBias: 55,
        loveAtFirstSightSusceptibility: 34,
        slowBurnTendency: 78,
        familiarityBondingTendency: 72,
        friendshipToLoveTendency: 62,
        admirationToLoveTendency: 68,
        physicalAttractionWeight: 48,
        intellectualAttractionWeight: 72,
        emotionalAttractionWeight: 78,
        chemistrySensitivity: 54,
        romanticOpennessTrait: 48,
        preexistingCrushPersistence: 64,
        noveltySeekingInLove: 32
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
        romanticBoldness: 34,
        physicalInitiative: 42,
        intimacyCaution: 94,
        sexualDirectness: 24,
        dependencyTendency: 58,
        conflictAvoidance: 62,
        tendernessTendency: 78,
        selfEsteemStability: 52,
        rejectionSensitivityTrait: 78,
        attachmentAnxiety: 68,
        attachmentAvoidance: 36,
        autonomyNeedTrait: 48,
        closenessNeedTrait: 78,
        needToBeNeededTendency: 76,
        protectivenessTendency: 82,
        caretakingTendency: 84,
        receivingCareComfort: 46,
        vulnerabilityTolerance: 32,
        shameSensitivity: 88,
        guiltSensitivity: 92,
        angerReactivity: 28,
        sadnessReactivity: 68,
        ruminationTendency: 82,
        forgivenessTendency: 72,
        grudgeTendency: 28,
        repairTendency: 84,
        reassuranceNeedTendency: 72,
        emotionalVolatility: 58,
        optimismTendency: 52,
        assertiveness: 48,
        stubbornness: 46,
        patienceTendency: 68,
        controlTendency: 36,
        dominanceTendency: 38,
        accommodationTendency: 72,
        romanticIdealism: 68,
        fearOfJudgmentTrait: 82,
        fearOfRejectionTrait: 82,
        privacyTendency: 78,
        dutyOrientation: 94,
        memoryOfHurtPersistence: 66,
        positiveMemoryBias: 52,
        loveAtFirstSightSusceptibility: 62,
        slowBurnTendency: 58,
        familiarityBondingTendency: 68,
        friendshipToLoveTendency: 46,
        admirationToLoveTendency: 54,
        physicalAttractionWeight: 88,
        intellectualAttractionWeight: 62,
        emotionalAttractionWeight: 74,
        chemistrySensitivity: 76,
        romanticOpennessTrait: 56,
        preexistingCrushPersistence: 74,
        noveltySeekingInLove: 46
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
        romanticBoldness: 49,
        physicalInitiative: 52,
        intimacyCaution: 89,
        sexualDirectness: 34,
        dependencyTendency: 35,
        conflictAvoidance: 32,
        tendernessTendency: 58,
        selfEsteemStability: 78,
        rejectionSensitivityTrait: 46,
        attachmentAnxiety: 34,
        attachmentAvoidance: 58,
        autonomyNeedTrait: 78,
        closenessNeedTrait: 48,
        needToBeNeededTendency: 46,
        protectivenessTendency: 68,
        caretakingTendency: 52,
        receivingCareComfort: 32,
        vulnerabilityTolerance: 34,
        shameSensitivity: 42,
        guiltSensitivity: 68,
        angerReactivity: 42,
        sadnessReactivity: 38,
        ruminationTendency: 62,
        forgivenessTendency: 58,
        grudgeTendency: 42,
        repairTendency: 64,
        reassuranceNeedTendency: 38,
        emotionalVolatility: 24,
        optimismTendency: 56,
        assertiveness: 78,
        stubbornness: 72,
        patienceTendency: 82,
        controlTendency: 58,
        dominanceTendency: 62,
        accommodationTendency: 42,
        romanticIdealism: 42,
        fearOfJudgmentTrait: 52,
        fearOfRejectionTrait: 44,
        privacyTendency: 84,
        dutyOrientation: 96,
        memoryOfHurtPersistence: 62,
        positiveMemoryBias: 48,
        loveAtFirstSightSusceptibility: 28,
        slowBurnTendency: 82,
        familiarityBondingTendency: 76,
        friendshipToLoveTendency: 58,
        admirationToLoveTendency: 62,
        physicalAttractionWeight: 52,
        intellectualAttractionWeight: 66,
        emotionalAttractionWeight: 70,
        chemistrySensitivity: 44,
        romanticOpennessTrait: 38,
        preexistingCrushPersistence: 56,
        noveltySeekingInLove: 28
      },
      char_004: {
        rationality: 55,
        impulseControl: 58,
        ethicalRigidity: 65,
        socialCaution: 50,
        respectForAutonomy: 70,
        possessiveTendency: 78,
        jealousySensitivity: 72,
        abandonmentSensitivity: 70,
        suspicionTendency: 55,
        prideTendency: 76,
        emotionalExpressiveness: 44,
        pursuitTendency: 72,
        romanticBoldness: 66,
        physicalInitiative: 72,
        intimacyCaution: 48,
        sexualDirectness: 58,
        dependencyTendency: 62,
        conflictAvoidance: 44,
        tendernessTendency: 62,
        selfEsteemStability: 46,
        rejectionSensitivityTrait: 68,
        attachmentAnxiety: 70,
        attachmentAvoidance: 58,
        autonomyNeedTrait: 55,
        closenessNeedTrait: 78,
        needToBeNeededTendency: 72,
        protectivenessTendency: 72,
        caretakingTendency: 56,
        receivingCareComfort: 36,
        vulnerabilityTolerance: 32,
        shameSensitivity: 58,
        guiltSensitivity: 56,
        angerReactivity: 72,
        sadnessReactivity: 62,
        ruminationTendency: 68,
        forgivenessTendency: 54,
        grudgeTendency: 60,
        repairTendency: 74,
        reassuranceNeedTendency: 66,
        emotionalVolatility: 64,
        optimismTendency: 36,
        assertiveness: 68,
        stubbornness: 78,
        patienceTendency: 40,
        controlTendency: 66,
        dominanceTendency: 66,
        accommodationTendency: 42,
        romanticIdealism: 50,
        fearOfJudgmentTrait: 55,
        fearOfRejectionTrait: 68,
        privacyTendency: 60,
        dutyOrientation: 82,
        memoryOfHurtPersistence: 76,
        positiveMemoryBias: 54,
        loveAtFirstSightSusceptibility: 48,
        slowBurnTendency: 62,
        familiarityBondingTendency: 86,
        friendshipToLoveTendency: 42,
        admirationToLoveTendency: 46,
        physicalAttractionWeight: 72,
        intellectualAttractionWeight: 45,
        emotionalAttractionWeight: 78,
        chemistrySensitivity: 68,
        romanticOpennessTrait: 52,
        preexistingCrushPersistence: 84,
        noveltySeekingInLove: 35
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

    romanceOnsetModel: {
      principle: [
        "恋の始まり方をキャラクター作成時に一種類へ固定しない。事前認知・初対面の魅力・相性・親近感・出来事・現在の恋愛余力から結果として判定する。",
        "一目惚れは可能だが必須ではない。初対面で何も起きず、顔見知り・友人・仕事仲間から徐々に好意が育つことも同じシステムで扱う。",
        "主人公側が初対面でも、攻略対象側には priorAwareness / priorInterest / priorCrush がある可能性を持てる。ただし実ログ・人物設定に根拠がない事前関係をAIが勝手に確定してはいけない。",
        "romanceScoreの増減だけで恋愛開始を表現しない。思い出す、次に会うのが楽しみ、理由なく気になる、安心する等の前兆を蓄積して恋愛へ移行できる。"
      ],
      onsetTypes: {
        none_yet: "まだ恋愛発生と呼べる状態ではない。",
        preexisting_crush: "物語開始前からすでに好意が存在していた。",
        love_at_first_sight: "初対面または初めて個人的に認識した瞬間に、恋愛感情が強く発火した。",
        instant_attraction: "初対面で強く惹かれたが、まだ恋そのものとまでは自覚していない。",
        latent_crush: "以前から気になっていた感情が、接触をきっかけに恋愛へ表面化した。",
        slow_burn: "反復接触・親近感・安心感・記憶の蓄積から徐々に恋愛へ育った。",
        friendship_to_love: "親しさ・信頼・友情に近い関係から恋愛へ移行した。",
        admiration_to_love: "尊敬・憧れ・能力への評価が恋愛感情へ変化した。",
        physical_to_emotional: "最初は外見・身体的魅力が中心だったが、後から人柄・愛着へ深まった。",
        emotional_to_romantic: "安心・共感・心の近さが先に育ち、後から恋愛として自覚した。",
        conflict_to_attraction: "反発・緊張・意識し合う関係の中で魅力が育った。",
        reunion_rekindling: "以前の認知・好意が再会によって再燃した。",
        unexpected_fall: "本人の想定外の出来事や一面によって、短期間で恋愛へ傾いた。"
      },
      progressionRule: "onsetTypeは人格ラベルではなく、その恋がどう始まったかの経路。途中で新しい証拠が増えた場合、none_yet→slow_burn等へ更新してよいが、確定した過去経路を都合よく書き換えない。",
      preexistingRule: "priorAwareness等は0でもよい。人物設定・実ログ・ユーザー指定がある場合のみ高値を持たせる。"
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
        "privateTimeWish",
        "reluctanceToPart",
        "invitationImpulse",
        "sexualIntimacyWish",
        "kissImpulse",
        "embraceImpulse",
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
        low_activation: "そもそもの欲求圧が低い。理性が勝ったのではなく、強い葛藤自体がまだ起きていない。",
        restraint_wins: "理性・倫理・自制が優勢。欲求は消さず、視線、沈黙、言い淀み、予定確認など小さな漏れとして出してよい。seekHeroineが高いなら無関心・撤退へ変換しない。",
        restraint_leaks: "抑制が勝っているが完全には隠せない。嫉妬を認める、理由を聞く、会いたいと言う、少し強く引き止める等が漏れる。",
        conflict: "欲求と抑制が拮抗。言う／言わない、近づく／止まる、責めたい／信じたい等の矛盾を同じ場面に残す。",
        desire_partly_wins: "欲求が部分的に勝つ。普段なら抑える本音、要求、悋気、引き止め、接近が明確に出る。ただし人格全体や倫理観が消えるわけではない。",
        desire_wins: "欲求が強く勝つ。本人が『するべきではない』と理解している行動や強い言葉まで出る可能性がある。ただし主人公の明確な拒絶・境界は越えて追跡や接触を継続しない。"
      }
    },

    intimacyExpression: {
      scope: "主人公・攻略対象が成人である恋愛作品における、非露骨な親密さの希望・誘い・軽い身体接触を扱う。",
      allowedNonExplicitSignals: [
        "自宅や部屋へ誘う。例：『うち来る？』",
        "別れたくない気持ちを言う。例：『今日は帰したくないな』",
        "この先も一緒にいたい、帰る気になれない等を匂わせる。",
        "二人きりになりたい、もう少し一緒にいたいと伝える。",
        "髪・頬・手に触れる。",
        "手を取る、手をつなぐ。",
        "抱きしめる、抱き寄せる。",
        "キスする、キスしようと距離を詰める。",
        "キスより先の親密さを望んでいることを、露骨な性行為描写なしに台詞・間・視線・躊躇・誘いとして示す。"
      ],
      notRequired: "実際の性行為を描写する必要はない。sexualIntimacyWishは『もっと一緒にいたい』『帰したくない』『部屋へ誘いたい』等の成人同士の親密な希望を自然に発生させるために使う。",
      protagonistAgency: "攻略対象が自分から誘う・触れる・抱きしめる・キスする等の行動は生成してよいが、主人公側の受諾・台詞・心理・身体反応をAIが勝手に補完しない。",
      refusalRule: "主人公が明確に拒絶した場合は、それ以降の接触・説得・追跡を続けない。拒絶前の欲求・迷い・切なさまで無かったことにはしない。",
      personalityRule: "同じ欲求値でも、romanticBoldness / physicalInitiative / intimacyCaution / sexualDirectness と現在の理性・倫理・自制によって、直接誘う、遠回しに言う、触れる寸前で止まる、言葉だけ漏れる等へ変える。"
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
      "needForClarity + unresolvedEmotion がある → 曖昧なまま時間で消さず、話し合い・確認を起こす。",
      "reluctanceToPart + privateTimeWish + seekHeroine が高い → 『もう少し一緒にいたい』『帰したくない』等の別れを惜しむ言動へ。",
      "invitationImpulse + romanticBoldness が高く、intimacyCautionが低め → 自宅・部屋・次の場所へ比較的直接誘う。",
      "invitationImpulseが高いがintimacyCaution / shame / hesitationも高い → 遠回しな誘い、言い直し、寸前で引く等の揺れになる。",
      "kissImpulse / embraceImpulse が高くphysicalInitiativeも高い → 段階と状況が許せば攻略対象側から軽い身体接触を起こす。",
      "sexualIntimacyWishが高くても、露骨な性行為描写へ直結させない。成人同士の『この先も一緒にいたい』という期待・誘い・緊張として表す。",
      "perceivedAffection が高いのに romanticConfidence / deservingLove が低い → 好意を感じても『本当に自分でいいのか』と信じ切れない。",
      "certaintyOfHerAffection が高く fearOfRejection が低い → 同じ欲求でも自分から動きやすい。",
      "fearOfRejection + missedChanceFear がともに高い → 断られるのも怖いが、何もしないで失うのも怖い。迷いながら踏み込む状態になる。",
      "selfWorth が低く seekHeroine / needToBeChosen が高い → 必要以上の不安・確認欲求が生じうるが、attachmentAvoidance が高ければ逆に距離を取ることもある。",
      "needToBeNeeded + needToProtect / needToCaretake が高い → 主人公の役に立ちたい。ただし助けを恋愛の対価にはしない。",
      "needToReceiveCare / needToDepend が高く vulnerabilityTolerance が低い → 甘えたいのに頼れず、弱音を隠したり遠回しに助けを求める。",
      "fearOfEngulfment + emotionalNeed が高い → 近づきたいのに近づきすぎると怖い、という押し引きが発生する。",
      "approachImpulse + withdrawalImpulse がともに高い → 近づいては止まる、離れてから戻る等のpush-pullを許す。",
      "repairDrive + apologyImpulse が高いが pride / stubbornResistance も高い → 仲直りしたいのにすぐ謝れず、遠回りな修復行動になる。",
      "resentment / unresolvedConflictWeight が高く forgivenessReadiness が低い → 表面的に会話できてもわだかまりは残る。",
      "recentAcceptanceImpact / recentAffectionImpact が高い → romanticConfidence / perceivedSafety / courage が上がりやすい。",
      "recentRejectionImpact / rejectionPain が高い → fearOfRejection / hesitation / withdrawalImpulse が上がりやすい。",
      "negativeMemorySalience が高い → 過去の傷が現在の疑い・防御へ影響しやすい。positiveMemorySalience が高い場合は良い記憶も同時に関係修復を後押しできる。",
      "perceivedBetrayal + trust がともに高い → 信じていたからこそ傷つく。trust を即0にせず、疑いと信頼が並存してよい。",
      "roleConflict / dutyPressure が高い → 恋愛感情ではなく行動の可否・タイミングを抑制する。seekHeroine を消さない。",
      "privacyNeed / fearOfJudgment が高い → 人前では抑え、二人きりでは感情が出やすい差を作れる。",
      "courage + missedChanceFear が上がると、fearOfRejection が残っていても告白・誘い・引き止めへ踏み出しやすい。"
    ],

    updateRules: [
      "全項目を毎回動かす必要はない。出来事に直接影響された項目だけ維持・増減する。",
      "相反する項目を自動相殺しない。例：jealousy 80 と trust 80、controlUrge 70 と ethics 95 は同時に成立する。",
      "一時的な感情状態と固定的な性格傾向を混同しない。性格はpsychologyTraits、現在状態はstate各値として扱う。",
      "恋愛段階が進んだ後、理由なくseekHeroineだけを低値へ戻して受け身化しない。",
      "謝罪・説明があってもhurt / resentment / suspicion等を即0にしない。納得度と人物傾向に応じて段階的に変える。",
      "主人公が何もしなくても、seekHeroine / pursuitDrive / longing / needForClarity 等が高ければ攻略対象自身を起点に行動を開始する。",
      "selfWorth / romanticConfidence / perceivedAffection 等の認知値は、事実そのものではなく攻略対象本人の現在認知として扱う。実ログと矛盾する誤解を持つこともある。",
      "recentAcceptanceImpact / recentRejectionImpact / recentAffectionImpact / recentJealousyImpact は時間や新しい出来事で徐々に弱まる。1場面で理由なく0へしない。",
      "unresolvedConflictWeight は未解決の問題が残る限り維持し、話し合い・謝罪・説明・行動変化等が起きてから下げる。",
      "固定傾向は急変させない。psychologyTraits は人物設定変更がない限り原則維持し、場面ごとの変動はstate側で表現する。",
      "現在状態は固定人格ではない。同じ人物でも睡眠不足、拒絶、再会、成功、嫉妬、安心等で複数値が一時的に変化してよい。"
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

  psychology.evaluateRomanceOnset = (rawState = {}, characterId = rawState.characterId) => {
    const state = psychology.normalizeState(rawState, characterId);
    const t = state.psychologyTraits;
    const avg = values => values.reduce((sum, value) => sum + clamp(value), 0) / values.length;

    const attractionComposite = (
      state.appearanceAttraction * (t.physicalAttractionWeight / 100) +
      state.sexualAttraction * (t.physicalAttractionWeight / 100) +
      state.intellectualAttraction * (t.intellectualAttractionWeight / 100) +
      state.emotionalAttraction * (t.emotionalAttractionWeight / 100) +
      state.chemistry * (t.chemistrySensitivity / 100)
    ) / Math.max(
      0.01,
      ((t.physicalAttractionWeight * 2) +
       t.intellectualAttractionWeight +
       t.emotionalAttractionWeight +
       t.chemistrySensitivity) / 100
    );

    const openness = avg([
      state.romanticOpenness,
      state.readinessForLove,
      t.romanticOpennessTrait,
      100 - state.fearOfRejection,
      100 - state.fearOfEngulfment
    ]);

    const firstEncounterSpark = avg([
      state.firstImpression,
      state.chemistry,
      state.encounterImpact,
      attractionComposite,
      openness,
      t.loveAtFirstSightSusceptibility
    ]);

    const gradualBond = avg([
      state.familiarity,
      state.comfort,
      state.trust,
      state.emotionalAttraction,
      state.memoryFrequency,
      state.spontaneousThought,
      state.anticipation,
      state.attractionGrowth,
      t.slowBurnTendency,
      t.familiarityBondingTendency
    ]);

    const priorBond = avg([
      state.priorAwareness,
      state.priorFamiliarity,
      state.priorInterest,
      state.priorCrush,
      state.priorAdmiration,
      state.priorCuriosity,
      state.priorFantasy,
      t.preexistingCrushPersistence
    ]);

    const currentActivation = avg([
      attractionComposite,
      state.intrigue,
      state.fascination,
      state.latentAffection,
      state.romanticSpark,
      state.romanticMomentum,
      state.memoryFrequency,
      state.spontaneousThought,
      state.anticipation,
      state.seekHeroine
    ]);

    const computedSpark = clamp(
      (firstEncounterSpark * 0.35) +
      (gradualBond * 0.25) +
      (priorBond * 0.20) +
      (currentActivation * 0.20)
    );

    let onsetType = "none_yet";
    let confidence = 0;

    const candidates = [];

    candidates.push({
      type: "preexisting_crush",
      score: avg([state.priorCrush, state.priorInterest, state.priorAwareness, t.preexistingCrushPersistence])
    });

    candidates.push({
      type: "love_at_first_sight",
      score: avg([
        firstEncounterSpark,
        attractionComposite,
        state.encounterImpact,
        state.chemistry,
        t.loveAtFirstSightSusceptibility,
        100 - state.familiarity
      ])
    });

    candidates.push({
      type: "instant_attraction",
      score: avg([
        attractionComposite,
        state.intrigue,
        state.chemistry,
        state.firstImpression,
        state.encounterImpact,
        100 - state.familiarity
      ])
    });

    candidates.push({
      type: "latent_crush",
      score: avg([
        state.priorInterest,
        state.priorCuriosity,
        state.latentAffection,
        state.encounterImpact,
        state.attractionGrowth,
        state.romanticMomentum
      ])
    });

    candidates.push({
      type: "slow_burn",
      score: avg([
        gradualBond,
        state.familiarity,
        state.comfort,
        state.memoryFrequency,
        state.anticipation,
        t.slowBurnTendency,
        t.familiarityBondingTendency
      ])
    });

    candidates.push({
      type: "friendship_to_love",
      score: avg([
        state.familiarity,
        state.trust,
        state.comfort,
        state.emotionalAttraction,
        state.perceivedSafety,
        t.friendshipToLoveTendency
      ])
    });

    candidates.push({
      type: "admiration_to_love",
      score: avg([
        state.admiration,
        state.priorAdmiration,
        state.intellectualAttraction,
        state.emotionalAttraction,
        state.fascination,
        t.admirationToLoveTendency
      ])
    });

    candidates.push({
      type: "physical_to_emotional",
      score: avg([
        state.appearanceAttraction,
        state.sexualAttraction,
        state.emotionalAttraction,
        state.attachment,
        state.familiarity,
        t.physicalAttractionWeight
      ])
    });

    candidates.push({
      type: "emotional_to_romantic",
      score: avg([
        state.emotionalAttraction,
        state.comfort,
        state.trust,
        state.tenderness,
        state.attachment,
        state.latentAffection
      ])
    });

    candidates.push({
      type: "conflict_to_attraction",
      score: avg([
        state.intrigue,
        state.chemistry,
        state.emotionalActivation,
        state.attractionGrowth,
        Math.min(100, state.anger + state.frustration),
        state.fascination
      ])
    });

    candidates.push({
      type: "reunion_rekindling",
      score: avg([
        state.priorAwareness,
        state.priorInterest,
        state.priorFamiliarity,
        state.reunionImpact,
        state.encounterImpact,
        state.romanticMomentum
      ])
    });

    candidates.push({
      type: "unexpected_fall",
      score: avg([
        state.unexpectedDiscoveryImpact,
        state.attractionGrowth,
        state.romanticSpark,
        state.intrigue,
        state.fascination,
        state.romanticMomentum
      ])
    });

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const activeRomanceEvidence = Math.max(
      state.romanceScore,
      state.seekHeroine,
      state.romanticAwareness,
      state.latentAffection,
      state.romanticMomentum,
      state.romanticSpark,
      computedSpark
    );

    if (activeRomanceEvidence >= 35 && best.score >= 45) {
      onsetType = best.type;
      confidence = Math.round(best.score);
    }

    // 一目惚れは高い閾値を要求し、単なる外見的魅力と混同しない。
    if (onsetType === "love_at_first_sight" &&
        !(firstEncounterSpark >= 72 &&
          attractionComposite >= 65 &&
          state.encounterImpact >= 60 &&
          state.familiarity <= 30)) {
      onsetType = "instant_attraction";
      confidence = Math.round(Math.max(
        candidates.find(x => x.type === "instant_attraction")?.score || 0,
        firstEncounterSpark
      ));
    }

    // 物語開始前の恋は、明確な事前好意がない限り勝手に成立させない。
    if (onsetType === "preexisting_crush" && state.priorCrush < 50) {
      onsetType = state.priorInterest >= 45 ? "latent_crush" : "none_yet";
    }

    return {
      onsetType,
      confidence,
      computedSpark: Math.round(computedSpark),
      attractionComposite: Math.round(attractionComposite),
      firstEncounterSpark: Math.round(firstEncounterSpark),
      gradualBond: Math.round(gradualBond),
      priorBond: Math.round(priorBond),
      currentActivation: Math.round(currentActivation),
      candidates: candidates.slice(0, 4).map(x => ({
        type: x.type,
        score: Math.round(x.score)
      })),
      meaning: psychology.romanceOnsetModel.onsetTypes[onsetType]
    };
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
    if (desirePressure < 15) outcome = "low_activation";
    else if (delta <= -25) outcome = "restraint_wins";
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

  psychology.evaluateApproachAvoidance = (rawState = {}, characterId = rawState.characterId) => {
    const state = psychology.normalizeState(rawState, characterId);
    const t = state.psychologyTraits;
    const avg = values => values.reduce((sum, value) => sum + clamp(value), 0) / values.length;

    const repairRelevant = Math.max(
      state.unresolvedConflictWeight,
      state.hurt,
      state.anger,
      state.resentment,
      state.perceivedBetrayal,
      state.rejectionPain
    ) >= 15;
    const activeRepairDrive = repairRelevant ? state.repairDrive : 0;

    const approachPressure = avg([
      state.seekHeroine,
      state.approachImpulse,
      state.pursuitDrive,
      state.returnImpulse,
      activeRepairDrive,
      state.longing,
      state.needToBeChosen,
      state.needForClarity,
      state.missedChanceFear,
      state.courage,
      state.perceivedReciprocity,
      t.pursuitTendency,
      t.closenessNeedTrait
    ]);

    const avoidancePressure = avg([
      state.withdrawalImpulse,
      state.escapeImpulse,
      state.fearOfRejection,
      state.fearOfJudgment,
      state.shame,
      state.humiliation,
      state.selfDoubt,
      state.hesitation,
      state.fearOfEngulfment,
      state.regretAnticipation,
      t.attachmentAvoidance,
      t.conflictAvoidance,
      t.rejectionSensitivityTrait
    ]);

    const delta = approachPressure - avoidancePressure;
    const approachActivation = Math.max(
      state.seekHeroine,
      state.approachImpulse,
      state.pursuitDrive,
      state.longing,
      state.returnImpulse,
      activeRepairDrive,
      state.missedChanceFear
    );
    let mode = "push_pull";
    if (approachActivation < 15 && state.perceivedBondThreat < 15 && state.fearOfRejection < 15) mode = "neutral";
    else if (delta >= 25) mode = "approach";
    else if (delta >= 8) mode = "approach_with_fear";
    else if (delta <= -25) mode = "defensive_withdrawal";
    else if (delta <= -8) mode = "withdraw_but_attached";

    return {
      approachPressure: Math.round(approachPressure),
      avoidancePressure: Math.round(avoidancePressure),
      delta: Math.round(delta),
      mode,
      guidance: {
        neutral: "接近・回避の葛藤自体がまだ強く動いていない。無理に押し引きを発生させない。",
        approach: "求める力が明確に勝つ。自分から会う、聞く、誘う、修復する方向へ進みやすい。",
        approach_with_fear: "怖さ・羞恥・拒絶不安を抱えたまま、それでも主人公へ近づく。",
        push_pull: "近づきたい力と逃げたい力が拮抗。近づいて止まる、離れて戻る、言って撤回しかける等の揺れを出せる。",
        withdraw_but_attached: "一時的に距離を取る力がやや勝つが、愛着やseekHeroineは残る。後から戻る余地を保持する。",
        defensive_withdrawal: "防御的距離が強い。今は接近より退避を選びやすいが、恋愛感情そのものを自動消去しない。"
      }[mode]
    };
  };

  psychology.evaluateRepairDrive = (rawState = {}, characterId = rawState.characterId) => {
    const state = psychology.normalizeState(rawState, characterId);
    const t = state.psychologyTraits;
    const avg = values => values.reduce((sum, value) => sum + clamp(value), 0) / values.length;

    const repairPressure = avg([
      state.repairDrive,
      state.apologyImpulse,
      state.returnImpulse,
      state.relationshipHope,
      state.expectationOfRepair,
      state.seekHeroine,
      state.attachment,
      state.wantToBelieve,
      t.repairTendency,
      t.forgivenessTendency
    ]);

    const resistance = avg([
      state.resentment,
      state.hurt,
      state.anger,
      state.stubbornResistance,
      state.pride,
      state.perceivedBetrayal,
      state.unresolvedConflictWeight,
      100 - state.forgivenessReadiness,
      t.stubbornness,
      t.grudgeTendency
    ]);

    const delta = repairPressure - resistance;
    const conflictActivation = Math.max(
      state.unresolvedConflictWeight,
      state.hurt,
      state.anger,
      state.resentment,
      state.perceivedBetrayal,
      state.rejectionPain
    );
    let mode = "repair_conflicted";
    if (conflictActivation < 15) mode = "no_conflict";
    else if (delta >= 25) mode = "repair_now";
    else if (delta >= 8) mode = "repair_cautiously";
    else if (delta <= -25) mode = "not_ready";
    else if (delta <= -8) mode = "wants_repair_but_resists";

    return {
      repairPressure: Math.round(repairPressure),
      resistance: Math.round(resistance),
      delta: Math.round(delta),
      mode,
      guidance: {
        no_conflict: "修復すべき明確な喧嘩・傷つきが現在ない。仲直り行動を無理に発生させない。",
        repair_now: "関係修復へ自分から動きやすい。謝罪・説明要求・会う提案などを具体的に起こせる。",
        repair_cautiously: "修復したいが傷は残る。すぐ元通りにせず、条件や確認を伴う。",
        repair_conflicted: "仲直りしたい気持ちと怒り・意地が拮抗。遠回り、言い淀み、態度の揺れとして出せる。",
        wants_repair_but_resists: "本心では関係を捨てたくないが、傷・意地・不信が強く、すぐには折れない。",
        not_ready: "現時点では修復を受け入れにくい。無理に許さず、未解決感情を維持する。"
      }[mode]
    };
  };

  psychology.evaluateAttachmentTension = (rawState = {}, characterId = rawState.characterId) => {
    const state = psychology.normalizeState(rawState, characterId);
    const t = state.psychologyTraits;
    const closenessPull = (
      state.emotionalNeed +
      state.needForAffection +
      state.needToBeChosen +
      state.needToDepend +
      state.clingImpulse +
      state.separationDistress +
      t.attachmentAnxiety +
      t.closenessNeedTrait
    ) / 8;

    const distancePull = (
      state.needForAutonomy +
      state.fearOfEngulfment +
      state.fearOfDependency +
      state.withdrawalImpulse +
      state.privacyNeed +
      t.attachmentAvoidance +
      t.autonomyNeedTrait
    ) / 7;

    const difference = closenessPull - distancePull;
    let mode = "balanced_tension";
    if (closenessPull >= 65 && distancePull >= 65) mode = "strong_push_pull";
    else if (difference >= 20) mode = "closeness_seeking";
    else if (difference <= -20) mode = "distance_protecting";

    return {
      closenessPull: Math.round(closenessPull),
      distancePull: Math.round(distancePull),
      difference: Math.round(difference),
      mode,
      guidance: {
        closeness_seeking: "親密さ・確認・愛情を強く求める。拒絶不安が高ければ甘えや確認行動が増える。",
        distance_protecting: "好意があっても自立・防御・私生活を守る力が強い。距離を取ることを愛情消失と同一視しない。",
        strong_push_pull: "強く近づきたいのに、近づきすぎるのも怖い。恋愛の押し引き・矛盾が最も出やすい。",
        balanced_tension: "親密さと自立の両方をある程度保てる。現在イベント次第でどちらにも揺れる。"
      }[mode]
    };
  };

  psychology.evaluateIntimacyInitiative = (rawState = {}, characterId = rawState.characterId) => {
    const state = psychology.normalizeState(rawState, characterId);
    const t = state.psychologyTraits;
    const conflict = psychology.evaluateConflict(state, characterId);

    const intimacyDesire = (
      state.seekHeroine +
      state.physicalNeed +
      state.passion +
      state.privateTimeWish +
      state.reluctanceToPart +
      state.invitationImpulse +
      state.kissImpulse +
      state.embraceImpulse +
      state.sexualIntimacyWish
    ) / 9;

    const initiativeTrait = (
      t.romanticBoldness +
      t.physicalInitiative +
      t.pursuitTendency
    ) / 3;

    const caution = (
      t.intimacyCaution +
      state.reason +
      state.selfControl +
      state.socialRestraint +
      state.respectForHeroine
    ) / 5;

    const score = clamp(
      (intimacyDesire * 0.55) +
      (initiativeTrait * 0.30) +
      (state.restraintBreakingImpulse * 0.15) -
      (caution * 0.25)
    );

    let mode = "none";
    if (score >= 75) mode = "direct_initiative";
    else if (score >= 55) mode = "clear_signal";
    else if (score >= 35) mode = "indirect_signal";
    else if (intimacyDesire >= 45) mode = "suppressed_desire";

    return {
      score: Math.round(score),
      intimacyDesire: Math.round(intimacyDesire),
      conflict,
      mode,
      guidance: {
        none: "親密な誘い・接触を無理に発生させない。",
        suppressed_desire: "望んではいるが理性や性格が勝つ。視線、沈黙、名残惜しさ、言いかけて止める等で欲求を残す。",
        indirect_signal: "『もう少し一緒にいたい』等の遠回しな希望や、手・髪へ触れたい素振りなどを出せる。",
        clear_signal: "自宅へ誘う、帰したくないと伝える、抱きしめる、キスへ進む等を性格と段階に合わせて自発的に選べる。",
        direct_initiative: "欲求が強く理性が部分的に負けている。普段より直接的な誘い・引き止め・抱擁・キス等が出る。ただし明確な拒絶後は継続しない。"
      }[mode]
    };
  };

  window.RenaiGamePsychologyParameters = Object.freeze(psychology);
})();