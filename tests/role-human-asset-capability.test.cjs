const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../role-human-asset-capability.js');

test('MPFB is retained only as an incomplete reference fallback', () => {
  assert.equal(policy.isProductionReady(policy.REFERENCE_FALLBACK), false);
  assert.ok(policy.missingCapabilities(policy.REFERENCE_FALLBACK).includes('body'));
  assert.ok(policy.missingCapabilities(policy.REFERENCE_FALLBACK).includes('faceIdentity'));
});

test('Vitruvian body candidate is not promoted without identity hair clothing and mobile validation', () => {
  assert.equal(policy.BODY_CANDIDATE.capabilities.body, true);
  assert.equal(policy.isProductionReady(policy.BODY_CANDIDATE), false);
  assert.ok(policy.missingCapabilities(policy.BODY_CANDIDATE).includes('hair'));
  assert.ok(policy.missingCapabilities(policy.BODY_CANDIDATE).includes('clothing'));
});

test('only a complete licensed candidate can replace the reference fallback', () => {
  const candidate = {
    id:'unified-charactercreator', status:'validated',
    descriptor:{url:'assets/humans/unified-charactercreator.glb',framing:'portrait',minMorphTargets:52},
    capabilities:{skeleton:true,body:true,faceIdentity:true,expressions:true,visemes:true,hair:true,clothing:true,mobile:true,license:'CC0'}
  };
  const selected = policy.selectCustomAsset([policy.BODY_CANDIDATE, candidate]);
  assert.equal(selected.id, 'unified-charactercreator');
  assert.equal(selected.complete, true);
});

test('invalid license cannot be promoted even when feature flags are true', () => {
  const candidate = {
    id:'bad-license', descriptor:{url:'assets/humans/bad.glb'},
    capabilities:{skeleton:true,body:true,faceIdentity:true,expressions:true,visemes:true,hair:true,clothing:true,mobile:true,license:'UNKNOWN'}
  };
  const selected = policy.selectCustomAsset([candidate]);
  assert.equal(selected.id, 'reference-mpfb');
  assert.equal(selected.complete, false);
});
