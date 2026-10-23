(() => {
  'use strict';

  const TIERS = Object.freeze(['portrait', 'upper', 'full']);
  const RANK = Object.freeze({portrait: 0, upper: 1, full: 2});

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function chooseTier(options = {}) {
    const memory = finite(options.memoryGB, 0);
    const cores = finite(options.cores, 0);
    const width = finite(options.width, 0);
    const saveData = Boolean(options.saveData);
    const connection = String(options.effectiveType || '').toLowerCase();
    if (saveData || connection === 'slow-2g' || connection === '2g') return 'portrait';
    if ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 2)) return 'portrait';
    if (connection === '3g') return 'upper';
    if ((memory > 0 && memory <= 4) || (cores > 0 && cores <= 4)) return 'upper';
    if (width > 0 && width <= 390 && memory > 0 && memory <= 6) return 'upper';
    return 'full';
  }

  function browserTier() {
    const connection = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
    return chooseTier({
      memoryGB: typeof navigator !== 'undefined' ? navigator.deviceMemory : 0,
      cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 0,
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      saveData: connection?.saveData,
      effectiveType: connection?.effectiveType
    });
  }

  function tierOrder(maxTier) {
    const rank = RANK[maxTier] ?? RANK.full;
    return TIERS.filter(tier => RANK[tier] <= rank).sort((a, b) => RANK[b] - RANK[a]);
  }

  function looksTiered(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
    return TIERS.some(tier => input[tier]);
  }

  function selectDescriptor(input, preferredTier = 'full', normalize = value => value) {
    if (!input) return null;
    if (!looksTiered(input)) {
      const descriptor = normalize(input);
      return descriptor ? Object.freeze({...descriptor, tier: descriptor.tier || preferredTier}) : null;
    }
    for (const tier of tierOrder(preferredTier)) {
      const candidate = normalize(input[tier]);
      if (candidate) return Object.freeze({...candidate, tier});
    }
    return null;
  }

  function rawAssetForCharacter(char, registry = {}) {
    if (!char?.id) return null;
    return registry?.[char.id] || char.humanAssets || char.humanAsset || char.model3d || char.model3D || null;
  }

  function selectForCharacter(char, registry = {}, options = {}) {
    const raw = rawAssetForCharacter(char, registry);
    if (!raw) return null;
    const preferredTier = TIERS.includes(options.tier) ? options.tier : browserTier();
    const normalize = typeof options.normalize === 'function' ? options.normalize : value => value;
    return selectDescriptor(raw, preferredTier, normalize);
  }

  function installTieredRegistry(options = {}) {
    if (typeof window === 'undefined' || typeof Proxy === 'undefined') return null;
    const existing = window.LIAOTIAN_HUMANS || {};
    if (existing?.__tieredHumanRegistry) return existing;
    const tiered = options.assets || window.LIAOTIAN_HUMAN_ASSETS || {};
    const proxy = new Proxy(existing, {
      get(target, prop, receiver) {
        if (prop === '__tieredHumanRegistry') return true;
        if (typeof prop === 'string' && tiered?.[prop]) {
          const chosen = selectDescriptor(tiered[prop], browserTier(), value => value);
          if (chosen) return chosen;
        }
        return Reflect.get(target, prop, receiver);
      },
      has(target, prop) {
        return (typeof prop === 'string' && Boolean(tiered?.[prop])) || Reflect.has(target, prop);
      }
    });
    window.LIAOTIAN_HUMANS = proxy;
    return proxy;
  }

  const api = Object.freeze({TIERS, RANK, chooseTier, browserTier, tierOrder, looksTiered, selectDescriptor, rawAssetForCharacter, selectForCharacter, installTieredRegistry});
  if (typeof window !== 'undefined') { window.RoleAssetPolicy = api; installTieredRegistry(); }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
