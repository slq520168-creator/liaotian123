const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const runtime=require('../role-unified-human-runtime.js');
const recipe=require('../role-unified-human-recipe.js');

const ROOT=path.join(__dirname,'..','assets','humans','unified');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'unified-human-manifest.json'),'utf8'));

function readGlbJson(file){
  const buffer=fs.readFileSync(file);
  assert.equal(buffer.toString('ascii',0,4),'glTF',`${path.basename(file)} must be GLB`);
  let offset=12;
  while(offset+8<=buffer.length){
    const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4);
    offset+=8;
    if(type===0x4E4F534A){
      const text=buffer.subarray(offset,offset+length).toString('utf8').replace(/\u0000+$/,'').trimEnd();
      return JSON.parse(text);
    }
    offset+=length;
  }
  throw new Error(`${path.basename(file)} missing JSON chunk`);
}

function targetNames(gltf){
  const names=new Set();
  for(const mesh of gltf.meshes||[]){
    for(const name of mesh?.extras?.targetNames||[]) names.add(String(name));
    for(const primitive of mesh.primitives||[]) for(const name of primitive?.extras?.targetNames||[]) names.add(String(name));
  }
  return names;
}

function primarySkinBoneNames(gltf){
  let best=[];
  for(const skin of gltf.skins||[]){
    const names=(skin.joints||[]).map(index=>String(gltf.nodes?.[index]?.name||'')).filter(Boolean);
    if(names.length>best.length) best=names;
  }
  return best;
}

function skeleton(names){return {bones:names.map(name=>({name}))};}
function morphProbe(names,initial=.73){
  const ordered=[...names];
  return {
    children:[],
    morphTargetDictionary:Object.fromEntries(ordered.map((name,index)=>[name,index])),
    morphTargetInfluences:ordered.map(()=>initial)
  };
}
function assertNeutralDefaults(gltf,label){
  for(const mesh of gltf.meshes||[]){
    for(const value of mesh.weights||[]) assert.ok(Math.abs(Number(value)||0)<1e-8,`${label}:${mesh.name||'mesh'} mesh default must be neutral`);
  }
  for(const node of gltf.nodes||[]){
    for(const value of node.weights||[]) assert.ok(Math.abs(Number(value)||0)<1e-8,`${label}:${node.name||'node'} node default must be neutral`);
  }
}

const baseGltf=readGlbJson(path.join(ROOT,manifest.base.url));
const baseTargets=targetNames(baseGltf);
const baseBones=primarySkinBoneNames(baseGltf);
const baseSkeleton=skeleton(baseBones);
const structuralRequired=['gender_female','gender_male','weight_min','weight_max','height_short','height_tall'];
const hairRequired=[...structuralRequired,'face_forehead_decr','face_forehead_incr','face_ear_size_decr','face_ear_size_incr'];

const recipes=[
  {gender:'female',age:31,heightCm:168,weightJin:118,body:'丰满',face:'鹅蛋脸',hair:'自然长发',outfit:'成熟优雅',skin:'自然肤色',expression:'微笑'},
  {gender:'male',age:38,heightCm:181,weightJin:150,body:'健壮',face:'方脸',hair:'短发',outfit:'日常休闲',skin:'小麦肤色',expression:'认真'}
];

test('persisted unified candidate recipes apply through runtime with no missing morphs',()=>{
  assert.ok(baseBones.length>=40,'base candidate must expose a real humanoid skeleton');
  assert.ok(baseTargets.size>=150,'base candidate must expose the complete morph set');
  assertNeutralDefaults(baseGltf,'base_body.glb');
  for(const source of recipes){
    const mapped=recipe.mapRecipe(source);
    const weights={...mapped.morphs,...mapped.expressionMorphs};
    const missing=Object.keys(weights).filter(name=>!baseTargets.has(name));
    assert.deepEqual(missing,[],`recipe emitted morphs absent from persisted base: ${missing.join(',')}`);
    const probe=morphProbe(baseTargets),root={children:[probe]};
    const result=runtime.applyMorphWeights(root,weights,{reset:true});
    assert.equal(result.applied,true);
    assert.equal(result.assignments,Object.keys(weights).length);
    for(const [name,index] of Object.entries(probe.morphTargetDictionary)){
      const expected=Number(weights[name]||0);
      assert.equal(probe.morphTargetInfluences[index],expected,`${name} runtime weight mismatch`);
    }
    assert.ok(fs.existsSync(path.join(ROOT,manifest.modules.hair[mapped.hair].url)),`mapped hair missing: ${mapped.hair}`);
    for(const clothing of mapped.clothing) assert.ok(fs.existsSync(path.join(ROOT,manifest.modules.clothing[clothing].url)),`mapped clothing missing: ${clothing}`);
  }
});

test('every persisted hair and clothing module is runtime-remappable to the base skeleton',()=>{
  for(const [kind,items] of Object.entries(manifest.modules)){
    for(const [id,meta] of Object.entries(items)){
      const gltf=readGlbJson(path.join(ROOT,meta.url));
      const bones=primarySkinBoneNames(gltf);
      assert.ok(bones.length>=40,`${kind}/${id} skeleton is incomplete`);
      const remap=runtime.buildBoneRemap(skeleton(bones),baseSkeleton);
      assert.equal(remap.compatible,true,`${kind}/${id} missing base bones: ${remap.missing.join(',')}`);
      const names=targetNames(gltf),required=kind==='hair'?hairRequired:structuralRequired;
      assert.deepEqual(required.filter(name=>!names.has(name)),[],`${kind}/${id} runtime morph contract mismatch`);
      assertNeutralDefaults(gltf,`${kind}/${id}`);
    }
  }
});

test('candidate manifest stays closed until real mobile validation exists',()=>{
  assert.equal(manifest.status,'candidate-only');
  assert.equal(manifest.capabilities.mobile,false);
  assert.equal(manifest.mobile.validated,false);
  assert.equal(manifest.mobile.staticBudgetPassed,true);
});
