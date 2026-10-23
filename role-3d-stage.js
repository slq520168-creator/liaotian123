(() => {
  'use strict';

  const VERSION = '20261023-3d1';
  const DB_NAME = 'sirole_role_assets';
  const DB_VERSION = 1;
  const STORE = 'role_models';
  const MAX_MODEL_BYTES = 25 * 1024 * 1024;
  const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.4.0/dist/model-viewer.min.js';

  const form = document.getElementById('createRoleForm');
  const modal = document.getElementById('createModalOverlay');
  if (!form || !modal || !('indexedDB' in window)) return;

  let dbPromise = null;
  let draftFile = null;
  let draftRemove = false;
  let editorRoleId = '';
  let editorRecord = null;
  let editorObjectUrl = '';
  let stageObjectUrl = '';
  let stageViewer = null;
  let syncToken = 0;
  let viewerLoader = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath: 'id'});
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('3D模型存储不可用'));
    });
    return dbPromise;
  }

  async function getModel(id) {
    if (!id) return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('读取3D模型失败'));
    });
  }

  async function putModel(id, file) {
    const db = await openDb();
    const record = {id, blob: file, name: file.name || 'role.glb', size: file.size || 0, updatedAt: new Date().toISOString()};
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('保存3D模型失败'));
      tx.onabort = () => reject(tx.error || new Error('保存3D模型失败'));
    });
    return record;
  }

  async function deleteModel(id) {
    if (!id) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('删除3D模型失败'));
      tx.onabort = () => reject(tx.error || new Error('删除3D模型失败'));
    });
  }

  function humanSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2) + ' MB';
  }

  function ensureStyles() {
    if (document.getElementById('role3dStyles')) return;
    const style = document.createElement('style');
    style.id = 'role3dStyles';
    style.textContent = `
      .role-builder-3d{margin-top:12px;padding-top:12px;border-top:1px solid rgba(92,72,82,.12)}
      .role-builder-3d h4{margin:0 0 5px;font-size:14px;color:#34262d}.role-builder-3d p{margin:0 0 9px;font-size:12px;line-height:1.5;color:#806f77}
      .role-3d-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.role-3d-status{font-size:12px;color:#6e5b65;min-height:18px;margin-top:7px}
      .role-3d-preview{display:none;margin-top:10px;height:260px;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,#f7f1f4,#eee7eb);border:1px solid rgba(92,72,82,.12)}
      .role-3d-preview.active{display:block}.role-3d-preview model-viewer{width:100%;height:100%;background:transparent}
      .role-live-stage.has-3d-model{background-image:none!important;opacity:.92!important;filter:none!important}
      .role-live-stage.has-3d-model::before{background:linear-gradient(180deg,rgba(255,246,250,.18),rgba(255,243,248,.18) 58%,rgba(255,247,250,.8))!important;z-index:2;pointer-events:none}
      .role-live-stage.has-3d-model::after{z-index:2;pointer-events:none}
      .role-live-stage .role-3d-viewer{position:absolute;inset:0;width:100%;height:100%;z-index:1;background:transparent;pointer-events:auto;--poster-color:transparent}
      .role-live-stage.has-3d-model .role-live-emoji,.role-live-stage.has-3d-model .role-live-speech{z-index:4}
      @media(max-width:560px){.role-3d-preview{height:220px}.role-live-stage.has-3d-model{opacity:.86!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureModelViewer() {
    if (customElements.get('model-viewer')) return Promise.resolve();
    if (viewerLoader) return viewerLoader;
    viewerLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-role-model-viewer]');
      if (existing) {
        customElements.whenDefined('model-viewer').then(resolve).catch(reject);
        return;
      }
      const script = document.createElement('script');
      script.type = 'module';
      script.src = MODEL_VIEWER_SRC;
      script.dataset.roleModelViewer = '1';
      script.onload = () => customElements.whenDefined('model-viewer').then(resolve).catch(reject);
      script.onerror = () => reject(new Error('3D渲染组件加载失败'));
      document.head.appendChild(script);
      setTimeout(() => {
        if (!customElements.get('model-viewer')) reject(new Error('3D渲染组件加载超时'));
      }, 15000);
    }).catch(error => {
      viewerLoader = null;
      throw error;
    });
    return viewerLoader;
  }

  function makeViewer(className) {
    const viewer = document.createElement('model-viewer');
    viewer.className = className;
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('disable-pan', '');
    viewer.setAttribute('interaction-prompt', 'none');
    viewer.setAttribute('shadow-intensity', '0.8');
    viewer.setAttribute('shadow-softness', '0.9');
    viewer.setAttribute('exposure', '1');
    viewer.setAttribute('tone-mapping', 'neutral');
    viewer.setAttribute('autoplay', '');
    viewer.setAttribute('animation-crossfade-duration', '300');
    viewer.setAttribute('camera-orbit', '0deg 82deg auto');
    viewer.setAttribute('field-of-view', '30deg');
    return viewer;
  }

  function clearEditorUrl() {
    if (editorObjectUrl) URL.revokeObjectURL(editorObjectUrl);
    editorObjectUrl = '';
  }

  function clearStageUrl() {
    if (stageObjectUrl) URL.revokeObjectURL(stageObjectUrl);
    stageObjectUrl = '';
  }

  function installEditor() {
    ensureStyles();
    const builder = document.getElementById('roleBuilder');
    if (!builder || document.getElementById('role3dEditor')) return false;
    const block = document.createElement('section');
    block.id = 'role3dEditor';
    block.className = 'role-builder-3d';
    block.innerHTML = `
      <h4>3D人物（可选）</h4>
      <p>使用真正的 GLB 3D人物时会在聊天背景里实时渲染。模型只保存在这台手机的浏览器里，不上传 Supabase / R2，不按聊天次数消耗存储或AI额度。</p>
      <div class="role-3d-actions">
        <button type="button" class="btn btn-outline" id="role3dChooseBtn">选择GLB模型</button>
        <button type="button" class="btn btn-secondary" id="role3dRemoveBtn" hidden>移除3D模型</button>
        <input type="file" id="role3dFile" accept=".glb,model/gltf-binary" hidden>
      </div>
      <div class="role-3d-status" id="role3dStatus"></div>
      <div class="role-3d-preview" id="role3dPreview"></div>
    `;
    builder.appendChild(block);
    const input = document.getElementById('role3dFile');
    document.getElementById('role3dChooseBtn').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const name = String(file.name || '').toLowerCase();
      if (!name.endsWith('.glb')) return setEditorStatus('目前只接收单文件 GLB，避免外部纹理丢失。');
      if (file.size <= 0 || file.size > MAX_MODEL_BYTES) return setEditorStatus('3D模型需小于25MB，避免手机卡顿和本机空间被占满。');
      draftFile = file;
      draftRemove = false;
      editorRecord = null;
      document.getElementById('role3dRemoveBtn').hidden = false;
      await previewEditorBlob(file, file.name);
    });
    document.getElementById('role3dRemoveBtn').addEventListener('click', () => {
      draftFile = null;
      draftRemove = true;
      editorRecord = null;
      clearEditorUrl();
      const preview = document.getElementById('role3dPreview');
      preview.replaceChildren();
      preview.classList.remove('active');
      document.getElementById('role3dRemoveBtn').hidden = true;
      setEditorStatus('保存角色后会移除这个3D模型。');
    });
    return true;
  }

  function setEditorStatus(text) {
    const el = document.getElementById('role3dStatus');
    if (el) el.textContent = text || '';
  }

  async function previewEditorBlob(blob, name) {
    const preview = document.getElementById('role3dPreview');
    if (!preview) return;
    clearEditorUrl();
    editorObjectUrl = URL.createObjectURL(blob);
    preview.replaceChildren();
    preview.classList.add('active');
    setEditorStatus((name || '3D模型') + ' · ' + humanSize(blob.size) + ' · 保存在本机');
    try {
      await ensureModelViewer();
      if (!editorObjectUrl) return;
      const viewer = makeViewer('role-3d-editor-viewer');
      viewer.src = editorObjectUrl;
      preview.appendChild(viewer);
    } catch (error) {
      preview.classList.remove('active');
      setEditorStatus('模型已选择，但当前网络无法加载3D渲染组件；角色仍可保存。');
    }
  }

  async function loadEditorRole(id) {
    editorRoleId = id || '';
    draftFile = null;
    draftRemove = false;
    editorRecord = null;
    clearEditorUrl();
    const preview = document.getElementById('role3dPreview');
    if (preview) { preview.replaceChildren(); preview.classList.remove('active'); }
    const remove = document.getElementById('role3dRemoveBtn');
    if (remove) remove.hidden = true;
    setEditorStatus('');
    if (!id) return;
    try {
      const record = await getModel(id);
      if (!record?.blob) return;
      editorRecord = record;
      if (remove) remove.hidden = false;
      await previewEditorBlob(record.blob, record.name);
    } catch (error) {
      setEditorStatus('这台设备上的3D模型暂时无法读取。');
    }
  }

  function patchOpenModal() {
    if (typeof openModal !== 'function' || openModal.__role3d) return;
    const base = openModal;
    const wrapped = function(charId = '') {
      const result = base.apply(this, arguments);
      requestAnimationFrame(() => loadEditorRole(charId));
      return result;
    };
    wrapped.__role3d = true;
    openModal = wrapped;
  }

  function patchDeleteRole() {
    if (typeof deleteCustomCharacter !== 'function' || deleteCustomCharacter.__role3d) return;
    const base = deleteCustomCharacter;
    const wrapped = function(charId) {
      const existed = typeof characters !== 'undefined' && characters.some(item => item.id === charId && !item.isPreset);
      const result = base.apply(this, arguments);
      if (existed && typeof characters !== 'undefined' && !characters.some(item => item.id === charId)) deleteModel(charId).catch(() => {});
      return result;
    };
    wrapped.__role3d = true;
    deleteCustomCharacter = wrapped;
  }

  function bindSubmit() {
    if (form.dataset.role3dBound) return;
    form.dataset.role3dBound = '1';
    form.addEventListener('submit', () => {
      const file = draftFile;
      const remove = draftRemove;
      if (!file && !remove) return;
      queueMicrotask(async () => {
        if (modal.classList.contains('active')) return;
        const id = typeof activeCharacterId === 'string' ? activeCharacterId : editorRoleId;
        if (!id) return;
        try {
          if (remove) await deleteModel(id);
          else if (file) await putModel(id, file);
          draftFile = null;
          draftRemove = false;
          editorRecord = null;
          syncStage3d();
        } catch (error) {
          console.warn('3D模型保存失败', error);
        }
      });
    }, true);
  }

  function stageNode() {
    return document.getElementById('roleLiveStage');
  }

  async function ensureStageViewer() {
    const stage = stageNode();
    if (!stage) return null;
    if (stageViewer?.isConnected) return stageViewer;
    await ensureModelViewer();
    stageViewer = makeViewer('role-3d-viewer');
    stageViewer.setAttribute('aria-label', '当前角色3D人物');
    stage.prepend(stageViewer);
    return stageViewer;
  }

  async function syncStage3d() {
    const token = ++syncToken;
    const id = typeof activeCharacterId === 'string' ? activeCharacterId : '';
    const stage = stageNode();
    if (!stage || !id) return;
    let record = null;
    try { record = await getModel(id); } catch (error) {}
    if (token !== syncToken) return;
    if (!record?.blob) {
      stage.classList.remove('has-3d-model');
      if (stageViewer) {
        stageViewer.removeAttribute('src');
        stageViewer.hidden = true;
      }
      clearStageUrl();
      return;
    }
    try {
      const viewer = await ensureStageViewer();
      if (token !== syncToken || !viewer) return;
      clearStageUrl();
      stageObjectUrl = URL.createObjectURL(record.blob);
      viewer.src = stageObjectUrl;
      viewer.hidden = false;
      stage.classList.add('has-3d-model');
    } catch (error) {
      stage.classList.remove('has-3d-model');
    }
  }

  function patchSwitchCharacter() {
    if (typeof switchCharacter !== 'function' || switchCharacter.__role3d) return;
    const base = switchCharacter;
    const wrapped = function() {
      const result = base.apply(this, arguments);
      requestAnimationFrame(syncStage3d);
      return result;
    };
    wrapped.__role3d = true;
    switchCharacter = wrapped;
  }

  function boot() {
    if (!installEditor()) return setTimeout(boot, 80);
    if (typeof openModal !== 'function' || typeof switchCharacter !== 'function' || typeof deleteCustomCharacter !== 'function') return setTimeout(boot, 80);
    patchOpenModal();
    patchDeleteRole();
    patchSwitchCharacter();
    bindSubmit();
    ensureStyles();
    requestAnimationFrame(syncStage3d);
    window.__SIROLE_3D_VERSION = VERSION;
  }

  window.addEventListener('pagehide', () => {
    clearEditorUrl();
    clearStageUrl();
  });

  boot();
})();
