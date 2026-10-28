(() => {
  'use strict';

  const IDLE_RETURN_MS=4500;
  const ROTATE_PER_PX=.008;
  const MIN_ZOOM=.8;
  const MAX_ZOOM=1.45;
  const BASE_FOV=30;
  const STYLE_ID='roleStageControlsStyles';
  const states=new WeakMap();
  const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,Number(value)||0));
  const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
  function normalizeYaw(value){let v=Number(value)||0;while(v>Math.PI)v-=Math.PI*2;while(v<-Math.PI)v+=Math.PI*2;return v;}
  function yawDelta(target,current){return normalizeYaw((Number(target)||0)-(Number(current)||0));}
  function distance(a,b){if(!a||!b)return 0;return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0));}

  function createState(renderer){
    return{renderer,root:null,baseYaw:0,currentYaw:0,desiredYaw:0,zoom:1,panY:0,baseCameraY:Number(renderer?.camera?.position?.y)||0,dragAnchorY:0,dragAnchorPan:0,baseFov:Number(renderer?.camera?.fov)||BASE_FOV,lastInput:0,pointers:new Map(),dragAnchorX:0,dragAnchorYaw:0,pinchDistance:0,pinchZoom:1,surface:null,observer:null,listeners:null};
  }
  function stateFor(renderer){if(!renderer)return null;let state=states.get(renderer);if(!state){state=createState(renderer);states.set(renderer,state);}return state;}
  function resetState(state,keepRoot=false){if(!state)return false;state.currentYaw=0;state.desiredYaw=0;state.zoom=1;state.panY=0;state.lastInput=0;state.pointers.clear();state.pinchDistance=0;state.pinchZoom=1;if(!keepRoot){state.root=null;state.baseYaw=0;}return true;}
  function syncRoot(state,root){if(!state)return false;if(state.root===root)return true;resetState(state,false);state.root=root||null;state.baseYaw=Number(root?.rotation?.y)||0;if(state.renderer?.camera)state.baseFov=Number(state.renderer.camera.fov)||BASE_FOV;return Boolean(root);}
  function applyZoom(state){const camera=state?.renderer?.camera;if(!camera)return false;camera.fov=clamp(state.baseFov/state.zoom,21,38);camera.updateProjectionMatrix?.();return true;}
  function setZoom(state,value){if(!state)return 1;state.zoom=clamp(value,MIN_ZOOM,MAX_ZOOM);applyZoom(state);return state.zoom;}
  function setDesiredYaw(state,value,timestamp=now()){if(!state)return 0;state.desiredYaw=normalizeYaw(value);state.lastInput=Number(timestamp)||0;return state.desiredYaw;}
  function beginPointer(state,id,x,y,timestamp=now()){
    if(!state)return false;state.pointers.set(id,{x:Number(x)||0,y:Number(y)||0});state.lastInput=Number(timestamp)||0;
    if(state.pointers.size===1){const p=[...state.pointers.values()][0];state.dragAnchorX=p.x;state.dragAnchorY=p.y;state.dragAnchorPan=state.panY;state.dragAnchorYaw=state.desiredYaw;}
    else if(state.pointers.size===2){const [a,b]=[...state.pointers.values()];state.pinchDistance=Math.max(1,distance(a,b));state.pinchZoom=state.zoom;}
    return true;
  }
  function movePointer(state,id,x,y,timestamp=now()){
    if(!state?.pointers.has(id))return false;state.pointers.set(id,{x:Number(x)||0,y:Number(y)||0});state.lastInput=Number(timestamp)||0;
    if(state.pointers.size>=2){const[a,b]=[...state.pointers.values()].slice(0,2),d=distance(a,b);if(state.pinchDistance>0)setZoom(state,state.pinchZoom*(d/state.pinchDistance));return true;}
    const p=[...state.pointers.values()][0];setDesiredYaw(state,state.dragAnchorYaw+(p.x-state.dragAnchorX)*ROTATE_PER_PX,timestamp);state.panY=clamp(state.dragAnchorPan+(p.y-state.dragAnchorY)*.002,-.65,.65);applyPan(state);return true;
  }
  function endPointer(state,id,timestamp=now()){
    if(!state)return false;state.pointers.delete(id);state.lastInput=Number(timestamp)||0;
    if(state.pointers.size===1){const p=[...state.pointers.values()][0];state.dragAnchorX=p.x;state.dragAnchorY=p.y;state.dragAnchorPan=state.panY;state.dragAnchorYaw=state.desiredYaw;state.pinchDistance=0;}
    if(!state.pointers.size)state.pinchDistance=0;
    return true;
  }
  function applyPan(state){const camera=state?.renderer?.camera;if(camera?.position)camera.position.y=state.baseCameraY+state.panY;}
  function resetView(state){if(!state)return false;state.desiredYaw=0;state.currentYaw=0;state.zoom=1;state.panY=0;state.lastInput=0;applyZoom(state);applyPan(state);if(state.root?.rotation)state.root.rotation.y=state.baseYaw;return true;}
  function tick(state,timestamp=now()){
    if(!state?.root?.rotation)return false;const time=Number(timestamp)||0;
    if(!state.pointers.size&&state.lastInput>0&&time-state.lastInput>=IDLE_RETURN_MS)state.desiredYaw=0;
    const delta=yawDelta(state.desiredYaw,state.currentYaw);state.currentYaw=normalizeYaw(state.currentYaw+delta*.18);if(Math.abs(delta)<.001)state.currentYaw=state.desiredYaw;
    state.root.rotation.y=state.baseYaw+state.currentYaw;return true;
  }

  function injectStyles(doc=typeof document!=='undefined'?document:null){
    if(!doc?.head||doc.getElementById?.(STYLE_ID))return false;
    const style=doc.createElement('style');style.id=STYLE_ID;style.textContent=`
      .role-stage-control-surface{background:transparent;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;outline:none}
      .role-stage-control-surface:active{cursor:grabbing}.role-stage-control-surface[hidden]{display:none!important}
      .role-stage-control-surface.primary{position:absolute;left:0;right:0;top:64px;height:min(40vh,460px);z-index:20}
      .role-stage-control-surface.preview{position:absolute;inset:0;z-index:6}
      .role-stage-control-surface:focus-visible{box-shadow:inset 0 0 0 2px rgba(214,95,141,.35)}
      @media(max-width:767px){.role-stage-control-surface.primary{top:64px;height:min(40vh,390px)}}`;
    doc.head.appendChild(style);return true;
  }
  function isPreview(renderer){return Boolean(renderer?.container);}
  function surfaceHost(renderer,doc){return isPreview(renderer)?renderer.container:doc?.querySelector?.('.chat-main');}
  function syncSurface(state){if(!state?.surface)return false;state.surface.hidden=!Boolean(state.renderer?.stage?.classList?.contains('active')&&state.renderer?.root);return !state.surface.hidden;}
  function attachSurface(renderer,doc=typeof document!=='undefined'?document:null){
    const state=stateFor(renderer),stage=renderer?.stage,host=surfaceHost(renderer,doc);if(!state||!stage||!host)return null;if(state.surface?.isConnected)return state.surface;
    injectStyles(doc);const surface=doc.createElement('div');surface.className=`role-stage-control-surface ${isPreview(renderer)?'preview':'primary'}`;surface.tabIndex=0;surface.setAttribute('role','application');surface.setAttribute('aria-label','左右拖动旋转，上下拖动查看，双指或滚轮缩放，双击复位');surface.hidden=true;host.appendChild(surface);state.surface=surface;
    const down=event=>{surface.setPointerCapture?.(event.pointerId);beginPointer(state,event.pointerId,event.clientX,event.clientY);event.preventDefault?.();};
    const move=event=>{if(movePointer(state,event.pointerId,event.clientX,event.clientY))event.preventDefault?.();};
    const up=event=>{endPointer(state,event.pointerId);surface.releasePointerCapture?.(event.pointerId);};
    const wheel=event=>{setZoom(state,state.zoom*Math.exp(-(Number(event.deltaY)||0)*.001));state.lastInput=now();event.preventDefault?.();};
    const dbl=event=>{resetView(state);event.preventDefault?.();};
    const key=event=>{let handled=true;if(event.key==='ArrowLeft')setDesiredYaw(state,state.desiredYaw-.18);else if(event.key==='ArrowRight')setDesiredYaw(state,state.desiredYaw+.18);else if(event.key==='ArrowUp'){state.panY=clamp(state.panY+.08,-.65,.65);applyPan(state);}else if(event.key==='ArrowDown'){state.panY=clamp(state.panY-.08,-.65,.65);applyPan(state);}else if(event.key==='+'||event.key==='=')setZoom(state,state.zoom*1.08);else if(event.key==='-'||event.key==='_')setZoom(state,state.zoom/1.08);else if(event.key==='Home'||event.key==='0')resetView(state);else handled=false;if(handled)event.preventDefault?.();};
    surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);surface.addEventListener('pointercancel',up);surface.addEventListener('wheel',wheel,{passive:false});surface.addEventListener('dblclick',dbl);surface.addEventListener('keydown',key);state.listeners={down,move,up,wheel,dbl,key};
    if(typeof MutationObserver!=='undefined'){state.observer=new MutationObserver(()=>syncSurface(state));state.observer.observe(stage,{attributes:true,attributeFilter:['class']});}
    syncSurface(state);return surface;
  }
  function detachSurface(renderer){const state=states.get(renderer);if(!state)return false;state.observer?.disconnect?.();state.observer=null;const s=state.surface,l=state.listeners;if(s&&l){s.removeEventListener?.('pointerdown',l.down);s.removeEventListener?.('pointermove',l.move);s.removeEventListener?.('pointerup',l.up);s.removeEventListener?.('pointercancel',l.up);s.removeEventListener?.('wheel',l.wheel);s.removeEventListener?.('dblclick',l.dbl);s.removeEventListener?.('keydown',l.key);}s?.remove?.();state.surface=null;state.listeners=null;return true;}

  function patchRenderer(api=typeof window!=='undefined'?window.RoleHumanRenderer:null,doc=typeof document!=='undefined'?document:null){
    const proto=api?.HumanRenderer?.prototype;if(!proto?.ensureStage||proto.ensureStage.__stageControls)return false;
    const baseStage=proto.ensureStage,baseFrameModel=proto.frameModel,baseRender=proto.renderFrame,baseClear=proto.clearModel,baseDispose=proto.dispose;
    proto.ensureStage=function(...args){const stage=baseStage.apply(this,args);attachSurface(this,doc);return stage;};proto.ensureStage.__stageControls=true;
    proto.frameModel=function(root,...args){const state=stateFor(this);if(this.camera){state.baseFov=state.baseFov||Number(this.camera.fov)||BASE_FOV;this.camera.fov=state.baseFov;this.camera.updateProjectionMatrix?.();}const result=baseFrameModel.call(this,root,...args);syncRoot(state,root);state.baseCameraY=Number(this.camera?.position?.y)||0;applyZoom(state);applyPan(state);syncSurface(state);return result;};proto.frameModel.__stageControls=true;
    proto.renderFrame=function(...args){tick(stateFor(this),now());return baseRender.apply(this,args);};proto.renderFrame.__stageControls=true;
    proto.clearModel=function(...args){const result=baseClear.apply(this,args);const state=stateFor(this);resetView(state);state.root=null;syncSurface(state);return result;};proto.clearModel.__stageControls=true;
    proto.dispose=function(...args){detachSurface(this);states.delete(this);return baseDispose.apply(this,args);};proto.dispose.__stageControls=true;
    return true;
  }
  function boot(){if(typeof window==='undefined'||typeof document==='undefined')return false;injectStyles();if(patchRenderer()){const renderer=window.__ROLE_HUMAN_RENDERER;if(renderer){stateFor(renderer);attachSurface(renderer);syncSurface(stateFor(renderer));}return true;}let attempts=0;const retry=()=>{if(patchRenderer()){const renderer=window.__ROLE_HUMAN_RENDERER;if(renderer)attachSurface(renderer);return;}if(++attempts<80)setTimeout(retry,80);};retry();return false;}

  const api=Object.freeze({IDLE_RETURN_MS,ROTATE_PER_PX,MIN_ZOOM,MAX_ZOOM,BASE_FOV,STYLE_ID,clamp,normalizeYaw,yawDelta,distance,createState,stateFor,resetState,syncRoot,applyZoom,setZoom,setDesiredYaw,beginPointer,movePointer,endPointer,applyPan,resetView,tick,injectStyles,isPreview,syncSurface,attachSurface,detachSurface,patchRenderer,boot});
  if(typeof window!=='undefined'){window.RoleStageControls=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
