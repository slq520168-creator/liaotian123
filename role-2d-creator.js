(() => {
  'use strict';
  // 2D role authoring reuses the existing role schema, storage and chat engine.
  // It does not modify or delete the 3D Studio and never creates a second chat runtime.
  let modal=null,form=null,avatar=null,submit=null,avatarInput=null,chooser=null,templateGrid=null,chooserStatus=null,backButton=null;
  let selectedStyle='',templateOrigin='',entryActions=null,templateSeed=null,avatarRequest=0;
  const cartoonTemplates=()=>typeof characters!=='undefined'?characters.filter(c=>c.isPreset&&c.animeOriginal&&!c.portraitDraft):ORIGINAL_ANIME_ROLES;
  let editingId='',avatarSrc='',avatarBusy=false,previousFocus=null;
  const get=id=>document.getElementById(id);
  const text=(tag,className,label)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(label!==undefined)node.textContent=label;
    return node;
  };
  function field(id,label,tag='input',max=120,placeholder=''){
    const wrap=text('label','r2-field');
    wrap.setAttribute('for','r2-'+id);
    wrap.appendChild(text('span','r2-label',label));
    const control=document.createElement(tag);
    control.id='r2-'+id;
    if(tag==='input')control.type='text';
    else control.rows=id==='personality'?5:2;
    control.maxLength=max;
    control.placeholder=placeholder;
    if(['name','tag','greeting','personality'].includes(id))control.required=true;
    wrap.appendChild(control);
    return wrap;
  }
  function controls(){
    if(modal)return;
    modal=text('div','r2-overlay');
    modal.id='role2dOverlay';modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    const dialog=text('section','r2-dialog');
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','r2-title');
    const header=text('header','r2-header');
    const title=text('div','r2-titles');
    const h=text('h2','','创建角色');h.id='r2-title';title.append(h);
    const close=text('button','r2-close','×');close.type='button';close.setAttribute('aria-label','关闭角色创建');close.addEventListener('click',hide);
    backButton=text('button','r2-back','‹ 返回');backButton.type='button';backButton.hidden=true;backButton.addEventListener('click',showChooser);
    header.append(backButton,title,close);
    form=text('form','r2-form');form.id='role2dForm';form.noValidate=false;
    const group=text('div','r2-avatar-group');
    avatar=document.createElement('img');avatar.id='r2-avatar';avatar.alt='当前角色头像预览';avatar.src='assets/avatars/nuannuan-portrait.jpg';
    const upload=text('label','r2-upload');
    upload.textContent='更换头像';
    avatarInput=document.createElement('input');avatarInput.type='file';avatarInput.accept='image/png,image/jpeg,image/webp,image/avif';
    avatarInput.id='r2-avatar-input';avatarInput.setAttribute('aria-label','上传当前角色头像');avatarInput.hidden=true;upload.appendChild(avatarInput);
    const note=text('span','r2-avatar-note','可使用相册照片；头像只用于你创建的角色。');
    const stack=text('div','r2-upload-stack');stack.append(upload,note);group.append(avatar,stack);
    const grid=text('div','r2-fields');
    grid.append(field('name','角色名字','input',12,'给角色一个名字'));
    grid.append(field('tag','一句话标签','input',20,'例如：温柔沉稳'));
    const genderWrap=text('label','r2-field');
    genderWrap.append(text('span','r2-label','人物设定'));
    const select=text('select','');select.id='r2-gender';
    for(const [value,label] of [['female','女性'],['male','男性'],['unspecified','其他／不指定']]){
      const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);
    }
    genderWrap.appendChild(select);
    const ageWrap=field('age','年龄（成年角色）','input',3);
    ageWrap.querySelector('input').type='number';ageWrap.querySelector('input').min='18';ageWrap.querySelector('input').max='100';ageWrap.querySelector('input').value='24';
    grid.append(genderWrap,ageWrap);
    const basics=text('div','r2-fields-wide');
    basics.append(field('greeting','第一句话','textarea',300,'角色第一次见面会说什么？'));
    basics.append(field('personality','性格与人设','textarea',12000,'身份、性格、习惯、说话方式和独有的性格特点。'));
    basics.append(field('background','人物背景','textarea',600,'生活背景、故事设定和过去经历。'));
    basics.append(field('interests','兴趣爱好','input',240,'角色自己的兴趣'));
    basics.append(field('voice','说话语气','textarea',240,'例如：成熟、直接、有幽默感。'));
    basics.append(field('relationship','相处关系','textarea',300,'初始关系、距离感和交流边界。'));
    basics.append(field('video','人物视频（HTTPS）','input',900,'https://.../role.mp4'));
    const error=text('p','r2-error');error.id='r2-error';error.setAttribute('role','alert');error.hidden=true;
    const footer=text('footer','r2-footer');
    const cancel=text('button','r2-cancel','取消');cancel.type='button';cancel.addEventListener('click',hide);
    submit=text('button','r2-save','保存角色');submit.type='submit';
    footer.append(cancel,submit);
    form.append(group,grid,basics,error,footer);
    chooser=text('div','r2-chooser');
    entryActions=text('div','r2-entry-actions');
    const entries=[
      ['realistic','写实人物','assets/role-portraits/intl-rosalie.webp'],
      ['cartoon','卡通人物',ORIGINAL_ANIME_ROLES[0].avatar],
      ['free','自由创建','＋'],
      ['import','上传角色卡 / 代码','⇧']
    ];
    for(const [key,label,visual] of entries){
      const button=text('button','r2-entry');button.type='button';button.dataset.entry=key;
      if(key==='realistic'||key==='cartoon'){
        const cover=document.createElement('img');cover.src=visual;cover.alt='';button.append(cover);
      }else{
        const icon=text('span','r2-entry-icon',visual);icon.setAttribute('aria-hidden','true');button.append(icon);
      }
      button.append(text('strong','',label));
      button.addEventListener('click',()=>{
        if(key==='import'){hide();openRoleCodeEditor('');return}
        if(key==='free'){showForm(null,false);return}
        selectedStyle=key;entryActions.hidden=true;templateGrid.hidden=false;backButton.hidden=false;
        get('r2-title').textContent=label;renderTemplates();chooser.scrollTop=0;backButton.focus();
      });
      entryActions.append(button);
    }
    chooserStatus=text('p','r2-error');chooserStatus.hidden=true;chooserStatus.setAttribute('role','alert');
    templateGrid=text('div','r2-template-grid');
    chooser.append(entryActions,chooserStatus,templateGrid);
    dialog.append(header,chooser,form);modal.append(dialog);
    document.body.appendChild(modal);
    modal.addEventListener('pointerdown',event=>{if(event.target===modal)hide();});
    avatarInput.addEventListener('change',onAvatar);
    form.addEventListener('submit',save);
    document.addEventListener('keydown',event=>{if(!modal.hidden&&event.key==='Escape'){event.preventDefault();hide();}});
  }
  function error(message){
    const el=get('r2-error');if(!el)return;
    el.textContent=message||'';el.hidden=!message;
  }
  function hide(){
    if(!modal||modal.hidden)return;
    modal.hidden=true;modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('r2-editor-open');
    editingId='';avatarBusy=false;avatarRequest++;
    avatarInput.value='';error('');
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function chooseTemplate(item,customize){
    if(customize){showForm(item,false);return}
    try{
      const role=normalizeCustomCharacter({...item,id:'custom_'+makeId(),roleKind:'2d',templateOrigin:item.id});
      if(!role)throw new Error('角色模板不完整。');
      commitCustomCharacters([role]);hide();window.RoleDiscovery?.refresh?.();window.RoleDiscovery?.openChat?.(role.id);
    }catch(e){chooserStatus.textContent=String(e?.message||'角色保存失败');chooserStatus.hidden=false}
  }
  function renderTemplates(){
    const list=selectedStyle==='cartoon'?cartoonTemplates():(typeof characters!=='undefined'?characters.filter(c=>c.isPreset&&!c.portraitDraft&&!c.illustratedFullBody&&!c.animeOriginal&&(c.photoRealistic===true||/^assets\/role-portraits\/.*\.webp$/i.test(c.avatar||''))):[]);
    templateGrid.replaceChildren();
    for(const item of list){
      const card=text('article','r2-template-card'),img=document.createElement('img');
      img.src=item.avatar;img.alt=item.name;img.loading='lazy';img.decoding='async';if(item.illustratedFullBody)img.classList.add('r2-full-art');
      const copy=text('div','r2-template-info');copy.append(text('strong','',item.name),text('span','',item.tag));
      const row=text('div','r2-template-actions');
      const use=text('button','r2-template-use','直接使用');use.type='button';use.addEventListener('click',()=>chooseTemplate(item,false));
      const edit=text('button','r2-template-edit','自定义');edit.type='button';edit.addEventListener('click',()=>chooseTemplate(item,true));row.append(use,edit);
      card.append(img,copy,row);templateGrid.append(card);
    }
    if(!list.length)templateGrid.append(text('p','r2-avatar-note','暂无此风格的角色模板。'));
  }
  function showChooser(){
    editingId='';templateOrigin='';templateSeed=null;selectedStyle='';entryActions.hidden=false;templateGrid.hidden=true;templateGrid.replaceChildren();form.hidden=true;chooser.hidden=false;backButton.hidden=true;get('r2-title').textContent='创建角色';chooserStatus.hidden=true;chooser.scrollTop=0;entryActions.querySelector('button').focus({preventScroll:true});
  }
  function open(roleId=''){
    if(!modal)controls();
    const item=typeof characters!=='undefined'?characters.find(c=>!c.isPreset&&c.id===roleId):null;
    if(item?.roleKind==='3d')return false;
    previousFocus=document.activeElement;
    modal.hidden=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('r2-editor-open');
    if(item)showForm(item,true);else showChooser();return true;
  }
  function showForm(item,editing){
    chooser.hidden=true;form.hidden=false;backButton.hidden=editing;
    form.reset();templateSeed=item;avatarRequest++;submit.disabled=false;editingId=editing?item?.id||'':'';templateOrigin=editing?item?.templateOrigin||'':item?.id||'';avatarBusy=false;
    avatarSrc=item?.avatar||'assets/avatars/nuannuan-portrait.jpg';avatar.src=avatarSrc;
    for(const id of ['name','tag','greeting','personality','background','interests','voice','relationship','video']){
      get('r2-'+id).value=typeof item?.[id]==='string'?item[id]:'';
    }
    for(const id of ['name','tag','greeting','personality','background','interests','voice','relationship']){
      const input=get('r2-'+id);
      input.dataset.normalLimit ||= String(input.maxLength);
      if(item?.roleSource==='code')input.removeAttribute('maxlength');
      else input.maxLength=Number(input.dataset.normalLimit);
    }
    get('r2-gender').value=item?.gender||'female';
    get('r2-age').value=String(item?.age||24);
    get('r2-title').textContent=editing?'编辑角色':item?'自定义人物':'自由创建';
    submit.textContent=editing?'保存修改':'创建角色';
    error('');
    modal.hidden=false;modal.setAttribute('aria-hidden','false');
    document.body.classList.add('r2-editor-open');
    requestAnimationFrame(()=>get('r2-name').focus({preventScroll:true}));
    return true;
  }
  async function onAvatar(){
    const file=avatarInput.files?.[0];if(!file)return;
    if(!/^image\/(png|jpeg|webp|avif)$/.test(file.type)||file.size>20*1024*1024){
      error('请选择 20MB 以内的 JPG、PNG、WebP 或 AVIF 照片。');return;
    }
    const request=++avatarRequest;avatarBusy=true;submit.disabled=true;error('');
    try{
      if(typeof readAlbumAvatar!=='function')throw new Error('图片上传组件尚未加载。');
      const data=await readAlbumAvatar(file);
      if(modal.hidden||request!==avatarRequest)return;
      avatarSrc=data;avatar.src=data;
    }catch(e){if(request===avatarRequest)error(String(e?.message||'图片读取失败'));}
    finally{if(request===avatarRequest){avatarBusy=false;submit.disabled=false;avatarInput.value='';}}
  }
  function save(event){
    event.preventDefault();
    if(avatarBusy)return;
    if(typeof normalizeCustomCharacter!=='function'||typeof commitCustomCharacters!=='function')return error('角色系统尚未加载，请刷新页面。');
    const existing=typeof characters!=='undefined'?characters.find(char=>char.id===editingId&&!char.isPreset):null;
    const age=Number(get('r2-age').value);
    if(!Number.isInteger(age)||age<18||age>100)return error('角色年龄需要在 18–100 岁之间。');
    const raw={
      ...(existing||templateSeed||{}),
      id:editingId||(typeof makeId==='function'?'custom_'+makeId():'custom_'+Date.now().toString(36)),
      roleKind:'2d',templateOrigin,
      name:get('r2-name').value,tag:get('r2-tag').value,greeting:get('r2-greeting').value,
      personality:get('r2-personality').value,background:get('r2-background').value,
      interests:get('r2-interests').value,voice:get('r2-voice').value,
      relationship:get('r2-relationship').value,video:get('r2-video').value,gender:get('r2-gender').value,
      age,avatar:avatarSrc,
      portraitGallery:avatarSrc===(existing||templateSeed)?.avatar?(existing||templateSeed)?.portraitGallery||[]:[]
    };
    if(raw.video.trim()&&!/^https:\/\/[^\s]{1,900}$/i.test(raw.video.trim()))return error('需要有效的 HTTPS 视频链接。');
    const normalized=normalizeCustomCharacter(raw);
    if(!normalized)return error('请填写角色姓名、介绍、开场白与人设。');
    normalized.roleKind='2d';
    try{
      commitCustomCharacters([normalized],editingId);
      hide();
      window.RoleDiscovery?.refresh?.();
      window.RoleDiscovery?.openChat?.(normalized.id);
    }catch(e){error(String(e?.message||'角色保存失败。'));}
  }
  const api=Object.freeze({open,hide});
  if(typeof window!=='undefined')window.Role2DCreator=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',controls,{once:true});
    else controls();
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();