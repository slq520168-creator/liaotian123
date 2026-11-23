(() => {
  'use strict';
  /* An avatar is rendered only when its role-specific, licensed .mavatar exists.
   * Static portraits are never presented as animated characters or videos. */
  const MANIFEST_URL='assets/role-models/manifest.json';
  const ENGINE_URL='vendor/mesh-avatar-element/standalone.js';
  const MODEL_RE=/^assets\/role-models\/[a-z0-9_-]+\.mavatar$/i;
  const ROLE_RE=/^[a-z0-9_-]{1,80}$/i;
  const LICENSE_RE=/^(OWNED|CC0|CC-BY-4\.0)$/i;
  let scene=null,element=null,active=false,characterId='',manifest=null;
  let loadId=0,latestReply='',speech=false,voicePulse=null,assetPromise=null,enginePromise=null;
  let lastError='',status='photo';
  const getChar=()=>typeof characters!=='undefined'&&typeof activeCharacterId==='string'?characters.find(char=>char.id===activeCharacterId):null;
  function sanitizeManifest(data) {
    if(!data||data.schema!==1||!data.models||typeof data.models!=='object'||Array.isArray(data.models))throw new TypeError('无效的角色模型目录');
    const models=Object.create(null);
    for(const [id,entry] of Object.entries(data.models)){
      if(!ROLE_RE.test(id)||!entry||typeof entry!=='object'||Array.isArray(entry))continue;
      if(!MODEL_RE.test(entry.src)||!LICENSE_RE.test(entry.license)||!String(entry.author||'').trim())continue;
      if(entry.src!=='assets/role-models/'+id+'.mavatar')continue;
      models[id]=Object.freeze({src:entry.src,license:entry.license,author:String(entry.author).slice(0,120)});
    }
    return Object.freeze({schema:1,models:Object.freeze(models)});
  }
  async function loadManifest() {
    if(manifest)return manifest;
    if(!assetPromise)assetPromise=fetch(MANIFEST_URL+'?v='+encodeURIComponent(window.LIAOTIAN_BUILD_VERSION||'1'),{credentials:'same-origin',cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('角色模型目录不可用');return r.json();})
      .then(sanitizeManifest)
      .catch(error=>{lastError=String(error?.message||error);return sanitizeManifest({schema:1,models:{}});});
    manifest=await assetPromise;
    return manifest;
  }
  function ensureEngine(){
    if(enginePromise)return enginePromise;
    enginePromise=new Promise((resolve,reject)=>{
      if(customElements.get('mesh-avatar'))return resolve(true);
      const script=document.createElement('script');
      script.type='module';script.src=ENGINE_URL;script.dataset.meshAvatarRuntime='1';
      script.onload=()=>customElements.whenDefined('mesh-avatar').then(()=>resolve(true),reject);
      script.onerror=()=>reject(new Error('2D角色运行时加载失败'));
      document.head.appendChild(script);
    }).catch(e=>{enginePromise=null;throw e;});
    return enginePromise;
  }
  function cancelPulse(){
    if(voicePulse!==null){clearTimeout(voicePulse);voicePulse=null;}
    try{element?.setVoiceLevel?.(0);}catch{}
  }
  function clearModel(){
    cancelPulse();
    if(element){
      try{element.avatar?.setSpeaking(false);}catch{}
      element.remove();element=null;
    }
    scene?.classList.remove('rd-has-mesh-avatar');
    status='photo';
  }
  function tone(text){
    const value=String(text||'').slice(-280);
    if(/(开心|喜欢|谢谢|想你|爱你|高兴|微笑|哈哈)/.test(value))return 'smile';
    if(/(难过|伤心|失望|委屈|抱歉|哭了)/.test(value))return 'sad';
    if(/(惊讶|真的[！!]|没想到|天哪)/.test(value))return 'surprise';
    return 'neutral';
  }
  function applyExpression(){
    if(!element)return;
    try{element.expression=tone(latestReply);}catch{}
  }
  function syncSpeaking(next){
    speech=Boolean(next);
    if(!element)return;
    try{element.avatar?.setSpeaking(speech);}catch{}
    if(!speech)cancelPulse();
  }
  async function setCharacter(char){
    const nextId=String(char?.id||'');
    if(nextId===characterId&&active&&element&&(status==='mesh'||status==='loading'))return true;
    const id=++loadId;characterId=nextId;
    clearModel();latestReply='';lastError='';
    if(!active||!nextId||!ROLE_RE.test(nextId))return false;
    const assets=await loadManifest();
    if(id!==loadId||!active||characterId!==nextId)return false;
    const entry=assets.models[nextId];if(!entry)return false;
    try{
      await ensureEngine();
      if(id!==loadId||!active||characterId!==nextId)return false;
      const mesh=document.createElement('mesh-avatar');
      mesh.className='rd-mesh-avatar';mesh.hidden=true;
      mesh.setAttribute('src',entry.src+'?v='+encodeURIComponent(window.LIAOTIAN_BUILD_VERSION||'1'));
      mesh.setAttribute('fit','contain');
      mesh.setAttribute('label',String(char?.name||'角色')+'的动态2D人物');
      mesh.setAttribute('paused','');
      scene.appendChild(mesh);element=mesh;status='loading';
      mesh.addEventListener('error',event=>{
        if(id!==loadId||element!==mesh)return;
        lastError=String(event.detail?.error?.message||'角色模型加载失败');
        clearModel();
      },{once:true});
      await mesh.ready;
      if(id!==loadId||!active||characterId!==nextId||element!==mesh){mesh.remove();return false;}
      status='mesh';mesh.hidden=false;mesh.removeAttribute('paused');
      scene.classList.add('rd-has-mesh-avatar');
      applyExpression();syncSpeaking(window.RolePresence?.getDefault?.()?.state==='speaking');
      return true;
    }catch(error){
      if(id===loadId){lastError=String(error?.message||error);clearModel();}
      return false;
    }
  }
  function setActive(show){
    active=Boolean(show);
    if(!active){loadId++;clearModel();return;}
    const char=getChar();
    if(char)void setCharacter(char);
  }
  function setReply(text){
    const next=String(text||'');if(latestReply===next)return;
    latestReply=next;applyExpression();
  }
  function onVoiceBoundary(event){
    if(!active||status!=='mesh'||!element||!speech)return;
    if(event.detail?.charId!==characterId)return;
    cancelPulse();
    try{element.setVoiceLevel(.44);}catch{}
    voicePulse=setTimeout(()=>{voicePulse=null;try{element?.setVoiceLevel?.(0);}catch{}},180);
  }
  function boot(){
    scene=document.querySelector('.rd-chat-scene');
    if(!scene)return false;
    document.addEventListener('visibilitychange',()=>{
      if(element)element.toggleAttribute('paused',document.hidden||!active);
    });
    window.addEventListener('rolepresencechange',event=>{syncSpeaking(event.detail?.state==='speaking');});
    window.addEventListener('rolevoiceboundary',onVoiceBoundary);
    void loadManifest();
    setActive(document.body.classList.contains('role-chat-immersive'));
    return true;
  }
  const api=Object.freeze({MANIFEST_URL,ENGINE_URL,MODEL_RE,sanitizeManifest,loadManifest,setCharacter,setActive,setReply,boot,state:()=>Object.freeze({active,roleId:characterId,status,lastError})});
  if(typeof window!=='undefined'){
    window.RoleAvatarStage=api;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();