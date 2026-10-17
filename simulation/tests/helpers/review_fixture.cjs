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
  }
  result.semanticReview=review;return result;
};
