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

test('body detail schema clamps and round-trips through the role personality block',()=>{
  const base='基础人设\n\n【角色自定义设定】\n身份：女，32岁。\n外形：身高168cm，体重118斤，匀称，鹅蛋脸，自然肤色，马尾，日常休闲。\n脸部细节：眼睛大小0。\n性格：自然。\n初始关系：普通朋友。\n聊天方式：短句自然。\n【自定义设定结束】';
  const text=bodyUi.upsertBodyDetails(base,{chestSize:140,chestFirmness:-35});
  const out=visual.fromPersonality(text);
  assert.deepEqual(out.bodyDetails,{chestSize:100,chestFirmness:-35});
  assert.match(text,/身体细节：胸部体积\+100，胸部紧实度-35。/);
  assert.deepEqual(visual.sanitize({bodyDetails:{chestSize:-999,chestFirmness:999}}).bodyDetails,{chestSize:-100,chestFirmness:100});
});

test('real chest sliders map to exclusive breast morphs plus exact MakeHuman correctives',()=>{
  const out=mapper.mapRecipe({gender:'female',age:40,heightCm:168,weightJin:118,body:'匀称',bodyDetails:{chestSize:80,chestFirmness:-50}});
  assert.equal(out.morphs.breast_cup_max,.52);
  assert.equal(out.morphs.breast_cup_min,undefined);
  assert.equal(out.morphs.breast_firm_min,.325);
  assert.equal(out.morphs.breast_firm_max,undefined);
  assert.ok(out.morphs.corr_breast_cup_max__breast_firm_min>0);
  assert.ok(out.morphs.corr_breast_cup_max__age_old>0);
  assert.equal(out.morphs.corr_breast_cup_min__breast_firm_min,undefined);
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

test('candidate runtime applies the same chest morph weights to body and loaded clothing modules',()=>{
  const names=['breast_cup_max','breast_firm_min','corr_breast_cup_max__breast_firm_min'];
  const base=morphRoot(names),shirt=morphRoot(names);
  const weights={breast_cup_max:.52,breast_firm_min:.325,corr_breast_cup_max__breast_firm_min:.169};
  const result=runtime.applyCandidateState(base,[shirt],{morphs:{}},weights);
  assert.equal(result.morphs.applied,true);
  assert.equal(result.modules[0].applied,true);
  assert.deepEqual(base.mesh.morphTargetInfluences,[.52,.325,.169]);
  assert.deepEqual(shirt.mesh.morphTargetInfluences,[.52,.325,.169]);
});

test('chest edits stay on the incremental preview path instead of changing structural modules',()=>{
  const base=mapper.mapRecipe({gender:'female',bodyDetails:{chestSize:0,chestFirmness:0},hair:'马尾',outfit:'日常休闲'});
  const changed=mapper.mapRecipe({gender:'female',bodyDetails:{chestSize:60,chestFirmness:40},hair:'马尾',outfit:'日常休闲'});
  assert.equal(preview.structuralSignature(changed),preview.structuralSignature(base));
  assert.notEqual(preview.morphSignature(changed),preview.morphSignature(base));
});

test('creator exposes exactly the two validated chest controls and does not invent waist hip or shoulder morph sliders',()=>{
  assert.deepEqual(Object.keys(bodyUi.BODY_DETAILS),['chestSize','chestFirmness']);
  const source=fs.readFileSync('role-body-details.js','utf8');
  assert(source.includes('input.dataset.bodyDetail=key'));
  assert(source.includes('event.target?.dataset?.bodyDetail'));
  assert(source.includes('真实胸部 morph'));
  assert.equal(/waist|hips|shoulder|腰部精调|臀部精调|肩部精调/i.test(source),false);
});
