const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../role-human-manifest.js');

test('versioned manifest URL uses immutable build key', () => {
  assert.equal(manifest.versionedUrl('assets/humans/manifest.json', 'human7'), 'assets/humans/manifest.json?v=human7');
  assert.equal(manifest.versionedUrl('x.json?a=1', 'v 1'), 'x.json?a=1&v=v%201');
});

test('sanitized production entries always require 52 face morphs', () => {
  const entry = manifest.sanitizeEntry({
    url:'assets/humans/a.glb', license:'CC0', source:'source', minMorphTargets:3
  }, 'full');
  assert.equal(entry.minMorphTargets, 52);
});

test('manifest loader keeps the same registry object and uses versioned cache', async () => {
  const registry = {old:{bad:true}};
  let request = null;
  const fetchImpl = async (url, options) => {
    request = {url, options};
    return {
      ok:true,
      json:async()=>({version:1,characters:{a:{portrait:{url:'assets/humans/a.glb',license:'MIT',source:'owned'}}}})
    };
  };
  const result = await manifest.loadManifest({fetchImpl, registry, buildVersion:'human7'});
  assert.equal(result.registry, registry);
  assert.equal(Object.hasOwn(registry,'old'), false);
  assert.equal(registry.a.portrait.minMorphTargets, 52);
  assert.equal(request.url, 'assets/humans/manifest.json?v=human7');
  assert.equal(request.options.cache, 'force-cache');
});
