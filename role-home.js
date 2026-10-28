(() => {
 'use strict';
 const KEY='sirole_role_home_v1';let current=null,tab='appearance';
 const main=document.querySelector('.chat-main');if(!main)return;
 const panel=document.createElement('section');panel.id='roleHome';panel.hidden=true;panel.setAttribute('aria-label','3D角色主页');main.append(panel);
 const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 function button(text,fn,className='btn btn-outline'){const b=el('button',text,className);b.type='button';b.addEventListener('click',fn);return b;}
 function close(){panel.hidden=true;main.classList.remove('role-home-open');try{localStorage.removeItem(KEY);}catch{}window.__ROLE_HUMAN_RENDERER?.resize?.();document.getElementById('userInput')?.focus();}
 function edit(step){const id=current.id;close();openModal(id);requestAnimationFrame(()=>window.RoleCreatorWizard.goTo(step));}
 function render(){
  const r=window.RoleVisualRecipe.forCharacter(current);panel.replaceChildren();
  const top=el('div',undefined,'rh-heading');top.append(el('h2',current.name+' · '+r.age),button('重置镜头',()=>window.RoleStageControls?.resetView?.(window.RoleStageControls.stateFor(window.__ROLE_HUMAN_RENDERER))));panel.append(top,el('p',r.relationship+' · '+r.outfit+' · 工作室','rh-meta'));
  const tabs=el('div',undefined,'rh-tabs');tabs.setAttribute('role','tablist');
  for(const [key,label] of [['appearance','外观'],['personality','个性']]){const b=button(label,()=>{tab=key;render();});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===key));tabs.append(b);}panel.append(tabs);
  const list=el('div',undefined,'rh-fields');list.setAttribute('role','tabpanel');
  const body=Object.entries(window.RoleVisualRecipe.BODY_DETAILS).map(([key,label])=>[label,r.bodyDetails[key],3]);
  const details=String(current.personality||'').replace(/【角色自定义设定】[\s\S]*?【自定义设定结束】/g,'').trim();
  const rows=tab==='appearance'?[['人物类型',r.archetype,1],['肤色',r.skin,1],['发型',r.hair,2],['发色',r.hairColor,2],['左眼颜色',r.eyeColor,2],['右眼颜色',r.heterochromia?r.eyeColorRight:r.eyeColor,2],['发光眼',r.eyeGlow?'开启':'关闭',2],['体型',r.body,3],['身高',r.heightCm+' cm',3],['体重',r.weightJin+' 斤',3],...body,['服装',r.outfit,1],['配饰',r.accessory,1]]:[['声音',r.voiceStyle,4],['个性',r.personality.join('、'),4],['职业',r.profession||'未填写',4],['关系',r.relationship,4],['爱好',current.interests||'未填写',4],['问候语',current.greeting,4],['对话场景',r.scene||'未填写',4],['更多性格细节',details||'未填写',4]];
  for(const [label,value,step] of rows){const b=button('',()=>edit(step),'cw-detail');b.append(el('span',label),el('b',String(value)),el('span','编辑 ›'));list.append(b);}panel.append(list,button('开始聊天',close,'btn btn-primary rh-chat'));
 }
 function show(char){if(!char||char.isPreset||char.roleKind!=='3d')return false;current=char;tab='appearance';render();panel.hidden=false;main.classList.add('role-home-open');try{localStorage.setItem(KEY,char.id);}catch{}window.RoleFullscreenStage?.mountStage?.(window.__ROLE_HUMAN_RENDERER);return true;}
 window.RoleHome=Object.freeze({show,close});
 // Preserve the selected view, but never resurrect a deleted or different active role.
 try{const id=localStorage.getItem(KEY);if(id&&typeof characters!=='undefined'&&typeof activeCharacterId!=='undefined'&&id===activeCharacterId){const char=characters.find(c=>c.id===id);if(char)show(char);}}catch{}
})();
