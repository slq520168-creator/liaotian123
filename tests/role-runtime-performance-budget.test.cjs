const test=require('node:test');
const assert=require('node:assert/strict');
const perf=require('../role-runtime-performance-budget.js');

function fakeInstance({pixelRatio=1.5,shadows=true}={}){
  const renderer={
    _pixelRatio:pixelRatio,
    shadowMap:{enabled:shadows},
    setPixelRatio(value){this._pixelRatio=value;},
    getPixelRatio(){return this._pixelRatio;}
  };
  return {renderer,resizeCalls:0,resize(){this.resizeCalls++;},loop:{render(){return true;}},stage:{setAttribute(){}}};
}
function feed(budget,delta,windows){
  let last=null;
  for(let w=0;w<windows;w++)for(let i=0;i<budget.windowSize;i++)last=budget.sample(delta)||last;
  return last;
}

test('summary and classifier use real frame times with P95 guard',()=>{
  const good=perf.summarize(Array(90).fill(28));
  assert.equal(good.count,90);assert.ok(good.avgFps>35);assert.equal(perf.classify(good),'good');
  const low=perf.summarize([...Array(80).fill(30),...Array(10).fill(70)]);
  assert.equal(perf.classify(low),'low');assert.ok(low.p95FrameMs>=70);
});

test('sustained low performance lowers DPR before disabling shadows',()=>{
  const instance=fakeInstance({pixelRatio:1.5,shadows:true});
  const budget=new perf.AdaptivePerformanceBudget(instance,{windowSize:30,originalPixelRatio:1.5,originalShadows:true});
  let outcome=feed(budget,50,2);
  assert.equal(outcome.action,'pixel-ratio');assert.equal(instance.renderer.getPixelRatio(),1.25);assert.equal(instance.renderer.shadowMap.enabled,true);
  outcome=feed(budget,50,2);
  assert.equal(outcome.action,'pixel-ratio');assert.equal(instance.renderer.getPixelRatio(),1);assert.equal(instance.renderer.shadowMap.enabled,true);
  outcome=feed(budget,50,2);
  assert.equal(outcome.action,'shadows');assert.equal(instance.renderer.shadowMap.enabled,false);
});

test('recovery uses hysteresis and restores shadows before DPR',()=>{
  const instance=fakeInstance({pixelRatio:1,shadows:false});
  const budget=new perf.AdaptivePerformanceBudget(instance,{windowSize:30,originalPixelRatio:1.5,originalShadows:true});
  let outcome=feed(budget,25,7);
  assert.notEqual(outcome?.action,'shadows');assert.equal(instance.renderer.shadowMap.enabled,false);
  outcome=feed(budget,25,1);
  assert.equal(outcome.action,'shadows');assert.equal(instance.renderer.shadowMap.enabled,true);assert.equal(instance.renderer.getPixelRatio(),1);
  outcome=feed(budget,25,8);
  assert.equal(outcome.action,'pixel-ratio');assert.equal(instance.renderer.getPixelRatio(),1.25);
});

test('neutral windows reset hysteresis so one slow burst does not thrash quality',()=>{
  const instance=fakeInstance();
  const budget=new perf.AdaptivePerformanceBudget(instance,{windowSize:30});
  feed(budget,50,1);
  feed(budget,33,1);
  feed(budget,50,1);
  assert.equal(instance.renderer.getPixelRatio(),1.5);
  assert.equal(instance.renderer.shadowMap.enabled,true);
});

test('attach wraps renderer loop once and detach restores original callback',()=>{
  const instance=fakeInstance();
  const base=instance.loop.render;
  const first=perf.attach(instance),second=perf.attach(instance);
  assert.equal(first,second);assert.notEqual(instance.loop.render,base);assert.equal(instance.loop.render.__adaptivePerformanceBudget,true);
  assert.equal(perf.detach(instance,false),true);assert.equal(instance.loop.render,base);assert.equal(instance.__rolePerformanceBudget,null);
});
