(() => {
  'use strict';

  const BODY_DETAILS=Object.freeze({chestSize:'胸部体积',chestFirmness:'胸部紧实度',chestHeight:'胸部位置',chestSpacing:'胸部间距',chestProjection:'胸部突出度'});
  const DIRECTIONS=Object.freeze({
    chestSize:Object.freeze(['更小','更大']),
    chestFirmness:Object.freeze(['更柔软','更紧实']),
    chestHeight:Object.freeze(['更低','更高']),
    chestSpacing:Object.freeze(['更近','更开']),
    chestProjection:Object.freeze(['更平缓','更突出'])
  });
  const DEFAULT_BODY_DETAILS=Object.freeze(Object.fromEntries(Object.keys(BODY_DETAILS).map(key=>[key,0])));
  const BLOCK=/【角色自定义设定】\n[\s\S]*?\n【自定义设定结束】/;
  const clamp=value=>Math.max(-100,Math.min(100,Math.round(Number(value)||0)));
  const normalize=value=>Object.freeze(Object.fromEntries(Object.keys(BODY_DETAILS).map(key=>[key,clamp(value?.[key])])));
  const signed=value=>{const n=clamp(value);return n>0?`+${n}`:String(n);};

  function parseBodyDetails(text){
    const line=String(text||'').match(/(?:^|\n)身体细节：([^。\n]*)。(?:\n|$)/)?.[1]||'';
    const out={};
    for(const[key,label]of Object.entries(BODY_DETAILS)){
      const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const match=line.match(new RegExp(`${escaped}([+-]?\\d{1,3})`));
      if(match)out[key]=clamp(match[1]);
    }
    return normalize(out);
  }

  function bodyDetailLine(details){const clean=normalize(details);return `身体细节：${Object.entries(BODY_DETAILS).map(([key,label])=>`${label}${signed(clean[key])}`).join('，')}。`;}

  function upsertBodyDetails(text,details){
    const value=String(text||''),match=value.match(BLOCK);if(!match)return value;
    const lines=match[0].split('\n').filter(line=>!line.startsWith('身体细节：'));
    let index=lines.findIndex(line=>line.startsWith('脸部细节：'));
    if(index<0)index=lines.findIndex(line=>line.startsWith('外形：'));
    index=Math.max(1,index+1);
    lines.splice(index,0,bodyDetailLine(details));
    return value.replace(match[0],lines.join('\n'));
  }

  function current(personality,win=typeof window!=='undefined'?window:null){
    const explicit=win?.__ROLE_CREATOR_BODY_DETAILS;
    return normalize(explicit&&typeof explicit==='object'?explicit:parseBodyDetails(personality?.value));
  }

  function syncCreatorLine(personality,win=typeof window!=='undefined'?window:null){
    if(!personality)return false;
    const next=upsertBodyDetails(personality.value,current(personality,win));
    if(next===personality.value)return false;
    personality.value=next;personality.dispatchEvent?.(new Event('input',{bubbles:true}));return true;
  }

  function renderSection(win=typeof window!=='undefined'?window:null){
    const doc=win?.document,studio=doc?.getElementById('roleCreatorStudio'),personality=doc?.getElementById('rolePersonality');
    if(!studio||!personality)return false;
    const body=studio.querySelector('#creatorBody'),active=studio.querySelector('.creator-tab.active[data-tab="body"]');
    if(!active||!body)return false;
    let section=body.querySelector('#creatorBodyDetailsSection');
    if(section)return true;
    section=doc.createElement('section');section.id='creatorBodyDetailsSection';section.dataset.realMorphControls='breast_cup,breast_firm,bdet_breast_height,bdet_breast_dist,bdet_breast_point';
    const title=doc.createElement('h4');title.textContent='身体精调';
    const note=doc.createElement('div');note.className='creator-note';note.textContent='真实胸部 morph；体积、紧实度、位置、间距和突出度都会同步作用到身体和当前服装。0 = 基础人体。';note.style.margin='7px 0';
    const sliders=doc.createElement('div');sliders.className='creator-sliders';
    const selected=current(personality,win);
    for(const[key,label]of Object.entries(BODY_DETAILS)){
      const value=selected[key]||0,dirs=DIRECTIONS[key];
      const row=doc.createElement('div');row.className='creator-slider';
      const name=doc.createElement('label');name.textContent=label;
      const input=doc.createElement('input');input.type='range';input.min='-100';input.max='100';input.step='5';input.value=String(value);input.dataset.bodyDetail=key;input.setAttribute('aria-label',label);
      const output=doc.createElement('output');output.dataset.bodyDetailOutput=key;output.textContent=signed(value);
      const small=doc.createElement('small');const left=doc.createElement('span'),right=doc.createElement('span');left.textContent=dirs[0];right.textContent=dirs[1];small.append(left,right);
      row.append(name,input,output,small);sliders.appendChild(row);
    }
    section.append(title,note,sliders);
    const faceHeading=[...body.querySelectorAll('h4')].find(node=>node.textContent==='脸型');
    if(faceHeading)body.insertBefore(section,faceHeading);else body.appendChild(section);
    return true;
  }

  function install(win=typeof window!=='undefined'?window:null){
    const doc=win?.document,studio=doc?.getElementById('roleCreatorStudio'),personality=doc?.getElementById('rolePersonality'),form=doc?.getElementById('createRoleForm'),modal=doc?.getElementById('createModalOverlay');
    if(!doc||!studio||!personality||!form||!modal)return false;
    if(win.__ROLE_BODY_DETAILS_INSTALLED)return true;
    win.__ROLE_BODY_DETAILS_INSTALLED=true;
    win.__ROLE_CREATOR_BODY_DETAILS={...parseBodyDetails(personality.value)};

    const refresh=()=>renderSection(win);
    studio.addEventListener('input',event=>{
      const key=event.target?.dataset?.bodyDetail;if(!BODY_DETAILS[key])return;
      const next={...current(personality,win),[key]:clamp(event.target.value)};win.__ROLE_CREATOR_BODY_DETAILS=next;
      const output=studio.querySelector(`[data-body-detail-output="${key}"]`);if(output)output.textContent=signed(next[key]);
      syncCreatorLine(personality,win);win.__ROLE_CREATOR_3D_PREVIEW?.resetShadow?.();win.__ROLE_CREATOR_3D_PREVIEW?.queue?.(180);
    });
    doc.addEventListener('click',event=>{
      if(event.target?.closest?.('#roleCreatorStudio [data-preset]')){win.__ROLE_CREATOR_BODY_DETAILS={...DEFAULT_BODY_DETAILS};Promise.resolve().then(()=>{syncCreatorLine(personality,win);refresh();win.__ROLE_CREATOR_3D_PREVIEW?.resetShadow?.();win.__ROLE_CREATOR_3D_PREVIEW?.queue?.(40);});return;}
      if(event.target?.closest?.('#creatorApply')){Promise.resolve().then(()=>syncCreatorLine(personality,win));}
    });
    form.addEventListener('submit',()=>syncCreatorLine(personality,win),true);

    if(typeof win.MutationObserver==='function'){
      let queued=false;
      const observer=new win.MutationObserver(()=>{if(queued)return;queued=true;Promise.resolve().then(()=>{queued=false;refresh();});});
      observer.observe(studio,{childList:true,subtree:true});win.__ROLE_BODY_DETAILS_OBSERVER=observer;
      const modalObserver=new win.MutationObserver(()=>{
        if(modal.classList.contains('active')){win.__ROLE_CREATOR_BODY_DETAILS={...parseBodyDetails(personality.value)};Promise.resolve().then(refresh);}
        else win.__ROLE_CREATOR_BODY_DETAILS=null;
      });
      modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});win.__ROLE_BODY_DETAILS_MODAL_OBSERVER=modalObserver;
    }
    refresh();return true;
  }

  const api=Object.freeze({BODY_DETAILS,DIRECTIONS,DEFAULT_BODY_DETAILS,normalize,parseBodyDetails,bodyDetailLine,upsertBodyDetails,current,syncCreatorLine,renderSection,install});
  if(typeof window!=='undefined'){window.RoleBodyDetails=api;install(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
