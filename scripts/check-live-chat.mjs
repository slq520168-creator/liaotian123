import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
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
// Use the real frontend prompt and history builder with a real catalog role,
// rather than a synthetic short prompt that misses client-side failures.
const source=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
const roleSource=await fs.readFile(new URL('../roles.js',import.meta.url),'utf8');
const memorySource=await fs.readFile(new URL('../memory.js',import.meta.url),'utf8');
const section=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
const ctx=vm.createContext({window:{},document:{getElementById:()=>null},CHAT_LIMITS:{system:24000,message:30000,history:12000},replyLength:'auto',chatStyle:'daily',playerProfile:{name:'',about:''},roleMemories:{},previousVisits:{},chatHistories:{},ROLE_SCENES:{default:'延续当前剧情'},currentRoleScene:()=> 'default',validPortraitMessage:()=>false});
vm.runInContext(roleSource+'\n'+memorySource+'\n'+section('function replyProfile(', '\n// Pace the presentation')+'\n'+
  'globalThis.liveRole=ORIGINAL_ANIME_ROLES.find(c=>c.id==="anime_fashion_velvet");',ctx);
assert.ok(ctx.liveRole,'actual anime role not found');
ctx.chatHistories[ctx.liveRole.id]=[{sender:'bot',text:ctx.liveRole.greeting},{sender:'user',text:'你好，今天有什么有趣的事？'}];
const payload={messages:ctx.buildRequestMessages(ctx.liveRole),max_tokens:180};
assert.ok(payload.messages[0].content.includes(ctx.liveRole.name)&&payload.messages[0].content.includes(ctx.liveRole.personality),'real persona lost in request builder');
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
ctx.chatHistories[ctx.liveRole.id].push({sender:'bot',text:data.text},{sender:'user',text:'你平时最喜欢做什么？'});
const followStart=Date.now();
const follow=await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json','origin':base},body:JSON.stringify({messages:ctx.buildRequestMessages(ctx.liveRole),max_tokens:180}),signal:AbortSignal.timeout(50000)});
const followData=await follow.json();
assert.equal(follow.status,200,'second real role message failed');
assert.ok(followData.ok===true&&typeof followData.text==='string'&&followData.text.trim(),'second reply empty');
console.log(JSON.stringify({actualRole:ctx.liveRole.id,rounds:2,followHttp:follow.status,followElapsedMs:Date.now()-followStart,followReplyChars:followData.text.trim().length}));
console.log('Production role-chat real completion: PASS');
