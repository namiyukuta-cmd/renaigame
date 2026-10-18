'use strict';
// Use the workflow's test list, so local and CI checks cannot drift apart.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/ai-turn-tests.yml'),'utf8');
const commands=[...workflow.matchAll(/^      - run: node ([^\r\n]+)$/gm)].map(match=>match[1].trim().split(/\s+/));
if(!commands.length) throw Error('CIの検査一覧がありません。');
let failed=0;
for(const args of commands){
  if(args[0].endsWith('/check_ai_turn.cjs')) throw Error('一括検査をCI一覧へ再帰登録できません。');
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
  console.log((result.status===0?'PASS: ':'FAIL: ')+args.join(' '));
  if(result.status!==0){failed++;process.stderr.write(result.stdout||'');process.stderr.write(result.stderr||String(result.error||''));}
}
console.log((commands.length-failed)+'/'+commands.length+' checks passed');
process.exitCode=failed?1:0;
