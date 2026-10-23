const test=require('node:test');
const assert=require('node:assert/strict');
const custom=require('../role-unified-custom-chat.js');
const face=require('../role-face-rig.js');

function morphMesh(name){
  const names=['jawOpen','tongueOut','eyeBlinkLeft','eyeBlinkRight','mouthSmileLeft','mouthSmileRight'];
  return {name,children:[],morphTargetDictionary:Object.fromEntries(names.map((n,i)=>[n,i])),morphTargetInfluences:names.map(()=>.75)};
}
function root(children){return {children};}

test('composite face rig controls every morph-bearing base mesh together',()=>{
  const body=morphMesh('Body'),teeth=morphMesh('Teeth'),tongue=morphMesh('Tongue');
  const head={rotation:{x:.1,y:.2,z:.3}};
  const rig=custom.createCompositeFaceRig(root([body,teeth,tongue]),head,face);
  assert.ok(rig);assert.equal(rig.meshes.length,3);
  rig.reset();
  for(const mesh of [body,teeth,tongue]) assert.deepEqual(mesh.morphTargetInfluences,[0,0,0,0,0,0]);
  rig.render({visemes:{TH:1},blink:.4,gazeX:0,gazeY:0,headPitch:0,headYaw:0});
  for(const mesh of [body,teeth,tongue]){assert.ok(mesh.morphTargetInfluences[0]>0);assert.ok(mesh.morphTargetInfluences[1]>0);assert.equal(mesh.morphTargetInfluences[2],.4);assert.equal(mesh.morphTargetInfluences[3],.4);}
});

test('composite face reset restores closed mouth and original head rotation',()=>{
  const body=morphMesh('Body'),tongue=morphMesh('Tongue');
  const head={rotation:{x:.11,y:-.07,z:.03}};
  const rig=custom.createCompositeFaceRig(root([body,tongue]),head,face);
  rig.render({visemes:{aa:1},headPitch:.3,headYaw:-.2});
  assert.notEqual(head.rotation.x,.11);assert.ok(body.morphTargetInfluences[0]>0);
  rig.reset();
  assert.deepEqual(body.morphTargetInfluences,[0,0,0,0,0,0]);
  assert.deepEqual(tongue.morphTargetInfluences,[0,0,0,0,0,0]);
  assert.equal(head.rotation.x,.11);assert.equal(head.rotation.y,-.07);assert.equal(head.rotation.z,.03);
});

test('legacy rigs are reset and detached before unified candidate state is applied',()=>{
  let body=0,proportion=0,appearance=0;
  const renderer={bodyRig:{reset(){body++;}},proportionRig:{reset(){proportion++;}},appearanceRig:{reset(){appearance++;}},proportionResult:{bad:true},appearanceResult:{bad:true}};
  custom.resetLegacyRigs(renderer);
  assert.equal(body,1);assert.equal(proportion,1);assert.equal(appearance,1);
  assert.equal(renderer.bodyRig,null);assert.equal(renderer.proportionRig,null);assert.equal(renderer.appearanceRig,null);assert.equal(renderer.proportionResult,null);assert.equal(renderer.appearanceResult,null);
});
