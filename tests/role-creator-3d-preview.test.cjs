const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const preview=require('../role-creator-3d-preview-v2.js');

test('structural preview reloads only for real module accessory or expression changes',()=>{
  const base={hair:'long01',clothing:['briefs','tshirt','jeans','shoes'],accessory:'none',expressionMorphs:{mouthSmileLeft:.2},morphs:{weight_max:.1},skinTint:'#aaa',hairTint:'#111',clothingTint:'#222',eyeTint:'#333'};
  assert.equal(preview.structuralSignature({...base,skinTint:'#bbb'}),preview.structuralSignature(base));
  assert.equal(preview.structuralSignature({...base,hairTint:'#999'}),preview.structuralSignature(base));
  assert.equal(preview.structuralSignature({...base,morphs:{weight_max:.4}}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,hair:'short02'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,accessory:'glasses'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,expressionMorphs:{mouthSmileLeft:.5}}),preview.structuralSignature(base));
});

test('module roots preserve actual loader order for direct tint updates',()=>{
  const hair={id:'hair'},briefs={id:'briefs'},shirt={id:'shirt'},jeans={id:'jeans'},shoes={id:'shoes'};
  const mapped={hair:'long01',clothing:['briefs','tshirt','jeans','shoes']};
  const roots=preview.moduleRoots(mapped,[hair,briefs,shirt,jeans,shoes]);
  assert.equal(roots.complete,true);assert.equal(roots.hair,hair);assert.equal(roots.clothing.briefs,briefs);assert.equal(roots.clothing.tshirt,shirt);assert.equal(roots.clothing.jeans,jeans);assert.equal(roots.clothing.shoes,shoes);
  assert.equal(preview.moduleRoots(mapped,[hair,briefs]).complete,false);
});

test('creator preview uses static asset qualification instead of the chat production gate',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes('gate.fetchManifest'));
  assert(source.includes('gate.staticQualification(manifest)'));
  assert(source.includes("url:'assets/humans/unified/base_body.glb'"));
  assert(source.includes('runtime.applyCandidateState'));
  assert(source.includes('renderer.modules.GLTFLoader'));
  assert(source.includes('win.RoleAccessoryGeometry?.attach'));
  assert(source.includes('win.RoleSafeSkeletonMotion?.apply'));
  assert.equal(source.includes('win.RoleUnifiedCustomChat'),false);
  assert.equal(source.includes("['global','device'].includes"),false);
});

test('preview remains a full body sibling of the six step creator and stops when modal closes',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes("target.parentNode?.insertBefore(host,target)"));
  assert(source.includes("frameModel?.(root,'full')"));
  assert(source.includes("if(!modalOpen(doc)){stop(true)"));
  assert(source.includes("stage.id='roleCreatorPreviewStage'"));
  assert(source.includes("title.textContent='完整 3D 人物'"));
});

test('creator recipe events drive the exact visible 3D recipe',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes("win.addEventListener('rolecreatorpage',onRecipe)"));
  assert(source.includes("win.addEventListener('rolecreatorstep',onRecipe)"));
  assert(source.includes('shadow={...recipe}'));
  assert(source.includes("typeof visual.lockBase==='function'?visual.lockBase(source):visual.sanitize(source)"));
});
