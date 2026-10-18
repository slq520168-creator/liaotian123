/** 唯一聊天接口配置入口。自己的部署只需替换 chatApiUrl，密钥留在后台。 */
window.LIAOTIAN_CONFIG = Object.freeze({
  chatApiUrl: 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast'
});

(() => {
  const version='20261018-livevoice5';
  const hideUpdate=document.createElement('style');
  hideUpdate.textContent='#siteUpdateNotice,.site-update{display:none!important}';
  document.head.appendChild(hideUpdate);
  for(const href of ['role-experience.css','role-voice-stage.css']){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href+'?v='+version;
    document.head.appendChild(link);
  }
  window.addEventListener('load',()=>{
    for(const src of ['role-experience.js','role-voice-stage.js','role-persistence.js']){
      const script=document.createElement('script');
      script.src=src+'?v='+version;
      script.async=false;
      document.body.appendChild(script);
    }
  },{once:true});
})();
