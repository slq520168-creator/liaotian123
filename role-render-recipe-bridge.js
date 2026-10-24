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
        if (!creatorModalOpen()) renderer.syncCharacter?.();
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
    creatorModalOpen, rendererAsset, hideRendererStage, cancelDeferredCleanup, deferTextCleanup,
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
