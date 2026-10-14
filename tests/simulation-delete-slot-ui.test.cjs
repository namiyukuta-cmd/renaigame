const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.disabled=false;this.dataset={};this.classList={add(){}};}
 append(...nodes){nodes.forEach(n=>this.appendChild(n));}
 appendChild(n){n.parent=this;this.children.push(n);return n;}
 insertBefore(n,before){n.parent=this;this.children.splice(this.children.indexOf(before),0,n);}
 replaceChild(n,old){const i=this.children.indexOf(old);assert.ok(i>=0);this.children[i]=n;n.parent=this;old.parent=null;}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,fn){this.listeners[type]=fn;}
 setAttribute(k,v){this[k]=v;}
 querySelectorAll(selector){const result=[];const walk=n=>{for(const c of n.children){if(selector==='button'&&c.tag==='button')result.push(c);walk(c);}};walk(this);return result;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 async click(){if(!this.disabled&&this.listeners.click)await this.listeners.click({target:this});}
}
async function main(){
 const body=new Element('body'),document={body,createElement:t=>new Element(t)},slot={id:'run_a',slotNumber:1,protagonistName:'主人公A',partnerName:'相手A',selectedCharacterId:'char_007',updatedAt:'2026-10-15T00:00:00Z'};
 let consent=false,calls=0,message='',loaded=false;
 const api={getToken:()=> 'fake',getCurrentSaveId:()=> 'run_b',listSaves:async()=>[slot],groupSlots:()=>[{key:'pair',protagonistName:slot.protagonistName,partnerName:slot.partnerName,slots:[slot]}],deleteSaveById:async(id,expected)=>{assert.equal(id,'run_a');assert.equal(expected.pairKey,'pair');calls++;return {clearedCurrent:false};},loadSaveById:async()=>{loaded=true;}};
 const window={};vm.runInNewContext(fs.readFileSync(__dirname+'/../simulation/js/simulation_slots.js','utf8'),{window,document,RenaiGameSave:api,alert(){},confirm:s=>{message=s;return consent;},location:{},Date,WeakMap,Event});
 await window.RenaiGameSlots.open('load',{onLoaded(){}});
 const buttons=()=>body.querySelectorAll('button');const byText=t=>buttons().find(b=>b.textContent===t||b.children.some(n=>n.textContent===t));
 await byText('主人公A ＋ 相手A').click();const remove=byText('削除');assert.ok(remove);assert.equal(remove['aria-label'],'主人公A ＋ 相手Aのスロット 1を削除');
 await remove.click();assert.equal(calls,0);assert.equal(loaded,false);assert.ok(message.includes('主人公A ＋ 相手A'));assert.ok(message.includes('スロット 1'));
 consent=true;await remove.click();assert.equal(calls,1);assert.equal(loaded,false);assert.equal(byText('削除'),undefined);
 console.log('PASS: per-slot delete button, precise confirmation, cancellation makes no deletion, deletion does not load');
}
main().catch(e=>{console.error(e);process.exit(1)});
