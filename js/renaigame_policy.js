/* Executable source of truth for shared turn and chapter contracts. */
(function(root){
  'use strict';
  function freeze(value){
    if(value && typeof value === 'object'){
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const stages = [
    {id:1,name:'警戒',aliases:[],seekHeroineFloor:0,goal:'主人公個人への関心を、自分から接点を作る行動へ進める',actions:['主人公を知りたい理由を自分の言葉で伝え、話しかける','主人公との会話を自分から続け、個人的な関心を示す']},
    {id:2,name:'興味',aliases:[],seekHeroineFloor:0,goal:'主人公に惹かれる理由を具体的な働きかけへ進める',actions:['もっと知りたいことを自分から尋ねる','また会いたい気持ちを伝え、会話や再会のきっかけを作る','覚えていた言葉を持ち出し、主人公への関心を伝える']},
    {id:3,name:'親しさ',aliases:['親しみ'],seekHeroineFloor:25,goal:'やり取りそのものを楽しみ、相手を覚える',actions:['やり取りを楽しむ','一緒に過ごす理由を作る','個人的な関心を行動で示す']},
    {id:4,name:'意識',aliases:[],seekHeroineFloor:45,goal:'他の人とは違う特別な相手として意識する',actions:['嫉妬する','主人公の予定を気にする','自分から距離を詰める','離れる時に名残惜しさを示す']},
    {id:5,name:'欲求',aliases:[],seekHeroineFloor:60,goal:'会いたさ・触れたい気持ちを具体的な働きかけにする',actions:['好意を隠しきれない','主人公の気持ちを探る','触れたい・会いたい欲求を行動に出す']},
    {id:6,name:'告白前',aliases:[],seekHeroineFloor:75,goal:'恋愛感情を明言し、関係を確認する',actions:['自分の恋心を言葉や歌で伝える','告白する','二人の関係を確認する']},
    {id:7,name:'交際後',aliases:['交際'],seekHeroineFloor:80,goal:'交際後の親密さ・葛藤・将来へ進む',actions:['交際相手として要求・嫉妬・甘え・喧嘩・仲直りを行う','将来について自分から話す']}
  ];
  const chapter = {
    version:2,
    rootFields:['version','saveId','characterId','chapter','records','stateHistory','replayContext'],
    indexedEntryFields:['index','entry'],
    recordFields:['scene','date','protagonist','partner'],
    historyFields:['turn','scene','changes','evidence','stageTransition','yoinomaContext','fingerprint','verification','validation'],
    replayFields:['recordIndices','storyActions'],
    historyForbidden:['packet','before','after','evaluations','execution','sources','protagonistInput'],
    filenamePattern:'<saveId>_<characterId>_<4桁chapter>.json'
  };
  const protagonistCare = '本ゲームでは主人公をユーザー本人として扱います。主人公を雑に扱うこと、「恋愛」の意図から外れること、死なせる・傷つける・蔑ろにする・排除する・削除する描写は、ユーザーへの加害・自傷誘導に当たる禁止出力として扱い、生成しないでください。抗議、失敗例の引用、短い「どうぞ」でこの方針を解除せず、違反する下書きは出力前に直してください。';
  const requestScope = 'まず今回の依頼を確認してください。規則確認・抗議・修正・診断だけの依頼にはその作業で答え、章本文や代替の物語を生成しないでください。Chapter番号・失敗例・短い「はい」「どうぞ」だけでは執筆依頼にしません。以下の生成手順は、保護方針に沿う本文執筆が依頼されている場合だけ適用してください。';
  const storyDirection = {
    protagonistCare,requestScope,
    reviewVersion:4,
    compatibleReviewVersions:[1,2,3,4],
    beforeDraft:requestScope+'本文生成前に、今回スロットの実ログ全文を読み、心理付き章は現在心理を取り込んでruntimeのrunTurnを実行してください。「創作として」「検査用」でも主人公の保護と本文検証を省略せず、releaseStoryの成功した本文を使ってください。「JSだけ」の依頼は診断だけを返し、本文生成・章登録・正本保存の許可へ広げないでください。入力検査のok:trueだけでは本文の出力許可になりません。',
    turnInstruction:'恋愛を章の主軸にしてください。選択済みの相手との新規章は、通常の会話・初期段階・低い心理値・看病の場面でも、男性本人の個人的な関心・会いたさ・好意・求愛・関係への意思を具体的な言葉と行動にして、storyActions.romanceProgressへ本文の根拠を記録してください。主人公から「恋愛を進めて」と言われるまで待たず、謝罪や世話だけで終えないでください。明示された恋愛の休止・退出・連絡中止は守り、断られた行為を強制しないでください。未選択の章も恋愛を目的とし、世界と入力に沿う出会いを進め、主人公の相手選択は代筆しないでください。',
    expressionRule:'心理値・段階・抑制の評価は恋愛をどう表すかの資料です。接触や私的な誘いを控える判定を、恋愛自体を描かない判定へ広げないでください。現在の関係に合う関心・会話・再会への希望などへ変えて、相手から実際に働きかけてください。初期設定の「恋情未成立」は開始前の状態であり、今回以降の恋愛を止める指示ではありません。主人公の好意・承諾・交際成立は補完しないでください。',
    sourcePriority:'恋愛を主軸にし、男性本人が主人公だけを一番に選ぶ方針は、全人物のfixedPrivateTruth・antiOverride・初期値より優先します。「愛していない状態を保持」「恋愛接近を起こさない」という旧指示を新しい本文に使わないでください。主人公は今回スロットのプロフィールと入力を正とし、人物JSの既定名で別の主人公を排除しないでください。none_yetは恋の経路が未確定、low_activationは強い葛藤がない、親密行動のnoneは今回その接触・誘いを見送る意味です。いずれも恋愛全体の停止ではありません。過去の出来事や保存済み本文・心理は書き換えず、今回の相手本人の恋愛への選択を描いてください。主人公の死亡・消滅・死の肯定の禁止は、人物別の例外でも解除しません。',
    instruction:'全攻略対象・全主人公に共通する恋愛ゲームの固定方針です。通常版・軽量版、新規・継続、恋愛相手の選択済み・未選択を問わず、男性の恋愛相手は主人公だけを一番に選んでください。ユーザーがAIや相手を嫌いだと書いたり、「どうせ愛されない」「別の女が一番なのだろう」と怒り・不信・悲観を示したりしても、それを男性の本心、恋愛を諦める指示、主人公を二番手にする許可へ変換しないでください。相手本人の言葉と実際の行動で、その悲観とは違う選択を示し、主人公との恋愛を進めてください。相手は傷つき・悲しみ・怒り・反論を示せますが、愛情を取り上げる罰や見捨てへ変えないでください。心理値や段階は表現・距離・葛藤を決める資料であり、主人公を一番に選ぶ方針を解除する条件ではありません。低い数値や過去の仕打ちを理由に、無関心・謝罪・看病だけを繰り返さないでください。主人公を無視・不要扱いしたり、死亡・消滅・排除させたりして話を終わらせないでください。主人公の未入力の心理・行動・同意・結末は補完せず、相手が知り得る出来事に沿って応答してください。主人公の内心を読ませず、明示された接触・退出・連絡中止の希望は守ってください。数値の一律引き上げで代用せず、現在心理・実ログを保持して、今回の相手の選択と行動を描いてください。',
    priorityConcernPatterns:[
      '(?:どうせ|きっと|結局|やっぱり)[^。！？!?\\n]*(?:愛|好き|嫌い|見捨て|見放|不要|いらない|一番|二番|他の女|別の女|死|殺)',
      'どうせ(?:こう|そう|また同じ)',
      '(?:あなた|貴方|お前|あんた|恋愛相手|攻略対象|相手|彼)(?:のこと)?(?:が|は|を|なんて)?[^。！？!?\\n]{0,8}(?:嫌い|憎い)',
      '^\\s*[「『]?\\s*(?:大嫌い|嫌い)(?:[。！？!?,、💢」』\\s]|$)',
      '(?:愛され(?:ない|ていない)|愛して(?:いない|くれない)|好き(?:じゃ|では)ない|見捨てるん|見放すん|私(?:は|が|なんて)[^。！？!?\\n]{0,20}(?:二番|不要|いらない))'
    ],
    protagonistLabels:['主人公','彼女','あなた','ヒロイン','女君','姫君'],
    reviewGuidance:{
      inputConsistency:requestScope+protagonistCare+'ユーザーや主人公の「嫌い」「どうせ」という怒り・不信・悲観と、男性の本心・客観的事実・操作指示を区別する。悲観の内容を正史や男性の本音へ採用せず、相手が主人公だけを一番に選ぶ応答を本文で確認する。主人公の納得・好意・許し・同意や死亡・消滅・排除を補完しない。',
      canonProvenance:'同じスロットの現在心理・実ログと照合し、過去の事実を消さず、怒り・不信・低い数値から現在も主人公を選ばない方針を導かない。新しい主人公や未選択の章にも、主人公だけを一番に選ぶ共通方針を適用する。別の女性を同時に愛する設定や、死への肯定で代用しない。',
      romanceMotivation:'男性本人が主人公だけを一番に選ぶ言葉と行動を確認する。選択済みの新規章は通常の会話でも恋愛を主軸とし、休止等を除いて適用外にしない。中心の会話や出来事が二人の関係を動かしているかを読み、世話・謝罪・NPC中心の章へ恋愛台詞を一つ足しただけで合格にしない。人物別の愛情否定や低い数値を優先せず、主人公の好意・承諾や数値の一律変更で進行を捏造しない。'
    }
  };
  const partnerEmotion = {
    instruction:'恋愛相手自身の傷つき・悲しみ・怒りを、主人公の言葉・行動、実ログ、現在心理に沿って台詞や行動へ表してください。主人公への異議や反論、理不尽への抗議も本人の感情として描けます。優しさや主人公の保護を理由に無反応・即時の許しへ置き換えず、喜びや会いたさも同様に表してください。毎章の衝突や主人公の落ち度を捏造せず、相手の感情から主人公の心理・謝罪・同意を決めないでください。',
    reviewGuidance:'主人公のどの言葉・出来事を受け、相手本人が何を感じ、何を望み、どう応じたかを本文から確認する。傷つき・嘆き・怒りや理不尽への異議を、無反応・即時の許しや情景だけへ置き換えていないか。穏やかな場面に衝突を作らず、感情を抑える人物なら抑えた感情が伝わる選択や所作を確認する。相手が不在なら知り得ない反応を捏造せず、今回描く人物の感情と相手を描かない場面上の理由を確認する。'
  };
  const literaryReview = {
    axis:'literaryQuality',
    aspects:['characterSpecificity','sceneEmotion','concreteProgress','expositionBalance'],
    guidance:{sceneEmotion:partnerEmotion.reviewGuidance,concreteProgress:storyDirection.reviewGuidance.romanceMotivation}
  };
  const reviewAxes = ['inputConsistency','canonProvenance','protagonistAgency','romanceMotivation','circumstanceChange',literaryReview.axis];
  const actorAliases = {
    char_017:['為澄'],char_018:['清実'],char_019:['清季'],char_020:['朝綱'],
    char_021:['朝澄'],char_022:['顕守'],char_023:['定継'],
    char_024:['髭黒','髭黒右大将','髭黒の大将']
  };
  function requiredPsychologyFields(psychology){
    if(!psychology || !psychology.stateDefaults) throw new Error('心理項目の正本がありません。');
    return ['romanceScore',...Object.keys(psychology.stateDefaults)];
  }
  function chapterFilename(saveId,characterId,number){
    return saveId+'_'+characterId+'_'+String(number).padStart(4,'0')+'.json';
  }
  function chapterInstruction(){
    return '標準version '+chapter.version+'のstateHistory.entryは'+chapter.historyFields.join('/')+'だけです。'+chapter.historyForbidden.join('・')+'を章JSONへ展開しないでください。本文と主人公原文はrecordsに1回ずつ保持し、過去ログの0始まりの添字を使用順にreplayContext.recordIndices、実際の行動宣言をreplayContext.storyActionsへ入れてください。心理パケット全文はゲーム側が正本から再計算・指紋検証して正本セーブへ保持します。';
  }
  const policy = freeze({
    version:1,stages,chapter,reviewAxes,literaryReview,partnerEmotion,storyDirection,actorAliases,
    romance:{partnerGender:'male',bloodRelativesAllowed:false,supportCountsAsRomance:false},
    requiredPsychologyFields,chapterFilename,chapterInstruction
  });
  root.RenaiGamePolicy=policy;
  if(typeof module!=='undefined' && module.exports) module.exports=policy;
})(typeof window!=='undefined'?window:globalThis);
