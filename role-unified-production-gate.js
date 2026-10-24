(() => {
  'use strict';

  const CANDIDATE_ID='unified-charactercreator';
  const MANIFEST_URL='assets/humans/unified/unified-human-manifest.json';
  const ASSET_ROOT='assets/humans/unified/';
  const QA_URL='docs/unified-mobile-qa.html?return=1';
  const QA_KEY='liaotian_unified_mobile_qa_v1';
  const CERT_KEY='liaotian_unified_mobile_qa_certificate_v1';
  const RETURN_KEY='liaotian_unified_mobile_qa_return';
  const REQUIRED_CAPABILITIES=Object.freeze(['skeleton','body','faceIdentity','expressions','visemes','hair','clothing']);
  const REQUIRED_VISUAL_PROOF=Object.freeze(['briefs','tshirt','hoodie','jeans','shoes']);
  const ALLOWED_LICENSES=new Set(['CC0','MIT','OWNED']);

  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const clean=value=>String(value??'').trim();
  const equalNumber=(a,b)=>number(a)===number(b);

  function staticQualification(manifest){
    const reasons=[];
    if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))reasons.push('manifest');
    if(number(manifest?.schema)!==1)reasons.push('schema');
    const license=clean(manifest?.license).toUpperCase();
    if(!ALLOWED_LICENSES.has(license))reasons.push('license');
    if(!clean(manifest?.base?.url)||number(manifest?.base?.bytes)<=0)reasons.push('base');
    for(const key of REQUIRED_CAPABILITIES)if(manifest?.capabilities?.[key]!==true)reasons.push(`capability:${key}`);
    if(!manifest?.modules?.hair||typeof manifest.modules.hair!=='object'||!Object.keys(manifest.modules.hair).length)reasons.push('hair-modules');
    if(!manifest?.modules?.clothing||typeof manifest.modules.clothing!=='object'||!Object.keys(manifest.modules.clothing).length)reasons.push('clothing-modules');
    const male=Array.isArray(manifest?.safetyUnderwear?.male)?manifest.safetyUnderwear.male:[];
    const female=Array.isArray(manifest?.safetyUnderwear?.female)?manifest.safetyUnderwear.female:[];
    if(!male.includes('briefs'))reasons.push('male-safety-underwear');
    if(!female.includes('panties')||!female.includes('bra'))reasons.push('female-safety-underwear');
    return Object.freeze({ok:reasons.length===0,reasons:Object.freeze(reasons),license});
  }

  function globalQualification(manifest){
    const base=staticQualification(manifest),reasons=[...base.reasons];
    if(clean(manifest?.status)!=='production')reasons.push('status');
    if(manifest?.capabilities?.mobile!==true)reasons.push('capability:mobile');
    if(manifest?.mobile?.validated!==true)reasons.push('mobile:validated');
    return Object.freeze({ok:reasons.length===0,reasons:Object.freeze(reasons),license:base.license});
  }

  function deviceQualification(manifest,proof,environment={}){
    const base=staticQualification(manifest),reasons=[...base.reasons];
    if(!proof||typeof proof!=='object'||Array.isArray(proof))reasons.push('proof');
    if(number(proof?.schema)!==1)reasons.push('proof:schema');
    if(proof?.mobileDevice!==true)reasons.push('proof:mobile-device');
    if(proof?.eligibleForMobilePromotion!==true||proof?.performancePass!==true)reasons.push('proof:performance');
    if(number(proof?.avgFps)<30)reasons.push('proof:fps');
    if(number(proof?.p95FrameMs)>50||number(proof?.p95FrameMs)<=0)reasons.push('proof:p95');
    if(number(proof?.contextLosses)!==0||proof?.visibilityInterrupted===true)reasons.push('proof:context');
    const origin=clean(environment.origin);if(origin&&clean(proof?.productionOrigin)!==origin)reasons.push('proof:origin');
    const userAgent=clean(environment.userAgent);if(userAgent&&clean(proof?.device?.userAgent)!==userAgent)reasons.push('proof:user-agent');
    const platform=clean(environment.platform);if(platform&&clean(proof?.device?.platform)!==platform)reasons.push('proof:platform');
    if(!equalNumber(proof?.candidate?.baseBytes,manifest?.base?.bytes))reasons.push('proof:base-bytes');
    const hairId=clean(proof?.candidate?.hairId),hair=manifest?.modules?.hair?.[hairId];
    if(!hair||!equalNumber(proof?.candidate?.hairBytes,hair?.bytes))reasons.push('proof:hair');
    const clothingIds=Array.isArray(proof?.candidate?.clothingIds)?proof.candidate.clothingIds.map(clean):[];
    let clothingBytes=0;
    for(const id of clothingIds){const item=manifest?.modules?.clothing?.[id];if(!item){reasons.push(`proof:clothing:${id||'missing'}`);continue;}clothingBytes+=number(item.bytes);}
    if(!clothingIds.length||!equalNumber(proof?.candidate?.clothingBytes,clothingBytes))reasons.push('proof:clothing-bytes');
    for(const id of REQUIRED_VISUAL_PROOF){if(!clothingIds.includes(id))reasons.push(`proof:required-clothing:${id}`);if(proof?.candidate?.visualProof?.[id]?.pass!==true)reasons.push(`proof:visual:${id}`);}
    if(number(proof?.candidate?.movedBones)<40)reasons.push('proof:skeleton');
    const hits=proof?.candidate?.expressionHits||{};
    if(number(hits.jaw)<2||number(hits.blinkL)<2||number(hits.blinkR)<2)reasons.push('proof:expressions');
    return Object.freeze({ok:reasons.length===0,reasons:Object.freeze(reasons),license:base.license});
  }

  function certificateFrom(manifest,proof,environment={}){
    const check=deviceQualification(manifest,proof,environment);
    if(!check.ok)throw new Error(`mobile QA certificate rejected: ${check.reasons.join(',')}`);
    return Object.freeze({schema:1,qualified:true,origin:clean(environment.origin),userAgent:clean(environment.userAgent),platform:clean(environment.platform),baseBytes:number(manifest.base.bytes),hairId:clean(proof.candidate.hairId),hairBytes:number(proof.candidate.hairBytes),clothingIds:Object.freeze([...proof.candidate.clothingIds].map(clean)),clothingBytes:number(proof.candidate.clothingBytes),visualIds:Object.freeze([...REQUIRED_VISUAL_PROOF])});
  }

  function certificateQualification(manifest,certificate,environment={}){
    const base=staticQualification(manifest),reasons=[...base.reasons];
    if(!certificate||typeof certificate!=='object'||Array.isArray(certificate))reasons.push('certificate');
    if(number(certificate?.schema)!==1||certificate?.qualified!==true)reasons.push('certificate:schema');
    if(clean(certificate?.origin)!==clean(environment.origin))reasons.push('certificate:origin');
    if(clean(certificate?.userAgent)!==clean(environment.userAgent))reasons.push('certificate:user-agent');
    if(clean(certificate?.platform)!==clean(environment.platform))reasons.push('certificate:platform');
    if(!equalNumber(certificate?.baseBytes,manifest?.base?.bytes))reasons.push('certificate:base-bytes');
    const hairId=clean(certificate?.hairId),hair=manifest?.modules?.hair?.[hairId];
    if(!hair||!equalNumber(certificate?.hairBytes,hair?.bytes))reasons.push('certificate:hair');
    const clothingIds=Array.isArray(certificate?.clothingIds)?certificate.clothingIds.map(clean):[];let clothingBytes=0;
    for(const id of clothingIds){const item=manifest?.modules?.clothing?.[id];if(!item){reasons.push(`certificate:clothing:${id||'missing'}`);continue;}clothingBytes+=number(item.bytes);}
    if(!clothingIds.length||!equalNumber(certificate?.clothingBytes,clothingBytes))reasons.push('certificate:clothing-bytes');
    for(const id of REQUIRED_VISUAL_PROOF){if(!clothingIds.includes(id))reasons.push(`certificate:required-clothing:${id}`);if(!Array.isArray(certificate?.visualIds)||!certificate.visualIds.includes(id))reasons.push(`certificate:visual:${id}`);}
    return Object.freeze({ok:reasons.length===0,reasons:Object.freeze(reasons),license:base.license});
  }

  function candidateFrom(manifest,qualification='device'){
    const license=clean(manifest?.license).toUpperCase();if(!ALLOWED_LICENSES.has(license))throw new Error('unified candidate license is not production-safe');
    const baseUrl=clean(manifest?.base?.url);if(!baseUrl)throw new Error('unified candidate base asset missing');
    return Object.freeze({id:CANDIDATE_ID,status:qualification==='global'?'production':'device-qualified',descriptor:Object.freeze({url:`${ASSET_ROOT}${baseUrl}`,scale:1,y:0,rotationY:0,framing:'full',minMorphTargets:52}),capabilities:Object.freeze({...manifest.capabilities,mobile:true,license})});
  }

  function registerCandidate(registry,candidate){if(!Array.isArray(registry)||!candidate)return false;const index=registry.findIndex(item=>item?.id===CANDIDATE_ID);if(index>=0)registry.splice(index,1,candidate);else registry.push(candidate);return true;}
  function readJson(storage,key){if(!storage?.getItem)return null;try{const raw=storage.getItem(key);return raw?JSON.parse(raw):null;}catch{return null;}}
  function readProof(storage){return readJson(storage,QA_KEY);}
  function readCertificate(storage){return readJson(storage,CERT_KEY);}
  function saveCertificate(storage,certificate){if(!storage?.setItem||!certificate)return false;try{storage.setItem(CERT_KEY,JSON.stringify(certificate));return true;}catch{return false;}}
  function environmentFromWindow(win){return Object.freeze({origin:clean(win?.location?.origin),userAgent:clean(win?.navigator?.userAgent),platform:clean(win?.navigator?.platform)});}
  function versionedUrl(url,version=''){const value=clean(version);if(!value)return url;return `${url}${url.includes('?')?'&':'?'}v=${encodeURIComponent(value)}`;}

  function loadScript(win,src){
    const doc=win?.document;if(!doc)return Promise.resolve(false);
    const existing=doc.querySelector('script[data-unified-custom-chat="1"]');if(existing)return Promise.resolve(true);
    return new Promise((resolve,reject)=>{const script=doc.createElement('script');script.async=false;script.dataset.unifiedCustomChat='1';script.src=src;script.onload=()=>resolve(true);script.onerror=()=>reject(new Error('统一3D聊天运行时加载失败'));doc.body.appendChild(script);});
  }

  function gateAnchor(studio){return studio?.querySelector?.('.creator-actions')||null;}
  function gateEntryModel(result,proof,diagnosticsApi){
    if(result?.ok===true){
      const global=result.qualification==='global';
      return Object.freeze({key:global?'ready-global':'ready-device',ready:true,status:global?'3D已正式启用':'本机3D已解锁',hint:global?'当前统一3D已通过全局生产资格。':'当前设备已通过真机验收，自建角色可进入3D聊天。'});
    }
    let diagnostic=diagnosticsApi?.summary?.(proof,3)||'';
    if(!diagnostic&&result?.error)diagnostic=diagnosticsApi?.summary?.({error:result.error,eligibleForMobilePromotion:false},3)||clean(result.error);
    if(!diagnostic){
      const reasons=Array.isArray(result?.device?.reasons)?result.device.reasons:[];
      if(reasons.some(reason=>/^proof:(?:origin|user-agent|platform|base-bytes|hair|clothing)/.test(reason)))diagnostic='上次验收证据与当前设备或3D资源版本不匹配，请重新验收';
    }
    return Object.freeze({key:`pending|${diagnostic}`,ready:false,status:'本机3D验收',hint:diagnostic?`上次验收未通过：${diagnostic}`:'通过后，本机自动启用自建角色3D。'});
  }

  function installGateEntry(win,result=win?.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT){
    const doc=win?.document;if(!doc)return false;
    const studio=doc.getElementById('roleCreatorStudio');if(!studio)return false;
    const actions=gateAnchor(studio);if(!actions)return false;
    const proof=readProof(win.sessionStorage);
    const model=gateEntryModel(result,proof,win.RoleMobileQaDiagnostics);
    let row=studio.querySelector('#creator3dGateRow');
    if(row?.dataset?.gateKey===model.key&&row.nextSibling===actions)return true;
    if(!row){row=doc.createElement('div');row.id='creator3dGateRow';row.className='creator-3d-qa';row.style.cssText='margin:8px 0;padding:8px 9px;border-radius:10px;background:#f7f3f5;display:flex;align-items:center;gap:8px;flex-wrap:wrap';}
    row.dataset.gateKey=model.key;
    row.replaceChildren();
    if(model.ready){
      const strong=doc.createElement('strong');strong.id='creator3dGateStatus';strong.textContent=model.status;strong.style.cssText='font-size:12px;color:#287a4d';
      const hint=doc.createElement('small');hint.textContent=model.hint;hint.style.cssText='font-size:11px;color:#75636c';
      row.append(strong,hint);
    }else{
      const button=doc.createElement('button');button.type='button';button.id='creator3dQaBtn';button.className='btn btn-outline btn-sm';button.textContent='本机3D验收';
      const hint=doc.createElement('small');hint.textContent=model.hint;hint.style.cssText='font-size:11px;color:#75636c;flex:1 1 220px';
      button.addEventListener('click',()=>{try{win.sessionStorage?.setItem(RETURN_KEY,win.location.href);}catch{}win.location.href=QA_URL;});
      row.append(button,hint);
    }
    if(row.nextSibling!==actions)studio.insertBefore(row,actions);
    return true;
  }

  function watchGateEntry(win){
    const doc=win?.document;if(!doc||typeof win.MutationObserver!=='function')return null;
    installGateEntry(win);
    if(win.__ROLE_UNIFIED_GATE_ENTRY_OBSERVER)return win.__ROLE_UNIFIED_GATE_ENTRY_OBSERVER;
    let queued=false;
    const observer=new win.MutationObserver(()=>{
      if(queued)return;queued=true;
      Promise.resolve().then(()=>{
        queued=false;
        const studio=doc.getElementById('roleCreatorStudio');if(!studio)return;
        const actions=gateAnchor(studio),row=studio.querySelector('#creator3dGateRow');
        if(row&&actions&&row.nextSibling===actions)return;
        installGateEntry(win);
      });
    });
    observer.observe(doc.body,{childList:true,subtree:true});
    win.__ROLE_UNIFIED_GATE_ENTRY_OBSERVER=observer;return observer;
  }
  function installQaEntry(win){return installGateEntry(win,{ok:false});}
  function watchQaEntry(win){return watchGateEntry(win);}

  async function fetchManifest(win,options={}){
    const fetchImpl=options.fetchImpl||win?.fetch?.bind(win);if(typeof fetchImpl!=='function')throw new Error('统一3D候选 manifest 无法读取');
    const url=versionedUrl(options.url||MANIFEST_URL,options.version||win?.LIAOTIAN_BUILD_VERSION||'');
    const response=await fetchImpl(url,{cache:'force-cache',credentials:'same-origin'});if(!response?.ok)throw new Error(`统一3D候选 manifest 加载失败 (${response?.status||0})`);return response.json();
  }

  async function boot(win=typeof window!=='undefined'?window:null,options={}){
    if(!win?.document)return Object.freeze({ok:false,reason:'browser-required'});
    if(win.__ROLE_UNIFIED_PRODUCTION_GATE_PROMISE)return win.__ROLE_UNIFIED_PRODUCTION_GATE_PROMISE;
    const task=(async()=>{
      const manifest=await fetchManifest(win,options),global=globalQualification(manifest),environment=environmentFromWindow(win),proof=readProof(win.sessionStorage),sessionDevice=deviceQualification(manifest,proof,environment);
      if(sessionDevice.ok)saveCertificate(win.localStorage,certificateFrom(manifest,proof,environment));
      const certificate=readCertificate(win.localStorage),persistentDevice=certificateQualification(manifest,certificate,environment),device=sessionDevice.ok?sessionDevice:persistentDevice,qualification=global.ok?'global':device.ok?'device':'';
      if(!qualification){
        const result=Object.freeze({ok:false,global,device,manifestStatus:clean(manifest.status),qaUrl:QA_URL});win.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT=result;watchGateEntry(win);installGateEntry(win,result);win.dispatchEvent(new win.CustomEvent('unifiedproductionpending',{detail:result}));return result;
      }
      const candidate=candidateFrom(manifest,qualification);win.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES||=[];registerCandidate(win.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES,candidate);
      const capability=win.RoleHumanAssetCapability?.selectCustomAsset?.(win.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES);if(!capability?.complete)throw new Error('统一3D候选未通过正式能力选择器');
      await loadScript(win,versionedUrl('role-unified-custom-chat.js',win.LIAOTIAN_BUILD_VERSION||''));
      const result=Object.freeze({ok:true,qualification,candidate,global,device,qaUrl:QA_URL});win.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT=result;watchGateEntry(win);installGateEntry(win,result);win.dispatchEvent(new win.CustomEvent('unifiedproductionready',{detail:result}));win.RoleUnifiedCustomChat?.boot?.();win.__ROLE_HUMAN_RENDERER?.syncCharacter?.();return result;
    })().catch(error=>{
      console.warn('统一3D生产门槛未通过，保持普通聊天。',error);
      const result=Object.freeze({ok:false,error:String(error?.message||error),qaUrl:QA_URL});win.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT=result;watchGateEntry(win);installGateEntry(win,result);return result;
    });
    win.__ROLE_UNIFIED_PRODUCTION_GATE_PROMISE=task;return task;
  }

  const api=Object.freeze({CANDIDATE_ID,MANIFEST_URL,QA_URL,QA_KEY,CERT_KEY,RETURN_KEY,REQUIRED_CAPABILITIES,REQUIRED_VISUAL_PROOF,staticQualification,globalQualification,deviceQualification,certificateFrom,certificateQualification,candidateFrom,registerCandidate,readJson,readProof,readCertificate,saveCertificate,environmentFromWindow,versionedUrl,gateAnchor,gateEntryModel,installGateEntry,watchGateEntry,installQaEntry,fetchManifest,boot});
  if(typeof window!=='undefined'){window.RoleUnifiedProductionGate=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
