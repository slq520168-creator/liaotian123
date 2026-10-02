import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={
  "access-control-allow-origin":"*",
  "access-control-allow-headers":"content-type, authorization",
  "access-control-allow-methods":"POST,OPTIONS",
  "access-control-max-age":"600"
};
function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store","connection":"keep-alive"}
  });
}
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
function matureButSafe(text:string){
  const t=String(text||"");
  const mature=/(成年人|成人话题|恋爱|暧昧|亲密关系|身体感受|性健康|避孕|边界|欲望|情侣|伴侣|约会|接吻|亲吻|想你|抱抱)/i.test(t);
  const risky=/(未成年|儿童|小孩|幼女|幼男|强迫|非自愿|迷奸|rape|minor|child|兽交|乱伦)/i.test(t);
  return mature&&!risky;
}
function refusalLike(text:string){
  return /(我不能|无法帮助|无法协助|不能参与|不能继续|不适合讨论|不能聊|不能提供|can't help|cannot help|can't assist|cannot assist|can't engage|cannot engage|not able to help|sexual content policy|色情内容|露骨内容)/i.test(String(text||""));
}
async function acceptNatural(result:Promise<{text:string,provider:string}>,messages:any[]){
  const out=await result;
  if(matureButSafe(lastUser(messages))&&refusalLike(out?.text||""))throw new Error("over_refusal_"+out.provider);
  return out;
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
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

function streamedReply(messages:any[],maxTokens:number,requestSignal:AbortSignal){
  const encoder=new TextEncoder();
  const aborters:AbortController[]=[];
  const sessions:{controller:AbortController,close:()=>void,iterator:AsyncGenerator}[]=[];
  let closed=false;
  const stop=()=>{closed=true;aborters.forEach(controller=>controller.abort());sessions.forEach(session=>session.close());};
  const stream=new ReadableStream({
    async start(output){
      const started=Date.now();
      const send=(event:unknown)=>{if(!closed)output.enqueue(encoder.encode("data: "+JSON.stringify(event)+"\n\n"));};
      const onAbort=()=>{stop();try{output.close();}catch{}};
      requestSignal.addEventListener("abort",onAbort,{once:true});
      if(requestSignal.aborted){onAbort();return;}
      const open=async(provider:typeof STREAM_PROVIDERS[number])=>{
        const controller=new AbortController();aborters.push(controller);
        const firstTimer=setTimeout(()=>controller.abort(),9000);
        const wholeTimer=setTimeout(()=>controller.abort(),maxTokens>1400?90000:32000);
        const close=()=>{clearTimeout(firstTimer);clearTimeout(wholeTimer);controller.abort();};
        try{
          const response=await fetch(provider.url,{method:"POST",headers:{"content-type":"application/json",...(provider.auth?{authorization:provider.auth}:{})},body:JSON.stringify({model:provider.model,messages,temperature:.85,max_tokens:maxTokens,stream:true}),signal:controller.signal});
          if(!response.ok)throw new Error(provider.name+"_"+response.status);
          const iterator=readUpstream(response);
          let prefix="";
          // 首批真实内容才参赛；空心跳、角色字段、错误不会成为赢家。
          while(!prefix){
            const next=await iterator.next();
            if(next.done||next.value.done&&!next.value.delta)throw new Error("empty_stream");
            if(next.value.delta)prefix+=next.value.delta;
          }
          if(matureButSafe(lastUser(messages))&&refusalLike(prefix))throw new Error("over_refusal");
          clearTimeout(firstTimer);
          sessions.push({controller,iterator,close});
          return {provider:provider.name,controller,iterator,prefix,close};
        }catch(error){close();throw error;}
      };
      try{
        const winner=await Promise.any(STREAM_PROVIDERS.map(open));
        if(closed){winner.close();await winner.iterator.return();return;}
        aborters.filter(controller=>controller!==winner.controller).forEach(controller=>controller.abort());
        sessions.filter(session=>session.controller!==winner.controller).forEach(session=>{session.close();session.iterator.return().catch(()=>{});});
        console.log("role_chat_first_content",winner.provider,"ms",Date.now()-started);
        if(winner.prefix.length>30000)throw new Error("reply_too_large");
        send({delta:winner.prefix});
        let complete=false,total=winner.prefix.length;
        try{
          for await(const event of winner.iterator){
            if(closed)break;
            if(event.delta){total+=event.delta.length;if(total>30000)throw new Error("reply_too_large");send({delta:event.delta});}
            if(event.done){complete=true;send({done:true,limited:event.limited===true});break;}
          }
          if(!complete&&!closed)throw new Error("stream_incomplete");
        }finally{winner.close();}
      }catch(error){
        if(!closed)send({error:"reply_unavailable"});
        console.warn("role_chat_stream_failed",String(error).slice(0,160));
      }finally{
        requestSignal.removeEventListener("abort",onAbort);
        if(!closed){stop();output.close();}
      }
    },
    cancel(){stop();}
  });
  return new Response(stream,{headers:{...cors,"content-type":"text/event-stream; charset=utf-8","cache-control":"no-cache, no-transform","x-accel-buffering":"no"}});
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);
  try{
    const body=await req.json().catch(()=>({}));
    const website=body?.client==="liaotian123";
    const incoming=Array.isArray(body?.messages)?body.messages:[];
    if(website&&(lastUser(incoming).length>30000||String(incoming.find((m:any)=>m?.role==="system")?.content||"").length>24000))return json({error:"message_too_large"},400);
    const messages=compact(incoming,website?30000:1600,website?24000:6000,website?12000:Infinity);
    const requestedTokens=Number(body?.max_tokens);
    const maxTokens=body?.client==="liaotian123"&&Number.isFinite(requestedTokens)
      ? Math.max(180,Math.min(6000,Math.floor(requestedTokens)))
      : 180;
    if(messages.length<2) return json({error:"messages_required"},400);
    if(website&&body?.stream===true)return streamedReply(messages,maxTokens,req.signal);
    try{
      const started=Date.now();
      const winner=await Promise.any([
        acceptNatural(cehpoint(messages,maxTokens),messages),
        acceptNatural(pollinations(messages,maxTokens),messages),
        ...(body?.client==="liaotian123"?[]:[acceptNatural(pollinationsText(messages),messages)]),
        acceptNatural(vireonix(messages,maxTokens),messages),
        acceptNatural(faucet(messages,maxTokens),messages)
      ]);
      console.log("role_chat_provider",winner.provider,"ms",Date.now()-started);
      return json(winner);
    }catch(e){
      return json({error:"free_models_busy",detail:String(e).slice(0,180)},503);
    }
  }catch(e){
    return json({error:"role_chat_failed",detail:String((e as any)?.message||e).slice(0,180)},500);
  }
});
