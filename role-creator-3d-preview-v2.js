(() => {
  'use strict';

  const PREVIEW_ID='custom_creator_preview';
  const DEBOUNCE_MS=180;
  const BASE_ASSET=Object.freeze({url:'assets/humans/unified/base_body.glb',scale:1,y:0,rotationY:0,framing:'full',minMorphTargets:52});
  const json=value=>JSON.stringify(value??null);

  function structuralSignature(mapped={}){return json({hair:mapped.hair||'',clothing:mapped.clothing||[],accessory:mapped.accessory||'none',expressionMorphs:mapped.expressionMorphs||{}});}
  function morphSignature(mapped={}){return json(mapped.morphs||{});}
  function tintSignature(mapped={}){return json({skin:mapped.skinTint||'',hair:mapped.hairTint||'',clothing:mapped.clothingTint||'',targets:mapped.clothingTintTargets||[],eye:mapped.eyeTint||''});}
  function moduleRoots(mapped={},modules=[]){let index=0;const result={hair:null,clothing:{},complete:true};if(mapped.hair){result.hair=modules[index++]||null;if(!result.hair)result.complete=false;}for(const id of mapped.clothing||[]){const root=modules[index++]||null;result.clothing[id]=root;if(!root)result.complete=false;}if(index!==modules.length)result.complete=false;return result;}
  function modalOpen(doc){return Boolean(doc?.getElementById('createModalOverlay')?.classList?.contains('active'));}

  function createController(win=typeof window!=='undefined'?window:null){
    const doc=win?.document;if(!doc)return null;
    let previewChar=null,timer=0,token=0,observer=null,booted=false,lastSignature='';
    const field=id=>doc.getElementById(id),modal=()=>field('createModalOverlay'),personality=()=>field('rolePersonality');

    function ensureStyle(){
      if(doc.getElementById('creatorSharedFullscreenStyles'))return;
      const style=doc.createElement('style');style.id='creatorSharedFullscreenStyles';
      style.textContent=`
        #roleCreator3dPreview{display:none!important}
        body.creator-fullscreen-3d .chat-header,
        body.creator-fullscreen-3d .messages-container,
        body.creator-fullscreen-3d .input-container{visibility:hidden!important;pointer-events:none!important}
        #createModalOverlay.active{background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;pointer-events:none!important}
        #createModalOverlay.active>.modal{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;overflow:hidden!important;pointer-events:none!important}
        #createModalOverlay.active .modal-header{position:absolute!important;top:0!important;left:0!important;right:0!important;z-index:60!important;min-height:62px!important;padding:calc(10px + env(safe-area-inset-top)) 16px 10px!important;border:0!important;background:rgba(255,255,255,.82)!important;-webkit-backdrop-filter:blur(14px) saturate(1.12);backdrop-filter:blur(14px) saturate(1.12);pointer-events:auto!important}
        #createModalOverlay.active #createRoleForm{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:60!important;width:100%!important;max-height:min(48dvh,520px)!important;margin:0!important;padding:10px 12px calc(12px + env(safe-area-inset-bottom))!important;border:0!important;border-radius:0!important;background:rgba(255,255,255,.84)!important;-webkit-backdrop-filter:blur(16px) saturate(1.12);backdrop-filter:blur(16px) saturate(1.12);overflow:auto!important;overscroll-behavior:contain;pointer-events:auto!important}
        #createModalOverlay.active #roleCreatorStudio{display:block!important;width:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
        #createModalOverlay.active .cw-nav{bottom:calc(-12px - env(safe-area-inset-bottom))!important}
        @media(max-width:560px){#createModalOverlay.active #createRoleForm{max-height:46dvh!important;padding-left:10px!important;padding-right:10px!important}}
      `;
      doc.head.appendChild(style);
    }

    function readRecipe(){
      const visual=win.RoleVisualRecipe;if(!visual?.sanitize)return null;
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

    async function refresh(force=false){
      timer=0;if(!modalOpen(doc))return false;
      const renderer=primaryRenderer(),recipe=readRecipe();
      if(!renderer||!recipe)return false;
      const mapped=win.RoleUnifiedHumanRecipe?.mapRecipe?.(recipe)||recipe;
      const signature=json({baseId:recipe.baseId||'',structural:structuralSignature(mapped),morph:morphSignature(mapped),tint:tintSignature(mapped),action:recipe.action||'',expression:recipe.expression||''});
      if(!force&&signature===lastSignature&&renderer.currentId===PREVIEW_ID){renderer.loop?.start?.();return true;}
      const current=++token,char=makeCharacter(recipe);
      try{
        const ok=await renderer.loadCharacter(char);
        if(current!==token||!modalOpen(doc))return false;
        if(!ok||!renderer.root)throw new Error('3D人物加载失败');
        lastSignature=signature;
        renderer.frameModel?.(renderer.root,'full');renderer.resize?.();renderer.loop?.start?.();
        return true;
      }catch(error){console.warn('创建器复用全屏3D舞台失败。',error);return false;}
    }

    function queue(delay=DEBOUNCE_MS){if(timer)win.clearTimeout(timer);timer=win.setTimeout(()=>refresh(false),Math.max(0,delay));}
    function stopAndRestore(){if(timer){win.clearTimeout(timer);timer=0;}token++;lastSignature='';previewChar=null;doc.body.classList.remove('creator-fullscreen-3d');win.requestAnimationFrame(()=>{const renderer=primaryRenderer();renderer?.syncCharacter?.();renderer?.resize?.();});}
    function onModal(){if(modalOpen(doc)){ensureStyle();doc.body.classList.add('creator-fullscreen-3d');win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>refresh(true)));}else stopAndRestore();}

    function install(){
      if(booted)return true;if(!modal())return false;booted=true;ensureStyle();field('roleCreator3dPreview')?.remove?.();
      doc.addEventListener('click',event=>{if(event.target?.closest?.('#roleCreatorStudio'))queue(80);});
      doc.addEventListener('input',event=>{if(event.target?.closest?.('#createModalOverlay'))queue(140);});
      doc.addEventListener('change',event=>{if(event.target?.closest?.('#createModalOverlay'))queue(100);});
      win.addEventListener('rolecreatorstep',()=>queue(80));win.addEventListener('rolecreatorpage',()=>queue(80));
      if(typeof win.MutationObserver==='function'){observer=new win.MutationObserver(onModal);observer.observe(modal(),{attributes:true,attributeFilter:['class']});}
      onModal();return true;
    }

    function dispose(){if(timer)win.clearTimeout(timer);observer?.disconnect?.();observer=null;stopAndRestore();}
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