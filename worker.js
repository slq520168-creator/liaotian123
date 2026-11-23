/* Same-origin chat proxy; no Supabase, database, client secret or generated placeholder response. */
const recent=new Map();let inFlight=0;
const headers={'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const out=(status,body)=>new Response(JSON.stringify(body),{status,headers});
function valid(payload){
 if(!payload||!Array.isArray(payload.messages)||payload.messages.length<2||payload.messages.length>24)return null;
 let size=0;const messages=[];
 for(const item of payload.messages){if(!item||!['system','user','assistant'].includes(item.role)||typeof item.content!=='string'||!item.content.trim()||item.content.length>24000)return null;size+=item.content.length;messages.push({role:item.role,content:item.content});}
 return size<=45000&&messages[0].role==='system'&&messages.at(-1).role==='user'?messages:null;
}
async function model(messages,max_tokens,mode){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),16000);
 try{
  const response=await fetch('https://api.llmfaucet.dev/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','accept':'application/json','authorization':'Bearer free'},body:JSON.stringify({model:mode,messages,max_tokens,stream:false,temperature:0.8}),signal:abort.signal,redirect:'error'});
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
  if(Number(req.headers.get('content-length')||0)>50000)return out(413,{ok:false,error:'request_too_large'});
  let payload;try{const body=await req.text();if(body.length>50000)return out(413,{ok:false,error:'request_too_large'});payload=JSON.parse(body);}catch{return out(400,{ok:false,error:'invalid_json'});}
  const messages=valid(payload);if(!messages)return out(400,{ok:false,error:'invalid_messages'});
  const ip=req.headers.get('cf-connecting-ip')||'unknown',now=Date.now();
  for(const [key,time] of recent)if(now-time>20000)recent.delete(key);
  if(inFlight>=3||now-(recent.get(ip)||0)<8000)return out(429,{ok:false,error:'temporarily_busy'});
  recent.set(ip,now);inFlight++;
  try{
   const max_tokens=Math.max(128,Math.min(2048,Number(payload.max_tokens)||400));
   for(const mode of ['auto:fast','auto']){
    try{return out(200,{ok:true,text:await model(messages,max_tokens,mode)});}catch{/* Never replace with invented character text. */}
   }
   return out(503,{ok:false,error:'model_unavailable'});
  }finally{inFlight--;}
 }
 if(url.pathname.startsWith('/api/'))return out(404,{ok:false,error:'not_found'});
 return env.ASSETS.fetch(req);
}};