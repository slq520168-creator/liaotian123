(() => {
  'use strict';
  if(typeof window!=='undefined'&&window.RoleUnifiedCustomChat)return;
  const STATUS='unified-static',DEVICE_STATUS='device-qualified',PRODUCTION_STATUS='production',ASSET_ID='unified-charactercreator';
  const BASE_ASSET=Object.freeze({url:'assets/humans/unified/base_body.glb',scale:1,y:0,rotationY:0,framing:'full',minMorphTargets:52});
  const JOINTS_PATH='assets/humans/unified/base_body.joints.json',HAIR_PATH=id=>`assets/humans/unified/hair_${id}.glb`,CLOTHING_PATH=id=>`assets/humans/unified/clothing_${id}.glb`,MODE_PREFIX='liaotian_chat_mode_v2_',INIT_PREFIX='liaotian_unified_mode_initialized_';
  const CLOTHING_TINT_BLEND=.72;
  let jointsPromise=null,wardrobePromise=null;
  function isCustom(char){return Boolean(char&&!char.isPreset&&/^custom_[a-z0-9_-]+$/i.test(String(char.id||'')));}
  function currentChar(){if(typeof characters==='undefined'||typeof activeCharacterId==='undefined')return null;return characters.find(item=>item.id===activeCharacterId)||null;}
  function recipe(char){return(typeof window!=='undefined'?window.RoleVisualRecipe?.forCharacter?.(char):null)||char?.visualRecipe||{};}
  function plan(char){return(typeof window!=='undefined'?window.RoleUnifiedHumanRecipe?.mapRecipe?.(recipe(char)):null)||null;}
  function gateQualification(){if(typeof window==='undefined')return'';const result=window.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT;if(result?.ok!==true)return'';return result.qualification==='global'||result.qualification==='device'?result.qualification:'';}
  function statusForQualification(q){return q==='global'?PRODUCTION_STATUS:q==='device'?DEVICE_STATUS:q==='base'?'base-recipe':STATUS;}
  function isFixedBaseRole(char,win=typeof window!=='undefined'?window:null){
    if(!char||char.roleKind!=='3d'||!isCustom(char)||win?.__ROLE_BASE_RECIPE_QUALIFICATION?.ok!==true)return false;
    const raw=char.visualRecipe||win.RoleVisualRecipe?.fromPersonality?.(char.personality);
    return Boolean(raw?.baseId&&win.Role3DBases?.BY_ID?.[raw.baseId]);
  }
  function qualificationFor(char){return gateQualification()||(isFixedBaseRole(char)?'base':'');}
  function decorate(char){if(!isCustom(char))return false;const q=qualificationFor(char);if(!q)return false;char.humanAsset={...BASE_ASSET};char.humanAssetId=ASSET_ID;char.humanAssetStatus=statusForQualification(q);char.humanAssetQualification=q;return true;}
  function ensureDefault3D(char){if(typeof window!=='undefined'&&window.LIAOTIAN_3D_ONLY&&qualificationFor(char))return'3d';if(!isCustom(char)||!qualificationFor(char)||typeof localStorage==='undefined')return'text';const initKey=INIT_PREFIX+char.id,modeKey=MODE_PREFIX+char.id;try{if(localStorage.getItem(initKey)!=='1'){localStorage.setItem(modeKey,'3d');localStorage.setItem(initKey,'1');}return localStorage.getItem(modeKey)==='text'?'text':'3d';}catch{return'3d';}}
  function setMode(char,mode){if(!isCustom(char)||!qualificationFor(char)||typeof localStorage==='undefined')return;try{localStorage.setItem(MODE_PREFIX+char.id,mode==='text'?'text':'3d');localStorage.setItem(INIT_PREFIX+char.id,'1');}catch{}}
  function disposeScene(root){if(typeof window!=='undefined')window.RoleHumanRenderer?.disposeObject?.(root);}
  function walkRoot(root,visit){if(!root||typeof visit!=='function')return;const stack=[root],seen=new Set();while(stack.length){const node=stack.pop();if(!node||seen.has(node))continue;seen.add(node);visit(node);for(let i=(node.children?.length||0)-1;i>=0;i--)stack.push(node.children[i]);}}
  function collectFaceMeshes(root,faceApi){const api=faceApi||(typeof window!=='undefined'?window.RoleFaceRig:null),out=[];if(typeof api?.buildMorphIndex!=='function')return out;walkRoot(root,node=>{if(!node?.morphTargetDictionary||!Array.isArray(node.morphTargetInfluences))return;const index=api.buildMorphIndex(node.morphTargetDictionary);if(Object.keys(index).length)out.push(Object.freeze({mesh:node,index:Object.freeze({...index})}));});return out;}
  function mergeExpressionBaseline(weights={},baseline={},frame={}){const speaking=frame?.state==='speaking',out={...weights};for(const[name,valueRaw]of Object.entries(baseline||{})){let value=Math.max(0,Math.min(1,Number(valueRaw)||0));if(!value)continue;if(speaking&&/^(mouth|jaw|tongue)/.test(name))value*=.35;out[name]=Math.max(Number(out[name])||0,value);}return out;}
  function createCompositeFaceRig(root,headObject,faceApi,expressionBaseline={}){const api=faceApi||(typeof window!=='undefined'?window.RoleFaceRig:null);if(!api?.weightsFromPresence||!api?.applyWeights)return null;const entries=collectFaceMeshes(root,api);if(!entries.length)return null;const rotation=headObject?.rotation,baseRotation={x:Number(rotation?.x)||0,y:Number(rotation?.y)||0,z:Number(rotation?.z)||0},baseline=Object.freeze({...expressionBaseline});const rig={root,mesh:entries[0].mesh,meshes:Object.freeze(entries.map(entry=>entry.mesh)),headObject,expressionBaseline:baseline,render(frame={}){const weights=mergeExpressionBaseline(api.weightsFromPresence(frame),baseline,frame);let applied=false;for(const entry of entries)applied=Boolean(api.applyWeights(entry.mesh,weights,entry.index))||applied;api.applyHeadPose?.(headObject,frame,baseRotation);return applied;},reset(){const blank=api.blankFace?.()||{};for(const entry of entries)api.applyWeights(entry.mesh,blank,entry.index);if(headObject?.rotation){headObject.rotation.x=baseRotation.x;headObject.rotation.y=baseRotation.y;headObject.rotation.z=baseRotation.z;}return rig;}};return rig;}
  function resetLegacyRigs(renderer){renderer?.bodyRig?.reset?.();renderer?.proportionRig?.reset?.();renderer?.appearanceRig?.reset?.();if(renderer){renderer.bodyRig=null;renderer.proportionRig=null;renderer.proportionResult=null;renderer.appearanceRig=null;renderer.appearanceResult=null;}return renderer;}
  function resetUnifiedState(renderer){if(!renderer)return renderer;renderer.__unifiedCustomModules=null;renderer.__unifiedCustomAccessory=null;renderer.__unifiedCustomKey='';renderer.__unifiedMapped=null;renderer.__unifiedMorphWeights=null;renderer.__unifiedCandidateState=null;return renderer;}
  function nextLoadToken(renderer){const next=(Number(renderer?.__unifiedLoadToken)||0)+1;if(renderer)renderer.__unifiedLoadToken=next;return next;}
  function cancelRendererLoad(renderer){if(!renderer)return 0;if(typeof renderer.cancelPendingLoad==='function')return renderer.cancelPendingLoad();const next=(Number(renderer.loadToken)||0)+1;renderer.loadToken=next;return next;}
  function isCurrentLoad(renderer,baseRoot,charId,token){return Boolean(renderer&&renderer.__unifiedLoadToken===token&&renderer.root===baseRoot&&renderer.currentId===charId);}
  async function loadModule(renderer,url){const loader=new renderer.modules.GLTFLoader();if(renderer.modules.MeshoptDecoder&&typeof loader.setMeshoptDecoder==='function')loader.setMeshoptDecoder(renderer.modules.MeshoptDecoder);return loader.loadAsync(url);}
  async function loadJoints(){if(!jointsPromise){jointsPromise=fetch(JOINTS_PATH,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`joint sidecar ${r.status}`);return r.json();}).then(data=>{if(!data?.morphs||!data?.bones)throw new Error('joint sidecar contract invalid');return data;}).catch(error=>{jointsPromise=null;throw error;});}return jointsPromise;}
  async function loadWardrobe(){
    if(!wardrobePromise)wardrobePromise=fetch('assets/humans/unified/clothing.json').then(response=>{if(!response.ok)throw new Error('服装覆盖定义加载失败');return response.json();}).then(value=>{if(!Array.isArray(value?.items)||!value.bodyZones)throw new Error('服装覆盖定义无效');return value;}).catch(error=>{wardrobePromise=null;throw error;});
    return wardrobePromise;
  }
  function tintSkin(root,hex){if(!hex||!root?.traverse)return 0;const seen=new Set();let changed=0;root.traverse(node=>{const materials=Array.isArray(node?.material)?node.material:(node?.material?[node.material]:[]);for(const material of materials){if(!material||seen.has(material))continue;seen.add(material);const name=String(material.name||'').toLowerCase();if(!material.color||!/(^skin$|skin|body|face|head)/.test(name))continue;try{material.color.set(hex);const gain=Number(material.userData?.tint?.gain);if(gain>0&&gain!==1&&typeof material.color.multiplyScalar==='function')material.color.multiplyScalar(gain);material.needsUpdate=true;changed++;}catch{}}});return changed;}
  function requireSkinTint(root,hex){if(!hex)return 0;const changed=tintSkin(root,hex);if(changed<1)throw new Error('skin tint material unavailable');return changed;}
  function captureAuthorColor(material){if(!material?.color)return null;material.userData=material.userData&&typeof material.userData==='object'?material.userData:{};const saved=material.userData.liaotianAuthorBaseColor;if(Array.isArray(saved)&&saved.length===3&&saved.every(Number.isFinite))return saved;const base=[Number(material.color.r),Number(material.color.g),Number(material.color.b)];if(!base.every(Number.isFinite))return null;material.userData.liaotianAuthorBaseColor=base;return base;}
  function tintClothingMaterial(material,hex,blend=CLOTHING_TINT_BLEND){if(!hex||!material?.color?.set)return false;if(!/^Cloth_[A-Za-z0-9_-]+$/.test(String(material.name||'')))return false;const base=captureAuthorColor(material);if(!base)return false;let target=null;try{target=typeof material.color.clone==='function'?material.color.clone():null;if(!target?.set)return false;target.set(hex);}catch{return false;}const amount=Math.max(0,Math.min(1,Number(blend)||0)),keep=1-amount,r=base[0]*keep+(Number(target.r)||0)*amount,g=base[1]*keep+(Number(target.g)||0)*amount,b=base[2]*keep+(Number(target.b)||0)*amount;try{if(typeof material.color.setRGB==='function')material.color.setRGB(r,g,b);else{material.color.r=r;material.color.g=g;material.color.b=b;}material.needsUpdate=true;return true;}catch{return false;}}
  function tintModule(root,hex){if(!hex||!root?.traverse)return 0;const seen=new Set();let changed=0;root.traverse(node=>{const materials=Array.isArray(node?.material)?node.material:(node?.material?[node.material]:[]);for(const material of materials){if(!material||seen.has(material)||!material.color?.set)continue;seen.add(material);try{if(/^Cloth_[A-Za-z0-9_-]+$/.test(String(material.name||''))){if(tintClothingMaterial(material,hex))changed++;continue;}material.color.set(hex);material.needsUpdate=true;changed++;}catch{}}});return changed;}
  function recipeKey(mapped){return JSON.stringify({m:mapped?.morphs||{},e:mapped?.expressionMorphs||{},h:mapped?.hair||'',hs:mapped?.hairStyle||'',hw:mapped?.hairWave||0,ht:mapped?.hairTint||'',c:mapped?.clothing||[],ct:mapped?.clothingTint||'',a:mapped?.accessory||'none',s:mapped?.skinTint||'',eye:mapped?.eyeTint||'',eyeRight:mapped?.eyeTintRight||'',eyeGlow:mapped?.eyeGlow||false});}

  function compositionStructure(mapped){return JSON.stringify({hair:mapped?.hair||'',hairStyle:mapped?.hairStyle||'',hairWave:mapped?.hairWave||0,clothing:mapped?.clothing||[],accessory:mapped?.accessory||'none'});}

  function blendMorphs(from,to,progress){const t=Math.max(0,Math.min(1,Number(progress)||0)),e=t*t*(3-2*t),out={};for(const key of new Set([...Object.keys(from||{}),...Object.keys(to||{})]))out[key]=(Number(from?.[key])||0)*(1-e)+(Number(to?.[key])||0)*e;return out;}
  async function animateMorphs(renderer,char,mapped,joints,token){
    const root=renderer.root,modules=renderer.__unifiedCustomModules||[],runtime=window.RoleUnifiedHumanRuntime;
    const from=renderer.__unifiedMorphWeights||renderer.__unifiedMapped?.morphs||{},to=mapped.morphs||{};
    let start=null,state;
    do{
      const now=await new Promise(resolve=>window.requestAnimationFrame(resolve));
      if(!isCurrentLoad(renderer,root,char.id,token))return null;
      if(start===null)start=now;const t=Math.min(1,(now-start)/160),weights=blendMorphs(from,to,t);
      renderer.faceRig?.reset?.();window.RoleNaturalPose?.reset?.(root);
      state=runtime.applyCandidateState(root,modules,joints,weights);renderer.__unifiedMorphWeights=weights;
      window.RoleNaturalPose?.applyNaturalPose?.(root,renderer.modules?.THREE);
      renderer.renderFrame?.(window.RolePresence?.getDefault?.()?.frame?.()||{});
      if(t>=1)return state;
    }while(true);
  }

  async function updateUnifiedCandidate(renderer,char,mapped,key,token){
    const root=renderer.root;
    if((!renderer.__unifiedMorphWeights||JSON.stringify(renderer.__unifiedMorphWeights)===JSON.stringify(mapped.morphs||{}))&&JSON.stringify(renderer.__unifiedMapped?.morphs||{})===JSON.stringify(mapped.morphs||{})&&JSON.stringify(renderer.__unifiedMapped?.expressionMorphs||{})===JSON.stringify(mapped.expressionMorphs||{})){
      if(!isCurrentLoad(renderer,root,char.id,token))return false;
      const modules=renderer.__unifiedCustomModules||[];let index=0;
      if(mapped.hair)tintModule(modules[index++],mapped.hairTint);
      const targets=new Set(mapped.clothingTintTargets||[]);for(const id of mapped.clothing||[]){const module=modules[index++];if(targets.has(id))tintModule(module,mapped.clothingTint);}
      requireSkinTint(root,mapped.skinTint);if(mapped.eyeTint){window.RoleEyeColor?.requireNamedMaterialTint?.(root,'Iris',mapped.eyeTint);window.RoleEyeColor?.applyEyeEffects?.(root,mapped);}
      renderer.renderCharacter=char;renderer.__unifiedMapped=mapped;renderer.__unifiedCustomKey=key;renderer.loop?.start?.();return true;
    }
    const joints=await loadJoints();
    if(!isCurrentLoad(renderer,root,char.id,token))return false;
    const runtime=window.RoleUnifiedHumanRuntime,modules=renderer.__unifiedCustomModules||[];
    renderer.loop?.stop?.();renderer.faceRig?.reset?.();window.RoleNaturalPose?.reset?.(root);
    const state=typeof window.requestAnimationFrame==='function'?await animateMorphs(renderer,char,mapped,joints,token):runtime.applyCandidateState(root,modules,joints,mapped.morphs||{});
    if(!state)return false;renderer.__unifiedMorphWeights=mapped.morphs||{};
    if(!state.morphs?.applied||state.skeleton?.moved<20||state.skeleton?.missingBones?.length)throw new Error('3D人物更新未通过骨架合同');
    let index=0;if(mapped.hair&&tintModule(modules[index++],mapped.hairTint)<1)throw new Error('发色材质不可用');
    const targets=new Set(mapped.clothingTintTargets||[]);
    for(const id of mapped.clothing||[]){const module=modules[index++];if(targets.has(id)&&tintModule(module,mapped.clothingTint)<1)throw new Error('服装颜色材质不可用');}
    requireSkinTint(root,mapped.skinTint);if(mapped.eyeTint){window.RoleEyeColor?.requireNamedMaterialTint?.(root,'Iris',mapped.eyeTint);window.RoleEyeColor?.applyEyeEffects?.(root,mapped);}
    const face=createCompositeFaceRig(root,renderer.faceRig?.headObject,window.RoleFaceRig,mapped.expressionMorphs||{});
    if(!face||face.meshes.length<2)throw new Error('多网格表情合同不可用');
    renderer.faceRig=face;renderer.renderCharacter=char;renderer.__unifiedCustomKey=key;renderer.__unifiedMapped=mapped;renderer.__unifiedMorphWeights=mapped.morphs||{};renderer.__unifiedCandidateState=state;
    window.RoleNaturalPose?.applyNaturalPose?.(root,renderer.modules?.THREE);renderer.resize?.();renderer.frameModel?.(root,'full');renderer.loop?.start?.();return true;
  }

  async function swapUnifiedModules(renderer,char,mapped,key,token){
    const root=renderer.root,oldModules=renderer.__unifiedCustomModules||[],oldAccessory=renderer.__unifiedCustomAccessory;
    const runtime=window.RoleUnifiedHumanRuntime,items=[];
    if(mapped.hair)items.push({id:mapped.hair,kind:'hair',url:HAIR_PATH(mapped.hair)});
    for(const id of mapped.clothing||[])items.push({id,kind:'clothing',url:CLOTHING_PATH(id)});
    const loaded=[];let accessory=null,committed=false,touched=false;
    try{
      // Keep the visible character alive while replacement meshes are fetched.
      for(const item of items){
        const gltf=await loadModule(renderer,item.url);loaded.push(gltf.scene);
        if(!isCurrentLoad(renderer,root,char.id,token))return false;
      }
      const [wardrobe,joints]=await Promise.all([loadWardrobe(),loadJoints()]);if(!isCurrentLoad(renderer,root,char.id,token))return false;
      const targets=new Set(mapped.clothingTintTargets||[]);touched=true;
      for(let i=0;i<items.length;i++){
        const item=items[i],module=loaded[i];
        if(item.kind==='hair')window.RoleHairStyling?.apply?.(module,renderer.modules.THREE,mapped.hairStyle,mapped.hairWave);
        const required=item.kind==='hair'?['gender_female','gender_male','height_short','height_tall','face_forehead_incr']:['gender_female','gender_male','height_short','height_tall'];
        runtime.attachModule(root,module,mapped.morphs||{},required);
        if(item.kind==='hair')tintModule(module,mapped.hairTint);else if(targets.has(item.id))tintModule(module,mapped.clothingTint);
      }
      if(mapped.accessory&&mapped.accessory!=='none'){
        accessory=window.RoleAccessoryGeometry?.attach?.(root,renderer.modules.THREE,mapped.accessory);
        if(!accessory)throw new Error('配饰加载失败');
      }
      // Commit all replacements in one task, so there is no empty-character frame.
      for(const old of oldModules)root.remove(old);
      oldAccessory?.parent?.remove(oldAccessory);
      renderer.__unifiedCustomModules=loaded;renderer.__unifiedCustomAccessory=accessory;
      runtime.applyWardrobeOcclusion(root,items.map((item,i)=>({...item,root:loaded[i]})).filter(item=>item.kind==='clothing'),wardrobe);
      renderer.faceRig?.reset?.();window.RoleNaturalPose?.reset?.(root);
      const state=runtime.applyCandidateState(root,loaded,joints,mapped.morphs||{});
      requireSkinTint(root,mapped.skinTint);if(mapped.eyeTint){window.RoleEyeColor?.requireNamedMaterialTint?.(root,'Iris',mapped.eyeTint);window.RoleEyeColor?.applyEyeEffects?.(root,mapped);}
      renderer.faceRig=createCompositeFaceRig(root,renderer.faceRig?.headObject,window.RoleFaceRig,mapped.expressionMorphs||{});
      renderer.renderCharacter=char;renderer.__unifiedMapped=mapped;renderer.__unifiedCustomKey=key;renderer.__unifiedCandidateState=state;
      window.RoleNaturalPose?.applyNaturalPose?.(root,renderer.modules.THREE);renderer.loop?.start?.();
      committed=true;for(const old of oldModules)disposeScene(old);if(oldAccessory)disposeScene(oldAccessory);
      return true;
    }finally{
      if(!committed){for(const module of loaded){root.remove(module);disposeScene(module);}if(accessory){accessory.parent?.remove(accessory);disposeScene(accessory);}if(touched&&renderer.root===root){for(const old of oldModules)if(!old.parent)root.add(old);if(oldAccessory&&!oldAccessory.parent){const head=window.RoleAccessoryGeometry?.findBone?.(root,['head']);head?.add(oldAccessory);}renderer.__unifiedCustomModules=oldModules;renderer.__unifiedCustomAccessory=oldAccessory;}}
    }
  }

  async function loadUnifiedCandidate(renderer,char,mapped,key,originalLoad,token){
    let baseRoot=null;const attached=[];
    renderer.ensureStage?.();renderer.stage?.classList.add('assembling','active');renderer.setStatus?.('正在组合3D人物…','loading');
    try{
      if(!qualificationFor(char))return false;
      if(renderer.currentId===char.id&&renderer.root&&renderer.__unifiedCustomKey!==key){resetUnifiedState(renderer);renderer.clearModel?.();}
      const ok=await originalLoad.call(renderer,char);if(!ok||!renderer.root||renderer.currentId!==char.id||renderer.__unifiedLoadToken!==token||!qualificationFor(char))return false;
      renderer.loop?.stop?.();renderer.setStatus?.('正在组合3D人物…','loading');baseRoot=renderer.root;const oldFaceRig=renderer.faceRig;resetLegacyRigs(renderer);window.RoleNaturalPose?.reset?.(baseRoot);const runtime=window.RoleUnifiedHumanRuntime;runtime.applyMorphWeights(baseRoot,{}, {reset:true});
      const modules=[];if(mapped.hair)modules.push({kind:'hair',id:mapped.hair,url:HAIR_PATH(mapped.hair)});for(const id of mapped.clothing||[])modules.push({kind:'clothing',id,url:CLOTHING_PATH(id)});
      const clothingTintTargets=new Set(Array.isArray(mapped.clothingTintTargets)?mapped.clothingTintTargets:[]);
      for(const item of modules){
        if(!isCurrentLoad(renderer,baseRoot,char.id,token)||!qualificationFor(char))return false;
        const gltf=await loadModule(renderer,item.url);if(!isCurrentLoad(renderer,baseRoot,char.id,token)||!qualificationFor(char)){disposeScene(gltf.scene);return false;}
        if(item.kind==='hair')window.RoleHairStyling?.apply?.(gltf.scene,renderer.modules.THREE,mapped.hairStyle,mapped.hairWave);
        if(item.kind==='hair'&&mapped.hairTint&&tintModule(gltf.scene,mapped.hairTint)<1){disposeScene(gltf.scene);throw new Error('hair tint material unavailable');}
        if(item.kind==='clothing'&&clothingTintTargets.has(item.id)&&mapped.clothingTint&&tintModule(gltf.scene,mapped.clothingTint)<1){disposeScene(gltf.scene);throw new Error(`clothing tint material unavailable: ${item.id}`);}
        const required=item.kind==='hair'?['gender_female','gender_male','weight_min','weight_max','height_short','height_tall','face_forehead_decr','face_forehead_incr','face_ear_size_decr','face_ear_size_incr']:['gender_female','gender_male','weight_min','weight_max','height_short','height_tall'];runtime.attachModule(baseRoot,gltf.scene,mapped.morphs||{},required);attached.push(gltf.scene);
      }
      const [joints,wardrobe]=await Promise.all([loadJoints(),loadWardrobe()]);if(!isCurrentLoad(renderer,baseRoot,char.id,token)||!qualificationFor(char))return false;const state=runtime.applyCandidateState(baseRoot,attached,joints,mapped.morphs||{});if(!state.morphs?.applied)throw new Error('identity morphs were not applied');if(state.skeleton?.moved<20||state.skeleton?.missingBones?.length)throw new Error(`joint sidecar application failed: ${state.skeleton?.missingBones?.join(',')||'no moved skeleton'}`);
      const accessoryId=mapped.accessory||'none';let accessory=null;if(accessoryId!=='none'){const accessoryApi=window.RoleAccessoryGeometry;if(!accessoryApi?.attach)throw new Error('accessory geometry runtime unavailable');accessory=accessoryApi.attach(baseRoot,renderer.modules?.THREE,accessoryId);if(!accessory)throw new Error(`accessory attachment failed: ${accessoryId}`);}
      const clothingRoots=modules.map((item,index)=>({...item,root:attached[index]})).filter(item=>item.kind==='clothing');runtime.applyWardrobeOcclusion(baseRoot,clothingRoots,wardrobe);oldFaceRig?.reset?.();const compositeFace=createCompositeFaceRig(baseRoot,oldFaceRig?.headObject,window.RoleFaceRig,mapped.expressionMorphs||{});if(!compositeFace||compositeFace.meshes.length<2)throw new Error('multi-mesh face rig unavailable');compositeFace.reset();renderer.faceRig=compositeFace;requireSkinTint(baseRoot,mapped.skinTint);window.RoleEyeColor?.applyEyeEffects?.(baseRoot,mapped);renderer.__unifiedCustomModules=attached;renderer.__unifiedCustomAccessory=accessory;renderer.__unifiedCustomKey=key;renderer.__unifiedMapped=mapped;renderer.__unifiedMorphWeights=mapped.morphs||{};renderer.__unifiedCandidateState=state;renderer.renderCharacter=char;window.RoleNaturalPose?.applyNaturalPose?.(baseRoot,renderer.modules?.THREE);renderer.resize?.();renderer.frameModel?.(baseRoot,'full');renderer.stage?.classList.remove('assembling');renderer.setStatus?.('');renderer.loop?.start?.();return true;
    }catch(error){console.warn('统一3D候选未通过运行时合同，保持关闭。',error);if(renderer.__unifiedLoadToken===token){resetUnifiedState(renderer);renderer.clearModel?.();renderer.stage?.classList.remove('assembling');renderer.stage?.classList.add('active');renderer.setStatus?.(error?.message||'3D人物组合失败，请重试','error');}return false;}
  }

  function patchRenderer(){const proto=window.RoleHumanRenderer?.HumanRenderer?.prototype;if(!proto?.loadCharacter||proto.loadCharacter.__unifiedCustom)return false;const originalLoad=proto.loadCharacter,originalSync=proto.syncCharacter;proto.loadCharacter=async function(char){if(!isCustom(char)){nextLoadToken(this);resetUnifiedState(this);this.stage?.classList.remove('assembling');return originalLoad.call(this,char);}if(!decorate(char)){nextLoadToken(this);cancelRendererLoad(this);resetUnifiedState(this);this.clearModel?.();return false;}const mapped=plan(char),runtime=window.RoleUnifiedHumanRuntime;if(!mapped||!runtime?.attachModule||!runtime?.applyCandidateState){nextLoadToken(this);cancelRendererLoad(this);resetUnifiedState(this);this.clearModel?.();return false;}const key=recipeKey(mapped),pendingKey=`${char.id}|${key}`;if(this.currentId===char.id&&this.root&&this.__unifiedCustomKey===key&&!this.__unifiedPendingPromise){this.renderCharacter=char;this.loop?.start?.();return true;}if(this.__unifiedPendingKey===pendingKey&&this.__unifiedPendingPromise)return this.__unifiedPendingPromise;const token=nextLoadToken(this),task=(async()=>{if(this.currentId===char.id&&this.root&&Array.isArray(this.__unifiedCustomModules)&&compositionStructure(this.__unifiedMapped)!==compositionStructure(mapped)){try{return await swapUnifiedModules(this,char,mapped,key,token);}catch(error){this.setStatus?.('外观资源切换失败，请重试','error');return false;}}if(this.currentId===char.id&&this.root&&Array.isArray(this.__unifiedCustomModules)&&compositionStructure(this.__unifiedMapped)===compositionStructure(mapped)){try{return await updateUnifiedCandidate(this,char,mapped,key,token);}catch(error){console.warn('3D人物增量更新失败，重新组合。',error);}}return loadUnifiedCandidate(this,char,mapped,key,originalLoad,token);})();this.__unifiedPendingKey=pendingKey;this.__unifiedPendingPromise=task;try{return await task;}finally{if(this.__unifiedPendingPromise===task){this.__unifiedPendingPromise=null;this.__unifiedPendingKey='';}}};proto.loadCharacter.__unifiedCustom=true;proto.syncCharacter=async function(...args){if(document.body?.classList.contains('creator-fullscreen-3d'))return Boolean(this.root);const char=this.currentCharacter?.()||currentChar();if(!isCustom(char))return originalSync.apply(this,args);if(!decorate(char)||ensureDefault3D(char)!=='3d'){nextLoadToken(this);cancelRendererLoad(this);resetUnifiedState(this);this.clearModel?.();return false;}return this.loadCharacter(char);};proto.syncCharacter.__unifiedCustom=true;return true;}
  function installModeButton(){if(window.LIAOTIAN_3D_ONLY){document.getElementById('roleChatModeBtn')?.remove();return false;}const button=document.getElementById('roleChatModeBtn')||window.RoleChatMode?.ensureButton?.();if(!button)return false;if(button.dataset.unifiedCustom==='1')return true;button.dataset.unifiedCustom='1';button.addEventListener('click',event=>{const char=currentChar();if(!isCustom(char)||!qualificationFor(char))return;event.preventDefault();event.stopImmediatePropagation();const next=ensureDefault3D(char)==='3d'?'text':'3d';setMode(char,next);updateModeButton();window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();},true);return true;}
  function updateModeButton(){if(window.LIAOTIAN_3D_ONLY){document.getElementById('roleChatModeBtn')?.remove();return;}const char=currentChar(),button=document.getElementById('roleChatModeBtn');if(!button)return;if(!isCustom(char)){window.RoleChatMode?.updateButton?.();return;}if(!decorate(char)){button.hidden=true;button.textContent='3D聊天';button.setAttribute('aria-pressed','false');return;}const is3d=ensureDefault3D(char)==='3d';button.hidden=false;button.textContent=is3d?'普通聊天':'3D聊天';button.setAttribute('aria-pressed',String(is3d));button.title=is3d?'切换回普通文字聊天':'显示当前自定义3D角色';}
  function decorateAll(){if(typeof characters==='undefined'||!Array.isArray(characters))return;characters.forEach(decorate);}
  function patchSwitch(){if(typeof switchCharacter!=='function'||switchCharacter.__unifiedCustom)return false;const base=switchCharacter,wrapped=function(...args){const result=base.apply(this,args),char=currentChar();decorate(char);requestAnimationFrame(()=>{installModeButton();updateModeButton();window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();});return result;};wrapped.__unifiedCustom=true;switchCharacter=wrapped;return true;}
  function boot(){if(typeof window==='undefined'||typeof document==='undefined'||(!gateQualification()&&window.__ROLE_BASE_RECIPE_QUALIFICATION?.ok!==true))return false;if(!window.RoleHumanRenderer||!window.RoleUnifiedHumanRuntime||!window.RoleUnifiedHumanRecipe||!window.RoleAccessoryGeometry||typeof switchCharacter!=='function'){setTimeout(boot,80);return false;}decorateAll();patchRenderer();patchSwitch();installModeButton();updateModeButton();requestAnimationFrame(()=>window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());return true;}
  const api=Object.freeze({STATUS,DEVICE_STATUS,PRODUCTION_STATUS,ASSET_ID,BASE_ASSET,JOINTS_PATH,CLOTHING_TINT_BLEND,isCustom,isFixedBaseRole,qualificationFor,gateQualification,statusForQualification,decorate,plan,walkRoot,collectFaceMeshes,mergeExpressionBaseline,createCompositeFaceRig,resetLegacyRigs,resetUnifiedState,nextLoadToken,cancelRendererLoad,isCurrentLoad,loadJoints,loadWardrobe,tintSkin,requireSkinTint,captureAuthorColor,tintClothingMaterial,tintModule,recipeKey,compositionStructure,blendMorphs,animateMorphs,updateUnifiedCandidate,swapUnifiedModules,loadUnifiedCandidate,ensureDefault3D,setMode,patchRenderer,patchSwitch,updateModeButton,boot});
  if(typeof window!=='undefined'){window.RoleUnifiedCustomChat=api;boot();}if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
