/** 唯一聊天接口配置入口。自己的部署只需替换 chatApiUrl，密钥留在后台。 */
window.LIAOTIAN_CONFIG = Object.freeze({
  chatApiUrl: 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast'
});

(() => {
  const version='20261018-role3d1';
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='role-experience.css?v='+version;
  document.head.appendChild(link);
  window.addEventListener('load',()=>{
    const script=document.createElement('script');
    script.src='role-experience.js?v='+version;
    script.async=false;
    document.body.appendChild(script);
  },{once:true});
})();
