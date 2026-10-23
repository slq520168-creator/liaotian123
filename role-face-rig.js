(() => {
  'use strict';

  const ARKIT_52 = Object.freeze([
    'browDownLeft','browDownRight','browInnerUp','browOuterUpLeft','browOuterUpRight',
    'cheekPuff','cheekSquintLeft','cheekSquintRight','eyeBlinkLeft','eyeBlinkRight',
    'eyeLookDownLeft','eyeLookDownRight','eyeLookInLeft','eyeLookInRight','eyeLookOutLeft','eyeLookOutRight',
    'eyeLookUpLeft','eyeLookUpRight','eyeSquintLeft','eyeSquintRight','eyeWideLeft','eyeWideRight',
    'jawForward','jawLeft','jawOpen','jawRight','mouthClose','mouthDimpleLeft','mouthDimpleRight',
    'mouthFrownLeft','mouthFrownRight','mouthFunnel','mouthLeft','mouthLowerDownLeft','mouthLowerDownRight',
    'mouthPressLeft','mouthPressRight','mouthPucker','mouthRight','mouthRollLower','mouthRollUpper',
    'mouthShrugLower','mouthShrugUpper','mouthSmileLeft','mouthSmileRight','mouthStretchLeft','mouthStretchRight',
    'mouthUpperUpLeft','mouthUpperUpRight','noseSneerLeft','noseSneerRight','tongueOut'
  ]);

  const CONTROLLED = new Set(ARKIT_52);
  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const clampSigned = value => Math.max(-1, Math.min(1, Number(value) || 0));
  const add = (out, name, value) => {
    if (!CONTROLLED.has(name)) return;
    out[name] = Math.max(out[name] || 0, clamp01(value));
  };

  const VISEME_MIX = Object.freeze({
    sil: Object.freeze({}),
    PP: Object.freeze({mouthClose: 1, mouthPressLeft: .55, mouthPressRight: .55}),
    FF: Object.freeze({mouthLowerDownLeft: .42, mouthLowerDownRight: .42, mouthUpperUpLeft: .16, mouthUpperUpRight: .16, jawOpen: .12}),
    TH: Object.freeze({tongueOut: .58, jawOpen: .24, mouthLowerDownLeft: .2, mouthLowerDownRight: .2}),
    DD: Object.freeze({jawOpen: .28, mouthShrugUpper: .18, mouthStretchLeft: .1, mouthStretchRight: .1}),
    kk: Object.freeze({jawOpen: .42, mouthFunnel: .1}),
    CH: Object.freeze({jawOpen: .26, mouthFunnel: .42, mouthPucker: .22}),
    SS: Object.freeze({jawOpen: .1, mouthStretchLeft: .34, mouthStretchRight: .34, mouthClose: .16}),
    nn: Object.freeze({jawOpen: .2, mouthShrugUpper: .16}),
    RR: Object.freeze({jawOpen: .24, mouthPucker: .22, mouthFunnel: .2}),
    aa: Object.freeze({jawOpen: .92, mouthLowerDownLeft: .22, mouthLowerDownRight: .22}),
    E: Object.freeze({jawOpen: .28, mouthSmileLeft: .34, mouthSmileRight: .34, mouthStretchLeft: .2, mouthStretchRight: .2}),
    ih: Object.freeze({jawOpen: .2, mouthSmileLeft: .22, mouthSmileRight: .22, mouthStretchLeft: .28, mouthStretchRight: .28}),
    oh: Object.freeze({jawOpen: .58, mouthFunnel: .72, mouthPucker: .18}),
    ou: Object.freeze({jawOpen: .28, mouthPucker: .82, mouthFunnel: .48})
  });

  function blankFace() {
    return Object.fromEntries(ARKIT_52.map(name => [name, 0]));
  }

  function normalizeMorphName(name) {
    return String(name || '')
      .replace(/^blendShape\d*\./i, '')
      .replace(/^blendshape\./i, '')
      .replace(/^arkit[_:. -]*/i, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
  }

  function buildMorphIndex(dictionary = {}) {
    const exact = new Map();
    for (const [rawName, index] of Object.entries(dictionary || {})) {
      if (!Number.isInteger(index) && !Number.isFinite(Number(index))) continue;
      exact.set(normalizeMorphName(rawName), Number(index));
    }
    const result = {};
    for (const name of ARKIT_52) {
      const index = exact.get(normalizeMorphName(name));
      if (Number.isInteger(index)) result[name] = index;
    }
    return result;
  }

  function addVisemes(out, visemes = {}) {
    for (const [viseme, strengthRaw] of Object.entries(visemes || {})) {
      const strength = clamp01(strengthRaw);
      if (!strength) continue;
      const mix = VISEME_MIX[viseme];
      if (!mix) continue;
      for (const [name, amount] of Object.entries(mix)) add(out, name, amount * strength);
    }
  }

  function addBlink(out, blink) {
    const value = clamp01(blink);
    add(out, 'eyeBlinkLeft', value);
    add(out, 'eyeBlinkRight', value);
  }

  function addGaze(out, xRaw, yRaw) {
    const x = clampSigned(xRaw) * .9;
    const y = clampSigned(yRaw) * .9;
    if (x > 0) {
      add(out, 'eyeLookOutLeft', x);
      add(out, 'eyeLookInRight', x);
    } else if (x < 0) {
      add(out, 'eyeLookInLeft', -x);
      add(out, 'eyeLookOutRight', -x);
    }
    if (y > 0) {
      add(out, 'eyeLookUpLeft', y);
      add(out, 'eyeLookUpRight', y);
    } else if (y < 0) {
      add(out, 'eyeLookDownLeft', -y);
      add(out, 'eyeLookDownRight', -y);
    }
  }

  function addStateMicroExpression(out, state) {
    if (state === 'listening') {
      add(out, 'browInnerUp', .035);
    } else if (state === 'thinking') {
      add(out, 'browInnerUp', .045);
      add(out, 'eyeSquintLeft', .018);
      add(out, 'eyeSquintRight', .018);
    }
  }

  function weightsFromPresence(frame = {}) {
    const out = blankFace();
    addBlink(out, frame.blink);
    addGaze(out, frame.gazeX, frame.gazeY);
    addVisemes(out, frame.visemes);
    addStateMicroExpression(out, frame.state);
    return out;
  }

  function applyWeights(mesh, weights, morphIndex) {
    if (!mesh || !Array.isArray(mesh.morphTargetInfluences)) return false;
    const index = morphIndex || buildMorphIndex(mesh.morphTargetDictionary || {});
    for (const name of ARKIT_52) {
      const slot = index[name];
      if (!Number.isInteger(slot) || slot < 0 || slot >= mesh.morphTargetInfluences.length) continue;
      mesh.morphTargetInfluences[slot] = clamp01(weights?.[name]);
    }
    return Object.keys(index).length > 0;
  }

  function applyHeadPose(object3D, frame = {}, base = {}) {
    if (!object3D?.rotation) return false;
    const x0 = Number(base.x) || 0;
    const y0 = Number(base.y) || 0;
    const z0 = Number(base.z) || 0;
    object3D.rotation.x = x0 + clampSigned(frame.headPitch) * .9;
    object3D.rotation.y = y0 + clampSigned(frame.headYaw) * .9;
    object3D.rotation.z = z0;
    return true;
  }

  class FaceRigAdapter {
    constructor(mesh = null, headObject = null) {
      this.mesh = null;
      this.headObject = null;
      this.morphIndex = {};
      this.baseRotation = {x: 0, y: 0, z: 0};
      if (mesh) this.attach(mesh, headObject);
    }

    attach(mesh, headObject = null) {
      this.mesh = mesh || null;
      this.headObject = headObject || mesh || null;
      this.morphIndex = buildMorphIndex(this.mesh?.morphTargetDictionary || {});
      const rotation = this.headObject?.rotation;
      this.baseRotation = {
        x: Number(rotation?.x) || 0,
        y: Number(rotation?.y) || 0,
        z: Number(rotation?.z) || 0
      };
      return Object.keys(this.morphIndex).length;
    }

    detach() {
      this.mesh = null;
      this.headObject = null;
      this.morphIndex = {};
      return this;
    }

    render(frame = {}) {
      if (!this.mesh) return false;
      const weights = weightsFromPresence(frame);
      const applied = applyWeights(this.mesh, weights, this.morphIndex);
      applyHeadPose(this.headObject, frame, this.baseRotation);
      return applied;
    }

    reset() {
      if (this.mesh) applyWeights(this.mesh, blankFace(), this.morphIndex);
      if (this.headObject?.rotation) {
        this.headObject.rotation.x = this.baseRotation.x;
        this.headObject.rotation.y = this.baseRotation.y;
        this.headObject.rotation.z = this.baseRotation.z;
      }
      return this;
    }
  }

  const api = Object.freeze({
    ARKIT_52,
    VISEME_MIX,
    blankFace,
    normalizeMorphName,
    buildMorphIndex,
    weightsFromPresence,
    applyWeights,
    applyHeadPose,
    FaceRigAdapter
  });

  if (typeof window !== 'undefined') window.RoleFaceRig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
