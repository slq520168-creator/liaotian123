const test=require('node:test');
const assert=require('node:assert/strict');

const bases=require('../role-3d-bases.js');
global.window={Role3DBases:bases};
delete require.cache[require.resolve('../role-visual-recipe.js')];
const visual=require('../role-visual-recipe.js');

test('fixed 3D base owns all body and face geometry fields',()=>{
  const locked=visual.lockBase({
    baseId:'female_soft',
    gender:'male',age:80,heightCm:210,weightJin:300,body:'胖',face:'方脸',skin:'深肤色',
    hair:'马尾',hairColor:'银灰',outfit:'运动',outfitColor:'墨绿',accessory:'细框眼镜',action:'轻微转身',expression:'认真',voiceStyle:'成熟'
  });
  const base=bases.get('female_soft');
  for(const key of visual.BASE_LOCKED_FIELDS)assert.equal(locked[key],base[key],`${key} must come from base`);
  assert.equal(locked.hair,'马尾');
  assert.equal(locked.hairColor,'银灰');
  assert.equal(locked.outfit,'运动');
  assert.equal(locked.outfitColor,'墨绿');
  assert.equal(locked.accessory,'细框眼镜');
  assert.equal(locked.action,'轻微转身');
  assert.equal(locked.expression,'认真');
  assert.equal(locked.voiceStyle,'成熟');
  assert.deepEqual(locked.faceDetails,visual.EMPTY_FACE_DETAILS);
  assert.deepEqual(locked.bodyDetails,visual.EMPTY_BODY_DETAILS);
});

test('male base cannot be changed into female geometry by restored or imported fields',()=>{
  const locked=visual.lockBase({baseId:'male_athletic',gender:'female',age:19,heightCm:140,weightJin:80,body:'偏瘦',face:'甜美脸',skin:'偏白',hair:'自然长发'});
  const base=bases.get('male_athletic');
  for(const key of visual.BASE_LOCKED_FIELDS)assert.equal(locked[key],base[key]);
});

test('new creator permits sculpting while legacy code imports keep base authority',()=>{
  const fs=require('node:fs');
  const creator=fs.readFileSync('role-creator-wizard.js','utf8');
  const code=fs.readFileSync('role-code-3d.js','utf8');
  assert(creator.includes('api.sanitize({...state,creatorVersion:2})'));
  assert(creator.includes('faceDetails:{},bodyDetails:{}'));
  assert(creator.includes("by('roleGender').value=r.gender"));
  assert(code.includes('bases?.materialize?.(requested,appearance)'));
  assert(code.includes('recipeFrom({...char'));
});
