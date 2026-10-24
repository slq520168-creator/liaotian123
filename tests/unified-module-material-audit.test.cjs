const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const HAIR=['short02','bob02','long01','ponytail01','braid01','short04','bob01','afro01'];
const CLOTHING=['briefs','panties','bra','dress','jeans','tshirt','hoodie','jacket','skirt','shorts','shoes'];

function imageName(json,info){const texture=json.textures?.[info?.index];const image=texture&&json.images?.[texture.source];return String(image?.name||image?.uri||'');}
function summarize(json){
  return (json.materials||[]).map((material,index)=>{
    const pbr=material.pbrMetallicRoughness||{};
    return{
      index,
      name:material.name||'',
      base:Array.isArray(pbr.baseColorFactor)?pbr.baseColorFactor:null,
      baseTex:imageName(json,pbr.baseColorTexture),
      normal:imageName(json,material.normalTexture),
      rough:Number.isFinite(pbr.roughnessFactor)?pbr.roughnessFactor:null,
      metal:Number.isFinite(pbr.metallicFactor)?pbr.metallicFactor:null,
      alpha:material.alphaMode||'OPAQUE',
      doubleSided:material.doubleSided===true
    };
  });
}

test('audit production hair and clothing PBR contracts before tint calibration changes',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const rows=[];
  for(const id of HAIR){
    const {json}=parseGlb(fs.readFileSync(`assets/humans/unified/hair_${id}.glb`));
    assert.ok((json.materials||[]).length>0,`${id} hair has no material`);
    rows.push({kind:'hair',id,materials:summarize(json)});
  }
  for(const id of CLOTHING){
    const {json}=parseGlb(fs.readFileSync(`assets/humans/unified/clothing_${id}.glb`));
    assert.ok((json.materials||[]).length>0,`${id} clothing has no material`);
    rows.push({kind:'clothing',id,materials:summarize(json)});
  }
  console.log('MODULE_MATERIAL_AUDIT '+JSON.stringify(rows));
});
