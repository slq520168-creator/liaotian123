const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../role-asset-policy.js');

test('save-data and 2g force portrait assets', () => {
  assert.equal(policy.chooseTier({memoryGB: 8, cores: 8, saveData: true}), 'portrait');
  assert.equal(policy.chooseTier({memoryGB: 8, cores: 8, effectiveType: '2g'}), 'portrait');
});

test('low devices never request full-body assets', () => {
  assert.equal(policy.chooseTier({memoryGB: 2, cores: 8}), 'portrait');
  assert.equal(policy.chooseTier({memoryGB: 8, cores: 2}), 'portrait');
  assert.equal(policy.chooseTier({memoryGB: 4, cores: 8}), 'upper');
  assert.equal(policy.chooseTier({memoryGB: 8, cores: 4}), 'upper');
});

test('high devices can request full assets', () => {
  assert.equal(policy.chooseTier({memoryGB: 8, cores: 8, effectiveType: '4g', width: 430}), 'full');
});

test('tier order never falls upward to a heavier tier', () => {
  assert.deepEqual(policy.tierOrder('portrait'), ['portrait']);
  assert.deepEqual(policy.tierOrder('upper'), ['upper', 'portrait']);
  assert.deepEqual(policy.tierOrder('full'), ['full', 'upper', 'portrait']);
});

test('upper tier falls down to portrait but not up to full', () => {
  const raw = {portrait: {url: 'face.glb'}, full: {url: 'full.glb'}};
  const out = policy.selectDescriptor(raw, 'upper', value => value);
  assert.equal(out.url, 'face.glb');
  assert.equal(out.tier, 'portrait');
});

test('single descriptor remains backward compatible', () => {
  const out = policy.selectDescriptor({url: 'human.glb'}, 'upper', value => value);
  assert.equal(out.url, 'human.glb');
  assert.equal(out.tier, 'upper');
});

test('registry has priority over character embedded asset', () => {
  const char = {id: 'a', humanAsset: {url: 'local.glb'}};
  const out = policy.selectForCharacter(char, {a: {upper: {url: 'official.glb'}}}, {tier: 'upper'});
  assert.equal(out.url, 'official.glb');
  assert.equal(out.tier, 'upper');
});
