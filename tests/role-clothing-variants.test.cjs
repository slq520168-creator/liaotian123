const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const visual=require('../role-visual-recipe.js');
const unified=require('../role-unified-human-recipe.js');

const manifest=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-manifest.json','utf8'));

test('creator outfit catalog reaches every validated clothing module',()=>{
  const used=new Set([...Object.values(unified.OUTFITS).flat(),...Object.values(unified.SAFETY_UNDERWEAR).flat()]);
  const available=new Set(Object.keys(manifest.modules.clothing));
  assert.deepEqual([...used].sort(),[...available].sort());
  assert.ok(unified.OUTFITS['连帽休闲'].includes('hoodie'));
  assert.ok(visual.OPTIONS.outfit.includes('连帽休闲'));
});

test('outfit color survives recipe round-trip and maps to concrete tint',()=>{
  const clean=visual.sanitize({outfit:'连帽休闲',outfitColor:'墨绿'});
  assert.equal(clean.outfitColor,'墨绿');
  const text='【角色自定义设定】\n身份：男，31岁。\n外形：身高180cm，体重148斤，匀称，方脸，自然肤色，短发，连帽休闲。\n发色：自然黑。\n服装颜色：墨绿。\n饰品：无。\n动作：自然站立。\n表情：自然。\n语音：自然。\n初始关系：普通朋友。\n【自定义设定结束】';
  assert.equal(visual.fromPersonality(text).outfitColor,'墨绿');
  const mapped=unified.mapRecipe(clean);
  assert.equal(mapped.clothingTint,unified.OUTFIT_TINTS['墨绿']);
});

test('outfit tint targets exclude safety underwear and shoes',()=>{
  const male=unified.mapRecipe({gender:'male',outfit:'连帽休闲',outfitColor:'藏蓝'});
  assert.deepEqual(male.clothingTintTargets,['hoodie','jeans']);
  assert.ok(male.clothing.includes('briefs'));
  assert.ok(male.clothing.includes('shoes'));
  for(const id of ['briefs','panties','bra','shoes'])assert.equal(male.clothingTintTargets.includes(id),false);

  const female=unified.mapRecipe({gender:'female',outfit:'成熟优雅',outfitColor:'酒红'});
  assert.deepEqual(female.clothingTintTargets,['dress']);
  assert.ok(female.clothing.includes('panties'));
  assert.ok(female.clothing.includes('bra'));
});

test('runtime tints clothing by module id rather than every clothing attachment',()=>{
  const source=fs.readFileSync('role-unified-custom-chat.js','utf8');
  assert(source.includes('clothingTintTargets=new Set'));
  assert(source.includes("clothingTintTargets.has(item.id)"));
  assert(source.includes("kind:'clothing',id,url:CLOTHING_PATH(id)"));
});
