const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const runtime=require('../role-unified-human-runtime.js');
const custom=require('../role-unified-custom-chat.js');
const onlyUi=require('../role-creator-only-ui.js');
const visual=require('../role-visual-recipe.js');
const {HumanRenderer}=require('../role-human-renderer.js');
const preview=require('../role-creator-3d-preview-v2.js');

test('lost WebGL context cannot qualify a text-only step as a completed preview',async()=>{
  const nodes={createModalOverlay:{classList:{contains:()=>true}},createRoleForm:{prepend(node){nodes[node.id]=node;}}};
  const host={document:{getElementById:id=>nodes[id],createElement:()=>({setAttribute(){}})},RoleVisualRecipe:{sanitize:v=>v},RoleCreatorWizard:{readRecipe:()=>({baseId:'female_soft'})},__ROLE_HUMAN_RENDERER:{contextLost:true}};
  assert.equal(await preview.createController(host).refresh(true),false);
  assert.match(nodes.creator3dFeedback.textContent,/恢复/);
});

test('the live wizard recipe wins over incompatible legacy select values',()=>{
  const chosen={baseId:'female_soft',hair:'编发',outfit:'连帽休闲',voiceStyle:'活泼'};
  const host={document:{getElementById:id=>id==='rbHair'?{value:'自然长发'}:null},RoleVisualRecipe:{sanitize:value=>value},RoleCreatorWizard:{readRecipe:()=>chosen}};
  assert.equal(preview.createController(host).readRecipe(),chosen);
});

test('changing only a preview voice refreshes the preview character as well as the shared renderer',async()=>{
  let draft={baseId:'female_soft',voiceStyle:'温柔'},loads=0;
  const nodes={createModalOverlay:{classList:{contains:()=>true},querySelector:()=>null},rolePersonality:{value:''},createRoleForm:{prepend(node){nodes[node.id]=node;}}};
  const renderer={root:{},currentId:'',__unifiedCustomKey:'composed',loop:{start(){}},async loadCharacter(char){loads++;this.currentId=char.id;return true;}};
  const host={document:{getElementById:id=>nodes[id],createElement:()=>({setAttribute(){}})},
    localStorage:{getItem:()=>JSON.stringify(draft)},RoleVisualRecipe:{sanitize:value=>value},RoleUnifiedHumanRecipe:{mapRecipe:()=>({})},RoleUnifiedCustomChat:{},__ROLE_HUMAN_RENDERER:renderer};
  const controller=preview.createController(host);await controller.refresh();draft={...draft,voiceStyle:'活泼'};await controller.refresh();
  assert.equal(controller.previewCharacter.visualRecipe.voiceStyle,'活泼');assert.equal(loads,2);
});

test('overlapping character and creator loads allocate a single WebGL engine',async()=>{
  const renderer=new HumanRenderer();let engines=0,release;
  renderer.createEngine=async()=>{engines++;await new Promise(resolve=>{release=resolve;});renderer.renderer={};};
  const first=renderer.ensureEngine(),second=renderer.ensureEngine();
  assert.equal(engines,1);release();await Promise.all([first,second]);
  await renderer.ensureEngine();assert.equal(engines,1);
});

test('stored clear short hair is recovered exactly instead of matching the shorter short hair label',()=>{
  const result=visual.fromPersonality('【角色自定义设定】\n外形：身高176cm，体重132斤，匀称，自然耐看，自然肤色，清爽短发，日常休闲。\n【自定义设定结束】');
  assert.equal(result.hair,'清爽短发');
});

test('interactive script initialization applies the 3D catalog before the first storage read',()=>{
  const data=new Map(),events=[];
  const context={console,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],get length(){return data.size;}},
    document:{readyState:'interactive',head:{appendChild(){}},createElement:()=>({}),getElementById:()=>null,addEventListener(){}},navigator:{},
    PRESET_CHARACTERS:[{id:'nuannuan'},{id:'ordinary-role'}],normalizeCustomCharacter:v=>({...v}),saveDataToStorage:()=>true,
    addEventListener(){},requestAnimationFrame(){},setTimeout(){},byId:()=>({}),replyLength:'auto',chatStyle:'mature',activeCharacterId:'nuannuan'};
  context.window=context;
  for(const key of ['renderChatStyleControl','setupEventListeners','renderAvatarPicker','updateUserAvatarPreview','renderEmojiPicker','switchCharacter','restoreUpdateComposer','updateViewportHeight','warmReplyConnection','checkSiteVersion'])context[key]=()=>{};
  context.loadDataFromStorage=()=>events.push(context.PRESET_CHARACTERS.map(c=>c.id));
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('config/app.js','utf8'),context);
  const app=fs.readFileSync('app.js','utf8');
  vm.runInContext(app.slice(app.indexOf('function init() {'),app.indexOf('\nfunction restoreUpdateComposer()'))+'\ninit();',context);
  assert.deepEqual(events,[['nuannuan']]);
  assert.equal(context.PRESET_CHARACTERS[0].roleKind,'3d');
});

