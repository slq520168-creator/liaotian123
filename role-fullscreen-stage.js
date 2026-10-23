(() => {
  'use strict';

  const STYLE_ID = 'roleFullscreenStageStyles';
  const FULLSCREEN_CSS = `
    .chat-main{position:relative;overflow:hidden}
    .chat-main>.role-human-stage{
      display:none;
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      max-height:none!important;
      margin:0!important;
      border:0!important;
      z-index:0!important;
      overflow:hidden;
      pointer-events:none;
      background:linear-gradient(180deg,rgba(255,250,252,.98),rgba(245,241,244,.96));
    }
    .chat-main>.role-human-stage.active{display:block!important}
    .chat-main>.role-human-stage .role-human-canvas-host,
    .chat-main>.role-human-stage canvas{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      min-height:100%!important;
      max-height:none!important;
      display:block;
      pointer-events:none;
    }
    .chat-main>.role-human-stage .role-human-status{
      left:50%!important;
      bottom:calc(210px + env(safe-area-inset-bottom))!important;
      transform:translateX(-50%);
      z-index:2;
    }

    .chat-main>.role-human-stage.active~.chat-header{
      position:absolute!important;
      top:0;
      left:0;
      right:0;
      z-index:30!important;
      background:rgba(255,255,255,.72)!important;
      -webkit-backdrop-filter:blur(14px) saturate(1.15);
      backdrop-filter:blur(14px) saturate(1.15);
      box-shadow:0 1px 0 rgba(70,50,60,.09)!important;
    }

    .chat-main>.role-human-stage.active~.messages-container{
      position:absolute!important;
      inset:0!important;
      z-index:10!important;
      width:100%!important;
      height:100%!important;
      min-height:0!important;
      padding:calc(76px + env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) calc(205px + env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))!important;
      overflow-y:auto!important;
      background:transparent!important;
      pointer-events:auto;
      scroll-padding-top:calc(76px + env(safe-area-inset-top));
      scroll-padding-bottom:calc(205px + env(safe-area-inset-bottom));
    }
    .chat-main>.role-human-stage.active~.messages-container>.messages{
      min-height:100%;
      justify-content:flex-end;
      padding-top:clamp(250px,43vh,500px);
      background:transparent!important;
    }
    .chat-main>.role-human-stage.active~.messages-container .message-row{
      max-width:min(82%,680px);
    }
    .chat-main>.role-human-stage.active~.messages-container .message-bubble{
      -webkit-backdrop-filter:blur(10px) saturate(1.08);
      backdrop-filter:blur(10px) saturate(1.08);
      box-shadow:0 5px 18px rgba(50,35,43,.10)!important;
    }
    .chat-main>.role-human-stage.active~.messages-container .message-row.bot .message-bubble{
      background:rgba(255,255,255,.86)!important;
    }
    .chat-main>.role-human-stage.active~.messages-container .message-row.user .message-bubble{
      background:rgba(244,205,221,.88)!important;
    }

    .chat-main>.role-human-stage.active~.input-container{
      position:absolute!important;
      left:0;
      right:0;
      bottom:0;
      z-index:40!important;
      margin:0!important;
      padding:10px 16px calc(12px + env(safe-area-inset-bottom))!important;
      border-top:1px solid rgba(120,90,105,.12)!important;
      background:rgba(255,255,255,.80)!important;
      -webkit-backdrop-filter:blur(16px) saturate(1.15);
      backdrop-filter:blur(16px) saturate(1.15);
      box-shadow:0 -8px 24px rgba(50,35,43,.06);
    }
    .chat-main>.role-human-stage.active~.input-container .input-area,
    .chat-main>.role-human-stage.active~.input-container .quick-chip,
    .chat-main>.role-human-stage.active~.input-container .tool-btn,
    .chat-main>.role-human-stage.active~.input-container select{
      background:rgba(255,255,255,.78)!important;
      -webkit-backdrop-filter:blur(8px);
      backdrop-filter:blur(8px);
    }

    @media(max-width:767px){
      .chat-main>.role-human-stage.active~.chat-header{
        height:64px!important;
        padding:0 14px!important;
      }
      .chat-main>.role-human-stage.active~.messages-container{
        padding-left:12px!important;
        padding-right:12px!important;
        padding-bottom:calc(190px + env(safe-area-inset-bottom))!important;
        scroll-padding-bottom:calc(190px + env(safe-area-inset-bottom));
      }
      .chat-main>.role-human-stage.active~.messages-container>.messages{
        padding-top:clamp(230px,44vh,430px);
      }
      .chat-main>.role-human-stage.active~.messages-container .message-row{
        max-width:88%;
      }
      .chat-main>.role-human-stage.active~.input-container{
        padding:8px 12px calc(9px + env(safe-area-inset-bottom))!important;
      }
    }
  `;

  function injectStyles(documentRef = null) {
    const doc = documentRef || (typeof document !== 'undefined' ? document : null);
    if (!doc?.head || doc.getElementById?.(STYLE_ID)) return false;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = FULLSCREEN_CSS;
    doc.head.appendChild(style);
    return true;
  }

  function mountStage(renderer = null, documentRef = null) {
    const doc = documentRef || (typeof document !== 'undefined' ? document : null);
    if (!doc) return false;
    const main = doc.querySelector?.('.chat-main');
    const stage = renderer?.stage || doc.getElementById?.('roleHumanStage');
    if (!main || !stage) return false;
    if (stage.parentElement !== main) main.prepend(stage);
    renderer?.resize?.();
    const messages = doc.getElementById?.('messagesContainer');
    if (messages) messages.scrollTop = messages.scrollHeight;
    return true;
  }

  function patchRenderer(rendererApi = null, documentRef = null) {
    const api = rendererApi || (typeof window !== 'undefined' ? window.RoleHumanRenderer : null);
    const proto = api?.HumanRenderer?.prototype;
    if (!proto?.ensureStage) return false;
    const current = proto.ensureStage;
    if (!current.__fullscreenStage) {
      const wrapped = function(...args) {
        const stage = current.apply(this, args);
        mountStage(this, documentRef);
        return stage;
      };
      wrapped.__fullscreenStage = true;
      proto.ensureStage = wrapped;
    }
    if (typeof window !== 'undefined') mountStage(window.__ROLE_HUMAN_RENDERER, documentRef);
    return true;
  }

  function boot() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    injectStyles();
    if (patchRenderer()) {
      mountStage(window.__ROLE_HUMAN_RENDERER);
      requestAnimationFrame(() => {
        mountStage(window.__ROLE_HUMAN_RENDERER);
        window.__ROLE_HUMAN_RENDERER?.resize?.();
      });
      return true;
    }
    let attempts = 0;
    const retry = () => {
      if (patchRenderer()) {
        mountStage(window.__ROLE_HUMAN_RENDERER);
        return;
      }
      if (++attempts < 60) setTimeout(retry, 80);
    };
    retry();
    return false;
  }

  const api = Object.freeze({STYLE_ID, FULLSCREEN_CSS, injectStyles, mountStage, patchRenderer, boot});
  if (typeof window !== 'undefined') {
    window.RoleFullscreenStage = api;
    boot();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
