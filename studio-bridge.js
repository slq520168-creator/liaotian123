(() => {
  'use strict';
  async function capture(host) {
    if(!host?.root||!host.renderer||!host.scene||!host.camera||host.contextLost)throw new Error('请先等待实际3D人物加载完成。');
    const THREE=host.modules?.THREE;if(!THREE)throw new Error('3D渲染器尚未就绪。');
    const renderer=host.renderer,target=new THREE.WebGLRenderTarget(768,1024),previous=renderer.getRenderTarget(),camera=host.camera.clone(),pixels=new Uint8Array(768*1024*4);
    target.texture.colorSpace=THREE.SRGBColorSpace;camera.aspect=768/1024;camera.updateProjectionMatrix();
    try{renderer.setRenderTarget(target);renderer.render(host.scene,camera);renderer.readRenderTargetPixels(target,0,0,768,1024,pixels);}finally{renderer.setRenderTarget(previous);target.dispose();}
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;const ctx=canvas.getContext('2d'),image=ctx.createImageData(768,1024);
    for(let y=0;y<1024;y++)image.data.set(pixels.subarray((1023-y)*768*4,(1024-y)*768*4),y*768*4);
    ctx.putImageData(image,0,0);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('人物图导出失败。')),'image/png'));
  }
  async function store(blob,char){return new Promise((resolve,reject)=>{const req=indexedDB.open('liaotian_studio_assets',1);req.onupgradeneeded=()=>req.result.createObjectStore('assets',{keyPath:'id'});req.onerror=()=>reject(new Error('无法打开工作台作品库。'));req.onsuccess=()=>{const db=req.result,tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({id:crypto.randomUUID(),kind:'image',title:char.name+' · 真实3D人物图',created:Date.now(),roleId:char.id,origin:'本机3D渲染',blob});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(new Error('图片保存失败，请检查本机存储空间。'));};};});}
  function install(){const tools=document.querySelector('.chat-tools');if(!tools||document.getElementById('studioExport3D'))return;const button=document.createElement('button');button.id='studioExport3D';button.type='button';button.className='btn btn-outline';button.textContent='保存3D人物图';button.addEventListener('click',async()=>{button.disabled=true;const label=button.textContent;button.textContent='正在导出实际人物…';try{const host=window.__ROLE_HUMAN_RENDERER,char=host?.currentCharacter?.();if(!char)throw new Error('请先选择并加载3D角色。');const blob=await capture(host);await store(blob,char);button.textContent='已保存到创作工作台';}catch(e){button.textContent=e.message;}finally{button.disabled=false;setTimeout(()=>{button.textContent=label;},6000);}});tools.append(button);}
  window.Studio3DBridge=Object.freeze({capture,store,install});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
