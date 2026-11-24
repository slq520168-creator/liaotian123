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
  assert.equal(limited.status,429);assert.equal(limited.headers.get('x-role-chat-limiter'),'site');assert.ok(Number(limited.headers.get('retry-after'))>=1);
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
  assert.equal(response.status,429);assert.ok(Number(response.headers.get('retry-after'))>0);assert.equal(seen.length,2);
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

test('Cloudflare-compatible manual redirect mode reaches the real transport and rejects redirects without forwarding credentials',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source+'\n// workers-redirect-contract'))).default;
 const original=globalThis.fetch,seen=[];
 const request=()=>new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.51'},body:JSON.stringify({messages:[{role:'system',content:'虚构成年咖啡师'},{role:'user',content:'你好'}]})});
 globalThis.fetch=async(url,init)=>{
  if(init.redirect==='error')throw new TypeError('Cloudflare Workers does not implement redirect error');
  assert.equal(init.redirect,'manual');
  seen.push(url);
  if(seen.length===1)return Response.json({choices:[{message:{content:'测试回复'}}]});
  return new Response('',{status:302,headers:{location:'https://untrusted.example/redirect'}});
 };
 try{
  const ok=await worker.fetch(request(),{});
  assert.equal(ok.status,200);assert.equal((await ok.json()).text,'测试回复');
  const rejected=await worker.fetch(request(),{});
  assert.equal(rejected.status,503);assert.match(rejected.headers.get('x-role-chat-diagnostic'),/http_302/);assert.equal(seen.length,2);
  assert.ok(seen.every(url=>url.startsWith('https://oai.endpoints.kepler.ai.cloud.ovh.net/')));
 }finally{globalThis.fetch=original;}
});

test('dedicated OpenRouter route requests only zero-price models; a rate-limited route falls through to independent OVH',async()=>{const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');const worker=(await import('data:text/javascript,'+encodeURIComponent(source+'\n// free-router-contract'))).default;const original=globalThis.fetch,seen=[];globalThis.fetch=async(url,init)=>{seen.push({url,body:JSON.parse(init.body),auth:init.headers.authorization});return seen.length===1?new Response('{}',{status:429,headers:{'retry-after':'60'}}):Response.json({choices:[{message:{content:'测试真实回复链路'}}]});};try{const res=await worker.fetch(new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.52'},body:JSON.stringify({messages:[{role:'system',content:'成年虚构角色'},{role:'user',content:'你好'}]})}),{ROLE_OPENROUTER_FREE_TOKEN:'fixture-only'});assert.equal(res.status,200);assert.equal(seen.length,2);assert.equal(seen[0].body.model,'openrouter/free');assert.equal(seen[0].body.provider.max_price.prompt,0);assert.equal(seen[0].body.provider.max_price.completion,0);assert.equal(seen[0].auth,'Bearer fixture-only');assert.match(seen[1].url,/ovh\.net/);assert.equal(seen[1].auth,undefined);}finally{globalThis.fetch=original;}});


test('HTTP 200 quota envelope triggers independent Groq fallback and respects provider cooldown',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source+'\n// envelope-cooldown'))).default;
 const original=globalThis.fetch,seen=[];
 globalThis.fetch=async(url,init)=>{seen.push({url:String(url),auth:init.headers.authorization});return String(url).includes('openrouter.ai')?Response.json({error:{code:429,message:'rate limited'}},{headers:{'retry-after':'60'}}):Response.json({choices:[{message:{content:'备用模型测试回复'}}]});};
 const request=()=>new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.53'},body:JSON.stringify({messages:[{role:'system',content:'成年角色'},{role:'user',content:'你好'}]})});
 try{
  const env={ROLE_OPENROUTER_FREE_TOKEN:'fixture-router',ROLE_GROQ_FREE_TOKEN:'fixture-groq'};
  assert.equal((await worker.fetch(request(),env)).status,200);
  assert.equal((await worker.fetch(request(),env)).status,200);
  assert.equal(seen.filter(x=>x.url.includes('openrouter.ai')).length,1);
  assert.equal(seen.filter(x=>x.url.includes('api.groq.com')).length,2);
  assert.equal(seen[1].auth,'Bearer fixture-groq');
 }finally{globalThis.fetch=original;}
});


test('provider quota reports its real retry time and diagnostic, never retries before allowed',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source+'\n// real-quota-window'))).default;
 const original=globalThis.fetch,seen=[];
 globalThis.fetch=async(url)=>{seen.push(String(url));return new Response('{}',{status:429,headers:{'retry-after':String(String(url).includes('openrouter.ai')?3600:900)}});};
 const request=()=>new Request('https://sirole.vip/api/chat',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.54'},body:JSON.stringify({messages:[{role:'system',content:'成年角色'},{role:'user',content:'你好'}]})});
 try {
  const env={ROLE_OPENROUTER_FREE_TOKEN:'fixture-router'};
  const first=await worker.fetch(request(),env);
  assert.equal(first.status,429);assert.equal(first.headers.get('x-role-chat-limiter'),'upstream');
  assert.ok(Number(first.headers.get('retry-after'))>=899);
  assert.match(first.headers.get('x-role-chat-diagnostic'),/openrouter-free:http_429/);
  assert.match(first.headers.get('x-role-chat-diagnostic'),/ovh-mistral:http_429/);
  const second=await worker.fetch(request(),env);
  assert.equal(second.status,429);assert.match(second.headers.get('x-role-chat-diagnostic'),/cooldown_429/);
  assert.equal(seen.length,2,'no repeated upstream call while retry-after is active');
 }finally{globalThis.fetch=original;}
});
