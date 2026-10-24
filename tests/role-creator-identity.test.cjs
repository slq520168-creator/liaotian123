const test=require('node:test');
const assert=require('node:assert/strict');
const identity=require('../role-creator-identity.js');
const visual=require('../role-visual-recipe.js');
const unified=require('../role-unified-human-recipe.js');

function doc(gender='female',age='36'){
  const values={roleGender:{value:gender},roleAge:{value:age}};
  return {getElementById(id){return values[id]||null;}};
}

test('creator identity reads the existing form fields and clamps adult age',()=>{
  assert.deepEqual(identity.current(doc('female','36')),Object.freeze({gender:'female',age:36,label:'女 · 36岁'}));
  assert.equal(identity.current(doc('male','15')).age,18);
  assert.equal(identity.current(doc('unknown','180')).gender,'unspecified');
  assert.equal(identity.current(doc('unknown','180')).age,100);
});

test('identity line is idempotent and replaces stale gender or age inside the existing role block',()=>{
  const original='前置人设\n\n【角色自定义设定】\n身份：男，24岁。\n外形：身高168cm，体重110斤，匀称，自然耐看，自然肤色，自然长发，日常休闲。\n【自定义设定结束】';
  const next=identity.upsertIdentityLine(original,{gender:'female',age:41});
  assert(next.includes('身份：女，41岁。'));
  assert.equal(next.includes('身份：男，24岁。'),false);
  assert.equal(identity.upsertIdentityLine(next,{gender:'female',age:41}),next);
  assert.equal(identity.upsertIdentityLine('没有角色设定块',{gender:'female',age:41}),'没有角色设定块');
});

test('the same identity line round-trips into visual recipe and real unified gender/age morphs',()=>{
  const block='【角色自定义设定】\n身份：女，60岁。\n外形：身高165cm，体重110斤，匀称，自然耐看，自然肤色，自然长发，日常休闲。\n性格：自然。\n初始关系：普通朋友。\n聊天方式：短句自然。\n【自定义设定结束】';
  const recipe=visual.fromPersonality(block);
  assert.equal(recipe.gender,'female');assert.equal(recipe.age,60);
  const mapped=unified.mapRecipe(recipe);
  assert.equal(mapped.morphs.gender_female,1);
  assert.ok(mapped.morphs.age_old>0);
  assert.equal(mapped.morphs.gender_male,undefined);
  assert(mapped.clothing.includes('panties'));assert(mapped.clothing.includes('bra'));assert.equal(mapped.clothing.includes('briefs'),false);
});

test('male identity selects the male morph and safety underwear from the same recipe',()=>{
  const recipe=visual.sanitize({gender:'male',age:30,outfit:'日常休闲'}),mapped=unified.mapRecipe(recipe);
  assert.equal(mapped.morphs.gender_male,1);assert.equal(mapped.morphs.gender_female,undefined);
  assert(mapped.clothing.includes('briefs'));assert.equal(mapped.clothing.includes('panties'),false);assert.equal(mapped.clothing.includes('bra'),false);
});
