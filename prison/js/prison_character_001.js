(() => {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    Object.freeze(value);

    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }

    return value;
  }

  const character = {
    id: "char_001",
    name: "",

    common: {
      age: null,
      heightCm: null,
      weightKg: null,
      hairColor: "",
      eyeColor: "",
      appearance: "",
      occupation: "",
      personality: "",
      strengths: [],
      weaknesses: [],
      romance: "",
      initialRelationship: "",
      initialFeeling: "",
      reasonToFallInLove: "",
      romanceWeaknessConflict: "",
      distanceProgression: "",
      ngWordsActions: [],
      jealousy: "",
      worry: "",
      possessiveness: "",
      affectionExpression: "",
      confessionStyle: "",
      changesAfterDating: "",
      past: "",
      secretsUnresolved: "",
      notes: ""
    },

    prison: {
      crime: "",
      sentence: "",
      yearsServed: "",
      remainingSentence: "",
      facility: "",
      correspondenceProgram: "",
      reasonForCorrespondence: "",
      disclosedInLetters: [],
      hiddenInformation: [],
      postReleasePlan: "",
      other: ""
    },

    communication: {
      speakingStyle: "",
      letterStyle: "",
      firstPerson: "",
      protagonistAddress: "",
      responseRules: []
    }
  };

  const frozenCharacter = deepFreeze(character);

  window.PrisonCharacter001 = frozenCharacter;

  if (!window.PrisonCharacters) {
    window.PrisonCharacters = {};
  }

  window.PrisonCharacters[frozenCharacter.id] = frozenCharacter;
})();
