(() => {
  'use strict';

  const FACE_KEYS = Object.freeze({
    '自然耐看': '', '圆脸': 'faceRound', '鹅蛋脸': 'faceOval', '方脸': 'faceSquare',
    '长脸': 'faceLong', '成熟脸': 'faceMature', '甜美脸': 'faceSweet'
  });
  const HAIR_KEYS = Object.freeze({
    '自然长发': 'natural-long', '短发': 'short', '大波浪': 'wave', '卷发': 'curl',
    '马尾': 'ponytail', '利落中长发': 'mid'
  });
  const OUTFIT_KEYS = Object.freeze({
    '日常休闲': 'casual', '居家': 'home', '成熟优雅': 'elegant', '通勤': 'office',
    '运动': 'sport', '甜美': 'sweet', '性感但自然': 'sensual'
  });
  const SKIN_MULTIPLIERS = Object.freeze({
    '偏白': Object.freeze([1.08, 1.04, 1.01]),
    '自然肤色': Object.freeze([1, 1, 1]),
    '小麦肤色': Object.freeze([0.88, 0.77, 0.66]),
    '深肤色': Object.freeze([0.68, 0.56, 0.49])
  });
  const FACE_MORPHS = Object.freeze(Object.values(FACE_KEYS).filter(Boolean));

  const normalize = value => String(value || '').replace(/^blendShape\d*\./i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

  function walk(root, visit) {
    if (!root || typeof visit !== 'function') return;
    const stack = [root];
    const seen = new Set();
    while (stack.length) {
      const node = stack.pop();
      if (!node || seen.has(node)) continue;
      seen.add(node);
      visit(node);
      const children = Array.isArray(node.children) ? node.children : [];
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
  }

  function buildIndex(dictionary = {}) {
    const byName = new Map();
    for (const [name, rawIndex] of Object.entries(dictionary || {})) {
      const index = Number(rawIndex);
      if (Number.isInteger(index) && index >= 0) byName.set(normalize(name), index);
    }
    const out = {};
    for (const name of FACE_MORPHS) {
      const slot = byName.get(normalize(name));
      if (Number.isInteger(slot)) out[name] = slot;
    }
    return out;
  }

  function applyFaceShape(mesh, choice, index = null) {
    if (!mesh || !Array.isArray(mesh.morphTargetInfluences)) return false;
    const morphIndex = index || buildIndex(mesh.morphTargetDictionary || {});
    let supported = 0;
    for (const name of FACE_MORPHS) {
      const slot = morphIndex[name];
      if (!Number.isInteger(slot) || slot >= mesh.morphTargetInfluences.length) continue;
      mesh.morphTargetInfluences[slot] = 0;
      supported++;
    }
    const target = FACE_KEYS[choice] ?? '';
    if (!target) return supported > 0 || choice === '自然耐看';
    const slot = morphIndex[target];
    if (!Number.isInteger(slot) || slot >= mesh.morphTargetInfluences.length) return false;
    mesh.morphTargetInfluences[slot] = 1;
    return true;
  }

  function variantKey(node, type) {
    const direct = node?.userData?.[type === 'hair' ? 'roleHair' : 'roleOutfit'];
    if (typeof direct === 'string' && direct.trim()) return direct.trim().toLowerCase();
    const name = String(node?.name || '');
    const match = name.match(type === 'hair' ? /^Hair__([a-z0-9_-]+)$/i : /^Outfit__([a-z0-9_-]+)$/i);
    return match ? match[1].toLowerCase() : '';
  }

  function collectVariants(root, type) {
    const variants = [];
    walk(root, node => {
      const key = variantKey(node, type);
      if (key) variants.push({node, key, visible: node.visible !== false});
    });
    return variants;
  }

  function applyVariant(variants, key) {
    if (!Array.isArray(variants) || !variants.length || !key) return false;
    const wanted = String(key).toLowerCase();
    const match = variants.some(item => item.key === wanted);
    if (!match) return false;
    for (const item of variants) item.node.visible = item.key === wanted;
    return true;
  }

  function materialList(material) {
    return Array.isArray(material) ? material.filter(Boolean) : material ? [material] : [];
  }

  function isSkinSurface(node, material) {
    if (node?.userData?.roleSurface === 'skin') return true;
    const materialName = String(material?.name || '');
    return /^Skin(?:__|$)/i.test(materialName);
  }

  function collectSkinMaterials(root) {
    const records = [];
    const seen = new Set();
    walk(root, node => {
      for (const material of materialList(node.material)) {
        if (!material?.color || !isSkinSurface(node, material) || seen.has(material)) continue;
        seen.add(material);
        records.push({
          material,
          r: Number(material.color.r) || 0,
          g: Number(material.color.g) || 0,
          b: Number(material.color.b) || 0
        });
      }
    });
    return records;
  }

  function applySkinTone(records, choice) {
    const multiplier = SKIN_MULTIPLIERS[choice];
    if (!multiplier || !Array.isArray(records) || !records.length) return false;
    for (const record of records) {
      const color = record.material?.color;
      if (!color) continue;
      color.r = clamp01(record.r * multiplier[0]);
      color.g = clamp01(record.g * multiplier[1]);
      color.b = clamp01(record.b * multiplier[2]);
      record.material.needsUpdate = true;
    }
    return true;
  }

  class AppearanceRigAdapter {
    constructor(root = null, faceMesh = null) {
      this.root = null;
      this.faceMesh = null;
      this.faceIndex = {};
      this.hairVariants = [];
      this.outfitVariants = [];
      this.skinMaterials = [];
      if (root) this.attach(root, faceMesh);
    }

    attach(root, faceMesh = null) {
      this.reset();
      this.root = root || null;
      this.faceMesh = faceMesh || null;
      this.faceIndex = buildIndex(this.faceMesh?.morphTargetDictionary || {});
      this.hairVariants = collectVariants(this.root, 'hair');
      this.outfitVariants = collectVariants(this.root, 'outfit');
      this.skinMaterials = collectSkinMaterials(this.root);
      return this;
    }

    applySpec(recipe = {}) {
      const face = applyFaceShape(this.faceMesh, recipe.face, this.faceIndex);
      const skin = applySkinTone(this.skinMaterials, recipe.skin);
      const hair = applyVariant(this.hairVariants, HAIR_KEYS[recipe.hair]);
      const outfit = applyVariant(this.outfitVariants, OUTFIT_KEYS[recipe.outfit]);
      return Object.freeze({face, skin, hair, outfit, applied: face || skin || hair || outfit});
    }

    reset() {
      if (this.faceMesh) applyFaceShape(this.faceMesh, '自然耐看', this.faceIndex);
      for (const record of this.skinMaterials || []) {
        const color = record.material?.color;
        if (!color) continue;
        color.r = record.r; color.g = record.g; color.b = record.b;
        record.material.needsUpdate = true;
      }
      for (const item of this.hairVariants || []) item.node.visible = item.visible;
      for (const item of this.outfitVariants || []) item.node.visible = item.visible;
      return this;
    }
  }

  const api = Object.freeze({
    FACE_KEYS, HAIR_KEYS, OUTFIT_KEYS, SKIN_MULTIPLIERS, FACE_MORPHS,
    normalize, walk, buildIndex, applyFaceShape, variantKey, collectVariants, applyVariant,
    collectSkinMaterials, applySkinTone, AppearanceRigAdapter
  });
  if (typeof window !== 'undefined') window.RoleAppearanceRig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
