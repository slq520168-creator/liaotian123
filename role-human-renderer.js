(() => {
  'use strict';

  const THREE_VERSION = '0.186.1';
  const THREE_MODULE = `https://esm.sh/three@${THREE_VERSION}`;
  const GLTF_LOADER_MODULE = `https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js`;
  const HEAD_NAME_RE = /(^|[^a-z])(head|face|neck)([^a-z]|$)/i;

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function safeAssetPath(value, origin = '') {
    const raw = String(value || '').trim();
    if (!raw || /^(?:data|blob|javascript):/i.test(raw)) return '';
    if (/^(?:\/|\.\/|\.\.\/|assets\/)/.test(raw)) return raw;
    if (!/^https:\/\//i.test(raw)) return '';
    if (!origin) return '';
    try {
      const url = new URL(raw);
      return url.origin === origin ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function normalizeAssetDescriptor(input, options = {}) {
    if (!input) return null;
    const raw = typeof input === 'string' ? {url: input} : input;
    if (!raw || typeof raw !== 'object') return null;
    const url = safeAssetPath(raw.url || raw.src || raw.model, options.origin || '');
    if (!url) return null;
    return Object.freeze({
      url,
      scale: Math.max(0.05, Math.min(20, finite(raw.scale, 1))),
      y: Math.max(-10, Math.min(10, finite(raw.y, 0))),
      rotationY: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, finite(raw.rotationY, 0))),
      framing: raw.framing === 'portrait' ? 'portrait' : 'full',
      minMorphTargets: Math.max(1, Math.min(52, Math.round(finite(raw.minMorphTargets, 8))))
    });
  }

  function assetForCharacter(char, registry = {}, options = {}) {
    if (!char?.id) return null;
    const fromRegistry = registry?.[char.id];
    if (fromRegistry) return normalizeAssetDescriptor(fromRegistry, options);
    const local = char.humanAsset || char.model3d || char.model3D || null;
    return normalizeAssetDescriptor(local, options);
  }

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

  function scoreMorphMesh(node, rigApi) {
    if (!node || !node.morphTargetDictionary || !Array.isArray(node.morphTargetInfluences)) return 0;
    const build = rigApi?.buildMorphIndex;
    if (typeof build !== 'function') return Object.keys(node.morphTargetDictionary).length;
    return Object.keys(build(node.morphTargetDictionary)).length;
  }

  function findBestFaceMesh(root, rigApi) {
    let best = null;
    let bestScore = 0;
    walk(root, node => {
      const score = scoreMorphMesh(node, rigApi);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    });
    return Object.freeze({mesh: best, score: bestScore});
  }

  function findHeadObject(root, faceMesh) {
    let node = faceMesh?.parent || null;
    while (node && node !== root) {
      if (HEAD_NAME_RE.test(String(node.name || '')) && node.rotation) return node;
      node = node.parent || null;
    }
    let namedBone = null;
    let named = null;
    walk(root, item => {
      if (!HEAD_NAME_RE.test(String(item.name || '')) || !item.rotation) return;
      if (!named) named = item;
      if (!namedBone && item.isBone) namedBone = item;
    });
    return namedBone || named || faceMesh || root || null;
  }

  function disposeMaterial(material) {
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    for (const item of list) {
      if (!item) continue;
      for (const value of Object.values(item)) {
        if (value?.isTexture && typeof value.dispose === 'function') value.dispose();
      }
      if (typeof item.dispose === 'function') item.dispose();
    }
  }

  function disposeObject(root) {
    walk(root, node => {
      if (node.geometry?.dispose) node.geometry.dispose();
      disposeMaterial(node.material);
    });
  }

  let modulePromise = null;
  async function loadThreeModules(importer = specifier => import(specifier)) {
    if (!modulePromise) {
      modulePromise = Promise.all([
        importer(THREE_MODULE),
        importer(GLTF_LOADER_MODULE)
      ]).then(([THREE, loaderModule]) => ({THREE, GLTFLoader: loaderModule.GLTFLoader})).catch(error => {
        modulePromise = null;
        throw error;
      });
    }
    return modulePromise;
  }

  class HumanRenderer {
    constructor(options = {}) {
      this.registry = options.registry || (typeof window !== 'undefined' ? window.LIAOTIAN_HUMANS || {} : {});
      this.container = options.container || null;
      this.stage = null;
      this.canvasHost = null;
      this.status = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.root = null;
      this.faceRig = null;
      this.loop = null;
      this.resizeObserver = null;
      this.loadToken = 0;
      this.currentId = '';
      this.modules = null;
      this.baseRootY = 0;
    }

    currentCharacter() {
      if (typeof characters === 'undefined') return null;
      return characters.find(item => item.id === activeCharacterId) || null;
    }

    origin() {
      return typeof location !== 'undefined' ? location.origin : '';
    }

    ensureStage() {
      if (this.stage) return this.stage;
      const target = this.container || document.querySelector('.messages-container');
      if (!target) return null;
      const style = document.createElement('style');
      style.id = 'roleHumanRendererStyles';
      style.textContent = `
        .role-human-stage{display:none;position:relative;width:100%;height:min(48vh,520px);min-height:300px;overflow:hidden;background:linear-gradient(180deg,#f5f1f3,#ebe5e8);border-bottom:1px solid rgba(70,50,60,.09)}
        .role-human-stage.active{display:block}.role-human-stage canvas{display:block;width:100%;height:100%;touch-action:none}.role-human-status{position:absolute;left:12px;bottom:10px;padding:5px 8px;border-radius:999px;background:rgba(20,18,19,.52);color:#fff;font-size:11px;line-height:1;opacity:0;transition:opacity .2s;pointer-events:none}
        .role-human-stage.loading .role-human-status,.role-human-stage.error .role-human-status{opacity:1}.role-human-stage.error{display:none}
        @media(max-width:560px){.role-human-stage{height:42vh;min-height:260px;max-height:430px}}
      `;
      if (!document.getElementById(style.id)) document.head.appendChild(style);
      this.stage = document.createElement('section');
      this.stage.className = 'role-human-stage';
      this.stage.id = 'roleHumanStage';
      this.stage.setAttribute('aria-label', '3D真人角色');
      this.canvasHost = document.createElement('div');
      this.canvasHost.className = 'role-human-canvas-host';
      this.canvasHost.style.width = '100%';
      this.canvasHost.style.height = '100%';
      this.status = document.createElement('div');
      this.status.className = 'role-human-status';
      this.status.setAttribute('role', 'status');
      this.stage.append(this.canvasHost, this.status);
      target.prepend(this.stage);
      return this.stage;
    }

    setStatus(text, state = '') {
      if (!this.stage) return;
      this.stage.classList.toggle('loading', state === 'loading');
      this.stage.classList.toggle('error', state === 'error');
      if (this.status) this.status.textContent = text || '';
    }

    async ensureEngine() {
      if (this.renderer) return;
      this.modules = await loadThreeModules();
      const {THREE} = this.modules;
      const quality = window.RoleRenderLoop?.browserQuality?.() || {pixelRatio: 1, shadows: false};
      this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: quality.pixelRatio <= 1.25, powerPreference: 'high-performance'});
      this.renderer.setPixelRatio(quality.pixelRatio);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.shadowMap.enabled = Boolean(quality.shadows);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x7b7180, 2.1);
      const key = new THREE.DirectionalLight(0xffffff, 2.3);
      key.position.set(2.5, 4, 4);
      key.castShadow = Boolean(quality.shadows);
      const fill = new THREE.DirectionalLight(0xffe8ef, 1.2);
      fill.position.set(-3, 2, 2);
      this.scene.add(hemi, key, fill);
      this.canvasHost.appendChild(this.renderer.domElement);
      const resize = () => this.resize();
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(resize);
        this.resizeObserver.observe(this.stage);
      }
      window.addEventListener('resize', resize, {passive:true});
      this._onResize = resize;
      this.loop = window.RoleRenderLoop?.createBrowserLoop?.((frame) => this.renderFrame(frame));
      this.loop?.start?.();
      this.resize();
    }

    resize() {
      if (!this.renderer || !this.camera || !this.stage) return;
      const rect = this.stage.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    frameModel(root, framing = 'full') {
      const {THREE} = this.modules;
      const box = new THREE.Box3().setFromObject(root);
      if (box.isEmpty()) throw new Error('3D人物没有可显示的几何体');
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const targetY = framing === 'portrait' ? center.y + size.y * 0.22 : center.y;
      const visibleHeight = framing === 'portrait' ? Math.max(size.y * 0.62, size.x) : Math.max(size.y, size.x * 1.25);
      const distance = Math.max(0.8, visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5))) * 1.16);
      this.camera.position.set(center.x, targetY, center.z + distance);
      this.camera.lookAt(center.x, targetY, center.z);
      this.camera.near = Math.max(0.01, distance / 100);
      this.camera.far = Math.max(50, distance * 10);
      this.camera.updateProjectionMatrix();
    }

    clearModel() {
      if (this.faceRig?.reset) this.faceRig.reset();
      this.faceRig = null;
      if (this.root && this.scene) {
        this.scene.remove(this.root);
        disposeObject(this.root);
      }
      this.root = null;
      this.currentId = '';
      if (this.stage) {
        this.stage.classList.remove('active', 'loading', 'error');
        this.setStatus('');
      }
    }

    async loadCharacter(char) {
      const asset = assetForCharacter(char, this.registry, {origin: this.origin()});
      const token = ++this.loadToken;
      if (!asset) {
        this.clearModel();
        return false;
      }
      if (this.currentId === char.id && this.root) return true;
      this.ensureStage();
      this.stage.classList.add('active');
      this.setStatus('正在加载真人角色…', 'loading');
      try {
        await this.ensureEngine();
        if (token !== this.loadToken) return false;
        const loader = new this.modules.GLTFLoader();
        const gltf = await loader.loadAsync(asset.url);
        if (token !== this.loadToken) {
          disposeObject(gltf.scene);
          return false;
        }
        const candidate = findBestFaceMesh(gltf.scene, window.RoleFaceRig);
        if (!candidate.mesh || candidate.score < asset.minMorphTargets) {
          disposeObject(gltf.scene);
          throw new Error(`模型脸部仅识别到 ${candidate.score} 个 ARKit morph target`);
        }
        this.clearModel();
        this.ensureStage();
        this.stage.classList.add('active');
        this.root = gltf.scene;
        this.currentId = char.id;
        this.root.scale.setScalar(asset.scale);
        this.root.position.y = asset.y;
        this.root.rotation.y = asset.rotationY;
        this.baseRootY = this.root.position.y;
        this.scene.add(this.root);
        const head = findHeadObject(this.root, candidate.mesh);
        this.faceRig = new window.RoleFaceRig.FaceRigAdapter(candidate.mesh, head);
        this.frameModel(this.root, asset.framing);
        this.resize();
        this.setStatus('');
        this.stage.classList.remove('loading', 'error');
        return true;
      } catch (error) {
        if (token !== this.loadToken) return false;
        this.clearModel();
        this.ensureStage();
        this.setStatus(error?.message || '真人角色加载失败', 'error');
        return false;
      }
    }

    renderFrame(frame) {
      if (!this.renderer || !this.scene || !this.camera || !this.root || !this.faceRig) return;
      this.faceRig.render(frame || {});
      this.renderer.render(this.scene, this.camera);
    }

    async syncCharacter() {
      return this.loadCharacter(this.currentCharacter());
    }

    dispose() {
      this.loadToken++;
      this.clearModel();
      this.loop?.dispose?.();
      this.loop = null;
      this.resizeObserver?.disconnect?.();
      this.resizeObserver = null;
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      this.renderer?.dispose?.();
      this.renderer = null;
      this.stage?.remove?.();
      this.stage = null;
    }
  }

  function boot() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!window.RolePresence || !window.RoleFaceRig || !window.RoleRenderLoop || typeof switchCharacter !== 'function') {
      setTimeout(boot, 80);
      return;
    }
    if (window.__ROLE_HUMAN_RENDERER) return;
    const renderer = new HumanRenderer();
    renderer.ensureStage();
    const baseSwitch = switchCharacter;
    if (!baseSwitch.__humanRenderer) {
      const wrapped = function(...args) {
        const result = baseSwitch.apply(this, args);
        requestAnimationFrame(() => renderer.syncCharacter());
        return result;
      };
      wrapped.__humanRenderer = true;
      switchCharacter = wrapped;
    }
    renderer.syncCharacter();
    window.__ROLE_HUMAN_RENDERER = renderer;
  }

  const api = Object.freeze({
    THREE_VERSION,
    THREE_MODULE,
    GLTF_LOADER_MODULE,
    safeAssetPath,
    normalizeAssetDescriptor,
    assetForCharacter,
    walk,
    scoreMorphMesh,
    findBestFaceMesh,
    findHeadObject,
    disposeObject,
    loadThreeModules,
    HumanRenderer
  });

  if (typeof window !== 'undefined') window.RoleHumanRenderer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  boot();
})();
