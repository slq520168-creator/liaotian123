const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('production creator is 3D-only lobby wizard',()=>{
 const config=fs.readFileSync('config/app.js','utf8');
 const html=fs.readFileSync('index.html','utf8');
 const source=fs.readFileSync('role-2d-creator.js','utf8');
 assert.match(config,/LIAOTIAN_3D_ONLY=false/);
 assert.doesNotMatch(config,/role-creator-wizard\.js|role-code-3d\.js|role-3d-bases\.js/);
 assert.match(html,/src="role-2d-creator\.js/);
 assert.match(source,/roleKind:'2d'/);
 assert.match(source,/localStorage|commitCustomCharacters/);
 assert.match(source,/video/);
});

test('custom role code activates a real 3D base role instead of ordinary text role',()=>{
  const source=fs.readFileSync('role-code-3d.js','utf8');
  assert(source.includes("roleKind:'3d'"));
  assert(source.includes('visualRecipe:r'));
  assert(source.includes('bases?.materialize?.(requested,appearance)'));
  assert(source.includes('baseId:r.baseId'));
  assert(source.includes("char.roleKind!=='3d'"));
});

test('wizard changes drive the one fullscreen production 3D renderer',()=>{
  const source=fs.readFileSync('role-creator-wizard-preview.js','utf8');
  assert(source.includes('choice.dataset.key=choice.dataset.choice'));
  const preview=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(preview.includes("win.addEventListener('rolecreatorpage',()=>queue(80))"));
  assert(preview.includes("win.addEventListener('rolecreatorstep',()=>queue(80))"));
  assert(preview.includes("renderer.frameModel?.(renderer.root,'full')"));
  assert(preview.includes('win.__ROLE_HUMAN_RENDERER'));
  assert.equal(/new\s+Renderer\s*\(/.test(preview),false);
  assert.equal(preview.includes('roleCreator3dPreviewCanvas'),false);
});
