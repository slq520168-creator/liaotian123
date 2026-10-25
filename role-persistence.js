(() => {
  const DB_NAME='liaotian123-local';
  const STORE='prefs';
  const USER_AVATAR_KEY='user-avatar';
  const THREE_D_ROLES_KEY='3d-roles-v1';
  const LEGACY_CUSTOM_ROLES_KEY='custom-roles';
  const ACTIVE_ROLE_KEY='active-role';
  const isAvatar=value=>typeof value==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/i.test(value);
  const is3DRole=char=>Boolean(char&&!char.isPreset&&char.roleKind==='3d');
  let customRolesTimer=0;
  const openDb=()=>new Promise((resolve,reject)=>{
    if(!('indexedDB'in window)){resolve(null);return;}
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  async function read(key){try{const db=await openDb();if(!db)return null;return await new Promise(resolve=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>resolve(null)});}catch{return null}}
  async function write(key,value){try{const db=await openDb();if(!db)return;await new Promise(resolve=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();tx.onabort=()=>resolve()});}catch{}}
  function currentCustomRoles(){if(typeof characters==='undefined')return[];return characters.filter(is3DRole).map(char=>({...char,roleKind:'3d'}));}
  function persistCustomRoles(){const list=currentCustomRoles();if(list.length||typeof characters!=='undefined')write(THREE_D_ROLES_KEY,list);write(LEGACY_CUSTOM_ROLES_KEY,[]);}
  function scheduleCustomRolesPersist(delay=180){if(customRolesTimer)clearTimeout(customRolesTimer);customRolesTimer=setTimeout(()=>{customRolesTimer=0;persistCustomRoles();},Math.max(0,Number(delay)||0));}
  async function restoreCustomRoles(){
    const saved=await read(THREE_D_ROLES_KEY);
    if(!Array.isArray(saved)||typeof characters==='undefined'||typeof normalizeCustomCharacter!=='function')return;
    const existing=new Set(characters.map(char=>char.id)),restored=[];
    for(const raw of saved){
      if(raw?.roleKind!=='3d')continue;
      const char=normalizeCustomCharacter({...raw,roleKind:'3d'});
      if(char&&!existing.has(char.id)){char.roleKind='3d';existing.add(char.id);restored.push(char);}
    }
    if(restored.length){characters=characters.concat(restored);if(typeof saveDataToStorage==='function')saveDataToStorage();if(typeof renderSidebar==='function')renderSidebar();}
  }
  async function restoreUserAvatar(){const saved=await read(USER_AVATAR_KEY);if((!isAvatar(userAvatar)||userAvatar===DEFAULT_USER_AVATAR)&&isAvatar(saved)){userAvatar=saved;try{localStorage.setItem('liaotian_user_avatar',saved)}catch{}updateUserAvatarPreview();renderMessages();}else if(isAvatar(userAvatar))write(USER_AVATAR_KEY,userAvatar);}
  function watchPersistence(){
    const preview=document.getElementById('userAvatarPreview');
    if(preview)new MutationObserver(()=>{const src=preview.getAttribute('src')||'';if(isAvatar(src))write(USER_AVATAR_KEY,src)}).observe(preview,{attributes:true,attributeFilter:['src']});
    const customList=document.getElementById('customCharacterList');
    if(customList)new MutationObserver(()=>scheduleCustomRolesPersist()).observe(customList,{childList:true,subtree:false});
    const upload=document.getElementById('userAvatarUpload');upload?.addEventListener('change',()=>setTimeout(()=>{if(isAvatar(userAvatar))write(USER_AVATAR_KEY,userAvatar)},700));
    const roleCode=document.getElementById('roleCodeUpload');if(roleCode)roleCode.accept='.json,.json5,.js,.txt,.role,application/json,text/plain,text/javascript';
  }
  function patchSwitchCharacter(){if(typeof switchCharacter!=='function'||switchCharacter.__persistence)return;const base=switchCharacter;const wrapped=function(...args){const result=base.apply(this,args);if(typeof activeCharacterId==='string'&&activeCharacterId){const id=activeCharacterId;setTimeout(()=>write(ACTIVE_ROLE_KEY,id),0);}return result};wrapped.__persistence=true;switchCharacter=wrapped;}
  async function restoreActiveRole(){const saved=await read(ACTIVE_ROLE_KEY);if(typeof saved==='string'&&characters.some(char=>char.id===saved)&&saved!==activeCharacterId&&typeof switchCharacter==='function')switchCharacter(saved,false);}
  async function boot(){
    if(typeof userAvatar==='undefined'||typeof characters==='undefined'||typeof renderMessages!=='function'||typeof updateUserAvatarPreview!=='function'||typeof normalizeCustomCharacter!=='function')return setTimeout(boot,80);
    await restoreUserAvatar();await restoreCustomRoles();await write(LEGACY_CUSTOM_ROLES_KEY,[]);patchSwitchCharacter();await restoreActiveRole();watchPersistence();persistCustomRoles();
    if(typeof activeCharacterId==='string'&&activeCharacterId)write(ACTIVE_ROLE_KEY,activeCharacterId);
    window.addEventListener('pagehide',()=>{if(customRolesTimer){clearTimeout(customRolesTimer);customRolesTimer=0;}if(isAvatar(userAvatar))write(USER_AVATAR_KEY,userAvatar);persistCustomRoles();if(typeof activeCharacterId==='string'&&activeCharacterId)write(ACTIVE_ROLE_KEY,activeCharacterId);});
    window.__ROLE_PERSISTENCE_READY=true;
  }
  boot();
})();
