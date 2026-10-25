(() => {
  'use strict';

  const ARM_BONES=Object.freeze({left:['upperarm_l','lowerarm_l'],right:['upperarm_r','lowerarm_r']});
  const states=new WeakMap();

  function findBone(root,name){let found=null;root?.traverse?.(node=>{if(!found&&node?.isBone&&String(node.name||'')===name)found=node;});return found;}

  function capture(root){
    if(!root)return null;
    const cached=states.get(root);if(cached)return cached;
    const leftUpper=findBone(root,ARM_BONES.left[0]),leftLower=findBone(root,ARM_BONES.left[1]);
    const rightUpper=findBone(root,ARM_BONES.right[0]),rightLower=findBone(root,ARM_BONES.right[1]);
    if(!leftUpper||!leftLower||!rightUpper||!rightLower)return null;
    const state={
      left:{upper:leftUpper,lower:leftLower,rest:leftUpper.quaternion?.clone?.(),natural:null},
      right:{upper:rightUpper,lower:rightLower,rest:rightUpper.quaternion?.clone?.(),natural:null},
      ready:false
    };
    if(!state.left.rest||!state.right.rest)return null;
    states.set(root,state);return state;
  }

  function buildNatural(side,THREE){
    const upper=side?.upper,lower=side?.lower,rest=side?.rest;if(!upper||!lower||!rest||!THREE)return null;
    upper.quaternion.copy(rest);upper.updateMatrixWorld?.(true);lower.updateMatrixWorld?.(true);
    const shoulder=new THREE.Vector3(),elbow=new THREE.Vector3();upper.getWorldPosition(shoulder);lower.getWorldPosition(elbow);
    const current=elbow.sub(shoulder);if(current.lengthSq()<1e-8)return null;current.normalize();
    const left=String(upper.name||'').endsWith('_l');
    const sideSign=left?-1:1;
    const target=new THREE.Vector3(sideSign*.16,-.986,.035).normalize();
    const deltaWorld=new THREE.Quaternion().setFromUnitVectors(current,target);
    const parentWorld=new THREE.Quaternion();upper.parent?.getWorldQuaternion?.(parentWorld);
    const localDelta=parentWorld.clone().invert().multiply(deltaWorld).multiply(parentWorld);
    const natural=rest.clone().premultiply(localDelta).normalize();
    upper.quaternion.copy(natural);upper.updateMatrixWorld?.(true);
    return natural;
  }

  function prepare(root,THREE){
    const state=capture(root);if(!state||!THREE)return null;if(state.ready)return state;
    root.updateMatrixWorld?.(true);
    state.left.natural=buildNatural(state.left,THREE);state.right.natural=buildNatural(state.right,THREE);
    state.ready=Boolean(state.left.natural&&state.right.natural);root.updateMatrixWorld?.(true);return state.ready?state:null;
  }

  function applyNaturalPose(root,THREE){
    const state=prepare(root,THREE);if(!state)return false;
    state.left.upper.quaternion.copy(state.left.natural);state.right.upper.quaternion.copy(state.right.natural);
    return true;
  }

  function reset(root){const state=states.get(root);if(!state)return false;state.left.upper.quaternion.copy(state.left.rest);state.right.upper.quaternion.copy(state.right.rest);root.updateMatrixWorld?.(true);return true;}

  function patchRenderer(rendererApi=typeof window!=='undefined'?window.RoleHumanRenderer:null){
    const proto=rendererApi?.HumanRenderer?.prototype;if(!proto?.renderFrame||proto.renderFrame.__naturalArmPose)return false;
    const base=proto.renderFrame;
    const wrapped=function(frame={}){if(this.root&&this.modules?.THREE)applyNaturalPose(this.root,this.modules.THREE);return base.call(this,frame);};
    wrapped.__naturalArmPose=true;proto.renderFrame=wrapped;return true;
  }

  function boot(){if(typeof window==='undefined')return false;if(patchRenderer())return true;let tries=0;const retry=()=>{if(patchRenderer())return;if(++tries<80)setTimeout(retry,80);};retry();return false;}

  const api=Object.freeze({ARM_BONES,findBone,capture,buildNatural,prepare,applyNaturalPose,reset,patchRenderer,boot});
  if(typeof window!=='undefined'){window.RoleNaturalPose=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();