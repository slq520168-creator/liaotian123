/** 唯一聊天接口配置入口。自己的部署只需替换 chatApiUrl，密钥留在后台。 */
window.LIAOTIAN_CONFIG = Object.freeze({
  chatApiUrl: 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast'
});
window.LIAOTIAN_HUMAN_ASSETS = window.LIAOTIAN_HUMAN_ASSETS || {};
window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES = window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES || [];

(() => {
  'use strict';
  const version='20261026-create3d41';
  const ROLE_KIND='3d';
  const STORAGE_KEY='liaotian_3d_roles_v1';
  const LEGACY_KEY='liaotian_custom_chars';
  const LEGACY_MODE_PREFIX='liaotian_chat_mode_v2_';
  const LEGACY_MODE_INIT_PREFIX='liaotian_unified_mode_initialized_';
  const SPEC_START='【角色自定义设定】';
  const SPEC_END='【自定义设定结束】';
  const PRESET_3D_IDS=Object.freeze(['nuannuan']);
  window.LIAOTIAN_BUILD_VERSION=version;
  window.LIAOTIAN_3D_ONLY=true;
  window.LIAOTIAN_3D_ROLE_STORAGE_KEY=STORAGE_KEY;

  /* 首屏直接禁止旧普通角色表单露出；只允许新的 3D 大厅和实时预览。 */
  const creatorShellStyle=document.createElement('style');
  creatorShellStyle.id='creator3dOnlyShellStyle';
  creatorShellStyle.textContent='#createRoleForm>:not(#roleCreatorStudio):not(#roleCreator3dPreview){display:none!important}#createRoleForm.creator-3d-only{display:block!important}';
  document.head.appendChild(creatorShellStyle);

  const parseList=(key,store=localStorage)=>{
    try{const raw=JSON.parse(store.getItem(key)||'null');return Array.isArray(raw)?raw:null;}catch{return null;}
  };
  const has3DSpec=value=>typeof value?.personality==='string'&&value.personality.includes(SPEC_START)&&value.personality.includes(SPEC_END);
  const is3DRaw=value=>Boolean(value&&typeof value==='object'&&(value.roleKind===ROLE_KIND||has3DSpec(value)));
  const normalizeStored3D=list=>(Array.isArray(list)?list:[]).filter(is3DRaw).map(item=>({...item,roleKind:ROLE_KIND}));

  function pruneObjectStorage(key,allowed,store=localStorage){
    try{const value=JSON.parse(store.getItem(key)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))return;store.setItem(key,JSON.stringify(Object.fromEntries(Object.entries(value).filter(([id])=>allowed.has(id)))));}catch{}
  }
  function removeLegacyModeState(store=localStorage){
    try{const keys=[];for(let i=0;i<store.length;i++){const key=store.key(i);if(key)keys.push(key);}for(const key of keys)if(key.startsWith(LEGACY_MODE_PREFIX)||key.startsWith(LEGACY_MODE_INIT_PREFIX))store.removeItem(key);}catch{}
  }
  function migrate3DRoles(store=localStorage){
    let saved=parseList(STORAGE_KEY,store);if(!saved)saved=normalizeStored3D(parseList(LEGACY_KEY,store)||[]);else saved=normalizeStored3D(saved);
    try{store.setItem(STORAGE_KEY,JSON.stringify(saved));store.setItem(LEGACY_KEY,JSON.stringify(saved));removeLegacyModeState(store);const allowed=new Set([...PRESET_3D_IDS,...saved.map(item=>String(item.id||'')).filter(Boolean)]);pruneObjectStorage('liaotian_chat_histories',allowed,store);pruneObjectStorage('liaotian_role_memories',allowed,store);const active=store.getItem('liaotian_active_char');if(active&&!allowed.has(active))store.removeItem('liaotian_active_char');}catch{}
    return saved;
  }
  function install3DOnlyAuthority(){
    if(typeof PRESET_CHARACTERS!=='undefined'&&Array.isArray(PRESET_CHARACTERS)){const allowed=new Set(PRESET_3D_IDS),kept=PRESET_CHARACTERS.filter(char=>allowed.has(String(char?.id||'')));for(const char of kept)char.roleKind=ROLE_KIND;PRESET_CHARACTERS.splice(0,PRESET_CHARACTERS.length,...kept);}
    migrate3DRoles(localStorage);
    if(typeof normalizeCustomCharacter==='function'&&!normalizeCustomCharacter.__threeDOnly){const baseNormalize=normalizeCustomCharacter;const wrappedNormalize=function(value){if(!is3DRaw(value))return null;const char=baseNormalize.call(this,value);if(!char)return null;char.roleKind=ROLE_KIND;return char;};wrappedNormalize.__threeDOnly=true;normalizeCustomCharacter=wrappedNormalize;}
    if(typeof saveDataToStorage==='function'&&!saveDataToStorage.__threeDOnly){const baseSave=saveDataToStorage;const wrappedSave=function(...args){const ok=baseSave.apply(this,args);try{const roles=typeof characters!=='undefined'&&Array.isArray(characters)?characters.filter(char=>char&&!char.isPreset&&char.roleKind===ROLE_KIND).map(char=>({...char,roleKind:ROLE_KIND})):[];localStorage.setItem(STORAGE_KEY,JSON.stringify(roles));localStorage.removeItem(LEGACY_KEY);removeLegacyModeState(localStorage);}catch{}return ok;};wrappedSave.__threeDOnly=true;saveDataToStorage=wrappedSave;}
    const presetTitle=document.getElementById('presetRoleTitle');if(presetTitle)presetTitle.textContent='3D角色';const customList=document.getElementById('customCharacterList');if(customList?.previousElementSibling)customList.previousElementSibling.textContent='我的3D角色';const create=document.getElementById('openCreateModalBtn');if(create)create.innerHTML='<span class="icon">+</span> 创建3D角色';document.getElementById('ordinaryChatHint')?.remove();document.getElementById('roleChatModeBtn')?.remove();
  }
  document.addEventListener('DOMContentLoaded',install3DOnlyAuthority,{once:true});

  for(const href of ['role-experience.css','role-voice-stage.css','chat-compact-ui.css']){const link=document.createElement('link');link.rel='stylesheet';link.href=href+'?v='+version;document.head.appendChild(link);}
  window.addEventListener('load',()=>{
    for(const src of ['role-experience.js','role-presence.js','role-3d-bases.js','role-visual-recipe.js','role-unified-human-recipe.js','role-skin-pbr-calibration.js','role-unified-human-runtime.js','role-accessory-geometry.js','role-face-rig.js','role-direct-viseme-rig.js','role-render-loop.js','role-body-rig.js','role-proportion-rig.js','role-appearance-rig.js','role-meshopt-support.js','role-human-manifest.js','role-asset-policy.js','role-human-asset-capability.js','role-human-renderer.js','role-stage-lighting.js','role-runtime-performance-budget.js','role-runtime-performance-attach.js','role-composite-direct-viseme.js','role-safe-skeleton-motion.js','role-natural-pose.js','role-fullscreen-stage.js','role-stage-controls.js','role-render-recipe-bridge.js','role-chat-mode.js','role-speech-chunker.js','role-voice-stage.js','role-voice-style.js','role-code-3d.js','role-persistence.js','role-builder.js','role-eye-color.js','role-creator-wizard.js','role-body-details.js','role-creator-identity.js','role-mobile-qa-diagnostics.js','role-unified-production-gate.js','role-creator-wizard-preview.js','role-creator-3d-preview-v2.js','role-creator-only-ui.js']){
      const script=document.createElement('script');script.src=src+'?v='+version;script.async=false;document.body.appendChild(script);
    }
  },{once:true});
})();
