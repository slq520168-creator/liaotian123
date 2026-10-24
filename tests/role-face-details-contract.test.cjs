const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const visual=require('../role-visual-recipe.js');
const mapper=require('../role-unified-human-recipe.js');
const preview=require('../role-creator-3d-preview.js');

const NEW_DETAILS=Object.freeze({
  noseLength:Object.freeze(['face_nose_length_decr','face_nose_length_incr']),
  jawWidth:Object.freeze(['face_jaw_width_decr','face_jaw_width_incr']),
  earSize:Object.freeze(['face_ear_size_decr','face_ear_size_incr']),
  forehead:Object.freeze(['face_forehead_decr','face_forehead_incr'])
});
const HAIR_IDS=Object.freeze(['short02','bob02','long01','ponytail01','braid01','short04','bob01','afro01']);
const HAIR_FIT_TARGETS=Object.freeze(['face_ear_size_decr','face_ear_size_incr','face_forehead_decr','face_forehead_incr']);

function allTargetNames(json){
  const names=new Set();
  for(const mesh of json?.meshes||[]){
    const targetNames=Array.isArray(mesh?.extras?.targetNames)?mesh.extras.targetNames:[];
    for(const name of targetNames)names.add(name);
    for(const primitive of mesh?.primitives||[])if(targetNames.length)assert.equal((primitive.targets||[]).length,targetNames.length,`${mesh?.name||'mesh'} targetNames/targets length mismatch`);
  }
  return names;
}

test('visual recipe exposes and round-trips the four additional production face controls',()=>{
  assert.equal(visual.FACE_DETAILS.noseLength,'鼻长');
  assert.equal(visual.FACE_DETAILS.jawWidth,'下颌宽度');
  assert.equal(visual.FACE_DETAILS.earSize,'耳朵大小');
  assert.equal(visual.FACE_DETAILS.forehead,'额头高度');
  const text='【角色自定义设定】\n身份：女，30岁。\n外形：身高165cm，体重110斤，匀称，自然耐看，自然肤色，自然长发，日常休闲。\n脸部细节：鼻长-40，下颌宽度+50，耳朵大小-30，额头高度+60。\n性格：自然。\n初始关系：普通朋友。\n聊天方式：短句自然。\n【自定义设定结束】';
  const parsed=visual.fromPersonality(text);
  assert.equal(parsed.faceDetails.noseLength,-40);
  assert.equal(parsed.faceDetails.jawWidth,50);
  assert.equal(parsed.faceDetails.earSize,-30);
  assert.equal(parsed.faceDetails.forehead,60);
});

test('new face controls map to exact real morphs and override conflicting face preset weights',()=>{
  const mapped=mapper.mapRecipe({face:'方脸',faceDetails:{noseLength:-40,jawWidth:-40,earSize:30,forehead:60}});
  assert.equal(mapped.morphs.face_nose_length_decr,.26);
  assert.equal(mapped.morphs.face_nose_length_incr,undefined);
  assert.equal(mapped.morphs.face_jaw_width_decr,.26);
  assert.equal(mapped.morphs.face_jaw_width_incr,undefined,'fine jaw control must replace the square-face preset jaw expansion');
  assert.equal(mapped.morphs.face_ear_size_incr,.195);
  assert.equal(mapped.morphs.face_ear_size_decr,undefined);
  assert.equal(mapped.morphs.face_forehead_incr,.39);
  assert.equal(mapped.morphs.face_forehead_decr,undefined);
});

test('new face morph pairs exist in production base report and joint sidecar',()=>{
  const report=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-report.json','utf8'));
  const joints=JSON.parse(fs.readFileSync('assets/humans/unified/base_body.joints.json','utf8'));
  const targets=new Set(report?.diagnostics?.targetNames||[]);
  for(const pair of Object.values(NEW_DETAILS))for(const name of pair){
    assert.ok(targets.has(name),`${name} missing from production base report`);
    assert.ok(Object.hasOwn(joints?.morphs||{},name),`${name} missing from joint sidecar`);
  }
});

test('every production hair module retains ear and forehead fit morphs',async()=>{
  const {parseGlb}=await import('../scripts/human-glb-contract.mjs');
  for(const id of HAIR_IDS){
    const {json}=parseGlb(fs.readFileSync(`assets/humans/unified/hair_${id}.glb`));
    const names=allTargetNames(json);
    const missing=HAIR_FIT_TARGETS.filter(name=>!names.has(name));
    assert.deepEqual(missing,[],`${id} hair lost face-fit targets: ${missing.join(',')}`);
  }
});

test('additional face edits remain incremental in creator realtime preview',()=>{
  const base=mapper.mapRecipe({face:'自然耐看',faceDetails:{noseLength:0,jawWidth:0,earSize:0,forehead:0},hair:'马尾',outfit:'日常休闲'});
  const changed=mapper.mapRecipe({face:'自然耐看',faceDetails:{noseLength:40,jawWidth:-35,earSize:25,forehead:-30},hair:'马尾',outfit:'日常休闲'});
  assert.equal(preview.structuralSignature(changed),preview.structuralSignature(base));
  assert.notEqual(preview.morphSignature(changed),preview.morphSignature(base));
});

test('creator face slider UI derives controls from the single FACE_DETAILS authority',()=>{
  const source=fs.readFileSync('role-creator-studio.js','utf8');
  assert(source.includes('faceDetailLabels=recipeApi?.FACE_DETAILS'));
  assert(source.includes('Object.entries(faceDetailLabels)'));
  for(const key of Object.keys(NEW_DETAILS))assert.ok(Object.hasOwn(mapper.FACE_DETAIL_MORPHS,key),`${key} mapping missing`);
});
