const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const validator=require('../scripts/validate-unified-human-candidate.cjs');

test('unified candidate contract includes mandatory safety underwear modules',()=>{
  assert.deepEqual(validator.SAFETY_UNDERWEAR,['briefs','panties','bra']);
  for(const id of validator.SAFETY_UNDERWEAR) assert(validator.CLOTHING.includes(id));
});

test('mobile QA loads a fully clothed outfit, proves pixels are visible, and cache-busts the latest runtime',()=>{
  const qa=fs.readFileSync('docs/unified-mobile-qa.mjs','utf8');
  const html=fs.readFileSync('docs/unified-mobile-qa.html','utf8');
  for(const token of [
    "requiredModule(manifest.modules?.clothing,'briefs','安全内衣')",
    "requiredModule(manifest.modules?.clothing,'tshirt','贴身上装')",
    "requiredModule(manifest.modules?.clothing,'hoodie','完整上装')",
    "requiredModule(manifest.modules?.clothing,'jeans','完整下装')",
    "requiredModule(manifest.modules?.clothing,'shoes','鞋')"
  ]) assert(qa.includes(token));
  assert(qa.includes('const visibleOutfit=outfitScenes.map'));
  assert(qa.includes('function proveVisibleOutfit'));
  assert(qa.includes('function pixelDifference'));
  assert(qa.includes('visualProof'));
  assert(qa.includes('服装没有真实出现在画面中'));
  assert(qa.includes('安全内衣没有真实遮住身体'));
  assert(html.includes('实际像素可见性验证'));
  assert(html.includes('unified-mobile-qa.mjs?v=20261025-qa6'));
});

test('unified runtime lifts clothing surfaces instead of allowing the body to swallow them',()=>{
  const runtime=fs.readFileSync('role-unified-human-runtime.js','utf8');
  assert(runtime.includes('function prepareModuleSurface'));
  assert(runtime.includes("const isClothing=!requiredMorphs.some(name=>/^face_/.test"));
  assert(runtime.includes('const surface=isClothing?prepareModuleSurface(moduleRoot):null'));
  assert(runtime.includes("position.setXYZ(i,position.getX(i)+normal.getX(i)*distance"));
  assert(runtime.includes('material.polygonOffsetFactor=bias'));
});
