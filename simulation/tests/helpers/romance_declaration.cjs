'use strict';
// Metadata for explicitly authored synthetic scenes in plumbing tests only.
// Callers supply real quotations; this never adds prose or approves a review.
module.exports=function romanceDeclaration(args,actionQuote,romanticIntentQuote,actor=args.character.name){
  return {romanceProgress:{kind:'initiative',actor,actorGender:'male',
    bloodRelatedToProtagonist:false,relationshipToProtagonist:'unrelated',characterId:args.characterId,
    actionQuote,romanticIntentQuote,origin:'canon',motivation:{source:'input',quote:args.protagonistInput}}};
};
