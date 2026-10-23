(() => {
  'use strict';

  // Candidate-only runtime. Production config intentionally does NOT load this file
  // until real-device visual validation passes.
  const STATUS='unified-static';
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
  function recipe(char){return window.RoleVisualRecipe?.forCharacter?.(char)||char?.visualRecipe||{};}
  function plan(char){return window.RoleUnifiedHumanRecipe?.mapRecipe?.(recipe(char))||null;}
  function decorate(char){if(!isCustom(char))return false;char.humanAsset={...BASE_ASSET};char.humanAssetId=ASSET_ID;char.humanAssetStatus=STATUS;return true;}
  function ensureDefault3D(char){if(!isCustom(char)||typeof localStorage==='undefined')return'text';const initKey=INIT_PREFIX+char.id,modeKey=MODE_PREFIX+char.id;try{if(localStorage.getItem(initKey)!=='1'){localStorage.setItem(modeKey,'3d');localStorage.setItem(initKey,'1');}return localStorage.getItem(modeKey)==='text'?'text':'3d';}catch{return'3d';}}
  function setMode(char,mode){if(!isCustom(char)||typeof localStorage==='undefined')return;try{localStorage.setItem(MODE_PREFIX+char.id,mode==='text'?'text':'3d');localStorage.setItem(INIT_PREFIX+char.id,'1');}catch{}}
  function disposeScene(root){window.RoleHumanRenderer?.disposeObject?.(root);}

  async function loadModule(renderer,url){const loader=new renderer.modules.GLTFLoader();if(renderer.modules.MeshoptDecoder&&typeof loader.setMeshoptDecoder==='function')loader.setMeshoptDecoder(renderer.modules.MeshoptDecoder);return loader.loadAsync(url);}
  async function loadJoints(){if(!jointsPromise){jointsPromise=fetch(JOINTS_PATH,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`joint sidecar ${r.status}`);return r.json();}).then(data=>{if(!data?.morphs||!data?.bones)throw new Error('joint sidecar contract invalid');return data;}).catch(error=>{jointsPromise=null;throw error;});}return jointsPromise;}
  function tintSkin(root,hex){if(!hex||!root?.traverse)return;root.traverse(node=>{const materials=Array.isArray(node?.material)?node.material:(node?.material?[node.material]:[]);for(const material of materials){const name=String(material?.name||'').toLowerCase();if(!material?.color||!/(skin|body|face|head)/.test(name))continue;try{material.color.set(hex);material.needsUpdate=true;}catch{}}});}
  function recipeKey(mapped){return JSON.stringify({m:mapped?.morphs||{},h:mapped?.hair||'',c:mapped?.clothing||[],s:mapped?.skinTint||''});}

  function patchRenderer(){
    const proto=window.RoleHumanRenderer?.HumanRenderer?.prototype;
    if(!proto?.loadCharacter||proto.loadCharacter.__unifiedCustom)return false;
    const originalLoad=proto.loadCharacter,originalSync=proto.syncCharacter;
    proto.loadCharacter=async function(char){
      if(!isCustom(char)||char.humanAssetId!==ASSET_ID)return originalLoad.call(this,char);
      decorate(char);
      const mapped=plan(char),runtime=window.RoleUnifiedHumanRuntime;
      if(!mapped||!runtime?.attachModule||!runtime?.applyCandidateState)return false;
      const key=recipeKey(mapped);
      if(this.currentId===char.id&&this.root&&this.__unifiedCustomKey===key)return true;
      if(this.currentId===char.id&&this.root&&this.__unifiedCustomKey!==key)this.clearModel?.();

      const ok=await originalLoad.call(this,char);
      if(!ok||!this.root||this.currentId!==char.id)return false;
      const baseRoot=this.root,attached=[];
      runtime.applyMorphWeights(baseRoot,{}, {reset:true});
      try{
        const urls=[];
        if(mapped.hair)urls.push(HAIR_PATH(mapped.hair));
        for(const id of mapped.clothing||[])urls.push(CLOTHING_PATH(id));
        for(const url of urls){
          if(this.root!==baseRoot||this.currentId!==char.id)throw new Error('character changed during candidate load');
          const gltf=await loadModule(this,url);
          if(this.root!==baseRoot||this.currentId!==char.id){disposeScene(gltf.scene);throw new Error('character changed during module load');}
          runtime.attachModule(baseRoot,gltf.scene,mapped.morphs||{},[]);
          attached.push(gltf.scene);
        }
        const joints=await loadJoints();
        const state=runtime.applyCandidateState(baseRoot,attached,joints,mapped.morphs||{});
        if(!state.morphs?.applied)throw new Error('identity morphs were not applied');
        if(state.skeleton?.moved<20||state.skeleton?.missingBones?.length)throw new Error(`joint sidecar application failed: ${state.skeleton?.missingBones?.join(',')||'no moved skeleton'}`);
        tintSkin(baseRoot,mapped.skinTint);
        this.__unifiedCustomModules=attached;
        this.__unifiedCustomKey=key;
        this.__unifiedCandidateState=state;
        this.frameModel?.(baseRoot,'full');
        this.resize?.();
        return true;
      }catch(error){
        console.warn('统一3D候选未通过运行时合同，保持关闭。',error);
        this.clearModel?.();
        return false;
      }
    };
    proto.loadCharacter.__unifiedCustom=true;
    proto.syncCharacter=async function(...args){const char=this.currentCharacter?.()||currentChar();if(!isCustom(char))return originalSync.apply(this,args);decorate(char);if(ensureDefault3D(char)!=='3d'){this.clearModel?.();return false;}return this.loadCharacter(char);};
    proto.syncCharacter.__unifiedCustom=true;
    return true;
  }

  function installModeButton(){const button=document.getElementById('roleChatModeBtn')||window.RoleChatMode?.ensureButton?.();if(!button)return false;if(button.dataset.unifiedCustom==='1')return true;button.dataset.unifiedCustom='1';button.addEventListener('click',event=>{const char=currentChar();if(!isCustom(char))return;event.preventDefault();event.stopImmediatePropagation();const next=ensureDefault3D(char)==='3d'?'text':'3d';setMode(char,next);updateModeButton();window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();},true);return true;}
  function updateModeButton(){const char=currentChar(),button=document.getElementById('roleChatModeBtn');if(!button)return;if(!isCustom(char)){window.RoleChatMode?.updateButton?.();return;}decorate(char);const is3d=ensureDefault3D(char)==='3d';button.hidden=false;button.textContent=is3d?'普通聊天':'3D聊天';button.setAttribute('aria-pressed',String(is3d));button.title=is3d?'切换回普通文字聊天':'显示当前自定义3D角色';}
  function decorateAll(){if(typeof characters==='undefined'||!Array.isArray(characters))return;characters.forEach(decorate);}
  function patchSwitch(){if(typeof switchCharacter!=='function'||switchCharacter.__unifiedCustom)return false;const base=switchCharacter;const wrapped=function(...args){const result=base.apply(this,args);const char=currentChar();decorate(char);requestAnimationFrame(()=>{installModeButton();updateModeButton();window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();});return result;};wrapped.__unifiedCustom=true;switchCharacter=wrapped;return true;}
  function boot(){if(typeof window==='undefined'||typeof document==='undefined')return false;if(!window.RoleHumanRenderer||!window.RoleUnifiedHumanRuntime||!window.RoleUnifiedHumanRecipe||typeof switchCharacter!=='function'){setTimeout(boot,80);return false;}decorateAll();patchRenderer();patchSwitch();installModeButton();updateModeButton();requestAnimationFrame(()=>window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());return true;}

  const api=Object.freeze({STATUS,ASSET_ID,BASE_ASSET,JOINTS_PATH,isCustom,decorate,plan,loadJoints,ensureDefault3D,setMode,patchRenderer,patchSwitch,updateModeButton,boot});
  if(typeof window!=='undefined'){window.RoleUnifiedCustomChat=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
