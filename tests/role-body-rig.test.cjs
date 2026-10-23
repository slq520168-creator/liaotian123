const test=require('node:test');
const assert=require('node:assert/strict');
const rig=require('../role-body-rig.js');

test('parses physical builder spec',()=>{
  const text='x\n【角色自定义设定】\n外形：身高180cm，体重160斤，丰满，圆脸，自然肤色，大波浪，成熟优雅。\n【自定义设定结束】';
  const out=rig.parseRolePhysicalSpec(text);
  assert.equal(out.heightCm,180); assert.equal(out.weightJin,160); assert.equal(out.body,'丰满'); assert.equal(out.face,'圆脸');
});

test('BMI uses jin to kg conversion',()=>{
  const bmi=rig.bmiFromSpec({heightCm:180,weightJin:160});
  assert.ok(Math.abs(bmi-24.691)<0.01);
});

test('tall full figure generates real geometry channels',()=>{
  const w=rig.shapeWeights({heightCm:180,weightJin:160,body:'丰满'});
  assert.ok(w.heightTall>0); assert.ok(w.bodyHeavy>0); assert.equal(w.chestFull,.48); assert.equal(w.hipsWide,.38);
});

test('muscular does not fake obesity',()=>{
  const w=rig.shapeWeights({heightCm:185,weightJin:170,body:'健壮'});
  assert.equal(w.bodyMuscular,.72); assert.equal(w.shouldersWide,.42); assert.ok(w.bodyHeavy<=.26);
});

test('maps aliases to morph indices',()=>{
  const idx=rig.buildBodyMorphIndex({'Body_Fat':3,'long-legs':4,'BroadShoulders':5,'statureTall':6});
  assert.equal(idx.bodyHeavy,3); assert.equal(idx.legsLong,4); assert.equal(idx.shouldersWide,5); assert.equal(idx.heightTall,6);
});

test('applies only actual morph targets',()=>{
  const mesh={morphTargetDictionary:{bodyFat:0,bodySlim:1},morphTargetInfluences:[0,0]};
  const ok=rig.applyBodyWeights(mesh,{bodyHeavy:.7,bodyThin:.2});
  assert.equal(ok,true); assert.equal(mesh.morphTargetInfluences[0],.7); assert.equal(mesh.morphTargetInfluences[1],.2);
});

test('finds body mesh with highest supported coverage',()=>{
  const a={morphTargetDictionary:{bodyFat:0},morphTargetInfluences:[0],children:[]};
  const b={morphTargetDictionary:{bodyFat:0,bodySlim:1,longLegs:2},morphTargetInfluences:[0,0,0],children:[]};
  const out=rig.findBestBodyMesh({children:[a,{children:[b]}]});
  assert.equal(out.mesh,b); assert.equal(out.score,3);
});

test('adapter returns false instead of scaling whole model when morphs are absent',()=>{
  const adapter=new rig.BodyRigAdapter({morphTargetDictionary:{},morphTargetInfluences:[]});
  assert.equal(adapter.applySpec({heightCm:190,weightJin:200,body:'胖'}),false);
});
