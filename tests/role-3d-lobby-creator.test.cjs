const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const bases=require('../role-3d-bases.js');

test('3D lobby exposes exactly four female and four male full-body bases',()=>{
  assert.equal(bases.BASES.length,8);
  assert.equal(bases.BASES.filter(item=>item.gender==='female').length,4);
  assert.equal(bases.BASES.filter(item=>item.gender==='male').length,4);
  assert.equal(new Set(bases.BASES.map(item=>item.id)).size,8);
});

test('all eight bases represent genuinely different geometry recipes',()=>{
  const signatures=bases.BASES.map(item=>bases.geometrySignature(item));
  assert.equal(new Set(signatures).size,8);
  for(const item of bases.BASES){
    assert(Number.isFinite(item.heightCm));
    assert(Number.isFinite(item.weightJin));
    assert(item.body&&item.face&&item.skin);
  }
});

test('creator is six-step 3D lobby and no longer exposes face/body sculpt pages',()=>{
  const source=fs.readFileSync('role-creator-wizard.js','utf8');
  assert(source.includes("const steps=[['base','选择人物'],['hair','发型'],['outfit','服装'],['accessory','配饰'],['motion','动作声音'],['finish','完成']]"));
  assert(source.includes("studio.dataset.full3d='required'"));
  assert(source.includes('bases.BASES.map'));
  assert(!source.includes("['face','脸部']"));
  assert(!source.includes('faceControls()'));
});

test('selected base persists through the visual recipe and role code path',()=>{
  const visual=fs.readFileSync('role-visual-recipe.js','utf8');
  const code=fs.readFileSync('role-code-3d.js','utf8');
  assert(visual.includes("baseId:pick(input.baseId,BASE_IDS"));
  assert(visual.includes("lineValue(lines,'3D底座：')"));
  assert(code.includes("baseId:['baseId','base3d','3dBase','3D底座','底座']"));
  assert(code.includes('window.Role3DBases?.apply?.'));
});

test('production loads base registry before visual recipe and ships it to Cloudflare',()=>{
  const config=fs.readFileSync('config/app.js','utf8');
  const build=fs.readFileSync('scripts/build-cloudflare.mjs','utf8');
  assert(config.indexOf("'role-3d-bases.js'")<config.indexOf("'role-visual-recipe.js'"));
  assert(build.includes("'role-3d-bases.js'"));
});
