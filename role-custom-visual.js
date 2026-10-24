(() => {
  'use strict';

  const DEFAULT_AVATAR = 'assets/avatars/nuannuan-portrait.jpg';
  const LEGACY_FALLBACK_URL = 'assets/humans/reference-mpfb.glb';
  const LOCAL_REFERENCE_FALLBACK = Object.freeze({
    id:'reference-mpfb', status:'reference-fallback', complete:false,
    descriptor:Object.freeze({url:LEGACY_FALLBACK_URL,scale:1,y:0,rotationY:0,framing:'portrait',minMorphTargets:52})
  });
  const CUSTOM_HUMAN_ASSET = LOCAL_REFERENCE_FALLBACK.descriptor;

  function isCustomCharacter(char) {
    return Boolean(char && /^custom_[a-z0-9_-]+$/i.test(String(char.id || '')));
  }

  function capabilityApi() {
    if (typeof window !== 'undefined' && window.RoleHumanAssetCapability) return window.RoleHumanAssetCapability;
    if (typeof require === 'function') {
      try { return require('./role-human-asset-capability.js'); } catch (error) {}
    }
    return null;
  }

  function configuredCandidates() {
    if (typeof window === 'undefined') return [];
    return Array.isArray(window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES) ? window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES : [];
  }

  function customHumanSelection(candidates = null) {
    const api = capabilityApi();
    if (!api?.selectCustomAsset) return LOCAL_REFERENCE_FALLBACK;
    return api.selectCustomAsset(candidates === null ? configuredCandidates() : candidates);
  }

  function stableHue(value) {
    let hash = 2166136261;
    for (const ch of String(value || '角色')) {
      hash ^= ch.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 300) + 20;
  }

  function customHumanAsset(candidates = null) {
    return {...customHumanSelection(candidates).descriptor};
  }

  function isLegacyFallbackAsset(asset) {
    if (!asset || typeof asset !== 'object') return false;
    const url = String(asset.url || asset.src || asset.model || '');
    return url === LEGACY_FALLBACK_URL;
  }

  function decorateCharacter(char, candidates = null) {
    if (!isCustomCharacter(char)) return false;
    const selection = customHumanSelection(candidates);
    // Never attach an incomplete/reference GLB to a live custom role. The main
    // renderer would decode it as soon as creation closes, blocking mobile UI
    // and visually substituting a half-finished body. Keep custom roles on the
    // lightweight avatar/text path until the full production contract passes.
    if (!selection.complete) {
      delete char.humanAsset;
      char.humanAssetStatus = 'candidate-gated';
      char.humanAssetId = selection.id || '';
      return true;
    }
    char.humanAsset = {...selection.descriptor};
    char.humanAssetStatus = 'production';
    char.humanAssetId = selection.id || '';
    return true;
  }

  function generatedAvatar(name, tag = '', gender = 'unspecified', documentRef = null) {
    const doc = documentRef || (typeof document !== 'undefined' ? document : null);
    if (!doc?.createElement) return '';
    const canvas = doc.createElement('canvas');
    canvas.width = 384;
    canvas.height = 384;
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return '';
    const hue = stableHue(`${name}|${tag}|${gender}`);
    const gradient = ctx.createLinearGradient(0, 0, 384, 384);
    gradient.addColorStop(0, `hsl(${hue} 58% 91%)`);
    gradient.addColorStop(1, `hsl(${(hue + 36) % 360} 55% 78%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 384, 384);

    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.beginPath();
    ctx.arc(192, 145, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect?.(84, 224, 216, 144, 72);
    if (typeof ctx.roundRect === 'function') ctx.fill();
    else ctx.fillRect(84, 224, 216, 160);

    const initial = Array.from(String(name || '角').trim())[0] || '角';
    ctx.fillStyle = `hsl(${hue} 38% 34%)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 104px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText(initial, 192, 148);
    ctx.font = '600 30px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText(String(name || '我的角色').slice(0, 8), 192, 300);
    const data = canvas.toDataURL?.('image/jpeg', 0.88) || '';
    return data.length <= 180000 ? data : (canvas.toDataURL?.('image/jpeg', 0.68) || '');
  }

  function needsGeneratedAvatar(char) {
    return isCustomCharacter(char) && (!char.avatar || char.avatar === DEFAULT_AVATAR);
  }

  function ensureCustomAvatar(char) {
    if (!needsGeneratedAvatar(char)) return false;
    const avatar = generatedAvatar(char.name, char.tag, char.gender);
    if (!avatar) return false;
    char.avatar = avatar;
    return true;
  }

  function applyRoleTheme(char, root = null) {
    const docRoot = root || (typeof document !== 'undefined' ? document.documentElement : null);
    if (!docRoot) return false;
    if (!isCustomCharacter(char)) {
      delete docRoot.dataset.roleTheme;
      docRoot.style.removeProperty('--role-h');
      return false;
    }
    docRoot.dataset.roleTheme = 'custom';
    docRoot.style.setProperty('--role-h', String(stableHue(`${char.id}|${char.name}`)));
    return true;
  }

  function injectThemeStyles() {
    if (typeof document === 'undefined' || document.getElementById('customRoleThemeStyles')) return;
    const style = document.createElement('style');
    style.id = 'customRoleThemeStyles';
    style.textContent = `
      html[data-role-theme="custom"]{
        --primary-color:hsl(var(--role-h) 42% 46%);
        --primary-hover:hsl(var(--role-h) 46% 38%);
        --primary-light:hsl(var(--role-h) 70% 93%);
        --bg-app:hsl(var(--role-h) 72% 97%);
        --bg-card:hsl(var(--role-h) 65% 98%);
        --bg-header:hsl(var(--role-h) 68% 96%);
        --border-color:hsl(var(--role-h) 38% 86%);
        --user-msg-bg:hsl(var(--role-h) 52% 88%);
        --user-msg-text:hsl(var(--role-h) 38% 27%);
      }
    `;
    document.head.appendChild(style);
  }

  function creatorModalActive() {
    if (typeof document === 'undefined') return false;
    return Boolean(document.getElementById('createModalOverlay')?.classList.contains('active'));
  }

  function syncHumanRendererWhenSafe() {
    if (typeof window === 'undefined' || creatorModalActive()) return false;
    requestAnimationFrame(() => {
      if (!creatorModalActive()) window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();
    });
    return true;
  }

  function installSwitchWrapper() {
    if (typeof switchCharacter !== 'function' || switchCharacter.__customVisual) return false;
    const baseSwitch = switchCharacter;
    const wrapped = function(charId, ...args) {
      const char = typeof characters !== 'undefined' ? characters.find(item => item.id === charId) : null;
      if (char) {
        decorateCharacter(char);
        ensureCustomAvatar(char);
        applyRoleTheme(char);
      }
      const result = baseSwitch.call(this, charId, ...args);
      syncHumanRendererWhenSafe();
      return result;
    };
    wrapped.__customVisual = true;
    switchCharacter = wrapped;
    return true;
  }

  function installCreateFormBridge() {
    if (typeof document === 'undefined') return false;
    const form = document.getElementById('createRoleForm');
    if (!form || form.dataset.customVisualBridge === '1') return false;
    form.dataset.customVisualBridge = '1';
    let avatarChosen = false;
    document.getElementById('openCreateModalBtn')?.addEventListener('click', () => { avatarChosen = false; }, true);
    document.getElementById('presetAvatarPicker')?.addEventListener('click', event => {
      if (event.target.closest?.('.avatar-picker-button')) avatarChosen = true;
    }, true);
    document.getElementById('roleAvatarUpload')?.addEventListener('change', event => {
      if (event.target.files?.length) avatarChosen = true;
    }, true);
    form.addEventListener('submit', () => {
      if (typeof editingCharacterId !== 'undefined' && editingCharacterId) return;
      if (avatarChosen) return;
      if (typeof selectedFormAvatar === 'undefined' || selectedFormAvatar !== DEFAULT_AVATAR) return;
      const avatar = generatedAvatar(
        document.getElementById('roleName')?.value,
        document.getElementById('roleTag')?.value,
        document.getElementById('roleGender')?.value
      );
      if (!avatar) return;
      selectedFormAvatar = avatar;
      const preview = document.getElementById('roleAvatarPreview');
      if (preview) preview.src = avatar;
    }, true);
    return true;
  }

  function installCreateModalSyncBridge() {
    if (typeof document === 'undefined') return false;
    const modal = document.getElementById('createModalOverlay');
    if (!modal || modal.dataset.humanSyncBridge === '1') return false;
    modal.dataset.humanSyncBridge = '1';
    let wasActive = modal.classList.contains('active');
    const observer = new MutationObserver(() => {
      const active = modal.classList.contains('active');
      if (wasActive && !active) syncHumanRendererWhenSafe();
      wasActive = active;
    });
    observer.observe(modal, {attributes:true, attributeFilter:['class']});
    return true;
  }

  function decorateExistingCharacters() {
    if (typeof characters === 'undefined' || !Array.isArray(characters)) return 0;
    let changed = 0;
    for (const char of characters) {
      if (!decorateCharacter(char)) continue;
      changed++;
      if (ensureCustomAvatar(char)) changed++;
    }
    if (changed && typeof saveDataToStorage === 'function') saveDataToStorage();
    const active = characters.find(char => char.id === (typeof activeCharacterId !== 'undefined' ? activeCharacterId : ''));
    if (active) applyRoleTheme(active);
    return changed;
  }

  function boot() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    injectThemeStyles();
    decorateExistingCharacters();
    installSwitchWrapper();
    installCreateFormBridge();
    installCreateModalSyncBridge();
    syncHumanRendererWhenSafe();
    window.addEventListener('humanmanifestready', () => {
      decorateExistingCharacters();
      syncHumanRendererWhenSafe();
    });
    return true;
  }

  const api = Object.freeze({
    DEFAULT_AVATAR, LEGACY_FALLBACK_URL, CUSTOM_HUMAN_ASSET, isCustomCharacter, capabilityApi, configuredCandidates,
    customHumanSelection, stableHue, customHumanAsset, isLegacyFallbackAsset, decorateCharacter,
    generatedAvatar, needsGeneratedAvatar, ensureCustomAvatar, applyRoleTheme, creatorModalActive, syncHumanRendererWhenSafe,
    injectThemeStyles, installSwitchWrapper, installCreateFormBridge, installCreateModalSyncBridge, decorateExistingCharacters, boot
  });

  if (typeof window !== 'undefined') {
    window.RoleCustomVisual = api;
    boot();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
