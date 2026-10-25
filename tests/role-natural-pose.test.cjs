const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pose=require('../role-natural-pose.js');

async function makeRig(){
  const THREE=await import('three');
  const root=new THREE.Group();
  const leftUpper=new THREE.Bone(),leftLower=new THREE.Bone(),rightUpper=new THREE.Bone(),rightLower=new THREE.Bone();
  leftUpper.name='upperarm_l';leftLower.name='lowerarm_l';rightUpper.name='upperarm_r';rightLower.name='lowerarm_r';
  /* Match assets/humans/unified/base_body.joints.json: left arm is +X, right arm is -X. */
  leftUpper.position.set(.3,1.5,0);leftLower.position.set(1,0,0);
  rightUpper.position.set(-.3,1.5,0);rightLower.position.set(-1,0,0);
  leftUpper.add(leftLower);rightUpper.add(rightLower);root.add(leftUpper,rightUpper);root.updateMatrixWorld(true);
  return {THREE,root,leftUpper,leftLower,rightUpper,rightLower};
}

function worldDirection(THREE,upper,lower){
  upper.updateMatrixWorld(true);lower.updateMatrixWorld(true);
  const a=new THREE.Vector3(),b=new THREE.Vector3();upper.getWorldPosition(a);lower.getWorldPosition(b);return b.sub(a).normalize();
}

test('natural pose lowers both upper arms beside the body in world space using the real rig axis convention',async()=>{
  const {THREE,root,leftUpper,leftLower,rightUpper,rightLower}=await makeRig();
  assert.equal(pose.applyNaturalPose(root,THREE),true);
  const left=worldDirection(THREE,leftUpper,leftLower),right=worldDirection(THREE,rightUpper,rightLower);
  assert.ok(left.y<-.9);assert.ok(right.y<-.9);
  assert.ok(left.x>0&&Math.abs(left.x)<.2);assert.ok(right.x<0&&Math.abs(right.x)<.2);
});

test('reset restores the original arm bind pose',async()=>{
  const {THREE,root,leftUpper,leftLower,rightUpper,rightLower}=await makeRig();
  const beforeL=worldDirection(THREE,leftUpper,leftLower).clone(),beforeR=worldDirection(THREE,rightUpper,rightLower).clone();
  pose.applyNaturalPose(root,THREE);assert.equal(pose.reset(root),true);
  const afterL=worldDirection(THREE,leftUpper,leftLower),afterR=worldDirection(THREE,rightUpper,rightLower);
  assert.ok(afterL.distanceTo(beforeL)<1e-9);assert.ok(afterR.distanceTo(beforeR)<1e-9);
});

test('renderer patch applies natural arm pose before the existing render chain',async()=>{
  const {THREE,root,leftUpper,leftLower}=await makeRig();
  let calls=0;
  class HumanRenderer{constructor(){this.root=root;this.modules={THREE};}renderFrame(){calls++;}async loadCharacter(){return true;}}
  assert.equal(pose.patchRenderer({HumanRenderer}),true);
  const renderer=new HumanRenderer();renderer.renderFrame({});
  assert.equal(calls,1);assert.ok(worldDirection(THREE,leftUpper,leftLower).y<-.9);
  assert.equal(HumanRenderer.prototype.renderFrame.__naturalArmPose,true);
});

test('pose implementation uses quaternions instead of hard-coded Euler arm angles',()=>{
  const source=fs.readFileSync('role-natural-pose.js','utf8');
  assert(source.includes('setFromUnitVectors'));
  assert(source.includes('getWorldQuaternion'));
  assert.equal(/upperarm_[lr].*rotation\.[xyz]\s*=/.test(source),false);
});

test('production loads natural pose before safe skeleton motion so the visible frame keeps arms down',()=>{
  const source=fs.readFileSync('config/app.js','utf8');
  const natural=source.indexOf("'role-natural-pose.js'");
  const safe=source.indexOf("'role-safe-skeleton-motion.js'");
  assert.ok(natural>=0&&safe>=0);
  assert.ok(natural<safe,'natural pose must wrap the renderer before safe motion wraps it');
});

test('chat text contract removes all message framing',()=>{
  const css=fs.readFileSync('chat-compact-ui.css','utf8');
  assert(css.includes('#messages .message-row'));
  assert(css.includes('#messages .message-bubble'));
  for(const rule of ['border:0!important','outline:0!important','box-shadow:none!important','background:transparent!important'])assert(css.includes(rule));
});
