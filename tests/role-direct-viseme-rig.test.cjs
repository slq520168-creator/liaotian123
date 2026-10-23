const test = require('node:test');
const assert = require('node:assert/strict');
const direct = require('../role-direct-viseme-rig.js');

function dictionary() {
  return {
    viseme_PP:0, viseme_FF:1, viseme_TH:2, viseme_DD:3, viseme_kk:4, viseme_CH:5,
    viseme_SS:6, viseme_nn:7, viseme_RR:8, viseme_aa:9, viseme_E:10, viseme_I:11, viseme_O:12, viseme_U:13
  };
}

test('maps model-native viseme targets including I/U aliases', () => {
  const idx = direct.buildDirectIndex(dictionary());
  assert.equal(idx.PP,0);
  assert.equal(idx.ih,11);
  assert.equal(idx.ou,13);
  assert.equal(direct.directCoverage(idx),14);
});

test('direct visemes require enough real mouth targets', () => {
  const mesh={morphTargetDictionary:{viseme_PP:0},morphTargetInfluences:[0]};
  assert.equal(direct.applyDirectVisemes(mesh,{PP:1}),false);
  assert.equal(mesh.morphTargetInfluences[0],0);
});

test('dedicated morphs are driven directly and old viseme is cleared', () => {
  const mesh={morphTargetDictionary:dictionary(),morphTargetInfluences:Array(14).fill(.4)};
  const idx=direct.buildDirectIndex(mesh.morphTargetDictionary);
  assert.equal(direct.applyDirectVisemes(mesh,{PP:.8,aa:.6},idx),true);
  assert.equal(mesh.morphTargetInfluences[0],.8);
  assert.equal(mesh.morphTargetInfluences[9],.6);
  assert.equal(mesh.morphTargetInfluences[1],0);
});

test('patched face rig suppresses ARKit mouth mixing only when direct coverage is sufficient', () => {
  const calls=[];
  class FakeAdapter {
    attach(mesh){this.mesh=mesh;return 52;}
    render(frame){calls.push(frame.visemes);return true;}
    reset(){return this;}
  }
  assert.equal(direct.patchFaceRig(FakeAdapter),true);
  const mesh={morphTargetDictionary:dictionary(),morphTargetInfluences:Array(14).fill(0)};
  const adapter=new FakeAdapter();
  adapter.attach(mesh);
  adapter.render({visemes:{PP:1}});
  assert.deepEqual(calls[0],{});
  assert.equal(mesh.morphTargetInfluences[0],1);
});

test('patched face rig keeps ARKit fallback on legacy models', () => {
  const calls=[];
  class FakeAdapter {
    attach(mesh){this.mesh=mesh;return 52;}
    render(frame){calls.push(frame.visemes);return true;}
    reset(){return this;}
  }
  direct.patchFaceRig(FakeAdapter);
  const mesh={morphTargetDictionary:{viseme_PP:0},morphTargetInfluences:[0]};
  const adapter=new FakeAdapter();
  adapter.attach(mesh);
  adapter.render({visemes:{PP:.7}});
  assert.deepEqual(calls[0],{PP:.7});
  assert.equal(mesh.morphTargetInfluences[0],0);
});
