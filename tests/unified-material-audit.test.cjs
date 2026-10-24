const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const TARGET_NODES=Object.freeze(['Body','Eyes','Teeth','Tongue','Eyebrows','Eyelashes']);

function textureInfo(json,index){
  if(!Number.isInteger(index)||index<0)return null;
  const texture=json.textures?.[index]||null;
  const image=Number.isInteger(texture?.source)?json.images?.[texture.source]||null:null;
  return texture?{
    index,
    name:texture.name||'',
    source:Number.isInteger(texture.source)?texture.source:null,
    imageName:image?.name||'',
    mimeType:image?.mimeType||'',
    uri:image?.uri||'',
    bufferView:Number.isInteger(image?.bufferView)?image.bufferView:null
  }:null;
}

function materialInfo(json,index){
  if(!Number.isInteger(index)||index<0)return null;
  const material=json.materials?.[index];if(!material)return null;
  const pbr=material.pbrMetallicRoughness||{};
  return{
    index,
    name:material.name||'',
    baseColorFactor:Array.isArray(pbr.baseColorFactor)?pbr.baseColorFactor:null,
    baseColorTexture:textureInfo(json,pbr.baseColorTexture?.index),
    metallicFactor:Number.isFinite(pbr.metallicFactor)?pbr.metallicFactor:null,
    roughnessFactor:Number.isFinite(pbr.roughnessFactor)?pbr.roughnessFactor:null,
    metallicRoughnessTexture:textureInfo(json,pbr.metallicRoughnessTexture?.index),
    normalTexture:textureInfo(json,material.normalTexture?.index),
    occlusionTexture:textureInfo(json,material.occlusionTexture?.index),
    emissiveTexture:textureInfo(json,material.emissiveTexture?.index),
    emissiveFactor:Array.isArray(material.emissiveFactor)?material.emissiveFactor:null,
    alphaMode:material.alphaMode||'OPAQUE',
    alphaCutoff:Number.isFinite(material.alphaCutoff)?material.alphaCutoff:null,
    doubleSided:material.doubleSided===true,
    extensions:Object.keys(material.extensions||{}).sort()
  };
}

test('audit production unified-human PBR material bindings without changing runtime behavior',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const {json}=parseGlb(fs.readFileSync('assets/humans/unified/base_body.glb'));
  assert.ok(Array.isArray(json.materials)&&json.materials.length>0,'production base body must contain materials');
  assert.ok(Array.isArray(json.meshes)&&json.meshes.length>0,'production base body must contain meshes');
  const bindings=[];
  for(const targetName of TARGET_NODES){
    const nodeIndex=(json.nodes||[]).findIndex(node=>String(node?.name||'')===targetName);
    assert.ok(nodeIndex>=0,`missing ${targetName} node`);
    const node=json.nodes[nodeIndex];
    assert.ok(Number.isInteger(node.mesh)&&json.meshes?.[node.mesh],`${targetName} missing mesh binding`);
    const mesh=json.meshes[node.mesh];
    const primitiveMaterials=(mesh.primitives||[]).map((primitive,primitiveIndex)=>({
      primitiveIndex,
      material:materialInfo(json,primitive.material)
    }));
    assert.ok(primitiveMaterials.length>0,`${targetName} mesh has no primitives`);
    assert.ok(primitiveMaterials.every(row=>row.material),`${targetName} has primitive without valid material`);
    bindings.push({node:targetName,nodeIndex,meshIndex:node.mesh,meshName:mesh.name||'',primitiveMaterials});
  }
  const summary={
    materialCount:json.materials.length,
    textureCount:(json.textures||[]).length,
    imageCount:(json.images||[]).length,
    extensionsUsed:[...(json.extensionsUsed||[])].sort(),
    extensionsRequired:[...(json.extensionsRequired||[])].sort(),
    bindings
  };
  console.log('MATERIAL_AUDIT '+JSON.stringify(summary));
});
