const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const HAIR=['short02','bob02','long01','ponytail01','braid01','short04','bob01','afro01'];
const CLOTHING=['briefs','panties','bra','dress','jeans','tshirt','hoodie','jacket','skirt','shorts','shoes'];
const HAIR_BASE=Object.freeze([0.08747,0.04631,0.02597,1]);
const NORMAL_CLOTHING=Object.freeze({jeans:'cloth_jeans_normal',tshirt:'cloth_tshirt_normal',jacket:'cloth_jacket_normal',skirt:'cloth_skirt_normal',shoes:'cloth_shoes_normal'});
const close=(a,b,tolerance=.001)=>Math.abs(Number(a)-Number(b))<=tolerance;

function imageName(json,info){const texture=json.textures?.[info?.index];const image=texture&&json.images?.[texture.source];return String(image?.name||image?.uri||'');}
function materials(json){return (json.materials||[]).map((material,index)=>({material,index,pbr:material.pbrMetallicRoughness||{}}));}

test('all eight production hair modules share the same calibrated PBR base contract',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  for(const id of HAIR){
    const {json}=parseGlb(fs.readFileSync(`assets/humans/unified/hair_${id}.glb`));
    const rows=materials(json);assert.equal(rows.length,1,`${id} hair should keep one tintable material`);
    const {material,pbr}=rows[0];
    assert.equal(material.name,`Hair_${id}`);
    assert.equal(imageName(json,pbr.baseColorTexture),`hair_${id}`);
    assert.equal(imageName(json,material.normalTexture),'');
    assert.equal(pbr.metallicFactor,0);
    assert.ok(close(pbr.roughnessFactor,.62),`${id} hair roughness drifted`);
    assert.equal(material.alphaMode,'MASK');
    assert.equal(material.doubleSided,true);
    assert.equal(pbr.baseColorFactor.length,4);
    HAIR_BASE.forEach((value,index)=>assert.ok(close(pbr.baseColorFactor[index],value),`${id} hair baseColorFactor[${index}] drifted`));
  }
});

test('all production clothing modules preserve albedo textures and physically non-metallic cloth shading',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  for(const id of CLOTHING){
    const {json}=parseGlb(fs.readFileSync(`assets/humans/unified/clothing_${id}.glb`));
    const rows=materials(json);assert.ok(rows.length>0,`${id} clothing has no material`);
    for(const {material,pbr} of rows){
      assert.ok(imageName(json,pbr.baseColorTexture),`${id}/${material.name||'material'} lost albedo texture`);
      assert.equal(pbr.metallicFactor,0,`${id}/${material.name||'material'} must remain non-metallic`);
      assert.ok(Number(pbr.roughnessFactor)>=.5&&Number(pbr.roughnessFactor)<=.95,`${id}/${material.name||'material'} roughness is outside cloth range`);
      assert.equal(material.alphaMode||'OPAQUE','OPAQUE');
      assert.equal(material.doubleSided,true);
    }
    const expectedNormal=NORMAL_CLOTHING[id];
    if(expectedNormal){
      assert.ok(rows.some(({material})=>imageName(json,material.normalTexture)===expectedNormal),`${id} lost expected normal map ${expectedNormal}`);
    }
  }
});

test('clothing author base factors remain garment-specific so no single global clothing calibration may replace them',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const signatures=new Set();
  for(const id of CLOTHING){
    const {json}=parseGlb(fs.readFileSync(`assets/humans/unified/clothing_${id}.glb`));
    for(const {pbr} of materials(json))signatures.add(JSON.stringify((pbr.baseColorFactor||[]).map(value=>Number(value).toFixed(5))));
  }
  assert.ok(signatures.size>=8,'production clothing must keep distinct author base-color multipliers');
});
