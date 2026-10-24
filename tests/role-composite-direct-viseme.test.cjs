const test=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../role-composite-direct-viseme.js');
const direct=require('../role-direct-viseme-rig.js');

const directNames={
  viseme_PP:0,viseme_FF:1,viseme_TH:2,viseme_DD:3,viseme_kk:4,viseme_CH:5,viseme_SS:6,
  viseme_nn:7,viseme_RR:8,viseme_aa:9,viseme_E:10,viseme_I:11,viseme_O:12,viseme_U:13
};
function mesh(name,withDirect=true){return {name,morphTargetDictionary:withDirect?{...directNames}:{jawOpen:0},morphTargetInfluences:Array(14).fill(0)};}

test('composite direct contract requires Body Teeth and Tongue, not Eyes',()=>{
  const rig={meshes:[mesh('Body'),mesh('Eyes',false),mesh('Teeth'),mesh('Tongue')]};
  const contract=bridge.contractFor(rig,direct);
  assert.equal(contract.ok,true);assert.deepEqual(contract.missing,[]);assert.equal(contract.entries.length,3);
  assert.deepEqual(contract.entries.map(row=>row.name),['body','teeth','tongue']);
});

test('direct visemes are applied to Body Teeth Tongue and ARKit viseme fallback is suppressed only when contract is complete',()=>{
  const body=mesh('Body'),eyes=mesh('Eyes',false),teeth=mesh('Teeth'),tongue=mesh('Tongue');
  let seen=null;
  class Renderer{constructor(){this.faceRig={meshes:[body,eyes,teeth,tongue]};}renderFrame(frame){seen=frame;return true;}}
  assert.equal(bridge.patchRenderer(Renderer,direct),true);
  const renderer=new Renderer();renderer.renderFrame({state:'speaking',visemes:{PP:.8,TH:.25}});
  assert.deepEqual(seen.visemes,{});
  for(const item of [body,teeth,tongue]){assert.equal(item.morphTargetInfluences[0],.8);assert.equal(item.morphTargetInfluences[2],.25);}
  assert.equal(eyes.morphTargetInfluences[0],0);
});

test('missing direct coverage keeps the old ARKit viseme fallback and does not partially apply direct mouths',()=>{
  const body=mesh('Body'),teeth=mesh('Teeth'),tongue=mesh('Tongue',false);let seen=null;
  class Renderer{constructor(){this.faceRig={meshes:[body,teeth,tongue]};}renderFrame(frame){seen=frame;return true;}}
  bridge.patchRenderer(Renderer,direct);
  const renderer=new Renderer(),visemes={aa:.7};renderer.renderFrame({state:'speaking',visemes});
  assert.equal(seen.visemes,visemes);
  assert.equal(body.morphTargetInfluences[9],0);assert.equal(teeth.morphTargetInfluences[9],0);
  const contract=bridge.getContract(renderer.faceRig,direct);assert.equal(contract.ok,false);assert.deepEqual(contract.missing,['tongue']);
});

test('empty timeline resets all direct mouth targets on every required mesh',()=>{
  const body=mesh('Body'),teeth=mesh('Teeth'),tongue=mesh('Tongue'),rig={meshes:[body,teeth,tongue]};
  body.morphTargetInfluences.fill(.5);teeth.morphTargetInfluences.fill(.4);tongue.morphTargetInfluences.fill(.3);
  assert.equal(bridge.applyCompositeDirect(rig,{},direct),true);
  for(const item of [body,teeth,tongue])assert(item.morphTargetInfluences.every(value=>value===0));
});
