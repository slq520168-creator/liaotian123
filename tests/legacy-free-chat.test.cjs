const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
test('旧3D页面仅允许WASM解码而不开放JavaScript eval',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const scripts=policy.split(';').find(s=>s.trim().startsWith('script-src'));
  assert.match(scripts,/'wasm-unsafe-eval'/);
  assert.doesNotMatch(scripts,/'unsafe-eval'|'unsafe-inline'/);
  assert.match(policy.split(';').find(s=>s.trim().startsWith('connect-src')),/\bblob:/);
  assert.ok(html.indexOf('src="studio/api.js"')<html.indexOf('src="config/app.js'));
  const config=fs.readFileSync('config/app.js','utf8');
  assert.match(config,/chatApiUrl: 'https:\/\/afzcohtnljnmucrkgcaz.supabase.co\/functions\/v1\/liaotian-studio-free'/);
  assert.match(config,/chatApiKind: 'studio-free'/);
  assert.match(config,/anonKey: window.STUDIO_API\?\.anonKey/);
});
test('旧3D聊天兼容免费鉴权、真实回复及配额错误',()=>{
  const result=spawnSync(process.execPath,['scripts/test-chat-transport.mjs'],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stdout+result.stderr);
});
