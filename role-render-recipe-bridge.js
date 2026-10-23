(() => {
  'use strict';
  function recipeForCharacter(char, recipeApi) {
    const api = recipeApi || (typeof window !== 'undefined' ? window.RoleVisualRecipe : null);
    if (!char) return null;
    if (api?.forCharacter) return api.forCharacter(char);
    return char.visualRecipe || char.personality || null;
  }
  function applyStructuredRecipe(renderer, char, recipeApi) {
    if (!renderer || !char) return false;
    const recipe = recipeForCharacter(char, recipeApi);
    if (!recipe) return false;
    let applied = false;
    if (renderer.bodyRig?.applySpec) applied = Boolean(renderer.bodyRig.applySpec(recipe)) || applied;
    renderer.visualRecipe = recipe;
    return applied;
  }
  function install() {
    if (typeof window === 'undefined') return false;
    const Renderer = window.RoleHumanRenderer?.HumanRenderer;
    if (!Renderer?.prototype?.loadCharacter) return false;
    const base = Renderer.prototype.loadCharacter;
    if (base.__visualRecipe) return true;
    const wrapped = async function(char) {
      const ok = await base.call(this, char);
      if (ok) applyStructuredRecipe(this, char, window.RoleVisualRecipe);
      return ok;
    };
    wrapped.__visualRecipe = true;
    Renderer.prototype.loadCharacter = wrapped;
    requestAnimationFrame(() => window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());
    return true;
  }
  const api = Object.freeze({recipeForCharacter, applyStructuredRecipe, install});
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