test('initial storage normalization preserves structured appearance before the 3D scripts load',()=>{
  const app=fs.readFileSync('app.js','utf8'),context={CHAT_LIMITS:{personality:12000},safeAvatar:v=>v};vm.createContext(context);
  vm.runInContext(app.slice(app.indexOf('function normalizeCustomCharacter(value)'),app.indexOf('\nfunction loadDataFromStorage()')),context);
  const recipe={baseId:'male_clean',hair:'清爽短发',hairColor:'银灰',eyeColor:'灰蓝'};
  const role=context.normalizeCustomCharacter({id:'custom_saved',name:'角色',tag:'3D',greeting:'你好',personality:'人设',visualRecipe:recipe});
  assert.equal(JSON.stringify(role.visualRecipe),JSON.stringify(recipe));assert.notEqual(role.visualRecipe,recipe);
});

test('creator cleanup detects text nodes as well as elements, so null text cannot survive',()=>{
  const studio={id:'studio'};
  assert.equal(onlyUi.sameChildren({childNodes:[studio]},[studio]),true);
  assert.equal(onlyUi.sameChildren({children:[studio],childNodes:[{nodeName:'#text',textContent:'null'},studio]},[studio]),false);
});

test('fixed base recipes require the known catalog and static asset contracts without claiming mobile certification',()=>{
  const role={id:'custom_test',roleKind:'3d',visualRecipe:{baseId:'female_soft'}};
  const host={Role3DBases:{BY_ID:{female_soft:{}}},__ROLE_BASE_RECIPE_QUALIFICATION:{ok:true}};
  assert.equal(custom.isFixedBaseRole(role,host),true);
  assert.equal(custom.isFixedBaseRole({...role,roleKind:'text'},host),false);
  assert.equal(custom.isFixedBaseRole({...role,visualRecipe:{baseId:'unknown'}},host),false);
  assert.equal(custom.isFixedBaseRole(role,{...host,__ROLE_BASE_RECIPE_QUALIFICATION:{ok:false}}),false);
  assert.equal(custom.statusForQualification('base'),'base-recipe');
  assert.equal(host.__ROLE_BASE_RECIPE_QUALIFICATION.mobile,undefined);
});

test('coverage removes only triangles covered by a common garment bit and restores the original topology',async()=>{
  const THREE=await import('three');
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Array(18).fill(0),3));
  geometry.setAttribute('_cczone',new THREE.Uint16BufferAttribute([1,1,1,1,2,3],1));
  geometry.setIndex([0,1,2,3,4,5]);
  const mesh=new THREE.Mesh(geometry);
  assert.equal(runtime.applyZoneMask(mesh,3).removed,1);
  assert.deepEqual([...geometry.index.array],[3,4,5]);
  runtime.applyZoneMask(mesh,0);
  assert.deepEqual([...geometry.index.array],[0,1,2,3,4,5]);
  assert.equal(mesh.visible,true);
});

test('outer clothing covers the authored body zone and inner layer while retaining both modules',async()=>{
  const THREE=await import('three');
  const mesh=(mask)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Array(9).fill(0),3));if(mask)g.setAttribute('_cczone',new THREE.Uint16BufferAttribute([mask,mask,mask],1));g.setIndex([0,1,2]);return new THREE.Mesh(g);};
  const base=new THREE.Group(),body=mesh(2048),bra=mesh(2048),dress=mesh();base.add(body,bra,dress);
  const result=runtime.applyWardrobeOcclusion(base,[{id:'bra',root:bra},{id:'dress',root:dress}],{bodyZones:{dress:2048},items:[{id:'bra',layer:0,hidesBodyZones:[]},{id:'dress',layer:3,hidesBodyZones:['dress']}]});
  assert.equal(result.removed,2);assert.equal(body.geometry.index.count,0);assert.equal(bra.geometry.index.count,0);
  assert.equal(dress.geometry.index.count,3);assert.equal(base.children.includes(bra),true);
});

test('creator voice preview uses the selected role and style without toggling chat audio',()=>{
  const spoken=[],storage=new Map();
  const context={document:{getElementById:()=>null},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setTimeout(){},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},RolePresence:{getDefault:()=>({idle(){}})},
    RoleVoiceStyle:{profileFor:char=>{assert.equal(char.visualRecipe.voiceStyle,'低沉');return{rate:.92,pitchDelta:-.1};}},
    speechSynthesis:{cancel(){},speak:u=>spoken.push(u)}};
  context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('role-voice-stage.js','utf8'),context);
  context.RoleVoiceStage.preview({id:'custom_creator_preview',name:'预览角色',gender:'male',visualRecipe:{voiceStyle:'低沉'}});
  assert.equal(spoken.length,1);assert.match(spoken[0].text,/预览角色/);assert.equal(spoken[0].rate,.92);assert.ok(Math.abs(spoken[0].pitch-.84)<1e-9);
  assert.equal(storage.get('liaotian_voice_auto'),undefined);
});
