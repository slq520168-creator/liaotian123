(() => {
  'use strict';

  function recipeForCharacter(char, recipeApi) {
    const api = recipeApi || (typeof window !== 'undefined' ? window.RoleVisualRecipe : null);
    if (!char) return null;
    if (api?.forCharacter) return api.forCharacter(char);
    return char.visualRecipe || char.personality || null;
  }

  function ensureAppearanceRig(renderer, appearanceApi) {
    const api = appearanceApi || (typeof window !== 'undefined' ? window.RoleAppearanceRig : null);
    if (!renderer?.root || !api?.AppearanceRigAdapter) return null;
    if (renderer.appearanceRig?.root === renderer.root) return renderer.appearanceRig;
    renderer.appearanceRig?.reset?.();
    renderer.appearanceRig = new api.AppearanceRigAdapter(renderer.root, renderer.faceRig?.mesh || null);
    return renderer.appearanceRig;
  }

  function ensureProportionRig(renderer, proportionApi) {
    const api = proportionApi || (typeof window !== 'undefined' ? window.RoleProportionRig : null);
    if (!renderer?.root || !api?.ProportionRigAdapter) return null;
    if (renderer.proportionRig?.root === renderer.root) return renderer.proportionRig;
    renderer.proportionRig?.reset?.();
    renderer.proportionRig = new api.ProportionRigAdapter(renderer.root);
    return renderer.proportionRig;
  }

  function applyStructuredRecipe(renderer, char, recipeApi, appearanceApi, proportionApi) {
    if (!renderer || !char) return false;
    const recipe = recipeForCharacter(char, recipeApi);
    if (!recipe) return false;
    let applied = false;

    const proportionRig = ensureProportionRig(renderer, proportionApi);
    const proportions = proportionRig?.applySpec?.(recipe) || null;
    if (proportions?.applied) applied = true;

    if (renderer.bodyRig?.applySpec) applied = Boolean(renderer.bodyRig.applySpec(recipe)) || applied;

    const appearanceRig = ensureAppearanceRig(renderer, appearanceApi);
    const appearance = appearanceRig?.applySpec?.(recipe) || null;
    if (appearance?.applied) applied = true;

    renderer.visualRecipe = recipe;
    renderer.proportionResult = proportions;
    renderer.appearanceResult = appearance;
    return applied;
  }

  function creatorModalOpen() {
    if (typeof document === 'undefined') return false;
    return Boolean(document.getElementById('createModalOverlay')?.classList?.contains('active'));
  }

  function isCustomRoleId(charId) {
    if (typeof charId !== 'string' || !/^custom_[a-z0-9_-]+$/i.test(charId)) return false;
    if (typeof characters === 'undefined' || !Array.isArray(characters)) return true;
    return characters.some(char => char && !char.isPreset && char.id === charId);
  }

  function rendererAsset(renderer, char) {
    const api = typeof window !== 'undefined' ? window.RoleHumanRenderer : null;
    if (!renderer || !char || typeof api?.assetForCharacter !== 'function') return null;
    return api.assetForCharacter(char, renderer.registry || {}, {origin: renderer.origin?.() || location.origin});
  }

  function hideRendererStage(renderer) {
    renderer?.loop?.stop?.();
    if (renderer?.stage) {
      renderer.stage.classList.remove('active', 'loading', 'error');
      renderer.setStatus?.('');
    }
  }

  function cancelDeferredCleanup(renderer) {
    const job = renderer?.__creatorDeferredCleanup;
    if (!job) return;
    if (job.kind === 'idle' && typeof cancelIdleCallback === 'function') cancelIdleCallback(job.id);
    if (job.kind === 'timer') clearTimeout(job.id);
    renderer.__creatorDeferredCleanup = null;
  }

  function deferTextCleanup(renderer, char, sync, args) {
    cancelDeferredCleanup(renderer);
    const expectedId = String(char?.id || '');
    const cleanup = () => {
      renderer.__creatorDeferredCleanup = null;
      const current = renderer.currentCharacter?.();
      if (!current || String(current.id || '') !== expectedId || creatorModalOpen() || rendererAsset(renderer, current)) return;
      Promise.resolve(sync.apply(renderer, args)).catch(() => {});
    };
    if (typeof requestIdleCallback === 'function') {
      renderer.__creatorDeferredCleanup = {kind:'idle', id:requestIdleCallback(cleanup, {timeout:900})};
    } else {
      renderer.__creatorDeferredCleanup = {kind:'timer', id:setTimeout(cleanup, 180)};
    }
  }

  let creatorFullSaveJob = null;
  function cancelCreatorFullSave() {
    if (!creatorFullSaveJob) return;
    if (creatorFullSaveJob.kind === 'idle' && typeof cancelIdleCallback === 'function') cancelIdleCallback(creatorFullSaveJob.id);
    if (creatorFullSaveJob.kind === 'timer') clearTimeout(creatorFullSaveJob.id);
    creatorFullSaveJob = null;
  }

  function fastPersistCustomCatalog() {
    if (typeof localStorage === 'undefined' || typeof characters === 'undefined' || !Array.isArray(characters)) return false;
    try {
      localStorage.setItem('liaotian_custom_chars', JSON.stringify(characters.filter(char => !char.isPreset)));
      if (typeof activeCharacterId === 'string' && activeCharacterId) localStorage.setItem('liaotian_active_char', activeCharacterId);
      return true;
    } catch (error) {
      const status = typeof document !== 'undefined' ? document.getElementById('replyStatus') : null;
      if (status) status.textContent = '空间不足，暂时无法保存。';
      return false;
    }
  }

  function scheduleCreatorFullSave(baseSave) {
    cancelCreatorFullSave();
    const save = () => {
      creatorFullSaveJob = null;
      if (creatorModalOpen() || (typeof window !== 'undefined' && window.__ROLE_CREATOR_PENDING_SWITCH)) {
        scheduleCreatorFullSave(baseSave);
        return;
      }
      try { baseSave(); } catch (error) {}
    };
    if (typeof requestIdleCallback === 'function') {
      creatorFullSaveJob = {kind:'idle', id:requestIdleCallback(save, {timeout:1400})};
    } else {
      creatorFullSaveJob = {kind:'timer', id:setTimeout(save, 240)};
    }
  }

  function flushCreatorPendingSwitch() {
    if (typeof window === 'undefined' || creatorModalOpen()) return false;
    const pending = window.__ROLE_CREATOR_PENDING_SWITCH;
    if (!pending?.charId || typeof switchCharacter !== 'function') return false;
    window.__ROLE_CREATOR_PENDING_SWITCH = null;
    switchCharacter(pending.charId, false);
    return true;
  }

  function installCreatorCommitFastPath() {
    if (typeof window === 'undefined') return false;
    let installed = false;
    if (typeof switchCharacter === 'function' && !switchCharacter.__creatorCommitFastPath) {
      const baseSwitch = switchCharacter;
      const wrappedSwitch = function(charId, save = true) {
        if (creatorModalOpen() && isCustomRoleId(charId)) {
          activeCharacterId = charId;
          window.__ROLE_CREATOR_PENDING_SWITCH = {charId, save: save !== false};
          return true;
        }
        return baseSwitch.apply(this, arguments);
      };
      wrappedSwitch.__creatorCommitFastPath = true;
      wrappedSwitch.__creatorCommitFastPathBase = baseSwitch;
      switchCharacter = wrappedSwitch;
      installed = true;
    }
    if (typeof saveDataToStorage === 'function' && !saveDataToStorage.__creatorCommitFastPath) {
      const baseSave = saveDataToStorage;
      const wrappedSave = function(...args) {
        if (creatorModalOpen() && window.__ROLE_CREATOR_PENDING_SWITCH) {
          const ok = fastPersistCustomCatalog();
          if (!ok) {
            window.__ROLE_CREATOR_PENDING_SWITCH = null;
            return false;
          }
          scheduleCreatorFullSave(() => baseSave.apply(this, args));
          return true;
        }
        return baseSave.apply(this, args);
      };
      wrappedSave.__creatorCommitFastPath = true;
      wrappedSave.__creatorCommitFastPathBase = baseSave;
      saveDataToStorage = wrappedSave;
      installed = true;
    }
    return installed;
  }

  function installCreatorPerformanceGate(rendererProto) {
    const proto = rendererProto;
    const currentSync = proto?.syncCharacter;
    if (typeof currentSync !== 'function' || currentSync.__creatorPerformanceGate) return Boolean(currentSync?.__creatorPerformanceGate);
    const wrapped = function(...args) {
      const char = this.currentCharacter?.();
      if (creatorModalOpen()) {
        this.cancelPendingLoad?.();
        cancelDeferredCleanup(this);
        this.loop?.stop?.();
        return Promise.resolve(false);
      }
      if (char && !rendererAsset(this, char)) {
        this.cancelPendingLoad?.();
        hideRendererStage(this);
        deferTextCleanup(this, char, currentSync, args);
        return Promise.resolve(false);
      }
      cancelDeferredCleanup(this);
      return currentSync.apply(this, args);
    };
    wrapped.__creatorPerformanceGate = true;
    wrapped.__creatorPerformanceGateBase = currentSync;
    proto.syncCharacter = wrapped;
    return true;
  }

  function bindCreatorModal(renderer) {
    if (!renderer || typeof document === 'undefined' || renderer.__creatorModalObserver) return false;
    const modal = document.getElementById('createModalOverlay');
    if (!modal || typeof MutationObserver === 'undefined') return false;
    const syncAfterClose = () => {
      if (creatorModalOpen()) {
        renderer.cancelPendingLoad?.();
        cancelDeferredCleanup(renderer);
        renderer.loop?.stop?.();
        return;
      }
      requestAnimationFrame(() => {
        if (creatorModalOpen()) return;
        flushCreatorPendingSwitch();
        requestAnimationFrame(() => {
          if (!creatorModalOpen()) renderer.syncCharacter?.();
        });
      });
    };
    const observer = new MutationObserver(syncAfterClose);
    observer.observe(modal, {attributes:true, attributeFilter:['class']});
    renderer.__creatorModalObserver = observer;
    if (creatorModalOpen()) syncAfterClose();
    return true;
  }

  function install() {
    if (typeof window === 'undefined') return false;
    installCreatorCommitFastPath();
    const Renderer = window.RoleHumanRenderer?.HumanRenderer;
    const proto = Renderer?.prototype;
    if (!proto?.loadCharacter) return false;

    const currentClear = proto.clearModel;
    if (typeof currentClear === 'function' && !currentClear.__structuredRecipe) {
      const clearWrapped = function(...args) {
        this.proportionRig?.reset?.();
        this.proportionRig = null;
        this.proportionResult = null;
        this.appearanceRig?.reset?.();
        this.appearanceRig = null;
        this.appearanceResult = null;
        return currentClear.apply(this, args);
      };
      clearWrapped.__structuredRecipe = true;
      proto.clearModel = clearWrapped;
    }

    const currentLoad = proto.loadCharacter;
    if (!currentLoad.__visualRecipe) {
      const wrapped = async function(char) {
        const ok = await currentLoad.call(this, char);
        if (ok) applyStructuredRecipe(this, char, window.RoleVisualRecipe, window.RoleAppearanceRig, window.RoleProportionRig);
        return ok;
      };
      wrapped.__visualRecipe = true;
      proto.loadCharacter = wrapped;
    }

    installCreatorPerformanceGate(proto);
    const renderer = window.__ROLE_HUMAN_RENDERER;
    if (renderer) bindCreatorModal(renderer);
    requestAnimationFrame(() => {
      const activeRenderer = window.__ROLE_HUMAN_RENDERER;
      if (!activeRenderer) return;
      bindCreatorModal(activeRenderer);
      if (!creatorModalOpen()) activeRenderer.syncCharacter?.();
    });
    return true;
  }

  const api = Object.freeze({
    recipeForCharacter, ensureAppearanceRig, ensureProportionRig, applyStructuredRecipe,
    creatorModalOpen, isCustomRoleId, rendererAsset, hideRendererStage, cancelDeferredCleanup, deferTextCleanup,
    cancelCreatorFullSave, fastPersistCustomCatalog, scheduleCreatorFullSave, flushCreatorPendingSwitch, installCreatorCommitFastPath,
    installCreatorPerformanceGate, bindCreatorModal, install
  });
  if (typeof window !== 'undefined') {
    window.RoleRenderRecipeBridge = api;
    if (!install()) {
      let attempts = 0;
      const retry = () => {
        if (install() || ++attempts > 50) return;
        setTimeout(retry, 80);
      };
      retry();
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
