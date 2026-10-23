/** 唯一聊天接口配置入口。自己的部署只需替换 chatApiUrl，密钥留在后台。 */
window.LIAOTIAN_CONFIG = Object.freeze({
  chatApiUrl: 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast'
});

(() => {
  const version='20261023-human1';
  const hideUpdate=document.createElement('style');
  hideUpdate.textContent='#siteUpdateNotice,.site-update{display:none!important}';
  document.head.appendChild(hideUpdate);
  for(const href of ['role-experience.css','role-voice-stage.css','chat-compact-ui.css']){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href+'?v='+version;
    document.head.appendChild(link);
  }
  window.addEventListener('load',()=>{
    for(const src of ['role-experience.js','role-presence.js','role-face-rig.js','role-render-loop.js','role-human-renderer.js','role-voice-stage.js','role-code-compat.js','role-persistence.js','role-builder.js']){
      const script=document.createElement('script');
      script.src=src+'?v='+version;
      script.async=false;
      document.body.appendChild(script);
    }
  },{once:true});
})();