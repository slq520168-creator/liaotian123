const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const runtime=require('../role-unified-human-recipe.js');
const motion=require('../role-safe-skeleton-motion.js');
const custom=require('../role-unified-custom-chat.js');
function visual(){const context={window:{},module:{exports:{}}};vm.createContext(context);for(const file of ['role-3d-bases.js','role-visual-recipe.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);return context.window.RoleVisualRecipe;}
test('editable appearance survives JSON restore and character normalization without base reset',()=>{
  const api=visual(),input={creatorVersion:2,baseId:'female_soft',gender:'female',age:31,heightCm:179,weightJin:144,body:'健壮',skin:'深肤色',eyeColor:'紫色',hairColor:'绿色',faceDetails:{noseWidth:33},bodyDetails:{chestSize:58},archetype:'自定义',profession:'艺术家',scene:'工作室',personality:['害羞']};
  const saved=api.lockBase(input),restored=api.forCharacter({roleKind:'3d',visualRecipe:JSON.parse(JSON.stringify(saved))});
  for(const key of ['creatorVersion','heightCm','weightJin','age','body','skin','eyeColor','hairColor','archetype','profession','scene'])assert.equal(restored[key],input[key],key);
  assert.equal(restored.faceDetails.noseWidth,33);assert.equal(restored.bodyDetails.chestSize,58);
  const block='【角色自定义设定】\n3D配置：'+JSON.stringify(saved)+'\n【自定义设定结束】';
  assert.deepEqual(api.fromPersonality(block),saved);
  assert.equal(api.sanitize({...input,age:12}).age,18);
});
test('editable skin is independent from face preset and body controls map to existing GLB targets',()=>{
  const api=visual(),a=api.sanitize({creatorVersion:2,gender:'female',skin:'深肤色',heightCm:160,weightJin:90,body:'偏瘦',bodyDetails:{chestSize:-50}}),b=api.sanitize({...a,heightCm:185,weightJin:150,body:'健壮',bodyDetails:{chestSize:65},faceDetails:{noseWidth:25}});
  const ma=runtime.mapRecipe(a),mb=runtime.mapRecipe(b);assert.equal(ma.skinTint,mb.skinTint);assert.notDeepEqual(ma.morphs,mb.morphs);assert(ma.morphs.breast_cup_min>0);assert(mb.morphs.breast_cup_max>0);assert(mb.morphs.muscle_max>0);assert(mb.morphs.height_tall>0);
  const bytes=fs.readFileSync('assets/humans/unified/base_body.glb');const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());const names=new Set(gltf.meshes.flatMap(m=>m.extras?.targetNames||[]));
  for(const name of Object.keys(mb.morphs))assert(names.has(name),`missing GLB morph ${name}`);
});
test('eye changes invalidate render key and skin/hair tint updates retain the existing root',async()=>{
  const a={morphs:{gender_female:1},expressionMorphs:{},skinTint:'#111111',eyeTint:'#333333',hair:'long01',hairTint:'#222222',clothing:[]};assert.notEqual(custom.recipeKey(a),custom.recipeKey({...a,eyeTint:'#abcdef'}));
  const skin={name:'Skin',color:{set(v){this.hex=v;}}},hairMaterial={color:{set(v){this.hex=v;}}};const root={traverse(fn){fn({material:skin});}},hair={traverse(fn){fn({material:hairMaterial});}};
  const renderer={root,currentId:'custom_test',__unifiedLoadToken:1,__unifiedMapped:a,__unifiedCustomModules:[hair],loop:{start(){}}};let eye='';
  global.window={RoleEyeColor:{requireNamedMaterialTint(r,n,v){assert.equal(r,root);eye=v;}}};
  try{const mapped={...a,skinTint:'#abcdef',eyeTint:'#123456'};assert.equal(await custom.updateUnifiedCandidate(renderer,{id:'custom_test'},mapped,'new',1),true);assert.equal(renderer.root,root);assert.equal(skin.color.hex,'#abcdef');assert.equal(eye,'#123456');assert.equal(renderer.__unifiedCustomKey,'new');}finally{delete global.window;}
});
test('personality changes gaze, head pose, expression and gesture energy while preserving speech cues',()=>{
  const frame={state:'speaking',visemes:{aa:.5},headPitch:0,gazeX:0,gazeY:0,gestureEnergy:.2};
  const shy=motion.personalityFrame(frame,{personality:['害羞']}),bright=motion.personalityFrame(frame,{personality:['开朗']});
  assert(shy.headPitch>bright.headPitch);assert(shy.gazeY<bright.gazeY);assert(shy.gestureEnergy<bright.gestureEnergy);assert.equal(shy.visemes,frame.visemes);assert.equal(shy.expressionPreset,'温柔');
});
test('calibration preserves all six skin choices and independent fantasy hair colors',()=>{
  const calibration=require('../role-skin-pbr-calibration.js'),api=calibration.wrapRecipeApi(runtime);
  assert.equal(Object.keys(api.SKIN_TINTS).length,6);
  for(const skin of Object.keys(api.SKIN_TINTS))assert.equal(api.mapRecipe({skin}).skinTint,api.SKIN_TINTS[skin]);
  for(const hairColor of ['红色','金色','绿色','蓝色','紫色'])assert.equal(api.mapRecipe({hairColor}).hairTint,api.HAIR_TINTS[hairColor]);
});
test('cancelled hair replacement retains visible modules and disposes the late download',async()=>{
  let release;const root={remove(){throw new Error('old character must stay attached');}},old={parent:root};let disposed=0;
  const renderer={root,currentId:'custom_test',__unifiedLoadToken:1,__unifiedCustomModules:[old],modules:{GLTFLoader:class{loadAsync(){return new Promise(resolve=>{release=resolve;});}}}};
  global.window={RoleUnifiedHumanRuntime:{},RoleHumanRenderer:{disposeObject(){disposed++;}}};
  // The unmounted downloaded mesh is safe to remove, never the old module.
  const late={};root.remove=value=>assert.equal(value,late);
  try{const result=custom.swapUnifiedModules(renderer,{id:'custom_test'},{hair:'long01',clothing:[]},'new',1);renderer.__unifiedLoadToken=2;release({scene:late});assert.equal(await result,false);assert.equal(renderer.root,root);assert.equal(renderer.__unifiedCustomModules[0],old);assert.equal(disposed,1);}finally{delete global.window;}
});

test('body transition interpolates exclusive morph directions without dropping either endpoint',()=>{
 const custom=require('../role-unified-custom-chat.js');
 const from={breast_cup_min:.65,shape_hipSize_min:.3},to={breast_cup_max:.65,shape_hipSize_max:.5};
 const halfway=custom.blendMorphs(from,to,.5);assert.equal(halfway.breast_cup_min,.325);assert.equal(halfway.breast_cup_max,.325);
 assert.equal(custom.blendMorphs(from,to,1).shape_hipSize_max,.5);assert.equal(custom.blendMorphs(from,to,1).shape_hipSize_min,0);
});

test('advanced muscle and fullness override native targets while zero retains the preset',()=>{
 const base=runtime.mapRecipe({body:'健壮',bodyDetails:{muscleTone:0,fullness:0}});assert.equal(base.morphs.muscle_max,.72);
 const edited=runtime.mapRecipe({body:'健壮',bodyDetails:{muscleTone:-50,fullness:70}});assert.equal(edited.morphs.muscle_min,.325);assert.equal(edited.morphs.muscle_max,undefined);assert.equal(edited.morphs.weight_max,.455);
 const api=visual();assert.equal(api.sanitize({creatorVersion:2,relationship:'一起创作的搭档'}).relationship,'一起创作的搭档');
});
