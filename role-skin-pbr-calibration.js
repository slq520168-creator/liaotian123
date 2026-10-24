(() => {
  'use strict';

  const CALIBRATED_SKIN_TINTS=Object.freeze({
    '偏白':'#fff7ee',
    '自然肤色':'#f8bf9f',
    '小麦肤色':'#d6936c',
    '深肤色':'#8a5a46'
  });
  const CALIBRATED_HAIR_TINTS=Object.freeze({
    '自然黑':'#533d2d',
    '深棕':'#6d4437',
    '栗棕':'#9d5a43',
    '红棕':'#ae4f40',
    '金棕':'#cd8e4f',
    '银灰':'#bfbcc4'
  });
  const NATURAL_SKIN='自然肤色';
  const NATURAL_HAIR='自然黑';

  function calibratedSkinTint(choice){return CALIBRATED_SKIN_TINTS[choice]||CALIBRATED_SKIN_TINTS[NATURAL_SKIN];}
  function calibratedHairTint(choice){return CALIBRATED_HAIR_TINTS[choice]||CALIBRATED_HAIR_TINTS[NATURAL_HAIR];}
  function calibratedTint(choice){return calibratedSkinTint(choice);}

  function wrapRecipeApi(base){
    if(!base||typeof base.mapRecipe!=='function')return base||null;
    if(base.__pbrSkinHairCalibration===true)return base;
    const baseMap=base.mapRecipe.bind(base);
    const wrapped={...base,
      SKIN_TINTS:CALIBRATED_SKIN_TINTS,
      HAIR_TINTS:CALIBRATED_HAIR_TINTS,
      mapRecipe(recipe={}){
        const mapped=baseMap(recipe)||{};
        return Object.freeze({...mapped,skinTint:calibratedSkinTint(recipe?.skin),hairTint:calibratedHairTint(recipe?.hairColor)});
      },
      __pbrSkinCalibration:true,
      __pbrSkinHairCalibration:true
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

  const api=Object.freeze({CALIBRATED_SKIN_TINTS,CALIBRATED_HAIR_TINTS,NATURAL_SKIN,NATURAL_HAIR,calibratedSkinTint,calibratedHairTint,calibratedTint,wrapRecipeApi,install,boot});
  if(typeof window!=='undefined'){window.RoleSkinPbrCalibration=api;boot(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
