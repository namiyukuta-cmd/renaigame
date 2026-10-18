'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'), read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=read('simulation/js/simulation_characters.js');
const files=[...registry.matchAll(/"(simulation_character_\d{3}\.js)"/g)].map(match=>match[1]);
const window={};
for(const file of files) vm.runInNewContext(read('simulation/js/'+file),{window},{filename:file});
const characters=Object.values(window.SimulationCharacters).sort((a,b)=>b.id.localeCompare(a.id)).map(character=>({id:character.id,name:character.name,age:character.common?.age ?? '',occupation:character.common?.occupation || ''}));
const target=path.join(root,'simulation-lite/characters.json'), content=JSON.stringify({characters},null,2)+'\n';
if(process.argv.includes('--check')){
  if(!fs.existsSync(target) || fs.readFileSync(target,'utf8') !== content) throw Error('軽量版の人物目録を再生成してください。');
}else fs.writeFileSync(target,content);
console.log('Lite catalog: '+characters.length+' characters');
