const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production creation uses the 3D-only wizard and not the synchronous custom visual bridge',()=>{
 const config=fs.readFileSync('config/app.js','utf8');
 const index=fs.readFileSync('index.html','utf8');
 const creator=fs.readFileSync('role-2d-creator.js','utf8');
 assert.match(config,/LIAOTIAN_3D_ONLY=false/);
 assert.match(index,/src="role-2d-creator\.js/);
 assert.doesNotMatch(index,/src="role-avatar-stage\.js/);
 assert.doesNotMatch(config,/role-creator-wizard\.js|role-human-renderer\.js/);
 assert.match(creator,/commitCustomCharacters/);
 assert.match(creator,/roleKind:'2d'/);
});

test('3D role IndexedDB backup is coalesced instead of writing on every sidebar mutation', () => {
  const source = fs.readFileSync('role-persistence.js', 'utf8');
  assert(source.includes('function scheduleCustomRolesPersist'));
  assert(source.includes('new MutationObserver(()=>scheduleCustomRolesPersist())'));
  assert(source.includes("const THREE_D_ROLES_KEY='3d-roles-v1'"));
  assert(source.includes("char.roleKind==='3d'"));
  assert(!source.includes("new MutationObserver(()=>persistCustomRoles()).observe(customList"));
});

test('fullscreen creator keeps the shared WebGL renderer alive and only pauses legacy modal mode', () => {
  const source = fs.readFileSync('role-render-recipe-bridge.js', 'utf8');
  assert(source.includes('function creatorModalOpen()'));
  assert(source.includes('function creatorUsesSharedRenderer()'));
  assert(source.includes("document.body?.classList?.contains?.('creator-fullscreen-3d')"));
  assert(source.includes('if (creatorUsesSharedRenderer())'));
  assert(source.includes('this.loop?.start?.()'));
  assert(source.includes('renderer.loop?.start?.()'));
  assert(source.includes('this.cancelPendingLoad?.()'));
  assert(source.includes('hideRendererStage(this)'));
  assert(source.includes('requestIdleCallback(cleanup, {timeout:900})'));
  assert(source.includes("observer.observe(modal, {attributes:true, attributeFilter:['class']})"));
});

test('creator commit still closes before heavy 3D switching and full persistence',()=>{
 const source=fs.readFileSync('role-2d-creator.js','utf8');
 const app=fs.readFileSync('app.js','utf8'),config=fs.readFileSync('config/app.js','utf8');
 assert.match(source,/function save\(event\)/);
 assert.match(source,/commitCustomCharacters/);
 assert.match(source,/function hide\(\)/);
 assert.match(app,/function saveDataToStorage/);
 assert.match(app,/liaotian_archived_3d_custom_v1/);
 assert.match(config,/LIAOTIAN_3D_ONLY=false/);
 assert.doesNotMatch(config,/localStorage\.setItem\(LEGACY_KEY,serialized\)/);
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
