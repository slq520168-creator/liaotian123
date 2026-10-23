(() => {
  'use strict';

  const MANIFEST_URL = 'assets/humans/manifest.json';
  const TIERS = Object.freeze(['portrait', 'upper', 'full']);
  const ALLOWED_LICENSES = new Set(['CC0', 'MIT', 'OWNED']);
  const ID_RE = /^[a-z0-9_-]{1,80}$/i;

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function sanitizeEntry(entry, tier) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const url = String(entry.url || '').trim();
    const license = String(entry.license || '').trim().toUpperCase();
    const source = String(entry.source || '').trim();
    if (!/^assets\/humans\/[a-z0-9_./-]+\.glb(?:\?[a-z0-9_=&.-]+)?$/i.test(url)) return null;
    if (!ALLOWED_LICENSES.has(license) || !source) return null;
    return Object.freeze({
      url,
      license,
      source: source.slice(0, 500),
      customizableBody: Boolean(entry.customizableBody),
      scale: Math.max(0.05, Math.min(20, finite(entry.scale, 1))),
      y: Math.max(-10, Math.min(10, finite(entry.y, 0))),
      rotationY: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, finite(entry.rotationY, 0))),
      framing: entry.framing === 'portrait' || tier === 'portrait' ? 'portrait' : 'full',
      minMorphTargets: 52
    });
  }

  function sanitizeManifest(input) {
    if (!input || input.version !== 1 || !input.characters || typeof input.characters !== 'object' || Array.isArray(input.characters)) {
      throw new TypeError('真人资产 manifest 格式无效');
    }
    const characters = {};
    for (const [id, rawTiers] of Object.entries(input.characters)) {
      if (!ID_RE.test(id) || !rawTiers || typeof rawTiers !== 'object' || Array.isArray(rawTiers)) continue;
      const tiers = {};
      for (const tier of TIERS) {
        const entry = sanitizeEntry(rawTiers[tier], tier);
        if (entry) tiers[tier] = entry;
      }
      if (Object.keys(tiers).length) characters[id] = Object.freeze(tiers);
    }
    return Object.freeze({version: 1, characters: Object.freeze(characters)});
  }

  function replaceRegistry(registry, characters) {
    if (!registry || typeof registry !== 'object') throw new TypeError('真人资产 registry 不可用');
    for (const key of Object.keys(registry)) delete registry[key];
    Object.assign(registry, characters || {});
    return registry;
  }

  async function loadManifest(options = {}) {
    const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    const registry = options.registry || (typeof window !== 'undefined' ? (window.LIAOTIAN_HUMAN_ASSETS ||= {}) : {});
    const url = options.url || MANIFEST_URL;
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持真人资产 manifest 加载');
    const response = await fetchImpl(url, {cache: 'no-cache', credentials: 'same-origin'});
    if (!response?.ok) throw new Error(`真人资产 manifest 加载失败 (${response?.status || 0})`);
    const manifest = sanitizeManifest(await response.json());
    replaceRegistry(registry, manifest.characters);
    return Object.freeze({ok: true, manifest, registry});
  }

  function boot() {
    if (typeof window === 'undefined') return null;
    window.LIAOTIAN_HUMAN_ASSETS ||= {};
    if (window.__ROLE_HUMAN_MANIFEST_PROMISE) return window.__ROLE_HUMAN_MANIFEST_PROMISE;
    const ready = loadManifest({registry: window.LIAOTIAN_HUMAN_ASSETS})
      .then(result => {
        window.dispatchEvent(new CustomEvent('humanmanifestready', {detail: {count: Object.keys(result.manifest.characters).length}}));
        requestAnimationFrame(() => window.__ROLE_HUMAN_RENDERER?.syncCharacter?.());
        return result;
      })
      .catch(error => {
        console.warn('真人资产 manifest 未加载，继续使用普通聊天界面。', error);
        return Object.freeze({ok: false, error});
      });
    window.__ROLE_HUMAN_MANIFEST_PROMISE = ready;
    return ready;
  }

  const core = {MANIFEST_URL, TIERS, sanitizeEntry, sanitizeManifest, replaceRegistry, loadManifest, boot};
  if (typeof window !== 'undefined') {
    const ready = boot();
    window.RoleHumanManifest = Object.freeze({...core, ready});
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = Object.freeze(core);
})();
