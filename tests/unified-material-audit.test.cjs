const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const baseRecipe=require('../role-unified-human-recipe.js');
const calibration=require('../role-skin-pbr-calibration.js');

const EXPECTED_SKIN_BASE=Object.freeze([0.94206,0.5212,0.34816,1]);
const EXPECTED_HAIR_BASE=Object.freeze([0.08747,0.04631,0.02597,1]);
const close=(a,b,tolerance=.006)=>Math.abs(Number(a)-Number(b))<=tolerance;

function srgbChannelToLinear(value){const x=Math.max(0,Math.min(1,Number(value)||0));return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}
function hexToLinear(hex){const raw=String(hex||'').replace('#','');assert.match(raw,/^[0-9a-f]{6}$/i);return [0,2,4].map(i=>srgbChannelToLinear(parseInt(raw.slice(i,i+2),16)/255));}
function materialForNode(json,nodeName){
  const node=(json.nodes||[]).find(item=>String(item?.name||'')===nodeName);assert.ok(node,`missing ${nodeName} node`);
  const mesh=json.meshes?.[node.mesh];assert.ok(mesh,`${nodeName} missing mesh binding`);
  return (mesh.primitives||[]).map(primitive=>json.materials?.[primitive.material]).filter(Boolean);
}
function imageNameForTexture(json,textureInfo){
  const index=textureInfo?.index;if(!Number.isInteger(index))return'';
  const texture=json.textures?.[index];if(!texture)return'';
  const image=json.images?.[texture.source];return String(image?.name||image?.uri||'');
}

test('production Skin PBR contract keeps author albedo normal map and physically plausible roughness',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const {json}=parseGlb(fs.readFileSync('assets/humans/unified/base_body.glb'));
  const skin=materialForNode(json,'Body').find(material=>material?.name==='Skin');
  assert.ok(skin,'Body must bind the Skin material');
  const pbr=skin.pbrMetallicRoughness||{};
  assert.equal(imageNameForTexture(json,pbr.baseColorTexture),'skin_albedo');
  assert.equal(imageNameForTexture(json,skin.normalTexture),'skin_normal');
  assert.equal(pbr.metallicFactor,0);
  assert.ok(close(pbr.roughnessFactor,.52,.001));
  assert.equal(pbr.baseColorFactor.length,4);
  EXPECTED_SKIN_BASE.forEach((value,index)=>assert.ok(close(pbr.baseColorFactor[index],value,.001),`Skin baseColorFactor[${index}] drifted`));
});

test('eye PBR contract keeps Eye Iris and transparent Cornea as separate materials',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  const {json}=parseGlb(fs.readFileSync('assets/humans/unified/base_body.glb'));
  const materials=materialForNode(json,'Eyes');
  const eye=materials.find(material=>material?.name==='Eye');
  const iris=materials.find(material=>material?.name==='Iris');
  const cornea=materials.find(material=>material?.name==='Cornea');
  assert.ok(eye&&iris&&cornea,'Eyes must keep separate Eye/Iris/Cornea materials');
  assert.equal(imageNameForTexture(json,eye.pbrMetallicRoughness?.baseColorTexture),'eye');
  assert.equal(imageNameForTexture(json,iris.pbrMetallicRoughness?.baseColorTexture),'eye');
  assert.equal(cornea.alphaMode,'BLEND');
  assert.ok(Number(cornea.pbrMetallicRoughness?.roughnessFactor)<.08);
});

test('calibrated natural skin tint reproduces the author Skin base factor instead of darkening it',()=>{
  const natural=hexToLinear(calibration.CALIBRATED_SKIN_TINTS['自然肤色']);
  EXPECTED_SKIN_BASE.slice(0,3).forEach((value,index)=>assert.ok(close(natural[index],value,.006),`natural skin channel ${index} is not anchored to production Skin`));
  const legacy=hexToLinear('#d7a17f');
  assert.ok(legacy[0]<EXPECTED_SKIN_BASE[0]-.2&&legacy[1]<EXPECTED_SKIN_BASE[1]-.1,'legacy natural tint must remain detectably darker than author Skin');
});

test('skin palette preserves relative tone ordering while staying valid PBR color multipliers',()=>{
  const pale=hexToLinear(calibration.CALIBRATED_SKIN_TINTS['偏白']);
  const natural=hexToLinear(calibration.CALIBRATED_SKIN_TINTS['自然肤色']);
  const wheat=hexToLinear(calibration.CALIBRATED_SKIN_TINTS['小麦肤色']);
  const deep=hexToLinear(calibration.CALIBRATED_SKIN_TINTS['深肤色']);
  for(let i=0;i<3;i++){
    assert.ok(pale[i]>=natural[i]);
    assert.ok(natural[i]>=wheat[i]);
    assert.ok(wheat[i]>=deep[i]);
    for(const value of [pale[i],natural[i],wheat[i],deep[i]])assert.ok(value>=0&&value<=1);
  }
});

test('calibrated natural hair tint reproduces the common production hair base factor',()=>{
  const natural=hexToLinear(calibration.CALIBRATED_HAIR_TINTS['自然黑']);
  EXPECTED_HAIR_BASE.slice(0,3).forEach((value,index)=>assert.ok(close(natural[index],value,.004),`natural hair channel ${index} is not anchored to production hair`));
  const legacy=hexToLinear('#20191b');
  assert.ok(legacy[0]<EXPECTED_HAIR_BASE[0]-.05&&legacy[1]<EXPECTED_HAIR_BASE[1]-.025,'legacy natural black must remain detectably darker than the author hair base');
});

test('calibrated hair palette keeps eleven distinct authored choices and valid PBR multipliers',()=>{
  assert.deepEqual(calibration.CALIBRATED_HAIR_TINTS,{
    '自然黑':'#533d2d','深棕':'#6d4437','栗棕':'#9d5a43','红棕':'#ae4f40','金棕':'#cd8e4f','银灰':'#bfbcc4','红色':'#bb3451','金色':'#e1bb68','绿色':'#458460','蓝色':'#426cb5','紫色':'#8d5bb4'
  });
  const values=Object.values(calibration.CALIBRATED_HAIR_TINTS);
  assert.equal(new Set(values).size,11);
  for(const hex of values)for(const channel of hexToLinear(hex))assert.ok(channel>=0&&channel<=1);
});

test('recipe calibration wraps one unified recipe without changing morph clothing or accessory decisions',()=>{
  const api=calibration.wrapRecipeApi(baseRecipe);
  const input={gender:'female',age:32,body:'丰满',face:'鹅蛋脸',skin:'小麦肤色',hair:'马尾',hairColor:'栗棕',outfit:'成熟优雅',accessory:'小耳环'};
  const before=baseRecipe.mapRecipe(input),after=api.mapRecipe(input);
  assert.equal(after.skinTint,'#d6936c');
  assert.equal(after.hairTint,'#9d5a43');
  assert.deepEqual(after.morphs,before.morphs);
  assert.deepEqual(after.clothing,before.clothing);
  assert.equal(after.hair,before.hair);
  assert.equal(after.accessory,before.accessory);
  assert.equal(api.mapRecipe({...input,skin:'自然肤色',hairColor:'自然黑'}).skinTint,'#f8bf9f');
  assert.equal(api.mapRecipe({...input,skin:'自然肤色',hairColor:'自然黑'}).hairTint,'#533d2d');
});
