(() => {
  'use strict';

  function hideLegacyCreatorUi() {
    const form = document.getElementById('createRoleForm');
    if (!form) return false;
    const allowed = new Set(['roleCreatorStudio', 'roleCreator3dPreview']);
    for (const child of [...form.children]) {
      if (allowed.has(child.id)) continue;
      child.dataset.legacyCreatorUi = 'hidden';
      child.hidden = true;
      child.setAttribute('aria-hidden', 'true');
      child.style.setProperty('display', 'none', 'important');
    }
    form.classList.add('creator-3d-only');
    const title = document.getElementById('createRoleTitle');
    if (title) title.textContent = '3D 人物大厅';
    return true;
  }

  function patchCreatorCamera() {
    const proto = window.RoleHumanRenderer?.HumanRenderer?.prototype;
    if (!proto?.frameModel || proto.frameModel.__creatorFullBodyFit) return Boolean(proto?.frameModel);
    const base = proto.frameModel;
    const wrapped = function(root, framing = 'full') {
      const result = base.call(this, root, framing);
      if (this?.container?.id !== 'roleCreator3dPreviewCanvas' || !this.camera || !this.modules?.THREE || !root) return result;
      try {
        const THREE = this.modules.THREE;
        const box = new THREE.Box3().setFromObject(root);
        if (box.isEmpty()) return result;
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const currentDistance = Math.max(0.8, Math.abs(this.camera.position.z - center.z));
        const targetY = center.y - size.y * 0.03;
        const distance = currentDistance * 1.28;
        this.camera.position.set(center.x, targetY, center.z + distance);
        this.camera.lookAt(center.x, targetY, center.z);
        this.camera.near = Math.max(0.01, distance / 120);
        this.camera.far = Math.max(50, distance * 12);
        this.camera.updateProjectionMatrix();
      } catch {}
      return result;
    };
    wrapped.__creatorFullBodyFit = true;
    proto.frameModel = wrapped;
    return true;
  }

  function install() {
    hideLegacyCreatorUi();
    patchCreatorCamera();
    const form = document.getElementById('createRoleForm');
    if (form && typeof MutationObserver === 'function') {
      const observer = new MutationObserver(() => hideLegacyCreatorUi());
      observer.observe(form, {childList: true});
    }
    let tries = 0;
    const retry = () => {
      hideLegacyCreatorUi();
      if (patchCreatorCamera()) return;
      if (++tries < 80) setTimeout(retry, 80);
    };
    retry();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once: true});
  else install();
})();
