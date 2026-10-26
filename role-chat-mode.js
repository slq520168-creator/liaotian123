(() => {
  'use strict';
  const MODES=Object.freeze(['3d']);
  const ACTIONS=Object.freeze(['自然站立','放松呼吸','专注交流','轻微转身']);
  const UNIFIED_CUSTOM_ASSET_ID='unified-charactercreator';
  const CUSTOM_READY_STATUSES=Object.freeze(['production','device-qualified']);
  const SPEC_START='【角色自定义设定】';
  const SPEC_END='【自定义设定结束】';

  function isCustomCharacter(char){return Boolean(char&&!char.isPreset&&/^custom_[a-z0-9_-]+$/i.test(String(char.id||'')));}
  function is3DRole(char){
    if(!char)return false;
    if(char.isPreset||char.roleKind==='3d')return true;
    if(typeof char.personality==='string'&&char.personality.includes(SPEC_START)&&char.personality.includes(SPEC_END))return true;
    const asset=char.humanAsset||char.model3d||char.model3D;
    if(!asset)return false;
    if(char.humanAssetStatus==='production')return true;
    return char.humanAssetStatus==='device-qualified'&&char.humanAssetId===UNIFIED_CUSTOM_ASSET_ID;
  }
  function gateQualification(){if(typeof window==='undefined')return'';const result=window.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT;if(result?.ok!==true)return'';return result.qualification==='global'||result.qualification==='device'?result.qualification:'';}
  function isQualifiedCustomAsset(char){if(!char||!CUSTOM_READY_STATUSES.includes(String(char.humanAssetStatus||'')))return false;if(char.humanAssetStatus==='production')return true;return char.humanAssetStatus==='device-qualified'&&char.humanAssetId===UNIFIED_CUSTOM_ASSET_ID&&gateQualification()==='device';}
  function manifestAsset(char){if(!char?.id||typeof window==='undefined')return null;const tiers=window.LIAOTIAN_HUMAN_ASSETS?.[char.id];if(!tiers||typeof tiers!=='object')return null;const asset=tiers.full||tiers.upper||tiers.portrait||null;return asset&&typeof asset==='object'&&asset.url?asset:null;}
  function attachManifestAsset(char){if(!char?.isPreset)return null;const asset=manifestAsset(char);if(!asset)return null;char.roleKind='3d';char.humanAsset=asset;char.humanAssetStatus='production';return asset;}
  function isProductionReady(char){if(!char?.id||!is3DRole(char))return false;if(char.isPreset)return Boolean(attachManifestAsset(char));if(!isCustomCharacter(char))return false;if(typeof window!=='undefined'&&window.RoleUnifiedCustomChat?.isFixedBaseRole?.(char))return true;const asset=char.humanAsset||char.model3d||char.model3D;return Boolean(asset&&isQualifiedCustomAsset(char));}

  function normalizeMode(){return'3d';}
  function defaultMode(){return'3d';}
  function storedMode(){return'3d';}
  function saveMode(){return'3d';}
  function recipeFor(char){if(typeof window!=='undefined'&&window.RoleVisualRecipe?.forCharacter)return window.RoleVisualRecipe.forCharacter(char);return char?.visualRecipe||{};}
  function safeActionTransform(action,frame={},now=0){const t=Number.isFinite(Number(now))?Number(now):0,breathing=Math.max(-.006,Math.min(.006,Number(frame?.breathing)||0));if(action==='放松呼吸')return Object.freeze({y:breathing,rotationY:Math.sin(t/4200)*.004});if(action==='专注交流')return Object.freeze({y:breathing*.45,rotationY:Math.sin(t/3000)*.008});if(action==='轻微转身')return Object.freeze({y:breathing*.35,rotationY:Math.sin(t/3600)*.035});return Object.freeze({y:0,rotationY:0});}
  function activeCharacter(){if(typeof characters==='undefined'||typeof activeCharacterId==='undefined')return null;return characters.find(item=>item.id===activeCharacterId)||null;}
  function shouldRender3D(char=activeCharacter()){return isProductionReady(char);}
  function hideTextStage(renderer){renderer?.loop?.stop?.();if(renderer?.stage){renderer.stage.classList.remove('active','loading','error');renderer.setStatus?.('');}}
  function cancelDeferredTextCleanup(renderer){const job=renderer?.__chatModeDeferredClear;if(!job)return false;if(job.kind==='idle'&&typeof cancelIdleCallback==='function')cancelIdleCallback(job.id);if(job.kind==='timer')clearTimeout(job.id);renderer.__chatModeDeferredClear=null;return true;}
  function deferTextModeCleanup(renderer,char){if(!renderer)return false;cancelDeferredTextCleanup(renderer);renderer.cancelPendingLoad?.();hideTextStage(renderer);const expectedId=String(char?.id||'');const run=()=>{renderer.__chatModeDeferredClear=null;const current=renderer.currentCharacter?.()||activeCharacter();if(!current||String(current.id||'')!==expectedId||shouldRender3D(current))return;renderer.cancelPendingLoad?.();renderer.clearModel?.();};if(typeof requestIdleCallback==='function')renderer.__chatModeDeferredClear={kind:'idle',id:requestIdleCallback(run,{timeout:1200})};else renderer.__chatModeDeferredClear={kind:'timer',id:setTimeout(run,450)};return true;}
  function ensureButton(){if(typeof document!=='undefined')document.getElementById('roleChatModeBtn')?.remove();return null;}
  function updateButton(){ensureButton();return false;}
  function patchRenderer(){if(typeof window==='undefined')return false;const proto=window.RoleHumanRenderer?.HumanRenderer?.prototype;if(!proto?.syncCharacter||!proto?.renderFrame)return false;const currentSync=proto.syncCharacter;if(!currentSync.__threeDOnlyGate){const syncWrapped=function(...args){const char=this.currentCharacter?.()||activeCharacter();if(!shouldRender3D(char)){deferTextModeCleanup(this,char);return Promise.resolve(false);}cancelDeferredTextCleanup(this);attachManifestAsset(char);return currentSync.apply(this,args);};syncWrapped.__threeDOnlyGate=true;proto.syncCharacter=syncWrapped;}const currentRender=proto.renderFrame;if(!currentRender.__creatorMotion){const renderWrapped=function(frame={}){const char=this.renderCharacter||this.currentCharacter?.()||activeCharacter(),recipe=recipeFor(char);if(this.root){if(this.__chatModeRoot!==this.root){this.__chatModeRoot=this.root;this.__chatModeBaseY=Number(this.baseRootY??this.root.position?.y)||0;this.__chatModeBaseRotationY=Number(this.root.rotation?.y)||0;}const motion=safeActionTransform(recipe.action,frame,typeof performance!=='undefined'?performance.now():Date.now());if(this.root.position)this.root.position.y=this.__chatModeBaseY+motion.y;if(this.root.rotation)this.root.rotation.y=this.__chatModeBaseRotationY+motion.rotationY;}return currentRender.call(this,{...frame,expressionPreset:recipe.expression||'自然'});};renderWrapped.__creatorMotion=true;proto.renderFrame=renderWrapped;}return true;}
  function patchSwitchCharacter(){if(typeof switchCharacter!=='function'||switchCharacter.__threeDOnlyUi)return false;const base=switchCharacter;const wrapped=function(...args){const result=base.apply(this,args);requestAnimationFrame(()=>{const char=activeCharacter();attachManifestAsset(char);ensureButton();window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();});return result;};wrapped.__threeDOnlyUi=true;switchCharacter=wrapped;return true;}
  function boot(){if(typeof window==='undefined'||typeof document==='undefined')return false;document.getElementById('ordinaryChatHint')?.remove();ensureButton();if(!patchRenderer()){let attempts=0;const retry=()=>{if(patchRenderer()){const char=activeCharacter();attachManifestAsset(char);window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();return;}if(++attempts<80)setTimeout(retry,80);};retry();}patchSwitchCharacter();attachManifestAsset(activeCharacter());requestAnimationFrame(()=>window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());window.addEventListener('humanmanifestready',()=>setTimeout(()=>{attachManifestAsset(activeCharacter());window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();},0));window.addEventListener('unifiedproductionready',()=>setTimeout(()=>window.__ROLE_HUMAN_RENDERER?.syncCharacter?.(),0));return true;}

  const api=Object.freeze({MODES,ACTIONS,UNIFIED_CUSTOM_ASSET_ID,CUSTOM_READY_STATUSES,isCustomCharacter,is3DRole,gateQualification,isQualifiedCustomAsset,manifestAsset,attachManifestAsset,isProductionReady,normalizeMode,defaultMode,storedMode,saveMode,recipeFor,safeActionTransform,shouldRender3D,hideTextStage,cancelDeferredTextCleanup,deferTextModeCleanup,ensureButton,updateButton,patchRenderer,patchSwitchCharacter,boot});
  if(typeof window!=='undefined'){window.RoleChatMode=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
