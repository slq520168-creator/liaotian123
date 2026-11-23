const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const stage=require('../role-avatar-stage.js');
test('avatar registry rejects invalid source paths, licenses and anonymous assets',()=>{
  const safe=stage.sanitizeManifest({schema:1,models:{
    nuannuan:{src:'assets/role-models/nuannuan.mavatar',author:'Original artwork owner',license:'OWNED'},
    evil:{src:'https://example.net/demo.mavatar',author:'',license:'UNKNOWN'},
    wrong:{src:'assets/role-models/nuannuan.mavatar',author:'Original',license:'OWNED'}
  }});
  assert.deepEqual(Object.keys(safe.models),['nuannuan']);
  assert.deepEqual(Object.keys(stage.sanitizeManifest({schema:1,models:{}}).models),[]);
  assert.throws(()=>stage.sanitizeManifest({schema:1,models:[]}),TypeError);
});
test('real model runtime is self-hosted and never silently shows an unrelated sample',()=>{
  const js=read('role-avatar-stage.js');
  assert.match(js,/vendor\/mesh-avatar-element\/standalone\.js/);
  assert.match(js,/element\.avatar\?\.setSpeaking/);
  assert.match(js,/rolevoiceboundary/);
  assert.doesNotMatch(js,/Math\.sin\(/);
  assert.doesNotMatch(js,/miko\.mavatar|cdn\.jsdelivr\.net/);
});
test('custom 2D roles share existing chat engine, data and backup',()=>{
  const editor=read('role-2d-creator.js');
  const app=read('app.js'),config=read('config/app.js');
  assert.match(editor,/commitCustomCharacters/);
  assert.match(editor,/normalizeCustomCharacter/);
  assert.match(editor,/window\.RoleDiscovery\?\.openChat/);
  assert.match(app,/window\.Role2DCreator\?\.open/);
  assert.match(config,/const merged=\[\.\.\.legacy\]/);
  assert.match(config,/char\.roleKind=is3DRaw\(value\)\?ROLE_KIND:'2d'/);
  assert.doesNotMatch(config,/backupBeforePrune\('liaotian_chat_histories'/);
  assert.doesNotMatch(config,/localStorage\.setItem\(LEGACY_KEY,serialized\)/);
});
test('role model distribution is local and absent models do not become fake features',()=>{
  const build=read('scripts/build-cloudflare.mjs');
  const pkg=JSON.parse(read('package.json'));
  const index=read('index.html');
  assert.equal(pkg.devDependencies['mesh-avatar-element'],'0.4.5');
  assert.match(build,/node_modules\/mesh-avatar-element\/dist\/standalone.js/);
  assert.match(build,/'role-avatar-stage.js'/);
  assert.match(build,/'role-2d-creator.js'/);
  assert.match(index,/role-avatar-stage\.js/);
  assert.match(index,/role-2d-creator\.js/);
  const registry=JSON.parse(read('assets/role-models/manifest.json'));
  assert.equal(registry.schema,1);
  assert.equal(Object.keys(registry.models).length,0);
});