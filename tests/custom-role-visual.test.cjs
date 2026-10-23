const test = require('node:test');
const assert = require('node:assert/strict');
const visual = require('../role-custom-visual.js');

test('custom characters receive only the explicit MPFB reference fallback by default', () => {
  const char = {id: 'custom_abc', name: '姐姐'};
  assert.equal(visual.decorateCharacter(char), true);
  assert.equal(char.humanAsset.url, 'assets/humans/reference-mpfb.glb');
  assert.equal(char.humanAsset.minMorphTargets, 52);
  assert.equal(char.humanAsset.framing, 'portrait');
  assert.equal(char.humanAssetStatus, 'reference-fallback');
  assert.equal(char.humanAssetId, 'reference-mpfb');
});

test('legacy full-body fallback is migrated to safe portrait reference framing', () => {
  const char = {id: 'custom_old', name: '姐姐', humanAsset: {url:'assets/humans/reference-mpfb.glb', framing:'full', minMorphTargets:52}};
  assert.equal(visual.decorateCharacter(char), true);
  assert.equal(char.humanAsset.framing, 'portrait');
  assert.equal(char.humanAssetStatus, 'reference-fallback');
});

test('a fully validated candidate can replace the reference fallback', () => {
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

test('an incomplete candidate is never promoted just because it has a GLB URL', () => {
  const candidate = {
    id:'body-only', descriptor:{url:'assets/humans/reference-vitruvian-morph.glb'},
    capabilities:{skeleton:true,body:true,faceIdentity:false,expressions:true,visemes:true,hair:false,clothing:false,mobile:false,license:'CC0'}
  };
  const char = {id:'custom_bodyonly',name:'候选'};
  visual.decorateCharacter(char,[candidate]);
  assert.equal(char.humanAsset.url,'assets/humans/reference-mpfb.glb');
  assert.equal(char.humanAssetStatus,'reference-fallback');
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
