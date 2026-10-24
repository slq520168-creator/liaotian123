const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const motion=require('../role-safe-skeleton-motion.js');

function bone(name,x=0,y=0,z=0){return{name,isBone:true,rotation:{x,y,z}};}
function rootWithBones(){
  const nodes=[bone('spine_01',.1,.2,.3),bone('spine_02',-.1,.05,-.02),bone('spine_03',.04,-.03,.01),bone('upperarm_l',.7,.8,.9),bone('thigh_l',-.4,.5,.6)];
  return{nodes,root:{traverse(visit){nodes.forEach(visit);}}};
}

test('safe skeleton motion only uses confirmed central spine bones',()=>{
  assert.deepEqual(motion.SAFE_BONES,['spine_01','spine_02','spine_03']);
  const joints=JSON.parse(fs.readFileSync('assets/humans/unified/base_body.joints.json','utf8'));
  for(const name of motion.SAFE_BONES)assert.ok(joints.bones[name],`${name} missing from unified skeleton contract`);
  for(const risky of ['upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r','thigh_l','thigh_r'])assert.equal(motion.SAFE_BONES.includes(risky),false);
});

test('motion is additive from captured rest pose, bounded and never drifts',()=>{
  const {nodes,root}=rootWithBones();
  const limbBefore={...nodes[3].rotation},legBefore={...nodes[4].rotation};
  const rest=Object.fromEntries(nodes.slice(0,3).map(node=>[node.name,{...node.rotation}]));
  assert.equal(motion.apply(root,'轻微转身',{breathing:.006},4200),true);
  const first=Object.fromEntries(nodes.slice(0,3).map(node=>[node.name,{...node.rotation}]));
  assert.equal(motion.apply(root,'轻微转身',{breathing:.006},4200),true);
  for(const name of motion.SAFE_BONES){
    const node=nodes.find(item=>item.name===name);
    assert.deepEqual(node.rotation,first[name],`${name} should not accumulate drift`);
    for(const axis of ['x','y','z'])assert.ok(Math.abs(node.rotation[axis]-rest[name][axis])<=motion.MAX_DELTA+1e-9,`${name}.${axis} exceeded safety bound`);
  }
  assert.deepEqual(nodes[3].rotation,limbBefore);
  assert.deepEqual(nodes[4].rotation,legBefore);
});

test('reset restores exact model rest rotations and incomplete skeleton fails closed',()=>{
  const {nodes,root}=rootWithBones();
  const before=Object.fromEntries(nodes.slice(0,3).map(node=>[node.name,{...node.rotation}]));
  motion.apply(root,'放松呼吸',{breathing:.006},900);
  assert.equal(motion.reset(root),true);
  for(const name of motion.SAFE_BONES)assert.deepEqual(nodes.find(item=>item.name===name).rotation,before[name]);
  const partial={traverse(visit){visit(bone('spine_01'));visit(bone('spine_02'));}};
  assert.equal(motion.apply(partial,'自然站立',{breathing:.006},1),false);
});

test('motion eligibility is limited to qualified unified custom characters',()=>{
  assert.equal(motion.eligibleCharacter({id:'custom_a',isPreset:false,humanAssetId:'unified-charactercreator',humanAssetStatus:'device-qualified'}),true);
  assert.equal(motion.eligibleCharacter({id:'custom_a',isPreset:false,humanAssetId:'unified-charactercreator',humanAssetStatus:'production'}),true);
  assert.equal(motion.eligibleCharacter({id:'custom_a',isPreset:false,humanAssetId:'unified-charactercreator',humanAssetStatus:'unified-static'}),false);
  assert.equal(motion.eligibleCharacter({id:'preset_a',isPreset:true,humanAssetId:'unified-charactercreator',humanAssetStatus:'production'}),false);
});
