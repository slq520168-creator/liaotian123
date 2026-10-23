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

  function applyStructuredRecipe(renderer, char, recipeApi, appearanceApi) {
    if (!renderer || !char) return false;
    const recipe = recipeForCharacter(char, recipeApi);
    if (!recipe) return false;
    let applied = false;
    if (renderer.bodyRig?.applySpec) applied = Boolean(renderer.bodyRig.applySpec(recipe)) || applied;
    const appearanceRig = ensureAppearanceRig(renderer, appearanceApi);
    const appearance = appearanceRig?.applySpec?.(recipe) || null;
    if (appearance?.applied) applied = true;
    renderer.visualRecipe = recipe;
    renderer.appearanceResult = appearance;
    return applied;
  }

  function install() {
    if (typeof window === 'undefined') return false;
    const Renderer = window.RoleHumanRenderer?.HumanRenderer;
    const proto = Renderer?.prototype;
    if (!proto?.loadCharacter) return false;

    const currentClear = proto.clearModel;
    if (typeof currentClear === 'function' && !currentClear.__appearanceRecipe) {
      const clearWrapped = function(...args) {
        this.appearanceRig?.reset?.();
        this.appearanceRig = null;
        this.appearanceResult = null;
        return currentClear.apply(this, args);
      };
      clearWrapped.__appearanceRecipe = true;
      proto.clearModel = clearWrapped;
    }

    const currentLoad = proto.loadCharacter;
    if (!currentLoad.__visualRecipe) {
      const wrapped = async function(char) {
        const ok = await currentLoad.call(this, char);
        if (ok) applyStructuredRecipe(this, char, window.RoleVisualRecipe, window.RoleAppearanceRig);
        return ok;
      };
      wrapped.__visualRecipe = true;
      proto.loadCharacter = wrapped;
    }

    requestAnimationFrame(() => window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());
    return true;
  }

  const api = Object.freeze({recipeForCharacter, ensureAppearanceRig, applyStructuredRecipe, install});
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
