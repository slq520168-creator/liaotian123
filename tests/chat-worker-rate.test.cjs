const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('same-origin Worker allows a normal conversation burst and reports true throttling delays',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source))).default;
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:{content:'来自真正模型接口的测试模拟文本'}}]});};
 const payload={messages:[{role:'system',content:'虚构成年角色吴月'},{role:'user',content:'你好'}],max_tokens:128};
 const request=(ip)=>new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','origin':'https://sirole.vip','cf-connecting-ip':ip},body:JSON.stringify(payload)});
 const assets={ASSETS:{fetch:async()=>new Response('not used')}};
 try{
  for(let i=0;i<24;i++){const res=await worker.fetch(request('203.0.113.16'),assets);assert.equal(res.status,200,'normal burst should not be throttled '+i);assert.equal((await res.json()).text,'来自真正模型接口的测试模拟文本');}
  const limited=await worker.fetch(request('203.0.113.16'),assets);
  assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('retry-after'))>=1);
  const secondClient=await worker.fetch(request('203.0.113.17'),assets);
  assert.equal(secondClient.status,200,'other client is unaffected by first client budget');
  assert.equal(calls,25);
 }finally{globalThis.fetch=original;}
});
test('rate-limit UI displays the actual Retry-After rather than inventing 45 seconds',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(app,/Number\(response\.headers\.get\('retry-after'\)\)/);
 assert.doesNotMatch(app,/Math\.max\(45,\s*Math\.min/);
 assert.match(app,/请求较多，请/);
});
