const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const visual=require('../role-visual-recipe.js');
const unified=require('../role-unified-human-recipe.js');

test('creator exposes only choices backed by the real 3D runtime maps',()=>{
  for(const value of visual.OPTIONS.hair)assert(Object.hasOwn(unified.HAIR,value),`missing real hair module: ${value}`);
  for(const value of visual.OPTIONS.hairColor)assert(Object.hasOwn(unified.HAIR_TINTS,value),`missing real hair tint: ${value}`);
  for(const value of visual.OPTIONS.outfit)assert(Object.hasOwn(unified.OUTFITS,value),`missing real outfit module: ${value}`);
  for(const value of visual.OPTIONS.outfitColor)assert(Object.hasOwn(unified.OUTFIT_TINTS,value),`missing real outfit tint: ${value}`);
  for(const value of visual.OPTIONS.accessory)assert(Object.hasOwn(unified.ACCESSORIES,value),`missing real accessory: ${value}`);
  for(const value of visual.OPTIONS.expression)assert(Object.hasOwn(unified.EXPRESSIONS,value),`missing real expression morph: ${value}`);
});

test('wizard derives selectable 3D choices from runtime authority instead of a duplicate catalog',()=>{
  const source=fs.readFileSync('role-creator-wizard.js','utf8');
  assert(source.includes('runtime=window.RoleUnifiedHumanRecipe'));
  assert(source.includes("mapped('hair',runtime.HAIR)"));
  assert(source.includes("mapped('outfit',runtime.OUTFITS)"));
  assert(source.includes("mapped('accessory',runtime.ACCESSORIES)"));
  assert(source.includes("mapped('expression',runtime.EXPRESSIONS)"));
  assert(source.includes('if(!options[k]?.includes(v))return'));
});

test('editing an existing 3D role restores its stored visualRecipe before any abandoned draft',()=>{
  const source=fs.readFileSync('role-creator-wizard.js','utf8');
  assert(source.includes('function currentEditingRole()'));
  assert(source.includes("typeof editingCharacterId!=='string'"));
  assert(source.includes("current?.roleKind==='3d'?api.forCharacter?.(current):null"));
  assert(source.includes('let raw=stored||parsed'));
  assert(source.indexOf('let raw=stored||parsed')<source.indexOf("localStorage.getItem(DRAFT)"));
});

test('3D-only creator cleanup is idempotent and cannot self-trigger an endless MutationObserver loop',()=>{
  const source=fs.readFileSync('role-creator-only-ui.js','utf8');
  assert(source.includes('function sameChildren(parent,nodes)'));
  assert(source.includes('if(!sameChildren(form,kept)){form.replaceChildren(...kept);changed=true;}'));
  assert(source.includes('observer.disconnect();'));
  assert(source.includes("observer.observe(form,{childList:true,subtree:false});"));
  assert(!source.includes("queueMicrotask(()=>{queued=false;removeLegacyCreatorUi();});"));
});
