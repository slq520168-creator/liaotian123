const test = require('node:test');
const assert = require('node:assert/strict');
const mapper = require('../role-unified-human-recipe.js');

test('maps female age and body dimensions to unified candidate morphs', () => {
  const out = mapper.mapRecipe({gender:'female',age:38,heightCm:178,weightJin:130,body:'丰满',face:'鹅蛋脸',skin:'偏白',hair:'马尾',outfit:'成熟优雅',expression:'温柔',action:'放松呼吸',voiceStyle:'温柔'});
  assert.equal(out.candidateId,'unified-charactercreator');
  assert.equal(out.morphs.gender_female,1);
  assert.ok(out.morphs.age_old > 0);
  assert.ok(out.morphs.height_tall > 0);
  assert.ok(out.morphs.face_jaw_width_decr > 0);
  assert.equal(out.hair,'ponytail01');
  assert.deepEqual(out.clothing,['dress','shoes']);
  assert.equal(out.skinTint,'#f2d1bf');
  assert.ok(out.expressionMorphs.mouthSmileLeft > 0);
});

test('maps male athletic preset to real body and outfit modules', () => {
  const out = mapper.mapRecipe({gender:'male',age:24,heightCm:185,weightJin:160,body:'健壮',face:'方脸',hair:'短发',outfit:'运动',expression:'认真'});
  assert.equal(out.morphs.gender_male,1);
  assert.ok(out.morphs.muscle_max >= .7);
  assert.ok(out.morphs.face_jaw_width_incr > 0);
  assert.equal(out.hair,'short04');
  assert.deepEqual(out.clothing,['tshirt','shorts','shoes']);
});

test('all creator hair choices resolve to validated candidate modules', () => {
  const allowed = new Set(['short02','bob02','long01','ponytail01','braid01','short04','bob01','afro01']);
  for (const id of Object.values(mapper.HAIR)) assert.ok(allowed.has(id), id);
});

test('all creator outfit choices resolve only to validated clothing modules', () => {
  const allowed = new Set(['dress','jeans','tshirt','hoodie','jacket','skirt','shorts','shoes']);
  for (const pieces of Object.values(mapper.OUTFITS)) {
    assert.ok(pieces.length > 0);
    for (const id of pieces) assert.ok(allowed.has(id), id);
  }
});

test('every emitted identity and expression morph is in the candidate contract', () => {
  const recipes = [
    {gender:'female',age:18,heightCm:130,weightJin:60,body:'偏瘦',face:'圆脸',expression:'微笑'},
    {gender:'male',age:100,heightCm:220,weightJin:500,body:'胖',face:'方脸',expression:'认真'},
    {gender:'unspecified',age:24,heightCm:165,weightJin:110,body:'健壮',face:'长脸',expression:'俏皮'},
    {face:'成熟脸',expression:'温柔'},
    {face:'甜美脸',expression:'自然'}
  ];
  for (const recipe of recipes) {
    const out = mapper.mapRecipe(recipe);
    for (const name of [...Object.keys(out.morphs),...Object.keys(out.expressionMorphs)]) {
      assert.ok(mapper.ALLOWED_MORPHS.has(name), name);
    }
  }
});

test('unspecified gender remains neutral rather than silently choosing one sex', () => {
  const out = mapper.mapRecipe({gender:'unspecified',age:24});
  assert.equal(out.morphs.gender_female,undefined);
  assert.equal(out.morphs.gender_male,undefined);
});
