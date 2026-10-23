const test=require('node:test');
const assert=require('node:assert/strict');
const voice=require('../role-voice-style.js');

test('creator voice styles alter real browser utterance rate and pitch',()=>{
  const utterance={rate:1,pitch:1};
  voice.apply(utterance,{visualRecipe:{voiceStyle:'温柔'}});
  assert.equal(utterance.rate,.95);
  assert.equal(utterance.pitch,1.05);
});

test('creator preview utterances keep their explicitly selected preview profile',()=>{
  const utterance={rate:1.08,pitch:1.08,__creatorPreview:true};
  voice.apply(utterance,{visualRecipe:{voiceStyle:'低沉'}});
  assert.equal(utterance.rate,1.08);
  assert.equal(utterance.pitch,1.08);
});
