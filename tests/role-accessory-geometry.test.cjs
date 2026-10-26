const test=require('node:test');
const assert=require('node:assert/strict');
const visual=require('../role-visual-recipe.js');
const unified=require('../role-unified-human-recipe.js');
const accessory=require('../role-accessory-geometry.js');

test('accessory choice survives visual recipe sanitization and personality parsing',()=>{
  const direct=visual.sanitize({accessory:'细框眼镜'});
  assert.equal(direct.accessory,'细框眼镜');
  const text='【角色自定义设定】\n身份：女，26岁。\n外形：身高168cm，体重110斤，匀称，鹅蛋脸，自然肤色，大波浪，成熟优雅。\n饰品：细项链。\n动作：自然站立。\n表情：自然。\n语音：自然。\n初始关系：普通朋友。\n【自定义设定结束】';
  assert.equal(visual.fromPersonality(text).accessory,'细项链');
  assert.equal(visual.sanitize({accessory:'不存在'}).accessory,'无');
});

test('unified recipe maps creator accessory labels to render ids',()=>{
  assert.equal(unified.mapRecipe({accessory:'无'}).accessory,'none');
  assert.equal(unified.mapRecipe({accessory:'细框眼镜'}).accessory,'glasses');
  assert.equal(unified.mapRecipe({accessory:'小耳环'}).accessory,'earrings');
  assert.equal(unified.mapRecipe({accessory:'细项链'}).accessory,'necklace');
  assert.equal(unified.mapRecipe({accessory:'眼镜+耳环'}).accessory,'glasses-earrings');
});

test('accessories are real Three.js meshes attached to head or neck bones',async()=>{
  const THREE=await import('three');
  const root=new THREE.Group();
  const neck=new THREE.Bone();neck.name='neck_01';
  const head=new THREE.Bone();head.name='head';
  neck.add(head);root.add(neck);

  for(const id of ['glasses','earrings','glasses-earrings']){
    const group=accessory.attach(root,THREE,id);
    assert.ok(group,`${id} should attach`);
    assert.equal(group.parent,head,`${id} should follow head bone`);
    let meshes=0;
    group.traverse(node=>{if(node.isMesh){meshes++;assert.equal(node.geometry?.isBufferGeometry,true);}});
    assert.ok(meshes>=2,`${id} should contain renderable geometry`);
  }

  const necklace=accessory.attach(root,THREE,'necklace');
  assert.ok(necklace);
  assert.equal(necklace.parent,neck);
  let necklaceMeshes=0;necklace.traverse(node=>{if(node.isMesh)necklaceMeshes++;});
  assert.ok(necklaceMeshes>=2);
  assert.equal(accessory.attach(root,THREE,'none'),null);
});

test('glasses fit the rendered eye geometry in model space even when the head bone has a different local frame',async()=>{
  const THREE=await import('three'),root=new THREE.Group(),head=new THREE.Bone();head.name='head';head.position.set(0,1.4,0);head.rotation.x=.35;root.add(head);
  const eyes=new THREE.Mesh(new THREE.BoxGeometry(.09,.025,.03),new THREE.MeshStandardMaterial());eyes.material.name='Eye';eyes.position.set(0,1.55,.07);root.add(eyes);root.updateMatrixWorld(true);
  const group=accessory.attach(root,THREE,'glasses');root.updateMatrixWorld(true);
  const frame=group.getObjectByName('Accessory_Glasses'),box=new THREE.Box3().setFromObject(frame),center=box.getCenter(new THREE.Vector3());
  assert.equal(group.parent,head);assert.ok(Math.abs(center.y-1.55)<.005);
  assert.ok(box.max.x-box.min.x<.16);assert.ok(box.max.x-box.min.x>.1);
  assert.ok(frame.getObjectByName('Glasses_Bridge').getWorldPosition(new THREE.Vector3()).z>.085);
});
