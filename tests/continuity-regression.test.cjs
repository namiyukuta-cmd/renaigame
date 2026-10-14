const assert = require('node:assert/strict');
const engine = require('../simulation/js/ai_turn_engine.js');
const args = { protagonistProfile: { name: '主人公A' }, records: [] };
for (const text of [
  '主人公Aはいない方がいい。', '誰も主人公Aを助けない。',
  '主人公Aは見放された。', '主人公Aには居場所がない。',
  '主人公Aは死んだ。', '最初から主人公Aが嫌いだった。'
]) assert.equal(engine.validateContinuity(args, text).ok, false, text);
for (const text of [
  '主人公Aは死んでいない。', '主人公Aを見捨てない。',
  '相手は断られた同行をやめ、尋ねられた場所への道順を答えた。',
  '相手は返事をして、相談の時間を取った。'
]) assert.equal(engine.validateContinuity(args, text).ok, true, text);
const quote = '最初から主人公Aが嫌いだった';
assert.equal(engine.validateContinuity({...args,records:[{partner:quote}]},quote,{continuity:{relationshipClaims:[{type:'pastHatred',quote,recordIndex:0,field:'partner'}]}}).ok,false);
assert.equal(engine.continuityInput('主人公Aは死んだ').ok,false);
assert.equal(engine.continuityInput('主人公Aは死んだ').requiresClarification,false);
console.log('PASS: exclusion and unsupported hatred rejected, nonintrusive responses accepted');
