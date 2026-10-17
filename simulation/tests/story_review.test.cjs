'use strict';
const assert=require('node:assert/strict');
const engine=require('../js/ai_turn_engine.js');
const reviewed=require('./helpers/review_fixture.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const args={saveId:'run_review',protagonistInput:'主人公は実家に戻った。',protagonistProfile:{name:'綾',free:'平安の都。季房は隣家に住む血縁のない青年で、綾と詩の話をしたいと思っている。'},records:[]};
const story='Chapter 1\n都・門前／1001年10月17日（土）／15:00／15℃\n季房は門の外で名を告げた。\n「詩のことを、あなたと話したくて参りました」';
const action='季房は門の外で名を告げた。',intent='「詩のことを、あなたと話したくて参りました」';
const progress={origin:'canon',motivation:{source:'profile',field:'free',quote:'季房は隣家に住む血縁のない青年で、綾と詩の話をしたいと思っている。'},kind:'initiative',actor:'季房',actorGender:'male',bloodRelatedToProtagonist:false,relationshipToProtagonist:'unrelated',actionQuote:action,romanticIntentQuote:intent};
const actions=reviewed(engine,args,story,{romanceProgress:progress});
const before=JSON.stringify({args,story,actions});
const missing=engine.validateContinuity(args,story,{romanceProgress:progress});
assert.equal(missing.mechanicalOk,true);assert.equal(missing.ok,false);assert.equal(missing.readyForOutput,false);
assert.throws(()=>engine.releaseStory(args,null,story,{romanceProgress:progress}),/意味確認/);
const request=engine.prepareStoryReview(args,story,{romanceProgress:progress});
assert.ok(Object.values(request.checks).every(c=>c.status==='pending'),'preparation never manufactures a passing review');
assert.equal(engine.validateContinuity(args,story,actions).ok,true);
assert.equal(engine.releaseStory(args,null,story,actions).story,story);
assert.equal(JSON.stringify({args,story,actions}),before,'no protagonist, story or canon rewrite');
for(const mutate of [
  x=>{delete x.semanticReview.checks.protagonistAgency;},
  x=>{x.semanticReview.checks.inputConsistency.status='pending';},
  x=>{x.semanticReview.checks.canonProvenance.reason='';},
  x=>{x.semanticReview.usedUnsavedDraft=true;},
  x=>{x.semanticReview.freshStart=false;},
  x=>{x.semanticReview.checks.romanceMotivation.sources=[{source:'record',index:0,field:'partner',quote:'以前の生成'}];},
  x=>{x.semanticReview.checks.canonProvenance.sources=[{source:'assistant_memory',quote:'以前の生成'}];}
]){const bad=copy(actions);mutate(bad);assert.equal(engine.validateContinuity(args,story,bad).ok,false);}
for(const changed of [{...args,protagonistInput:'別の入力'},{...args,records:[{protagonist:'過去入力',partner:'別の正本'}]},{...args,protagonistProfile:{name:'別人'}},{...args,saveId:'other'}]) assert.equal(engine.validateContinuity(changed,story,actions).ok,false,'review cannot be reused across input, save or canon changes');
assert.equal(engine.validateContinuity(args,story+'\n本文を変更した。',actions).ok,false,'editing a draft invalidates its review');

const proxy='Chapter 1\n都・門前／1001年10月17日（土）／15:00／15℃\n女房は言った。「いまは、どなたともお会いになりませんので」';
assert.equal(engine.validateContinuity(args,proxy,reviewed(engine,args,proxy)).ok,false,'a completed semantic form cannot permit ungrounded proxy volition');
const declined={...args,protagonistInput:'今日は誰にも会わない。'};
const cited={protagonistClaims:[{storyQuote:proxy,source:{source:'input',quote:'今日は誰にも会わない。'}}]};
assert.equal(engine.validateContinuity(declined,proxy,reviewed(engine,declined,proxy,cited)).ok,true,'explicit user volition can be reported with the original input evidence');
const death='Chapter12\n主人公は身罷られた。物語はここで終了。';
assert.equal(engine.continuityInput(death).ok,false);
assert.equal(engine.continuityInput('幸せな物語はここで終了。').ok,true,'an ending alone is not a death declaration');
assert.equal(engine.continuityInput('彼に好きだと言わせて。').ok,true,'ordinary partner dialogue requests are not harmful input');
assert.equal(engine.continuityInput('主人公は身罷られてはいない。').ok,true,'an explicit denial is not a death event');
assert.equal(engine.continuityInput('昨年、父は身罷られた。').ok,true,'a relative background fact is not protagonist mortality');
const conflicting={...args,protagonistInput:death};
assert.equal(engine.validateContinuity(conflicting,story,reviewed(engine,conflicting,story,{romanceProgress:progress})).ok,false,'rewriting a conflicting input into another event cannot pass');
assert.equal(engine.continuityInput('身罷られたと以前の出力に書かれていた。どういうことですか？').ok,true,'reports and questions remain distinct from new death events');
assert.equal(engine.validateContinuity(args,'主人公は身罷られた。',reviewed(engine,args,'主人公は身罷られた。')).ok,false);

const noHistory={...args,protagonistProfile:{name:'綾'},protagonistInput:'実家に戻った。'};
const fabricated={romanceProgress:{...progress,motivation:{source:'record',index:0,field:'partner',quote:'季房は前から恋をしていた。'}}};
assert.equal(engine.validateContinuity(noHistory,story,reviewed(engine,noHistory,story,fabricated)).ok,false,'zero records cannot substantiate an old relationship');
const newEncounter='青年は門の詩の札に目をとめ、初めて名を告げた。';
const meeting=story.replace('季房は門の外で名を告げた。',newEncounter+'\n季房は門の外で名を告げた。');
const newActions={romanceProgress:{...progress,origin:'new_encounter',encounterQuote:newEncounter,motivation:{source:'story',quote:newEncounter}}};
assert.equal(engine.validateContinuity(noHistory,meeting,reviewed(engine,noHistory,meeting,newActions)).ok,true,'a grounded new encounter remains possible');
const careIntent='「膳と灯火を整えました」',careStory=action+careIntent;
const fakeRomance={romanceProgress:{...progress,romanticIntentQuote:careIntent}};
assert.equal(engine.validateContinuity(args,careStory,reviewed(engine,args,careStory,fakeRomance)).ok,false,'care is not automatically romantic interest');
console.log('PASS: five-axis review gate, exact draft/input/canon binding, proxy volition, mortality input, motivation provenance and no care-only romance');
