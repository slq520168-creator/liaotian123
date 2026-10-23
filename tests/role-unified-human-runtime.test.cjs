const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('../role-unified-human-runtime.js');

const bone=name=>({name});
function skeleton(names){return {bones:names.map(bone)};}
function skinAttribute(values){return {array:Uint16Array.from(values),needsUpdate:false};}
function mesh(names,indices=[0,1,2,0]){
  return {
    isSkinnedMesh:true,
    skeleton:skeleton(names),
    geometry:{attributes:{skinIndex:skinAttribute(indices)}},
    bindMatrix:{id:'bind'},
    bind(target,matrix){this.skeleton=target;this.boundMatrix=matrix;},
    children:[]
  };
}
function root(children=[]){return {children,added:[],add(value){this.added.push(value);this.children.push(value);}};}

test('bone remap accepts same named skeleton in different order',()=>{
  const source=skeleton(['Root','pelvis','spine_01','head']);
  const target=skeleton(['Root','spine_01','pelvis','head']);
  const result=runtime.buildBoneRemap(source,target);
  assert.equal(result.compatible,true);
  assert.deepEqual([...result.map],[0,2,1,3]);
});

test('rebind remaps skin indices before binding module to body skeleton',()=>{
  const source=mesh(['Root','pelvis','spine_01'],[0,1,2,1]);
  const target=skeleton(['Root','spine_01','pelvis']);
  const result=runtime.rebindMesh(source,target);
  assert.equal(result.ok,true);
  assert.equal(result.remapped,true);
  assert.deepEqual([...source.geometry.attributes.skinIndex.array],[0,2,1,2]);
  assert.equal(source.skeleton,target);
  assert.equal(source.geometry.attributes.skinIndex.needsUpdate,true);
});

test('incompatible clothing is rejected instead of being attached with flying bones',()=>{
  const baseMesh=mesh(['Root','pelvis','spine_01']);
  const badMesh=mesh(['Root','pelvis','alien_bone']);
  const contract=runtime.moduleContract(root([baseMesh]),root([badMesh]),[]);
  assert.equal(contract.ok,false);
  assert.ok(contract.missingBones.includes('alien_bone'));
});

test('module contract checks shared candidate morph channels',()=>{
  const baseMesh=mesh(['Root','pelvis','spine_01']);
  const moduleMesh=mesh(['Root','pelvis','spine_01']);
  moduleMesh.morphTargetDictionary={gender_female:0,height_tall:1};
  moduleMesh.morphTargetInfluences=[0,0];
  const good=runtime.moduleContract(root([baseMesh]),root([moduleMesh]),['gender_female','height_tall']);
  assert.equal(good.ok,true);
  const bad=runtime.moduleContract(root([baseMesh]),root([moduleMesh]),['gender_female','face_jaw_width_incr']);
  assert.equal(bad.ok,false);
  assert.deepEqual([...bad.missingMorphs],['face_jaw_width_incr']);
});

test('same morph recipe is applied to body modules without touching unsupported targets',()=>{
  const morphMesh={children:[],morphTargetDictionary:{gender_female:0,height_tall:1,eyeBlinkLeft:2},morphTargetInfluences:[0,0,0]};
  const result=runtime.applyMorphWeights(root([morphMesh]),{gender_female:1,height_tall:.42,unknown:1});
  assert.equal(result.applied,true);
  assert.equal(result.assignments,2);
  assert.deepEqual(morphMesh.morphTargetInfluences,[1,.42,0]);
});

test('attachModule binds all module meshes to one base skeleton and applies identity morphs',()=>{
  const names=['Root','pelvis','spine_01','head'];
  const baseMesh=mesh(names);
  const moduleMesh=mesh(names);
  moduleMesh.morphTargetDictionary={gender_male:0,face_jaw_width_incr:1};
  moduleMesh.morphTargetInfluences=[0,0];
  const base=root([baseMesh]);
  const module=root([moduleMesh]);
  const result=runtime.attachModule(base,module,{gender_male:1,face_jaw_width_incr:.5},['gender_male','face_jaw_width_incr']);
  assert.equal(result.ok,true);
  assert.equal(moduleMesh.skeleton,baseMesh.skeleton);
  assert.deepEqual(moduleMesh.morphTargetInfluences,[1,.5]);
  assert.equal(base.added[0],module);
});
