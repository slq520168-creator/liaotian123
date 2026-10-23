(() => {
  'use strict';

  const REQUIRED_CAPABILITIES = Object.freeze([
    'skeleton', 'body', 'faceIdentity', 'expressions', 'visemes', 'hair', 'clothing', 'mobile'
  ]);
  const ALLOWED_LICENSES = new Set(['CC0', 'MIT', 'OWNED']);

  const REFERENCE_FALLBACK = Object.freeze({
    id: 'reference-mpfb',
    status: 'reference-fallback',
    descriptor: Object.freeze({
      url: 'assets/humans/reference-mpfb.glb', scale: 1, y: 0, rotationY: 0,
      framing: 'portrait', minMorphTargets: 52
    }),
    capabilities: Object.freeze({
      skeleton: true, body: false, faceIdentity: false, expressions: true,
      visemes: true, hair: false, clothing: false, mobile: true, license: 'CC0'
    })
  });

  const BODY_CANDIDATE = Object.freeze({
    id: 'reference-vitruvian-morph',
    status: 'candidate-only',
    descriptor: Object.freeze({
      url: 'assets/humans/reference-vitruvian-morph.glb', scale: 1, y: 0, rotationY: 0,
      framing: 'portrait', minMorphTargets: 52
    }),
    capabilities: Object.freeze({
      skeleton: true, body: true, faceIdentity: false, expressions: true,
      visemes: true, hair: false, clothing: false, mobile: false, license: 'CC0'
    })
  });

  function normalizeCandidate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const descriptor = input.descriptor && typeof input.descriptor === 'object' ? input.descriptor : null;
    const capabilities = input.capabilities && typeof input.capabilities === 'object' ? input.capabilities : null;
    const id = String(input.id || '').trim();
    const license = String(capabilities?.license || '').trim().toUpperCase();
    if (!id || !descriptor?.url || !capabilities || !ALLOWED_LICENSES.has(license)) return null;
    return Object.freeze({
      id,
      status: String(input.status || 'candidate'),
      descriptor: Object.freeze({...descriptor}),
      capabilities: Object.freeze({...capabilities, license})
    });
  }

  function missingCapabilities(candidate) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) return [...REQUIRED_CAPABILITIES, 'license'];
    return REQUIRED_CAPABILITIES.filter(key => normalized.capabilities[key] !== true);
  }

  function isProductionReady(candidate) {
    return missingCapabilities(candidate).length === 0;
  }

  function selectCustomAsset(candidates = []) {
    for (const raw of Array.isArray(candidates) ? candidates : []) {
      const candidate = normalizeCandidate(raw);
      if (candidate && isProductionReady(candidate)) return Object.freeze({...candidate, complete: true});
    }
    return Object.freeze({...REFERENCE_FALLBACK, complete: false, missing: Object.freeze(missingCapabilities(REFERENCE_FALLBACK))});
  }

  const api = Object.freeze({
    REQUIRED_CAPABILITIES, ALLOWED_LICENSES, REFERENCE_FALLBACK, BODY_CANDIDATE,
    normalizeCandidate, missingCapabilities, isProductionReady, selectCustomAsset
  });
  if (typeof window !== 'undefined') window.RoleHumanAssetCapability = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
