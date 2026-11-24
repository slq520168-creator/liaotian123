import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='https://sirole.vip';
const expected=(await fs.readFile(new URL('../config/app.js',import.meta.url),'utf8')).match(/const version='([^']+)'/)?.[1];
assert.ok(expected,'missing release version');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let live='';
for(let i=0;i<10;i++){
 try {
  const r=await fetch(base+'/version.json?release='+encodeURIComponent(expected),{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(r.ok){const data=await r.text();if(data.includes(expected)){live=expected;break;}}
 }catch{}
 if(i<9)await sleep(6000);
}
assert.equal(live,expected,'expected release not confirmed on production');
const payload={messages:[{role:'system',content:'你是虚构的成年咖啡师。只用一句中文回答普通咖啡问题。'},{role:'user',content:'你好，今天有什么咖啡？'}],max_tokens:300};
const start=Date.now();
const response=await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json','origin':base},body:JSON.stringify(payload),signal:AbortSignal.timeout(50000)});
let data={};try{data=await response.json()}catch{}
console.log(JSON.stringify({release:expected,http:response.status,elapsedMs:Date.now()-start,replyChars:typeof data.text==='string'?data.text.trim().length:0,error:typeof data.error==='string'?data.error.slice(0,80):null,retryAfter:response.headers.get('retry-after'),diagnostic:response.headers.get('x-role-chat-diagnostic'),limiter:response.headers.get('x-role-chat-limiter'),provider:response.headers.get('x-role-chat-provider')}));
if(response.status!==200){
 // A single independent synthetic upstream test distinguishes a provider error
 // from the Cloudflare execution environment. No customer data or credentials.
 try{
  const r=await fetch('https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,model:'Mistral-Small-3.2-24B-Instruct-2506',stream:false}),signal:AbortSignal.timeout(15000),redirect:'manual'});
  let replyChars=0;try{const x=await r.json();replyChars=typeof x?.choices?.[0]?.message?.content==='string'?x.choices[0].message.content.trim().length:0}catch{}
  console.log(JSON.stringify({upstream:'ovh-mistral',http:r.status,replyChars,retryAfter:r.headers.get('retry-after')}));
 }catch(e){console.log(JSON.stringify({upstream:'ovh-mistral',transport:e.name}));}
}
assert.equal(response.status,200,'production chat did not return HTTP 200');
assert.ok(data.ok===true&&typeof data.text==='string'&&data.text.trim().length>0,'no real visible reply');
console.log('Production role-chat real completion: PASS');
