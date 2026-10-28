(() => {
  'use strict';

  const ASSET_ID='unified-charactercreator';
  const SPINE_BONES=Object.freeze(['spine_01','spine_02','spine_03']);
  const UPPER_BODY_BONES=Object.freeze(['clavicle_l','clavicle_r','upperarm_l','upperarm_r']);
  const SAFE_BONES=Object.freeze([...SPINE_BONES,...UPPER_BODY_BONES]);
  const MAX_DELTA=0.012;
  const UPPER_BODY_MAX_DELTA=0.004;
  const states=new WeakMap();

  const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,Number(value)||0));
  const limitFor=name=>SPINE_BONES.includes(name)?MAX_DELTA:UPPER_BODY_MAX_DELTA;

  function collectBones(root){
    const found=new Map();
    root?.traverse?.(node=>{
      const name=String(node?.name||'');
      if(node?.isBone&&SAFE_BONES.includes(name)&&!found.has(name))found.set(name,node);
    });
    return found;
  }

  function captureRest(root){
    if(!root)return null;
    const cached=states.get(root);if(cached)return cached;
    const bones=collectBones(root);
    if(SAFE_BONES.some(name=>!bones.has(name)))return null;
    const rest={};
    for(const name of SAFE_BONES){
      const bone=bones.get(name),rotation=bone?.rotation;
      if(!rotation||![rotation.x,rotation.y,rotation.z].every(Number.isFinite))return null;
      rest[name]=Object.freeze({bone,x:rotation.x,y:rotation.y,z:rotation.z});
    }
    const state=Object.freeze({root,rest:Object.freeze(rest)});states.set(root,state);return state;
  }

  function actionDeltas(action,frame={},now=0){
    const breathing=clamp(frame?.breathing,-.006,.006);
    const t=Number.isFinite(Number(now))?Number(now):0;
    const sway=Math.sin(t/3000),turn=Math.sin(t/3600);
    const out=Object.fromEntries(SAFE_BONES.map(name=>[name,{x:0,y:0,z:0}]));
    let shoulderGain=.22,armGain=.0009;
    if(action==='放松呼吸'){
      out.spine_01.x=breathing*.55;out.spine_02.x=breathing*.85;out.spine_03.x=breathing;
      out.spine_02.y=sway*.0025;out.spine_03.y=sway*.0035;
      shoulderGain=.45;armGain=.0018;
    }else if(action==='专注交流'){
      out.spine_01.x=breathing*.18;out.spine_02.x=-.0022+breathing*.22;out.spine_03.x=-.0034+breathing*.28;
      out.spine_03.y=sway*.0015;
      shoulderGain=.12;armGain=.0005;
    }else if(action==='轻微转身'){
      out.spine_01.x=breathing*.20;out.spine_02.x=breathing*.28;out.spine_03.x=breathing*.34;
      out.spine_01.y=turn*.002;out.spine_02.y=turn*.0045;out.spine_03.y=turn*.007;
      shoulderGain=.18;armGain=.0012;
    }else{
      out.spine_01.x=breathing*.22;out.spine_02.x=breathing*.34;out.spine_03.x=breathing*.44;
      out.spine_03.y=sway*.0012;
    }
    const shoulder=breathing*shoulderGain,arm=armGain*sway;
    out.clavicle_l.z=shoulder+arm*.35;
    out.clavicle_r.z=-shoulder-arm*.35;
    out.upperarm_l.y=arm;
    out.upperarm_r.y=-arm;
    if(action==='轻微转身'){
      out.clavicle_l.y=turn*.0012;out.clavicle_r.y=turn*.0012;
      out.upperarm_l.z=-turn*.001;out.upperarm_r.z=turn*.001;
    }
    for(const [name,delta] of Object.entries(out))for(const axis of ['x','y','z'])delta[axis]=clamp(delta[axis],-limitFor(name),limitFor(name));
    return out;
  }

  function apply(root,action,frame={},now=0){
    const state=captureRest(root);if(!state)return false;
    const deltas=actionDeltas(action,frame,now);
    for(const name of SAFE_BONES){
      const base=state.rest[name],delta=deltas[name];
      base.bone.rotation.x=base.x+delta.x;
      base.bone.rotation.y=base.y+delta.y;
      base.bone.rotation.z=base.z+delta.z;
    }
    return true;
  }

  function reset(root){
    const state=states.get(root);if(!state)return false;
    for(const name of SAFE_BONES){const base=state.rest[name];base.bone.rotation.x=base.x;base.bone.rotation.y=base.y;base.bone.rotation.z=base.z;}
    return true;
  }

  function eligibleCharacter(char){
    return Boolean(char&&!char.isPreset&&char.humanAssetId===ASSET_ID&&['production','device-qualified','base-recipe'].includes(String(char.humanAssetStatus||'')));
  }

  function personalityFrame(frame={},recipe={}){
    const traits=recipe.personality||[],shy=traits.includes('害羞'),bright=traits.includes('开朗')||traits.includes('活泼');
    if(!shy&&!bright)return frame;
    return {...frame,headPitch:(Number(frame.headPitch)||0)+(shy?.055:0),gazeX:(Number(frame.gazeX)||0)+(shy?.06:0),gazeY:(Number(frame.gazeY)||0)-(shy?.035:0),gestureEnergy:(Number(frame.gestureEnergy)||0)*(shy?.5:1.6),expressionPreset:shy?'温柔':'微笑'};
  }

  function patchRenderer(rendererApi=typeof window!=='undefined'?window.RoleHumanRenderer:null){
    const proto=rendererApi?.HumanRenderer?.prototype;if(!proto?.renderFrame||proto.renderFrame.__safeSkeletonMotion)return false;
    const base=proto.renderFrame;
    const wrapped=function(frame={}){
      const char=this.renderCharacter||this.currentCharacter?.();
      if(this.root&&eligibleCharacter(char)){
        const recipe=typeof window!=='undefined'?window.RoleVisualRecipe?.forCharacter?.(char):null;
        frame=personalityFrame(frame,recipe||{});
        apply(this.root,recipe?.personality?.includes('开朗')?'轻微转身':recipe?.action||'自然站立',frame,typeof performance!=='undefined'?performance.now():Date.now());
      }else if(this.root){reset(this.root);}
      return base.call(this,frame);
    };
    wrapped.__safeSkeletonMotion=true;proto.renderFrame=wrapped;return true;
  }

  function boot(){
    if(typeof window==='undefined')return false;
    if(patchRenderer())return true;
    let attempts=0;
    const retry=()=>{if(patchRenderer())return;if(++attempts<80)setTimeout(retry,80);};
    retry();return false;
  }

  const api=Object.freeze({personalityFrame,ASSET_ID,SPINE_BONES,UPPER_BODY_BONES,SAFE_BONES,MAX_DELTA,UPPER_BODY_MAX_DELTA,limitFor,collectBones,captureRest,actionDeltas,apply,reset,eligibleCharacter,patchRenderer,boot});
  if(typeof window!=='undefined'){window.RoleSafeSkeletonMotion=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
