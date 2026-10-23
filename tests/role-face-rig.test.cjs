const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const rig = require(path.join('..', 'role-face-rig.js'));

function makeMesh(names) {
  const morphTargetDictionary = Object.fromEntries(names.map((name, i) => [name, i]));
  return {morphTargetDictionary, morphTargetInfluences: names.map(() => 0), rotation: {x: 0, y: 0, z: 0}};
}

test('exports the complete ARKit 52 set', () => {
  assert.equal(rig.ARKIT_52.length, 52);
  assert.ok(rig.ARKIT_52.includes('jawOpen'));
  assert.ok(rig.ARKIT_52.includes('eyeBlinkLeft'));
  assert.ok(rig.ARKIT_52.includes('tongueOut'));
});

test('FaceCap-style blendShape prefixes map to canonical ARKit names', () => {
  const index = rig.buildMorphIndex({
    'blendShape1.jawOpen': 7,
    'blendShape1.eyeBlinkLeft': 3,
    'ARKIT_mouthPucker': 9,
    madeUp: 11
  });
  assert.deepEqual(index, {eyeBlinkLeft: 3, jawOpen: 7, mouthPucker: 9});
});

test('aa viseme opens jaw without inventing unrelated expressions', () => {
  const weights = rig.weightsFromPresence({state:'speaking', blink:0, gazeX:0, gazeY:0, visemes:{aa:1}});
  assert.equal(weights.jawOpen, .92);
  assert.equal(weights.mouthPucker, 0);
  assert.equal(weights.browDownLeft, 0);
});

test('PP closes and presses lips instead of opening the jaw', () => {
  const weights = rig.weightsFromPresence({state:'speaking', visemes:{PP:1}});
  assert.equal(weights.mouthClose, 1);
  assert.equal(weights.mouthPressLeft, .55);
  assert.equal(weights.mouthPressRight, .55);
  assert.equal(weights.jawOpen, 0);
});

test('blink and gaze use symmetric eye channels', () => {
  const weights = rig.weightsFromPresence({state:'listening', blink:.8, gazeX:.2, gazeY:-.1, visemes:{}});
  assert.equal(weights.eyeBlinkLeft, .8);
  assert.equal(weights.eyeBlinkRight, .8);
  assert.ok(weights.eyeLookOutLeft > 0);
  assert.ok(weights.eyeLookInRight > 0);
  assert.ok(weights.eyeLookDownLeft > 0);
  assert.ok(weights.eyeLookDownRight > 0);
});

test('unknown visemes do not move the mouth', () => {
  const weights = rig.weightsFromPresence({state:'speaking', visemes:{fake:1}});
  const mouthMoved = Object.entries(weights).some(([name, value]) => (name.startsWith('mouth') || name.startsWith('jaw') || name === 'tongueOut') && value > 0);
  assert.equal(mouthMoved, false);
});

test('applies only morphs actually present on the mesh', () => {
  const mesh = makeMesh(['blendShape1.jawOpen', 'blendShape1.mouthFunnel', 'other']);
  const adapter = new rig.FaceRigAdapter(mesh);
  const ok = adapter.render({state:'speaking', headYaw:.01, headPitch:-.01, visemes:{oh:1}});
  assert.equal(ok, true);
  assert.equal(mesh.morphTargetInfluences[0], .58);
  assert.equal(mesh.morphTargetInfluences[1], .72);
  assert.equal(mesh.morphTargetInfluences[2], 0);
  assert.ok(mesh.rotation.y > 0);
  assert.ok(mesh.rotation.x < 0);
});

test('reset returns controlled morphs and head pose to neutral', () => {
  const mesh = makeMesh(['jawOpen', 'eyeBlinkLeft']);
  mesh.rotation.x = .1; mesh.rotation.y = -.2;
  const adapter = new rig.FaceRigAdapter(mesh);
  adapter.render({state:'speaking', headYaw:.1, headPitch:.1, blink:1, visemes:{aa:1}});
  adapter.reset();
  assert.deepEqual(mesh.morphTargetInfluences, [0, 0]);
  assert.equal(mesh.rotation.x, .1);
  assert.equal(mesh.rotation.y, -.2);
});
