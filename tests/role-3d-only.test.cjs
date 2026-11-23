const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const chatMode=require('../role-chat-mode.js');

const root=path.resolve(__dirname,'..');
const config=fs.readFileSync(path.join(root,'config/app.js'),'utf8');
const persistence=fs.readFileSync(path.join(root,'role-persistence.js'),'utf8');

test('role runtime exposes only 3d mode',()=>{
  assert.deepEqual([...chatMode.MODES],['3d']);
  assert.equal(chatMode.normalizeMode('text'),'3d');
  assert.equal(chatMode.defaultMode({}),'3d');
  assert.equal(chatMode.storedMode({id:'custom_x'}),'3d');
  assert.equal(chatMode.saveMode({id:'custom_x'},'text'),'3d');
});

test('ordinary custom roles are rejected by the 3d authority',()=>{
  assert.equal(chatMode.is3DRole({id:'custom_plain',isPreset:false,roleKind:'text',personality:'普通角色'}),false);
  assert.equal(chatMode.is3DRole({id:'custom_3d',isPreset:false,roleKind:'3d',personality:'3D角色'}),true);
  assert.equal(chatMode.is3DRole({id:'custom_spec',isPreset:false,personality:'【角色自定义设定】\n外形：身高165cm\n【自定义设定结束】'}),true);
});

test('production boot separates 3d storage and removes legacy mode switching',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(config,/LIAOTIAN_3D_ONLY=false/);
 assert.match(config,/RoleCatalogPolicy/);
 assert.match(config,/PRESET_CHARACTERS\.splice\(i,1\)/);
 assert.match(app,/liaotian_archived_3d_custom_v1/);
 assert.match(app,/Object\.assign\(Object\.create\(null\),storedHistories\)/);
 assert.doesNotMatch(config,/localStorage\.setItem\(LEGACY_KEY,serialized\)/);
 assert.match(persistence,/3d-roles-v1/);
});
