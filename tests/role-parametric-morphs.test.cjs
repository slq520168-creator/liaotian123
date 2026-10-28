const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const shape=require('../role-parametric-morphs.js'),mapper=require('../role-unified-human-recipe.js'),visual=require('../role-visual-recipe.js');
const load=require('./helpers/load-human.cjs');
test('production body and clothing receive real finite morph buffers with reversible displacement',async()=>{
 for(const file of ['base_body','clothing_dress','clothing_jeans','hair_long01']){
  const root=await load(`assets/humans/unified/${file}.glb`),result=shape.prepare(root);
  assert(result.meshes>0,file);let changed=0;
  root.traverse(mesh=>{if(!mesh.isMesh)return;const pos=mesh.geometry.attributes.position;
   for(const key of Object.keys(shape.FIELDS)){
    const negative=mesh.geometry.morphAttributes.position[mesh.morphTargetDictionary[`shape_${key}_min`]];
    const positive=mesh.geometry.morphAttributes.position[mesh.morphTargetDictionary[`shape_${key}_max`]];
    assert.equal(positive.count,pos.count);
    for(let i=0;i<positive.array.length;i++){assert(Number.isFinite(positive.array[i]));assert(Math.abs(positive.array[i]+negative.array[i])<1e-7);if(Math.abs(positive.array[i])>1e-5)changed++;}
   }
  });assert(changed>0,file);assert.equal(shape.prepare(root).meshes,0,'no repeated allocation');
 }
});
test('joint centers follow identical displacement fields and preserve original sidecar',()=>{
 const source=JSON.parse(fs.readFileSync('assets/humans/unified/base_body.joints.json'));
 const out=shape.extendJoints(source);assert.equal(shape.extendJoints(source),out);
 for(const [bone,position] of Object.entries(source.bones))for(const key of Object.keys(shape.FIELDS)){
  assert.deepEqual(out.morphs[`shape_${key}_max`][bone],shape.delta(key,...position));
  assert(!Object.hasOwn(source.morphs,`shape_${key}_max`));
 }
});
test('new recipe controls survive serialization and map to exclusive signed targets',()=>{
 const bodyDetails=Object.fromEntries(Object.keys(shape.FIELDS).map((key,i)=>[key,i%2?-80:80]));
 const recipe=visual.sanitize({creatorVersion:2,bodyDetails});
 assert.deepEqual(visual.sanitize(JSON.parse(JSON.stringify(recipe))),recipe);
 const mapped=mapper.mapRecipe(recipe);
 for(const [key,value] of Object.entries(bodyDetails)){
  assert.equal(mapped.morphs[`shape_${key}_${value<0?'min':'max'}`],.52);
  assert.equal(mapped.morphs[`shape_${key}_${value<0?'max':'min'}`],undefined);
 }
});
