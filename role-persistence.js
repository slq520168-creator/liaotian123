(() => {
  const DB_NAME='liaotian123-local';
  const STORE='prefs';
  const KEY='user-avatar';
  const isAvatar=value=>typeof value==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/i.test(value);
  const openDb=()=>new Promise((resolve,reject)=>{
    if(!('indexedDB'in window)){resolve(null);return;}
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  async function read(){
    try{
      const db=await openDb();if(!db)return '';
      return await new Promise(resolve=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(KEY);req.onsuccess=()=>resolve(req.result||'');req.onerror=()=>resolve('')});
    }catch(error){return ''}
  }
  async function write(value){
    if(!isAvatar(value))return;
    try{
      const db=await openDb();if(!db)return;
      await new Promise(resolve=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve()});
    }catch(error){}
  }
  async function boot(){
    if(typeof userAvatar==='undefined'||typeof renderMessages!=='function'||typeof updateUserAvatarPreview!=='function')return setTimeout(boot,80);
    const saved=await read();
    if((!isAvatar(userAvatar)||userAvatar===DEFAULT_USER_AVATAR)&&isAvatar(saved)){
      userAvatar=saved;
      try{localStorage.setItem('liaotian_user_avatar',saved)}catch(error){}
      updateUserAvatarPreview();
      renderMessages();
    }else if(isAvatar(userAvatar)){
      write(userAvatar);
    }
    const preview=document.getElementById('userAvatarPreview');
    if(preview){
      new MutationObserver(()=>{
        const src=preview.getAttribute('src')||'';
        if(isAvatar(src))write(src);
      }).observe(preview,{attributes:true,attributeFilter:['src']});
    }
    const upload=document.getElementById('userAvatarUpload');
    upload?.addEventListener('change',()=>setTimeout(()=>{if(isAvatar(userAvatar))write(userAvatar)},700));
    const roleCode=document.getElementById('roleCodeUpload');
    if(roleCode)roleCode.accept='.json,.json5,.js,.txt,.role,application/json,text/plain,text/javascript';
    window.addEventListener('pagehide',()=>{if(isAvatar(userAvatar))write(userAvatar)});
  }
  boot();
})();
