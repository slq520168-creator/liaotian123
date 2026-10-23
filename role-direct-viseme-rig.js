(() => {
  'use strict';

  const DIRECT_VISEMES = Object.freeze({
    PP: 'viseme_PP',
    FF: 'viseme_FF',
    TH: 'viseme_TH',
    DD: 'viseme_DD',
    kk: 'viseme_kk',
    CH: 'viseme_CH',
    SS: 'viseme_SS',
    nn: 'viseme_nn',
    RR: 'viseme_RR',
    aa: 'viseme_aa',
    E: 'viseme_E',
    ih: 'viseme_I',
    oh: 'viseme_O',
    ou: 'viseme_U'
  });
  const MIN_DIRECT_VISEMES = 8;
  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const normalize = value => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

  function buildDirectIndex(dictionary = {}) {
    const byName = new Map();
    for (const [rawName, rawIndex] of Object.entries(dictionary || {})) {
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 0) continue;
      byName.set(normalize(rawName), index);
    }
    const out = {};
    for (const [viseme, target] of Object.entries(DIRECT_VISEMES)) {
      const index = byName.get(normalize(target));
      if (Number.isInteger(index)) out[viseme] = index;
    }
    return out;
  }

  function directCoverage(index = {}) {
    return Object.keys(index).length;
  }

  function applyDirectVisemes(mesh, visemes = {}, index = null) {
    if (!mesh || !Array.isArray(mesh.morphTargetInfluences)) return false;
    const direct = index || buildDirectIndex(mesh.morphTargetDictionary || {});
    if (directCoverage(direct) < MIN_DIRECT_VISEMES) return false;
    for (const slot of Object.values(direct)) {
      if (Number.isInteger(slot) && slot >= 0 && slot < mesh.morphTargetInfluences.length) mesh.morphTargetInfluences[slot] = 0;
    }
    for (const [viseme, strength] of Object.entries(visemes || {})) {
      const slot = direct[viseme];
      if (!Number.isInteger(slot) || slot < 0 || slot >= mesh.morphTargetInfluences.length) continue;
      mesh.morphTargetInfluences[slot] = Math.max(mesh.morphTargetInfluences[slot] || 0, clamp01(strength));
    }
    return true;
  }

  function patchFaceRig(FaceRigAdapter) {
    if (!FaceRigAdapter?.prototype) return false;
    const proto = FaceRigAdapter.prototype;
    if (proto.__directVisemePatched) return true;
    const baseAttach = proto.attach;
    const baseRender = proto.render;
    const baseReset = proto.reset;
    if (typeof baseAttach !== 'function' || typeof baseRender !== 'function' || typeof baseReset !== 'function') return false;

    proto.attach = function(mesh, headObject = null) {
      const count = baseAttach.call(this, mesh, headObject);
      this.directVisemeIndex = buildDirectIndex(this.mesh?.morphTargetDictionary || {});
      this.directVisemeCount = directCoverage(this.directVisemeIndex);
      return count;
    };

    proto.render = function(frame = {}) {
      const useDirect = this.directVisemeCount >= MIN_DIRECT_VISEMES;
      const baseFrame = useDirect && frame?.visemes ? {...frame, visemes: {}} : frame;
      const applied = baseRender.call(this, baseFrame);
      if (useDirect) applyDirectVisemes(this.mesh, frame?.visemes || {}, this.directVisemeIndex);
      return applied;
    };

    proto.reset = function() {
      const result = baseReset.call(this);
      if (this.directVisemeCount >= MIN_DIRECT_VISEMES) applyDirectVisemes(this.mesh, {}, this.directVisemeIndex);
      return result;
    };

    Object.defineProperty(proto, '__directVisemePatched', {value: true});
    return true;
  }

  function boot() {
    if (typeof window === 'undefined') return false;
    const Adapter = window.RoleFaceRig?.FaceRigAdapter;
    if (!Adapter) {
      setTimeout(boot, 40);
      return false;
    }
    return patchFaceRig(Adapter);
  }

  const api = Object.freeze({DIRECT_VISEMES, MIN_DIRECT_VISEMES, buildDirectIndex, directCoverage, applyDirectVisemes, patchFaceRig, boot});
  if (typeof window !== 'undefined') {
    window.RoleDirectVisemeRig = api;
    boot();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
