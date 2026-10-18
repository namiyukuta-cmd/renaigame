/* AI-side save transport. Uses the connected GitHub tools, never a browser
 * token, public repository, proxy, or alternate write after a denial. */
(function(root){
  'use strict';
  const REPOSITORY='namiyukuta-cmd/private-game-data',BASE='https://api.github.com/repos/'+REPOSITORY;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function sort(value){return Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value;}
  const equal=(a,b)=>JSON.stringify(sort(a))===JSON.stringify(sort(b));
  const sha=value=>typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value);
  function decodeBase64(value){
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',text=String(value).replace(/\s/g,'');
    if(!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('GitHubのblobをUTF-8として読めません。');
    let bits=0,count=0,encoded='';
    for(const char of text.replace(/=+$/,'')){
      bits=(bits<<6)|alphabet.indexOf(char);count+=6;
      if(count>=8){count-=8;encoded+='%'+((bits>>count)&255).toString(16).padStart(2,'0');}
    }
    return decodeURIComponent(encoded);
  }
  function toolData(result){
    let value=result;
    for(let depth=0;depth<10;depth++){
      if(value?.isError)throw Error((value.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n')||'GitHubツールが処理を拒否しました。');
      if(value?.structuredContent){value=value.structuredContent;continue;}
      if(typeof value==='string'){
        if(!value.trim()||value.trim()==='Action completed.')throw Error('GitHubの実データがありません。完了通知だけでは保存成功と扱いません。');
        value=JSON.parse(value);continue;
      }
      if(value?.game==='simulation'||Array.isArray(value?.saves))return value;
      if(value?.encoding==='base64'&&typeof value.content==='string'){value=decodeBase64(value.content);continue;}
      if(typeof value?.content==='string'&&value.content.trim()){value=value.content;continue;}
      if(Array.isArray(value?.content)){value=value.content.find(c=>c.type==='text')?.text;continue;}
      if(!value||typeof value!=='object')throw Error('GitHubの応答データが正しくありません。');
      return value;
    }
    throw Error('GitHubの応答形式を読み取れません。');
  }
  async function saveChapter({bundle,api,github}){
    if(!api?.createChapterWritePlan||!github||['fetch','fetchFile','createTree','createCommit','updateRef'].some(key=>typeof github[key]!=='function'))throw Error('AI保存には共通保存JSと接続済みGitHubツールが必要です。');
    if(!bundle||!/^[A-Za-z0-9_-]{1,120}$/.test(bundle.saveId||''))throw Error('保存先saveIdが正しくありません。');
    if(bundle.version===2)api.assertChapterBundleV2(bundle);
    const repo=toolData(await github.fetch({url:BASE}));
    if(repo.full_name!==REPOSITORY||repo.private!==true||typeof repo.default_branch!=='string')throw Error('保存先が指定された非公開リポジトリではありません。');
    const branch=repo.default_branch,branchData=toolData(await github.fetch({url:BASE+'/branches/'+encodeURIComponent(branch)}));
    const head=branchData.commit?.sha,baseTree=branchData.commit?.commit?.tree?.sha;
    if(!sha(head)||!sha(baseTree))throw Error('非公開セーブの開始コミットを確認できません。');
    async function readJson(path,ref){
      let value=toolData(await github.fetchFile({repository_full_name:REPOSITORY,path,ref,encoding:'utf-8'}));
      if(typeof value.content==='string'&&!value.content.trim()&&sha(value.sha))value=toolData(await github.fetch({url:BASE+'/git/blobs/'+value.sha}));
      return value;
    }
    const path='renaigame/simulation/saves/'+bundle.saveId+'.json',indexPath='renaigame/simulation/saves/index.json';
    const [loaded,index]=await Promise.all([readJson(path,head),readJson(indexPath,head)]);
    const save=await api.hydrateSave(null,loaded,path=>readJson(path,head));
    const plan=await api.createChapterWritePlan(clone(bundle),{head,save,index});
    if(plan.alreadySaved)return {saved:true,alreadySaved:true,saveId:plan.saveId,chapter:plan.chapter,commit:head};
    if(plan.head!==head||plan.files.length!==2||plan.files[0].path!==path||plan.files[1].path!==indexPath)throw Error('検証した保存先と書込み計画が一致しません。');
    const tree=toolData(await github.createTree({repository_full_name:REPOSITORY,base_tree_sha:baseTree,tree_elements:plan.files.map(file=>({path:file.path,mode:'100644',type:'blob',content:JSON.stringify(file.data,null,2)}))}));
    if(!sha(tree.sha))throw Error('保存用treeの実データがありません。');
    const commit=toolData(await github.createCommit({repository_full_name:REPOSITORY,parent_sha:head,tree_sha:tree.sha,message:'Save simulation '+plan.saveId+' Chapter '+plan.chapter}));
    if(!sha(commit.sha))throw Error('保存コミットの実データがありません。');
    const updated=toolData(await github.updateRef({repository_full_name:REPOSITORY,branch_name:branch,sha:commit.sha,expected_sha:head,force:false}));
    if(updated.success!==true&&updated.object?.sha!==commit.sha)throw Error('非公開セーブへの反映を確認できません。');
    let confirmed;
    try{confirmed=await Promise.all(plan.files.map(file=>readJson(file.path,commit.sha)));}
    catch(error){throw Error('保存コミット '+commit.sha+' の再取得確認は未完了です：'+error.message);}
    if(plan.files.some((file,i)=>!equal(file.data,confirmed[i])))throw Error('保存コミットを再取得した内容が一致しません。保存確認は未完了です。');
    return {saved:true,alreadySaved:false,saveId:plan.saveId,chapter:plan.chapter,commit:commit.sha};
  }
  const api=Object.freeze({saveChapter});root.RenaiGameAISave=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
