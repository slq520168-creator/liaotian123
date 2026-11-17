const origins=new Set(['https://sirole.vip','https://www.sirole.vip','https://juese.onrender.com','https://slq520168-creator.github.io','https://liaotian123.pages.dev','http://localhost:3000','http://127.0.0.1:3000']);
const slots=new Map<string,number>();
const safeSystem='你是虚构成年AI角色。仅进行健康非色情交流，不描写露骨性内容，不假装现实人物，不编造现实经历或已执行的操作。';
function headers(origin:string|null){return {'access-control-allow-origin':origin&&origins.has(origin)?origin:'https://sirole.vip','access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'POST,OPTIONS','access-control-expose-headers':'retry-after','vary':'Origin','cache-control':'no-store'};}
function json(body:unknown,status:number,origin:string|null,retry=0){return new Response(JSON.stringify(body),{status,headers:{...headers(origin),'content-type':'application/json',...(retry?{'retry-after':String(retry)}:{})}});}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 if(origin&&!origins.has(origin))return json({error:'origin_not_allowed'},403,origin);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405,origin);
 try{
  const text=await req.text();if(text.length>65000)return json({error:'request_too_large'},413,origin);
  let body;try{body=JSON.parse(text);}catch{return json({error:'invalid_json'},400,origin);}
  const kind=body.kind;if(!['text','image'].includes(kind))return json({error:'invalid_kind'},400,origin);
  let url:string,options:RequestInit;
  if(kind==='text'){
   if(!Array.isArray(body.messages)||body.messages.length>100)return json({error:'invalid_messages'},400,origin);
   const messages=body.messages.filter((m:any)=>m&&['system','user','assistant'].includes(m.role)&&typeof m.content==='string').map((m:any)=>({role:m.role,content:m.content.slice(0,m.role==='system'?20000:30000)}));
   if(!messages.some((m:any)=>m.role==='user'))return json({error:'user_message_required'},400,origin);
   url='https://text.pollinations.ai/openai';options={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:safeSystem},...messages],max_tokens:1400,temperature:.8,stream:false})};
  }else{
   if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>2200)return json({error:'invalid_prompt'},400,origin);
   const prompt='Original art of a fictional adult character in everyday clothing, suitable for a general audience. '+body.prompt;
   const target=new URL('https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt));target.search=new URLSearchParams({width:'512',height:'768',seed:String(Math.max(0,Math.min(2147483647,Math.floor(Number(body.seed)||42)))),safe:'true'}).toString();url=target.href;options={headers:{accept:'image/jpeg'}};
  }
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown',key=kind+':'+ip,now=Date.now(),slot=slots.get(key)||0;
  if(now<slot)return json({error:'free_rate_limit'},429,origin,Math.ceil((slot-now)/1000));
  if(slots.size>1000)for(const [k,v]of slots)if(v<now)slots.delete(k);slots.set(key,now+45000);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);
  try{
   if(kind==='image'&&/[^\x00-\x7F]/.test(body.prompt)){
    const textKey='text:'+ip,textSlot=slots.get(textKey)||0;if(now<textSlot)return json({error:'translation_rate_limit'},429,origin,Math.ceil((textSlot-now)/1000));slots.set(textKey,now+45000);
    const translated=await fetch('https://text.pollinations.ai/openai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:'Translate this ordinary character-art description into concise English for an image model. Keep the subject fictional, adult and fully clothed. Preserve the requested appearance, style and everyday scene. Do not include real personal names. Reject erotic or unsafe requests by returning REFUSED. Return only the English art description.'},{role:'user',content:body.prompt}],max_tokens:500,stream:false}),signal:controller.signal,redirect:'error'});
    if(!translated.ok)return json({error:'free_translation_unavailable'},[400,401,402,403,429].includes(translated.status)?translated.status:503,origin,45);
    const translation=String((await translated.json())?.choices?.[0]?.message?.content||'').trim();if(!translation||translation.includes('REFUSED')||translation.length>2200)return json({error:'description_refused'},400,origin);
    const target=new URL(url);target.pathname='/prompt/'+encodeURIComponent('Original art of a fictional adult character in everyday clothing, suitable for a general audience. '+translation);url=target.href;
   }
   const response=await fetch(url,{...options,signal:controller.signal,redirect:'error'});
   if(!response.ok){const status=[400,401,402,403,429].includes(response.status)?response.status:503;return json({error:'free_provider_unavailable',upstream_status:response.status},status,origin,Math.max(45,Math.min(600,Number(response.headers.get('retry-after'))||45)));}
   if(kind==='image'){
    if(!response.headers.get('content-type')?.startsWith('image/'))return json({error:'not_an_image'},502,origin);
    const blob=await response.blob();if(blob.size>12000000)return json({error:'image_too_large'},502,origin);
    return new Response(blob,{headers:{...headers(origin),'content-type':blob.type}});
   }
   const data=await response.json();const content=data?.choices?.[0]?.message?.content;if(typeof content!=='string'||!content.trim())return json({error:'empty_reply'},502,origin);return json({choices:[{message:{role:'assistant',content}}]},200,origin);
  }finally{clearTimeout(timer);}
 }catch(e){return json({error:e instanceof Error&&e.name==='AbortError'?'free_provider_timeout':'free_provider_unavailable'},503,origin);}
});
