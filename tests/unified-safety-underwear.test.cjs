const test=require('node:test');
const assert=require('node:assert/strict');
const recipe=require('../role-unified-human-recipe.js');

test('male unified recipe always includes safety briefs before outer clothing',()=>{
  const result=recipe.mapRecipe({gender:'male',outfit:'日常休闲'});
  assert.equal(result.schema,3);
  assert.equal(result.clothing[0],'briefs');
  assert(result.clothing.includes('jeans'));
});

test('female unified recipe always includes panties and bra before outer clothing',()=>{
  const result=recipe.mapRecipe({gender:'female',outfit:'成熟优雅'});
  assert.deepEqual(result.clothing.slice(0,2),['panties','bra']);
  assert(result.clothing.includes('dress'));
});

test('unspecified gender still receives a non-nude safety layer',()=>{
  const result=recipe.mapRecipe({outfit:'运动'});
  assert.equal(result.clothing[0],'briefs');
  assert(result.clothing.includes('shorts'));
});
