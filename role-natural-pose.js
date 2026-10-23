(() => {
  'use strict';

  const POSE = Object.freeze({
    LeftArm: {z: -1.08, x: 0.08},
    RightArm: {z: 1.08, x: 0.08},
    LeftForeArm: {z: -0.10, y: -0.08},
    RightForeArm: {z: 0.10, y: 0.08},
    LeftHand: {z: -0.05},
    RightHand: {z: 0.05},
    Spine: {x: -0.015},
    Spine1: {x: 0.025},
    Spine2: {x: 0.02},
    Neck: {x: -0.015},
    Head: {x: 0.015}
  });

  function findBone(root, name) {
    let found = null;
    root?.traverse?.(node => {
      if (!found && node?.isBone && String(node.name || '') === name) found = node;
    });
    return found;
  }

  function applyNaturalPose(root) {
    if (!root) return false;
    let applied = 0;
    for (const [name, rotation] of Object.entries(POSE)) {
      const bone = findBone(root, name);
      if (!bone?.rotation) continue;
      for (const [axis, value] of Object.entries(rotation)) bone.rotation[axis] += value;
      applied++;
    }
    root.updateMatrixWorld?.(true);
    return applied >= 6;
  }

  function patchRenderer(api = null) {
    const rendererApi = api || (typeof window !== 'undefined' ? window.RoleHumanRenderer : null);
    const proto = rendererApi?.HumanRenderer?.prototype;
    if (!proto?.loadCharacter || proto.loadCharacter.__naturalPose) return false;
    const base = proto.loadCharacter;
    const wrapped = async function(...args) {
      const ok = await base.apply(this, args);
      if (ok && this.root) {
        applyNaturalPose(this.root);
        this.frameModel?.(this.root, 'portrait');
        this.resize?.();
      }
      return ok;
    };
    wrapped.__naturalPose = true;
    proto.loadCharacter = wrapped;
    return true;
  }

  function boot() {
    if (patchRenderer()) return true;
    let attempts = 0;
    const retry = () => {
      if (patchRenderer()) return;
      if (++attempts < 60) setTimeout(retry, 80);
    };
    retry();
    return false;
  }

  const api = Object.freeze({POSE, findBone, applyNaturalPose, patchRenderer, boot});
  if (typeof window !== 'undefined') {
    window.RoleNaturalPose = api;
    boot();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
