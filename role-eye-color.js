(() => {
  'use strict';

  const DEFAULT_EYE_COLOR='深棕';
  const EYE_TINTS=Object.freeze({
    '深棕':'#3b2a20','浅棕':'#6b4a2f','琥珀':'#8a5a23','灰蓝':'#5c7086','深蓝':'#344d6f','墨绿':'#3e5a48','黑色':'#18151b','红色':'#a02b45','金色':'#bd913b','绿色':'#3e8659','蓝色':'#4779c1','紫色':'#7953a5'
  });
  const EYE_OPTIONS=Object.freeze(Object.keys(EYE_TINTS));
  const BLOCK=/【角色自定义设定】\n[\s\S]*?\n【自定义设定结束】/;

  function normalizeEyeColor(value){return EYE_OPTIONS.includes(value)?value:DEFAULT_EYE_COLOR;}

  function parseEyeColor(text){
    const match=String(text||'').match(/(?:^|\n)眼睛颜色：([^。\n]+)。(?:\n|$)/);
    return normalizeEyeColor(match?.[1]?.trim());
  }

  function upsertEyeColor(text,color){
    const value=String(text||''),match=value.match(BLOCK);if(!match)return value;
    const chosen=normalizeEyeColor(color);
    const lines=match[0].split('\n').filter(line=>!line.startsWith('眼睛颜色：'));
    let index=lines.findIndex(line=>line.startsWith('脸部细节：'));
    if(index<0)index=lines.findIndex(line=>line.startsWith('外形：'));
    index=Math.max(1,index+1);
    lines.splice(index,0,`眼睛颜色：${chosen}。`);
    return value.replace(match[0],lines.join('\n'));
  }

  function extendVisualApi(base){
    if(!base?.sanitize)return base;
    const options=Object.freeze({...base.OPTIONS,eyeColor:EYE_OPTIONS});
    const defaults=Object.freeze({...base.DEFAULTS,eyeColor:DEFAULT_EYE_COLOR});
    const sanitize=input=>{
      const source=input&&typeof input==='object'?input:{};
      const clean=base.sanitize(source);
      return Object.freeze({...clean,eyeColor:normalizeEyeColor(source.eyeColor??clean.eyeColor)});
    };
    const fromPersonality=text=>{
      const clean=base.fromPersonality?.(text);if(!clean)return null;
      return sanitize({...clean,eyeColor:parseEyeColor(text)});
    };
    const withCharacterIdentity=(char,recipe)=>{
      const source=recipe&&typeof recipe==='object'?recipe:{};
      const clean=base.withCharacterIdentity?.(char,source)||base.sanitize(source);
      return sanitize({...clean,eyeColor:source.eyeColor??clean.eyeColor??parseEyeColor(char?.personality)});
    };
    const forCharacter=char=>{
      if(!char||typeof char!=='object')return sanitize();
      if(char.visualRecipe&&typeof char.visualRecipe==='object')return withCharacterIdentity(char,char.visualRecipe);
      return withCharacterIdentity(char,fromPersonality(char.personality)||{});
    };
    return Object.freeze({...base,OPTIONS:options,DEFAULTS:defaults,sanitize,fromPersonality,withCharacterIdentity,forCharacter});
  }

  function extendUnifiedApi(base){
    if(!base?.mapRecipe)return base;
    const mapRecipe=recipe=>Object.freeze({...base.mapRecipe(recipe),eyeTint:EYE_TINTS[normalizeEyeColor(recipe?.eyeColor)]});
    return Object.freeze({...base,EYE_TINTS,mapRecipe});
  }

  function tintNamedMaterial(root,name,hex){
    if(!root?.traverse||!name||!hex)return 0;
    const seen=new Set();let changed=0;
    root.traverse(node=>{
      const materials=Array.isArray(node?.material)?node.material:(node?.material?[node.material]:[]);
      for(const material of materials){
        if(!material||seen.has(material)||String(material.name||'')!==name||!material.color?.set)continue;
        seen.add(material);
        try{material.color.set(hex);material.needsUpdate=true;changed++;}catch{}
      }
    });
    return changed;
  }

  function requireNamedMaterialTint(root,name,hex){
    if(!hex)return 0;
    const changed=tintNamedMaterial(root,name,hex);
    if(changed<1)throw new Error(`${name} tint material unavailable`);
    return changed;
  }

  function installNormalizer(visualApi){
    if(typeof normalizeCustomCharacter!=='function'||normalizeCustomCharacter.__eyeColor)return false;
    const base=normalizeCustomCharacter;
    const wrapped=function(value){
      const char=base.call(this,value);if(!char||char.isPreset)return char;
      const supplied=value?.visualRecipe&&typeof value.visualRecipe==='object'?value.visualRecipe:null;
      const parsed=supplied||visualApi.fromPersonality(char.personality)||char.visualRecipe||{};
      char.visualRecipe=visualApi.withCharacterIdentity(char,parsed);return char;
    };
    wrapped.__eyeColor=true;normalizeCustomCharacter=wrapped;return true;
  }

  function migrateLoaded(visualApi){
    if(typeof characters==='undefined'||!Array.isArray(characters))return 0;
    let changed=0;
    for(const char of characters){
      if(!char||char.isPreset)continue;
      const next=visualApi.forCharacter(char);
      if(JSON.stringify(char.visualRecipe||null)===JSON.stringify(next))continue;
      char.visualRecipe=next;changed++;
    }
    if(changed&&typeof saveDataToStorage==='function')saveDataToStorage();
    return changed;
  }

  function currentCreatorColor(personality){
    const explicit=typeof window!=='undefined'?window.__ROLE_CREATOR_EYE_COLOR:'';
    return normalizeEyeColor(explicit||parseEyeColor(personality?.value));
  }

  function syncCreatorLine(personality){
    if(!personality)return false;
    const next=upsertEyeColor(personality.value,currentCreatorColor(personality));
    if(next===personality.value)return false;
    personality.value=next;personality.dispatchEvent?.(new Event('input',{bubbles:true}));return true;
  }

  function ensureCreatorUi(win=typeof window!=='undefined'?window:null){
    const doc=win?.document,studio=doc?.getElementById('roleCreatorStudio'),personality=doc?.getElementById('rolePersonality');
    if(!studio||!personality)return false;
    const active=studio.querySelector('.creator-tab.active[data-tab="body"]');
    if(active&&!studio.querySelector('#creatorEyeColorSection')){
      const body=studio.querySelector('#creatorBody');
      if(body){
        const section=doc.createElement('section');section.id='creatorEyeColorSection';
        const title=doc.createElement('h4');title.textContent='眼睛颜色';
        const grid=doc.createElement('div');grid.className='creator-grid';
        const selected=currentCreatorColor(personality);
        for(const color of EYE_OPTIONS){
          const button=doc.createElement('button');button.type='button';button.className=`creator-card${selected===color?' selected':''}`;button.dataset.eyeColor=color;
          const label=doc.createElement('b');label.textContent=color;
          const hint=doc.createElement('small');hint.textContent='只染 Iris 虹膜材质';
          button.append(label,hint);grid.appendChild(button);
        }
        section.append(title,grid);body.appendChild(section);
      }
    }
    const summary=studio.querySelector('.creator-summary');
    if(summary&&!summary.querySelector('[data-eye-color-summary]')){
      const chip=doc.createElement('span');chip.dataset.eyeColorSummary='1';chip.textContent=`眼睛 ${currentCreatorColor(personality)}`;summary.appendChild(chip);
    }
    return true;
  }

  function installCreatorUi(win=typeof window!=='undefined'?window:null){
    const doc=win?.document;if(!doc)return false;
    const personality=doc.getElementById('rolePersonality'),form=doc.getElementById('createRoleForm');
    doc.addEventListener('click',event=>{
      const button=event.target?.closest?.('[data-eye-color]');if(!button)return;
      const color=normalizeEyeColor(button.dataset.eyeColor);win.__ROLE_CREATOR_EYE_COLOR=color;
      if(personality){personality.value=upsertEyeColor(personality.value,color);personality.dispatchEvent(new Event('input',{bubbles:true}));}
      const studio=doc.getElementById('roleCreatorStudio');
      studio?.querySelectorAll?.('[data-eye-color]')?.forEach?.(item=>item.classList.toggle('selected',item.dataset.eyeColor===color));
      const chip=studio?.querySelector?.('[data-eye-color-summary]');if(chip)chip.textContent=`眼睛 ${color}`;
    });
    if(form){
      form.addEventListener('submit',()=>syncCreatorLine(personality),true);
      form.addEventListener('submit',()=>syncCreatorLine(personality));
    }
    if(typeof win.MutationObserver==='function'){
      let queued=false;
      const observer=new win.MutationObserver(()=>{if(queued)return;queued=true;Promise.resolve().then(()=>{queued=false;ensureCreatorUi(win);});});
      observer.observe(doc.body,{childList:true,subtree:true});win.__ROLE_EYE_COLOR_OBSERVER=observer;
    }
    ensureCreatorUi(win);return true;
  }

  function patchRenderer(win=typeof window!=='undefined'?window:null){
    const proto=win?.RoleHumanRenderer?.HumanRenderer?.prototype;
    if(!proto?.loadCharacter||proto.loadCharacter.__eyeColorTint)return false;
    const base=proto.loadCharacter;
    const wrapped=async function(...args){
      const ok=await base.apply(this,args);if(!ok||!this.root)return ok;
      const char=args[0]||this.currentCharacter?.();
      if(!char||char.isPreset||char.humanAssetId!=='unified-charactercreator')return ok;
      const recipe=win.RoleVisualRecipe?.forCharacter?.(char)||char.visualRecipe||{};
      const mapped=win.RoleUnifiedHumanRecipe?.mapRecipe?.(recipe)||{};
      try{
        const changed=requireNamedMaterialTint(this.root,'Iris',mapped.eyeTint);
        this.__irisTintApplied=changed>0;
      }catch(error){
        this.__irisTintApplied=false;
        console.warn('Iris 材质不存在，统一3D保持关闭。',error);
        this.clearModel?.();
        return false;
      }
      return ok;
    };
    wrapped.__eyeColorTint=true;proto.loadCharacter=wrapped;return true;
  }

  function boot(win=typeof window!=='undefined'?window:null){
    if(!win?.RoleVisualRecipe||!win?.RoleUnifiedHumanRecipe)return false;
    const visual=extendVisualApi(win.RoleVisualRecipe),unified=extendUnifiedApi(win.RoleUnifiedHumanRecipe);
    win.RoleVisualRecipe=visual;win.RoleUnifiedHumanRecipe=unified;
    installNormalizer(visual);migrateLoaded(visual);installCreatorUi(win);
    win.addEventListener('unifiedproductionready',()=>{patchRenderer(win);win.__ROLE_HUMAN_RENDERER?.syncCharacter?.();});
    if(win.RoleUnifiedCustomChat)patchRenderer(win);
    return true;
  }

  const api=Object.freeze({DEFAULT_EYE_COLOR,EYE_TINTS,EYE_OPTIONS,normalizeEyeColor,parseEyeColor,upsertEyeColor,extendVisualApi,extendUnifiedApi,tintNamedMaterial,requireNamedMaterialTint,currentCreatorColor,syncCreatorLine,ensureCreatorUi,installCreatorUi,patchRenderer,boot});
  if(typeof window!=='undefined'){window.RoleEyeColor=api;boot(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
