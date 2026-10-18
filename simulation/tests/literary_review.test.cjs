'use strict';
const assert=require('node:assert/strict');
const engine=require('../js/ai_turn_engine.js');
const reviewed=require('./helpers/review_fixture.cjs');
const copy=value=>JSON.parse(JSON.stringify(value));
const args={saveId:'run_literary_review',protagonistInput:'私のために一首、詠んでください。',protagonistProfile:{name:'綴子'},records:[]};
const story='Chapter 1\n東宮御所・講義の間／1007年10月12日（月）／14:00／18℃\n清実は古歌の巻物を脇へ寄せた。\n「では、この場の歌を」\n庭の白萩が秋風に揺れた。清実は一首を詠み、料紙に書き留めた。';
const legacy=reviewed(engine,args,story);
delete legacy.semanticReview.checks.literaryQuality;
assert.equal(engine.validateContinuity(args,story,legacy).ok,false,'the former five-axis receipt must not release a new story without literary review');
assert.throws(()=>engine.releaseStory(args,null,story,legacy),/literaryQuality|仕上げ/);

const pending=engine.prepareStoryReview(args,story);
assert.equal(pending.checks.literaryQuality.status,'pending');
assert.ok(Object.values(pending.checks.literaryQuality.aspects).every(check=>check.status==='pending'));
const actions=reviewed(engine,args,story);
// These are independently authored observations about this fixed fixture.
actions.semanticReview.checks.literaryQuality={
  status:'pass',reason:'依頼への直接の応答を中心に、歌人の手つきと秋の情景を短く結び、歌の意味を後から重ねて説明していない。',
  quotes:['清実は古歌の巻物を脇へ寄せた。','庭の白萩が秋風に揺れた。清実は一首を詠み、料紙に書き留めた。'],
  sources:[{source:'input',quote:'私のために一首、詠んでください。'}],
  revisionNote:'依頼に応じる即詠と書き留める動作で完結しており、この固定本文には追加の解説や改稿は不要と確認した。',
  aspects:{
    characterSpecificity:{status:'pass',reason:'古歌から即詠に切り替える歌人自身の選択を、巻物を寄せる動作で表した。',quotes:['清実は古歌の巻物を脇へ寄せた。']},
    sceneEmotion:{status:'pass',reason:'白萩と秋風を歌を詠む場面につなぎ、環境描写だけを羅列していない。',quotes:['庭の白萩が秋風に揺れた。清実は一首を詠み、料紙に書き留めた。']},
    concreteProgress:{status:'pass',reason:'詠む予定の説明で止めず、その場で一首を詠んで書き留めるまで実行した。',quotes:['清実は一首を詠み、料紙に書き留めた。']},
    expositionBalance:{status:'pass',reason:'歌の実演への求めに短く答え、動作から伝わった意図を台詞で繰り返していない。',quotes:['「では、この場の歌を」']}
  }
};
assert.equal(engine.releaseStory(args,null,story,actions).story,story);
const original=JSON.stringify({args,story,actions});
for(const mutate of [
  a=>{delete a.semanticReview.checks.literaryQuality.aspects;},
  a=>{a.semanticReview.checks.literaryQuality.status='not_applicable';},
  a=>{a.semanticReview.checks.literaryQuality.revisionNote='';},
  a=>{a.semanticReview.checks.literaryQuality.quotes=[];},
  a=>{a.semanticReview.checks.literaryQuality.aspects.sceneEmotion.status='pending';},
  a=>{a.semanticReview.checks.literaryQuality.aspects.characterSpecificity.status='fail';},
  a=>{delete a.semanticReview.checks.literaryQuality.aspects.concreteProgress;},
  a=>{a.semanticReview.checks.literaryQuality.aspects.expositionBalance.reason='確認';},
  a=>{a.semanticReview.checks.literaryQuality.aspects.expositionBalance.quotes=[];},
  a=>{a.semanticReview.checks.literaryQuality.aspects.sceneEmotion.quotes=['本文にない情景'];}
]){
  const bad=copy(actions);mutate(bad);
  assert.equal(engine.validateContinuity(args,story,bad).readyForOutput,false);
  assert.throws(()=>engine.releaseStory(args,null,story,bad),/literaryQuality|仕上げ/);
}
assert.equal(engine.validateContinuity(args,story+'\n清実は歌の意図をさらに説明した。',actions).ok,false,'editing the final prose invalidates its receipt');
assert.equal(JSON.stringify({args,story,actions}),original,'validation does not rewrite protagonist input, canon or prose');
// Necessary explanations and short answers are not rejected by a word blacklist.
const explanation='Chapter 1\n東宮御所・講義の間／1007年10月12日（月）／14:00／18℃\n清実は「掛詞」を紙に書き、二つの意味を説明した。';
assert.equal(engine.validateContinuity(args,explanation,reviewed(engine,args,explanation)).ok,true);
console.log('PASS: literary review is required, evidence-bound, never auto-approved, and preserves explanation when the scene needs it');
