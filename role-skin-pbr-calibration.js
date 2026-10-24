(() => {
  'use strict';

  const CALIBRATED_SKIN_TINTS=Object.freeze({
    '偏白':'#fff7ee',
    '自然肤色':'#f8bf9f',
    '小麦肤色':'#d6936c',
    '深肤色':'#8a5a46'
  });
  const NATURAL_SKIN='自然肤色';

  function calibratedTint(choice){return CALIBRATED_SKIN_TINTS[choice]||CALIBRATED_SKIN_TINTS[NATURAL_SKIN];}

  function wrapRecipeApi(base){
    if(!base||typeof base.mapRecipe!=='function')return base||null;
    if(base.__pbrSkinCalibration===true)return base;
    const baseMap=base.mapRecipe.bind(base);
    const wrapped={...base,
      SKIN_TINTS:CALIBRATED_SKIN_TINTS,
      mapRecipe(recipe={}){
        const mapped=baseMap(recipe)||{};
        return Object.freeze({...mapped,skinTint:calibratedTint(recipe?.skin)});
      },
      __pbrSkinCalibration:true
    };
    return Object.freeze(wrapped);
  }

  function install(win=typeof window!=='undefined'?window:null){
    if(!win?.RoleUnifiedHumanRecipe)return false;
    const wrapped=wrapRecipeApi(win.RoleUnifiedHumanRecipe);
    if(!wrapped)return false;
    win.RoleUnifiedHumanRecipe=wrapped;
    return true;
  }

  function boot(win=typeof window!=='undefined'?window:null){
    if(!win)return false;
    if(install(win))return true;
    let attempts=0;
    const retry=()=>{if(install(win))return;if(++attempts<80)win.setTimeout(retry,40);};
    retry();return false;
  }

  const api=Object.freeze({CALIBRATED_SKIN_TINTS,NATURAL_SKIN,calibratedTint,wrapRecipeApi,install,boot});
  if(typeof window!=='undefined'){window.RoleSkinPbrCalibration=api;boot(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
