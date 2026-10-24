/** 唯一聊天接口配置入口。自己的部署只需替换 chatApiUrl，密钥留在后台。 */
window.LIAOTIAN_CONFIG = Object.freeze({
  chatApiUrl: 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast'
});
window.LIAOTIAN_HUMAN_ASSETS = window.LIAOTIAN_HUMAN_ASSETS || {};
window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES = window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES || [];

(() => {
  const version='20261025-create3d13';
  window.LIAOTIAN_BUILD_VERSION=version;
  const hideUpdate=document.createElement('style');
  hideUpdate.textContent='#siteUpdateNotice,.site-update{display:none!important}';
  document.head.appendChild(hideUpdate);
  for(const href of ['role-experience.css','role-voice-stage.css','chat-compact-ui.css']){
    const link=document.createElement('link');link.rel='stylesheet';link.href=href+'?v='+version;document.head.appendChild(link);
  }
  window.addEventListener('load',()=>{
    for(const src of ['role-experience.js','role-presence.js','role-visual-recipe.js','role-unified-human-recipe.js','role-unified-human-runtime.js','role-accessory-geometry.js','role-face-rig.js','role-direct-viseme-rig.js','role-render-loop.js','role-body-rig.js','role-proportion-rig.js','role-appearance-rig.js','role-meshopt-support.js','role-human-manifest.js','role-asset-policy.js','role-human-asset-capability.js','role-human-renderer.js','role-safe-skeleton-motion.js','role-fullscreen-stage.js','role-render-recipe-bridge.js','role-chat-mode.js','role-voice-stage.js','role-voice-style.js','role-code-compat.js','role-persistence.js','role-builder.js','role-eye-color.js','role-creator-studio.js','role-mobile-qa-diagnostics.js','role-unified-production-gate.js','role-creator-3d-preview.js']){
      const script=document.createElement('script');script.src=src+'?v='+version;script.async=false;document.body.appendChild(script);
    }
  },{once:true});
})();
