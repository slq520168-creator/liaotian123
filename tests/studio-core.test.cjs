const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../studio/core.js');
test('角色输入安全且只允许成年角色',()=>{
  assert.equal(C.role({age:12}).age,18);
  assert.notEqual(C.role({id:'__proto__'}).id,'__proto__');
  assert.equal(C.role({voiceStyle:'not-a-voice'}).voiceStyle,'自然');
  assert.equal(C.role({name:'<script>x</script>'}).name,'<script>x</script>');
});
test('头像只接受本机角色资产与合法图片数据',()=>{
  assert.equal(C.avatarURL('assets/avatars/nuannuan-portrait.jpg'),'../assets/avatars/nuannuan-portrait.jpg');
  for(const value of ['javascript:alert(1)','https://example.test/a.jpg','assets/avatars/../../x.png','data:image/svg+xml,<svg/>'])assert.equal(C.avatarURL(value),'../assets/avatars/user.svg');
});
test('聊天传递人设和显式记忆，不发送头像或伪造回复',()=>{
  const payload=C.chatPayload({name:'阿雨',memory:'喜欢书店',avatar:'secret'},[{role:'assistant',content:'你好'}],'今天去看书吧');
  assert.match(payload.messages[0].content,/喜欢书店/);
  assert.match(payload.messages[0].content,/非色情/);
  assert.equal(payload.messages.at(-1).content,'今天去看书吧');
  assert.ok(!JSON.stringify(payload).includes('secret'));
  assert.throws(()=>C.chatPayload({},[],'x'.repeat(30001)));
});
test('免费图片配置不带密钥，开启过滤且面积在经典接口上限内',()=>{
  const u=new URL(C.imageURL({name:'阿雨',age:25},'watercolor','bookstore',17));
  assert.equal(u.hostname,'image.pollinations.ai');assert.equal(u.searchParams.get('safe'),'true');
  assert.equal(u.searchParams.get('seed'),'17');
  assert.ok(Number(u.searchParams.get('width'))*Number(u.searchParams.get('height'))<=768*768);
  assert.ok(!u.searchParams.has('key'));assert.match(decodeURIComponent(u.pathname),/fully clothed/);
});
test('402和429只等待，不付款，不假称成功',()=>{
  for(const code of [402,429]){const e=C.providerError(code,'90');assert.equal(e.wait,90000);assert.match(e.message,/不会自动付费/);}
  assert.equal(C.reply({choices:[{message:{content:'真实回复'}}]}),'真实回复');
  for(const data of [{},{error:'busy'},{choices:[{message:{content:''}}]}])assert.throws(()=>C.reply(data));
});
test('分镜时间、渐隐和推进在有效范围内',()=>{
  assert.equal(C.frame(0,8,3).alpha,0);
  assert.equal(C.frame(3,8,3).index,1);
  assert.equal(C.frame(8,8,3).index,2);
  for(let i=0;i<80;i++){const f=C.frame(i/10,8,3);assert.ok(f.alpha>=0&&f.alpha<=1);assert.ok(f.zoom>=1&&f.zoom<=1.1);}
});
test('生产构建包括新工作台，原入口保留显式legacy访问',()=>{
  assert.match(fs.readFileSync('scripts/build-cloudflare.mjs','utf8'),/'studio-launcher.js','studio-bridge.js','studio'/);
  assert.match(fs.readFileSync('studio-launcher.js','utf8'),/get\('legacy'\)===\x271\x27/);
  assert.match(fs.readFileSync('studio/index.html','utf8'),/\.\.\/index\.html\?legacy=1/);
});
