const test = require('node:test');
const assert = require('node:assert/strict');
const recipe = require('../role-visual-recipe.js');
const face = require('../role-face-rig.js');
const mode = require('../role-chat-mode.js');

function store(initial={}) {
  const data={...initial};
  return {getItem:key => data[key] ?? null,setItem:(key,value) => {data[key]=String(value);},data};
}

test('creator choices survive the role recipe block', () => {
  const text='基础人设\n\n【角色自定义设定】\n外形：身高170cm，体重120斤，匀称，鹅蛋脸，自然肤色，马尾，运动。\n动作：放松呼吸。\n表情：微笑。\n语音：温柔。\n性格：温柔、自然。\n初始关系：普通朋友。\n聊天方式：短句自然。\n【自定义设定结束】';
  const out=recipe.fromPersonality(text);
  assert.equal(out.action,'放松呼吸');
  assert.equal(out.expression,'微笑');
  assert.equal(out.voiceStyle,'温柔');
});

test('expression presets drive real ARKit morph channels', () => {
  const smile=face.weightsFromPresence({expressionPreset:'微笑'});
  assert.equal(smile.mouthSmileLeft,.28);
  assert.equal(smile.mouthSmileRight,.28);
  assert.ok(smile.cheekSquintLeft>0);
});

test('3D chat defaults to text and only unlocks for production custom assets', () => {
  const production={id:'custom_a',isPreset:false,humanAssetStatus:'production',humanAsset:{url:'assets/humans/a.glb'}};
  const fallback={id:'custom_b',isPreset:false,humanAssetStatus:'reference-fallback',humanAsset:{url:'assets/humans/reference.glb'}};
  const s=store();
  assert.equal(mode.storedMode(production,s),'text');
  assert.equal(mode.saveMode(production,'3d',s),'3d');
  assert.equal(mode.saveMode(fallback,'3d',s),'text');
});

test('action presets never rotate limb bones and keep root motion bounded', () => {
  const breath=mode.safeActionTransform('放松呼吸',{breathing:.5},1000);
  const turn=mode.safeActionTransform('轻微转身',{breathing:.003},5000);
  assert.ok(Math.abs(breath.y)<=.006);
  assert.ok(Math.abs(breath.rotationY)<=.0041);
  assert.ok(Math.abs(turn.rotationY)<=.0351);
  assert.deepEqual(mode.safeActionTransform('自然站立',{breathing:.006},1),{y:0,rotationY:0});
});
