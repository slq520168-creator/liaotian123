import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={
  "access-control-allow-origin":"*",
  "access-control-allow-headers":"content-type, authorization",
  "access-control-allow-methods":"POST,OPTIONS"
};
function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store","connection":"keep-alive"}
  });
}
function compact(messages:any[]){
  const a=Array.isArray(messages)?messages:[];
  const system=a.find((m:any)=>m?.role==="system");
  const tail=a.filter((m:any)=>m?.role!=="system").slice(-20);
  return [
    ...(system?[{role:"system",content:String(system.content||"").slice(0,6000)}]:[]),
    ...tail.map((m:any)=>({
      role:["assistant","user"].includes(m?.role)?m.role:"user",
      content:String(m?.content||"").slice(0,1600)
    }))
  ];
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
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);
  try{
    const body=await req.json().catch(()=>({}));
    const messages=compact(body?.messages||[]);
    const requestedTokens=Number(body?.max_tokens);
    const maxTokens=body?.client==="liaotian123"&&Number.isFinite(requestedTokens)
      ? Math.max(180,Math.min(640,Math.floor(requestedTokens)))
      : 180;
    if(messages.length<2) return json({error:"messages_required"},400);
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