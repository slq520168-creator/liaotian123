const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','role-voice-stage.js'),'utf8');

test('voice selection resets instead of leaking previous character voice',()=>{
  assert.match(source,/const options = \[\.\.\.voiceSelect\.options\];/);
  assert.match(source,/else if \(options\.length\) voiceSelect\.selectedIndex = 0;/);
});

test('character switch resyncs per-character voice immediately',()=>{
  const switchBlock=source.match(/function patchCharacterSwitch\(\)[\s\S]*?function patchReplies\(\)/)?.[0]||'';
  assert.match(switchBlock,/stopSpeaking\(\);/);
  assert.match(switchBlock,/base\.apply\(this, args\)/);
  assert.match(switchBlock,/syncVoiceSelection\(\);/);
});
