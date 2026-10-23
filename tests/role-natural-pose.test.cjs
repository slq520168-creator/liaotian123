const test = require('node:test');
const assert = require('node:assert/strict');
const pose = require('../role-natural-pose.js');

test('unsafe natural-pose layer is hard disabled', () => {
  assert.equal(pose.ENABLED, false);
  assert.equal(pose.DISABLED_REASON, 'unverified-bind-rest-pose');
  assert.deepEqual(pose.POSE, {});
});

test('applying the disabled pose never mutates bone rotations', () => {
  const arm = {name:'LeftArm',isBone:true,rotation:{x:.2,y:-.3,z:.4}};
  const before = {...arm.rotation};
  const root = {traverse(visitor){ visitor(arm); }};
  assert.equal(pose.findBone(root, 'LeftArm'), arm);
  assert.equal(pose.applyNaturalPose(root), false);
  assert.deepEqual(arm.rotation, before);
});

test('disabled pose layer never patches renderer loadCharacter', () => {
  class HumanRenderer { async loadCharacter(){ return true; } }
  const original = HumanRenderer.prototype.loadCharacter;
  assert.equal(pose.patchRenderer({HumanRenderer}), false);
  assert.equal(HumanRenderer.prototype.loadCharacter, original);
});
