/** 唯一聊天接口配置入口。自己的部署只需替换 chatApiUrl，密钥留在后台。 */
window.LIAOTIAN_CONFIG = Object.freeze({
  chatApiUrl: 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast'
});
window.LIAOTIAN_HUMAN_ASSETS = window.LIAOTIAN_HUMAN_ASSETS || {};
window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES = window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES || [];

(() => {
  const version='20261024-chat3d9';
  window.LIAOTIAN_BUILD_VERSION=version;
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
    // Production creation must stay on the lightweight path until unified custom 3D
    // is genuinely production-ready. Do not load role-custom-visual here: it creates
    // a 384px JPEG synchronously during submit and wraps role switching again, which
    // can block iPhone creation while providing no production-qualified 3D benefit.
    // Re-enable it only together with the fully validated unified custom 3D runtime.
    for(const src of ['role-experience.js','role-presence.js','role-visual-recipe.js','role-unified-human-recipe.js','role-unified-human-runtime.js','role-face-rig.js','role-direct-viseme-rig.js','role-render-loop.js','role-body-rig.js','role-proportion-rig.js','role-appearance-rig.js','role-meshopt-support.js','role-human-manifest.js','role-asset-policy.js','role-human-asset-capability.js','role-human-renderer.js','role-fullscreen-stage.js','role-render-recipe-bridge.js','role-chat-mode.js','role-voice-stage.js','role-voice-style.js','role-code-compat.js','role-persistence.js','role-builder.js','role-creator-studio.js']){
      const script=document.createElement('script');
      script.src=src+'?v='+version;
      script.async=false;
      document.body.appendChild(script);
    }
  },{once:true});
})();
