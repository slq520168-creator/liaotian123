(() => {
  const BUSY=/^正在生成(?:长)?回复…?$/;
  function cleanBusyStatus(){
    const status=document.getElementById('replyStatus');
    if(!status)return;
    const clear=()=>{if(BUSY.test((status.textContent||'').trim()))status.textContent=''};
    clear();
    new MutationObserver(clear).observe(status,{childList:true,characterData:true,subtree:true});
  }
  function compactVoice(){
    const button=document.getElementById('roleVoiceControls')?.querySelector('.role-voice-btn');
    if(!button)return false;
    const sync=()=>{button.textContent=button.getAttribute('aria-pressed')==='true'?'🔊开':'🔇关'};
    sync();
    new MutationObserver(sync).observe(button,{attributes:true,attributeFilter:['aria-pressed'],childList:true,characterData:true,subtree:true});
    return true;
  }
  function boot(){
    cleanBusyStatus();
    if(!compactVoice())setTimeout(boot,120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
