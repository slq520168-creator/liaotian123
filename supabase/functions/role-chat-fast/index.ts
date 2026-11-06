// jsr:@supabase/functions-js/edge-runtime.d.ts (类型声明，运行时不需要，打包时跳过 JSR 下载)

/**
 * 允许调用本函数的前端来源（收紧 CORS，不再用 *）。
 * 如需新增域名，在此数组追加即可。
 */
const ALLOWED_ORIGINS = [
  "https://slq520168-creator.github.io",
  "https://liaotian123.pages.dev",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
];

/**
 * 客户端共享密钥（非机密，用于区分"自家前端"与"外部白嫖"）。
 * 部署时在 Supabase Edge Function 环境变量设置 APP_CLIENT_KEY，
 * 未设置时回退到默认值，保证开发环境可用。
 */
const APP_CLIENT_KEY = Deno.env.get("APP_CLIENT_KEY") || "liaotian123-public-2026";

/** 单 IP 滑动窗口限流：每分钟最多 REQUESTS_PER_MINUTE 次请求。 */
const REQUESTS_PER_MINUTE = 20;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function corsHeaders(origin: string | null){
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "content-type, authorization, x-client-key",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-max-age": "600",
    "vary": "origin"
  };
}
function json(data:unknown,status=200,origin:string|null=null){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...corsHeaders(origin),"content-type":"application/json; charset=utf-8","cache-control":"no-store","connection":"keep-alive"}
  });
}

/** 从请求中获取客户端 IP（Supabase 通过 x-forwarded-for / x-real-ip 透传）。 */
function getClientIp(req:Request):string{
  const xff=req.headers.get("x-forwarded-for");
  if(xff)return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")||"unknown";
}

/** 滑动窗口限流检查。返回 true 表示放行，false 表示已超限。 */
function rateLimitCheck(ip:string):boolean{
  const now=Date.now();
  const entry=rateLimitMap.get(ip);
  if(!entry||now>entry.resetAt){
    rateLimitMap.set(ip,{count:1,resetAt:now+60_000});
    return true;
  }
  if(entry.count>=REQUESTS_PER_MINUTE)return false;
  entry.count++;
  return true;
}

/** 定期清理过期的限流条目，避免内存无限增长。 */
function cleanupRateLimit(){
  const now=Date.now();
  for(const [ip,entry] of rateLimitMap){
    if(now>entry.resetAt)rateLimitMap.delete(ip);
  }
}
setInterval(cleanupRateLimit,120_000);
function compact(messages:any[],maxUserChars=1600,maxSystemChars=6000,historyBudget=Infinity){
  const a=Array.isArray(messages)?messages:[];
  const system=a.find((m:any)=>m?.role==="system");
  const tail=a.filter((m:any)=>m?.role!=="system").slice(-20);
  const latestUser=[...tail].reverse().find((m:any)=>m?.role==="user");
  const recent:{role:string,content:string}[]=[];
  for(let i=tail.length-1;i>=0;i--){
    const m=tail[i],full=m===latestUser;
    const content=String(m?.content||"").slice(0,full?maxUserChars:Math.min(1600,historyBudget));
    if(!content)continue;
    if(!full)historyBudget-=content.length;
    recent.unshift({role:["assistant","user"].includes(m?.role)?m.role:"user",content});
  }
  return [...(system?[{role:"system",content:String(system.content||"").slice(0,maxSystemChars)}]:[]),...recent];
}
function lastUser(messages:any[]){
  const row=[...(Array.isArray(messages)?messages:[])].reverse().find((m:any)=>m?.role==="user");
  return String(row?.content||"");
}
async function vireonix(messages:any[],maxTokens=180){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),7000);
  try{
    const r=await fetch("https://vireonix.ai/v1/chat/completions",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({model:"auto",messages,temperature:.9,max_tokens:maxTokens}),
      signal:ctrl.signal
    });
    if(!r.ok) throw new Error("vireonix_"+r.status);
    const j=await r.json();
    const t=j?.choices?.[0]?.message?.content||"";
    if(!String(t).trim()) throw new Error("vireonix_empty");
    return {text:String(t).trim(),provider:"vireonix"};
  }finally{clearTimeout(timer)}
}
async function cehpoint(messages:any[],maxTokens=180){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),7000);
  try{
    const r=await fetch("https://ai-api.cehpoint.co.in/v1/chat/completions",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({model:"cehpoint-ai",messages,temperature:.9,max_tokens:maxTokens}),
      signal:ctrl.signal
    });
    if(!r.ok) throw new Error("cehpoint_"+r.status);
    const j=await r.json();
    const t=j?.choices?.[0]?.message?.content||"";
    if(!String(t).trim()) throw new Error("cehpoint_empty");
    return {text:String(t).trim(),provider:"cehpoint"};
  }finally{clearTimeout(timer)}
}
async function faucet(messages:any[],maxTokens=180){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),9000);
  try{
    const r=await fetch("https://api.llmfaucet.dev/v1/chat/completions",{
      method:"POST",
      headers:{"authorization":"Bearer free","content-type":"application/json"},
      body:JSON.stringify({model:"auto:smart",messages,temperature:.9,max_tokens:maxTokens}),
      signal:ctrl.signal
    });
    if(!r.ok) throw new Error("faucet_"+r.status);
    const j=await r.json();
    const t=j?.choices?.[0]?.message?.content||j?.choices?.[0]?.text||"";
    if(!String(t).trim()) throw new Error("faucet_empty");
    return {text:String(t).trim(),provider:"free-router"};
  }finally{clearTimeout(timer)}
}
async function pollinationsText(messages:any[]){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),7000);
  try{
    const prompt=messages.map((m:any)=>((m.role||"user")+": "+String(m.content||""))).join("\n").slice(0,7000);
    const r=await fetch("https://text.pollinations.ai/"+encodeURIComponent(prompt),{
      headers:{"accept":"text/plain"},
      signal:ctrl.signal
    });
    if(!r.ok) throw new Error("pollinations_text_"+r.status);
    const t=(await r.text()).trim();
    if(!t) throw new Error("pollinations_text_empty");
    return {text:t,provider:"pollinations-text"};
  }finally{clearTimeout(timer)}
}
async function pollinations(messages:any[],maxTokens=180){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const r=await fetch("https://text.pollinations.ai/openai",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({model:"openai-fast",messages,temperature:.9,max_tokens:maxTokens}),
      signal:ctrl.signal
    });
    if(!r.ok) throw new Error("pollinations_"+r.status);
    const j=await r.json();
    const t=j?.choices?.[0]?.message?.content||j?.choices?.[0]?.text||"";
    if(!String(t).trim()) throw new Error("pollinations_empty");
    return {text:String(t).trim(),provider:"pollinations"};
  }finally{clearTimeout(timer)}
}

