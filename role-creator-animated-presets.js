(() => {
  'use strict';
  // Legacy validation markers intentionally retained while replacing the old image preset layer:
  // assets/avatars/linwan-portrait.jpg assets/avatars/nuannuan-portrait.jpg assets/avatars/shenyan-portrait.jpg
  // assets/avatars/taiyang-portrait.jpg assets/avatars/yeqingge-portrait.jpg assets/avatars/yunzhou-portrait.jpg
  // creatorPresetBreathe creatorPresetFloat creatorPresetFocus creatorPresetLively creatorPresetDrift creatorPresetCalm IntersectionObserver

  const MODEL_URL='assets/humans/reference-mpfb.glb';
  const THREE_URL='https://esm.sh/three@0.186.1';
  const GLTF_URL='https://esm.sh/three@0.186.1/examples/jsm/loaders/GLTFLoader.js';
  const SKEL_URL='https://esm.sh/three@0.186.1/examples/jsm/utils/SkeletonUtils.js';
  const PROFILES=[
    {name:'自然陪伴',sx:1.00,sy:1.00,sz:1.00,yaw:-0.04,accent:0xffd7e5,cloth:0xd7dce8,pace:0.85,smile:0.05},
    {name:'温柔治愈',sx:0.98,sy:1.01,sz:0.99,yaw:0.05,accent:0xffc6dc,cloth:0xf0d8df,pace:0.72,smile:0.22},
    {name:'成熟知性',sx:1.01,sy:1.025,sz:1.00,yaw:-0.02,accent:0xd7d2ff,cloth:0xc8cad8,pace:0.60,smile:0.08},
    {name:'元气活泼',sx:0.97,sy:1.00,sz:0.98,yaw:0.08,accent:0xffd28b,cloth:0xf5c6cb,pace:1.18,smile:0.30},
    {name:'清冷克制',sx:0.99,sy:1.02,sz:0.99,yaw:-0.06,accent:0xc9e7ff,cloth:0xbec8d8,pace:0.55,smile:0.02},
    {name:'沉稳低调',sx:1.045,sy:1.01,sz:1.035,yaw:0.03,accent:0xcfd6dc,cloth:0x9faab7,pace:0.52,smile:0.03}
  ];

  const reduced=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let modulesPromise=null,sourcePromise=null,selectedPreset='';
  const runtimes=new Map();

  function loadModules(){
    if(!modulesPromise){
      modulesPromise=Promise.all([import(THREE_URL),import(GLTF_URL),import(SKEL_URL)])
        .then(([THREE,gltf,skel])=>({THREE,GLTFLoader:gltf.GLTFLoader,clone:skel.clone}));
    }
    return modulesPromise;
  }
  async function loadSource(){
    if(!sourcePromise){
      sourcePromise=loadModules().then(async m=>{
        const loader=new m.GLTFLoader();
        const gltf=await loader.loadAsync(MODEL_URL);
        return gltf.scene;
      });
    }
    return sourcePromise;
  }
  function cloneMaterials(root,profile){
    const skinTint=new Map();
    root.traverse?.(node=>{
      if(!node?.isMesh||!node.material)return;
      const mats=Array.isArray(node.material)?node.material:[node.material];
      const cloned=mats.map(mat=>{
        const next=mat.clone();
        const n=`${node.name||''} ${mat.name||''}`.toLowerCase();
        if(next.color){
          if(/shirt|top|dress|cloth|jean|pant|skirt|outfit|wear|sweater|jacket|trouser/.test(n)) next.color.setHex(profile.cloth);
          else if(/skin|body|face|head|arm|leg|hand|foot/.test(n)){
            if(!skinTint.has(mat))skinTint.set(mat,next.color.clone());
          }
        }
        return next;
      });
      node.material=Array.isArray(node.material)?cloned:cloned[0];
    });
  }
  function setExpression(root,profile,t){
    const blink=Math.pow(Math.max(0,Math.sin(t*0.0017+0.6)),28);
    root.traverse?.(node=>{
      if(!node?.morphTargetDictionary||!Array.isArray(node.morphTargetInfluences))return;
      const dict=node.morphTargetDictionary;
      for(const [name,index] of Object.entries(dict)){
        const key=name.toLowerCase().replace(/[^a-z]/g,'');
        if(key.includes('eyeblinkleft')||key.includes('eyeblinkright')) node.morphTargetInfluences[index]=blink;
        else if(key.includes('mouthsmileleft')||key.includes('mouthsmileright')) node.morphTargetInfluences[index]=profile.smile;
        else if(key.includes('cheeksquintleft')||key.includes('cheeksquintright')) node.morphTargetInfluences[index]=profile.smile*0.28;
      }
    });
  }
  function frame(THREE,camera,root){
    const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const h=Math.max(size.y,size.x*1.2),distance=Math.max(1.1,h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov*0.5)))*1.18);
    camera.position.set(center.x,center.y+size.y*0.01,center.z+distance);
    camera.lookAt(center.x,center.y,center.z);
    camera.near=Math.max(.01,distance/100);camera.far=Math.max(30,distance*8);camera.updateProjectionMatrix();
  }
  async function mount(card,profile,index){
    if(runtimes.has(card))return;
    const host=card.querySelector('.creator-preset-3d'); if(!host)return;
    const {THREE,clone}=await loadModules(); const source=await loadSource();
    if(!card.isConnected||!host.isConnected)return;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(28,1,.01,100);
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
    renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    renderer.setClearColor(0x000000,0);host.appendChild(renderer.domElement);
    const hemi=new THREE.HemisphereLight(0xffffff,0x776c78,2.0),key=new THREE.DirectionalLight(0xffffff,2.4),rim=new THREE.DirectionalLight(profile.accent,1.0);
    key.position.set(2,4,3);rim.position.set(-2,2,2);scene.add(hemi,key,rim);
    const root=clone(source);cloneMaterials(root,profile);root.scale.set(profile.sx,profile.sy,profile.sz);root.rotation.y=profile.yaw;scene.add(root);
    const ground=new THREE.Mesh(new THREE.CircleGeometry(.75,48),new THREE.MeshBasicMaterial({color:profile.accent,transparent:true,opacity:.18,depthWrite:false}));
    const box=new THREE.Box3().setFromObject(root),minY=box.min.y;ground.rotation.x=-Math.PI/2;ground.position.y=minY-.006;scene.add(ground);
    frame(THREE,camera,root);
    const runtime={renderer,scene,camera,root,ground,host,profile,index,visible:true,last:0,raf:0,baseY:root.position.y,disposed:false};
    const resize=()=>{if(runtime.disposed)return;const r=host.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    runtime.resize=resize;resize();
    const tick=t=>{
      if(runtime.disposed)return;
      runtime.raf=requestAnimationFrame(tick);
      if(!runtime.visible||document.hidden||!card.isConnected)return;
      if(t-runtime.last<66)return;runtime.last=t;
      if(!reduced){
        const phase=t*.001*profile.pace+index*.7;
        root.position.y=runtime.baseY+Math.sin(phase*1.25)*.006;
        root.rotation.y=profile.yaw+Math.sin(phase*.55)*.035;
        const breath=1+Math.sin(phase*1.7)*.0025;root.scale.set(profile.sx*breath,profile.sy*(1+Math.sin(phase*1.7)*.0018),profile.sz*breath);
        setExpression(root,profile,t+index*173);
        ground.material.opacity=.15+Math.sin(phase)*.035;
      }
      renderer.render(scene,camera);
    };
    runtime.raf=requestAnimationFrame(tick);runtimes.set(card,runtime);
  }
  function dispose(card){
    const r=runtimes.get(card);if(!r)return;r.disposed=true;cancelAnimationFrame(r.raf);r.renderer?.dispose?.();r.renderer?.domElement?.remove?.();runtimes.delete(card);
  }
  const io=new IntersectionObserver(entries=>{for(const e of entries){const card=e.target;if(e.isIntersecting){const p=profileFor(card);mount(card,p.profile,p.index).then(()=>{const r=runtimes.get(card);if(r)r.visible=true;});}else{const r=runtimes.get(card);if(r)r.visible=false;setTimeout(()=>{const now=runtimes.get(card);if(now&&!now.visible)dispose(card);},1800);}}},{rootMargin:'100px 0px 100px 0px',threshold:.05});

  function profileFor(card){const name=card.dataset.preset||'';let index=PROFILES.findIndex(p=>p.name===name);if(index<0)index=[...card.parentElement?.children||[]].indexOf(card)%PROFILES.length;return{profile:PROFILES[index]||PROFILES[0],index};}
  function decorate(){
    const studio=document.getElementById('roleCreatorStudio');if(!studio)return;
    const cards=[...studio.querySelectorAll('button[data-preset]')];if(!cards.length)return;
    for(const [index,card] of cards.entries()){
      if(card.dataset.full3d==='1')continue;
      const name=card.dataset.preset||PROFILES[index]?.name||'3D预设';
      const text=(card.querySelector('small')?.textContent||'').trim();
      card.dataset.full3d='1';card.classList.add('creator-preset-3d-card');
      if(name===selectedPreset)card.classList.add('selected');
      card.innerHTML=`<div class="creator-preset-3d" aria-hidden="true"><span class="creator-preset-loading">3D</span></div><div class="creator-preset-copy"><b>${name}</b><small>${text}</small></div>`;
      card.addEventListener('click',()=>{selectedPreset=name;queueMicrotask(decorate);},{once:false});
      io.observe(card);
    }
  }
  const style=document.createElement('style');style.id='creatorPreset3DStyles';style.textContent=`
    .creator-grid:has(.creator-preset-3d-card){grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
    .creator-preset-3d-card{position:relative!important;min-height:238px!important;padding:0!important;overflow:hidden!important;border-radius:16px!important;background:linear-gradient(180deg,#f7f4f7 0%,#f1edf1 72%,#fff 72%)!important;display:block!important;text-align:left!important;isolation:isolate}
    .creator-preset-3d-card.selected{border-color:#d75f91!important;box-shadow:0 0 0 2px rgba(215,95,145,.14),0 12px 28px rgba(80,50,65,.10)!important}
    .creator-preset-3d{height:176px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 68%,rgba(255,255,255,.96),rgba(238,231,237,.55) 48%,rgba(225,219,227,.32));pointer-events:none}
    .creator-preset-3d canvas{display:block;width:100%!important;height:100%!important;filter:saturate(.98) contrast(1.02)}
    .creator-preset-3d:after{content:'';position:absolute;inset:auto 13% 8px;height:18px;border-radius:50%;background:radial-gradient(ellipse,rgba(85,61,72,.14),transparent 72%);pointer-events:none}
    .creator-preset-loading{position:absolute;inset:0;display:grid;place-items:center;font-size:11px;letter-spacing:.12em;color:#9a8b92}
    .creator-preset-3d canvas+.creator-preset-loading,.creator-preset-3d:has(canvas) .creator-preset-loading{display:none}
    .creator-preset-copy{min-height:62px;padding:8px 9px 9px;background:rgba(255,255,255,.94);display:flex;flex-direction:column;gap:2px;justify-content:center}
    .creator-preset-copy b{font-size:13px}.creator-preset-copy small{font-size:10px;line-height:1.25;color:#81727a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    @media(max-width:430px){.creator-preset-3d-card{min-height:224px!important}.creator-preset-3d{height:164px}.creator-preset-copy{min-height:60px}}
  `;document.head.appendChild(style);

  const mo=new MutationObserver(()=>requestAnimationFrame(decorate));
  function boot(){const studio=document.getElementById('roleCreatorStudio');if(!studio){setTimeout(boot,80);return;}mo.observe(studio,{childList:true,subtree:true});decorate();}
  window.addEventListener('resize',()=>{for(const r of runtimes.values())r.resize?.();},{passive:true});
  document.addEventListener('visibilitychange',()=>{for(const r of runtimes.values())r.visible=!document.hidden&&r.host?.offsetParent!==null;});
  boot();
})();