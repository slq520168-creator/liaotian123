const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const validator=require('../scripts/validate-unified-human-candidate.cjs');

test('unified candidate contract includes mandatory safety underwear modules',()=>{
  assert.deepEqual(validator.SAFETY_UNDERWEAR,['briefs','panties','bra']);
  for(const id of validator.SAFETY_UNDERWEAR) assert(validator.CLOTHING.includes(id));
});

test('mobile QA loads a complete clothed outfit and cache-busts the latest QA runtime',()=>{
  const qa=fs.readFileSync('docs/unified-mobile-qa.mjs','utf8');
  const html=fs.readFileSync('docs/unified-mobile-qa.html','utf8');
  for(const token of [
    "requiredModule(manifest.modules?.clothing,'briefs','安全内衣')",
    "requiredModule(manifest.modules?.clothing,'hoodie','完整上装')",
    "requiredModule(manifest.modules?.clothing,'jeans','完整下装')",
    "requiredModule(manifest.modules?.clothing,'shoes','鞋')"
  ]) assert(qa.includes(token));
  assert(qa.includes('const visibleOutfit=outfitScenes.map'));
  assert(html.includes('安全内衣、完整上装、完整下装和鞋'));
  assert(html.includes('unified-mobile-qa.mjs?v=20261024-qa5'));
});
