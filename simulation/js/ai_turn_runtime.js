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
    if(!scope.RenaiGameCharacterSettings || !scope.RenaiGameRomanceRules || !engine || !psychology || !character || behavior?.characterId !== characterId) fail('必要なJSが同じwindowへ登録されていません。');
    const settings = scope.RenaiGameCharacterSettings.inspect(character);
    if(!settings.ok) fail('人物設定の検査失敗: ' + settings.errors.join('／'));
    const context = {saveId,characterId,recordIndices:indices,recordCount:savedRecords.length,stateHistoryCount:(state.stateHistory || []).length};
    function buildArgs(input){
      if(!object(input) || !object(input.changes) || !object(input.evidence)) fail('今回の原文・changes・evidenceを明示してください。根拠がない場合だけ両方{}にします。');
      return {
        saveId,characterId,character,behavior,psychology,
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
      return {packet,verification,context:clone(context)};
    }
    function validateStory(input,packet,story,storyActions = {}){
      const args = buildArgs(input), verification = engine.verifyTurn(args,packet);
      if(!verification.ok) fail('元の心理パケットの照合失敗: ' + verification.errors.join('／'));
      const validation = engine.validateStory(args,packet,story,storyActions);
      if(!validation.ok) fail('本文検証失敗: ' + validation.errors.join('／'));
      return {verification,validation,context:clone(context)};
    }
    function releaseStory(input,packet,story,storyActions = {}){
      return engine.releaseStory(buildArgs(input),packet,story,storyActions);
    }
    return Object.freeze({scope,buildArgs,runTurn,validateStory,releaseStory,context:clone(context)});
  }
  const api = Object.freeze({version:1,sourcePaths,sourceText,createRuntime});
  root.RenaiGameTurnRuntime = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
