(() => {
  'use strict';

  const WINDOW_SIZE=90;
  const LOW_WINDOWS=2;
  const RECOVERY_WINDOWS=8;
  const MIN_PIXEL_RATIO=1;
  const PIXEL_RATIO_STEP=.25;
  const LOW_FPS=27;
  const LOW_P95_MS=55;
  const RECOVERY_FPS=35;
  const RECOVERY_P95_MS=40;

  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const round2=value=>Math.round(finite(value)*100)/100;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,finite(value,min)));

  function percentile(values,p=.95){
    const list=(Array.isArray(values)?values:[]).filter(value=>Number.isFinite(Number(value))&&Number(value)>0).map(Number).sort((a,b)=>a-b);
    if(!list.length)return 0;
    const index=Math.max(0,Math.min(list.length-1,Math.ceil(list.length*clamp(p,0,1))-1));
    return list[index];
  }

  function summarize(deltas=[]){
    const frames=(Array.isArray(deltas)?deltas:[]).filter(value=>Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=250).map(Number);
    if(!frames.length)return Object.freeze({count:0,avgFrameMs:0,avgFps:0,p95FrameMs:0});
    const total=frames.reduce((sum,value)=>sum+value,0),avgFrameMs=total/frames.length;
    return Object.freeze({count:frames.length,avgFrameMs:round2(avgFrameMs),avgFps:round2(1000/avgFrameMs),p95FrameMs:round2(percentile(frames,.95))});
  }

  function classify(summary){
    if(!summary||summary.count<WINDOW_SIZE)return'wait';
    if(summary.avgFps<LOW_FPS||summary.p95FrameMs>LOW_P95_MS)return'low';
    if(summary.avgFps>=RECOVERY_FPS&&summary.p95FrameMs<=RECOVERY_P95_MS)return'good';
    return'neutral';
  }

  function rendererPixelRatio(instance){
    const renderer=instance?.renderer;
    if(!renderer)return 1;
    if(typeof renderer.getPixelRatio==='function')return finite(renderer.getPixelRatio(),1);
    return finite(renderer.__rolePixelRatio,1);
  }

  function setPixelRatio(instance,value){
    const renderer=instance?.renderer;if(!renderer?.setPixelRatio)return false;
    const next=Math.max(MIN_PIXEL_RATIO,round2(value));
    renderer.setPixelRatio(next);renderer.__rolePixelRatio=next;instance.resize?.();return true;
  }

  function shadowState(instance){
    const renderer=instance?.renderer,lighting=instance?.__roleStageLighting;
    const enabled=Boolean(renderer?.shadowMap?.enabled);
    return Object.freeze({enabled,lighting});
  }

  function setShadows(instance,enabled){
    const renderer=instance?.renderer;if(!renderer?.shadowMap)return false;
    const next=Boolean(enabled);renderer.shadowMap.enabled=next;
    const lighting=instance.__roleStageLighting;
    if(lighting?.key)lighting.key.castShadow=next;
    if(instance.root&&typeof window!=='undefined'&&window.RoleStageLighting?.markShadowMeshes)window.RoleStageLighting.markShadowMeshes(instance.root,next);
    if(lighting?.ground){
      if(!next)lighting.ground.visible=false;
      else if(instance.root&&typeof window!=='undefined'&&window.RoleStageLighting?.updateLightingForRoot)window.RoleStageLighting.updateLightingForRoot(instance,instance.root);
    }
    return true;
  }

  class AdaptivePerformanceBudget{
    constructor(instance,options={}){
      this.instance=instance;
      this.windowSize=Math.max(30,Math.round(finite(options.windowSize,WINDOW_SIZE)));
      this.samples=[];
      this.lowWindows=0;
      this.goodWindows=0;
      this.originalPixelRatio=Math.max(MIN_PIXEL_RATIO,finite(options.originalPixelRatio,rendererPixelRatio(instance)));
      this.originalShadows=options.originalShadows??shadowState(instance).enabled;
      this.lastSummary=Object.freeze({count:0,avgFrameMs:0,avgFps:0,p95FrameMs:0});
      this.level=0;
      this.degradeCount=0;
      this.recoverCount=0;
    }

    currentPixelRatio(){return rendererPixelRatio(this.instance);}

    canLowerPixelRatio(){return this.currentPixelRatio()>MIN_PIXEL_RATIO+.01;}
    shadowsCurrentlyEnabled(){return Boolean(this.instance?.renderer?.shadowMap?.enabled);}

    degrade(){
      if(this.canLowerPixelRatio()){
        const next=Math.max(MIN_PIXEL_RATIO,this.currentPixelRatio()-PIXEL_RATIO_STEP);
        if(setPixelRatio(this.instance,next)){this.level++;this.degradeCount++;return'pixel-ratio';}
      }
      if(this.shadowsCurrentlyEnabled()){
        if(setShadows(this.instance,false)){this.level++;this.degradeCount++;return'shadows';}
      }
      return'floor';
    }

    recover(){
      if(this.originalShadows&&!this.shadowsCurrentlyEnabled()){
        if(setShadows(this.instance,true)){this.level=Math.max(0,this.level-1);this.recoverCount++;return'shadows';}
      }
      const current=this.currentPixelRatio();
      if(current<this.originalPixelRatio-.01){
        const next=Math.min(this.originalPixelRatio,current+PIXEL_RATIO_STEP);
        if(setPixelRatio(this.instance,next)){this.level=Math.max(0,this.level-1);this.recoverCount++;return'pixel-ratio';}
      }
      return'ceiling';
    }

    evaluate(){
      const summary=summarize(this.samples);this.samples=[];this.lastSummary=summary;
      const state=classify(summary);
      if(state==='low'){
        this.lowWindows++;this.goodWindows=0;
        if(this.lowWindows>=LOW_WINDOWS){this.lowWindows=0;return Object.freeze({state,action:this.degrade(),summary});}
      }else if(state==='good'){
        this.goodWindows++;this.lowWindows=0;
        if(this.goodWindows>=RECOVERY_WINDOWS){this.goodWindows=0;return Object.freeze({state,action:this.recover(),summary});}
      }else{this.lowWindows=0;this.goodWindows=0;}
      return Object.freeze({state,action:'none',summary});
    }

    sample(delta){
      const value=finite(delta,0);
      if(value<=0||value>250)return null;
      this.samples.push(value);
      if(this.samples.length<this.windowSize)return null;
      return this.evaluate();
    }

    restore(){
      if(this.originalShadows)setShadows(this.instance,true);else setShadows(this.instance,false);
      setPixelRatio(this.instance,this.originalPixelRatio);
      this.samples=[];this.lowWindows=0;this.goodWindows=0;this.level=0;
      return true;
    }
  }

  function attach(instance){
    if(!instance?.renderer||!instance?.loop)return null;
    if(instance.__rolePerformanceBudget)return instance.__rolePerformanceBudget;
    const budget=new AdaptivePerformanceBudget(instance),loop=instance.loop,baseRender=loop.render;
    if(typeof baseRender!=='function')return null;
    loop.render=function(frame,meta={}){
      const result=baseRender.call(this,frame,meta);
      const outcome=budget.sample(meta?.delta);
      if(outcome?.action&&outcome.action!=='none'&&outcome.action!=='floor'&&outcome.action!=='ceiling'){
        instance.stage?.setAttribute?.('data-performance-level',String(budget.level));
      }
      return result;
    };
    loop.render.__adaptivePerformanceBudget=true;
    budget.baseRender=baseRender;
    instance.__rolePerformanceBudget=budget;
    return budget;
  }

  function detach(instance,restore=false){
    const budget=instance?.__rolePerformanceBudget;if(!budget)return false;
    if(instance.loop?.render?.__adaptivePerformanceBudget&&typeof budget.baseRender==='function')instance.loop.render=budget.baseRender;
    if(restore)budget.restore();
    instance.__rolePerformanceBudget=null;
    return true;
  }

  function patchRenderer(api=typeof window!=='undefined'?window.RoleHumanRenderer:null){
    const proto=api?.HumanRenderer?.prototype;if(!proto?.ensureEngine||proto.ensureEngine.__adaptivePerformanceBudget)return false;
    const baseEnsure=proto.ensureEngine,baseDispose=proto.dispose;
    proto.ensureEngine=async function(...args){const result=await baseEnsure.apply(this,args);attach(this);return result;};
    proto.ensureEngine.__adaptivePerformanceBudget=true;
    proto.dispose=function(...args){detach(this,false);return baseDispose.apply(this,args);};
    proto.dispose.__adaptivePerformanceBudget=true;
    return true;
  }

  function boot(){
    if(typeof window==='undefined')return false;
    if(patchRenderer())return true;
    let attempts=0;const retry=()=>{if(patchRenderer())return;if(++attempts<80)setTimeout(retry,80);};retry();return false;
  }

  const api=Object.freeze({WINDOW_SIZE,LOW_WINDOWS,RECOVERY_WINDOWS,MIN_PIXEL_RATIO,PIXEL_RATIO_STEP,LOW_FPS,LOW_P95_MS,RECOVERY_FPS,RECOVERY_P95_MS,percentile,summarize,classify,rendererPixelRatio,setPixelRatio,shadowState,setShadows,AdaptivePerformanceBudget,attach,detach,patchRenderer,boot});
  if(typeof window!=='undefined'){window.RoleRuntimePerformanceBudget=api;boot();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
