const test = require('node:test');
const assert = require('node:assert/strict');
const recipe = require('../role-visual-recipe.js');

test('sanitizes visual recipe into stable v1 schema', () => {
  const out = recipe.sanitize({height:999,weight:10,body:'胖',face:'圆脸',skin:'深肤色',hair:'短发',outfit:'运动',relationship:'普通朋友',personality:['自然','自然'],chat:['少反问']});
  assert.equal(out.version,1);
  assert.equal(out.heightCm,220);
  assert.equal(out.weightJin,60);
  assert.deepEqual(out.personality,['自然']);
});

test('parses legacy builder block once into structured data', () => {
  const text='基础人设\n\n【角色自定义设定】\n外形：身高180cm，体重160斤，丰满，圆脸，小麦肤色，大波浪，成熟优雅。\n性格：成熟、有主见。\n初始关系：知心朋友。\n聊天方式：短句自然、少反问。\n用户特别偏好：有生活感\n【自定义设定结束】';
  const out=recipe.fromPersonality(text);
  assert.equal(out.heightCm,180); assert.equal(out.weightJin,160); assert.equal(out.body,'丰满'); assert.equal(out.face,'圆脸');
  assert.equal(out.skin,'小麦肤色'); assert.equal(out.hair,'大波浪'); assert.equal(out.outfit,'成熟优雅'); assert.equal(out.relationship,'知心朋友');
});

test('forCharacter prefers stored recipe over text parsing', () => {
  const out=recipe.forCharacter({visualRecipe:{heightCm:190,weightJin:200,body:'健壮'},personality:''});
  assert.equal(out.heightCm,190); assert.equal(out.body,'健壮');
});

test('invalid enumerations fall back rather than inventing render variants', () => {
  const out=recipe.sanitize({face:'宇宙脸',hair:'不存在'});
  assert.equal(out.face,'自然耐看'); assert.equal(out.hair,'自然长发');
});
