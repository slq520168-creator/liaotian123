const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('production creator is 3D-only lobby wizard',()=>{
  const config=fs.readFileSync('config/app.js','utf8');
  assert(config.includes("'role-creator-wizard.js'"));
  assert(config.includes("'role-code-3d.js'"));
  assert(config.includes("'role-3d-bases.js'"));
  assert(!config.includes("'role-creator-studio.js'"));
  assert(!config.includes("'role-code-compat.js'"));
  const source=fs.readFileSync('role-creator-wizard.js','utf8');
  for(const label of ['选择人物','发型','服装','配饰','动作声音','完成'])assert(source.includes(label));
  assert(source.includes("studio.dataset.full3d='required'"));
  assert(source.includes('bases.BASES.map'));
  assert(source.includes("localStorage.setItem(DRAFT"));
  assert(source.includes("window.dispatchEvent(new CustomEvent('rolecreatorstep'"));
  assert(source.includes("form.requestSubmit()"));
  assert(source.includes("localStorage.setItem('liaotian_voice_auto','1')"));
});

test('custom role code activates a real 3D base role instead of ordinary text role',()=>{
  const source=fs.readFileSync('role-code-3d.js','utf8');
  assert(source.includes("roleKind:'3d'"));
  assert(source.includes('visualRecipe:r'));
  assert(source.includes('bases?.materialize?.(requested,appearance)'));
  assert(source.includes('baseId:r.baseId'));
  assert(source.includes("char.roleKind!=='3d'"));
});

test('wizard changes are bridged into production 3D preview contract',()=>{
  const source=fs.readFileSync('role-creator-wizard-preview.js','utf8');
  assert(source.includes('choice.dataset.key=choice.dataset.choice'));
  const preview=fs.readFileSync('role-creator-3d-preview.js','utf8');
  assert(preview.includes("#roleCreatorStudio [data-key]"));
  assert(preview.includes("frameModel?.(baseRoot,'full')")||preview.includes("frameModel?.(renderer.root,'full')")||preview.includes("frameModel?.(baseRoot, 'full')"));
});
