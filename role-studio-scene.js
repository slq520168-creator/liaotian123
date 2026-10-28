(() => {
 'use strict';
 function create(THREE){
  const group=new THREE.Group();group.name='SiroleStudio';
  const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
  const wall=mat(0x39343e),floor=mat(0x554a4d),wood=mat(0x735846),fabric=mat(0x716675),metal=mat(0x25232b);
  const glow=mat(0xf4dbb6);glow.emissive.set(0xf4dbb6);glow.emissiveIntensity=.4;
  function box(name,size,position,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.name=name;mesh.position.set(...position);mesh.receiveShadow=true;group.add(mesh);return mesh;}
  box('StudioFloor',[12,.06,12],[0,-.04,0],floor);
  box('StudioBackWall',[12,5,.10],[0,2.45,-2.5],wall);
  box('StudioWindow',[1.7,2,.04],[-1.6,1.9,-2.43],glow);
  for(const x of [-2.47,-1.6,-.73])box('WindowFrame',[.035,2.06,.06],[x,1.9,-2.38],metal);
  box('WindowCrossbar',[1.77,.035,.06],[-1.6,1.9,-2.38],metal);
  box('SofaSeat',[1.8,.22,.72],[1.4,.34,-1.6],fabric);
  box('SofaBack',[1.8,.65,.17],[1.4,.66,-1.94],fabric);
  for(const x of [.47,2.33])box('SofaArm',[.18,.4,.78],[x,.47,-1.6],fabric);
  for(const x of [.65,2.15])for(const z of [-1.86,-1.34])box('SofaLeg',[.06,.2,.06],[x,.1,z],wood);
  box('SideTableTop',[.5,.05,.5],[-1.45,.55,-1.3],wood);
  for(const x of [-1.65,-1.25])for(const z of [-1.5,-1.1])box('SideTableLeg',[.045,.52,.045],[x,.26,z],metal);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.13,.09,.25,12),wood);pot.position.set(-1.45,.7,-1.3);group.add(pot);
  const leaves=mat(0x536855);
  for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),leaves);leaf.scale.set(.6,2.5,.35);leaf.position.set(-1.45+Math.sin(i*2)*.09,.94,-1.3+Math.cos(i*2)*.06);leaf.rotation.z=Math.sin(i*2)*.55;group.add(leaf);}
  return group;
 }
 function ensure(renderer){if(!renderer?.scene||!renderer?.modules?.THREE)return null;if(!renderer.__studioScene){renderer.__studioScene=create(renderer.modules.THREE);renderer.scene.add(renderer.__studioScene);}return renderer.__studioScene;}
 function fit(renderer,root){const group=ensure(renderer);if(!group||!root)return;const box=new renderer.modules.THREE.Box3().setFromObject(root);if(!box.isEmpty())group.position.y=box.min.y;}
 function dispose(renderer){const group=renderer.__studioScene;if(!group)return;const geometries=new Set(),materials=new Set();group.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();group.removeFromParent();renderer.__studioScene=null;}
 function patch(){const proto=window.RoleHumanRenderer?.HumanRenderer?.prototype;if(!proto||proto.ensureEngine.__studioScene)return;const engine=proto.ensureEngine,frame=proto.frameModel,clear=proto.clearModel,destroy=proto.dispose;
  proto.ensureEngine=async function(...args){const result=await engine.apply(this,args);ensure(this);return result;};proto.ensureEngine.__studioScene=true;
  proto.frameModel=function(root,...args){const result=frame.call(this,root,...args);fit(this,root);if(this.__studioScene)this.__studioScene.visible=true;return result;};
  proto.clearModel=function(...args){const result=clear.apply(this,args);if(this.__studioScene)this.__studioScene.visible=false;return result;};
  proto.dispose=function(...args){dispose(this);return destroy.apply(this,args);};
 }
 const api=Object.freeze({create,ensure,fit,dispose});if(typeof module!=='undefined')module.exports=api;if(typeof window!=='undefined'){window.RoleStudioScene=api;patch();}
})();
