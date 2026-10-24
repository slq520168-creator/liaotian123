const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production creation does not load the synchronous custom visual bridge while 3D is gated', () => {
  const config = fs.readFileSync('config/app.js', 'utf8');
  const productionList = config.match(/for\(const src of \[(.*?)\]\)/s)?.[1] || '';
  assert(!productionList.includes("'role-custom-visual.js'"));
  assert(config.includes('role-creator-studio.js'));
  assert(config.includes('role-human-renderer.js'));
});

test('custom role IndexedDB backup is coalesced instead of writing on every sidebar mutation', () => {
  const source = fs.readFileSync('role-persistence.js', 'utf8');
  assert(source.includes('function scheduleCustomRolesPersist'));
  assert(source.includes('new MutationObserver(()=>scheduleCustomRolesPersist())'));
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
