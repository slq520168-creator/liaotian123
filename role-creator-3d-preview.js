(() => {
  'use strict';

  const PREVIEW_ID='custom_creator_preview';
  const DEBOUNCE_MS=220;
  const SUMMARY_KEYS=Object.freeze(['size','body','face','faceDetails','hair','hairColor','outfit','outfitColor','accessory','action','expression','voiceStyle']);
  const json=value=>JSON.stringify(value??null);
  const clean=value=>String(value??'').trim();

  function structuralSignature(mapped={}){
    return json({hair:mapped.hair||'',clothing:mapped.clothing||[],accessory:mapped.accessory||'none',expressionMorphs:mapped.expressionMorphs||{}});
  }
  function morphSignature(mapped={}){return json(mapped.morphs||{});}
  function tintSignature(mapped={}){return json({skin:mapped.skinTint||'',hair:mapped.hairTint||'',clothing:mapped.clothingTint||'',targets:mapped.clothingTintTargets||[],eye:mapped.eyeTint||''});}

  function summaryPatch(labels=[],previous={}){
    const values=Array.from(labels||[],value=>clean(value));
    if(values.length<12)return {...previous};
    const next={...previous,
      body:values[1]||previous.body,face:values[2]||previous.face,hair:values[4]||previous.hair,
      hairColor:values[5]||previous.hairColor,outfit:values[6]||previous.outfit,outfitColor:values[7]||previous.outfitColor,
      accessory:values[8]||previous.accessory,action:values[9]||previous.action,expression:values[10]||previous.expression,
      voiceStyle:(values[11]||'').replace(/语音$/,'')||previous.voiceStyle
    };
    if(values[3]==='脸部跟随预设'&&previous.faceDetails){next.faceDetails=Object.fromEntries(Object.keys(previous.faceDetails).map(key=>[key,0]));}
    return next;
  }

  function moduleRoots(mapped={},modules=[]){
    let index=0;const result={hair:null,clothing:{},complete:true};
    if(mapped.hair){result.hair=modules[index++]||null;if(!result.hair)result.complete=false;}
    for(const id of mapped.clothing||[]){const root=modules[index++]||null;result.clothing[id]=root;if(!root)result.complete=false;}
    if(index!==modules.length)result.complete=false;
    return result;
  }

  function isQualified(win){return Boolean(win?.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT?.ok===true&&['global','device'].includes(win.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT.qualification));}
  function modalOpen(doc){return Boolean(doc?.getElementById('createModalOverlay')?.classList?.contains('active'));}

  function createController(win=typeof window!=='undefined'?window:null){
    const doc=win?.document;
    if(!doc)return null;
    let renderer=null,previewChar=null,currentMapped=null,shadow=null,timer=0,refreshToken=0,observer=null,booted=false;

    const field=id=>doc.getElementById(id);
    const personality=()=>field('rolePersonality');
    const studio=()=>field('roleCreatorStudio');
    const modal=()=>field('createModalOverlay');

    function ensureStyle(){
      if(doc.getElementById('roleCreator3dPreviewStyles'))return;
      const style=doc.createElement('style');style.id='roleCreator3dPreviewStyles';
      style.textContent=`.creator-3d-preview{grid-column:1/-1;border:1px solid rgba(92,76,87,.14);border-radius:18px;background:linear-gradient(180deg,#f4eff2,#e9e2e7);overflow:hidden;margin:2px 0 8px}.creator-3d-preview-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:rgba(255,255,255,.72);border-bottom:1px solid rgba(80,60,70,.08)}.creator-3d-preview-head b{font-size:13px}.creator-3d-preview-status{font-size:10.5px;color:#75636c;text-align:right}.creator-3d-preview-canvas{height:min(42vh,420px);min-height:300px;position:relative}.creator-3d-preview.pending .creator-3d-preview-canvas{display:none}.creator-3d-preview.pending{background:#f7f3f5}.creator-3d-preview.pending .creator-3d-preview-head{border-bottom:0}.creator-3d-preview .role-human-stage,.creator-3d-preview .role-human-stage.active{display:block!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;border:0!important}.creator-3d-preview .role-human-stage.error{display:none!important}@media(max-width:560px){.creator-3d-preview{border-radius:14px}.creator-3d-preview-canvas{height:min(38vh,360px);min-height:270px}}`;
      doc.head.appendChild(style);
    }

    function ensureHost(){
      const target=studio();if(!target)return null;
      ensureStyle();
      let host=field('roleCreator3dPreview');
      if(host)return host;
      host=doc.createElement('section');host.id='roleCreator3dPreview';host.className='creator-3d-preview pending';host.setAttribute('aria-label','角色实时3D预览');
      const head=doc.createElement('div');head.className='creator-3d-preview-head';
      const title=doc.createElement('b');title.textContent='实时 3D 预览';
      const status=doc.createElement('span');status.id='roleCreator3dPreviewStatus';status.className='creator-3d-preview-status';status.textContent='本机3D验收通过后显示真实预览';
      const canvas=doc.createElement('div');canvas.id='roleCreator3dPreviewCanvas';canvas.className='creator-3d-preview-canvas';
      head.append(title,status);host.append(head,canvas);target.parentNode?.insertBefore(host,target);return host;
    }

    function setStatus(text,state=''){
      const host=ensureHost(),status=field('roleCreator3dPreviewStatus');if(!host)return;
      host.classList.toggle('pending',state==='pending');
      host.dataset.state=state||'';
      if(status)status.textContent=text||'';
    }

    function resetShadow(){
      const visual=win.RoleVisualRecipe,parsed=visual?.fromPersonality?.(personality()?.value)||{};
      shadow={...parsed,faceDetails:{...(parsed.faceDetails||{})}};
      const eye=win.__ROLE_CREATOR_EYE_COLOR||win.RoleEyeColor?.parseEyeColor?.(personality()?.value);
      if(eye)shadow.eyeColor=eye;
      captureSummary();return shadow;
    }

    function captureSummary(){
      const labels=[...(studio()?.querySelectorAll?.('.creator-summary span:not([data-identity-summary])')||[])].slice(0,12).map(node=>node.textContent);
      shadow=summaryPatch(labels,shadow||{});return shadow;
    }

    function readRecipe(){
      const visual=win.RoleVisualRecipe;if(!visual?.sanitize)return null;
      if(!shadow)resetShadow();
      const parsed=visual.fromPersonality?.(personality()?.value)||{};
      const eye=win.__ROLE_CREATOR_EYE_COLOR||shadow?.eyeColor||win.RoleEyeColor?.parseEyeColor?.(personality()?.value)||parsed.eyeColor;
      const identity=win.RoleCreatorIdentity?.current?.(doc)||{gender:field('roleGender')?.value||parsed.gender,age:field('roleAge')?.value||parsed.age};
      return visual.sanitize({...parsed,...shadow,
        gender:identity.gender,age:identity.age,
        heightCm:field('rbHeight')?.value??shadow?.heightCm,weightJin:field('rbWeight')?.value??shadow?.weightJin,
        body:field('rbBody')?.value||shadow?.body,face:field('rbFace')?.value||shadow?.face,skin:field('rbSkin')?.value||shadow?.skin,
        hair:field('rbHair')?.value||shadow?.hair,outfit:field('rbOutfit')?.value||shadow?.outfit,relationship:field('rbRelation')?.value||shadow?.relationship,
        faceDetails:{...(shadow?.faceDetails||parsed.faceDetails||{})},eyeColor:eye
      });
    }

    function makeCharacter(recipe){
      if(!previewChar)previewChar={id:PREVIEW_ID,name:'实时预览',isPreset:false,personality:'',visualRecipe:recipe,gender:recipe?.gender||'unspecified',age:recipe?.age||24};
      previewChar.personality=personality()?.value||'';previewChar.visualRecipe=recipe;previewChar.gender=recipe?.gender||'unspecified';previewChar.age=recipe?.age||24;return previewChar;
    }

    function ensureRenderer(){
      if(renderer)return renderer;
      const Renderer=win.RoleHumanRenderer?.HumanRenderer,container=field('roleCreator3dPreviewCanvas');
      if(typeof Renderer!=='function'||!container||!win.RoleUnifiedCustomChat)return null;
      renderer=new Renderer({container});
      const baseEnsure=renderer.ensureStage.bind(renderer);
      renderer.ensureStage=function(){const stage=baseEnsure();if(stage){stage.id='roleCreatorPreviewStage';stage.setAttribute('aria-label','创建中的3D角色实时预览');}return stage;};
      renderer.currentCharacter=()=>previewChar;
      return renderer;
    }

    function stop(clear=true){
      if(timer){win.clearTimeout(timer);timer=0;}refreshToken++;
      if(clear)renderer?.clearModel?.();else renderer?.loop?.stop?.();
      currentMapped=null;
    }

    async function incremental(nextMapped,previousMapped,token){
      const custom=win.RoleUnifiedCustomChat,runtime=win.RoleUnifiedHumanRuntime,eyeApi=win.RoleEyeColor;
      if(!renderer?.root||!custom||!runtime||!Array.isArray(renderer.__unifiedCustomModules))return false;
      const roots=moduleRoots(nextMapped,renderer.__unifiedCustomModules);if(!roots.complete)return false;
      let reframed=false;
      if(morphSignature(nextMapped)!==morphSignature(previousMapped)){
        const joints=await custom.loadJoints();if(token!==refreshToken||!renderer?.root)return true;
        const state=runtime.applyCandidateState(renderer.root,renderer.__unifiedCustomModules,joints,nextMapped.morphs||{});
        if(!state.morphs?.applied||state.skeleton?.moved<20||state.skeleton?.missingBones?.length)throw new Error('实时预览 morph/joints 合同失败');
        renderer.__unifiedCandidateState=state;reframed=true;
      }
      if(nextMapped.skinTint!==previousMapped?.skinTint)custom.requireSkinTint(renderer.root,nextMapped.skinTint);
      if(nextMapped.hairTint!==previousMapped?.hairTint&&nextMapped.hair){if(!roots.hair||custom.tintModule(roots.hair,nextMapped.hairTint)<1)throw new Error('实时预览发色材质不可用');}
      if(nextMapped.clothingTint!==previousMapped?.clothingTint||json(nextMapped.clothingTintTargets)!==json(previousMapped?.clothingTintTargets)){
        const targets=new Set(nextMapped.clothingTintTargets||[]);
        for(const id of targets){const root=roots.clothing[id];if(!root||custom.tintModule(root,nextMapped.clothingTint)<1)throw new Error(`实时预览服装颜色材质不可用: ${id}`);}
      }
      if(nextMapped.eyeTint!==previousMapped?.eyeTint){if(!eyeApi?.requireNamedMaterialTint)throw new Error('实时预览 Iris 合同不可用');eyeApi.requireNamedMaterialTint(renderer.root,'Iris',nextMapped.eyeTint);}
      if(reframed){renderer.frameModel?.(renderer.root,'full');renderer.resize?.();}
      renderer.__unifiedCustomKey=custom.recipeKey(nextMapped);renderer.loop?.start?.();return true;
    }

    async function refresh(){
      timer=0;const host=ensureHost();if(!host||!modalOpen(doc))return;
      if(!isQualified(win)||!win.RoleUnifiedCustomChat){stop(true);setStatus('本机3D验收通过后显示真实预览','pending');return;}
      const recipe=readRecipe(),mapper=win.RoleUnifiedHumanRecipe;if(!recipe||!mapper?.mapRecipe){setStatus('3D预览配方尚未就绪','pending');return;}
      const nextMapped=mapper.mapRecipe(recipe),char=makeCharacter(recipe),instance=ensureRenderer();if(!instance){setStatus('3D预览渲染器尚未就绪','pending');return;}
      const token=++refreshToken;setStatus('正在更新真实3D…','loading');
      try{
        let ok=false;
        if(instance.root&&currentMapped&&structuralSignature(nextMapped)===structuralSignature(currentMapped))ok=await incremental(nextMapped,currentMapped,token);
        if(token!==refreshToken)return;
        if(!ok)ok=await instance.loadCharacter(char);
        if(token!==refreshToken)return;
        if(!ok||!instance.root)throw new Error('统一3D预览未通过运行时合同');
        if(nextMapped.eyeTint&&win.RoleEyeColor?.requireNamedMaterialTint)win.RoleEyeColor.requireNamedMaterialTint(instance.root,'Iris',nextMapped.eyeTint);
        currentMapped=nextMapped;setStatus('真实模型 · 改动会直接预览','ready');
      }catch(error){
        if(token!==refreshToken)return;
        instance.clearModel?.();currentMapped=null;setStatus(`预览关闭：${clean(error?.message||error)}`,'pending');
      }
    }

    function queue(delay=DEBOUNCE_MS){
      if(timer)win.clearTimeout(timer);timer=win.setTimeout(refresh,Math.max(0,delay));
    }

    function syncAfterPreset(){Promise.resolve().then(()=>{captureSummary();queue(40);});}

    function onClick(event){
      const eye=event.target?.closest?.('[data-eye-color]');if(eye){shadow||=resetShadow();shadow.eyeColor=eye.dataset.eyeColor;queue(80);return;}
      const choice=event.target?.closest?.('#roleCreatorStudio [data-key]');if(choice){shadow||=resetShadow();shadow[choice.dataset.key]=choice.dataset.value;queue(choice.dataset.key==='expression'?80:DEBOUNCE_MS);return;}
      if(event.target?.closest?.('#roleCreatorStudio [data-preset]')){syncAfterPreset();return;}
    }

    function onInput(event){
      const target=event.target;if(!target)return;
      if(target.dataset?.faceDetail){shadow||=resetShadow();shadow.faceDetails={...(shadow.faceDetails||{}),[target.dataset.faceDetail]:Math.max(-100,Math.min(100,Math.round(Number(target.value)||0)))};queue(180);return;}
      if(target.id==='roleGender'||target.id==='roleAge'){queue(120);return;}
      if(target.dataset?.number||/^rb(Height|Weight|Body|Face|Skin|Hair|Outfit|Relation)$/.test(target.id||'')){queue(220);return;}
      if(target.id==='rolePersonality'&&field('roleBuilder')?.classList?.contains('creator-show-advanced')){shadow=null;queue(320);}
    }

    function onModal(){
      if(!modalOpen(doc)){stop(true);setStatus(isQualified(win)?'打开创作中心后显示实时3D':'本机3D验收通过后显示真实预览',isQualified(win)?'idle':'pending');return;}
      win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>{resetShadow();queue(0);}));
    }

    function install(){
      if(booted)return true;
      if(!studio()||!modal())return false;
      booted=true;ensureHost();
      doc.addEventListener('click',onClick);
      doc.addEventListener('input',onInput);
      doc.addEventListener('change',onInput);
      if(typeof win.MutationObserver==='function'){observer=new win.MutationObserver(onModal);observer.observe(modal(),{attributes:true,attributeFilter:['class']});}
      win.addEventListener('unifiedproductionready',()=>{if(modalOpen(doc)){resetShadow();queue(0);}else setStatus('打开创作中心后显示实时3D','idle');});
      win.addEventListener('unifiedproductionpending',()=>{stop(true);setStatus('本机3D验收通过后显示真实预览','pending');});
      onModal();return true;
    }

    function dispose(){stop(true);observer?.disconnect?.();observer=null;renderer?.dispose?.();renderer=null;field('roleCreator3dPreview')?.remove?.();}

    return Object.freeze({install,dispose,refresh,queue,readRecipe,resetShadow,captureSummary,ensureHost,ensureRenderer,stop,get renderer(){return renderer;},get previewCharacter(){return previewChar;}});
  }

  function boot(win=typeof window!=='undefined'?window:null){
    if(!win?.document)return false;
    if(win.__ROLE_CREATOR_3D_PREVIEW)return true;
    const start=()=>{const controller=createController(win);if(!controller?.install?.())return false;win.__ROLE_CREATOR_3D_PREVIEW=controller;return true;};
    if(start())return true;
    let attempts=0;const retry=()=>{if(start())return;if(++attempts<80)win.setTimeout(retry,80);};retry();return false;
  }

  const api=Object.freeze({PREVIEW_ID,DEBOUNCE_MS,SUMMARY_KEYS,structuralSignature,morphSignature,tintSignature,summaryPatch,moduleRoots,isQualified,modalOpen,createController,boot});
  if(typeof window!=='undefined'){window.RoleCreator3DPreview=api;boot(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
