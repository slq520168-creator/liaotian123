const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const visual=require('../role-visual-recipe.js');
const mapper=require('../role-unified-human-recipe.js');
const bodyUi=require('../role-body-details.js');
const runtime=require('../role-unified-human-runtime.js');
const preview=require('../role-creator-3d-preview.js');

function morphRoot(names){
  const dictionary=Object.fromEntries(names.map((name,index)=>[name,index]));
  const mesh={children:[],morphTargetDictionary:dictionary,morphTargetInfluences:names.map(()=>0)};
  return {children:[mesh],mesh};
}

test('body detail schema clamps and round-trips all five validated chest controls through the role personality block',()=>{
  const base='基础人设\n\n【角色自定义设定】\n身份：女，32岁。\n外形：身高168cm，体重118斤，匀称，鹅蛋脸，自然肤色，马尾，日常休闲。\n脸部细节：眼睛大小0。\n性格：自然。\n初始关系：普通朋友。\n聊天方式：短句自然。\n【自定义设定结束】';
  const text=bodyUi.upsertBodyDetails(base,{chestSize:140,chestFirmness:-35,chestHeight:25,chestSpacing:-45,chestProjection:60});
  const out=visual.fromPersonality(text);
  assert.deepEqual(out.bodyDetails,{chestSize:100,chestFirmness:-35,chestHeight:25,chestSpacing:-45,chestProjection:60});
  assert.match(text,/身体细节：胸部体积\+100，胸部紧实度-35，胸部位置\+25，胸部间距-45，胸部突出度\+60。/);
  assert.deepEqual(visual.sanitize({bodyDetails:{chestSize:-999,chestFirmness:999,chestHeight:-150,chestSpacing:130,chestProjection:-101}}).bodyDetails,{chestSize:-100,chestFirmness:100,chestHeight:-100,chestSpacing:100,chestProjection:-100});
});

test('real chest sliders map to exclusive breast and bdet morphs while only validated breast correctives are emitted',()=>{
  const out=mapper.mapRecipe({gender:'female',age:40,heightCm:168,weightJin:118,body:'匀称',bodyDetails:{chestSize:80,chestFirmness:-50,chestHeight:-40,chestSpacing:70,chestProjection:-30}});
  assert.equal(out.morphs.breast_cup_max,.52);
  assert.equal(out.morphs.breast_cup_min,undefined);
  assert.equal(out.morphs.breast_firm_min,.325);
  assert.equal(out.morphs.breast_firm_max,undefined);
  assert.equal(out.morphs.bdet_breast_height_decr,.26);
  assert.equal(out.morphs.bdet_breast_height_incr,undefined);
  assert.equal(out.morphs.bdet_breast_dist_incr,.455);
  assert.equal(out.morphs.bdet_breast_dist_decr,undefined);
  assert.equal(out.morphs.bdet_breast_point_decr,.195);
  assert.equal(out.morphs.bdet_breast_point_incr,undefined);
  assert.ok(out.morphs.corr_breast_cup_max__breast_firm_min>0);
  assert.ok(out.morphs.corr_breast_cup_max__age_old>0);
  assert.equal(out.morphs.corr_breast_cup_min__breast_firm_min,undefined);
  assert.deepEqual(Object.keys(out.morphs).filter(name=>name.startsWith('corr_bdet_')),[]);
});

test('every emitted chest morph and corrective exists in production asset and joint sidecar contracts',()=>{
  const report=JSON.parse(fs.readFileSync('assets/humans/unified/unified-human-report.json','utf8'));
  const joints=JSON.parse(fs.readFileSync('assets/humans/unified/base_body.joints.json','utf8'));
  const targets=new Set(report?.diagnostics?.targetNames||[]);
  for(const name of [...mapper.BODY_DETAIL_NAMES,...mapper.BREAST_CORRECTIVE_NAMES]){
    assert.ok(targets.has(name),`${name} missing from unified human targets`);
    assert.ok(Object.hasOwn(joints?.morphs||{},name),`${name} missing from joint sidecar`);
  }
});

test('candidate runtime applies the same chest and bdet morph weights to body and loaded clothing modules',()=>{
  const names=['breast_cup_max','breast_firm_min','bdet_breast_height_decr','bdet_breast_dist_incr','bdet_breast_point_decr','corr_breast_cup_max__breast_firm_min'];
  const base=morphRoot(names),shirt=morphRoot(names);
  const weights={breast_cup_max:.52,breast_firm_min:.325,bdet_breast_height_decr:.26,bdet_breast_dist_incr:.455,bdet_breast_point_decr:.195,corr_breast_cup_max__breast_firm_min:.169};
  const result=runtime.applyCandidateState(base,[shirt],{morphs:{}},weights);
  assert.equal(result.morphs.applied,true);
  assert.equal(result.modules[0].applied,true);
  assert.deepEqual(base.mesh.morphTargetInfluences,[.52,.325,.26,.455,.195,.169]);
  assert.deepEqual(shirt.mesh.morphTargetInfluences,[.52,.325,.26,.455,.195,.169]);
});

test('all five chest edits stay on the incremental preview path instead of changing structural modules',()=>{
  const base=mapper.mapRecipe({gender:'female',bodyDetails:{chestSize:0,chestFirmness:0,chestHeight:0,chestSpacing:0,chestProjection:0},hair:'马尾',outfit:'日常休闲'});
  const changed=mapper.mapRecipe({gender:'female',bodyDetails:{chestSize:60,chestFirmness:40,chestHeight:-30,chestSpacing:50,chestProjection:45},hair:'马尾',outfit:'日常休闲'});
  assert.equal(preview.structuralSignature(changed),preview.structuralSignature(base));
  assert.notEqual(preview.morphSignature(changed),preview.morphSignature(base));
});

test('creator exposes exactly the five production-validated chest controls and still does not invent waist hip or shoulder sliders',()=>{
  assert.deepEqual(Object.keys(bodyUi.BODY_DETAILS),['chestSize','chestFirmness','chestHeight','chestSpacing','chestProjection']);
  assert.deepEqual(Object.keys(mapper.BODY_DETAIL_MORPHS),['chestSize','chestFirmness','chestHeight','chestSpacing','chestProjection']);
  const source=fs.readFileSync('role-body-details.js','utf8');
  assert(source.includes('input.dataset.bodyDetail=key'));
  assert(source.includes('event.target?.dataset?.bodyDetail'));
  assert(source.includes('bdet_breast_height,bdet_breast_dist,bdet_breast_point'));
  assert.equal(/waist|hips|shoulder|腰部精调|臀部精调|肩部精调/i.test(source),false);
});
