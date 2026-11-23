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
 const editor=read('role-2d-creator.js'),app=read('app.js'),config=read('config/app.js');
 assert.match(editor,/commitCustomCharacters/);
 assert.match(editor,/normalizeCustomCharacter/);
 assert.match(editor,/window\.RoleDiscovery\?\.openChat/);
 assert.match(app,/window\.Role2DCreator\?\.open/);
 assert.match(config,/RoleCatalogPolicy/);
 assert.match(app,/liaotian_archived_3d_custom_v1/);
 assert.doesNotMatch(config,/backupBeforePrune\('liaotian_chat_histories'/);
 assert.doesNotMatch(app,/localStorage\.removeItem\('liaotian_chat_histories'/);
});

test('role model distribution is local and absent models do not become fake features',()=>{
 const build=read('scripts/build-cloudflare.mjs'),index=read('index.html');
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.devDependencies['mesh-avatar-element'],'0.4.5','legacy package remains archived for reproducibility');
 assert.match(build,/'role-2d-creator\.js'/);
 assert.doesNotMatch(index,/src="role-avatar-stage\.js/);
 assert.match(index,/role-2d-creator\.js/);
 assert.match(build,/assets\/role-models/);
 assert.match(build,/await rm\(new URL\(name\+'\/',out\)/);
 const registry=JSON.parse(read('assets/role-models/manifest.json'));
 assert.equal(registry.schema,1);
 assert.equal(Object.keys(registry.models).length,0);
});

test('space pressure never silently truncates a character chat history',()=>{
  const app=read('app.js');
  const body=app.match(/function saveDataToStorage\(\) \{([\s\S]*?)\n\}\n\nfunction makeId/);
  assert.ok(body,'storage handler exists');
  assert.doesNotMatch(body[1],/slice\(-50\)|自动清理旧消息/);
  assert.match(body[1],/原聊天记录没有清理/);
});

test('2D creator opens on top of the discovery page and does not force the iPhone keyboard open',()=>{
  const discovery=read('role-discovery.js');
  assert.match(discovery,/function openCreate\(\) \{[\s\S]*?openCreateModalBtn/);
  assert.doesNotMatch(discovery,/function openCreate\(\) \{\s*switchView\(false\)/);
  assert.match(discovery,/matchMedia\('\(pointer:fine\)'\)/);
});
