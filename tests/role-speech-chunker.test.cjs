const test=require('node:test');
const assert=require('node:assert/strict');
const chunker=require('../role-speech-chunker.js');

test('short speech stays in one utterance',()=>{
  assert.deepEqual(chunker.split('你好，今天过得怎么样？'),['你好，今天过得怎么样？']);
});

test('long Chinese speech is split into mobile-safe chunks',()=>{
  const text=('这是一个比较长的角色回复，用来验证手机浏览器连续朗读不会一次塞入过长文本。'.repeat(18))+'结束。';
  const chunks=chunker.split(text,180);
  assert.ok(chunks.length>1);
  assert.ok(chunks.every(item=>item.length<=181));
  assert.equal(chunks.join(''),text);
});

test('split prefers natural punctuation near the chunk boundary',()=>{
  const left='甲'.repeat(110)+'，';
  const right='乙'.repeat(90)+'。';
  const chunks=chunker.split(left+right,180);
  assert.equal(chunks[0],left);
  assert.equal(chunks.join(''),left+right);
});

test('whitespace is normalized before speech planning',()=>{
  assert.deepEqual(chunker.split('  你好\n\n世界   今天好  '),['你好 世界 今天好']);
});
