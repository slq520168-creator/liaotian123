const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const mapper=require('../role-unified-human-recipe.js');

const UPPER_CLOTHING=Object.freeze(['bra','tshirt','hoodie','jacket','dress']);
const BDET_TARGETS=Object.freeze([
  'bdet_breast_dist_decr','bdet_breast_dist_incr',
  'bdet_breast_point_decr','bdet_breast_point_incr',
  'bdet_breast_height_decr','bdet_breast_height_incr'
]);

function allTargetNames(json){
  const names=new Set();
  for(const mesh of json?.meshes||[]){
    const targetNames=Array.isArray(mesh?.extras?.targetNames)?mesh.extras.targetNames:[];
    for(const name of targetNames)names.add(name);
    for(const primitive of mesh?.primitives||[]){
      if(targetNames.length)assert.equal((primitive.targets||[]).length,targetNames.length,`${mesh?.name||'mesh'} targetNames/targets length mismatch`);
    }
  }
  return names;
}

test('every chest-covering production garment retains current breast morphs and planned static bdet targets',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const required=[...mapper.BODY_DETAIL_NAMES,...mapper.BREAST_CORRECTIVE_NAMES,...BDET_TARGETS];
  for(const id of UPPER_CLOTHING){
    const file=fs.readFileSync(`assets/humans/unified/clothing_${id}.glb`);
    const {json}=parseGlb(file);
    const names=allTargetNames(json);
    const missing=required.filter(name=>!names.has(name));
    assert.deepEqual(missing,[],`${id} lost chest deformation targets: ${missing.join(',')}`);
  }
});

test('planned bdet targets are present in base asset report and joint sidecar before creator UI can expose them',()=>{
  const report=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-report.json','utf8'));
  const joints=JSON.parse(fs.readFileSync('assets/humans/unified/base_body.joints.json','utf8'));
  const baseTargets=new Set(report?.diagnostics?.targetNames||[]);
  for(const name of BDET_TARGETS){
    assert.ok(baseTargets.has(name),`${name} missing from base body report`);
    assert.ok(Object.hasOwn(joints?.morphs||{},name),`${name} missing from joint sidecar`);
  }
});
