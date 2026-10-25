const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production creation uses the 3D-only wizard and not the synchronous custom visual bridge', () => {
  const config = fs.readFileSync('config/app.js', 'utf8');
  const productionList = config.match(/for\(const src of \[(.*?)\]\)/s)?.[1] || '';
  assert(!productionList.includes("'role-custom-visual.js'"));
  assert(config.includes('role-creator-wizard.js'));
  assert(!config.includes("'role-creator-studio.js'"));
  assert(config.includes('role-human-renderer.js'));
});

test('3D role IndexedDB backup is coalesced instead of writing on every sidebar mutation', () => {
  const source = fs.readFileSync('role-persistence.js', 'utf8');
  assert(source.includes('function scheduleCustomRolesPersist'));
  assert(source.includes('new MutationObserver(()=>scheduleCustomRolesPersist())'));
  assert(source.includes("const THREE_D_ROLES_KEY='3d-roles-v1'"));
  assert(source.includes("char.roleKind==='3d'"));
  assert(!source.includes("new MutationObserver(()=>persistCustomRoles()).observe(customList"));
});

test('creator pauses WebGL and defers disposal of the previous 3D model off the submit frame', () => {
  const source = fs.readFileSync('role-render-recipe-bridge.js', 'utf8');
  assert(source.includes('function creatorModalOpen()'));
  assert(source.includes('this.cancelPendingLoad?.()'));
  assert(source.includes('hideRendererStage(this)'));
  assert(source.includes('requestIdleCallback(cleanup, {timeout:900})'));
  assert(source.includes('deferTextCleanup(this, char, currentSync, args)'));
  assert(source.includes("observer.observe(modal, {attributes:true, attributeFilter:['class']})"));
});

test('creator commit still closes before heavy 3D switching and full persistence', () => {
  const source = fs.readFileSync('role-render-recipe-bridge.js', 'utf8');
  const config = fs.readFileSync('config/app.js', 'utf8');
  assert(source.includes('function installCreatorCommitFastPath()'));
  assert(source.includes('window.__ROLE_CREATOR_PENDING_SWITCH = {charId, save: save !== false}'));
  assert(source.includes("localStorage.setItem('liaotian_active_char'"));
  assert(source.includes('scheduleCreatorFullSave(() => baseSave.apply(this, args))'));
  assert(source.includes('flushCreatorPendingSwitch();'));
  assert(source.includes('requestIdleCallback(save, {timeout:1400})'));
  assert(config.includes("const STORAGE_KEY='liaotian_3d_roles_v1'"));
  assert(config.includes('localStorage.removeItem(LEGACY_KEY)'));
});

test('chat mode is no longer user-switchable: every accepted role stays 3D', () => {
  const source = fs.readFileSync('role-chat-mode.js', 'utf8');
  assert(source.includes("const MODES=Object.freeze(['3d'])"));
  assert(source.includes("function normalizeMode(){return'3d';}"));
  assert(source.includes("function storedMode(){return'3d';}"));
  assert(source.includes("function saveMode(){return'3d';}"));
  assert(source.includes("document.getElementById('roleChatModeBtn')?.remove()"));
  assert(source.includes('function shouldRender3D'));
});
