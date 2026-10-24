const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const eye=require('../role-eye-color.js');
const baseVisual=require('../role-visual-recipe.js');
const baseUnified=require('../role-unified-human-recipe.js');

test('eye color round-trips through the role specification without weakening base recipe validation',()=>{
  const visual=eye.extendVisualApi(baseVisual);
  const text='【角色自定义设定】\n身份：女，27岁。\n外形：身高168cm，体重110斤，匀称，鹅蛋脸，自然肤色，大波浪，成熟优雅。\n眼睛颜色：灰蓝。\n初始关系：普通朋友。\n【自定义设定结束】';
  assert.equal(visual.fromPersonality(text).eyeColor,'灰蓝');
  assert.equal(visual.sanitize({eyeColor:'不存在'}).eyeColor,'深棕');
  const updated=eye.upsertEyeColor(text,'墨绿');
  assert(updated.includes('眼睛颜色：墨绿。'));
  assert.equal(updated.includes('眼睛颜色：灰蓝。'),false);
});

test('unified recipe adds only a concrete iris tint',()=>{
  const unified=eye.extendUnifiedApi(baseUnified);
  const mapped=unified.mapRecipe({eyeColor:'琥珀'});
  assert.equal(mapped.eyeTint,eye.EYE_TINTS['琥珀']);
  assert.equal(mapped.candidateId,'unified-charactercreator');
});

test('runtime tint matches exact Iris material and leaves sclera/cornea/skin untouched',()=>{
  const changed=[];
  const make=name=>({name,color:{set(value){changed.push([name,value]);}},needsUpdate:false});
  const iris=make('Iris'),eyeWhite=make('Eye'),cornea=make('Cornea'),skin=make('Skin'),irisLike=make('IrisExtra');
  const root={traverse(visit){visit({material:eyeWhite});visit({material:[iris,cornea,skin,irisLike,iris]});}};
  assert.equal(eye.tintNamedMaterial(root,'Iris','#123456'),1);
  assert.deepEqual(changed,[['Iris','#123456']]);
  assert.equal(iris.needsUpdate,true);
  assert.equal(eyeWhite.needsUpdate,false);
  assert.equal(cornea.needsUpdate,false);
  assert.equal(skin.needsUpdate,false);
  assert.equal(irisLike.needsUpdate,false);
});

test('required Iris tint fails closed instead of silently accepting a fake eye color',()=>{
  const eyeWhite={name:'Eye',color:{set(){throw new Error('sclera must not be tinted');}}};
  const cornea={name:'Cornea',color:{set(){throw new Error('cornea must not be tinted');}}};
  const root={traverse(visit){visit({material:[eyeWhite,cornea]});}};
  assert.equal(eye.tintNamedMaterial(root,'Iris','#123456'),0);
  assert.throws(()=>eye.requireNamedMaterialTint(root,'Iris','#123456'),/Iris tint material unavailable/);
});

test('creator eye UI states that only Iris is tinted and renderer enforces that contract',()=>{
  const source=fs.readFileSync('role-eye-color.js','utf8');
  assert(source.includes("requireNamedMaterialTint(this.root,'Iris',mapped.eyeTint)"));
  assert(source.includes('只染 Iris 虹膜材质'));
  assert(source.includes("char.humanAssetId!=='unified-charactercreator'"));
  assert(source.includes('统一3D保持关闭'));
});
