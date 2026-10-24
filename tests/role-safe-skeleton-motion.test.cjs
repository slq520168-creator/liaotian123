const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const motion=require('../role-safe-skeleton-motion.js');

function bone(name,x=0,y=0,z=0){return{name,isBone:true,rotation:{x,y,z}};}
function rootWithBones(){
  const nodes=[
    bone('spine_01',.1,.2,.3),bone('spine_02',-.1,.05,-.02),bone('spine_03',.04,-.03,.01),
    bone('clavicle_l',.02,.04,.06),bone('clavicle_r',-.02,-.04,-.06),bone('upperarm_l',.7,.8,.9),bone('upperarm_r',-.7,-.8,-.9),
    bone('hand_l',.2,.3,.4),bone('thigh_l',-.4,.5,.6)
  ];
  return{nodes,root:{traverse(visit){nodes.forEach(visit);}}};
}

test('safe skeleton motion is limited to spine, clavicles and upper arms confirmed by the unified skeleton contract',()=>{
  assert.deepEqual(motion.SPINE_BONES,['spine_01','spine_02','spine_03']);
  assert.deepEqual(motion.UPPER_BODY_BONES,['clavicle_l','clavicle_r','upperarm_l','upperarm_r']);
  assert.deepEqual(motion.SAFE_BONES,[...motion.SPINE_BONES,...motion.UPPER_BODY_BONES]);
  const joints=JSON.parse(fs.readFileSync('assets/humans/unified/base_body.joints.json','utf8'));
  for(const name of motion.SAFE_BONES)assert.ok(joints.bones[name],`${name} missing from unified skeleton contract`);
  for(const risky of ['lowerarm_l','lowerarm_r','hand_l','hand_r','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r'])assert.equal(motion.SAFE_BONES.includes(risky),false);
});

test('motion is additive from captured rest pose, bounded by bone class and never drifts',()=>{
  const {nodes,root}=rootWithBones();
  const untouchedBefore=Object.fromEntries(nodes.slice(7).map(node=>[node.name,{...node.rotation}]));
  const rest=Object.fromEntries(nodes.slice(0,7).map(node=>[node.name,{...node.rotation}]));
  assert.equal(motion.apply(root,'轻微转身',{breathing:.006},4200),true);
  const first=Object.fromEntries(nodes.slice(0,7).map(node=>[node.name,{...node.rotation}]));
  assert.equal(motion.apply(root,'轻微转身',{breathing:.006},4200),true);
  for(const name of motion.SAFE_BONES){
    const node=nodes.find(item=>item.name===name),limit=motion.limitFor(name);
    assert.deepEqual(node.rotation,first[name],`${name} should not accumulate drift`);
    for(const axis of ['x','y','z'])assert.ok(Math.abs(node.rotation[axis]-rest[name][axis])<=limit+1e-9,`${name}.${axis} exceeded safety bound`);
  }
  assert.equal(motion.limitFor('spine_01'),motion.MAX_DELTA);
  assert.equal(motion.limitFor('upperarm_l'),motion.UPPER_BODY_MAX_DELTA);
  assert.ok(motion.UPPER_BODY_MAX_DELTA<motion.MAX_DELTA);
  for(const [name,rotation] of Object.entries(untouchedBefore))assert.deepEqual(nodes.find(item=>item.name===name).rotation,rotation,`${name} must remain untouched`);
});

test('qualified upper-body motion is subtle but actually changes shoulders and upper arms',()=>{
  const {nodes,root}=rootWithBones();
  const before=Object.fromEntries(motion.UPPER_BODY_BONES.map(name=>[name,{...nodes.find(item=>item.name===name).rotation}]));
  assert.equal(motion.apply(root,'放松呼吸',{breathing:.006},2100),true);
  const changed=motion.UPPER_BODY_BONES.filter(name=>{
    const after=nodes.find(item=>item.name===name).rotation,rest=before[name];
    return ['x','y','z'].some(axis=>Math.abs(after[axis]-rest[axis])>1e-9);
  });
  assert.ok(changed.length>=2,'expected visible shoulder/upper-arm micro motion');
});

test('reset restores exact model rest rotations and incomplete upper-body skeleton fails closed',()=>{
  const {nodes,root}=rootWithBones();
  const before=Object.fromEntries(nodes.slice(0,7).map(node=>[node.name,{...node.rotation}]));
  motion.apply(root,'放松呼吸',{breathing:.006},900);
  assert.equal(motion.reset(root),true);
  for(const name of motion.SAFE_BONES)assert.deepEqual(nodes.find(item=>item.name===name).rotation,before[name]);
  const partial={traverse(visit){for(const name of motion.SAFE_BONES.filter(name=>name!=='upperarm_r'))visit(bone(name));}};
  assert.equal(motion.apply(partial,'自然站立',{breathing:.006},1),false);
});

test('motion eligibility is limited to qualified unified custom characters',()=>{
  assert.equal(motion.eligibleCharacter({id:'custom_a',isPreset:false,humanAssetId:'unified-charactercreator',humanAssetStatus:'device-qualified'}),true);
  assert.equal(motion.eligibleCharacter({id:'custom_a',isPreset:false,humanAssetId:'unified-charactercreator',humanAssetStatus:'production'}),true);
  assert.equal(motion.eligibleCharacter({id:'custom_a',isPreset:false,humanAssetId:'unified-charactercreator',humanAssetStatus:'unified-static'}),false);
  assert.equal(motion.eligibleCharacter({id:'preset_a',isPreset:true,humanAssetId:'unified-charactercreator',humanAssetStatus:'production'}),false);
});
