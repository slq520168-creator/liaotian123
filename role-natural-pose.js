(() => {
  'use strict';

  // Safety shim only. The previous implementation added hard-coded Euler rotations
  // to MPFB arm/forearm/hand bones without validating the model bind/rest pose.
  // That produced raised arms, crossed hands and T-pose-like failures on production.
  // Keep this file inert so old cached loaders cannot re-enable the unsafe behavior.
  const ENABLED = false;
  const DISABLED_REASON = 'unverified-bind-rest-pose';
  const POSE = Object.freeze({});

  function findBone(root, name) {
    let found = null;
    root?.traverse?.(node => {
      if (!found && node?.isBone && String(node.name || '') === name) found = node;
    });
    return found;
  }

  function applyNaturalPose() {
    return false;
  }

  function patchRenderer() {
    return false;
  }

  function boot() {
    return false;
  }

  const api = Object.freeze({ENABLED, DISABLED_REASON, POSE, findBone, applyNaturalPose, patchRenderer, boot});
  if (typeof window !== 'undefined') window.RoleNaturalPose = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
