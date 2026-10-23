const test = require('node:test');
const assert = require('node:assert/strict');

function glbFromJson(json) {
  let body = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (body.length % 4)) % 4;
  if (pad) body = Buffer.concat([body, Buffer.alloc(pad, 0x20)]);
  const out = Buffer.alloc(12 + 8 + body.length);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(body.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  body.copy(out, 20);
  return out;
}

test('parses glTF 2 GLB JSON chunk', async () => {
  const mod = await import('../scripts/human-glb-contract.mjs');
  const glb = glbFromJson({asset:{version:'2.0'}, meshes:[]});
  const parsed = mod.parseGlb(glb);
  assert.equal(parsed.json.asset.version, '2.0');
  assert.equal(parsed.byteLength, glb.length);
});

test('rejects non-GLB data', async () => {
  const mod = await import('../scripts/human-glb-contract.mjs');
  assert.throws(() => mod.parseGlb(Buffer.alloc(32)), /有效 GLB/);
});

test('requires all 52 ARKit targets for production', async () => {
  const mod = await import('../scripts/human-glb-contract.mjs');
  const doc = {meshes:[{extras:{targetNames:mod.ARKIT_52},primitives:[{targets:[{}]}]}], skins:[{}]};
  const pass = mod.validateHumanAsset({json:doc, byteLength:1024, tier:'full', license:'CC0'});
  assert.equal(pass.ok, true);
  const fail = mod.validateHumanAsset({json:{meshes:[{extras:{targetNames:['jawOpen']},primitives:[{targets:[{}]}]}],skins:[{}]}, byteLength:1024, tier:'full', license:'CC0'});
  assert.equal(fail.ok, false);
  assert.match(fail.errors.join('\n'), /1\/52/);
});

test('full and upper assets require a skin', async () => {
  const mod = await import('../scripts/human-glb-contract.mjs');
  const doc = {meshes:[{extras:{targetNames:mod.ARKIT_52},primitives:[{targets:[{}]}]}]};
  assert.equal(mod.validateHumanAsset({json:doc, tier:'portrait', license:'CC0'}).ok, true);
  assert.equal(mod.validateHumanAsset({json:doc, tier:'upper', license:'CC0'}).ok, false);
});

test('customizable bodies require real body morphs', async () => {
  const mod = await import('../scripts/human-glb-contract.mjs');
  const names = [...mod.ARKIT_52, ...mod.BODY_CHANNELS.slice(0, 5)];
  const doc = {meshes:[{extras:{targetNames:names},primitives:[{targets:[{}]}]}],skins:[{}]};
  assert.equal(mod.validateHumanAsset({json:doc, tier:'full', license:'OWNED', customizableBody:true}).ok, true);
});

test('mobile tier size caps are enforced', async () => {
  const mod = await import('../scripts/human-glb-contract.mjs');
  const doc = {meshes:[{extras:{targetNames:mod.ARKIT_52},primitives:[{targets:[{}]}]}],skins:[{}]};
  assert.equal(mod.validateHumanAsset({json:doc, byteLength:9*1024*1024, tier:'portrait', license:'MIT'}).ok, false);
  assert.equal(mod.validateHumanAsset({json:doc, byteLength:7*1024*1024, tier:'portrait', license:'MIT'}).ok, true);
});

test('manifest requires local asset paths, source and license', async () => {
  const mod = await import('../scripts/human-glb-contract.mjs');
  assert.equal(mod.validateManifest({version:1,characters:{a:{full:{url:'assets/humans/a.glb',license:'CC0',source:'source'}}}}).ok,true);
  const bad=mod.validateManifest({version:1,characters:{a:{full:{url:'https://example.com/a.glb'}}}});
  assert.equal(bad.ok,false);
  assert.ok(bad.errors.length>=2);
});
