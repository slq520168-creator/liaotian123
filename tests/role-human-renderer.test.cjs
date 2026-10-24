const test = require('node:test');
const assert = require('node:assert/strict');
const human = require('../role-human-renderer.js');

const known = new Set(['jawopen','mouthclose','eyeblinkleft','eyeblinkright','mouthsmileleft','mouthsmileright','browinnerup','eyelookupleft','eyelookupright','mouthpucker','mouthfunnnel','tongueout']);
const rigApi = {buildMorphIndex(dict={}) { const out={}; for (const [name,index] of Object.entries(dict)) { const n=String(name).replace(/^blendShape\d*\./i,'').replace(/[^a-z0-9]/gi,'').toLowerCase(); if (known.has(n)) out[name]=index; } return out; }};

test('safeAssetPath only accepts local/same-origin production assets', () => {
  assert.equal(human.safeAssetPath('assets/humans/a.glb', 'https://sirole.vip'), 'assets/humans/a.glb');
  assert.equal(human.safeAssetPath('/assets/humans/a.glb', 'https://sirole.vip'), '/assets/humans/a.glb');
  assert.equal(human.safeAssetPath('https://sirole.vip/assets/a.glb', 'https://sirole.vip'), 'https://sirole.vip/assets/a.glb');
  assert.equal(human.safeAssetPath('https://evil.example/a.glb', 'https://sirole.vip'), '');
  assert.equal(human.safeAssetPath('data:model/gltf-binary;base64,aaa', 'https://sirole.vip'), '');
});

test('normalize descriptor clamps risky transform values', () => {
  const out = human.normalizeAssetDescriptor({url:'assets/a.glb', scale:1000, y:-99, rotationY:99, minMorphTargets:100}, {origin:'https://sirole.vip'});
  assert.equal(out.scale, 20);
  assert.equal(out.y, -10);
  assert.equal(out.rotationY, Math.PI * 2);
  assert.equal(out.minMorphTargets, 52);
});

test('registry has priority over character-provided local asset', () => {
  const char={id:'a',humanAsset:'assets/local.glb'};
  const out=human.assetForCharacter(char,{a:'assets/official.glb'},{origin:'https://sirole.vip'});
  assert.equal(out.url,'assets/official.glb');
});

test('best face mesh is chosen by mapped morph coverage', () => {
  const poor={name:'poor', morphTargetDictionary:{jawOpen:0}, morphTargetInfluences:[0], children:[]};
  const richNames=['jawOpen','mouthClose','eyeBlinkLeft','eyeBlinkRight','mouthSmileLeft','mouthSmileRight','browInnerUp','eyeLookUpLeft','eyeLookUpRight','mouthPucker','tongueOut'];
  const richDict={}; richNames.forEach((name,i)=>richDict['blendShape1.'+name]=i);
  const rich={name:'face', morphTargetDictionary:richDict, morphTargetInfluences:Array(richNames.length).fill(0), children:[]};
  const root={name:'root',children:[poor,{name:'group',children:[rich]}]};
  const result=human.findBestFaceMesh(root,rigApi);
  assert.equal(result.mesh,rich);
  assert.equal(result.score,11);
});

test('head lookup walks ancestors before broad scene search', () => {
  const root={name:'root',rotation:{},children:[]};
  const head={name:'mixamorig:Head',rotation:{},parent:root,children:[]};
  const mesh={name:'skin',rotation:{},parent:head,children:[]};
  root.children=[head]; head.children=[mesh];
  assert.equal(human.findHeadObject(root,mesh),head);
});

test('descriptor rejects arbitrary external character URLs', () => {
  const char={id:'x',humanAsset:{url:'https://example.com/person.glb'}};
  assert.equal(human.assetForCharacter(char,{}, {origin:'https://sirole.vip'}), null);
});

test('face-named mesh still prefers parent Head bone', () => {
  const root={name:'root',rotation:{},children:[]};
  const head={name:'Armature.Head',isBone:true,rotation:{},parent:root,children:[]};
  const mesh={name:'Face',rotation:{},parent:head,children:[]};
  root.children=[head]; head.children=[mesh];
  assert.equal(human.findHeadObject(root,mesh),head);
});

test('WebGL2 context is explicitly required and unsupported devices fail closed', () => {
  const calls=[];
  const expected={tag:'webgl2'};
  const canvas={getContext(type,attributes){calls.push({type,attributes});return type==='webgl2'?expected:null;}};
  assert.equal(human.webGL2Context(canvas,{alpha:true}),expected);
  assert.equal(calls.length,1);
  assert.equal(calls[0].type,'webgl2');
  assert.equal(human.webGL2Context({getContext(){return null;}},{}),null);
  assert.equal(human.webGL2Context({},{}),null);
});

test('WebGL context loss prevents default, resumes through restore hook, and unbinds exactly once', () => {
  const listeners={};
  let prevented=0,lost=0,restored=0,removed=0;
  const canvas={
    addEventListener(type,fn){listeners[type]=fn;},
    removeEventListener(type,fn){assert.equal(listeners[type],fn);delete listeners[type];removed++;}
  };
  const unbind=human.bindWebGLContextLifecycle(canvas,{
    onLost(){lost++;},
    onRestored(){restored++;}
  });
  assert.equal(typeof listeners.webglcontextlost,'function');
  assert.equal(typeof listeners.webglcontextrestored,'function');
  listeners.webglcontextlost({preventDefault(){prevented++;}});
  listeners.webglcontextrestored({});
  assert.equal(prevented,1);
  assert.equal(lost,1);
  assert.equal(restored,1);
  unbind();
  unbind();
  assert.equal(removed,2);
  assert.equal(listeners.webglcontextlost,undefined);
  assert.equal(listeners.webglcontextrestored,undefined);
  assert.doesNotThrow(()=>human.bindWebGLContextLifecycle(null,{}));
});

test('renderer load cancellation and model cleanup stop the RAF chain', () => {
  const renderer=new human.HumanRenderer();
  let stops=0,removed=0,geometryDisposals=0,materialDisposals=0,renderListDisposals=0;
  renderer.loop={stop(){stops++;}};
  renderer.renderer={renderLists:{dispose(){renderListDisposals++;}}};
  renderer.scene={remove(){removed++;}};
  renderer.root={children:[{children:[],geometry:{dispose(){geometryDisposals++;}},material:{dispose(){materialDisposals++;}}}]};
  const first=renderer.cancelPendingLoad();
  const second=renderer.cancelPendingLoad();
  assert.equal(first,1);
  assert.equal(second,2);
  renderer.clearModel();
  assert.equal(stops,1);
  assert.equal(removed,1);
  assert.equal(geometryDisposals,1);
  assert.equal(materialDisposals,1);
  assert.equal(renderListDisposals,1);
  assert.equal(renderer.root,null);
  assert.equal(renderer.currentId,'');
});