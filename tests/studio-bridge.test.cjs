const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){let disposed=false,restored=false,cameraAspect=0,put;
 const previous={},ctx={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(image){put=image;}};
 const context={window:{},document:{readyState:'complete',querySelector(){return null;},createElement(){return {getContext(){return ctx;},toBlob(fn){fn(new Blob(['pixels'],{type:'image/png'}));}};}}};
 vm.runInNewContext(fs.readFileSync('studio-bridge.js','utf8'),context);
 const host={root:{},scene:{},camera:{clone(){return {aspect:0,updateProjectionMatrix(){cameraAspect=this.aspect;}};}},modules:{THREE:{SRGBColorSpace:'srgb',WebGLRenderTarget:class{constructor(w,h){assert.equal(w,768);assert.equal(h,1024);this.texture={};}dispose(){disposed=true;}}}},renderer:{getRenderTarget(){return previous;},setRenderTarget(target){if(target===previous)restored=true;},render(){},readRenderTargetPixels(target,x,y,w,h,pixels){pixels.fill(255);}}};
 return {api:context.window.Studio3DBridge,host,get disposed(){return disposed;},get restored(){return restored;},get cameraAspect(){return cameraAspect;},get put(){return put;}};
}
test('3D人物图来自实际渲染器，输出768×1024并恢复渲染目标',async()=>{const s=setup(),blob=await s.api.capture(s.host);assert.equal(blob.type,'image/png');assert.equal(s.cameraAspect,768/1024);assert.equal(s.disposed,true);assert.equal(s.restored,true);assert.equal(s.put.data.length,768*1024*4);});
test('未加载人物拒绝导出，渲染异常仍清理离屏目标',async()=>{const s=setup();await assert.rejects(s.api.capture(null));s.host.renderer.render=()=>{throw Error('render failed');};await assert.rejects(s.api.capture(s.host));assert.equal(s.disposed,true);assert.equal(s.restored,true);});
