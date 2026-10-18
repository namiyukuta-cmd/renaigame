'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),scope={};scope.window=scope;
const registry=fs.readFileSync(path.join(root,'simulation/js/simulation_characters.js'),'utf8');
for(const match of registry.matchAll(/"(simulation_character_\d{3}\.js)"/g))vm.runInNewContext(fs.readFileSync(path.join(root,'simulation/js',match[1]),'utf8'),scope);
const characters=Object.values(scope.SimulationCharacters).sort((a,b)=>b.id.localeCompare(a.id)).map(c=>({id:c.id,name:c.name,age:c.common?.age||'',occupation:c.common?.occupation||''}));
const target=path.join(root,'simulation-lite/characters.json'),expected=JSON.stringify({characters},null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==expected)throw Error('軽量版の相手一覧を再生成してください。');}
else fs.writeFileSync(target,expected);
