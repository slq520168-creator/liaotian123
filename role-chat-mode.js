(() => {
  'use strict';

  const STORAGE_PREFIX = 'liaotian_chat_mode_';
  const MODES = Object.freeze(['text', '3d']);
  const ACTIONS = Object.freeze(['自然站立','放松呼吸','专注交流','轻微转身']);

  function isCustomCharacter(char) {
    return Boolean(char && !char.isPreset && /^custom_[a-z0-9_-]+$/i.test(String(char.id || '')));
  }

  function isProductionReady(char) {
    if (!isCustomCharacter(char)) return false;
    const asset = char.humanAsset || char.model3d || char.model3D;
    return Boolean(asset && char.humanAssetStatus === 'production');
  }

  function normalizeMode(value) {
    return MODES.includes(value) ? value : 'text';
  }

  function storedMode(char, storage = null) {
    if (!char?.id || !isProductionReady(char)) return 'text';
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store?.getItem) return 'text';
    try { return normalizeMode(store.getItem(STORAGE_PREFIX + char.id)); } catch (error) { return 'text'; }
  }

  function saveMode(char, mode, storage = null) {
    const next = mode === '3d' && isProductionReady(char) ? '3d' : 'text';
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (char?.id && store?.setItem) {
      try { store.setItem(STORAGE_PREFIX + char.id, next); } catch (error) {}
    }
    return next;
  }

  function recipeFor(char) {
    if (typeof window !== 'undefined' && window.RoleVisualRecipe?.forCharacter) return window.RoleVisualRecipe.forCharacter(char);
    return char?.visualRecipe || {};
  }

  function safeActionTransform(action, frame = {}, now = 0) {
    const t = Number.isFinite(Number(now)) ? Number(now) : 0;
    const breathing = Math.max(-.006, Math.min(.006, Number(frame?.breathing) || 0));
    if (action === '放松呼吸') return Object.freeze({y: breathing, rotationY: Math.sin(t / 4200) * .004});
    if (action === '专注交流') return Object.freeze({y: breathing * .45, rotationY: Math.sin(t / 3000) * .008});
    if (action === '轻微转身') return Object.freeze({y: breathing * .35, rotationY: Math.sin(t / 3600) * .035});
    return Object.freeze({y: 0, rotationY: 0});
  }

  function activeCharacter() {
    if (typeof characters === 'undefined' || typeof activeCharacterId === 'undefined') return null;
    return characters.find(item => item.id === activeCharacterId) || null;
  }

  function shouldRender3D(char = activeCharacter()) {
    return isProductionReady(char) && storedMode(char) === '3d';
  }

  function ensureButton() {
    if (typeof document === 'undefined') return null;
    let button = document.getElementById('roleChatModeBtn');
    if (button) return button;
    const actions = document.querySelector('.header-actions');
    if (!actions) return null;
    button = document.createElement('button');
    button.type = 'button';
    button.id = 'roleChatModeBtn';
    button.className = 'btn btn-outline btn-sm role-chat-mode-btn';
    button.hidden = true;
    button.addEventListener('click', () => {
      const char = activeCharacter();
      if (!isProductionReady(char)) return;
      const next = storedMode(char) === '3d' ? 'text' : '3d';
      saveMode(char, next);
      updateButton();
      window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();
    });
    actions.insertBefore(button, actions.firstChild || null);
    return button;
  }

  function ensureOrdinaryChatHint() {
    if (typeof document === 'undefined' || document.getElementById('ordinaryChatHint')) return;
    const create = document.getElementById('openCreateModalBtn');
    if (!create?.parentElement) return;
    const hint = document.createElement('p');
    hint.id = 'ordinaryChatHint';
    hint.className = 'form-hint role-ordinary-chat-hint';
    hint.textContent = '不创建角色也可以直接选择现有角色普通聊天；自建角色完成后，正式3D资产可用时可切换3D聊天。';
    create.insertAdjacentElement('afterend', hint);
  }

  function updateButton() {
    const button = ensureButton();
    if (!button) return false;
    const char = activeCharacter();
    const ready = isProductionReady(char);
    button.hidden = !ready;
    if (!ready) {
      button.textContent = '3D聊天';
      button.setAttribute('aria-pressed', 'false');
      return false;
    }
    const is3d = storedMode(char) === '3d';
    button.textContent = is3d ? '普通聊天' : '3D聊天';
    button.setAttribute('aria-pressed', String(is3d));
    button.title = is3d ? '切换回普通文字聊天' : '使用已通过验收的3D角色聊天';
    return true;
  }

  function patchRenderer() {
    if (typeof window === 'undefined') return false;
    const proto = window.RoleHumanRenderer?.HumanRenderer?.prototype;
    if (!proto?.syncCharacter || !proto?.renderFrame) return false;

    const currentSync = proto.syncCharacter;
    if (!currentSync.__chatModeGate) {
      const syncWrapped = function(...args) {
        const char = this.currentCharacter?.() || activeCharacter();
        if (!shouldRender3D(char)) {
          this.clearModel?.();
          return Promise.resolve(false);
        }
        return currentSync.apply(this, args);
      };
      syncWrapped.__chatModeGate = true;
      proto.syncCharacter = syncWrapped;
    }

    const currentRender = proto.renderFrame;
    if (!currentRender.__creatorMotion) {
      const renderWrapped = function(frame = {}) {
        const char = this.currentCharacter?.() || activeCharacter();
        const recipe = recipeFor(char);
        if (this.root) {
          if (this.__chatModeRoot !== this.root) {
            this.__chatModeRoot = this.root;
            this.__chatModeBaseY = Number(this.baseRootY ?? this.root.position?.y) || 0;
            this.__chatModeBaseRotationY = Number(this.root.rotation?.y) || 0;
          }
          const motion = safeActionTransform(recipe.action, frame, typeof performance !== 'undefined' ? performance.now() : Date.now());
          if (this.root.position) this.root.position.y = this.__chatModeBaseY + motion.y;
          if (this.root.rotation) this.root.rotation.y = this.__chatModeBaseRotationY + motion.rotationY;
        }
        return currentRender.call(this, {...frame, expressionPreset: recipe.expression || '自然'});
      };
      renderWrapped.__creatorMotion = true;
      proto.renderFrame = renderWrapped;
    }
    return true;
  }

  function patchSwitchCharacter() {
    if (typeof switchCharacter !== 'function' || switchCharacter.__chatModeUi) return false;
    const base = switchCharacter;
    const wrapped = function(...args) {
      const result = base.apply(this, args);
      requestAnimationFrame(updateButton);
      return result;
    };
    wrapped.__chatModeUi = true;
    switchCharacter = wrapped;
    return true;
  }

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('roleChatModeStyles')) return;
    const style = document.createElement('style');
    style.id = 'roleChatModeStyles';
    style.textContent = `
      .role-chat-mode-btn[aria-pressed="true"]{background:var(--primary-color);color:#fff;border-color:var(--primary-color)}
      .role-ordinary-chat-hint{margin:6px 2px 2px;line-height:1.45}
      @media(max-width:560px){.role-chat-mode-btn{padding-inline:9px;white-space:nowrap}}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    injectStyles();
    ensureOrdinaryChatHint();
    ensureButton();
    if (!patchRenderer()) {
      let attempts = 0;
      const retry = () => {
        if (patchRenderer()) {
          window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();
          updateButton();
          return;
        }
        if (++attempts < 80) setTimeout(retry, 80);
      };
      retry();
    }
    patchSwitchCharacter();
    updateButton();
    requestAnimationFrame(() => window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());
    window.addEventListener('humanmanifestready', () => setTimeout(() => {
      updateButton();
      window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();
    }, 0));
    return true;
  }

  const api = Object.freeze({
    STORAGE_PREFIX, MODES, ACTIONS, isCustomCharacter, isProductionReady, normalizeMode,
    storedMode, saveMode, recipeFor, safeActionTransform, shouldRender3D,
    ensureButton, updateButton, patchRenderer, patchSwitchCharacter, boot
  });
  if (typeof window !== 'undefined') {
    window.RoleChatMode = api;
    boot();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
