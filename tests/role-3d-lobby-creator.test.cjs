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

test('fixed 3D base owns geometry while appearance remains customizable',()=>{
  const locked=bases.materialize('male_athletic',{gender:'female',heightCm:150,weightJin:90,body:'偏瘦',face:'甜美脸',skin:'偏白',hair:'马尾',outfit:'通勤',accessory:'细框眼镜'});
  const base=bases.get('male_athletic');
  for(const key of ['baseId','gender','age','heightCm','weightJin','body','face','skin'])assert.equal(locked[key],key==='baseId'?base.id:base[key]);
  assert.equal(locked.hair,'马尾');
  assert.equal(locked.outfit,'通勤');
  assert.equal(locked.accessory,'细框眼镜');
});

test('creator has six continuous identity, appearance, face, body, personality and finish steps',()=>{
  const source=fs.readFileSync('role-creator-wizard.js','utf8');
  assert(source.includes("const steps=[['identity','基础身份'],['appearance','外貌'],['hair','脸 / 发型'],['body','身体'],['personality','个性'],['finish','完成']]"));
  assert(source.includes("studio.dataset.full3d='required'"));
  assert(source.includes('bases.BASES.map'));
  assert(!source.includes("['face','脸部']"));
  assert(!source.includes('faceControls()'));
});

test('selected base persists and imported code cannot override base geometry',()=>{
  const visual=fs.readFileSync('role-visual-recipe.js','utf8');
  const code=fs.readFileSync('role-code-3d.js','utf8');
  assert(visual.includes("baseId:pick(input.baseId,BASE_IDS"));
  assert(visual.includes("lineValue(lines,'3D底座：')"));
  assert(code.includes("baseId:['baseId','base3d','3dBase','3D底座','底座']"));
  assert(code.includes('bases?.materialize?.(requested,appearance)'));
  assert(!code.includes('heightCm:item?.heightCm'));
  assert(!code.includes('body:item?.body'));
  assert(!code.includes('face:item?.face'));
});

test('production loads base registry before visual recipe and ships it to Cloudflare',()=>{
  const config=fs.readFileSync('config/app.js','utf8');
  const build=fs.readFileSync('scripts/build-cloudflare.mjs','utf8');
  assert(config.indexOf("'role-3d-bases.js'")<config.indexOf("'role-visual-recipe.js'"));
  assert(build.includes("'role-3d-bases.js'"));
});
