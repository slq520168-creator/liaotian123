const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('creator preview is allowed by the real static asset contract without faking chat production qualification',()=>{
  const preview=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  const gate=fs.readFileSync('role-unified-production-gate.js','utf8');
  const manifest=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-manifest.json','utf8'));
  assert(preview.includes('staticQualification'));
  assert(preview.includes('fetchManifest'));
  assert(preview.includes('assets/humans/unified/base_body.glb'));
  assert(preview.includes('runtime.applyCandidateState'));
  assert(preview.includes('renderer.modules.GLTFLoader'));
  assert(preview.includes('RoleAccessoryGeometry'));
  assert(preview.includes('RoleSafeSkeletonMotion?.apply'));
  assert(!preview.includes('本机3D验收通过后显示真实预览'));
  assert.equal(manifest.status,'candidate-only');
  assert.equal(manifest.capabilities.mobile,false);
  assert.equal(manifest.mobile.validated,false);
  assert(gate.includes("if(clean(manifest?.status)!=='production')reasons.push('status')"));
  assert(gate.includes("if(manifest?.capabilities?.mobile!==true)reasons.push('capability:mobile')"));
  assert(gate.includes("if(manifest?.mobile?.validated!==true)reasons.push('mobile:validated')"));
});

test('creator preview is loaded after the production gate while chat qualification stays separate',()=>{
  const config=fs.readFileSync('config/app.js','utf8');
  const order=['role-unified-production-gate.js','role-creator-wizard-preview.js','role-creator-3d-preview-v2.js'].map(name=>config.indexOf(`'${name}'`));
  assert(order.every(index=>index>=0));
  assert(order[0]<order[1]&&order[1]<order[2]);
  assert(!config.match(/for\(const src of \[[\s\S]*?'role-unified-custom-chat\.js'/));
});
