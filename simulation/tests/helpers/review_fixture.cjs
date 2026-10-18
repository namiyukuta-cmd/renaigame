'use strict';
// Explicit review receipts for fixed, manually authored test fixtures only.
// Production has no automatic "approve every check" helper.
module.exports = function reviewedActions(engine,args,story,actions={}){
  const result=JSON.parse(JSON.stringify(actions));delete result.semanticReview;
  const review=engine.prepareStoryReview(args,story,result);
  for(const [axis,check] of Object.entries(review.checks)){
    const progress=axis==='romanceMotivation'?result.romanceProgress:axis==='circumstanceChange'?result.continuity?.supportProgress:null;
    const applicable=!['romanceMotivation','circumstanceChange'].includes(axis)||!!progress;
    check.status=applicable?'pass':'not_applicable';
    check.reason='固定されたテスト原文と本文を照合するための明示的な検査記録です。';
    check.sources=applicable?[{source:'input',quote:args.protagonistInput}]:[];
    check.quotes=progress?(axis==='romanceMotivation'?[progress.actionQuote,progress.romanticIntentQuote]:[progress.actionQuote,progress.outcomeQuote]):[];
    if(axis===engine.policy.literaryReview.axis){
      // Test plumbing only. Real draft observations are authored individually
      // in literary_review.test.cjs; production never approves these fields.
      const quote=story.trim();
      check.quotes=[quote];
      check.revisionNote='この固定フィクスチャは検査経路の試験用に著述済みで、ここでは本文を自動改稿しません。';
      for(const aspect of Object.values(check.aspects)){
        aspect.status='pass';aspect.reason='固定フィクスチャに対する検査経路の試験用記録です。';aspect.quotes=[quote];
      }
    }
  }
  result.semanticReview=review;return result;
};
