const test=require('node:test');
const assert=require('node:assert/strict');
const mapper=require('../role-unified-human-recipe.js');

test('female body emits MakeHuman corrective morphs instead of linear-only deformation',()=>{
  const out=mapper.mapRecipe({gender:'female',age:38,heightCm:178,weightJin:150,body:'丰满',face:'鹅蛋脸',hair:'马尾',outfit:'成熟优雅'});
  assert.equal(out.schema,2);
  assert.equal(out.morphs.gender_female,1);
  assert.ok(out.morphs.age_old>0);
  assert.ok(out.morphs.weight_max>0);
  assert.ok(out.morphs.corr_gender_female__age_old>0);
  assert.ok(out.morphs.corr_gender_female__weight_max>0);
});

test('athletic male emits gender x muscle and weight x muscle correction when needed',()=>{
  const out=mapper.mapRecipe({gender:'male',age:24,heightCm:185,weightJin:190,body:'健壮',face:'方脸'});
  assert.equal(out.morphs.gender_male,1);
  assert.ok(out.morphs.muscle_max>=.7);
  assert.ok(out.morphs.corr_gender_male__muscle_max>0);
  if(out.morphs.weight_max) assert.ok(out.morphs.corr_weight_max__muscle_max>0);
});

test('tall side respects CharacterCreator 0.45 maximum runtime scale',()=>{
  const out=mapper.mapRecipe({gender:'male',heightCm:220});
  assert.ok(out.morphs.height_tall<=.45);
});

test('unspecified gender stays neutral and cannot create gender correctives',()=>{
  const out=mapper.mapRecipe({gender:'unspecified',age:38,weightJin:180});
  assert.equal(out.morphs.gender_female,undefined);
  assert.equal(out.morphs.gender_male,undefined);
  assert.equal(out.morphs.corr_gender_female__weight_max,undefined);
});

test('all emitted morphs are in candidate contract',()=>{
  for(const recipe of [{gender:'female',age:18,heightCm:130,weightJin:60,body:'偏瘦',face:'圆脸',expression:'微笑'},{gender:'male',age:100,heightCm:220,weightJin:500,body:'胖',face:'方脸',expression:'认真'},{gender:'male',age:35,heightCm:190,weightJin:210,body:'健壮',face:'成熟脸',expression:'温柔'}]){
    const out=mapper.mapRecipe(recipe);for(const name of [...Object.keys(out.morphs),...Object.keys(out.expressionMorphs)])assert.ok(mapper.ALLOWED_MORPHS.has(name),name);
  }
});

test('creator hair and outfit mappings stay inside validated module set',()=>{
  const hair=new Set(['short02','bob02','long01','ponytail01','braid01','short04','bob01','afro01']);
  const clothing=new Set(['dress','jeans','tshirt','hoodie','jacket','skirt','shorts','shoes']);
  for(const id of Object.values(mapper.HAIR))assert.ok(hair.has(id),id);
  for(const pieces of Object.values(mapper.OUTFITS))for(const id of pieces)assert.ok(clothing.has(id),id);
});
