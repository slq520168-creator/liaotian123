const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const visual=require('../role-visual-recipe.js');
const unified=require('../role-unified-human-recipe.js');
const custom=require('../role-unified-custom-chat.js');

const manifest=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-manifest.json','utf8'));

test('creator retains every validated hair module and adds geometry styling choices',()=>{
  const mapped=new Set(Object.values(unified.HAIR));
  const available=new Set(Object.keys(manifest.modules.hair));
  assert.equal(mapped.size,8);
  assert.deepEqual([...mapped].sort(),[...available].sort());
  assert.equal(visual.OPTIONS.hair.length,12);
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

test('waves deform real long-hair buffers and added hairstyles retain production skeleton and morph contracts',async()=>{
 const THREE=await import('three'),load=require('./helpers/load-human.cjs'),styling=require('../role-hair-styling.js'),runtime=require('../role-unified-human-runtime.js');
 const base=await load('assets/humans/unified/base_body.glb');
 for(const [label,style] of [['大波浪','waves'],['刘海','bangs'],['双丸子头','buns'],['自定义','custom']]){
  const recipe=visual.sanitize({creatorVersion:2,hair:label,hairWave:75}),mapped=unified.mapRecipe(recipe);assert.equal(mapped.hairStyle,style);
  const root=await load(`assets/humans/unified/hair_${mapped.hair}.glb`);let source;root.traverse(n=>{if(!source&&n.isSkinnedMesh)source=n;});
  const before=source.geometry.attributes.position.array.slice();styling.apply(root,THREE,style,75);
  assert(runtime.moduleContract(base,root,['gender_female','height_tall','face_forehead_incr']).ok);
  if(style==='waves'||style==='custom')assert.notDeepEqual(source.geometry.attributes.position.array,before);
  else {let added=0;root.traverse(n=>{if(/^Hair_(Bun|Fringe)/.test(n.name)){added++;assert(n.isSkinnedMesh);assert.equal(n.skeleton,source.skeleton);}});assert(added>=2);}
  root.traverse(n=>{if(n.isMesh)for(const attr of [n.geometry.attributes.position,...n.geometry.morphAttributes.position])for(const x of attr.array)assert(Number.isFinite(x));});
 }
});
