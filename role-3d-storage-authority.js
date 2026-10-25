(() => {
  'use strict';
  const ROLE_KIND='3d';
  const STORAGE_KEY='liaotian_3d_roles_v1';
  const LEGACY_KEY='liaotian_custom_chars';
  const LEGACY_MODE_PREFIX='liaotian_chat_mode_v2_';
  const LEGACY_MODE_INIT_PREFIX='liaotian_unified_mode_initialized_';
  const SPEC_START='【角色自定义设定】';
  const SPEC_END='【自定义设定结束】';
  const PRESET_3D_IDS=Object.freeze(['nuannuan']);

  const parseList=(key,store=localStorage)=>{
    try{const raw=JSON.parse(store.getItem(key)||'null');return Array.isArray(raw)?raw:null;}catch{return null;}
  };
  const has3DSpec=value=>typeof value?.personality==='string'&&value.personality.includes(SPEC_START)&&value.personality.includes(SPEC_END);
  const is3DRaw=value=>Boolean(value&&typeof value==='object'&&(value.roleKind===ROLE_KIND||has3DSpec(value)));
  const normalizeStored3D=list=>(Array.isArray(list)?list:[]).filter(is3DRaw).map(item=>({...item,roleKind:ROLE_KIND}));

  function pruneObjectStorage(key,allowed,store=localStorage){
    try{
      const value=JSON.parse(store.getItem(key)||'{}');
      if(!value||typeof value!=='object'||Array.isArray(value))return;
      const next=Object.fromEntries(Object.entries(value).filter(([id])=>allowed.has(id)));
      store.setItem(key,JSON.stringify(next));
    }catch{}
  }

  function removeLegacyModeState(store=localStorage){
    try{
      const keys=[];
      for(let i=0;i<store.length;i++){const key=store.key(i);if(key)keys.push(key);}
      for(const key of keys)if(key.startsWith(LEGACY_MODE_PREFIX)||key.startsWith(LEGACY_MODE_INIT_PREFIX))store.removeItem(key);
    }catch{}
  }

  function migrateStorage(store=localStorage){
    let saved=parseList(STORAGE_KEY,store);
    if(!saved)saved=normalizeStored3D(parseList(LEGACY_KEY,store)||[]);
    else saved=normalizeStored3D(saved);
    try{
      store.setItem(STORAGE_KEY,JSON.stringify(saved));
      // Base app reads this once during bootstrap. The wrapped saver removes it immediately afterwards.
      store.setItem(LEGACY_KEY,JSON.stringify(saved));
      removeLegacyModeState(store);
      const allowed=new Set([...PRESET_3D_IDS,...saved.map(item=>String(item.id||'')).filter(Boolean)]);
      pruneObjectStorage('liaotian_chat_histories',allowed,store);
      pruneObjectStorage('liaotian_role_memories',allowed,store);
      const active=store.getItem('liaotian_active_char');
      if(active&&!allowed.has(active))store.removeItem('liaotian_active_char');
    }catch{}
    return saved;
  }

  function restrictPresets(){
    if(typeof PRESET_CHARACTERS==='undefined'||!Array.isArray(PRESET_CHARACTERS))return 0;
    const allowed=new Set(PRESET_3D_IDS),kept=PRESET_CHARACTERS.filter(char=>allowed.has(String(char?.id||'')));
    for(const char of kept)char.roleKind=ROLE_KIND;
    PRESET_CHARACTERS.splice(0,PRESET_CHARACTERS.length,...kept);
    return kept.length;
  }

  function installNormalizer(){
    if(typeof normalizeCustomCharacter!=='function'||normalizeCustomCharacter.__threeDOnly)return false;
    const base=normalizeCustomCharacter;
    const wrapped=function(value){
      if(!is3DRaw(value))return null;
      const char=base.call(this,value);
      if(!char)return null;
      char.roleKind=ROLE_KIND;
      return char;
    };
    wrapped.__threeDOnly=true;
    normalizeCustomCharacter=wrapped;
    return true;
  }

  function current3DRoles(){
    if(typeof characters==='undefined'||!Array.isArray(characters))return [];
    return characters.filter(char=>char&&!char.isPreset&&char.roleKind===ROLE_KIND).map(char=>({...char,roleKind:ROLE_KIND}));
  }

  function installSaver(){
    if(typeof saveDataToStorage!=='function'||saveDataToStorage.__threeDOnly)return false;
    const base=saveDataToStorage;
    const wrapped=function(...args){
      const ok=base.apply(this,args);
      try{
        localStorage.setItem(STORAGE_KEY,JSON.stringify(current3DRoles()));
        localStorage.removeItem(LEGACY_KEY);
        removeLegacyModeState(localStorage);
      }catch{}
      return ok;
    };
    wrapped.__threeDOnly=true;
    saveDataToStorage=wrapped;
    return true;
  }

  function relabelUI(){
    const presetTitle=document.getElementById('presetRoleTitle');
    if(presetTitle)presetTitle.textContent='3D角色';
    const customList=document.getElementById('customCharacterList');
    if(customList?.previousElementSibling)customList.previousElementSibling.textContent='我的3D角色';
    const create=document.getElementById('openCreateModalBtn');
    if(create)create.innerHTML='<span class="icon">+</span> 创建3D角色';
    document.getElementById('ordinaryChatHint')?.remove();
    document.getElementById('roleChatModeBtn')?.remove();
  }

  function bootBeforeApp(){
    restrictPresets();
    migrateStorage(localStorage);
    installNormalizer();
    installSaver();
    relabelUI();
    window.LIAOTIAN_3D_ONLY=true;
    window.LIAOTIAN_3D_ROLE_STORAGE_KEY=STORAGE_KEY;
  }

  const api=Object.freeze({ROLE_KIND,STORAGE_KEY,LEGACY_KEY,PRESET_3D_IDS,has3DSpec,is3DRaw,normalizeStored3D,removeLegacyModeState,migrateStorage,restrictPresets,current3DRoles,bootBeforeApp});
  window.Role3DStorageAuthority=api;
  document.addEventListener('DOMContentLoaded',bootBeforeApp,{once:true});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
