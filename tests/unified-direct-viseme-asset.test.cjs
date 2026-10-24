const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const REQUIRED_NODES=['Body','Teeth','Tongue'];
const DIRECT_TARGETS=['viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk','viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U'];

function meshForNode(json,nodeName){
  const nodes=Array.isArray(json?.nodes)?json.nodes:[],meshes=Array.isArray(json?.meshes)?json.meshes:[];
  const node=nodes.find(item=>String(item?.name||'').trim()===nodeName);
  if(!node||!Number.isInteger(node.mesh))return null;
  return {node,mesh:meshes[node.mesh]||null,meshIndex:node.mesh};
}

test('production unified GLB keeps native direct visemes on Body Teeth and Tongue runtime nodes',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const file=fs.readFileSync('assets/humans/unified/base_body.glb');
  const {json}=parseGlb(file);
  for(const nodeName of REQUIRED_NODES){
    const binding=meshForNode(json,nodeName);
    assert.ok(binding?.mesh,`production base_body.glb missing ${nodeName} node→mesh binding`);
    const names=Array.isArray(binding.mesh?.extras?.targetNames)?binding.mesh.extras.targetNames:[];
    const missing=DIRECT_TARGETS.filter(name=>!names.includes(name));
    assert.deepEqual(missing,[],`${nodeName} lost native direct visemes: ${missing.join(',')}`);
    assert.ok(names.length>=DIRECT_TARGETS.length,`${nodeName} exposes no usable morph target names`);
    for(const primitive of binding.mesh.primitives||[]){
      assert.equal((primitive.targets||[]).length,names.length,`${nodeName} targetNames/targets length mismatch`);
    }
  }
});

test('direct-viseme asset contract resolves runtime node names rather than glTF mesh definition names',()=>{
  const json={nodes:[{name:'Body',mesh:0}],meshes:[{name:'BodyMesh.001',extras:{targetNames:DIRECT_TARGETS},primitives:[{targets:DIRECT_TARGETS.map(()=>({}))}]}]};
  const binding=meshForNode(json,'Body');
  assert.equal(binding.mesh.name,'BodyMesh.001');
  assert.equal(binding.meshIndex,0);
});
