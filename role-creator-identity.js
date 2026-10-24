(() => {
  'use strict';

  const BLOCK=/【角色自定义设定】\n[\s\S]*?\n【自定义设定结束】/;
  const ALLOWED_GENDERS=new Set(['unspecified','male','female']);
  const GENDER_LABELS=Object.freeze({unspecified:'不指定',male:'男',female:'女'});

  function clampAge(value){const n=Number(value);return Number.isFinite(n)?Math.max(18,Math.min(100,Math.round(n))):24;}
  function normalizeGender(value){return ALLOWED_GENDERS.has(String(value||''))?String(value):'unspecified';}
  function current(doc=typeof document!=='undefined'?document:null){
    const gender=normalizeGender(doc?.getElementById?.('roleGender')?.value);
    const age=clampAge(doc?.getElementById?.('roleAge')?.value);
    return Object.freeze({gender,age,label:`${GENDER_LABELS[gender]} · ${age}岁`});
  }

  function identityLine(identity){
    const gender=normalizeGender(identity?.gender),age=clampAge(identity?.age);
    return `身份：${GENDER_LABELS[gender]}，${age}岁。`;
  }

  function upsertIdentityLine(text,identity){
    const value=String(text||''),match=value.match(BLOCK);if(!match)return value;
    const lines=match[0].split('\n').filter(line=>!line.startsWith('身份：'));
    lines.splice(1,0,identityLine(identity));
    return value.replace(match[0],lines.join('\n'));
  }

  function syncPersonality(doc=typeof document!=='undefined'?document:null,emit=true){
    const personality=doc?.getElementById?.('rolePersonality');if(!personality)return false;
    const next=upsertIdentityLine(personality.value,current(doc));if(next===personality.value)return false;
    personality.value=next;
    if(emit&&typeof Event==='function')personality.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }

  function syncSummary(doc=typeof document!=='undefined'?document:null){
    const summary=doc?.querySelector?.('#roleCreatorStudio .creator-summary');if(!summary)return false;
    const identity=current(doc);let chip=summary.querySelector('#creatorIdentitySummary');
    if(!chip){chip=doc.createElement('span');chip.id='creatorIdentitySummary';chip.dataset.identitySummary='1';summary.prepend(chip);}
    if(chip.textContent!==identity.label)chip.textContent=identity.label;
    return true;
  }

  function install(win=typeof window!=='undefined'?window:null){
    const doc=win?.document,form=doc?.getElementById?.('createRoleForm'),modal=doc?.getElementById?.('createModalOverlay');
    const gender=doc?.getElementById?.('roleGender'),age=doc?.getElementById?.('roleAge');
    if(!doc||!form||!modal||!gender||!age)return false;
    if(form.dataset.identitySync==='1')return true;form.dataset.identitySync='1';
    const onIdentity=()=>{syncPersonality(doc,true);syncSummary(doc);};
    gender.addEventListener('change',onIdentity);age.addEventListener('input',onIdentity);age.addEventListener('change',onIdentity);
    form.addEventListener('submit',()=>{syncPersonality(doc,false);syncSummary(doc);},{capture:true});
    if(typeof win.MutationObserver==='function'){
      let queued=false;
      const observer=new win.MutationObserver(records=>{
        const active=modal.classList.contains('active');if(!active)return;
        const touchesStudio=records.some(record=>record.target?.closest?.('#roleCreatorStudio')||[...(record.addedNodes||[])].some(node=>node?.id==='roleCreatorStudio'||node?.closest?.('#roleCreatorStudio')||node?.querySelector?.('#roleCreatorStudio')));
        if(!touchesStudio||queued)return;queued=true;Promise.resolve().then(()=>{queued=false;syncSummary(doc);});
      });
      observer.observe(modal,{childList:true,subtree:true});win.__ROLE_CREATOR_IDENTITY_OBSERVER=observer;
      const modalObserver=new win.MutationObserver(()=>{if(!modal.classList.contains('active'))return;win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>{syncPersonality(doc,true);syncSummary(doc);}));});
      modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});win.__ROLE_CREATOR_IDENTITY_MODAL_OBSERVER=modalObserver;
    }
    syncPersonality(doc,true);syncSummary(doc);return true;
  }

  const api=Object.freeze({BLOCK,ALLOWED_GENDERS,GENDER_LABELS,clampAge,normalizeGender,current,identityLine,upsertIdentityLine,syncPersonality,syncSummary,install});
  if(typeof window!=='undefined'){window.RoleCreatorIdentity=api;install(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
