(() => {
  'use strict';

  const CANDIDATE_ID = 'unified-charactercreator';
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, Number(value) || 0));
  const clamp01 = value => clamp(value, 0, 1);
  const round4 = value => Math.round(clamp01(value) * 10000) / 10000;

  const HAIR = Object.freeze({
    '自然长发': 'long01', '短发': 'short04', '大波浪': 'bob01', '卷发': 'afro01',
    '马尾': 'ponytail01', '利落中长发': 'bob02'
  });
  const OUTFITS = Object.freeze({
    '日常休闲': Object.freeze(['tshirt','jeans','shoes']), '居家': Object.freeze(['tshirt','shorts']),
    '成熟优雅': Object.freeze(['dress','shoes']), '通勤': Object.freeze(['jacket','skirt','shoes']),
    '运动': Object.freeze(['tshirt','shorts','shoes']), '甜美': Object.freeze(['dress','shoes']),
    '性感但自然': Object.freeze(['tshirt','skirt','shoes'])
  });
  const ACCESSORIES = Object.freeze({
    '无':'none','细框眼镜':'glasses','小耳环':'earrings','细项链':'necklace','眼镜+耳环':'glasses-earrings'
  });
  const SAFETY_UNDERWEAR = Object.freeze({
    male:Object.freeze(['briefs']),
    female:Object.freeze(['panties','bra']),
    unspecified:Object.freeze(['briefs'])
  });
  const SKIN_TINTS = Object.freeze({'偏白':'#f2d1bf','自然肤色':'#d7a17f','小麦肤色':'#b97b55','深肤色':'#774b36'});
  const FACE_PRESETS = Object.freeze({
    '自然耐看': Object.freeze({}),
    '圆脸': Object.freeze({face_jaw_width_incr:.20,face_chin_decr:.16,face_cheekbones_decr:.08,face_eye_size_incr:.08}),
    '鹅蛋脸': Object.freeze({face_jaw_width_decr:.18,face_chin_incr:.12,face_cheekbones_incr:.08}),
    '方脸': Object.freeze({face_jaw_width_incr:.48,face_chin_incr:.10,face_cheekbones_incr:.16}),
    '长脸': Object.freeze({face_forehead_incr:.25,face_chin_incr:.24,face_jaw_width_decr:.10}),
    '成熟脸': Object.freeze({face_jaw_width_incr:.12,face_cheekbones_incr:.26,face_eye_size_decr:.10,face_lips_decr:.08}),
    '甜美脸': Object.freeze({face_jaw_width_decr:.20,face_eye_size_incr:.26,face_lips_incr:.20,face_cheekbones_incr:.08})
  });
  const EXPRESSIONS = Object.freeze({
    '自然':Object.freeze({}),
    '微笑':Object.freeze({mouthSmileLeft:.34,mouthSmileRight:.34,cheekSquintLeft:.08,cheekSquintRight:.08}),
    '温柔':Object.freeze({mouthSmileLeft:.20,mouthSmileRight:.20,browInnerUp:.06,eyeSquintLeft:.05,eyeSquintRight:.05}),
    '认真':Object.freeze({browDownLeft:.10,browDownRight:.10,mouthPressLeft:.07,mouthPressRight:.07}),
    '俏皮':Object.freeze({mouthSmileLeft:.38,mouthDimpleLeft:.16,browOuterUpRight:.12})
  });

  const PRIMARY = Object.freeze([
    'gender_female','gender_male','age_child','age_old','weight_min','weight_max','muscle_min','muscle_max',
    'height_short','height_tall','proportions_ideal','proportions_uncommon'
  ]);
  const CORRECTIVE_PAIRS = Object.freeze([
    Object.freeze([['gender_female','gender_male'],['age_child','age_old']]),
    Object.freeze([['weight_min','weight_max'],['muscle_min','muscle_max']]),
    Object.freeze([['gender_female','gender_male'],['muscle_min','muscle_max']]),
    Object.freeze([['gender_female','gender_male'],['weight_min','weight_max']])
  ]);
  const CORRECTIVE_NAMES = Object.freeze(CORRECTIVE_PAIRS.flatMap(([a,b]) => a.flatMap(x => b.map(y => `corr_${x}__${y}`))));
  const FACE_NAMES = Object.freeze([
    'face_nose_width_decr','face_nose_width_incr','face_nose_length_decr','face_nose_length_incr',
    'face_nose_height_decr','face_nose_height_incr','face_jaw_width_decr','face_jaw_width_incr',
    'face_chin_decr','face_chin_incr','face_cheekbones_decr','face_cheekbones_incr',
    'face_eye_size_decr','face_eye_size_incr','face_eye_spacing_decr','face_eye_spacing_incr',
    'face_eye_tilt_decr','face_eye_tilt_incr','face_lips_decr','face_lips_incr',
    'face_mouth_width_decr','face_mouth_width_incr','face_ear_size_decr','face_ear_size_incr',
    'face_forehead_decr','face_forehead_incr'
  ]);
  const EXPRESSION_NAMES = Object.freeze([
    'browDownLeft','browDownRight','browInnerUp','browOuterUpLeft','browOuterUpRight',
    'cheekSquintLeft','cheekSquintRight','eyeSquintLeft','eyeSquintRight',
    'mouthSmileLeft','mouthSmileRight','mouthDimpleLeft','mouthDimpleRight','mouthPressLeft','mouthPressRight'
  ]);
  const ALLOWED_MORPHS = Object.freeze(new Set([...PRIMARY,...CORRECTIVE_NAMES,...FACE_NAMES,...EXPRESSION_NAMES]));

  function add(out, name, value) {
    if (!ALLOWED_MORPHS.has(name)) throw new Error(`unsupported unified-human morph: ${name}`);
    const weight = round4(value);
    if (weight > 0) out[name] = weight;
  }
  function bmi(recipe) {
    const meters=(Number(recipe?.heightCm)||165)/100, kg=(Number(recipe?.weightJin)||110)/2;
    return meters>0?kg/(meters*meters):0;
  }
  function addCorrectives(out) {
    for (const [left,right] of CORRECTIVE_PAIRS) {
      for (const a of left) for (const b of right) {
        const weight=(out[a]||0)*(out[b]||0);
        if (weight>0) add(out,`corr_${a}__${b}`,weight);
      }
    }
    return out;
  }
  function identityMorphs(recipe={}) {
    const out={};
    if(recipe.gender==='female') add(out,'gender_female',1);
    if(recipe.gender==='male') add(out,'gender_male',1);

    const age=clamp(recipe.age||24,18,100);
    if(age<25) add(out,'age_child',(25-age)/14);
    if(age>25) add(out,'age_old',(age-25)/75);

    const height=clamp(recipe.heightCm||165,130,220);
    if(height<166) add(out,'height_short',(166-height)/36);
    if(height>166) add(out,'height_tall',((height-166)/71)*.45);

    const valueBmi=bmi(recipe);
    if(valueBmi&&valueBmi<20) add(out,'weight_min',(20-valueBmi)/6);
    if(valueBmi>23) add(out,'weight_max',(valueBmi-23)/14);
    switch(recipe.body){
      case '偏瘦': add(out,'weight_min',Math.max(out.weight_min||0,.52)); break;
      case '微胖': add(out,'weight_max',Math.max(out.weight_max||0,.28)); break;
      case '丰满': add(out,'weight_max',Math.max(out.weight_max||0,.32)); add(out,'proportions_ideal',.18); break;
      case '胖': add(out,'weight_max',Math.max(out.weight_max||0,.68)); break;
      case '健壮': add(out,'muscle_max',.72); add(out,'proportions_ideal',.30); break;
      default: add(out,'proportions_ideal',.12); break;
    }
    const face=FACE_PRESETS[recipe.face]||FACE_PRESETS['自然耐看'];
    for(const [name,weight] of Object.entries(face)) add(out,name,weight);
    addCorrectives(out);
    return Object.freeze(out);
  }
  function expressionMorphs(choice){
    const source=EXPRESSIONS[choice]||EXPRESSIONS['自然'], out={};
    for(const [name,weight] of Object.entries(source)) add(out,name,weight);
    return Object.freeze(out);
  }
  function clothingFor(recipe={}){
    const gender=['male','female'].includes(recipe.gender)?recipe.gender:'unspecified';
    const safety=SAFETY_UNDERWEAR[gender]||SAFETY_UNDERWEAR.unspecified;
    const outfit=OUTFITS[recipe.outfit]||OUTFITS['日常休闲'];
    return Object.freeze([...new Set([...safety,...outfit])]);
  }
  function mapRecipe(recipe={}){
    return Object.freeze({
      schema:2,candidateId:CANDIDATE_ID,morphs:identityMorphs(recipe),
      hair:HAIR[recipe.hair]||HAIR['自然长发'],
      clothing:clothingFor(recipe),
      accessory:ACCESSORIES[recipe.accessory]||ACCESSORIES['无'],
      skinTint:SKIN_TINTS[recipe.skin]||SKIN_TINTS['自然肤色'],
      expressionMorphs:expressionMorphs(recipe.expression), action:recipe.action||'自然站立',voiceStyle:recipe.voiceStyle||'自然'
    });
  }

  const api=Object.freeze({CANDIDATE_ID,HAIR,OUTFITS,ACCESSORIES,SAFETY_UNDERWEAR,SKIN_TINTS,FACE_PRESETS,EXPRESSIONS,PRIMARY,CORRECTIVE_PAIRS,CORRECTIVE_NAMES,ALLOWED_MORPHS,bmi,addCorrectives,identityMorphs,expressionMorphs,clothingFor,mapRecipe});
  if(typeof window!=='undefined') window.RoleUnifiedHumanRecipe=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
