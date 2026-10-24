(() => {
  'use strict';

  // This runtime is inert unless RoleUnifiedProductionGate has authorized the current browser.
  // Production config never loads it directly; the gate loads it only after global or real-device QA.
  const STATUS='unified-static';
  const DEVICE_STATUS='device-qualified';
  const PRODUCTION_STATUS='production';
  const ASSET_ID='unified-charactercreator';
  const BASE_ASSET=Object.freeze({url:'assets/humans/unified/base_body.glb',scale:1,y:0,rotationY:0,framing:'full',minMorphTargets:52});
  const JOINTS_PATH='assets/humans/unified/base_body.joints.json';
  const HAIR_PATH=id=>`assets/humans/unified/hair_${id}.glb`;
  const CLOTHING_PATH=id=>`assets/humans/unified/clothing_${id}.glb`;
  const MODE_PREFIX='liaotian_chat_mode_v2_';
  const INIT_PREFIX='liaotian_unified_mode_initialized_';
  let jointsPromise=null;

  function isCustom(char){return Boolean(char&&!char.isPreset&&/^custom_[a-z0-9_-]+$/i.test(String(char.id||'')));}
  function currentChar(){if(typeof characters==='undefined'||typeof activeCharacterId==='undefined')return null;return characters.find(item=>item.id===activeCharacterId)||null;}
  function recipe(char){return (typeof window!=='undefined'?window.RoleVisualRecipe?.forCharacter?.(char):null)||char?.visualRecipe||{};}
  function plan(char){return (typeof window!=='undefined'?window.RoleUnifiedHumanRecipe?.mapRecipe?.(recipe(char)):null)||null;}
  function gateQualification(){if(typeof window==='undefined')return'';const result=window.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT;if(result?.ok!==true)return'';return result.qualification==='global'||result.qualification==='device'?result.qualification:'';}
  function statusForQualification(qualification){return qualification==='global'?PRODUCTION_STATUS:qualification==='device'?DEVICE_STATUS:STATUS;}
  function decorate(char){if(!isCustom(char))return false;const qualification=gateQualification();if(!qualification)return false;char.humanAsset={...BASE_ASSET};char.humanAssetId=ASSET_ID;char.humanAssetStatus=statusForQualification(qualification);char.humanAssetQualification=qualification;return true;}
  function ensureDefault3D(char){if(!isCustom(char)||!gateQualification()||typeof localStorage==='undefined')return'text';const initKey=INIT_PREFIX+char.id,modeKey=MODE_PREFIX+char.id;try{if(localStorage.getItem(initKey)!=='1'){localStorage.setItem(modeKey,'3d');localStorage.setItem(initKey,'1');}return localStorage.getItem(modeKey)==='text'?'text':'3d';}catch{return'3d';}}
  function setMode(char,mode){if(!isCustom(char)||!gateQualification()||typeof localStorage==='undefined')return;try{localStorage.setItem(MODE_PREFIX+char.id,mode==='text'?'text':'3d');localStorage.setItem(INIT_PREFIX+char.id,'1');}catch{}}
  function disposeScene(root){if(typeof window!=='undefined')window.RoleHumanRenderer?.disposeObject?.(root);}

  function walkRoot(root,visit){if(!root||typeof visit!=='function')return;const stack=[root],seen=new Set();while(stack.length){const node=stack.pop();if(!node||seen.has(node))continue;seen.add(node);visit(node);for(let i=(node.children?.length||0)-1;i>=0;i--)stack.push(node.children[i]);}}
  function collectFaceMeshes(root,faceApi){const api=faceApi||(typeof window!=='undefined'?window.RoleFaceRig:null),out=[];if(typeof api?.buildMorphIndex!=='function')return out;walkRoot(root,node=>{if(!node?.morphTargetDictionary||!Array.isArray(node.morphTargetInfluences))return;const index=api.buildMorphIndex(node.morphTargetDictionary);if(Object.keys(index).length)out.push(Object.freeze({mesh:node,index:Object.freeze({...index})}));});return out;}
  function createCompositeFaceRig(root,headObject,faceApi){const api=faceApi||(typeof window!=='undefined'?window.RoleFaceRig:null);if(!api?.weightsFromPresence||!api?.applyWeights)return null;const entries=collectFaceMeshes(root,api);if(!entries.length)return null;const rotation=headObject?.rotation;const baseRotation={x:Number(rotation?.x)||0,y:Number(rotation?.y)||0,z:Number(rotation?.z)||0};const rig={root,mesh:entries[0].mesh,meshes:Object.freeze(entries.map(entry=>entry.mesh)),headObject,render(frame={}){const weights=api.weightsFromPresence(frame);let applied=false;for(const entry of entries)applied=Boolean(api.applyWeights(entry.mesh,weights,entry.index))||applied;api.applyHeadPose?.(headObject,frame,baseRotation);return applied;},reset(){const blank=api.blankFace?.()||{};for(const entry of entries)api.applyWeights(entry.mesh,blank,entry.index);if(headObject?.rotation){headObject.rotation.x=baseRotation.x;headObject.rotation.y=baseRotation.y;headObject.rotation.z=baseRotation.z;}return rig;}};return rig;}
  function resetLegacyRigs(renderer){renderer?.bodyRig?.reset?.();renderer?.proportionRig?.reset?.();renderer?.appearanceRig?.reset?.();if(renderer){renderer.bodyRig=null;renderer.proportionRig=null;renderer.proportionResult=null;renderer.appearanceRig=null;renderer.appearanceResult=null;}return renderer;}
  function resetUnifiedState(renderer){if(!renderer)return renderer;renderer.__unifiedCustomModules=null;renderer.__unifiedCustomKey='';renderer.__unifiedCandidateState=null;return renderer;}
  function nextLoadToken(renderer){const next=(Number(renderer?.__unifiedLoadToken)||0)+1;if(renderer)renderer.__unifiedLoadToken=next;return next;}
  function cancelRendererLoad(renderer){if(!renderer)return 0;if(typeof renderer.cancelPendingLoad==='function')return renderer.cancelPendingLoad();const next=(Number(renderer.loadToken)||0)+1;renderer.loadToken=next;return next;}
  function isCurrentLoad(renderer,baseRoot,charId,token){return Boolean(renderer&&renderer.__unifiedLoadToken===token&&renderer.root===baseRoot&&renderer.currentId===charId);}

  async function loadModule(renderer,url){const loader=new renderer.modules.GLTFLoader();if(renderer.modules.MeshoptDecoder&&typeof loader.setMeshoptDecoder==='function')loader.setMeshoptDecoder(renderer.modules.MeshoptDecoder);return loader.loadAsync(url);}
  async function loadJoints(){if(!jointsPromise){jointsPromise=fetch(JOINTS_PATH,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`joint sidecar ${r.status}`);return r.json();}).then(data=>{if(!data?.morphs||!data?.bones)throw new Error('joint sidecar contract invalid');return data;}).catch(error=>{jointsPromise=null;throw error;});}return jointsPromise;}
  function tintSkin(root,hex){if(!hex||!root?.traverse)return 0;const seen=new Set();let changed=0;root.traverse(node=>{const materials=Array.isArray(node?.material)?node.material:(node?.material?[node.material]:[]);for(const material of materials){if(!material||seen.has(material))continue;seen.add(material);const name=String(material.name||'').toLowerCase();if(!material.color||!/(^skin$|skin|body|face|head)/.test(name))continue;try{material.color.set(hex);const gain=Number(material.userData?.tint?.gain);if(gain>0&&gain!==1&&typeof material.color.multiplyScalar==='function')material.color.multiplyScalar(gain);material.needsUpdate=true;changed++;}catch{}}});return changed;}
  function recipeKey(mapped){return JSON.stringify({m:mapped?.morphs||{},h:mapped?.hair||'',c:mapped?.clothing||[],s:mapped?.skinTint||''});}

  async function loadUnifiedCandidate(renderer,char,mapped,key,originalLoad,token){
    let baseRoot=null;
    const attached=[];
    try{
      if(!gateQualification())return false;
      if(renderer.currentId===char.id&&renderer.root&&renderer.__unifiedCustomKey!==key){resetUnifiedState(renderer);renderer.clearModel?.();}
      const ok=await originalLoad.call(renderer,char);
      if(!ok||!renderer.root||renderer.currentId!==char.id||renderer.__unifiedLoadToken!==token||!gateQualification())return false;
      renderer.loop?.stop?.();
      baseRoot=renderer.root;
      const oldFaceRig=renderer.faceRig;
      resetLegacyRigs(renderer);
      const runtime=window.RoleUnifiedHumanRuntime;
      runtime.applyMorphWeights(baseRoot,{}, {reset:true});
      const modules=[];
      if(mapped.hair)modules.push({kind:'hair',url:HAIR_PATH(mapped.hair)});
      for(const id of mapped.clothing||[])modules.push({kind:'clothing',url:CLOTHING_PATH(id)});
      for(const item of modules){
        if(!isCurrentLoad(renderer,baseRoot,char.id,token)||!gateQualification())return false;
        const gltf=await loadModule(renderer,item.url);
        if(!isCurrentLoad(renderer,baseRoot,char.id,token)||!gateQualification()){disposeScene(gltf.scene);return false;}
        const required=item.kind==='hair'?['gender_female','gender_male','weight_min','weight_max','height_short','height_tall','face_forehead_decr','face_forehead_incr','face_ear_size_decr','face_ear_size_incr']:['gender_female','gender_male','weight_min','weight_max','height_short','height_tall'];
        runtime.attachModule(baseRoot,gltf.scene,mapped.morphs||{},required);
        attached.push(gltf.scene);
      }
      const joints=await loadJoints();
      if(!isCurrentLoad(renderer,baseRoot,char.id,token)||!gateQualification())return false;
      const state=runtime.applyCandidateState(baseRoot,attached,joints,mapped.morphs||{});
      if(!state.morphs?.applied)throw new Error('identity morphs were not applied');
      if(state.skeleton?.moved<20||state.skeleton?.missingBones?.length)throw new Error(`joint sidecar application failed: ${state.skeleton?.missingBones?.join(',')||'no moved skeleton'}`);
      oldFaceRig?.reset?.();
      const compositeFace=createCompositeFaceRig(baseRoot,oldFaceRig?.headObject,window.RoleFaceRig);
      if(!compositeFace||compositeFace.meshes.length<2)throw new Error('multi-mesh face rig unavailable');
      compositeFace.reset();
      renderer.faceRig=compositeFace;
      tintSkin(baseRoot,mapped.skinTint);
      renderer.__unifiedCustomModules=attached;
      renderer.__unifiedCustomKey=key;
      renderer.__unifiedCandidateState=state;
      renderer.frameModel?.(baseRoot,'full');
      renderer.resize?.();
      renderer.loop?.start?.();
      return true;
    }catch(error){
      console.warn('统一3D候选未通过运行时合同，保持关闭。',error);
      if(baseRoot&&isCurrentLoad(renderer,baseRoot,char.id,token)){resetUnifiedState(renderer);renderer.clearModel?.();}
      return false;
    }
  }

  function patchRenderer(){
    const proto=window.RoleHumanRenderer?.HumanRenderer?.prototype;
    if(!proto?.loadCharacter||proto.loadCharacter.__unifiedCustom)return false;
    const originalLoad=proto.loadCharacter,originalSync=proto.syncCharacter;
    proto.loadCharacter=async function(char){
      if(!isCustom(char)){nextLoadToken(this);resetUnifiedState(this);return originalLoad.call(this,char);}
      if(!decorate(char)){nextLoadToken(this);cancelRendererLoad(this);resetUnifiedState(this);this.clearModel?.();return false;}
      const mapped=plan(char),runtime=window.RoleUnifiedHumanRuntime;
      if(!mapped||!runtime?.attachModule||!runtime?.applyCandidateState){nextLoadToken(this);cancelRendererLoad(this);resetUnifiedState(this);this.clearModel?.();return false;}
      const key=recipeKey(mapped),pendingKey=`${char.id}|${key}`;
      if(this.currentId===char.id&&this.root&&this.__unifiedCustomKey===key){this.loop?.start?.();return true;}
      if(this.__unifiedPendingKey===pendingKey&&this.__unifiedPendingPromise)return this.__unifiedPendingPromise;
      const token=nextLoadToken(this);
      const task=loadUnifiedCandidate(this,char,mapped,key,originalLoad,token);
      this.__unifiedPendingKey=pendingKey;
      this.__unifiedPendingPromise=task;
      try{return await task;}finally{if(this.__unifiedPendingPromise===task){this.__unifiedPendingPromise=null;this.__unifiedPendingKey='';}}
    };
    proto.loadCharacter.__unifiedCustom=true;
    proto.syncCharacter=async function(...args){const char=this.currentCharacter?.()||currentChar();if(!isCustom(char))return originalSync.apply(this,args);if(!decorate(char)||ensureDefault3D(char)!=='3d'){nextLoadToken(this);cancelRendererLoad(this);resetUnifiedState(this);this.clearModel?.();return false;}return this.loadCharacter(char);};
    proto.syncCharacter.__unifiedCustom=true;
    return true;
  }

  function installModeButton(){const button=document.getElementById('roleChatModeBtn')||window.RoleChatMode?.ensureButton?.();if(!button)return false;if(button.dataset.unifiedCustom==='1')return true;button.dataset.unifiedCustom='1';button.addEventListener('click',event=>{const char=currentChar();if(!isCustom(char)||!gateQualification())return;event.preventDefault();event.stopImmediatePropagation();const next=ensureDefault3D(char)==='3d'?'text':'3d';setMode(char,next);updateModeButton();window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();},true);return true;}
  function updateModeButton(){const char=currentChar(),button=document.getElementById('roleChatModeBtn');if(!button)return;if(!isCustom(char)){window.RoleChatMode?.updateButton?.();return;}if(!decorate(char)){button.hidden=true;button.textContent='3D聊天';button.setAttribute('aria-pressed','false');return;}const is3d=ensureDefault3D(char)==='3d';button.hidden=false;button.textContent=is3d?'普通聊天':'3D聊天';button.setAttribute('aria-pressed',String(is3d));button.title=is3d?'切换回普通文字聊天':'显示当前自定义3D角色';}
  function decorateAll(){if(!gateQualification()||typeof characters==='undefined'||!Array.isArray(characters))return;characters.forEach(decorate);}
  function patchSwitch(){if(typeof switchCharacter!=='function'||switchCharacter.__unifiedCustom)return false;const base=switchCharacter;const wrapped=function(...args){const result=base.apply(this,args);const char=currentChar();decorate(char);requestAnimationFrame(()=>{installModeButton();updateModeButton();window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();});return result;};wrapped.__unifiedCustom=true;switchCharacter=wrapped;return true;}
  function boot(){if(typeof window==='undefined'||typeof document==='undefined'||!gateQualification())return false;if(!window.RoleHumanRenderer||!window.RoleUnifiedHumanRuntime||!window.RoleUnifiedHumanRecipe||typeof switchCharacter!=='function'){setTimeout(boot,80);return false;}decorateAll();patchRenderer();patchSwitch();installModeButton();updateModeButton();requestAnimationFrame(()=>window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());return true;}

  const api=Object.freeze({STATUS,DEVICE_STATUS,PRODUCTION_STATUS,ASSET_ID,BASE_ASSET,JOINTS_PATH,isCustom,gateQualification,statusForQualification,decorate,plan,walkRoot,collectFaceMeshes,createCompositeFaceRig,resetLegacyRigs,resetUnifiedState,nextLoadToken,cancelRendererLoad,isCurrentLoad,loadJoints,tintSkin,recipeKey,loadUnifiedCandidate,ensureDefault3D,setMode,patchRenderer,patchSwitch,updateModeButton,boot});
  if(typeof window!=='undefined'){window.RoleUnifiedCustomChat=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
