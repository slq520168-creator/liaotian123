const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('creator uses the existing fullscreen 3D renderer instead of a second embedded preview',()=>{
  const preview=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(preview.includes('assets/humans/unified/base_body.glb'));
  assert(preview.includes('win.__ROLE_HUMAN_RENDERER'));
  assert(preview.includes("doc.body.classList.add('creator-fullscreen-3d')"));
  assert(preview.includes("field('roleCreator3dPreview')?.remove?.()"));
  assert(!preview.includes('roleCreator3dPreviewCanvas'));
  assert(!/new\s+Renderer\s*\(/.test(preview));
  assert(!preview.includes('renderer.modules.GLTFLoader'));
});

test('creator fullscreen presentation keeps chat production qualification separate',()=>{
 const config=fs.readFileSync('config/app.js','utf8');
 const index=fs.readFileSync('index.html','utf8');
 const gate=fs.readFileSync('role-unified-production-gate.js','utf8');
 const manifest=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-manifest.json','utf8'));
 assert.match(config,/LIAOTIAN_3D_ONLY=false/);
 assert.match(index,/src="role-2d-creator\.js/);
 assert.doesNotMatch(index,/src="role-avatar-stage\.js/);
 assert.doesNotMatch(config,/role-creator-wizard-preview\.js|role-creator-3d-preview-v2\.js/);
 assert.equal(manifest.status,'candidate-only');
 assert.equal(manifest.mobile.validated,false);
 assert(gate.includes("if(clean(manifest?.status)!=='production')reasons.push('status')"));
});
