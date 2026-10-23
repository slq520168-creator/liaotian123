(() => {
  'use strict';

  const BODY_CHANNELS = Object.freeze([
    'genderFemale','genderMale','ageChild','ageOld',
    'heightShort','heightTall','bodyThin','bodyHeavy','bodyMuscular',
    'chestFull','waistNarrow','waistWide','hipsWide','shouldersWide','legsLong'
  ]);

  const ALIASES = Object.freeze({
    genderFemale: ['genderFemale','gender_female','female'],
    genderMale: ['genderMale','gender_male','male'],
    ageChild: ['ageChild','age_child','youngChild'],
    ageOld: ['ageOld','age_old','old'],
    heightShort: ['heightShort','height_short','short','bodyShort','statureShort'],
    heightTall: ['heightTall','height_tall','tall','bodyTall','statureTall'],
    bodyThin: ['bodyThin','thin','skinny','bodySlim','weightLow','weight_min'],
    bodyHeavy: ['bodyHeavy','heavy','fat','bodyFat','weightHigh','weight_max'],
    bodyMuscular: ['bodyMuscular','muscular','muscle','athletic','muscle_max'],
    chestFull: ['chestFull','breastFull','bustFull','chestLarge','breast_cup_max'],
    waistNarrow: ['waistNarrow','waistSlim','smallWaist'],
    waistWide: ['waistWide','waistLarge','abdomenLarge','belly'],
    hipsWide: ['hipsWide','hipWide','pelvisWide'],
    shouldersWide: ['shouldersWide','shoulderWide','broadShoulders'],
    legsLong: ['legsLong','legLength','longLegs']
  });

  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const normalizeName = value => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

  function parseRolePhysicalSpec(text) {
    const value = String(text || '');
    const block = value.match(/【角色自定义设定】\s*([\s\S]*?)\s*【自定义设定结束】/);
    const source = block?.[1] || value;
    const identity = source.split(/\r?\n/).find(item => /身份：/.test(item)) || '';
    const line = source.split(/\r?\n/).find(item => /外形：/.test(item)) || source;
    const identityValue = identity.replace(/^.*身份：/, '').trim();
    const gender = /(?:^|[，,])\s*男(?:性)?(?:[，,]|$)/.test(identityValue) ? 'male' : /(?:^|[，,])\s*女(?:性)?(?:[，,]|$)/.test(identityValue) ? 'female' : 'unspecified';
    const age = Number(identity.match(/(\d{1,3})\s*岁/)?.[1]) || 0;
    const heightCm = Number(line.match(/身高\s*(\d{2,3})\s*cm/i)?.[1]) || 0;
    const weightJin = Number(line.match(/体重\s*(\d{2,3})\s*斤/)?.[1]) || 0;
    const body = ['偏瘦','匀称','微胖','丰满','胖','健壮'].find(item => line.includes(item)) || '';
    const face = ['自然耐看','圆脸','鹅蛋脸','方脸','长脸','成熟脸','甜美脸'].find(item => line.includes(item)) || '';
    const skin = ['偏白','自然肤色','小麦肤色','深肤色'].find(item => line.includes(item)) || '';
    const hair = ['自然长发','短发','大波浪','卷发','马尾','利落中长发'].find(item => line.includes(item)) || '';
    const outfit = ['日常休闲','居家','成熟优雅','通勤','运动','甜美','性感但自然'].find(item => line.includes(item)) || '';
    return Object.freeze({gender, age, heightCm, weightJin, body, face, skin, hair, outfit});
  }

  function bmiFromSpec(spec = {}) {
    const heightM = Number(spec.heightCm) / 100;
    const kg = Number(spec.weightJin) / 2;
    if (!(heightM > 0) || !(kg > 0)) return 0;
    return kg / (heightM * heightM);
  }

  function shapeWeights(spec = {}) {
    const out = Object.fromEntries(BODY_CHANNELS.map(name => [name, 0]));
    if (spec.gender === 'female') out.genderFemale = 1;
    if (spec.gender === 'male') out.genderMale = 1;
    const age = Number(spec.age);
    if (Number.isFinite(age) && age > 0) {
      if (age < 25) out.ageChild = clamp01((25 - age) / 14);
      if (age > 25) out.ageOld = clamp01((age - 25) / 45);
    }
    const height = Number(spec.heightCm) || 170;
    if (height < 170) out.heightShort = clamp01((170 - height) / 35);
    if (height > 170) out.heightTall = clamp01((height - 170) / 40);
    if (height >= 178) out.legsLong = clamp01((height - 176) / 28) * .45;
    const bmi = bmiFromSpec(spec);
    if (bmi > 0 && bmi < 20) out.bodyThin = clamp01((20 - bmi) / 5);
    if (bmi > 23) out.bodyHeavy = clamp01((bmi - 23) / 12);
    switch (spec.body) {
      case '偏瘦': out.bodyThin = Math.max(out.bodyThin, .58); out.waistNarrow = .22; break;
      case '微胖': out.bodyHeavy = Math.max(out.bodyHeavy, .28); out.waistWide = .12; out.hipsWide = .12; break;
      case '丰满': out.bodyHeavy = Math.max(out.bodyHeavy, .34); out.chestFull = .48; out.hipsWide = .38; out.waistNarrow = .16; break;
      case '胖': out.bodyHeavy = Math.max(out.bodyHeavy, .72); out.waistWide = .55; out.hipsWide = .42; out.chestFull = .34; break;
      case '健壮': out.bodyMuscular = .72; out.shouldersWide = .42; out.bodyHeavy = Math.min(out.bodyHeavy, .26); break;
      default: break;
    }
    return Object.freeze(out);
  }

  function buildBodyMorphIndex(dictionary = {}) {
    const byNormalized = new Map();
    for (const [name, indexRaw] of Object.entries(dictionary || {})) {
      const index = Number(indexRaw);
      if (!Number.isInteger(index)) continue;
      byNormalized.set(normalizeName(name), index);
    }
    const result = {};
    for (const channel of BODY_CHANNELS) {
      for (const alias of ALIASES[channel] || []) {
        const index = byNormalized.get(normalizeName(alias));
        if (Number.isInteger(index)) { result[channel] = index; break; }
      }
    }
    return result;
  }

  function applyBodyWeights(mesh, weights, morphIndex) {
    if (!mesh || !Array.isArray(mesh.morphTargetInfluences)) return false;
    const index = morphIndex || buildBodyMorphIndex(mesh.morphTargetDictionary || {});
    let applied = 0;
    for (const channel of BODY_CHANNELS) {
      const slot = index[channel];
      if (!Number.isInteger(slot) || slot < 0 || slot >= mesh.morphTargetInfluences.length) continue;
      mesh.morphTargetInfluences[slot] = clamp01(weights?.[channel]);
      applied++;
    }
    return applied > 0;
  }

  function findBestBodyMesh(root) {
    let best = null, score = 0;
    const stack = root ? [root] : [], seen = new Set();
    while (stack.length) {
      const node = stack.pop();
      if (!node || seen.has(node)) continue;
      seen.add(node);
      if (node.morphTargetDictionary && Array.isArray(node.morphTargetInfluences)) {
        const count = Object.keys(buildBodyMorphIndex(node.morphTargetDictionary)).length;
        if (count > score) { best = node; score = count; }
      }
      for (const child of Array.isArray(node.children) ? node.children : []) stack.push(child);
    }
    return Object.freeze({mesh: best, score});
  }

  class BodyRigAdapter {
    constructor(mesh = null) { this.mesh = null; this.morphIndex = {}; if (mesh) this.attach(mesh); }
    attach(mesh) { this.mesh = mesh || null; this.morphIndex = buildBodyMorphIndex(this.mesh?.morphTargetDictionary || {}); return Object.keys(this.morphIndex).length; }
    applySpec(specOrText) {
      if (!this.mesh) return false;
      const spec = typeof specOrText === 'string' ? parseRolePhysicalSpec(specOrText) : (specOrText || {});
      return applyBodyWeights(this.mesh, shapeWeights(spec), this.morphIndex);
    }
    reset() { if (this.mesh) applyBodyWeights(this.mesh, {}, this.morphIndex); return this; }
  }

  const api = Object.freeze({BODY_CHANNELS, ALIASES, parseRolePhysicalSpec, bmiFromSpec, shapeWeights, buildBodyMorphIndex, applyBodyWeights, findBestBodyMesh, BodyRigAdapter});
  if (typeof window !== 'undefined') window.RoleBodyRig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
