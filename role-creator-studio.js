(() => {
  'use strict';
  const form=document.getElementById('createRoleForm');
  const legacy=document.getElementById('roleBuilder');
  const modal=document.getElementById('createModalOverlay');
  const personality=document.getElementById('rolePersonality');
  if(!form||!legacy||!modal||!personality||document.getElementById('roleCreatorStudio')) return;

  const by=id=>document.getElementById(id);
  const recipeApi=window.RoleVisualRecipe;
  const START='【角色自定义设定】',END='【自定义设定结束】';
  const BLOCK=/【角色自定义设定】\n[\s\S]*?\n【自定义设定结束】/;
  const tabs=[['preset','预设'],['body','外形'],['hair','头发'],['outfit','服装'],['accessory','饰品'],['action','动作'],['expression','表情'],['voiceStyle','语音'],['personality','性格']];
  const list={
    body:['偏瘦','匀称','微胖','丰满','胖','健壮'],face:['自然耐看','圆脸','鹅蛋脸','方脸','长脸','成熟脸','甜美脸'],skin:['偏白','自然肤色','小麦肤色','深肤色'],
    hair:['自然长发','短发','大波浪','卷发','马尾','利落中长发'],outfit:['日常休闲','居家','成熟优雅','通勤','运动','甜美','性感但自然'],accessory:['无','细框眼镜','小耳环','细项链','眼镜+耳环'],
    action:['自然站立','放松呼吸','专注交流','轻微转身'],expression:['自然','微笑','温柔','认真','俏皮'],voiceStyle:['自然','温柔','成熟','活泼','低沉','清爽'],
    relationship:['慢慢熟悉','普通朋友','知心朋友','暧昧对象','恋人','伴侣','姐姐/哥哥型陪伴']
  };
  const presets=[
    ['自然陪伴','耐看、轻松、适合长期聊天',{body:'匀称',face:'自然耐看',hair:'自然长发',outfit:'日常休闲',accessory:'无',action:'自然站立',expression:'自然',voiceStyle:'自然',relationship:'慢慢熟悉'}],
    ['温柔治愈','柔和、会照顾情绪',{body:'匀称',face:'甜美脸',hair:'大波浪',outfit:'居家',accessory:'小耳环',action:'放松呼吸',expression:'温柔',voiceStyle:'温柔',relationship:'知心朋友'}],
    ['成熟知性','沉稳、有判断力',{body:'匀称',face:'成熟脸',hair:'利落中长发',outfit:'成熟优雅',accessory:'细项链',action:'专注交流',expression:'认真',voiceStyle:'成熟',relationship:'普通朋友'}],
    ['元气活泼','轻快、有互动感',{body:'偏瘦',face:'甜美脸',hair:'马尾',outfit:'运动',accessory:'无',action:'轻微转身',expression:'俏皮',voiceStyle:'活泼',relationship:'慢慢熟悉'}],
    ['清冷克制','少废话、边界清楚',{body:'匀称',face:'鹅蛋脸',hair:'短发',outfit:'通勤',accessory:'细框眼镜',action:'专注交流',expression:'认真',voiceStyle:'清爽',relationship:'慢慢熟悉'}],
    ['沉稳低调','节奏慢、表达稳定',{body:'健壮',face:'方脸',hair:'短发',outfit:'日常休闲',accessory:'无',action:'放松呼吸',expression:'自然',voiceStyle:'低沉',relationship:'普通朋友'}]
  ];
  let active='preset';
  let state={accessory:'无',action:'自然站立',expression:'自然',voiceStyle:'自然'};
  const old={height:by('rbHeight'),weight:by('rbWeight'),body:by('rbBody'),face:by('rbFace'),skin:by('rbSkin'),hair:by('rbHair'),outfit:by('rbOutfit'),relation:by('rbRelation'),extra:by('rbExtra')};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const val=key=>key==='relationship'?old.relation?.value:key in state?state[key]:old[key]?.value;
  const emit=el=>{el?.dispatchEvent(new Event('change',{bubbles:true}));el?.dispatchEvent(new Event('input',{bubbles:true}));};
  function set(key,value,shouldRender=true){
    if(key==='relationship'){old.relation.value=value;emit(old.relation);}
    else if(key in state) state[key]=value;
    else if(old[key]){old[key].value=value;emit(old[key]);}
    if(shouldRender)render();
  }
  function choices(key,values,notes={}){return `<div class="creator-grid">${values.map(v=>`<button type="button" class="creator-card${val(key)===v?' selected':''}" data-key="${esc(key)}" data-value="${esc(v)}"><b>${esc(v)}</b>${notes[v]?`<small>${esc(notes[v])}</small>`:''}</button>`).join('')}</div>`;}
  function currentRecipe(){
    return recipeApi?.sanitize?.({heightCm:old.height?.value,weightJin:old.weight?.value,body:old.body?.value,face:old.face?.value,skin:old.skin?.value,hair:old.hair?.value,outfit:old.outfit?.value,accessory:state.accessory,relationship:old.relation?.value,action:state.action,expression:state.expression,voiceStyle:state.voiceStyle})||{...state};
  }
  function capabilityText(){
    const candidates=Array.isArray(window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES)?window.LIAOTIAN_CUSTOM_HUMAN_CANDIDATES:[];
    const selected=window.RoleHumanAssetCapability?.selectCustomAsset?.(candidates);
    return selected?.complete?'3D真人资产已通过完整能力门槛；创建后可在普通聊天 / 3D聊天之间切换。':'现在可以先完整保存外形、动作、表情和语音设计。3D按钮只会在真人资产通过身体、身份脸、表情、口型、头发、服装、移动端与许可证全部验收后出现，不用半成品冒充。';
  }

  const studio=document.createElement('section');
  studio.id='roleCreatorStudio';studio.className='creator-studio';
  legacy.insertAdjacentElement('afterend',studio);
  const style=document.createElement('style');
  style.textContent=`
    #roleBuilder:not(.creator-show-advanced){display:none!important}.creator-studio{grid-column:1/-1;border:1px solid rgba(211,94,139,.18);border-radius:18px;padding:14px;background:linear-gradient(180deg,#fff9fb,#fff);margin:2px 0 6px}.creator-head{display:flex;justify-content:space-between;gap:10px}.creator-head h3{margin:0;font-size:18px}.creator-head p{margin:4px 0 0;font-size:12px;color:#7d6972;line-height:1.45}.creator-tabs{display:flex;gap:6px;overflow-x:auto;padding:12px 0 9px;scrollbar-width:none}.creator-tabs::-webkit-scrollbar{display:none}.creator-tab{flex:none;border:1px solid rgba(80,60,70,.13);background:#fff;border-radius:999px;padding:7px 11px}.creator-tab.active{background:#302930;color:#fff}.creator-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.creator-card{min-height:62px;border:1px solid rgba(80,60,70,.12);border-radius:12px;background:#fff;padding:9px;text-align:left;color:#4d3f46;display:flex;flex-direction:column;justify-content:center;gap:3px}.creator-card small{font-size:10.5px;color:#88747e;line-height:1.3}.creator-card.selected{border-color:#da6e98;background:#fff6fa;box-shadow:0 0 0 1px rgba(218,110,152,.14)}.creator-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.creator-field{display:grid;gap:5px}.creator-field label{font-size:12px;font-weight:650}.creator-field input,.creator-field textarea{width:100%;box-sizing:border-box}.creator-summary{display:flex;flex-wrap:wrap;gap:5px;margin:11px 0}.creator-summary span{font-size:10.5px;border:1px solid rgba(80,60,70,.1);border-radius:999px;padding:4px 7px;background:#fff}.creator-note{font-size:11px;line-height:1.45;color:#75636c;background:#f7f3f5;border-radius:10px;padding:8px 9px}.creator-actions{display:flex;align-items:center;gap:8px;margin-top:10px}.creator-actions .apply{margin-left:auto}.creator-status{font-size:11px;color:#8b6072}.creator-studio .btn-sm{padding:7px 10px}@media(max-width:560px){.creator-studio{padding:12px}.creator-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.creator-fields{grid-template-columns:1fr}}
  `;document.head.appendChild(style);

  function renderBody(){
    if(active==='preset') return choices('preset',[],{}).replace('<div class="creator-grid"></div>',`<div class="creator-grid">${presets.map(([name,note])=>`<button type="button" class="creator-card" data-preset="${esc(name)}"><b>${esc(name)}</b><small>${esc(note)}</small></button>`).join('')}</div>`);
    if(active==='body') return `<div class="creator-fields"><div class="creator-field"><label>身高（cm）</label><input data-number="height" type="number" min="130" max="220" value="${esc(old.height?.value||165)}"></div><div class="creator-field"><label>体重（斤）</label><input data-number="weight" type="number" min="60" max="500" value="${esc(old.weight?.value||110)}"></div></div><h4>体型</h4>${choices('body',list.body)}<h4>脸型</h4>${choices('face',list.face)}<h4>肤色</h4>${choices('skin',list.skin)}`;
    if(active==='hair') return choices('hair',list.hair);
    if(active==='outfit') return choices('outfit',list.outfit);
    if(active==='accessory') return choices('accessory',list.accessory,{'无':'不增加额外几何','细框眼镜':'真实3D镜框，跟随头部骨骼','小耳环':'双侧真实3D圆环','细项链':'真实3D链条与吊坠，跟随颈部骨骼','眼镜+耳环':'同时启用两组轻量几何'});
    if(active==='action') return choices('action',list.action,{'自然站立':'保持骨架rest pose','放松呼吸':'只做极小呼吸起伏','专注交流':'安全微动','轻微转身':'只转根节点，不硬转手臂'});
    if(active==='expression') return choices('expression',list.expression,{'自然':'眨眼/视线/口型保留','微笑':'ARKit嘴角+脸颊','温柔':'轻微眉眼与笑意','认真':'轻微眉眼收紧','俏皮':'不对称嘴角表情'});
    if(active==='voiceStyle') return `${choices('voiceStyle',list.voiceStyle)}<p><button type="button" class="btn btn-outline btn-sm" id="creatorVoicePreview">试听当前风格</button></p>`;
    return `${choices('relationship',list.relationship)}<div class="creator-note" style="margin-top:9px">更细的性格、聊天习惯和额外偏好仍可在“高级人设”里调整，不会丢掉原来的自由度。</div>`;
  }
  function render(){
    const r=currentRecipe();
    studio.innerHTML=`<div class="creator-head"><div><h3>创作中心</h3><p>先选预设，也可以逐项改。服装、饰品、动作、表情和语音都会保存到同一个角色设定。</p></div></div><div class="creator-tabs">${tabs.map(([id,label])=>`<button type="button" class="creator-tab${active===id?' active':''}" data-tab="${id}">${label}</button>`).join('')}</div><div id="creatorBody">${renderBody()}</div><div class="creator-summary">${[`${r.heightCm}cm/${r.weightJin}斤`,r.body,r.face,r.hair,r.outfit,r.accessory,r.action,r.expression,`${r.voiceStyle}语音`].map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="creator-note">${esc(capabilityText())}</div><div class="creator-actions"><button type="button" class="btn btn-outline btn-sm" id="creatorAdvanced">高级人设</button><span class="creator-status" id="creatorStatus"></span><button type="button" class="btn btn-primary btn-sm apply" id="creatorApply">应用设计</button></div>`;
  }
  function applyPreset(name){
    const preset=presets.find(p=>p[0]===name);if(!preset)return;
    Object.entries(preset[2]).forEach(([key,value])=>set(key,value,false));
    active='body';render();
  }
  function augmentBlock(){
    const match=personality.value.match(BLOCK);if(!match)return;
    let block=match[0].split('\n').filter(line=>!/^饰品：|^动作：|^表情：|^语音：/.test(line));
    const index=Math.max(1,block.findIndex(line=>line.startsWith('外形：'))+1);
    block.splice(index,0,`饰品：${state.accessory}。`,`动作：${state.action}。`,`表情：${state.expression}。`,`语音：${state.voiceStyle}。`);
    personality.value=personality.value.replace(match[0],block.join('\n')).slice(0,12000);
  }
  function loadState(){
    const parsed=recipeApi?.fromPersonality?.(personality.value);
    state={accessory:parsed?.accessory||'无',action:parsed?.action||'自然站立',expression:parsed?.expression||'自然',voiceStyle:parsed?.voiceStyle||'自然'};
    render();
  }
  function previewVoice(){
    if(!('speechSynthesis' in window)){by('creatorStatus').textContent='当前浏览器没有语音试听';return;}
    const profile=window.RoleVoiceStyle?.PROFILES?.[state.voiceStyle]||{'自然':{rate:1,pitchDelta:0},'温柔':{rate:.95,pitchDelta:.05},'成熟':{rate:.94,pitchDelta:-.04},'活泼':{rate:1.08,pitchDelta:.08},'低沉':{rate:.92,pitchDelta:-.1},'清爽':{rate:1.03,pitchDelta:.03}}[state.voiceStyle]||{rate:1,pitchDelta:0};
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`你好，我是${by('roleName')?.value.trim()||'你的角色'}。这是现在选择的语音风格。`);u.__creatorPreview=true;const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/^zh/i.test(v.lang))||voices[0]||null;u.lang=u.voice?.lang||'zh-CN';u.rate=profile.rate;u.pitch=Math.max(.65,Math.min(1.35,1+profile.pitchDelta));speechSynthesis.speak(u);
  }

  studio.addEventListener('click',event=>{
    const tab=event.target.closest('[data-tab]');if(tab){active=tab.dataset.tab;render();return;}
    const preset=event.target.closest('[data-preset]');if(preset){applyPreset(preset.dataset.preset);return;}
    const choice=event.target.closest('[data-key]');if(choice){set(choice.dataset.key,choice.dataset.value);return;}
    if(event.target.closest('#creatorVoicePreview')){previewVoice();return;}
    if(event.target.closest('#creatorAdvanced')){legacy.classList.toggle('creator-show-advanced');return;}
    if(event.target.closest('#creatorApply')){augmentBlock();const status=by('creatorStatus');if(status){status.textContent='已应用';setTimeout(()=>{if(status.textContent==='已应用')status.textContent='';},1600);}return;}
  });
  studio.addEventListener('input',event=>{
    if(event.target.dataset.number==='height'){old.height.value=event.target.value;emit(old.height);}
    if(event.target.dataset.number==='weight'){old.weight.value=event.target.value;emit(old.weight);}
    render();
  });
  form.addEventListener('submit',augmentBlock,{capture:true});
  const observer=new MutationObserver(()=>{if(modal.classList.contains('active'))requestAnimationFrame(()=>requestAnimationFrame(loadState));});
  observer.observe(modal,{attributes:true,attributeFilter:['class']});
  const submit=by('createRoleSubmitBtn');if(submit&&!submit.dataset.creatorLabel){submit.dataset.creatorLabel='1';submit.textContent='创建我的角色';}
  render();
})();
