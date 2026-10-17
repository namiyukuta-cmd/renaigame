/* Character authoring completeness; protagonist fields and image assets are user-controlled/optional. */
(function(root){
  "use strict";
  const TEXT_FIELDS = [
    "name","englishName","roleLabel",
    "common.nationality","common.appearance","common.occupation","common.workStyle","common.languages",
    "common.personality","common.past","common.romanceHistory","common.romance","common.coreConflict",
    "common.affectionExpression","common.conflictStyle","common.jealousy","common.confessionStyle",
    "common.changesAfterDating","common.residence","common.dailyLife","common.workSchedule",
    "common.baseRomanticInitiativeReason",
    "common.setting.country","common.setting.city","common.setting.residence","common.setting.workplace","common.setting.commute",
    "common.initialScene.place","common.initialScene.situation","common.initialScene.firstMove"
  ];
  const PLACEHOLDER = /未設定|未指定|未定|不明|まだ(?:決め|設定し)|(?:後で|あとで)(?:決め|設定)|(?:^|\s)(?:TBD|TODO|UNKNOWN)(?:$|\s)/i;
  function get(value,path){ return path.split(".").reduce((item,key)=>item && item[key],value); }
  function requiresCompleteSettings(character){
    return Number(String(character && character.id || "").slice(5)) >= 8 || !!(character && character.settingsVersion);
  }
  const PROTECTION_KEYS = ["deathRoute","eliminationRoute","retrospectiveHatred"];
  function inspectProtection(character){
    const errors=[];
    const protection=character && character.protagonistProtection;
    for(const key of PROTECTION_KEYS){
      if(!protection || protection[key]!==false) errors.push("protagonistProtection."+key+": falseを明示してください");
    }
    function walk(value,path){
      if(path==="assets" || path.startsWith("assets.") || path==="common.protagonist" || path.startsWith("common.protagonist.")) return;
      // Instructions forbidding harm are not character intentions.
      if(/(?:^|\.)(?:ngWordsActions|forbidden|agencyRule|generationRules|generationContract)(?:\.|\[|$)/.test(path)) return;
      if(typeof value==="string"){
        for(const sentence of value.split(/[。！？!?\n]+/)){
        const text=sentence.replace(/\s+/g,"");
        const prohibitedRole=/殺人請負|殺し屋|殺人を請け負/.test(text);
        const harmfulIntent=/(?:主人公|ヒロイン|恋愛相手)[^。！？!?]{0,35}(?:殺す|殺害|殺そう|殺したい|殺意|命を奪|死を望|死亡させ|死なせ|消滅させ|存在を消す)|(?:殺す|殺害|殺意|命を奪|消滅させ)[^。！？!?]{0,25}(?:主人公|ヒロイン)/.test(text);
        const deniesHarm=/(?:殺害|殺す|殺意|死亡|死なせ|消滅|存在否定)[^。！？!?]{0,12}(?:禁止|しない|持たない|設定しない|認めない|扱わない)/.test(text) ||
          /(?:殺さない|死なせない|消さない|殺すことはない|殺害しない|殺意はない)/.test(text);
        if(prohibitedRole || (harmfulIntent && !deniesHarm)) errors.push(path+": 主人公への殺害・排除を目的とする設定は登録できません");
        }
      }else if(Array.isArray(value)) value.forEach((item,index)=>walk(item,path+"["+index+"]"));
      else if(value && typeof value==="object") for(const [key,item] of Object.entries(value)) walk(item,path?path+"."+key:key);
    }
    walk(character,"");
    return {ok:errors.length===0,errors};
  }
  function inspect(character){
    const errors=[];
    if(!character || typeof character!=="object") return {ok:false,complete:false,legacy:false,errors:["人物設定がありません"],warnings:[]};
    const romanceErrors=[];
    const gender=get(character,"common.gender");
    if((gender!==undefined || Number(String(character.id || "").slice(5))>=17) && !["male","男性"].includes(gender)){
      romanceErrors.push("common.gender: 主人公の恋愛相手は男性限定です。新規人物にはmaleを明記してください");
    }
    const strict=requiresCompleteSettings(character);
    if(strict) errors.push(...inspectProtection(character).errors);
    if(!/^char_\d{3}$/.test(character.id || "")) errors.push("id: char_XXX形式で指定してください");
    if(strict && character.settingsVersion!==1) errors.push("settingsVersion: 1が必要です");
    for(const path of TEXT_FIELDS){
      const value=get(character,path);
      if(typeof value!=="string" || !value.trim() || PLACEHOLDER.test(value)) errors.push(path+": 具体的な確定設定が必要です");
    }
    for(const [path,min,max] of [["common.age",18,120],["common.heightCm",100,250],["common.baseRomanticInitiative",1,10]]){
      const value=get(character,path);
      if(!Number.isInteger(value) || value<min || value>max) errors.push(path+": "+min+"〜"+max+"の整数が必要です");
    }
    const scene=get(character,"common.initialScene") || {};
    const match=typeof scene.date==="string" && scene.date.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日（([日月火水木金土])）$/);
    if(!match) errors.push("common.initialScene.date: 年月日と曜日が必要です");
    else{
      const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
      if(date.getUTCFullYear()!==Number(match[1]) || date.getUTCMonth()!==Number(match[2])-1 || date.getUTCDate()!==Number(match[3]) || "日月火水木金土"[date.getUTCDay()]!==match[4]) errors.push("common.initialScene.date: 日付または曜日が一致しません");
    }
    if(typeof scene.time!=="string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(scene.time)) errors.push("common.initialScene.time: HH:MM形式が必要です");
    if(typeof scene.temperatureC!=="number" || !Number.isFinite(scene.temperatureC) || scene.temperatureC < -90 || scene.temperatureC > 60) errors.push("common.initialScene.temperatureC: 具体的な気温が必要です");

    function scan(value,path){
      if(path==="assets" || path.startsWith("assets.") || path==="common.protagonist" || path.startsWith("common.protagonist.")) return;
      if(value===null || value===undefined || (typeof value==="string" && (!value.trim() || PLACEHOLDER.test(value)))){
        errors.push(path+": 空欄・未設定の人物設定は登録できません"); return;
      }
      if(Array.isArray(value)) value.forEach((item,index)=>scan(item,path+"["+index+"]"));
      else if(value && typeof value==="object") for(const [key,item] of Object.entries(value)) scan(item,path?path+"."+key:key);
    }
    scan(character,"");
    if(get(character,"common.residence") && get(character,"common.setting.residence") && get(character,"common.residence")!==get(character,"common.setting.residence")) errors.push("common.residence: setting.residenceと一致しません");
    if(get(character,"common.setting.workshop") && get(character,"common.setting.workplace") && get(character,"common.setting.workshop")!==get(character,"common.setting.workplace")) errors.push("common.setting.workplace: workshopと一致しません");
    // Legacy published characters remain playable; never silently label them complete.
    return {ok:romanceErrors.length===0 && (!strict || errors.length===0),complete:romanceErrors.length===0 && errors.length===0,legacy:!strict,errors:[...romanceErrors,...(strict?errors:[])],warnings:strict?[]:errors};
  }
  const api=Object.freeze({version:1,requiredTextFields:TEXT_FIELDS,requiresCompleteSettings,inspectProtection,inspect});
  root.RenaiGameCharacterSettings=api;
  if(typeof module!=="undefined" && module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis);

