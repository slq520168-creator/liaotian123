const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('免费后台契约',()=>{const result=spawnSync(process.execPath,['--experimental-strip-types','scripts/test-studio-api.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);});
