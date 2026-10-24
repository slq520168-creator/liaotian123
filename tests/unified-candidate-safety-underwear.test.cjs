const test=require('node:test');
const assert=require('node:assert/strict');
const validator=require('../scripts/validate-unified-human-candidate.cjs');

test('unified candidate contract includes mandatory safety underwear modules',()=>{
  assert.deepEqual(validator.SAFETY_UNDERWEAR,['briefs','panties','bra']);
  for(const id of validator.SAFETY_UNDERWEAR) assert(validator.CLOTHING.includes(id));
});
