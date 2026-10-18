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
    {id:1,name:'警戒',aliases:[],seekHeroineFloor:0,goal:'節度を保って相手を知り始める',actions:['必要な会話に具体的に答える','節度を保って自分から話しかける']},
    {id:2,name:'興味',aliases:[],seekHeroineFloor:0,goal:'相手個人への関心が生まれる',actions:['個人的な質問をする','会話のきっかけを作る','相手の言葉を覚えて持ち出す']},
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
  const reviewAxes = ['inputConsistency','canonProvenance','protagonistAgency','romanceMotivation','circumstanceChange'];
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
    version:1,stages,chapter,reviewAxes,
    romance:{partnerGender:'male',bloodRelativesAllowed:false,supportCountsAsRomance:false},
    requiredPsychologyFields,chapterFilename,chapterInstruction
  });
  root.RenaiGamePolicy=policy;
  if(typeof module!=='undefined' && module.exports) module.exports=policy;
})(typeof window!=='undefined'?window:globalThis);
