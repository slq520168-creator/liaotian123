const test=require('node:test');
const assert=require('node:assert/strict');
const lighting=require('../role-stage-lighting.js');

class Vec3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}}
class DirectionalLight{constructor(color,intensity){this.color=color;this.intensity=intensity;this.isDirectionalLight=true;this.position=new Vec3();this.target={position:new Vec3(),parent:null};this.shadow={mapSize:{set:(w,h)=>{this.shadow.mapSize.width=w;this.shadow.mapSize.height=h;}},camera:{updateProjectionMatrix(){this.updated=true;}}};}}
class PlaneGeometry{constructor(w,h){this.w=w;this.h=h;this.disposed=false;}dispose(){this.disposed=true;}}
class ShadowMaterial{constructor(options){Object.assign(this,options);this.disposed=false;}dispose(){this.disposed=true;}}
class Mesh{constructor(geometry=null,material=null){this.geometry=geometry;this.material=material;this.isMesh=true;this.children=[];this.position=new Vec3();this.scale=new Vec3(1,1,1);this.rotation={x:0,y:0,z:0};this.visible=true;}}
class Vector3 extends Vec3{}
class Box3{
  setFromObject(root){this.root=root;this.min={...(root.__box?.min||{x:-.5,y:0,z:-.25})};this.max={...(root.__box?.max||{x:.5,y:2,z:.25})};return this;}
  isEmpty(){return false;}
  getSize(target){return target.set(this.max.x-this.min.x,this.max.y-this.min.y,this.max.z-this.min.z);}
  getCenter(target){return target.set((this.max.x+this.min.x)/2,(this.max.y+this.min.y)/2,(this.max.z+this.min.z)/2);}
}
const THREE={DirectionalLight,PlaneGeometry,ShadowMaterial,Mesh,Vector3,Box3,PCFSoftShadowMap:'soft'};
function scene(){return{children:[],add(node){if(!this.children.includes(node))this.children.push(node);node.parent=this;},remove(node){this.children=this.children.filter(x=>x!==node);if(node)node.parent=null;}};}
function root(){const a=new Mesh(),b=new Mesh();const r={children:[a,b],__box:{min:{x:-.45,y:0,z:-.3},max:{x:.45,y:1.8,z:.3}}};return{r,a,b};}
function instance(shadows=true){
  const s=scene(),key=new DirectionalLight(0xffffff,2.3),fill=new DirectionalLight(0xffffff,1.2);key.position.set(2.5,4,4);fill.position.set(-3,2,2);s.add(key);s.add(fill);
  return{modules:{THREE},scene:s,renderer:{shadowMap:{enabled:shadows,type:null}},key,fill};
}

test('high quality renderer gets soft real contact shadows and a subtle rim light',()=>{
  const host=instance(true),{r,a,b}=root();
  const state=lighting.ensureLighting(host);
  assert.equal(state.shadows,true);
  assert.equal(host.renderer.shadowMap.type,'soft');
  assert.equal(state.key,host.key);
  assert.equal(host.key.castShadow,true);
  assert.equal(host.key.shadow.mapSize.width,1024);
  assert.equal(state.rim.intensity,lighting.RIM_INTENSITY);
  assert.ok(state.ground);
  assert.equal(lighting.updateLightingForRoot(host,r),true);
  assert.equal(a.castShadow,true);assert.equal(a.receiveShadow,true);assert.equal(b.castShadow,true);assert.equal(b.receiveShadow,true);
  assert.equal(state.ground.visible,true);
  assert.ok(state.ground.position.y<r.__box.min.y,'contact shadow must sit slightly below the feet');
  assert.equal(host.key.target.position.y,.9);
  assert.equal(host.key.shadow.camera.updated,true);
});

test('low and mid tier renderer keeps shadows disabled and pays no catcher or mesh-shadow cost',()=>{
  const host=instance(false),{r,a}=root();
  const state=lighting.ensureLighting(host);
  assert.equal(state.shadows,false);
  assert.equal(state.ground,null);
  assert.equal(lighting.updateLightingForRoot(host,r),true);
  assert.equal(a.castShadow,undefined);
  assert.equal(a.receiveShadow,undefined);
  assert.ok(state.rim,'rim light remains available without a shadow map');
});

test('shadow catcher follows reframed body bounds without per-frame geometry recreation',()=>{
  const host=instance(true),{r}=root();
  lighting.updateLightingForRoot(host,r);
  const ground=host.__roleStageLighting.ground,geometry=ground.geometry;
  const firstY=ground.position.y;
  r.__box={min:{x:-.6,y:-.12,z:-.35},max:{x:.6,y:2.1,z:.35}};
  lighting.updateLightingForRoot(host,r);
  assert.equal(host.__roleStageLighting.ground,ground);
  assert.equal(ground.geometry,geometry);
  assert.notEqual(ground.position.y,firstY);
});

test('clear/dispose lifecycle hides and releases lighting GPU resources exactly once',()=>{
  const host=instance(true),{r}=root();
  lighting.updateLightingForRoot(host,r);
  const state=host.__roleStageLighting,geometry=state.ground.geometry,material=state.ground.material;
  lighting.hideShadowCatcher(host);assert.equal(state.ground.visible,false);
  assert.equal(lighting.disposeLighting(host),true);
  assert.equal(geometry.disposed,true);assert.equal(material.disposed,true);assert.equal(host.__roleStageLighting,null);
  assert.equal(lighting.disposeLighting(host),false);
});

test('renderer patch is idempotent and keeps lighting optional around the base renderer lifecycle',async()=>{
  class Renderer{
    constructor(){Object.assign(this,instance(true));this.root=root().r;this.clearCount=0;this.disposeCount=0;}
    async ensureEngine(){return 'engine';}
    frameModel(){return 'framed';}
    clearModel(){this.clearCount++;return 'cleared';}
    dispose(){this.disposeCount++;return 'disposed';}
  }
  const api={HumanRenderer:Renderer};
  assert.equal(lighting.patchRenderer(api),true);assert.equal(lighting.patchRenderer(api),false);
  const renderer=new Renderer();
  assert.equal(await renderer.ensureEngine(),'engine');assert.ok(renderer.__roleStageLighting);
  assert.equal(renderer.frameModel(renderer.root),'framed');assert.equal(renderer.__roleStageLighting.ground.visible,true);
  assert.equal(renderer.clearModel(),'cleared');assert.equal(renderer.__roleStageLighting.ground.visible,false);
  const state=renderer.__roleStageLighting;assert.equal(renderer.dispose(),'disposed');assert.equal(state.ground.geometry.disposed,true);assert.equal(renderer.disposeCount,1);
});
