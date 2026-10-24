(() => {
  'use strict';
  const RETURN_KEY='liaotian_unified_mobile_qa_return';

  function safeReturnTarget(locationLike,storage){
    const href=String(locationLike?.href||'');
    const origin=String(locationLike?.origin||'');
    if(!href||!origin)return'';
    let raw='';
    try{raw=String(storage?.getItem?.(RETURN_KEY)||'');}catch{}
    try{
      const target=new URL(raw||'../index.html',href);
      return target.origin===origin?target.href:'';
    }catch{return'';}
  }

  function shouldReturn(locationLike){
    try{return new URL(locationLike?.href||'',locationLike?.href||undefined).searchParams.get('return')==='1';}catch{return false;}
  }

  function readResult(win){
    if(win?.__UNIFIED_MOBILE_QA_RESULT)return win.__UNIFIED_MOBILE_QA_RESULT;
    return win?.RoleMobileQaDiagnostics?.read?.(win.sessionStorage)||null;
  }

  function showFailure(win){
    if(win?.document?.body?.dataset?.state!=='fail')return false;
    const result=readResult(win),summary=win.RoleMobileQaDiagnostics?.summary?.(result,4)||'';
    if(!summary)return false;
    const status=win.document.getElementById('status');
    if(status)status.textContent=`本机3D验收未通过：${summary}`;
    return true;
  }

  function beginAutoReturn(win=typeof window!=='undefined'?window:null){
    if(!win?.document?.body||!shouldReturn(win.location))return false;
    if(win.__UNIFIED_QA_RETURN_STARTED)return true;
    win.__UNIFIED_QA_RETURN_STARTED=true;
    let completed=false;
    const handle=()=>{
      const state=win.document.body.dataset.state;
      if(state==='fail'){showFailure(win);return false;}
      if(completed||state!=='pass')return false;
      const target=safeReturnTarget(win.location,win.sessionStorage);
      if(!target)return false;
      completed=true;
      try{win.sessionStorage?.removeItem?.(RETURN_KEY);}catch{}
      const status=win.document.getElementById('status');
      if(status)status.textContent='真机验收通过，正在返回角色创建并启用本机3D…';
      win.setTimeout(()=>win.location.replace(target),450);
      return true;
    };
    if(handle())return true;
    const observer=new win.MutationObserver(()=>{handle();});
    observer.observe(win.document.body,{attributes:true,attributeFilter:['data-state']});
    return true;
  }

  const api=Object.freeze({RETURN_KEY,safeReturnTarget,shouldReturn,readResult,showFailure,beginAutoReturn});
  if(typeof window!=='undefined'){window.UnifiedMobileQaReturn=api;beginAutoReturn(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
