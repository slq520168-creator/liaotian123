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
 return size<=55000&&messages[0].role==='system'&&messages.at(-1).role==='user'?messages:null;
}
async function model(messages,max_tokens,provider){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),provider.timeout||16000);
 try{
  const response=await fetch(provider.url,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({model:provider.model,messages,max_tokens,stream:false,temperature:0.8}),signal:abort.signal,redirect:'error'});
  if(!response.ok)throw Error('model error');
  const data=await response.json(),text=data?.choices?.[0]?.message?.content;
  if(typeof text!=='string'||!text.trim()||text.length>30000)throw Error('empty model');
  return text.trim();
 }finally{clearTimeout(timeout);}
}
export default{async fetch(req,env){
 const url=new URL(req.url);
 if(url.pathname==='/api/chat'){
  if(req.method==='GET'||req.method==='HEAD')return out(200,{ok:true,service:'role-chat'});
  if(req.method!=='POST')return out(405,{ok:false,error:'method_not_allowed'});
  const origin=req.headers.get('origin');if(origin&&origin!==url.origin)return out(403,{ok:false,error:'origin_mismatch'});
  if(Number(req.headers.get('content-length')||0)>70000)return out(413,{ok:false,error:'request_too_large'});
  let payload;try{const body=await req.text();if(body.length>70000)return out(413,{ok:false,error:'request_too_large'});payload=JSON.parse(body);}catch{return out(400,{ok:false,error:'invalid_json'});}
  const messages=valid(payload);if(!messages)return out(400,{ok:false,error:'invalid_messages'});
  const retryAfter=shouldThrottle(req,Date.now());
  if(retryAfter)return out(429,{ok:false,error:'temporarily_busy'},{'retry-after':String(retryAfter)});
  inFlight++;
  try{
   const max_tokens=Math.max(128,Math.min(2048,Number(payload.max_tokens)||400));
   for(const provider of [
     {url:'https://api.llm7.io/v1/chat/completions',model:'gpt-oss:20b',timeout:18000},
     {url:'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions',model:'qwen3.6-35b-a3b',timeout:18000}
   ]) {
     try{return out(200,{ok:true,text:await model(messages,max_tokens,provider)});}
     catch{/* No fabricated text; try the next independent real model. */}
   }
   return out(503,{ok:false,error:'model_unavailable'});
  }finally{inFlight--;}
 }
 if(url.pathname.startsWith('/api/'))return out(404,{ok:false,error:'not_found'});
 return env.ASSETS.fetch(req);
}};