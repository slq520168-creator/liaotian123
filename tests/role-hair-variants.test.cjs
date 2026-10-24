const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const visual=require('../role-visual-recipe.js');
const unified=require('../role-unified-human-recipe.js');
const custom=require('../role-unified-custom-chat.js');

const manifest=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-manifest.json','utf8'));

test('creator exposes every validated unified hair module exactly once',()=>{
  const mapped=new Set(Object.values(unified.HAIR));
  const available=new Set(Object.keys(manifest.modules.hair));
  assert.equal(mapped.size,8);
  assert.deepEqual([...mapped].sort(),[...available].sort());
  assert.equal(visual.OPTIONS.hair.length,8);
});

test('hair color survives recipe round-trip and maps to a concrete tint',()=>{
  const clean=visual.sanitize({hair:'编发',hairColor:'银灰'});
  assert.equal(clean.hair,'编发');
  assert.equal(clean.hairColor,'银灰');
  const text='【角色自定义设定】\n身份：女，29岁。\n外形：身高168cm，体重112斤，匀称，鹅蛋脸，自然肤色，编发，成熟优雅。\n发色：银灰。\n饰品：无。\n动作：自然站立。\n表情：自然。\n语音：自然。\n初始关系：普通朋友。\n【自定义设定结束】';
  assert.equal(visual.fromPersonality(text).hairColor,'银灰');
  const mapped=unified.mapRecipe(clean);
  assert.equal(mapped.hair,'braid01');
  assert.equal(mapped.hairTint,unified.HAIR_TINTS['银灰']);
});

test('hair tint changes only materials under the supplied hair module root',()=>{
  const changed=[];
  const materialA={color:{set(value){changed.push(['a',value]);}},needsUpdate:false};
  const materialB={color:{set(value){changed.push(['b',value]);}},needsUpdate:false};
  const ignored={name:'no-color'};
  const scene={traverse(visit){visit({material:materialA});visit({material:[materialA,materialB,ignored]});}};
  assert.equal(custom.tintModule(scene,'#123456'),2);
  assert.deepEqual(changed,[['a','#123456'],['b','#123456']]);
  assert.equal(materialA.needsUpdate,true);
  assert.equal(materialB.needsUpdate,true);
});

test('unknown hair color falls back instead of inventing an unsupported render tint',()=>{
  const clean=visual.sanitize({hairColor:'荧光紫'});
  assert.equal(clean.hairColor,'自然黑');
  assert.equal(unified.mapRecipe(clean).hairTint,unified.HAIR_TINTS['自然黑']);
});
