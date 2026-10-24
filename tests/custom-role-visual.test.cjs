const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const visual = require('../role-custom-visual.js');

test('custom roles stay lightweight until a complete custom 3D candidate exists', () => {
  const char = {id: 'custom_abc', name: '姐姐'};
  assert.equal(visual.decorateCharacter(char), true);
  assert.equal(char.humanAsset, undefined);
  assert.equal(char.humanAssetStatus, 'candidate-gated');
  assert.equal(char.humanAssetId, 'reference-mpfb');
});

test('legacy reference fallback is removed instead of decoded after role creation', () => {
  const char = {id: 'custom_old', name: '姐姐', humanAsset: {url:'assets/humans/reference-mpfb.glb', framing:'full', minMorphTargets:52}};
  assert.equal(visual.decorateCharacter(char), true);
  assert.equal(char.humanAsset, undefined);
  assert.equal(char.humanAssetStatus, 'candidate-gated');
});

test('a fully validated candidate can replace the gated state', () => {
  const candidate = {
    id:'unified-charactercreator', status:'validated',
    descriptor:{url:'assets/humans/unified-charactercreator.glb',framing:'portrait',minMorphTargets:52},
    capabilities:{skeleton:true,body:true,faceIdentity:true,expressions:true,visemes:true,hair:true,clothing:true,mobile:true,license:'CC0'}
  };
  const char = {id:'custom_ready',name:'新角色'};
  assert.equal(visual.decorateCharacter(char,[candidate]),true);
  assert.equal(char.humanAsset.url,'assets/humans/unified-charactercreator.glb');
  assert.equal(char.humanAssetStatus,'production');
  assert.equal(char.humanAssetId,'unified-charactercreator');
});

test('an incomplete candidate is never attached just because it has a GLB URL', () => {
  const candidate = {
    id:'body-only', descriptor:{url:'assets/humans/reference-vitruvian-morph.glb'},
    capabilities:{skeleton:true,body:true,faceIdentity:false,expressions:true,visemes:true,hair:false,clothing:false,mobile:false,license:'CC0'}
  };
  const char = {id:'custom_bodyonly',name:'候选'};
  visual.decorateCharacter(char,[candidate]);
  assert.equal(char.humanAsset,undefined);
  assert.equal(char.humanAssetStatus,'candidate-gated');
});

test('preset characters are not silently replaced', () => {
  const char = {id: 'nuannuan', name: '暖暖'};
  assert.equal(visual.decorateCharacter(char), false);
  assert.equal(char.humanAsset, undefined);
});

test('custom visual theme is stable per role', () => {
  assert.equal(visual.stableHue('custom_abc|姐姐'), visual.stableHue('custom_abc|姐姐'));
  assert.notEqual(visual.stableHue('custom_abc|姐姐'), visual.stableHue('custom_xyz|哥哥'));
});

test('creator modal gates the expensive main human renderer until the modal closes', () => {
  const source=fs.readFileSync('role-custom-visual.js','utf8');
  assert(source.includes('function syncHumanRendererWhenSafe()'));
  assert(source.includes("creatorModalActive()) return false"));
  assert(source.includes('if (wasActive && !active) syncHumanRendererWhenSafe();'));
});
