const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const preview=require('../role-creator-3d-preview-v2.js');

test('preview v2 keeps real module and tint signatures stable',()=>{
  const base={hair:'long01',clothing:['briefs','tshirt','jeans','shoes'],accessory:'none',expressionMorphs:{mouthSmileLeft:.2},morphs:{weight_max:.1},skinTint:'#aaa',hairTint:'#111',clothingTint:'#222',eyeTint:'#333'};
  assert.equal(preview.structuralSignature({...base,skinTint:'#bbb'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,hair:'short02'}),preview.structuralSignature(base));
  assert.notEqual(preview.morphSignature({...base,morphs:{weight_max:.5}}),preview.morphSignature(base));
  assert.notEqual(preview.tintSignature({...base,hairTint:'#999'}),preview.tintSignature(base));
});

test('preview v2 reuses the production renderer but owns creator-only loading',()=>{
  const source=fs.readFileSync('role-creator-3d-preview-v2.js','utf8');
  assert(source.includes('win.RoleHumanRenderer?.HumanRenderer'));
  assert(source.includes('gate.staticQualification(manifest)'));
  assert(source.includes('gate.fetchManifest'));
  assert(source.includes('renderer.modules.GLTFLoader'));
  assert(source.includes('runtime.applyCandidateState'));
  assert(source.includes('win.RoleAccessoryGeometry?.attach'));
  assert(source.includes('win.RoleSafeSkeletonMotion?.apply'));
  assert(!source.includes('win.RoleUnifiedCustomChat'));
  assert(!source.includes("['global','device'].includes"));
});
