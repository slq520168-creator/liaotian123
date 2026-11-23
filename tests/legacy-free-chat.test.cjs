const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
test('角色聊天保持严格 CSP 并使用同源 Worker 接口',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const scripts=policy.split(';').find(s=>s.trim().startsWith('script-src'));
  assert.match(scripts,/'wasm-unsafe-eval'/);
  assert.doesNotMatch(scripts,/'unsafe-eval'|'unsafe-inline'/);
  assert.match(policy.split(';').find(s=>s.trim().startsWith('connect-src')),/\bblob:/);
  assert.doesNotMatch(html,/studio\/api\.js|\.supabase\.co/,'角色聊天入口不得请求旧数据库或加载其客户端密钥');
  const config=fs.readFileSync('config/app.js','utf8');
  assert.match(config,/chatApiUrl:\s*'\/api\/chat'/);
  assert.match(config,/chatApiKind:\s*'role-free'/);
  assert.doesNotMatch(config,/supabase\.co|anonKey|STUDIO_API/);
  const wrangler=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
  assert.equal(wrangler.main,'worker.js');
  assert.deepEqual(wrangler.assets.run_worker_first,['/api/*']);
});
test('角色聊天真模型回复、限流失败不伪造',()=>{
  const result=spawnSync(process.execPath,['scripts/test-chat-transport.mjs'],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stdout+result.stderr);
});
