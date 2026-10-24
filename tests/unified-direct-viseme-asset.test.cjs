const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const REQUIRED_MESHES=['body','teeth','tongue'];
const DIRECT_TARGETS=['viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk','viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U'];

test('production unified GLB keeps native direct visemes on Body Teeth and Tongue',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const file=fs.readFileSync('assets/humans/unified/base_body.glb');
  const {json}=parseGlb(file);
  const meshes=Array.isArray(json.meshes)?json.meshes:[];
  for(const required of REQUIRED_MESHES){
    const mesh=meshes.find(item=>String(item?.name||'').trim().toLowerCase()===required);
    assert.ok(mesh,`production base_body.glb missing ${required} mesh`);
    const names=Array.isArray(mesh?.extras?.targetNames)?mesh.extras.targetNames:[];
    const missing=DIRECT_TARGETS.filter(name=>!names.includes(name));
    assert.deepEqual(missing,[],`${required} lost native direct visemes: ${missing.join(',')}`);
    for(const primitive of mesh.primitives||[]){
      assert.equal((primitive.targets||[]).length,names.length,`${required} targetNames/targets length mismatch`);
    }
  }
});
