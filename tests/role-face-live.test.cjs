const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const live=require('../role-face-live.js');

test('every shipped portrait has bounded facial landmarks, without pretending to be a Live2D model',()=>{
  const ids=['nuannuan','linwan','sutang','xuzhixia','yeqingge','lingyi','luchen','taiyang','shenyan','guyan','jiangyu','yunzhou'];
  assert.deepEqual(Object.keys(live.LANDMARKS).sort(),ids.sort());
  for(const id of ids){
    const points=live.LANDMARKS[id];
    assert.equal(points.length,6);
    assert(points.every(v=>Number.isFinite(v)&&v>0&&v<1));
  }
});

test('portrait geometry matches CSS cover sizing and center / 21% crop origin',()=>{
  assert.deepEqual(live.portraitGeometry(256,256,400,800),{x:-200,y:0,width:800,height:800,scale:3.125});
  assert.deepEqual(live.portraitGeometry(256,256,1000,800),{x:0,y:-42,width:1000,height:1000,scale:3.90625});
});

test('animated face follows existing voice presence and role identity, not a fake looping video',()=>{
  const js=read('role-face-live.js');
  const discovery=read('role-discovery.js');
  const index=read('index.html');
  const style=read('role-chat-immersive.css');
  const mode=read('role-chat-mode.js');
  assert.match(index,/role-face-live\.js/);
  assert.match(discovery,/RoleFaceLive\?\.setCharacter/);
  assert.match(discovery,/RoleFaceLive\?\.setActive/);
  assert.match(discovery,/RoleFaceLive\?\.setReply/);
  assert.match(js,/presence\?\.frame/);
  assert.match(js,/f\.state==='speaking'/);
  assert.match(js,/f\.blink/);
  assert.match(js,/requestAnimationFrame/);
  assert.match(js,/document\.hidden/);
  assert.match(style,/\.rd-face-canvas/);
  assert.match(style,/\.role-human-stage\.active\{display:none!important\}/);
  assert.match(mode,/if\(\(lobby\|\|chat\)&&!editor\)return false/);
  assert.doesNotMatch(style,/animation:rdSceneDrift/);
});

test('face runtime ships in Cloudflare assets and observes versioned release contract',()=>{
  const build=read('scripts/build-cloudflare.mjs');
  const config=read('config/app.js');
  assert.match(build,/'role-face-live\.js'/);
  assert.match(config,/const version='20261123-create3d55'/);
  assert.match(config,/const PRESET_3D_IDS=Object\.freeze/);
});

test('dialogue tone changes by actual response rather than random default',()=>{
  assert.equal(live.toneFor('真是太开心了'),'happy');
  assert.equal(live.toneFor('我很担心你'),'gentle');
  assert.equal(live.toneFor('晚上好'),'neutral');
});
