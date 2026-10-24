const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const preview=require('../role-creator-3d-preview.js');

test('structural preview reloads only for module, accessory or expression changes',()=>{
  const base={hair:'long01',clothing:['briefs','tshirt','jeans','shoes'],accessory:'none',expressionMorphs:{mouthSmileLeft:.2},morphs:{weight_max:.1},skinTint:'#aaa',hairTint:'#111',clothingTint:'#222',eyeTint:'#333'};
  assert.equal(preview.structuralSignature({...base,skinTint:'#bbb'}),preview.structuralSignature(base));
  assert.equal(preview.structuralSignature({...base,hairTint:'#999'}),preview.structuralSignature(base));
  assert.equal(preview.structuralSignature({...base,morphs:{weight_max:.4}}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,hair:'short01'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,accessory:'glasses'}),preview.structuralSignature(base));
  assert.notEqual(preview.structuralSignature({...base,expressionMorphs:{mouthSmileLeft:.5}}),preview.structuralSignature(base));
});

test('summary patch recovers creator-only state after preset rerender',()=>{
  const previous={faceDetails:{eyeSize:40,noseWidth:-20},skin:'自然肤色'};
  const labels=['168cm/110斤','匀称','甜美脸','脸部跟随预设','大波浪','深棕','居家','柔粉','小耳环','放松呼吸','温柔','温柔语音'];
  const next=preview.summaryPatch(labels,previous);
  assert.equal(next.body,'匀称');assert.equal(next.face,'甜美脸');assert.equal(next.hair,'大波浪');assert.equal(next.hairColor,'深棕');
  assert.equal(next.outfit,'居家');assert.equal(next.outfitColor,'柔粉');assert.equal(next.accessory,'小耳环');assert.equal(next.action,'放松呼吸');
  assert.equal(next.expression,'温柔');assert.equal(next.voiceStyle,'温柔');assert.deepEqual(next.faceDetails,{eyeSize:0,noseWidth:0});
});

test('module roots preserve loader order for direct tint updates',()=>{
  const hair={id:'hair'},briefs={id:'briefs'},shirt={id:'shirt'},jeans={id:'jeans'},shoes={id:'shoes'};
  const mapped={hair:'long01',clothing:['briefs','tshirt','jeans','shoes']};
  const roots=preview.moduleRoots(mapped,[hair,briefs,shirt,jeans,shoes]);
  assert.equal(roots.complete,true);assert.equal(roots.hair,hair);assert.equal(roots.clothing.briefs,briefs);assert.equal(roots.clothing.tshirt,shirt);assert.equal(roots.clothing.jeans,jeans);assert.equal(roots.clothing.shoes,shoes);
  assert.equal(preview.moduleRoots(mapped,[hair,briefs]).complete,false);
});

test('preview reuses production renderer and unified contracts instead of a second Three engine',()=>{
  const source=fs.readFileSync('role-creator-3d-preview.js','utf8');
  assert(source.includes('win.RoleHumanRenderer?.HumanRenderer'));
  assert(source.includes('runtime.applyCandidateState'));
  assert(source.includes('custom.requireSkinTint'));
  assert(source.includes("requireNamedMaterialTint(renderer.root,'Iris'"));
  assert(/clearModel\?\.\(\)/.test(source));
  assert.equal(/GLTFLoader|WebGLRenderer|new\s+THREE\./.test(source),false);
});

test('preview is a sibling of creator studio and stops model work when the modal closes',()=>{
  const source=fs.readFileSync('role-creator-3d-preview.js','utf8');
  assert(source.includes("target.parentNode?.insertBefore(host,target)"));
  assert(source.includes("if(!modalOpen(doc)){stop(true)"));
  assert(source.includes("stage.id='roleCreatorPreviewStage'"));
});

test('preview consumes the existing gender and age fields through the single identity authority',()=>{
  const source=fs.readFileSync('role-creator-3d-preview.js','utf8');
  assert(source.includes('win.RoleCreatorIdentity?.current?.(doc)'));
  assert(source.includes("target.id==='roleGender'||target.id==='roleAge'"));
  assert(source.includes('gender:identity.gender,age:identity.age'));
  assert(source.includes(".creator-summary span:not([data-identity-summary])"));
});
