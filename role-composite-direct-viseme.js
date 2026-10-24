(() => {
  'use strict';

  const REQUIRED_MOUTH_MESHES=Object.freeze(['body','teeth','tongue']);
  const normalize=value=>String(value||'').trim().toLowerCase();

  function contractFor(faceRig,directApi){
    const meshes=Array.isArray(faceRig?.meshes)?faceRig.meshes:[];
    if(!directApi?.buildDirectIndex||!directApi?.directCoverage||!directApi?.applyDirectVisemes)return Object.freeze({ok:false,reason:'direct-api',entries:Object.freeze([]),missing:Object.freeze([...REQUIRED_MOUTH_MESHES])});
    const entries=[],missing=[];
    for(const required of REQUIRED_MOUTH_MESHES){
      const mesh=meshes.find(item=>normalize(item?.name)===required)||null;
      if(!mesh){missing.push(required);continue;}
      const index=directApi.buildDirectIndex(mesh.morphTargetDictionary||{}),coverage=directApi.directCoverage(index);
      if(coverage<(directApi.MIN_DIRECT_VISEMES||8)){missing.push(required);continue;}
      entries.push(Object.freeze({name:required,mesh,index:Object.freeze({...index}),coverage}));
    }
    return Object.freeze({ok:missing.length===0&&entries.length===REQUIRED_MOUTH_MESHES.length,reason:missing.length?'coverage':'',entries:Object.freeze(entries),missing:Object.freeze(missing)});
  }

  function getContract(faceRig,directApi){
    if(!faceRig)return contractFor(null,directApi);
    if(faceRig.__compositeDirectVisemeContract)return faceRig.__compositeDirectVisemeContract;
    const contract=contractFor(faceRig,directApi);
    try{Object.defineProperty(faceRig,'__compositeDirectVisemeContract',{value:contract,configurable:true});}catch{}
    return contract;
  }

  function applyCompositeDirect(faceRig,visemes,directApi){
    const contract=getContract(faceRig,directApi);if(!contract.ok)return false;
    for(const entry of contract.entries){
      if(!directApi.applyDirectVisemes(entry.mesh,visemes||{},entry.index))return false;
    }
    return true;
  }

  function patchRenderer(HumanRenderer,directApi){
    const proto=HumanRenderer?.prototype;if(!proto?.renderFrame)return false;
    if(proto.renderFrame.__compositeDirectViseme)return true;
    const base=proto.renderFrame;
    const wrapped=function(frame={}){
      const composite=Array.isArray(this.faceRig?.meshes)&&this.faceRig.meshes.length>1;
      const direct=composite&&applyCompositeDirect(this.faceRig,frame?.visemes||{},directApi);
      return base.call(this,direct?{...frame,visemes:{}}:frame);
    };
    wrapped.__compositeDirectViseme=true;wrapped.__baseRenderFrame=base;proto.renderFrame=wrapped;return true;
  }

  function boot(win=typeof window!=='undefined'?window:null){
    if(!win)return false;
    const Renderer=win.RoleHumanRenderer?.HumanRenderer,direct=win.RoleDirectVisemeRig;
    if(!Renderer||!direct){win.setTimeout?.(()=>boot(win),60);return false;}
    return patchRenderer(Renderer,direct);
  }

  const api=Object.freeze({REQUIRED_MOUTH_MESHES,contractFor,getContract,applyCompositeDirect,patchRenderer,boot});
  if(typeof window!=='undefined'){window.RoleCompositeDirectViseme=api;boot(window);}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
