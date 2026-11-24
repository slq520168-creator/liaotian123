/* Same-origin chat proxy; no Supabase, database, client secret or generated placeholder response. */
const buckets=new Map();let inFlight=0,lastSweep=0;
const RATE_WINDOW_MS=60000,MAX_PER_IP=24,MAX_IN_FLIGHT=10;
function shouldThrottle(req,now){
  if(now-lastSweep>=RATE_WINDOW_MS){
    for(const [key,bucket] of buckets)if(now-bucket.start>=RATE_WINDOW_MS)buckets.delete(key);
    lastSweep=now;
  }
  const ip=req.headers.get('cf-connecting-ip')||'unknown';
  let bucket=buckets.get(ip);
  if(!bucket||now-bucket.start>=RATE_WINDOW_MS){bucket={start:now,count:0};buckets.set(ip,bucket);}
  if(bucket.count>=MAX_PER_IP)return Math.max(1,Math.ceil((bucket.start+RATE_WINDOW_MS-now)/1000));
  if(inFlight>=MAX_IN_FLIGHT)return 2;
  bucket.count++;
  return 0;
}
const headers={'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const out=(status,body,extraHeaders={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...extraHeaders}});
function valid(payload){
 if(!payload||!Array.isArray(payload.messages)||payload.messages.length<2||payload.messages.length>24)return null;
 let size=0;const messages=[];
 for(const item of payload.messages){if(!item||!['system','user','assistant'].includes(item.role)||typeof item.content!=='string'||!item.content.trim()||item.content.length>30000)return null;size+=item.content.length;messages.push({role:item.role,content:item.content});}
 return size<=66000&&messages[0].role==='system'&&messages.at(-1).role==='user'?messages:null;
}
// Explicit anonymous routes. No paid API keys or cross-project bindings.
const CHAT_ROUTES=[
 {id:'llm7-mistral',host:'llm7',url:'https://api.llm7.io/v1/chat/completions',model:'mistral-Nemo-Instruct-2407',timeout:13000},
 {id:'ovh-mistral',host:'ovh',url:'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions',model:'mistral@latest',timeout:13000},
 {id:'llm7-gpt',host:'llm7',url:'https://api.llm7.io/v1/chat/completions',model:'gpt-oss:20b',reasoning:true,timeout:14000}
];
const cooldowns=new Map();
function retrySeconds(raw){if(!raw)return 30;const n=Number(raw);return Math.max(1,Math.min(600,Number.isFinite(n)?n:Math.ceil((Date.parse(raw)-Date.now())/1000)||30));}
async function model(messages,requested,provider,deadline,signal){
 const abort=new AbortController();
 const cancel=()=>abort.abort();
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 const timeout=setTimeout(cancel,Math.min(provider.timeout,Math.max(1,deadline-Date.now())));
 try{
  const max_tokens=Math.max(provider.reasoning?1500:256,requested);
  const response=await fetch(provider.url,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({model:provider.model,messages,max_tokens,stream:false,temperature:0.8}),signal:abort.signal,redirect:'error'});
  if(!response.ok){
   const e=Object.assign(Error('upstream_http_'+response.status),{status:response.status});
   if(response.status===429||response.status===402)e.cooldown=retrySeconds(response.headers.get('retry-after'));
   if(response.status===401||response.status===403)e.cooldown=60;
   throw e;
  }
  const data=await response.json(),choice=data?.choices?.[0];
  const content=choice?.message?.content;
  const text=typeof content==='string'?content:Array.isArray(content)?content.filter(x=>x?.type==='text'&&typeof x.text==='string').map(x=>x.text).join('\n'):'';
  if(text.trim()&&text.length<=30000)return text.trim();
  if(choice?.finish_reason==='content_filter'||choice?.message?.refusal)throw Object.assign(Error('content_filtered'),{filtered:true});
  throw Error('empty_visible_reply');
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}
export default{async fetch(req,env){
 const url=new URL(req.url);
 if(url.pathname==='/api/chat'){
  if(req.method==='GET'||req.method==='HEAD')return out(200,{ok:true,service:'role-chat'});
  if(req.method!=='POST')return out(405,{ok:false,error:'method_not_allowed'});
  const origin=req.headers.get('origin');if(origin&&origin!==url.origin)return out(403,{ok:false,error:'origin_mismatch'});
  if(Number(req.headers.get('content-length')||0)>440000)return out(413,{ok:false,error:'request_too_large'});
  let payload;try{const body=await req.text();if(body.length>70000)return out(413,{ok:false,error:'request_too_large'});payload=JSON.parse(body);}catch{return out(400,{ok:false,error:'invalid_json'});}
  const messages=valid(payload);if(!messages)return out(400,{ok:false,error:'invalid_messages'});
  const retryAfter=shouldThrottle(req,Date.now());
  if(retryAfter)return out(429,{ok:false,error:'temporarily_busy'},{'retry-after':String(retryAfter)});
  inFlight++;
  try{
   const requested=Math.max(180,Math.min(4096,Math.floor(Number(payload.max_tokens)||400)));
   const deadline=Date.now()+42000,attempted=[];
   for(const provider of CHAT_ROUTES){
    if(req.signal.aborted||Date.now()>deadline-1000)break;
    if((cooldowns.get(provider.host)||0)>Date.now())continue;
    try{return out(200,{ok:true,text:await model(messages,requested,provider,deadline,req.signal)});}
    catch(e){
     if(e.filtered)return out(422,{ok:false,error:'content_filtered'});
     if(e.cooldown)cooldowns.set(provider.host,Date.now()+e.cooldown*1000);
     attempted.push(provider.id+':'+(e.status||e.name||'error'));
    }
   }
   // Never store reasoning text, fabricate a reply or pass upstream error bodies to the browser.
   if(!attempted.length&&[...cooldowns.values()].some(x=>x>Date.now())){
    const remaining=Math.min(...[...cooldowns.values()].filter(x=>x>Date.now()));
    return out(429,{ok:false,error:'temporarily_busy'},{'retry-after':String(Math.max(1,Math.ceil((remaining-Date.now())/1000)))});
   }
   return out(503,{ok:false,error:'model_unavailable'});
  }finally{inFlight--;}
 }
 if(url.pathname.startsWith('/api/'))return out(404,{ok:false,error:'not_found'});
 return env.ASSETS.fetch(req);
}};