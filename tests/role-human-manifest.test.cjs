const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../role-human-manifest.js');

test('sanitizes valid local tier entries', () => {
  const entry = manifest.sanitizeEntry({url:'assets/humans/a.glb',license:'CC0',source:'source',scale:100,y:-99,rotationY:99}, 'full');
  assert.equal(entry.url,'assets/humans/a.glb');
  assert.equal(entry.license,'CC0');
  assert.equal(entry.scale,20);
  assert.equal(entry.y,-10);
  assert.equal(entry.rotationY,Math.PI*2);
  assert.equal(entry.minMorphTargets,52);
});

test('rejects remote or unlicensed runtime assets', () => {
  assert.equal(manifest.sanitizeEntry({url:'https://example.com/a.glb',license:'CC0',source:'x'},'full'),null);
  assert.equal(manifest.sanitizeEntry({url:'assets/humans/a.glb',license:'NC',source:'x'},'full'),null);
  assert.equal(manifest.sanitizeEntry({url:'assets/humans/a.glb',license:'CC0'},'full'),null);
});

test('sanitizes manifest ids and tiers without inventing assets', () => {
  const out=manifest.sanitizeManifest({version:1,characters:{good:{portrait:{url:'assets/humans/good-face.glb',license:'MIT',source:'owned'}},'../bad':{full:{url:'assets/humans/bad.glb',license:'CC0',source:'x'}},empty:{full:{url:'https://example.com/b.glb',license:'CC0',source:'x'}}}});
  assert.deepEqual(Object.keys(out.characters),['good']);
  assert.deepEqual(Object.keys(out.characters.good),['portrait']);
  assert.equal(out.characters.good.portrait.framing,'portrait');
});

test('replaceRegistry is atomic after successful parse', () => {
  const registry={old:{full:{url:'old.glb'}}};
  manifest.replaceRegistry(registry,{a:{portrait:{url:'assets/humans/a.glb'}}});
  assert.equal('old' in registry,false);
  assert.equal(registry.a.portrait.url,'assets/humans/a.glb');
});

test('loadManifest mutates supplied registry on success', async () => {
  const registry={};
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({version:1,characters:{a:{upper:{url:'assets/humans/a.glb',license:'OWNED',source:'local'}}}})});
  const result=await manifest.loadManifest({fetchImpl,registry});
  assert.equal(result.ok,true);
  assert.equal(registry.a.upper.url,'assets/humans/a.glb');
});

test('load failure leaves existing registry untouched', async () => {
  const registry={keep:{portrait:{url:'assets/humans/keep.glb'}}};
  const fetchImpl=async()=>({ok:false,status:503,json:async()=>({})});
  await assert.rejects(()=>manifest.loadManifest({fetchImpl,registry}),/503/);
  assert.equal(registry.keep.portrait.url,'assets/humans/keep.glb');
});
