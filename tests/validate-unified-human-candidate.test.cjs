const test = require('node:test');
const assert = require('node:assert/strict');
const validator = require('../scripts/validate-unified-human-candidate.cjs');

function gltf(weights = [0,0]) {
  return {meshes:[{name:'Body',extras:{targetNames:['jawOpen','tongueOut']},weights}]};
}

function joints() {
  const bones={};
  for(let i=0;i<45;i++) bones[`b${i}`]=[0,0,0];
  const morphs={};
  for(const name of validator.REQUIRED_JOINT_MORPHS) morphs[name]={};
  return {version:1,bones,morphs};
}

test('candidate default morph weights must all be zero',()=>{
  assert.doesNotThrow(()=>validator.assertDefaultMorphsZero(gltf([0,0])));
  assert.throws(()=>validator.assertDefaultMorphsZero(gltf([0,.25])),/non-zero default morph/);
});

test('joints sidecar must cover every driven primary and corrective morph',()=>{
  const good=joints();
  assert.doesNotThrow(()=>validator.assertJointsContract(good));
  const bad=joints();
  delete bad.morphs.corr_gender_female__age_old;
  assert.throws(()=>validator.assertJointsContract(bad),/missing driven morphs/);
});

test('joints sidecar rejects offsets that reference unknown bones',()=>{
  const bad=joints();
  bad.morphs.gender_female={ghost:[0,0,0]};
  assert.throws(()=>validator.assertJointsContract(bad),/unknown bone ghost/);
});
