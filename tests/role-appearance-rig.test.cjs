const test=require('node:test');
const assert=require('node:assert/strict');
const rig=require('../role-appearance-rig.js');

test('face shape uses real geometry morph target and clears other shape targets',()=>{
  const mesh={morphTargetDictionary:{faceRound:0,faceSquare:1,faceSweet:2},morphTargetInfluences:[.2,.4,.6]};
  assert.equal(rig.applyFaceShape(mesh,'方脸'),true);
  assert.deepEqual(mesh.morphTargetInfluences,[0,1,0]);
});

test('missing face morph does not fake selected face shape',()=>{
  const mesh={morphTargetDictionary:{faceRound:0},morphTargetInfluences:[0]};
  assert.equal(rig.applyFaceShape(mesh,'甜美脸'),false);
  assert.deepEqual(mesh.morphTargetInfluences,[0]);
});

test('hair and outfit switch actual 3D variant nodes',()=>{
  const hairLong={name:'Hair__natural-long',visible:true,children:[]};
  const hairShort={name:'Hair__short',visible:false,children:[]};
  const casual={name:'Outfit__casual',visible:true,children:[]};
  const sport={name:'Outfit__sport',visible:false,children:[]};
  const root={children:[hairLong,hairShort,casual,sport]};
  const adapter=new rig.AppearanceRigAdapter(root,null);
  const result=adapter.applySpec({hair:'短发',outfit:'运动'});
  assert.equal(result.hair,true); assert.equal(result.outfit,true);
  assert.equal(hairLong.visible,false); assert.equal(hairShort.visible,true);
  assert.equal(casual.visible,false); assert.equal(sport.visible,true);
  adapter.reset();
  assert.equal(hairLong.visible,true); assert.equal(hairShort.visible,false);
});

test('unknown hair or outfit leaves existing geometry untouched',()=>{
  const node={name:'Hair__short',visible:true,children:[]};
  const variants=rig.collectVariants({children:[node]},'hair');
  assert.equal(rig.applyVariant(variants,'missing'),false);
  assert.equal(node.visible,true);
});

test('skin tone changes only explicitly marked PBR skin materials',()=>{
  const skin={name:'Skin',color:{r:.8,g:.7,b:.6},needsUpdate:false};
  const shirt={name:'Shirt',color:{r:.5,g:.5,b:.5},needsUpdate:false};
  const root={children:[{name:'Body',material:skin,children:[]},{name:'Top',material:shirt,children:[]}]};
  const records=rig.collectSkinMaterials(root);
  assert.equal(records.length,1);
  assert.equal(rig.applySkinTone(records,'深肤色'),true);
  assert.ok(skin.color.r<.8); assert.equal(shirt.color.r,.5);
});

test('adapter applies structured face skin hair outfit recipe without claiming missing channels',()=>{
  const face={morphTargetDictionary:{faceRound:0},morphTargetInfluences:[0],children:[]};
  const hair={name:'Hair__short',visible:true,children:[]};
  const root={children:[face,hair]};
  const adapter=new rig.AppearanceRigAdapter(root,face);
  const result=adapter.applySpec({face:'圆脸',skin:'小麦肤色',hair:'短发',outfit:'通勤'});
  assert.equal(result.face,true); assert.equal(result.hair,true);
  assert.equal(result.skin,false); assert.equal(result.outfit,false);
  assert.equal(result.applied,true);
});
