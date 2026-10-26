(() => {
  'use strict';

  const RIM_INTENSITY=.65;
  const SHADOW_OPACITY=.18;
  const SHADOW_MAP_SIZE=1024;
  const KEY_OFFSET=Object.freeze({x:2.5,y:4,z:4});
  const RIM_OFFSET=Object.freeze({x:-2.8,y:3.2,z:-3.2});

  function walk(root,visit){
    if(!root||typeof visit!=='function')return;
    const stack=[root],seen=new Set();
    while(stack.length){const node=stack.pop();if(!node||seen.has(node))continue;seen.add(node);visit(node);for(let i=(node.children?.length||0)-1;i>=0;i--)stack.push(node.children[i]);}
  }

  function setVector(target,x,y,z){if(!target)return;if(typeof target.set==='function')target.set(x,y,z);else{target.x=x;target.y=y;target.z=z;}}

  function markShadowMeshes(root,enabled=true){
    let count=0;
    walk(root,node=>{if(!node?.isMesh)return;node.castShadow=Boolean(enabled);node.receiveShadow=Boolean(enabled);count++;});
    return count;
  }

  function findKeyLight(scene){
    let best=null;
    for(const child of scene?.children||[]){if(!child?.isDirectionalLight)continue;if(!best||Number(child.intensity||0)>Number(best.intensity||0))best=child;}
    return best;
  }

  function addTarget(scene,light){
    const target=light?.target;if(!scene||!target||target.parent)return false;
    scene.add(target);return true;
  }

  function configureKeyShadow(key,THREE){
    if(!key?.shadow)return false;
    key.castShadow=true;
    const mapSize=key.shadow.mapSize;
    if(typeof mapSize?.set==='function')mapSize.set(SHADOW_MAP_SIZE,SHADOW_MAP_SIZE);else if(mapSize){mapSize.width=SHADOW_MAP_SIZE;mapSize.height=SHADOW_MAP_SIZE;}
    key.shadow.bias=-.0002;
    key.shadow.normalBias=.012;
    if(key.shadow.camera){key.shadow.camera.near=.1;key.shadow.camera.far=20;}
    return true;
  }

  function createShadowCatcher(THREE){
    if(!THREE?.PlaneGeometry||!THREE?.ShadowMaterial||!THREE?.Mesh)return null;
    const geometry=new THREE.PlaneGeometry(1,1);
    const material=new THREE.ShadowMaterial({color:0x000000,opacity:SHADOW_OPACITY,transparent:true});
    material.depthWrite=false;
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name='roleShadowCatcher';
    mesh.receiveShadow=true;
    mesh.castShadow=false;
    mesh.visible=false;
    if(mesh.rotation)mesh.rotation.x=-Math.PI/2;
    mesh.renderOrder=-10;
    return mesh;
  }

  function ensureLighting(instance){
    if(!instance?.renderer||!instance?.scene||!instance?.modules?.THREE)return null;
    if(instance.__roleStageLighting)return instance.__roleStageLighting;
    const THREE=instance.modules.THREE,scene=instance.scene;
    const rim=new THREE.DirectionalLight(0xffeef4,RIM_INTENSITY);
    rim.name='roleRimLight';
    setVector(rim.position,RIM_OFFSET.x,RIM_OFFSET.y,RIM_OFFSET.z);
    scene.add(rim);
    const rimTargetAdded=addTarget(scene,rim);
    const shadows=Boolean(instance.renderer.shadowMap?.enabled);
    let key=null,ground=null,keyTargetAdded=false;
    if(shadows){
      if(THREE.PCFShadowMap!==undefined)instance.renderer.shadowMap.type=THREE.PCFShadowMap;else if(THREE.PCFSoftShadowMap!==undefined)instance.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      key=findKeyLight(scene);
      if(key){configureKeyShadow(key,THREE);keyTargetAdded=addTarget(scene,key);}
      ground=createShadowCatcher(THREE);if(ground)scene.add(ground);
    }
    const state={rim,ground,key,shadows,rimTargetAdded,keyTargetAdded};
    instance.__roleStageLighting=state;
    return state;
  }

  function updateLightingForRoot(instance,root){
    const state=ensureLighting(instance);if(!state||!root)return false;
    const THREE=instance.modules.THREE;
    const box=new THREE.Box3().setFromObject(root);if(box.isEmpty?.())return false;
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    setVector(state.rim.position,center.x+RIM_OFFSET.x,center.y+RIM_OFFSET.y,center.z+RIM_OFFSET.z);
    if(state.rim.target)setVector(state.rim.target.position,center.x,center.y,center.z);
    if(!state.shadows)return true;
    markShadowMeshes(root,true);
    if(state.key){
      setVector(state.key.position,center.x+KEY_OFFSET.x,center.y+KEY_OFFSET.y,center.z+KEY_OFFSET.z);
      if(state.key.target)setVector(state.key.target.position,center.x,center.y,center.z);
      const camera=state.key.shadow?.camera;
      if(camera){const extent=Math.max(1.2,Number(size.y)||0,(Number(size.x)||0)*2,(Number(size.z)||0)*2)*.72;camera.left=-extent;camera.right=extent;camera.top=extent;camera.bottom=-extent;camera.near=.1;camera.far=Math.max(12,extent*8);camera.updateProjectionMatrix?.();}
    }
    if(state.ground){
      const lift=Math.max(.002,(Number(size.y)||0)*.002);
      setVector(state.ground.position,center.x,Number(box.min?.y||0)-lift,center.z);
      const width=Math.max(1.8,(Number(size.x)||0)*2.6),depth=Math.max(1.8,(Number(size.z)||0)*3,(Number(size.x)||0)*1.8);
      if(state.ground.scale)setVector(state.ground.scale,width,depth,1);
      state.ground.visible=true;
    }
    return true;
  }

  function hideShadowCatcher(instance){if(instance?.__roleStageLighting?.ground)instance.__roleStageLighting.ground.visible=false;}

  function disposeLighting(instance){
    const state=instance?.__roleStageLighting;if(!state)return false;
    const scene=instance.scene;
    if(state.ground){scene?.remove?.(state.ground);state.ground.geometry?.dispose?.();state.ground.material?.dispose?.();}
    if(state.rim){scene?.remove?.(state.rim);if(state.rimTargetAdded&&state.rim.target)scene?.remove?.(state.rim.target);}
    if(state.keyTargetAdded&&state.key?.target)scene?.remove?.(state.key.target);
    instance.__roleStageLighting=null;
    return true;
  }

  function patchRenderer(api=typeof window!=='undefined'?window.RoleHumanRenderer:null){
    const proto=api?.HumanRenderer?.prototype;if(!proto?.ensureEngine||proto.ensureEngine.__stageLighting)return false;
    const baseEnsure=proto.ensureEngine,baseFrame=proto.frameModel,baseClear=proto.clearModel,baseDispose=proto.dispose;
    proto.ensureEngine=async function(...args){const result=await baseEnsure.apply(this,args);ensureLighting(this);return result;};proto.ensureEngine.__stageLighting=true;
    proto.frameModel=function(root,...args){const result=baseFrame.call(this,root,...args);try{updateLightingForRoot(this,root);}catch(error){hideShadowCatcher(this);console.warn?.('3D灯光增强已降级。',error);}return result;};proto.frameModel.__stageLighting=true;
    proto.clearModel=function(...args){const result=baseClear.apply(this,args);hideShadowCatcher(this);return result;};proto.clearModel.__stageLighting=true;
    proto.dispose=function(...args){disposeLighting(this);return baseDispose.apply(this,args);};proto.dispose.__stageLighting=true;
    return true;
  }

  function boot(){if(typeof window==='undefined')return false;if(patchRenderer())return true;let attempts=0;const retry=()=>{if(patchRenderer())return;if(++attempts<80)setTimeout(retry,80);};retry();return false;}

  const api=Object.freeze({RIM_INTENSITY,SHADOW_OPACITY,SHADOW_MAP_SIZE,KEY_OFFSET,RIM_OFFSET,walk,markShadowMeshes,findKeyLight,configureKeyShadow,createShadowCatcher,ensureLighting,updateLightingForRoot,hideShadowCatcher,disposeLighting,patchRenderer,boot});
  if(typeof window!=='undefined'){window.RoleStageLighting=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
