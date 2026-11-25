/* Production 2D character chat only: no 3D model or studio bootstrap. */
window.LIAOTIAN_CONFIG=Object.freeze({chatApiUrl:'/api/chat',chatApiKind:'role-free'});
(()=>{
 'use strict';
 const version='20261125-role2d83';
 const retiredIds=new Set(["nuannuan","linwan","sutang","xuzhixia","yeqingge","lingyi","luchen","taiyang","shenyan","guyan","jiangyu","yunzhou"]);
 window.LIAOTIAN_BUILD_VERSION=version;
 window.LIAOTIAN_3D_ONLY=false;
 function install(){
   if(typeof PRESET_CHARACTERS==='undefined'||!Array.isArray(PRESET_CHARACTERS))return;
   for(let i=PRESET_CHARACTERS.length-1;i>=0;i--){
     const char=PRESET_CHARACTERS[i];
     if(retiredIds.has(String(char?.id||''))||char?.roleKind==='3d'||char?.portraitDraft===true)PRESET_CHARACTERS.splice(i,1);
     else if(char?.isPreset)char.roleKind='2d';
   }
 }
 window.RoleCatalogPolicy=Object.freeze({install});
 const link=document.createElement('link');link.rel='stylesheet';
 link.href='chat-compact-ui.css?v='+version;document.head.appendChild(link);
})();