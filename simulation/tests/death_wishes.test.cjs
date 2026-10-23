'use strict';
// Sanitized synthetic assertions; no private chapter prose or save data.
const assert=require('node:assert/strict');
const engine=require('../js/ai_turn_engine.js');
const reviewed=require('./helpers/review_fixture.cjs');
const args={saveId:'run_death_wishes',protagonistInput:'「話を聞かせてください。」',protagonistProfile:{name:'検査役'},records:[]};
const header='Chapter 1\n都・邸／2026年10月23日（金）／19:00／18℃\n';
const prohibited=[
  '男は主人公のいる御簾に目を向けた。\n――早く死ねよ。\n男は本心でそう思った。',
  '男が待ち望んでいたのは、女君の命が尽きたという知らせだった。',
  '「まだ死なないの？」\n男はその言葉に同意した。',
  '男が待ち望んでいたのは、その祈りが届くことではなかった。\n女君の命が尽きたという知らせだった。',
  '男は主人公の死を待ち望んでいた。',
  '男は主人公が死ぬことを望んだ。',
  '男は死ねとは思っていないが、別の男は早く死ねよと願った。'
];
for(const [index,claim] of prohibited.entries()){
  for(const annotation of ['', '\n※未検証の本文です。保存はしていません。']){
    const story=header+claim+annotation,actions=reviewed(engine,args,story),before=JSON.stringify({args,story,actions});
    const validation=engine.validateContinuity(args,story,actions);
    assert.equal(validation.mechanicalOk,false,'a death wish must be rejected even without an actual death: '+index);
    assert.equal(validation.readyForOutput,false);
    assert.ok(validation.errors.some(error=>/死亡願望/.test(error)),'report a wish distinctly from a confirmed death');
    assert.throws(()=>engine.releaseStory(args,null,story,actions),/死亡願望/,'a completed synthetic review or unverified footnote cannot authorize the draft');
    assert.equal(JSON.stringify({args,story,actions}),before,'validation must not rewrite raw input, prose or receipts');
  }
}
for(const [index,claim] of [
  '主人公に死ねとは思っていない。',
  '主人公の死を望まない。',
  '男は検査役が死ぬことを望んでいない。',
  '男は主人公が死ねばと恐れた。',
  'もし主人公が死んだら、と男は恐れた。',
  '男が待ち望んでいたのは、主人公の回復の知らせだった。',
  '男は主人公に会える日を待ち望んだ。',
  '男が待ち望んでいたのは、女君の死ではなかった。',
  '主人公の祖父の死を悼み、男は主人公に会える日を望んだ。',
  '男は不公平な言葉に傷つき、不満の理由を言葉で伝えた。'
].entries()){
  const story=header+claim,actions=reviewed(engine,args,story);
  assert.equal(engine.releaseStory(args,null,story,actions).story,story,'denial, fear, care, family history and partner emotion remain distinct: '+index);
}
for(const input of [
  'どうせ私に死ねと思っているのでしょう。',
  '「まだ死なないの？」と以前の出力に書かれていた。やめてください。',
  'どうせその人の命が尽きるのを望むのでしょう。'
]){
  const before=input;
  assert.equal(engine.continuityInput(input).ok,true,'the output check must not silence a complaint, quote or question');
  assert.equal(input,before);
}
console.log('PASS: death wishes without factual death, implicit objects across sentences, unverified annotations, individual denials and unchanged complaints; synthetic examples only');
