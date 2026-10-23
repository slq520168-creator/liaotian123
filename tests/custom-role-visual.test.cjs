const test = require('node:test');
const assert = require('node:assert/strict');
const visual = require('../role-custom-visual.js');

test('custom characters receive a real local 3D asset fallback', () => {
  const char = {id: 'custom_abc', name: '姐姐'};
  assert.equal(visual.decorateCharacter(char), true);
  assert.equal(char.humanAsset.url, 'assets/humans/reference-mpfb.glb');
  assert.equal(char.humanAsset.minMorphTargets, 52);
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
