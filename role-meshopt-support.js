(() => {
  'use strict';

  const THREE_VERSION = '0.186.1';
  const MESHOPT_VERSION = '1.3.0';
  const BUILD = typeof window !== 'undefined' ? (window.LIAOTIAN_BUILD_VERSION || '20261024-chat3d3') : 'test';
  const localModule = path => {
    if (typeof document === 'undefined') return path;
    return new URL(`${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(BUILD)}`, document.baseURI).href;
  };
  const GLTF_LOADER_MODULE = localModule('vendor/three/examples/jsm/loaders/GLTFLoader.js');
  const MESHOPT_DECODER_MODULE = localModule('vendor/meshoptimizer/meshopt_decoder.mjs');

  function decoderFromModule(module) {
    return module?.MeshoptDecoder || module?.default?.MeshoptDecoder || module?.default || module || null;
  }

  async function install(importer = specifier => import(specifier)) {
    const [loaderModule, decoderModule] = await Promise.all([
      importer(GLTF_LOADER_MODULE),
      importer(MESHOPT_DECODER_MODULE)
    ]);
    const Loader = loaderModule?.GLTFLoader;
    const decoder = decoderFromModule(decoderModule);
    if (!Loader?.prototype || !decoder) throw new Error('Meshopt 解码器初始化失败');
    if (decoder.ready && typeof decoder.ready.then === 'function') await decoder.ready;
    const proto = Loader.prototype;
    if (proto.__liaotianMeshoptInstalled) return Object.freeze({GLTFLoader: Loader, MeshoptDecoder: decoder, patched: false});
    const originalLoad = proto.load;
    if (typeof originalLoad !== 'function' || typeof proto.setMeshoptDecoder !== 'function') {
      throw new Error('当前 GLTFLoader 不支持 MeshoptDecoder');
    }
    proto.load = function(...args) {
      this.setMeshoptDecoder(decoder);
      return originalLoad.apply(this, args);
    };
    Object.defineProperty(proto, '__liaotianMeshoptInstalled', {value: true, configurable: false});
    return Object.freeze({GLTFLoader: Loader, MeshoptDecoder: decoder, patched: true});
  }

  const api = Object.freeze({
    THREE_VERSION,
    MESHOPT_VERSION,
    GLTF_LOADER_MODULE,
    MESHOPT_DECODER_MODULE,
    decoderFromModule,
    install
  });

  if (typeof window !== 'undefined') {
    window.RoleMeshoptSupport = api;
    if (!window.__ROLE_MESHOPT_PATCH_READY) {
      window.__ROLE_MESHOPT_PATCH_READY = install().catch(error => {
        console.warn('Meshopt 支持初始化失败；未压缩 GLB 仍可继续使用。', error);
        return Object.freeze({error});
      });
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