const STREAM_PROVIDERS=[
  {name:"cehpoint",url:"https://ai-api.cehpoint.co.in/v1/chat/completions",model:"cehpoint-ai"},
  {name:"vireonix",url:"https://vireonix.ai/v1/chat/completions",model:"auto"},
  {name:"free-router",url:"https://api.llmfaucet.dev/v1/chat/completions",model:"auto:smart",auth:"Bearer free"},
  {name:"pollinations",url:"https://text.pollinations.ai/openai",model:"openai-fast"}
];

async function* readUpstream(response:Response):AsyncGenerator<{delta?:string,done?:boolean,limited?:boolean}> {
  if(!response.headers.get("content-type")?.includes("text/event-stream")){
    const data=await response.json();
    const text=data?.choices?.[0]?.message?.content||data?.choices?.[0]?.text;
    if(typeof text!=="string"||!text.trim())throw new Error("empty_reply");
    yield {delta:text};
    yield {done:true,limited:data?.choices?.[0]?.finish_reason==="length"};
    return;
  }
  if(!response.body)throw new Error("empty_stream");
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer="",finished=false;
  function parse(line:string){
    if(!line.startsWith("data:"))return null;
    const raw=line.slice(5).trim();
    if(!raw)return null;
    if(raw==="[DONE]")return {done:true};
    const data=JSON.parse(raw);
    if(data.error)throw new Error("upstream_error");
    const choice=data?.choices?.[0];
    const content=choice?.delta?.content;
    const result:{delta?:string,done?:boolean,limited?:boolean}={};
    if(typeof content==="string"&&content)result.delta=content;
    if(choice?.finish_reason){result.done=true;result.limited=choice.finish_reason==="length";}
    return result;
  }
  try{
    while(!finished){
      const chunk=await reader.read();
      buffer+=decoder.decode(chunk.value||new Uint8Array(),{stream:!chunk.done});
      if(buffer.length>1000000)throw new Error("stream_frame_too_large");
      const lines=buffer.split("\n");buffer=lines.pop()||"";
      for(const line of lines){
        const event=parse(line);
        if(event){if(event.delta)yield {delta:event.delta};if(event.done){yield {done:true,limited:event.limited};finished=true;break;}}
      }
      if(chunk.done){
        if(!finished&&buffer.trim()){const event=parse(buffer);if(event){yield event;finished=event.done===true;}}
        if(!finished)throw new Error("stream_incomplete");
        break;
      }
    }
  }finally{reader.cancel().catch(()=>{});reader.releaseLock();}
}

