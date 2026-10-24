const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const controls=require('../role-stage-controls.js');

function renderer(){return{camera:{fov:30,updates:0,updateProjectionMatrix(){this.updates++;}},root:{rotation:{y:.25}},stage:{classList:{contains:name=>name==='active'}},container:null};}

test('single pointer drag rotates around the model rest yaw and never accumulates into the base pose',()=>{
  const r=renderer(),state=controls.createState(r);controls.syncRoot(state,r.root);
  controls.beginPointer(state,1,10,20,100);
  controls.movePointer(state,1,210,20,120);
  assert.equal(state.desiredYaw,1.6);
  controls.tick(state,130);
  assert.ok(r.root.rotation.y>.25);
  const first=r.root.rotation.y;
  controls.tick(state,140);
  assert.ok(r.root.rotation.y>first,'smoothing should approach desired yaw without rewriting base yaw');
  assert.equal(state.baseYaw,.25);
});

test('two-pointer pinch zoom is bounded and updates camera projection without moving the model',()=>{
  const r=renderer(),state=controls.createState(r);controls.syncRoot(state,r.root);
  controls.beginPointer(state,1,0,0,10);controls.beginPointer(state,2,100,0,10);
  controls.movePointer(state,2,180,0,20);
  assert.equal(state.zoom,controls.MAX_ZOOM);
  assert.equal(r.camera.fov,Math.max(21,30/controls.MAX_ZOOM));
  assert.ok(r.camera.updates>0);
  controls.movePointer(state,2,10,0,30);
  assert.equal(state.zoom,controls.MIN_ZOOM);
  assert.equal(r.root.rotation.y,.25);
});

test('idle view smoothly returns to front while explicit reset restores yaw and zoom immediately',()=>{
  const r=renderer(),state=controls.createState(r);controls.syncRoot(state,r.root);
  controls.setDesiredYaw(state,1.2,100);state.currentYaw=1.2;controls.setZoom(state,1.3);
  controls.tick(state,100+controls.IDLE_RETURN_MS+1);
  assert.equal(state.desiredYaw,0);
  assert.ok(state.currentYaw<1.2&&state.currentYaw>0);
  controls.resetView(state);
  assert.equal(state.currentYaw,0);assert.equal(state.desiredYaw,0);assert.equal(state.zoom,1);assert.equal(r.root.rotation.y,.25);assert.equal(r.camera.fov,30);
});

test('yaw normalization always takes the shortest rotation path across plus/minus pi',()=>{
  assert.ok(Math.abs(controls.normalizeYaw(Math.PI*3)-Math.PI)<1e-9);
  const delta=controls.yawDelta(-Math.PI+.1,Math.PI-.1);
  assert.ok(Math.abs(delta-.2)<1e-9);
});

test('renderer patch applies interaction before render and reuses the neutral framing FOV',async()=>{
  class Renderer{
    constructor(){this.camera={fov:30,updateProjectionMatrix(){}};this.root={rotation:{y:.1}};this.stage={classList:{contains:()=>true}};this.renderYaw=null;this.frameFov=null;this.clearCount=0;this.disposeCount=0;}
    ensureStage(){return this.stage;}
    frameModel(){this.frameFov=this.camera.fov;return 'frame';}
    renderFrame(){this.renderYaw=this.root?.rotation?.y;return 'render';}
    clearModel(){this.root=null;this.clearCount++;return 'clear';}
    dispose(){this.disposeCount++;return 'dispose';}
  }
  const api={HumanRenderer:Renderer};assert.equal(controls.patchRenderer(api,null),true);assert.equal(controls.patchRenderer(api,null),false);
  const r=new Renderer();r.ensureStage();const state=controls.stateFor(r);controls.syncRoot(state,r.root);controls.setZoom(state,1.35);controls.setDesiredYaw(state,.8,100);state.currentYaw=.8;
  assert.equal(r.frameModel(r.root),'frame');assert.equal(r.frameFov,30,'base framing must use neutral FOV');assert.ok(r.camera.fov<30,'interaction zoom reapplies after framing');
  assert.equal(r.renderFrame(),'render');assert.ok(Math.abs(r.renderYaw-.9)<1e-9,'base yaw plus interactive yaw must be visible before render');
  assert.equal(r.clearModel(),'clear');assert.equal(state.currentYaw,0);assert.equal(state.zoom,1);
  assert.equal(r.dispose(),'dispose');assert.equal(r.disposeCount,1);
});

test('primary interaction surface only covers the upper character viewing area and adds no second animation loop',()=>{
  const source=fs.readFileSync('role-stage-controls.js','utf8');
  assert(source.includes(".role-stage-control-surface.primary{position:absolute;left:0;right:0;top:64px;height:min(40vh,460px);z-index:20}"));
  assert(source.includes("pointerdown"));assert(source.includes("wheel"));assert(source.includes("dblclick"));assert(source.includes("keydown"));
  assert.equal(source.includes('requestAnimationFrame('),false,'controls must ride the existing renderer loop instead of creating a second RAF');
});
