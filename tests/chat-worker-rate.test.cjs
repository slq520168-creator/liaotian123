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
 const assets={ROLE_LLM7_FREE_TOKEN:'fixture-only-token',ASSETS:{fetch:async()=>new Response('not used')}};
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

test('non-reasoning route precedes reasoning and empty upstream output falls through without fake replies',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source+'\n// fallback-test'))).default;
 const original=globalThis.fetch,seen=[];
 globalThis.fetch=async(url,init)=>{const body=JSON.parse(init.body);seen.push(body);
  if(seen.length===1)return Response.json({choices:[{message:{content:'',reasoning_content:'private reasoning'}}]});
  if(seen.length===2)return Response.json({choices:[{message:{content:''}}]});
  return Response.json({choices:[{message:{content:'真实角色回复'}}]});
 };
 try{
  const payload={messages:[{role:'system',content:'成年虚构角色'},{role:'user',content:'你好'}],max_tokens:180};
  const response=await worker.fetch(new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.48'},body:JSON.stringify(payload)}),{ROLE_LLM7_FREE_TOKEN:'fixture-only-token'});
  assert.equal(response.status,200);assert.equal((await response.json()).text,'真实角色回复');
  assert.equal(seen.length,3);assert.equal(seen[0].model,'mistral-Nemo-Instruct-2407');assert.ok(seen[2].max_tokens>=1500);
 }finally{globalThis.fetch=original;}
});
test('a quota-limited gateway is not retried through another model at that gateway',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source+'\n// quota-test'))).default;
 const original=globalThis.fetch,seen=[];
 globalThis.fetch=async(url)=>{seen.push(String(url));return new Response('{}',{status:429,headers:{'retry-after':'60'}});};
 try{
  const body=JSON.stringify({messages:[{role:'system',content:'成年虚构角色'},{role:'user',content:'你好'}]});
  const response=await worker.fetch(new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.49'},body}),{ROLE_LLM7_FREE_TOKEN:'fixture-only-token'});
  assert.equal(response.status,503);assert.equal(seen.length,2);
 }finally{globalThis.fetch=original;}
});

test('unconfigured token never triggers an unauthenticated LLM7 call; OVH uses documented model ID',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source+'\n// token-contract'))).default;
 const original=globalThis.fetch,seen=[];
 globalThis.fetch=async(url,init)=>{seen.push({url,body:JSON.parse(init.body),headers:init.headers});return Response.json({choices:[{message:{content:'测试回复'}}]});};
 try{
  const body=JSON.stringify({messages:[{role:'system',content:'虚构成年角色'},{role:'user',content:'你好'}]});
  const response=await worker.fetch(new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.50'},body}),{});
  assert.equal(response.status,200);assert.equal(seen.length,1);assert.match(seen[0].url,/ovh\.net/);assert.equal(seen[0].body.model,'Mistral-Small-3.2-24B-Instruct-2506');assert.equal(seen[0].headers.authorization,undefined);
 }finally{globalThis.fetch=original;}
});