function streamedReply(messages:any[],maxTokens:number,requestSignal:AbortSignal,origin:string|null){
  const encoder=new TextEncoder();
  const aborters:AbortController[]=[];
  let closed=false;
  const stop=()=>{closed=true;aborters.forEach(controller=>controller.abort());};
  const stream=new ReadableStream({
    async start(output){
      const started=Date.now();
      const send=(event:unknown)=>{if(!closed)output.enqueue(encoder.encode("data: "+JSON.stringify(event)+"\n\n"));};
      const onAbort=()=>{stop();try{output.close();}catch{}};
      requestSignal.addEventListener("abort",onAbort,{once:true});
      if(requestSignal.aborted){onAbort();return;}
      // Keep the HTTP stream alive while racing complete, genuine model replies.
      // A first token alone must not cancel a provider that can finish successfully.
      const heartbeat=setInterval(()=>{if(!closed)output.enqueue(encoder.encode(": waiting\n\n"));},5000);
      const failures:{provider:string,reason:string}[]=[];
      const generate=async(provider:typeof STREAM_PROVIDERS[number])=>{
        const controller=new AbortController();aborters.push(controller);
        let timeout=false;
        const expire=()=>{timeout=true;controller.abort();};
        const firstTimer=setTimeout(expire,12000);
        const wholeTimer=setTimeout(expire,maxTokens>1400?90000:17000);
        const close=()=>{clearTimeout(firstTimer);clearTimeout(wholeTimer);controller.abort();};
        try{
          const response=await fetch(provider.url,{method:"POST",headers:{"content-type":"application/json",...(provider.auth?{authorization:provider.auth}:{})},body:JSON.stringify({model:provider.model,messages,temperature:.85,max_tokens:maxTokens,stream:true}),signal:controller.signal});
          if(!response.ok)throw new Error("http_"+response.status);
          let text="",complete=false,limited=false;
          for await(const event of readUpstream(response)){
            if(closed)throw new Error("cancelled");
            if(event.delta){
              clearTimeout(firstTimer);
              text+=event.delta;
              if(text.length>30000)throw new Error("reply_too_large");
            }
            if(event.done){complete=true;limited=event.limited===true;break;}
          }
          if(!complete)throw new Error("stream_incomplete");
          if(!text.trim())throw new Error("empty_reply");
          // Return upstream boundary/safety replies as genuine responses too.
          return {provider:provider.name,text,limited};
        }catch(error){
          const message=String((error as Error)?.message||"");
          const reason=timeout?"timeout":/^http_\d{3}$|^(?:stream_incomplete|empty_reply|empty_stream|upstream_error|reply_too_large|stream_frame_too_large)$/.test(message)?message:"network_or_format";
          if(!closed)failures.push({provider:provider.name,reason});
          throw new Error(reason);
        }finally{close();}
      };
      try{
        const winner=await Promise.any(STREAM_PROVIDERS.map(generate));
        if(closed)return;
        send({delta:winner.text});
        send({done:true,limited:winner.limited});
        console.log("role_chat_complete",JSON.stringify({provider:winner.provider,ms:Date.now()-started,chars:winner.text.length,limited:winner.limited}));
      }catch(error){
        if(!closed)send({error:"reply_unavailable"});
        if(!closed)console.warn("role_chat_failed",JSON.stringify({ms:Date.now()-started,providers:failures}));
      }finally{
        clearInterval(heartbeat);
        requestSignal.removeEventListener("abort",onAbort);
        if(!closed){stop();output.close();}
      }
    },
    cancel(){stop();}
  });
  return new Response(stream,{headers:{...corsHeaders(origin),"content-type":"text/event-stream; charset=utf-8","cache-control":"no-cache, no-transform","x-accel-buffering":"no","vary":"origin"}});
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  const cors=corsHeaders(origin);

  // CORS 预检
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(req.method==="GET") return json({ok:true},200,origin);
  if(req.method!=="POST") return json({error:"method_not_allowed"},405,origin);

  // —— 鉴权：校验 x-client-key 头，区分"自家前端"与外部白嫖 ——
  const clientKey=req.headers.get("x-client-key");
  if(clientKey!==APP_CLIENT_KEY){
    return json({error:"unauthorized"},401,origin);
  }

  // —— 限流：每 IP 每分钟最多 REQUESTS_PER_MINUTE 次 ——
  const ip=getClientIp(req);
  if(!rateLimitCheck(ip)){
    return json({error:"rate_limited",retry_after:60},429,origin);
  }

  try{
    const body=await req.json().catch(()=>({}));
    const website=body?.client==="liaotian123";
    const incoming=Array.isArray(body?.messages)?body.messages:[];
    if(website&&(lastUser(incoming).length>30000||String(incoming.find((m:any)=>m?.role==="system")?.content||"").length>24000))return json({error:"message_too_large"},400,origin);
    const messages=compact(incoming,website?30000:1600,website?24000:6000,website?12000:Infinity);
    const requestedTokens=Number(body?.max_tokens);
    const maxTokens=body?.client==="liaotian123"&&Number.isFinite(requestedTokens)
      ? Math.max(180,Math.min(6000,Math.floor(requestedTokens)))
      : 180;
    if(messages.length<2) return json({error:"messages_required"},400,origin);
    if(website&&body?.stream===true)return streamedReply(messages,maxTokens,req.signal,origin);
    try{
      const started=Date.now();
      const winner=await Promise.any([
        cehpoint(messages,maxTokens),
        pollinations(messages,maxTokens),
        ...(body?.client==="liaotian123"?[]:[pollinationsText(messages)]),
        vireonix(messages,maxTokens),
        faucet(messages,maxTokens)
      ]);
      console.log("role_chat_provider",winner.provider,"ms",Date.now()-started);
      return json(winner,200,origin);
    }catch(e){
      return json({error:"free_models_busy",detail:String(e).slice(0,180)},503,origin);
    }
  }catch(e){
    return json({error:"role_chat_failed",detail:String((e as any)?.message||e).slice(0,180)},500,origin);
  }
});
