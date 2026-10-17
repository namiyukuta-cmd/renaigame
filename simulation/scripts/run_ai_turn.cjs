'use strict';
// Repository sources are read locally; user JSON/text stays data. No network or save writes.
const fs = require('node:fs');
const path = require('node:path');
const runtime = require('../js/ai_turn_runtime.js');
const repoRoot = path.resolve(__dirname,'../..');
const readJson = file => JSON.parse(fs.readFileSync(file,'utf8'));
function main(argv){
  const [command,saveFile,inputFile,packetFile,storyFile] = argv;
  if(!['run','validate'].includes(command) || argv.length !== (command === 'run' ? 3 : 5)) throw new Error('使い方: node simulation/scripts/run_ai_turn.cjs run <save.json> <input.json> または validate <save.json> <input.json> <packet.json> <story.txt>');
  const save = readJson(saveFile), input = readJson(inputFile);
  const sources = Object.fromEntries(runtime.sourcePaths(input.characterId).map(file=>[file,fs.readFileSync(path.join(repoRoot,file),'utf8')]));
  const savedState = save.state?.session?.statesByCharacter?.[input.characterId];
  const logs = save.state?.session?.recordsByCharacter?.[input.characterId];
  const initialState = !savedState && (!logs || !logs.length) ? readJson(path.join(repoRoot,'simulation/state/templates',input.characterId+'_initial_state.json')) : undefined;
  const runner = runtime.createRuntime({sources,save,saveId:input.saveId,characterId:input.characterId,recordIndices:input.recordIndices,initialState});
  if(command === 'run') return runner.runTurn(input);
  const previous = readJson(packetFile);
  const packet = previous.packet || previous;
  const result = runner.validateStory(input,packet,fs.readFileSync(storyFile,'utf8'),input.storyActions || {});
  return {packet,...result};
}
if(require.main === module){
  try{ process.stdout.write(JSON.stringify(main(process.argv.slice(2)),null,2)+'\n'); }
  catch(error){ console.error(error.stack || error.message); process.exitCode = 1; }
}
module.exports = {main};
