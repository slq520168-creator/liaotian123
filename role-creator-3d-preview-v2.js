(() => {
  'use strict';

  const PREVIEW_ID='custom_creator_preview';
  const DEBOUNCE_MS=180;
  const BASE_ASSET=Object.freeze({url:'assets/humans/unified/base_body.glb',scale:1,y:0,rotationY:0,framing:'full',minMorphTargets:52});
  const json=value=>JSON.stringify(value??null);

  function structuralSignature(mapped={}){return json({hair:mapped.hair||'',hairStyle:mapped.hairStyle||'',hairWave:mapped.hairWave||0,clothing:mapped.clothing||[],accessory:mapped.accessory||'none',expressionMorphs:mapped.expressionMorphs||{}});}
  function morphSignature(mapped={}){return json(mapped.morphs||{});}
  function tintSignature(mapped={}){return json({skin:mapped.skinTint||'',hair:mapped.hairTint||'',clothing:mapped.clothingTint||'',targets:mapped.clothingTintTargets||[],eye:mapped.eyeTint||'',eyeRight:mapped.eyeTintRight||'',eyeGlow:mapped.eyeGlow||false});}
  function moduleRoots(mapped={},modules=[]){let index=0;const result={hair:null,clothing:{},complete:true};if(mapped.hair){result.hair=modules[index++]||null;if(!result.hair)result.complete=false;}for(const id of mapped.clothing||[]){const root=modules[index++]||null;result.clothing[id]=root;if(!root)result.complete=false;}if(index!==modules.length)result.complete=false;return result;}
  function modalOpen(doc){return Boolean(doc?.getElementById('createModalOverlay')?.classList?.contains('active'));}

  function createController(win=typeof window!=='undefined'?window:null){
    const doc=win?.document;if(!doc)return null;
    let previewChar=null,timer=0,token=0,observer=null,layoutObserver=null,booted=false,lastSignature='';
    const field=id=>doc.getElementById(id),modal=()=>field('createModalOverlay'),personality=()=>field('rolePersonality');

    function ensureStyle(){
      if(doc.getElementById('creatorSharedFullscreenStyles'))return;
      const style=doc.createElement('style');style.id='creatorSharedFullscreenStyles';
      style.textContent=`
        #roleCreator3dPreview{display:none!important}
        body.creator-fullscreen-3d .sidebar{visibility:hidden!important}
        body.creator-fullscreen-3d .chat-header,
        body.creator-fullscreen-3d .messages-container,
        body.creator-fullscreen-3d .input-container{visibility:hidden!important;pointer-events:none!important}
        #createModalOverlay.active{background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;pointer-events:none!important}
        #createModalOverlay.active>.modal{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;overflow:hidden!important;pointer-events:none!important}
        #createModalOverlay.active .modal-header{position:absolute!important;top:0!important;left:0!important;right:0!important;z-index:60!important;min-height:62px!important;padding:calc(10px + env(safe-area-inset-top)) 16px 10px!important;border:0!important;background:rgba(255,255,255,.82)!important;-webkit-backdrop-filter:blur(14px) saturate(1.12);backdrop-filter:blur(14px) saturate(1.12);pointer-events:auto!important}
        #createModalOverlay.active #createRoleForm{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:60!important;width:100%!important;max-height:min(48dvh,520px)!important;margin:0!important;padding:10px 12px calc(12px + env(safe-area-inset-bottom))!important;border:0!important;border-radius:0!important;background:rgba(255,255,255,.84)!important;-webkit-backdrop-filter:blur(16px) saturate(1.12);backdrop-filter:blur(16px) saturate(1.12);overflow:auto!important;overscroll-behavior:contain;pointer-events:auto!important}
        #createModalOverlay.active #roleCreatorStudio{display:block!important;width:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
        #createModalOverlay.active>.modal>#roleHumanStage{display:block!important;position:absolute!important;top:var(--creator-header-height,62px)!important;left:0!important;right:0!important;bottom:var(--creator-panel-height,46dvh)!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;border:0!important;margin:0!important;pointer-events:auto!important;z-index:1!important}
        #createModalOverlay.active #roleHumanStage .role-human-status{left:12px!important;right:12px!important;bottom:12px!important;transform:none!important;white-space:normal;line-height:1.5;border-radius:10px}
        #roleHumanStage>.role-stage-control-surface.creator{position:absolute!important;inset:0!important;height:100%!important;z-index:6}
        #creator3dFeedback{font-size:12px;line-height:1.5;color:#8d294c;margin:0 0 8px}
        #createModalOverlay.active .cw-nav{bottom:calc(-12px - env(safe-area-inset-bottom))!important}
        @media(max-width:560px){#createModalOverlay.active #createRoleForm{max-height:46dvh!important;padding-left:10px!important;padding-right:10px!important}}
      `;
      doc.head.appendChild(style);
    }

    function readRecipe(){
      const visual=win.RoleVisualRecipe;if(!visual?.sanitize)return null;
      if(win.RoleCreatorWizard?.readRecipe)return win.RoleCreatorWizard.readRecipe();
      const parsed=visual.fromPersonality?.(personality()?.value)||{};
      const draft=(()=>{try{return JSON.parse(win.localStorage?.getItem('liaotian_3d_creator_draft_v2')||'null')||{};}catch{return {};}})();
      const source={...parsed,...draft,
        gender:field('roleGender')?.value||draft.gender||parsed.gender,
        age:field('roleAge')?.value||draft.age||parsed.age,
        heightCm:field('rbHeight')?.value??draft.heightCm??parsed.heightCm,
        weightJin:field('rbWeight')?.value??draft.weightJin??parsed.weightJin,
        body:field('rbBody')?.value||draft.body||parsed.body,
        face:field('rbFace')?.value||draft.face||parsed.face,
        skin:field('rbSkin')?.value||draft.skin||parsed.skin,
        hair:field('rbHair')?.value||draft.hair||parsed.hair,
        outfit:field('rbOutfit')?.value||draft.outfit||parsed.outfit,
        relationship:field('rbRelation')?.value||draft.relationship||parsed.relationship
      };
      return typeof visual.lockBase==='function'?visual.lockBase(source):visual.sanitize(source);
    }

    function makeCharacter(recipe){
      if(!previewChar)previewChar={id:PREVIEW_ID,name:'创建中的3D角色',isPreset:false,roleKind:'3d',personality:'',humanAsset:{...BASE_ASSET},visualRecipe:recipe};
      previewChar.personality=personality()?.value||'';
      previewChar.visualRecipe=recipe;
      previewChar.gender=recipe?.gender||'female';
      previewChar.age=recipe?.age||24;
      previewChar.humanAsset={...BASE_ASSET};
      return previewChar;
    }

    function primaryRenderer(){return win.__ROLE_HUMAN_RENDERER||null;}

    function mountSharedStage(){
      if(!modalOpen(doc))return;
      const renderer=primaryRenderer(),host=modal()?.querySelector('.modal'),form=field('createRoleForm'),header=host?.querySelector('.modal-header');
      if(!renderer||!host||!form)return;
      const stage=renderer.ensureStage?.();
      if(stage&&stage.parentElement!==host)host.insertBefore(stage,form);
      const surface=win.RoleStageControls?.stateFor?.(renderer)?.surface;
      if(stage&&surface){if(surface.parentElement!==stage)stage.appendChild(surface);surface.classList.add('creator');}
      host.style.setProperty('--creator-panel-height',`${form.getBoundingClientRect().height}px`);
      host.style.setProperty('--creator-header-height',`${header?.getBoundingClientRect().height||62}px`);
      renderer.resize?.();if(renderer.root)renderer.frameModel?.(renderer.root,'full');
    }

    function feedback(message=''){
      const form=field('createRoleForm');if(!form)return;
      let status=field('creator3dFeedback');
      if(!status){status=doc.createElement('p');status.id='creator3dFeedback';status.setAttribute('role','status');form.prepend(status);}
      status.textContent=message;status.hidden=!message;
    }

    async function refresh(force=false){
      if(timer)win.clearTimeout(timer);timer=0;if(!modalOpen(doc))return false;
      const renderer=primaryRenderer(),recipe=readRecipe();
      if(!renderer||!recipe)return false;
      if(renderer.contextLost){feedback('3D画面正在恢复，请恢复后再继续');return false;}
      if(!win.RoleUnifiedCustomChat){feedback(win.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT?.error||'正在准备3D人物资源…');return false;}
      mountSharedStage();
      const mapped=win.RoleUnifiedHumanRecipe?.mapRecipe?.(recipe)||recipe;
      const signature=json({baseId:recipe.baseId||'',structural:structuralSignature(mapped),morph:morphSignature(mapped),tint:tintSignature(mapped),action:recipe.action||'',expression:recipe.expression||'',voiceStyle:recipe.voiceStyle||'',personality:recipe.personality||[]});
      const char=makeCharacter(recipe);
      if(signature===lastSignature&&renderer.currentId===PREVIEW_ID){renderer.loop?.start?.();return true;}
      const current=++token;
      feedback(renderer.root?'':'正在加载3D模型…');
      try{
        const ok=await renderer.loadCharacter(char);
        if(current!==token||!modalOpen(doc))return false;
        if(!ok||!renderer.root||!renderer.__unifiedCustomKey)throw new Error(renderer.status?.textContent||'3D人物组合失败，请重新选择后重试');
        lastSignature=signature;
        mountSharedStage();renderer.frameModel?.(renderer.root,'full');renderer.resize?.();renderer.renderFrame?.(win.RolePresence?.getDefault?.()?.frame?.()||{});renderer.loop?.start?.();feedback('');
        return true;
      }catch(error){if(current===token)feedback(error?.message||'3D人物组合失败');console.warn('创建器复用全屏3D舞台失败。',error);return false;}
    }

    function queue(delay=DEBOUNCE_MS){if(timer)win.clearTimeout(timer);timer=win.setTimeout(()=>refresh(false),Math.max(0,delay));}
    function stopAndRestore(){if(timer){win.clearTimeout(timer);timer=0;}token++;lastSignature='';previewChar=null;doc.body.classList.remove('creator-fullscreen-3d');const renderer=primaryRenderer();renderer?.cancelPendingLoad?.();win.RoleUnifiedCustomChat?.nextLoadToken?.(renderer);const surface=win.RoleStageControls?.stateFor?.(renderer)?.surface,main=doc.querySelector('.chat-main');if(surface&&main){surface.classList.remove('creator');main.appendChild(surface);}win.RoleFullscreenStage?.mountStage?.(renderer,doc);win.requestAnimationFrame(()=>{renderer?.syncCharacter?.();renderer?.resize?.();});}
    function onModal(){if(modalOpen(doc)){ensureStyle();doc.body.classList.add('creator-fullscreen-3d');mountSharedStage();win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>refresh(true)));}else stopAndRestore();}

    function install(){
      if(booted)return true;if(!modal())return false;booted=true;ensureStyle();field('roleCreator3dPreview')?.remove?.();
      doc.addEventListener('click',event=>{if(event.target?.closest?.('#roleCreatorStudio')&&!event.target?.closest?.('#cwCreate,#cwVoicePreview'))queue(80);});
      doc.addEventListener('input',event=>{if(event.target?.closest?.('#createModalOverlay'))queue(140);});
      doc.addEventListener('change',event=>{if(event.target?.closest?.('#createModalOverlay'))queue(100);});
      win.addEventListener('rolecreatorstep',()=>queue(80));win.addEventListener('rolecreatorpage',()=>queue(80));
      win.addEventListener('baserecipeready',()=>{if(modalOpen(doc))queue(0);});
      if(typeof win.MutationObserver==='function'){observer=new win.MutationObserver(onModal);observer.observe(modal(),{attributes:true,attributeFilter:['class']});}
      if(typeof win.ResizeObserver==='function'){layoutObserver=new win.ResizeObserver(mountSharedStage);for(const node of [field('createRoleForm'),modal()?.querySelector('.modal-header')])if(node)layoutObserver.observe(node);}
      onModal();return true;
    }

    function dispose(){if(timer)win.clearTimeout(timer);observer?.disconnect?.();observer=null;layoutObserver?.disconnect?.();layoutObserver=null;stopAndRestore();}
    return Object.freeze({install,dispose,refresh,queue,readRecipe,primaryRenderer,get previewCharacter(){return previewChar;}});
  }

  function boot(win=typeof window!=='undefined'?window:null){
    if(!win?.document)return false;if(win.__ROLE_CREATOR_3D_PREVIEW)return true;
    const start=()=>{if(!win.__ROLE_HUMAN_RENDERER||!win.RoleVisualRecipe)return false;const controller=createController(win);if(!controller?.install?.())return false;win.__ROLE_CREATOR_3D_PREVIEW=controller;return true;};
    if(start())return true;let attempts=0;const retry=()=>{if(start())return;if(++attempts<100)win.setTimeout(retry,80);};retry();return false;
  }

  const api=Object.freeze({PREVIEW_ID,DEBOUNCE_MS,BASE_ASSET,structuralSignature,morphSignature,tintSignature,moduleRoots,modalOpen,createController,boot});
  if(typeof window!=='undefined'){window.RoleCreator3DPreview=api;boot(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
