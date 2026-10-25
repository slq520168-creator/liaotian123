const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const preview=require('../role-creator-3d-preview-v2.js');

test('structural signatures still distinguish real 3D module changes',()=>{
  const base={hair:'long01',clothing:['briefs','tshirt','jeans','shoes'],accessory:'none',expressionMorphs:{mouthSmileLeft:.2},morphs:{weight_max:.1},skinTint:'#aaa',hairTint:'#111',clothingTint:'#222',eyeTint:'#333'};
  assert.equal(preview.structuralSignature({...base,skinTint:'#bbb'}),preview.structuralSignature(base));
  assert.equal(preview.structuralSignature({...base,hairTint:'#999'}),preview.structuralSignature(base));
  assert.equal(preview.structuralSignature({...base,morphs:{weight_max:.4}}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,hair:'short02'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,accessory:'glasses'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,expressionMorphs:{mouthSmileLeft:.5}}),preview.structuralSignature(base));
});

test('module roots helper preserves actual module order',()=>{
  const hair={id:'hair'},briefs={id:'briefs'},shirt={id:'shirt'},jeans={id:'jeans'},shoes={id:'shoes'};
  const mapped={hair:'long01',clothing:['briefs','tshirt','jeans','shoes']};
  const roots=preview.moduleRoots(mapped,[hair,briefs,shirt,jeans,shoes]);
  assert.equal(roots.complete,true);assert.equal(roots.hair,hair);assert.equal(roots.clothing.briefs,briefs);assert.equal(roots.clothing.tshirt,shirt);assert.equal(roots.clothing.jeans,jeans);assert.equal(roots.clothing.shoes,shoes);
  assert.equal(preview.moduleRoots(mapped,[hair,briefs]).complete,false);
});

test('creator uses one existing fullscreen renderer with no embedded WebGL preview',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes("url:'assets/humans/unified/base_body.glb'"));
  assert(source.includes('win.__ROLE_HUMAN_RENDERER'));
  assert(source.includes("doc.body.classList.add('creator-fullscreen-3d')"));
  assert(source.includes("field('roleCreator3dPreview')?.remove?.()"));
  assert.equal(/new\s+Renderer\s*\(/.test(source),false);
  assert.equal(source.includes('roleCreator3dPreviewCanvas'),false);
  assert.equal(source.includes('renderer.modules.GLTFLoader'),false);
});

test('creator remains fullscreen and restores the active chat character when it closes',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes("#createModalOverlay.active>.modal{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important"));
  assert(source.includes("renderer?.syncCharacter?.()"));
  assert(source.includes("renderer.frameModel?.(renderer.root,'full')"));
  assert(source.includes("win.addEventListener('rolecreatorpage',()=>queue(80))"));
  assert(source.includes("win.addEventListener('rolecreatorstep',()=>queue(80))"));
  assert(source.includes("typeof visual.lockBase==='function'?visual.lockBase(source):visual.sanitize(source)"));
});
