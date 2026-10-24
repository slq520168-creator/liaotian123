(() => {
  'use strict';

  const MAX_ATTEMPTS=120;
  const RETRY_MS=50;

  function attachExisting(win=typeof window!=='undefined'?window:null){
    const api=win?.RoleRuntimePerformanceBudget;
    const instance=win?.__ROLE_HUMAN_RENDERER;
    if(!api?.attach||!instance?.renderer||!instance?.loop)return false;
    return Boolean(api.attach(instance));
  }

  function boot(win=typeof window!=='undefined'?window:null){
    if(!win)return false;
    if(attachExisting(win))return true;
    let attempts=0;
    const retry=()=>{
      if(attachExisting(win))return;
      if(++attempts<MAX_ATTEMPTS)win.setTimeout(retry,RETRY_MS);
    };
    win.setTimeout(retry,RETRY_MS);
    return false;
  }

  const api=Object.freeze({MAX_ATTEMPTS,RETRY_MS,attachExisting,boot});
  if(typeof window!=='undefined'){window.RoleRuntimePerformanceAttach=api;boot(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
