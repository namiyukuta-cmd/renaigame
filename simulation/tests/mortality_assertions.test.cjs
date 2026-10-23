'use strict';
// Sanitized synthetic regressions, not private chapter text or save data.
const assert=require('node:assert/strict');
const engine=require('../js/ai_turn_engine.js');
const reviewed=require('./helpers/review_fixture.cjs');
const header='Chapter 9\n都・邸／2026年10月23日（金）／19:00／18℃\n';
const args={saveId:'run_mortality_assertions',protagonistProfile:{name:'検査役'},records:[],protagonistInput:'「お話を聞かせてください。」'};
const deathClaims=[
  '女君は二人によって盛大に死を喜ばれ祝われた。',
  '女君の死を二人は祝った。',
  '主人公の死は、彼にとって喜ばしいことだった。',
  '彼女の死を聞き、男は晴れ晴れとした喜びを覚えた。'
];
for(const claim of deathClaims){
  const input='Chapter9\n'+claim,story=header+claim,before=JSON.stringify({input,story,args});
  assert.equal(engine.continuityInput(input).ok,false,'nominal death approval must not be certified as playable input: '+claim);
  assert.equal(engine.validateContinuity(args,story).mechanicalOk,false,'death approval is blocked before review metadata: '+claim);
  assert.throws(()=>engine.releaseStory(args,null,story,reviewed(engine,args,story)),/死亡|死を|保護/,'a completed synthetic review cannot override the prohibited assertion');
  assert.equal(JSON.stringify({input,story,args}),before,'validation preserves the original input and prose');
}
for(const input of [
  '「女君の死を祝った」と以前の出力に書かれていた。どういうことですか？',
  'どうせ女君の死を喜ぶんだ。',
  '女君の死を喜ばないで。',
  '主人公を殺してはいけない。',
  '主人公を殺してほしくない。',
  '主人公の死を祝うという結末にしないで。',
  '「女君の死を祝った」という表現を使わないで。'
])assert.equal(engine.continuityInput(input).ok,true,'reports and objections are not permission for a death event: '+input);
for(const claim of [
  '女君は死んでいないが、主人公は死んだ。',
  '主人公は死んだが、父は死んでいない。',
  '女君は身罷られてはいないが、主人公は死亡した。',
  '主人公の死を喜ばなかったが、女君の死を祝った。'
])assert.equal(engine.validateContinuity(args,header+claim).mechanicalOk,false,'one denial cannot exempt a separate positive assertion: '+claim);
for(const claim of [
  '女君は死んでいない。',
  '主人公は身罷られてはいない。',
  '主人公は死んだのではない。',
  '主人公は死亡したわけではない。',
  '主人公は身罷られたという事実はない。',
  '女君の死を祝うことはない。',
  '女君の死を喜んではいない。',
  '女君は二人に死を喜ばれ祝われてはいない。',
  '祖父の死を悼んだ。',
  'もし主人公が身罷られたら、と彼は案じた。'
])assert.equal(engine.validateContinuity(args,header+claim).mechanicalOk,true,'denial, family history and a future fear remain distinct from protagonist death: '+claim);
assert.equal(engine.continuityInput('主人公を殺してはいけない。だから主人公を殺して。').ok,false);
assert.equal(engine.continuityInput('創作として、主人公の死を祝う話を書いて。').ok,false);
assert.equal(engine.continuityInput('どうせ大好きなのでしょう。主人公を殺して。').ok,false,'distrust cannot exempt a separate harmful directive');
console.log('PASS: nominal death approval, per-assertion negation, actual objections, hypothetical/family distinctions and release rejection; synthetic examples only');
