const test = require('node:test');
const assert = require('node:assert/strict');
const rig = require('../role-proportion-rig.js');

function bone(name, x=0) {
  return {name,isBone:true,scale:{x:1,y:1,z:1},position:{x,y:0,z:0},children:[],updateMatrix(){}};
}
function model() {
  const root={name:'root',children:[],updateMatrixWorld(){this.updated=true;}};
  for (const name of rig.REQUIRED) root.children.push(bone(name, name==='LeftShoulder' ? .3 : name==='RightShoulder' ? -.3 : 0));
  return root;
}

test('reference MPFB skeleton names satisfy the proportion contract', () => {
  const root=model();
  const bones=rig.collectBones(root);
  assert.equal(rig.supportScore(bones), rig.REQUIRED.length);
});

test('neutral 165cm plan does not change longitudinal proportions', () => {
  const plan=rig.proportionPlan({heightCm:165,body:'匀称'});
  assert.equal(plan.legScale,1);
  assert.equal(plan.torsoScale,1);
  assert.equal(plan.shoulderScale,1);
});

test('taller and shorter recipes use official heightCm field', () => {
  const tall=rig.proportionPlan({heightCm:220});
  const short=rig.proportionPlan({heightCm:130});
  assert.equal(tall.heightCm,220);
  assert.equal(short.heightCm,130);
  assert.ok(tall.legScale>1 && tall.torsoScale>1);
  assert.ok(short.legScale<1 && short.torsoScale<1);
});

test('legacy height field remains compatible', () => {
  assert.equal(rig.proportionPlan({height:180}).heightCm,180);
});

test('健壮 widens shoulder bone offsets without pretending to add body mass', () => {
  const root=model();
  const adapter=new rig.ProportionRigAdapter(root);
  const result=adapter.applySpec({heightCm:165,body:'健壮',weightJin:300});
  assert.equal(result.applied,true);
  assert.equal(adapter.bones.LeftShoulder.position.x, .3 * rig.SHOULDER_FACTOR['健壮']);
  assert.equal(adapter.bones.RightShoulder.position.x, -.3 * rig.SHOULDER_FACTOR['健壮']);
  assert.equal(adapter.bones.Hips.scale.x,1);
  assert.equal(adapter.bones.Hips.scale.z,1);
});

test('height changes named leg/spine bones rather than scaling the whole root', () => {
  const root=model();
  root.scale={x:1,y:1,z:1};
  const adapter=new rig.ProportionRigAdapter(root);
  adapter.applySpec({heightCm:190,body:'匀称'});
  assert.ok(adapter.bones.LeftUpLeg.scale.y>1);
  assert.ok(adapter.bones.Spine1.scale.y>1);
  assert.deepEqual(root.scale,{x:1,y:1,z:1});
});

test('reset restores the original bone transforms exactly', () => {
  const root=model();
  const adapter=new rig.ProportionRigAdapter(root);
  adapter.applySpec({heightCm:210,body:'健壮'});
  adapter.reset();
  assert.equal(adapter.bones.LeftUpLeg.scale.y,1);
  assert.equal(adapter.bones.Spine2.scale.y,1);
  assert.equal(adapter.bones.LeftShoulder.position.x,.3);
});

test('missing required bones disables the rig instead of applying partial fake proportions', () => {
  const root={children:[bone('Hips')]};
  const adapter=new rig.ProportionRigAdapter(root);
  assert.equal(adapter.supported(),false);
  assert.deepEqual(adapter.applySpec({heightCm:200}),{applied:false,reason:'missing-bones'});
});
