'use strict';
const fs=require('node:fs'),path=require('node:path');
const runtime=require('../js/ai_turn_runtime.js');
const baseline=require('../tests/fixtures/lite_loading_baseline.json');
const root=path.resolve(__dirname,'../..');
async function measure(){
  let requests=[];
  const revision='0'.repeat(40); // Fixture key for the current checked-out bytes.
  const paths=runtime.liteRulePaths(baseline.characterId);
  const fetchSource=async file=>{
    const source=fs.readFileSync(path.join(root,file),'utf8');
    requests.push({path:file,bytes:Buffer.byteLength(source)});return source;
  };
  const first=await runtime.loadSources({characterId:baseline.characterId,revision,paths,fetchSource});
  const cold={requests:requests.length,bytes:requests.reduce((sum,request)=>sum+request.bytes,0)};
  requests=[];
  const second=await runtime.loadSources({characterId:baseline.characterId,revision,paths,fetchSource,cache:first.cache});
  const warm={requests:requests.length,bytes:requests.reduce((sum,request)=>sum+request.bytes,0)};
  return {baselineRevision:baseline.revision,characterId:baseline.characterId,
    before:{cold:baseline.cold,warm:baseline.warm},after:{cold,warm},
    reductionPercent:Math.round((1-cold.bytes/baseline.cold.bytes)*1000)/10,
    sourcePaths:first.fetchPaths,cacheReused:second.reusePaths.length};
}
function render(result){
  return '# 軽量版のAI資料読み込み計測\n\n'+
    '計測コマンド：`node simulation/scripts/benchmark_lite_loading.cjs`。対象は`'+result.characterId+'`（源顕守）。比較元は修正前の`'+result.baselineRevision+'`。\n\n'+
    '| 条件 | 修正前のファイル取得数 | 修正後のファイル取得数 | 修正前のUTF-8バイト数 | 修正後のUTF-8バイト数 |\n|---|---:|---:|---:|---:|\n'+
    '| 初回・保持キャッシュなし | '+result.before.cold.requests+' | '+result.after.cold.requests+' | '+result.before.cold.bytes+' | '+result.after.cold.bytes+' |\n'+
    '| 同じcommit・取得済み原文を保持 | '+result.before.warm.requests+' | '+result.after.warm.requests+' | '+result.before.warm.bytes+' | '+result.after.warm.bytes+' |\n\n'+
    '初回の資料量は'+result.reductionPercent+'%削減。同じcommitの再取得は0件です。毎Turnの最新HEAD確認は続け、commitが変わった場合・資料が欠けた場合は必ず取得します。別の会話へキャッシュが自動で渡るとは扱いません。\n\n'+
    'この計測は、実ファイルをローダーへ渡して取得数とUTF-8バイト数を集計したものです。HEAD確認・初回runtimeの取得・プロフィール・物語本文の転送・保存時の資料取得は表の対象外です。本文全文と現在心理は維持しています。通信待ち時間やChatGPTの文章生成時間を測った値ではなく、秒単位の高速化率を表しません。心理計算と本文・意味の検査も引き続き毎Turn実行します。\n';
}
async function main(args){
  if(args.length>1||(args.length===1&&!['--write','--check'].includes(args[0])))throw Error('使い方: benchmark_lite_loading.cjs [--write|--check]');
  const result=await measure(),file=path.join(root,'simulation-lite/LOAD_BENCHMARK.md');
  if(args[0]==='--write')fs.writeFileSync(file,render(result));
  else if(args[0]==='--check'){
    if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==render(result))throw Error('読み込み計測表をbenchmark_lite_loading.cjs --writeで更新してください。');
  }
  console.log(JSON.stringify(result,null,2));
}
if(require.main===module)main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={measure,render,main};
