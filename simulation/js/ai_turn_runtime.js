/* Shared loader for fetched repository JS. No filesystem, network or DOM is needed. */
(function(root){
  'use strict';
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  function fail(message){ throw new Error('AI実行環境: ' + message); }
  function sourcePaths(characterId){
    if(typeof characterId !== 'string' || !/^char_\d{3}$/.test(characterId)) fail('characterIdが不正です。');
    const number = characterId.slice(5);
    return [
      'js/renaigame_policy.js',
      'simulation/js/character_settings_validator.js',
      'js/renaigame_romance_rules.js',
      'js/renaigame_psychology_parameters.js',
      'simulation/js/ai_turn_engine.js',
      'simulation/js/simulation_character_' + number + '.js',
      'simulation/js/simulation_character_' + number + '_behavior.js'
    ];
  }
  function sourceText(value, path){
    if(object(value)){
      if(value.isError) fail(path + ': 取得ツールがエラーを返しました。');
      value = value.structuredContent || value;
      if(value.encoding && value.encoding !== 'utf-8') fail(path + ': UTF-8にデコードしたソース本文が必要です。');
      value = value.content;
    }
    if(typeof value !== 'string' || !value.trim() || value.trim() === 'Action completed.') fail(path + ': JSソース本文がありません。ツールの完了メッセージは実行できません。');
    return value;
  }
  function liteRulePaths(characterId){
    if(characterId!==null)sourcePaths(characterId);
    const paths=[
      'simulation-lite/AI_ENTRY.md',
      'simulation/AI_CONVERSATION_RULES.md',
      'simulation/AI_NOVEL_GENERATION_RULES.md',
      'simulation/STORY_REVIEW_GATE.md',
      'simulation/AI_TURN_EXECUTION.md'
    ];
    if(characterId!==null)paths.push('simulation-lite/character-notes/'+characterId+'.md');
    if(characterId==='char_013')paths.push(
      'simulation/world/mizunagi/world.json',
      'simulation/world/mizunagi/characters.json',
      'simulation/world/mizunagi/timeline.json'
    );
    return paths;
  }
  // The caller verifies current HEAD each turn. All bytes at that immutable
  // commit can be reused; changed/missing sources must still be fetched.
  function sourceRequestPlan({characterId,revision,cache = {},paths = []}){
    if(typeof revision !== 'string' || !/^[0-9a-f]{40}$/i.test(revision)) fail('取得元はbranch名ではなく現在HEADの完全なcommit SHAを指定してください。');
    if(!object(cache) || !Array.isArray(paths)) fail('取得キャッシュまたは追加パスが不正です。');
    const rules = [
      'simulation/PROTAGONIST_CONTINUITY_RULES.md',
      'simulation/ROMANCE_PREFERENCES.md'
    ];
    const scripts=characterId===null?['js/renaigame_policy.js','simulation/js/ai_turn_engine.js']:sourcePaths(characterId);
    const required = [...new Set([...scripts,...rules,...paths])];
    if(required.some(path=>typeof path !== 'string' || path.split('/').some(part=>!part || part === '.' || part === '..') || !/^[A-Za-z0-9_./-]+\.(?:js|md|json)$/.test(path))) fail('取得パスが不正です。');
    const reusable = path=>cache[path]?.revision === revision &&
      typeof cache[path].source === 'string' && cache[path].source.trim() && cache[path].source.trim() !== 'Action completed.';
    return {revision,fetchPaths:required.filter(path=>!reusable(path)),reusePaths:required.filter(reusable)};
  }
  async function loadSources(options){
    const plan = sourceRequestPlan(options), {fetchSource,cache = {}} = options;
    if(typeof fetchSource !== 'function') fail('取得ツールを呼ぶfetchSource(path,revision)が必要です。');
    const fetched = await Promise.all(plan.fetchPaths.map(async path=>{
      try { return [path,sourceText(await fetchSource(path,plan.revision),path)]; }
      catch(error){ throw new Error('AI実行環境: ' + path + 'の取得失敗: ' + error.message); }
    }));
    const sources = Object.fromEntries([...plan.reusePaths.map(path=>[path,cache[path].source]),...fetched]);
    const nextCache = {...cache};
    for(const [path,source] of fetched) nextCache[path] = {revision:plan.revision,source};
    return {sources,cache:nextCache,...plan,changedPaths:fetched.filter(([path,source])=>cache[path]?.source !== source).map(([path])=>path)};
  }
  function createRuntime({sources,save,saveId,characterId,recordIndices,initialState}){
    const paths = sourcePaths(characterId);
    if(!object(sources)) fail('取得済みJSのsourcesがありません。');
    if(typeof saveId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(saveId)) fail('今回のsaveIdを明示してください。');
    if(!object(save) || save.saveId !== saveId || save.state?.selectedCharacterId !== characterId ||
       (save.state?.session?.id && save.state.session.id !== saveId) || (save.meta?.id && save.meta.id !== saveId)) fail('指定セーブ・攻略対象が正本と一致しません。');
    if(save.storage?.format === 'chapter-files-v1') fail('旧分割セーブは全章を復元してから渡してください。');
    if(!object(save.state.profile) || !object(save.state.session?.recordsByCharacter) || !object(save.state.session?.statesByCharacter)) fail('正本のプロフィール・実ログ・心理情報がありません。');
    const snapshot = clone(save);
    const savedRecords = snapshot.state.session.recordsByCharacter[characterId] || [];
    if(!Array.isArray(savedRecords) || savedRecords.some(entry => !object(entry) || entry.__chapterRef)) fail('正本の完全な実ログが必要です。');
    const stateEntry = snapshot.state.session.statesByCharacter[characterId];
    if(stateEntry?.stateHistory !== undefined && !Array.isArray(stateEntry.stateHistory)) fail('正本の心理履歴が不正です。');
    if(stateEntry?.stateHistory?.length && !Array.isArray(snapshot.state.session.recordsByCharacter[characterId])) fail('心理履歴に対応する正本の実ログがありません。');
    if((stateEntry?.stateHistory || []).length > savedRecords.length) fail('心理履歴に対応する実ログが不足しています。省略された章を取得し、空の履歴や初期値で代用しないでください。');
    if(savedRecords.some(entry=>typeof entry.protagonist !== 'string' || !entry.protagonist.trim() ||
       typeof entry.partner !== 'string' || !entry.partner.trim())) fail('実ログの主人公原文または相手の本文がありません。章の参照や要約で代用しないでください。');
    if(!object(stateEntry) && (savedRecords.length || !object(initialState))) fail('現在の心理stateがありません。既存の履歴を初期値で代用しないでください。');
    const state = clone(stateEntry || initialState);
    const indices = recordIndices === undefined ? savedRecords.map((_,index)=>index) : clone(recordIndices);
    if(!Array.isArray(indices) || indices.some(index=>!Number.isSafeInteger(index) || index < 0 || index >= savedRecords.length)) fail('過去ログの参照番号が不正です。');
    const scope = {};
    for(const path of paths){
      const source = sourceText(sources[path],path);
      try {
        // Only trusted repository source goes here. Save text and protagonist
        // input are data and are never passed to Function/eval.
        new Function('window','globalThis','module','require',source)(scope,scope,undefined,undefined);
      }catch(error){
        const wrapped = new Error('AI実行環境: ' + path + 'の読込失敗: ' + error.message);
        wrapped.cause = error;
        throw wrapped;
      }
    }
    const engine = scope.RenaiGameTurnEngine, psychology = scope.RenaiGamePsychologyParameters;
    const character = scope.SimulationCharacters?.[characterId] || scope['SimulationCharacter' + characterId.slice(5)];
    const behavior = scope['SimulationCharacter' + characterId.slice(5) + 'Behavior'];
    if(!scope.RenaiGamePolicy || !scope.RenaiGameCharacterSettings || !scope.RenaiGameRomanceRules || !engine || !psychology || !character || behavior?.characterId !== characterId) fail('必要なJSが同じwindowへ登録されていません。');
    const settings = scope.RenaiGameCharacterSettings.inspect(character);
    if(!settings.ok) fail('人物設定の検査失敗: ' + settings.errors.join('／'));
    const context = {saveId,characterId,recordIndices:indices,recordCount:savedRecords.length,stateHistoryCount:(state.stateHistory || []).length};
    function buildArgs(input){
      if(!object(input) || !object(input.changes) || !object(input.evidence)) fail('今回の原文・changes・evidenceを明示してください。根拠がない場合だけ両方{}にします。');
      return {
        saveId,characterId,character,behavior,psychology,
        sourceHistory:Object.values(scope.RenaiGameSourceHistory?.[characterId] || {}).map(clone),
        stateEntry:clone(state),protagonistProfile:clone(snapshot.state.profile),
        records:indices.map(index=>clone(savedRecords[index])),
        protagonistInput:input.protagonistInput,changes:clone(input.changes),evidence:clone(input.evidence),
        stageTransition:input.stageTransition === undefined ? null : clone(input.stageTransition),
        yoinomaContext:input.yoinomaContext === undefined ? {} : clone(input.yoinomaContext)
      };
    }
    function runTurn(input){
      const args = buildArgs(input), packet = engine.runTurn(args), verification = engine.verifyTurn(args,packet);
      if(!verification.ok) fail('心理計算の再検証失敗: ' + verification.errors.join('／'));
      const policy=scope.RenaiGamePolicy,stage=policy.stages.find(item=>item.id===packet.after.stage);
      return {packet,verification,context:clone(context),generationDirection:{
        objective:policy.storyDirection.turnInstruction,psychologyUse:policy.storyDirection.expressionRule,
        sourcePriority:policy.storyDirection.sourcePriority,
        stage:clone(stage || policy.stages[0])
      }};
    }
    function validateStory(input,packet,story,storyActions = {}){
      const args = buildArgs(input), {verification,validation} = engine.inspectStory(args,packet,story,storyActions);
      if(!verification.ok) fail('元の心理パケットの照合失敗: ' + verification.errors.join('／'));
      if(!validation.ok) fail('本文検証失敗: ' + validation.errors.join('／'));
      return {verification,validation,context:clone(context)};
    }
    function releaseStory(input,packet,story,storyActions = {}){
      return {...engine.releaseStory(buildArgs(input),packet,story,storyActions),context:clone(context)};
    }
    return Object.freeze({scope,buildArgs,runTurn,validateStory,releaseStory,settings:clone(settings),context:clone(context)});
  }
  const api = Object.freeze({version:1,sourcePaths,sourceText,liteRulePaths,sourceRequestPlan,loadSources,createRuntime});
  root.RenaiGameTurnRuntime = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
