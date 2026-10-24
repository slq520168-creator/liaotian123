const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const visual=require('../role-visual-recipe.js');
const unified=require('../role-unified-human-recipe.js');

const DETAIL_KEYS=['eyeSize','eyeSpacing','eyeTilt','noseBridge','noseWidth','noseLength','lips','mouthWidth','jawWidth','chin','cheekbones','earSize','forehead'];

test('face detail sliders sanitize and survive personality round-trip',()=>{
  const details={eyeSize:140,eyeSpacing:-35,eyeTilt:20,noseBridge:55,noseWidth:-45,noseLength:40,lips:30,mouthWidth:-25,jawWidth:-50,chin:65,cheekbones:15,earSize:35,forehead:-60};
  const clean=visual.sanitize({faceDetails:details});
  assert.equal(clean.faceDetails.eyeSize,100);
  assert.equal(clean.faceDetails.eyeSpacing,-35);
  assert.equal(clean.faceDetails.noseLength,40);
  assert.equal(clean.faceDetails.jawWidth,-50);
  assert.equal(clean.faceDetails.earSize,35);
  assert.equal(clean.faceDetails.forehead,-60);
  assert.deepEqual(Object.keys(clean.faceDetails),DETAIL_KEYS);
  const line=Object.entries(visual.FACE_DETAILS).map(([key,label])=>`${label}${clean.faceDetails[key]>0?'+':''}${clean.faceDetails[key]}`).join('，');
  const text=`【角色自定义设定】\n身份：女，28岁。\n外形：身高168cm，体重112斤，匀称，圆脸，自然肤色，大波浪，成熟优雅。\n脸部细节：${line}。\n饰品：小耳环。\n动作：自然站立。\n表情：自然。\n语音：自然。\n初始关系：普通朋友。\n【自定义设定结束】`;
  const parsed=visual.fromPersonality(text);
  assert.deepEqual(parsed.faceDetails,clean.faceDetails);
});

test('non-zero detail overrides the same face-preset dimension instead of driving opposite morphs together',()=>{
  const morphs=unified.identityMorphs({face:'圆脸',faceDetails:{eyeSize:-80,chin:70,noseBridge:50,jawWidth:-40,forehead:30}});
  assert.equal(morphs.face_eye_size_incr,undefined);
  assert.equal(morphs.face_eye_size_decr,.52);
  assert.equal(morphs.face_chin_decr,undefined);
  assert.equal(morphs.face_chin_incr,.455);
  assert.equal(morphs.face_nose_height_incr,.325);
  assert.equal(morphs.face_nose_height_decr,undefined);
  assert.equal(morphs.face_jaw_width_incr,undefined);
  assert.equal(morphs.face_jaw_width_decr,.26);
  assert.equal(morphs.face_forehead_incr,.195);
});

test('all thirteen creator face-detail controls map to real candidate morph pairs from the single FACE_DETAILS authority',()=>{
  const source=fs.readFileSync('role-creator-studio.js','utf8');
  assert(source.includes('脸部精调'));
  assert(source.includes('data-face-detail'));
  assert(source.includes('faceDetailLabels=recipeApi?.FACE_DETAILS'));
  assert(source.includes('Object.entries(faceDetailLabels)'));
  assert.deepEqual(Object.keys(visual.FACE_DETAILS),DETAIL_KEYS);
  for(const key of DETAIL_KEYS){
    assert.ok(unified.FACE_DETAIL_MORPHS[key],`${key} mapping missing`);
    const [decr,incr]=unified.FACE_DETAIL_MORPHS[key];
    assert.ok(unified.ALLOWED_MORPHS.has(decr),`${decr} not in candidate contract`);
    assert.ok(unified.ALLOWED_MORPHS.has(incr),`${incr} not in candidate contract`);
  }
});
