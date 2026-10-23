const test = require('node:test');
const assert = require('node:assert/strict');
const support = require('../role-meshopt-support.js');

test('meshopt support pins production decoder versions and self-hosted modules', () => {
  assert.equal(support.THREE_VERSION, '0.186.1');
  assert.equal(support.MESHOPT_VERSION, '1.3.0');
  assert.match(support.GLTF_LOADER_MODULE, /^vendor\/three\/examples\/jsm\/loaders\/GLTFLoader\.js(?:\?|$)/);
  assert.match(support.MESHOPT_DECODER_MODULE, /^vendor\/meshoptimizer\/meshopt_decoder\.mjs(?:\?|$)/);
  assert.doesNotMatch(support.GLTF_LOADER_MODULE, /esm\.sh/);
  assert.doesNotMatch(support.MESHOPT_DECODER_MODULE, /esm\.sh/);
});

test('decoder module normalization accepts named and default exports', () => {
  const decoder = {ready: Promise.resolve()};
  assert.equal(support.decoderFromModule({MeshoptDecoder: decoder}), decoder);
  assert.equal(support.decoderFromModule({default: {MeshoptDecoder: decoder}}), decoder);
  assert.equal(support.decoderFromModule({default: decoder}), decoder);
});

test('install patches GLTFLoader once and injects decoder on load', async () => {
  const calls = [];
  class FakeLoader {
    setMeshoptDecoder(value) { this.decoder = value; return this; }
    load(url) { calls.push([url, this.decoder]); return 'ok'; }
  }
  const decoder = {ready: Promise.resolve(), supported: true};
  const importer = async specifier => specifier.includes('GLTFLoader') ? {GLTFLoader: FakeLoader} : {MeshoptDecoder: decoder};
  const first = await support.install(importer);
  assert.equal(first.patched, true);
  const loader = new FakeLoader();
  assert.equal(loader.load('a.glb'), 'ok');
  assert.equal(calls[0][1], decoder);
  const second = await support.install(importer);
  assert.equal(second.patched, false);
});
