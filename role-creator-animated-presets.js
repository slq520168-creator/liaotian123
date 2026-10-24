(() => {
  'use strict';

  const BUILD=window.LIAOTIAN_BUILD_VERSION||'20261024-selfhosted3d1';
  const localUrl=path=>new URL(`${path}${path.includes('?')?'&':'?'}v=${encodeURIComponent(BUILD)}`,document.baseURI).href;
  const MODEL_URL=localUrl('assets/humans/reference-mpfb.glb');
  const THREE_URL=localUrl('vendor/three/build/three.module.js');
  const GLTF_URL=localUrl('vendor/three/examples/jsm/loaders/GLTFLoader.js');
  const SKEL_URL=localUrl('vendor/three/examples/jsm/utils/SkeletonUtils.js');
  const MESHOPT_URL=localUrl('vendor/meshoptimizer/meshopt_decoder.mjs');
  const ACTIVE_MOBILE=1,ACTIVE_DESKTOP=2;
  const PROFILES=[
    {name:'自然陪伴',sx:1.00,sy:1.00,sz:1.00,yaw:-0.04,accent:0xffd7e5,cloth:0xd7dce8,pace:0.85,smile:0.05},
    {name:'温柔治愈',sx:0.98,sy:1.01,sz:0.99,yaw:0.05,accent:0xffc6dc,cloth:0xf0d8df,pace:0.72,smile:0.22},
    {name:'成熟知性',sx:1.01,sy:1.025,sz:1.00,yaw:-0.02,accent:0xd7d2ff,cloth:0xc8cad8,pace:0.60,smile:0.08},
    {name:'元气活泼',sx:0.97,sy:1.00,sz:0.98,yaw:0.08,accent:0xffd28b,cloth:0xf5c6cb,pace:1.18,smile:0.30},
    {name:'清冷克制',sx:0.99,sy:1.02,sz:0.99,yaw:-0.06,accent:0xc9e7ff,cloth:0xbec8d8,pace:0.55,smile:0.02},
    {name:'沉稳低调',sx:1.045,sy:1.01,sz:1.035,yaw:0.03,accent:0xcfd6dc,cloth:0x9faab7,pace:0.52,smile:0.03}
  ];

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
  const runtimes=new Map(),visibleCards=new Set(),mounting=new Set(),tokens=new WeakMap(),retries=new WeakMap();
  let modulesPromise=null,sourcePromise=null,selectedPreset='';

  function moduleDecoder(mod){return mod?.MeshoptDecoder||mod?.default?.MeshoptDecoder||mod?.default||mod||null;}
  async function loadModules(){
    if(!modulesPromise){
      modulesPromise=Promise.all([import(THREE_URL),import(GLTF_URL),import(SKEL_URL),import(MESHOPT_URL)])
        .then(async([THREE,gltf,skel,meshopt])=>{
          const decoder=moduleDecoder(meshopt);
          if(!gltf?.GLTFLoader||!skel?.clone||!decoder)throw new Error('3D引擎模块不完整');
          if(decoder.ready&&typeof decoder.ready.then==='function')await decoder.ready;
          return{THREE,GLTFLoader:gltf.GLTFLoader,clone:skel.clone,MeshoptDecoder:decoder};
        })
        .catch(error=>{modulesPromise=null;throw error;});
    }
    return modulesPromise;
  }
  async function loadSource(){
    if(!sourcePromise){
      sourcePromise=loadModules().then(async m=>{
        const loader=new m.GLTFLoader();
        loader.setMeshoptDecoder(m.MeshoptDecoder);
        const gltf=await loader.loadAsync(MODEL_URL);
        if(!gltf?.scene)throw new Error('3D人物模型为空');
        return gltf.scene;
      }).catch(error=>{sourcePromise=null;throw error;});
    }
    return sourcePromise;
  }
  function cloneMaterials(root,profile,owned){
    root.traverse?.(node=>{
      if(!node?.isMesh||!node.material)return;
      const mats=Array.isArray(node.material)?node.material:[node.material];
      const cloned=mats.map(mat=>{
        const next=mat.clone();owned.push(next);
        const n=`${node.name||''} ${mat.name||''}`.toLowerCase();
        if(next.color&&/shirt|top|dress|cloth|jean|pant|skirt|outfit|wear|sweater|jacket|trouser/.test(n)) next.color.setHex(profile.cloth);
        return next;
      });
      node.material=Array.isArray(node.material)?cloned:cloned[0];
    });
  }
  function setExpression(root,profile,t){
    const blink=Math.pow(Math.max(0,Math.sin(t*0.0017+0.6)),28);
    root.traverse?.(node=>{
      if(!node?.morphTargetDictionary||!Array.isArray(node.morphTargetInfluences))return;
      for(const [name,index] of Object.entries(node.morphTargetDictionary)){
        const key=name.toLowerCase().replace(/[^a-z]/g,'');
        if(key.includes('eyeblinkleft')||key.includes('eyeblinkright')) node.morphTargetInfluences[index]=blink;
        else if(key.includes('mouthsmileleft')||key.includes('mouthsmileright')) node.morphTargetInfluences[index]=profile.smile;
        else if(key.includes('cheeksquintleft')||key.includes('cheeksquintright')) node.morphTargetInfluences[index]=profile.smile*0.28;
      }
    });
  }
  function frame(THREE,camera,root){
    const box=new THREE.Box3().setFromObject(root);
    if(box.isEmpty())throw new Error('3D人物没有可显示几何体');
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const h=Math.max(size.y,size.x*1.22),distance=Math.max(1.1,h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)))*1.13);
    camera.position.set(center.x,center.y+size.y*.015,center.z+distance);
    camera.lookAt(center.x,center.y,center.z);
    camera.near=Math.max(.01,distance/100);camera.far=Math.max(30,distance*8);camera.updateProjectionMatrix();
  }
  function hostFor(card){return card.querySelector('.creator-preset-3d');}
  function showLoading(card,text='正在加载 3D…'){
    const host=hostFor(card);if(!host)return;host.classList.remove('loaded','failed');
    const msg=host.querySelector('.creator-preset-loading');if(msg)msg.textContent=text;
  }
  function showError(card,error){
    const host=hostFor(card);if(!host)return;host.classList.remove('loaded');host.classList.add('failed');
    const msg=host.querySelector('.creator-preset-loading');if(msg)msg.textContent='3D加载失败 · 点此重试';
    card.title=String(error?.message||'3D加载失败');
  }
  function profileFor(card){
    const name=card.dataset.preset||'';let index=PROFILES.findIndex(p=>p.name===name);
    if(index<0)index=Math.max(0,[...card.parentElement?.children||[]].indexOf(card))%PROFILES.length;
    return{profile:PROFILES[index]||PROFILES[0],index};
  }
  function activeCount(){return runtimes.size+mounting.size;}
  function activeLimit(){return Math.min(PROFILES.length,(window.innerWidth||0)<=700?ACTIVE_MOBILE:ACTIVE_DESKTOP);}
  function nextToken(card){const n=(tokens.get(card)||0)+1;tokens.set(card,n);return n;}
  function tokenValid(card,token){return tokens.get(card)===token&&card.isConnected&&visibleCards.has(card);}
  async function mount(card,profile,index,token){
    if(runtimes.has(card)||!tokenValid(card,token))return;
    showLoading(card);
    try{
      const {THREE,clone}=await loadModules();
      const source=await loadSource();
      if(!tokenValid(card,token))return;
      const host=hostFor(card);if(!host)return;
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(28,1,.01,100);
      const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
      renderer.setPixelRatio(Math.min(1.15,window.devicePixelRatio||1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.setClearColor(0x000000,0);
      const hemi=new THREE.HemisphereLight(0xffffff,0x776c78,2.2),key=new THREE.DirectionalLight(0xffffff,2.5),rim=new THREE.DirectionalLight(profile.accent,1.05);
      key.position.set(2,4,3);rim.position.set(-2,2,2);scene.add(hemi,key,rim);
      const ownedMaterials=[],root=clone(source);cloneMaterials(root,profile,ownedMaterials);root.scale.set(profile.sx,profile.sy,profile.sz);root.rotation.y=profile.yaw;scene.add(root);
      const groundGeometry=new THREE.CircleGeometry(.78,32),groundMaterial=new THREE.MeshBasicMaterial({color:profile.accent,transparent:true,opacity:.17,depthWrite:false}),ground=new THREE.Mesh(groundGeometry,groundMaterial);
      const box=new THREE.Box3().setFromObject(root);ground.rotation.x=-Math.PI/2;ground.position.y=box.min.y-.006;scene.add(ground);frame(THREE,camera,root);
      if(!tokenValid(card,token)){renderer.dispose();groundGeometry.dispose();groundMaterial.dispose();ownedMaterials.forEach(m=>m.dispose?.());return;}
      host.querySelectorAll('canvas').forEach(x=>x.remove());host.prepend(renderer.domElement);host.classList.add('loaded');host.classList.remove('failed');
      const runtime={renderer,scene,camera,root,ground,groundGeometry,groundMaterial,ownedMaterials,host,profile,index,visible:true,last:0,raf:0,baseY:root.position.y,disposed:false,resizeObserver:null};
      const resize=()=>{if(runtime.disposed)return;const r=host.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
      runtime.resize=resize;if('ResizeObserver'in window){runtime.resizeObserver=new ResizeObserver(resize);runtime.resizeObserver.observe(host);}resize();
      const canvas=renderer.domElement;canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(runtime.disposed)return;dispose(card);showError(card,new Error('WebGL上下文已释放'));schedule(card,500);},{passive:false});
      const tick=t=>{if(runtime.disposed)return;runtime.raf=requestAnimationFrame(tick);if(!runtime.visible||document.hidden||!card.isConnected)return;if(t-runtime.last<66)return;runtime.last=t;
        if(!reduced){const phase=t*.001*profile.pace+index*.7;root.position.y=runtime.baseY+Math.sin(phase*1.25)*.006;root.rotation.y=profile.yaw+Math.sin(phase*.55)*.035;const breath=1+Math.sin(phase*1.7)*.0025;root.scale.set(profile.sx*breath,profile.sy*(1+Math.sin(phase*1.7)*.0018),profile.sz*breath);setExpression(root,profile,t+index*173);ground.material.opacity=.15+Math.sin(phase)*.035;}
        renderer.render(scene,camera);
      };
      runtime.raf=requestAnimationFrame(tick);runtimes.set(card,runtime);retries.set(card,0);
    }catch(error){
      if(tokenValid(card,token)){
        const count=(retries.get(card)||0)+1;retries.set(card,count);
        if(count<3){showLoading(card,`3D重试 ${count}/2…`);setTimeout(()=>schedule(card,650),650);}else showError(card,error);
      }
    }
  }
  function dispose(card,redrain=true){
    nextToken(card);const r=runtimes.get(card);if(!r)return;r.disposed=true;cancelAnimationFrame(r.raf);r.resizeObserver?.disconnect?.();r.ownedMaterials?.forEach(m=>m.dispose?.());r.groundGeometry?.dispose?.();r.groundMaterial?.dispose?.();r.renderer?.dispose?.();r.renderer?.forceContextLoss?.();r.renderer?.domElement?.remove?.();runtimes.delete(card);if(redrain)drain();
  }
  function releaseCreatorPreviews(){
    for(const card of [...mounting])nextToken(card);
    mounting.clear();
    for(const card of [...runtimes.keys()])dispose(card,false);
    visibleCards.clear();
  }
  function requestMount(card,force=false){
    if(!visibleCards.has(card)||runtimes.has(card)||mounting.has(card)||(!force&&activeCount()>=activeLimit()))return;
    const token=nextToken(card),{profile,index}=profileFor(card);mounting.add(card);
    mount(card,profile,index,token).finally(()=>{mounting.delete(card);drain();});
  }
  function prioritize(card){
    if(!card?.isConnected)return;
    visibleCards.add(card);
    const running=runtimes.get(card);if(running){running.visible=true;return;}
    if(mounting.has(card))return;
    if(activeCount()>=activeLimit()){
      const victim=[...runtimes.keys()].find(other=>other!==card);
      if(victim)dispose(victim,false);
      else{
        const pending=[...mounting].find(other=>other!==card);
        if(pending){nextToken(pending);mounting.delete(pending);}
      }
    }
    requestMount(card,true);
  }
  function drain(){
    for(const card of visibleCards){if(activeCount()>=activeLimit())break;if(!runtimes.has(card)&&!mounting.has(card))requestMount(card);}
  }
  function schedule(card,delay=0){
    if(!card?.isConnected)return;visibleCards.add(card);if(delay)setTimeout(()=>{if(visibleCards.has(card))drain();},delay);else drain();
  }
  function cleanup(){for(const card of [...runtimes.keys()])if(!card.isConnected){visibleCards.delete(card);dispose(card);}for(const card of [...visibleCards])if(!card.isConnected)visibleCards.delete(card);}

  let io=null;
  if('IntersectionObserver'in window){
    io=new IntersectionObserver(entries=>{for(const e of entries){const card=e.target;if(e.isIntersecting){visibleCards.add(card);const r=runtimes.get(card);if(r)r.visible=true;}else{visibleCards.delete(card);const r=runtimes.get(card);if(r)r.visible=false;setTimeout(()=>{if(!visibleCards.has(card))dispose(card);},260);}}drain();},{rootMargin:'40px 0px 40px 0px',threshold:.04});
  }

  function observe(card){if(io)io.observe(card);else schedule(card);}
  function decorate(){
    const studio=document.getElementById('roleCreatorStudio');if(!studio)return;cleanup();
    const cards=[...studio.querySelectorAll('button[data-preset]')];if(!cards.length)return;
    for(const [index,card] of cards.entries()){
      if(card.dataset.full3d==='1')continue;
      const name=card.dataset.preset||PROFILES[index]?.name||'3D预设',text=(card.querySelector('small')?.textContent||'').trim();
      card.dataset.full3d='1';card.classList.add('creator-preset-3d-card');if(name===selectedPreset)card.classList.add('selected');
      card.innerHTML=`<div class="creator-preset-3d" aria-label="${name} 全身3D预览"><span class="creator-preset-loading">正在加载 3D…</span></div><div class="creator-preset-copy"><b>${name}</b><small>${text}</small></div>`;
      card.addEventListener('click',()=>{selectedPreset=name;studio.querySelectorAll('button[data-preset]').forEach(item=>item.classList.toggle('selected',item===card));if(hostFor(card)?.classList.contains('failed')){retries.set(card,0);modulesPromise=null;sourcePromise=null;}prioritize(card);},{passive:true});
      observe(card);
    }
    if(!io)cards.slice(0,activeLimit()).forEach(schedule);
  }

  const style=document.createElement('style');style.id='creatorPreset3DStyles';style.textContent=`
    .creator-grid:has(.creator-preset-3d-card){grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.creator-preset-3d-card{position:relative!important;min-height:238px!important;padding:0!important;overflow:hidden!important;border-radius:16px!important;background:linear-gradient(180deg,#f7f4f7 0%,#f1edf1 72%,#fff 72%)!important;display:block!important;text-align:left!important;isolation:isolate}.creator-preset-3d-card.selected{border-color:#d75f91!important;box-shadow:0 0 0 2px rgba(215,95,145,.14),0 12px 28px rgba(80,50,65,.10)!important}.creator-preset-3d{height:176px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 68%,rgba(255,255,255,.98),rgba(238,231,237,.58) 48%,rgba(225,219,227,.34));pointer-events:none}.creator-preset-3d canvas{display:block;width:100%!important;height:100%!important}.creator-preset-3d:after{content:'';position:absolute;inset:auto 13% 8px;height:18px;border-radius:50%;background:radial-gradient(ellipse,rgba(85,61,72,.14),transparent 72%);pointer-events:none}.creator-preset-loading{position:absolute;inset:0;display:grid;place-items:center;padding:12px;text-align:center;font-size:11px;line-height:1.35;color:#8f7d86}.creator-preset-3d.loaded .creator-preset-loading{display:none}.creator-preset-3d.failed .creator-preset-loading{color:#a34f70;font-weight:650;background:rgba(255,247,250,.72)}.creator-preset-copy{min-height:62px;padding:8px 9px 9px;background:rgba(255,255,255,.96);display:flex;flex-direction:column;gap:2px;justify-content:center}.creator-preset-copy b{font-size:13px}.creator-preset-copy small{font-size:10px;line-height:1.25;color:#81727a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}@media(max-width:430px){.creator-preset-3d-card{min-height:224px!important}.creator-preset-3d{height:164px}.creator-preset-copy{min-height:60px}}
  `;document.head.appendChild(style);

  const mo=new MutationObserver(()=>requestAnimationFrame(decorate));
  function boot(){const studio=document.getElementById('roleCreatorStudio');if(!studio){setTimeout(boot,80);return;}mo.observe(studio,{childList:true,subtree:true});decorate();}
  const createForm=document.getElementById('createRoleForm');
  const createModal=document.getElementById('createModalOverlay');
  createForm?.addEventListener('submit',releaseCreatorPreviews,{capture:true});
  if(createModal){
    const modalObserver=new MutationObserver(()=>{if(!createModal.classList.contains('active'))releaseCreatorPreviews();else requestAnimationFrame(()=>{decorate();drain();});});
    modalObserver.observe(createModal,{attributes:true,attributeFilter:['class']});
  }
  window.addEventListener('resize',()=>{for(const r of runtimes.values())r.resize?.();drain();},{passive:true});
  document.addEventListener('visibilitychange',()=>{for(const [card,r]of runtimes){r.visible=!document.hidden&&visibleCards.has(card);}});
  boot();
})();