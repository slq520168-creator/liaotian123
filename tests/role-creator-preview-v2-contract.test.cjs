const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const preview=require('../role-creator-3d-preview-v2.js');

test('fullscreen creator keeps recipe signatures stable',()=>{
  const base={hair:'long01',clothing:['briefs','tshirt','jeans','shoes'],accessory:'none',expressionMorphs:{mouthSmileLeft:.2},morphs:{weight_max:.1},skinTint:'#aaa',hairTint:'#111',clothingTint:'#222',eyeTint:'#333'};
  assert.equal(preview.structuralSignature({...base,skinTint:'#bbb'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,hair:'short02'}),preview.structuralSignature(base));
  assert.notEqual(preview.morphSignature({...base,morphs:{weight_max:.5}}),preview.morphSignature(base));
  assert.notEqual(preview.tintSignature({...base,hairTint:'#999'}),preview.tintSignature(base));
});

test('creator reuses the one primary fullscreen renderer and never creates a second WebGL renderer',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes('win.__ROLE_HUMAN_RENDERER'));
  assert(source.includes("doc.body.classList.add('creator-fullscreen-3d')"));
  assert(source.includes("field('roleCreator3dPreview')?.remove?.()"));
  assert(source.includes('renderer?.syncCharacter?.()'));
  assert.equal(/new\s+Renderer\s*\(/.test(source),false);
  assert.equal(source.includes('roleCreator3dPreviewCanvas'),false);
  assert.equal(source.includes('new THREE.WebGLRenderer'),false);
  assert.equal(source.includes('renderer.modules.GLTFLoader'),false);
});

test('creator overlay keeps the production stage fullscreen instead of embedding a small preview card',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes('#roleCreator3dPreview{display:none!important}'));
  assert(source.includes('#createModalOverlay.active>.modal{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important'));
  assert(source.includes('#createModalOverlay.active #createRoleForm{position:absolute!important;left:0!important;right:0!important;bottom:0!important'));
  assert(source.includes('#createModalOverlay.active #roleCreatorStudio{display:block!important;width:100%!important;max-width:none!important'));
});
