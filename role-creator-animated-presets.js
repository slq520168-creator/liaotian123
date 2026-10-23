(() => {
  'use strict';

  const PRESETS = Object.freeze({
    '自然陪伴': {image:'assets/avatars/linwan-portrait.jpg', motion:'breathe', accent:'soft'},
    '温柔治愈': {image:'assets/avatars/nuannuan-portrait.jpg', motion:'float', accent:'warm'},
    '成熟知性': {image:'assets/avatars/shenyan-portrait.jpg', motion:'focus', accent:'deep'},
    '元气活泼': {image:'assets/avatars/taiyang-portrait.jpg', motion:'lively', accent:'bright'},
    '清冷克制': {image:'assets/avatars/yeqingge-portrait.jpg', motion:'drift', accent:'cool'},
    '沉稳低调': {image:'assets/avatars/yunzhou-portrait.jpg', motion:'calm', accent:'neutral'}
  });

  let selectedPreset = '自然陪伴';
  let observer = null;

  function addStyle(){
    if(document.getElementById('creatorAnimatedPresetStyle')) return;
    const style=document.createElement('style');
    style.id='creatorAnimatedPresetStyle';
    style.textContent=`
      #roleCreatorStudio .creator-grid:has(.creator-card[data-preset]){grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #roleCreatorStudio .creator-card[data-preset]{position:relative;display:flex;min-height:220px;padding:0;overflow:hidden;justify-content:flex-end;background:#121014;border:1px solid rgba(255,255,255,.15);color:#fff;isolation:isolate;box-shadow:0 7px 22px rgba(42,26,35,.10);transform:translateZ(0);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
      #roleCreatorStudio .creator-card[data-preset]>b,#roleCreatorStudio .creator-card[data-preset]>small{position:relative;z-index:4;margin-left:11px;margin-right:11px;text-shadow:0 1px 8px rgba(0,0,0,.5)}
      #roleCreatorStudio .creator-card[data-preset]>b{font-size:14px;margin-top:auto;margin-bottom:2px}
      #roleCreatorStudio .creator-card[data-preset]>small{font-size:10.5px;line-height:1.35;color:rgba(255,255,255,.80);margin-bottom:11px}
      #roleCreatorStudio .creator-card[data-preset]::after{content:"";position:absolute;inset:42% 0 0;z-index:2;background:linear-gradient(180deg,transparent,rgba(11,8,11,.30) 24%,rgba(11,8,11,.88) 100%);pointer-events:none}
      #roleCreatorStudio .creator-preset-media{position:absolute;inset:0;z-index:0;overflow:hidden;background:linear-gradient(145deg,#ece5e9,#bdb1b8)}
      #roleCreatorStudio .creator-preset-media img{width:100%;height:100%;display:block;object-fit:cover;object-position:center 22%;transform:scale(1.075);will-change:transform;backface-visibility:hidden}
      #roleCreatorStudio .creator-preset-glow{position:absolute;inset:-25%;background:radial-gradient(circle at 50% 32%,rgba(255,255,255,.30),transparent 38%);mix-blend-mode:screen;opacity:.7;pointer-events:none;animation:creatorPresetGlow 4.8s ease-in-out infinite}
      #roleCreatorStudio .creator-preset-sheen{position:absolute;top:-25%;bottom:-25%;left:-55%;width:34%;transform:skewX(-16deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.20),transparent);pointer-events:none;animation:creatorPresetSheen 6.8s ease-in-out infinite}
      #roleCreatorStudio .creator-preset-live{position:absolute;top:9px;left:9px;z-index:3;width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.18),0 0 14px rgba(255,255,255,.65);font-size:0;animation:creatorPresetLive 1.9s ease-in-out infinite}
      #roleCreatorStudio .creator-card[data-preset].is-selected{border-color:#ff7cad;box-shadow:0 0 0 2px rgba(255,124,173,.24),0 10px 28px rgba(79,30,50,.20);transform:translateY(-2px)}
      #roleCreatorStudio .creator-card[data-preset].is-selected .creator-preset-media img{filter:saturate(1.06) contrast(1.025)}
      #roleCreatorStudio .creator-card[data-preset][data-motion="breathe"] .creator-preset-media img{animation:creatorPresetBreathe 5.6s ease-in-out infinite}
      #roleCreatorStudio .creator-card[data-preset][data-motion="float"] .creator-preset-media img{animation:creatorPresetFloat 6.4s ease-in-out infinite}
      #roleCreatorStudio .creator-card[data-preset][data-motion="focus"] .creator-preset-media img{animation:creatorPresetFocus 7.2s ease-in-out infinite}
      #roleCreatorStudio .creator-card[data-preset][data-motion="lively"] .creator-preset-media img{animation:creatorPresetLively 4.4s ease-in-out infinite}
      #roleCreatorStudio .creator-card[data-preset][data-motion="drift"] .creator-preset-media img{animation:creatorPresetDrift 6.8s ease-in-out infinite}
      #roleCreatorStudio .creator-card[data-preset][data-motion="calm"] .creator-preset-media img{animation:creatorPresetCalm 8s ease-in-out infinite}
      #roleCreatorStudio .creator-card[data-preset].creator-preset-paused .creator-preset-media img,#roleCreatorStudio .creator-card[data-preset].creator-preset-paused .creator-preset-glow,#roleCreatorStudio .creator-card[data-preset].creator-preset-paused .creator-preset-sheen,#roleCreatorStudio .creator-card[data-preset].creator-preset-paused .creator-preset-live{animation-play-state:paused!important}
      @keyframes creatorPresetBreathe{0%,100%{transform:scale(1.075) translate3d(0,0,0)}50%{transform:scale(1.095) translate3d(0,-1.2%,0)}}
      @keyframes creatorPresetFloat{0%,100%{transform:scale(1.085) translate3d(-.7%,0,0)}50%{transform:scale(1.105) translate3d(.9%,-1.3%,0)}}
      @keyframes creatorPresetFocus{0%,100%{transform:scale(1.07) translate3d(0,0,0)}50%{transform:scale(1.115) translate3d(0,-.7%,0)}}
      @keyframes creatorPresetLively{0%,100%{transform:scale(1.085) translate3d(-1%,.4%,0) rotate(-.25deg)}35%{transform:scale(1.11) translate3d(1%,-1.5%,0) rotate(.35deg)}70%{transform:scale(1.095) translate3d(.3%,-.5%,0) rotate(0)}}
      @keyframes creatorPresetDrift{0%,100%{transform:scale(1.09) translate3d(-1.2%,0,0)}50%{transform:scale(1.105) translate3d(1.2%,-.7%,0)}}
      @keyframes creatorPresetCalm{0%,100%{transform:scale(1.07) translate3d(0,.4%,0)}50%{transform:scale(1.088) translate3d(0,-.8%,0)}}
      @keyframes creatorPresetGlow{0%,100%{opacity:.48;transform:scale(.98)}50%{opacity:.78;transform:scale(1.04)}}
      @keyframes creatorPresetSheen{0%,55%{left:-55%;opacity:0}64%{opacity:.7}78%,100%{left:125%;opacity:0}}
      @keyframes creatorPresetLive{0%,100%{opacity:.62;transform:scale(.82)}50%{opacity:1;transform:scale(1.05)}}
      @media(max-width:560px){#roleCreatorStudio .creator-card[data-preset]{min-height:205px}}
      @media(max-width:380px){#roleCreatorStudio .creator-grid:has(.creator-card[data-preset]){gap:8px}#roleCreatorStudio .creator-card[data-preset]{min-height:190px}}
      @media(prefers-reduced-motion:reduce){#roleCreatorStudio .creator-preset-media img,#roleCreatorStudio .creator-preset-glow,#roleCreatorStudio .creator-preset-sheen,#roleCreatorStudio .creator-preset-live{animation:none!important}#roleCreatorStudio .creator-card[data-preset]{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function syncSelection(root=document){
    root.querySelectorAll?.('#roleCreatorStudio .creator-card[data-preset]').forEach(card=>{
      card.classList.toggle('is-selected',card.dataset.preset===selectedPreset);
      card.setAttribute('aria-pressed',card.dataset.preset===selectedPreset?'true':'false');
    });
  }

  function decorate(card){
    const preset=PRESETS[card.dataset.preset];
    if(!preset) return;
    card.dataset.motion=preset.motion;
    card.dataset.accent=preset.accent;
    if(!card.querySelector('.creator-preset-media')){
      const media=document.createElement('span');
      media.className='creator-preset-media';
      const img=document.createElement('img');
      img.src=preset.image;
      img.alt='';
      img.loading='eager';
      img.decoding='async';
      img.draggable=false;
      const glow=document.createElement('span'); glow.className='creator-preset-glow';
      const sheen=document.createElement('span'); sheen.className='creator-preset-sheen';
      const live=document.createElement('span'); live.className='creator-preset-live';
      media.append(img,glow,sheen,live);
      card.prepend(media);
    }
    if(card.dataset.preset===selectedPreset) card.classList.add('is-selected');
  }

  function enhance(){
    const cards=[...document.querySelectorAll('#roleCreatorStudio .creator-card[data-preset]')];
    if(!cards.length) return;
    cards.forEach(decorate);
    syncSelection();
    if(!observer && 'IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{
        for(const entry of entries) entry.target.classList.toggle('creator-preset-paused',!entry.isIntersecting);
      },{rootMargin:'80px 0px',threshold:.05});
    }
    if(observer) cards.forEach(card=>observer.observe(card));
  }

  function boot(){
    addStyle();
    enhance();
    const studio=document.getElementById('roleCreatorStudio');
    if(studio){
      new MutationObserver(()=>enhance()).observe(studio,{childList:true,subtree:true});
      studio.addEventListener('click',event=>{
        const card=event.target.closest?.('.creator-card[data-preset]');
        if(!card) return;
        selectedPreset=card.dataset.preset||selectedPreset;
        syncSelection(studio);
      },true);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
