(() => {
  'use strict';
  // Face regions are independently redrawn from the original portrait.
  // This is lightweight photo-based animation, NOT a Live2D model or rendered video.
  const LANDMARKS=Object.freeze({
    nuannuan:[.399,.420,.601,.420,.50,.610],
    linwan:[.402,.398,.600,.398,.516,.595],
    sutang:[.397,.422,.603,.421,.508,.618],
    xuzhixia:[.399,.423,.602,.424,.504,.619],
    yeqingge:[.399,.422,.602,.420,.504,.617],
    lingyi:[.400,.423,.597,.422,.507,.619],
    luchen:[.404,.422,.593,.423,.505,.621],
    taiyang:[.402,.428,.598,.427,.506,.636],
    shenyan:[.402,.423,.597,.420,.506,.620],
    guyan:[.400,.425,.593,.425,.507,.615],
    jiangyu:[.400,.433,.598,.433,.513,.645],
    yunzhou:[.401,.425,.598,.425,.503,.624]
  });
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
  function portraitGeometry(iw,ih,cw,ch){
    const scale=Math.max(cw/Math.max(1,iw),ch/Math.max(1,ih));
    const width=iw*scale,height=ih*scale;
    return {x:(cw-width)*.5,y:(ch-height)*.21,width,height,scale};
  }
  function toneFor(text){
    const t=String(text||'').slice(-400);
    if(/(哈哈|喜欢|开心|高兴|笑|爱你|想你|谢谢)/.test(t))return 'happy';
    if(/(难过|伤心|抱歉|失望|担心|委屈)/.test(t))return 'gentle';
    return 'neutral';
  }
  let scene=null,canvas=null,ctx=null,active=false,image=null,character=null,token=0,raf=0,last=0;
  let emotion='neutral',reply='',isLost=false,observer=null;
  const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
  const hasFace=()=>Boolean(character&&LANDMARKS[character.id]);
  function clear(){if(ctx&&canvas)ctx.clearRect(0,0,canvas.width,canvas.height);}
  function resize(){
    if(!scene||!canvas)return;
    const rect=scene.getBoundingClientRect();
    const ratio=clamp(window.devicePixelRatio||1,1,1.5);
    const width=Math.max(1,Math.min(1080,Math.floor(rect.width*ratio)));
    const height=Math.max(1,Math.min(1440,Math.floor(rect.height*ratio)));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    if(ctx)ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  function blinkEye(px,py,rx,ry,blink,geometry){
    if(blink<.015||!image)return;
    const sx=(px-geometry.x)/geometry.scale,sy=(py-geometry.y)/geometry.scale;
    const sw=rx*2/geometry.scale,sh=ry*2/geometry.scale;
    ctx.save();ctx.beginPath();ctx.ellipse(px,py,rx,ry,0,0,Math.PI*2);ctx.clip();
    ctx.globalAlpha=Math.min(.96,blink*.93);
    // Rebuild a moving eyelid using nearby cheek skin, not scaling the entire image.
    ctx.drawImage(image,Math.max(0,sx-sw*.5),Math.min(image.naturalHeight-sh,sy+sh*.85),
      Math.min(sw,image.naturalWidth),Math.min(sh,image.naturalHeight),
      px-rx,py-ry,rx*2,ry*2);
    ctx.restore();
    ctx.save();ctx.globalAlpha=blink*.68;ctx.lineWidth=Math.max(1,rx*.048);
    ctx.strokeStyle='rgba(58,30,38,.78)';
    ctx.beginPath();ctx.moveTo(px-rx*.84,py);ctx.quadraticCurveTo(px,py+ry*.19,px+rx*.85,py);ctx.stroke();ctx.restore();
  }
  function mouth(px,py,rx,ry,amount){
    if(amount<.04)return;
    const open=clamp(amount,0,1);
    const h=ry*(.75+open*.9);
    ctx.save();ctx.globalAlpha=open*.82;
    ctx.fillStyle='#482027';
    ctx.beginPath();ctx.ellipse(px,py,rx*.64,h,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=open*.5;ctx.strokeStyle='#b66b72';
    ctx.lineWidth=Math.max(1.3,rx*.10);ctx.stroke();
    ctx.restore();
  }
  function draw(timestamp){
    raf=0;
    if(!active||!image||!hasFace()||!ctx||document.hidden)return;
    if(timestamp-last>=45){
      last=timestamp;
      resize();
      const rect=scene.getBoundingClientRect();
      const g=portraitGeometry(image.naturalWidth,image.naturalHeight,rect.width,rect.height);
      const a=LANDMARKS[character.id];
      const presence=window.RolePresence?.getDefault?.();
      const f=presence?.frame?.(timestamp)||{};
      const blink=clamp(f.blink||0,0,1);
      const speech=f.state==='speaking';
      const voiceWeights=f.visemes||{};
      const aligned=Math.max(0,...['aa','E','ih','oh','ou'].map(k=>Number(voiceWeights[k])||0));
      // When a TTS engine supplies no phonemes, this is approximate mouth movement,
      // never represented as frame-accurate lip sync.
      const approximate=.24+Math.abs(Math.sin(timestamp*.014)*Math.sin(timestamp*.0047))*.68;
      const talking=speech?clamp(aligned||approximate,0,1):0;
      const center=(x,y)=>[g.x+x*g.width,g.y+y*g.height];
      clear();ctx.setTransform(clamp(window.devicePixelRatio||1,1,1.5),0,0,clamp(window.devicePixelRatio||1,1,1.5),0,0);
      const left=center(a[0],a[1]),right=center(a[2],a[3]),lips=center(a[4],a[5]);
      blinkEye(left[0],left[1],g.width*.054,g.height*.017,blink,g);
      blinkEye(right[0],right[1],g.width*.054,g.height*.017,blink,g);
      mouth(lips[0],lips[1],g.width*.031,g.height*.0085,talking);
      if(emotion==='happy'&&talking>.2){
        ctx.save();ctx.globalAlpha=.17*talking;ctx.lineWidth=1.3;ctx.strokeStyle='#c77385';
        ctx.beginPath();ctx.arc(lips[0],lips[1],g.width*.053,.13*Math.PI,.87*Math.PI);ctx.stroke();ctx.restore();
      }
    }
    if(active&&!document.hidden)raf=requestAnimationFrame(draw);
  }
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}clear();}
  function setCharacter(char){
    if(!char||!char.avatar){stop();image=null;character=null;return false;}
    if(character?.id===char.id&&character?.avatar===char.avatar&&image){
      if(active&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);
      return true;
    }
    stop();character=char;image=null;emotion='neutral';reply='';
    if(!hasFace())return false;
    const request=++token,img=new Image();
    img.decoding='async';
    const url=String(char.avatar);
    if(!url.startsWith('assets/avatars/'))return false;
    img.onload=()=>{
      if(request!==token||!active||character?.id!==char.id)return;
      image=img;resize();if(!document.hidden&&!raf)raf=requestAnimationFrame(draw);
    };
    img.onerror=()=>{if(request===token){image=null;clear();}};
    img.src=url;
    return true;
  }
  function setActive(on){
    active=Boolean(on);
    if(!active){token++;stop();return;}
    if(!ctx)return;
    const selected=typeof characters!=='undefined'?characters.find(c=>c.id===activeCharacterId):null;
    if(selected)setCharacter(selected);
  }
  function setReply(value){
    const text=String(value||'');
    if(text===reply)return;
    reply=text;emotion=toneFor(text);
  }
  function boot(){
    scene=document.querySelector('.rd-chat-scene');
    if(!scene)return false;
    canvas=document.createElement('canvas');canvas.className='rd-face-canvas';canvas.setAttribute('aria-hidden','true');
    scene.appendChild(canvas);ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return false;
    if(typeof ResizeObserver==='function'){observer=new ResizeObserver(resize);observer.observe(scene);}
    else window.addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(active&&image&&!raf)raf=requestAnimationFrame(draw);});
    setActive(document.body.classList.contains('role-chat-immersive'));
    return true;
  }
  const api=Object.freeze({LANDMARKS,portraitGeometry,toneFor,setCharacter,setActive,setReply,boot});
  if(typeof window!=='undefined'){
    window.RoleFaceLive=api;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();