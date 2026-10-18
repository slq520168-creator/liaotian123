(() => {
  const VERSION='20261018-role3d1';
  const ROLE_THEMES={
    nuannuan:['#f28ab2','#7d4766'],
    linwan:['#b23d69','#54283d'],
    sutang:['#ff8cac','#8f476d'],
    xuzhixia:['#6e9bd7','#4d5f8f'],
    yeqingge:['#e35d56','#70343e'],
    lingyi:['#b28adf','#5f4b82'],
    luchen:['#6d8fc8','#3f526f'],
    taiyang:['#f0a54f','#80542f'],
    shenyan:['#7086a8','#3f495d'],
    guyan:['#9b7a67','#5e4b42'],
    jiangyu:['#4ca7c8','#32657b'],
    yunzhou:['#8c7967','#4f493f']
  };
  const EMOJI_GROUPS=[
    ['心情',['😊','😄','😂','🥰','😍','😘','😏','😌','🥺','😢','😭','😤','😳','🤭','😴','🤔']],
    ['喜欢',['❤️','🩷','💕','💞','💗','💓','💖','💘','🌹','🌸','✨','💫']],
    ['互动',['🫶','🤗','👍','👏','🙌','👌','✌️','🤝','👀','💪','🎉','🔥']]
  ];

  const by=id=>document.getElementById(id);
  const safeText=value=>String(value??'').trim();

  function getTheme(id,gender=''){
    return ROLE_THEMES[id] || (gender==='male'?['#708db5','#465873']:gender==='female'?['#cf7ca0','#75475f']:['#9b7c98','#57465a']);
  }

  function applyTheme(node,char){
    if(!node||!char)return;
    const [a,b]=getTheme(char.id,char.gender);
    node.style.setProperty('--role-a',a);
    node.style.setProperty('--role-b',b);
  }

  function enhanceRoleCards(){
    if(typeof characters==='undefined')return;
    const list=by('presetCharacterList');
    if(!list)return;
    list.querySelectorAll('.character-card').forEach(card=>{
      const char=characters.find(item=>item.id===card.dataset.characterId);
      if(!char||!char.isPreset)return;
      card.classList.add('role-3d-card');
      const choose=card.querySelector('.character-choice');
      const img=choose?.querySelector('.avatar');
      if(!choose||!img)return;
      choose.classList.add('role-3d-choice');
      img.classList.add('role-3d-avatar');
      applyTheme(choose,char);
      if(choose.dataset.role3dBound==='1')return;
      choose.dataset.role3dBound='1';
      const reset=()=>{
        choose.style.setProperty('--rx','0deg');
        choose.style.setProperty('--ry','0deg');
        choose.classList.remove('is-pressed');
      };
      choose.addEventListener('pointerdown',event=>{
        const box=choose.getBoundingClientRect();
        const x=Math.max(0,Math.min(1,(event.clientX-box.left)/Math.max(box.width,1)));
        const y=Math.max(0,Math.min(1,(event.clientY-box.top)/Math.max(box.height,1)));
        choose.style.setProperty('--ry',((x-.5)*8).toFixed(2)+'deg');
        choose.style.setProperty('--rx',((.5-y)*7).toFixed(2)+'deg');
        choose.classList.add('is-pressed');
      },{passive:true});
      choose.addEventListener('pointermove',event=>{
        if(event.pointerType==='touch')return;
        const box=choose.getBoundingClientRect();
        const x=Math.max(0,Math.min(1,(event.clientX-box.left)/Math.max(box.width,1)));
        const y=Math.max(0,Math.min(1,(event.clientY-box.top)/Math.max(box.height,1)));
        choose.style.setProperty('--ry',((x-.5)*9).toFixed(2)+'deg');
        choose.style.setProperty('--rx',((.5-y)*8).toFixed(2)+'deg');
      },{passive:true});
      choose.addEventListener('pointerup',reset,{passive:true});
      choose.addEventListener('pointercancel',reset,{passive:true});
      choose.addEventListener('pointerleave',reset,{passive:true});
    });
  }

  function decorateRoleDetails(){
    if(typeof characters==='undefined')return;
    const box=by('roleDetailsContent');
    if(!box||box.querySelector('.role-detail-stage'))return;
    const img=box.querySelector('img.avatar');
    const char=characters.find(item=>item.id===activeCharacterId);
    if(!img||!char)return;
    const stage=document.createElement('div');
    stage.className='role-detail-stage';
    applyTheme(stage,char);
    img.replaceWith(stage);
    stage.appendChild(img);
  }

  function expressionFor(text){
    const value=safeText(text);
    if(/[😂😄😊🥰😍😘❤️🩷💕✨🎉]|开心|喜欢|想你|高兴|真好/.test(value))return ['happy',/[❤️🩷💕]/.test(value)?'❤️':'✨'];
    if(/[🥺😢😭]|难过|委屈|心疼|别怕/.test(value))return ['soft',/[🥺😢😭]/.test(value)?'🥺':'🫶'];
    return null;
  }

  function decorateMessages(){
    document.querySelectorAll('.message-row.bot').forEach(row=>{
      const bubble=row.querySelector('.message-bubble');
      if(!bubble)return;
      row.classList.remove('role-expression-happy','role-expression-soft');
      row.querySelector('.role-expression-badge')?.remove();
      const expression=expressionFor(bubble.textContent);
      if(!expression)return;
      row.classList.add('role-expression-'+expression[0]);
      const badge=document.createElement('span');
      badge.className='role-expression-badge';
      badge.textContent=expression[1];
      row.appendChild(badge);
    });
  }

  function installEmojiPicker(){
    const picker=by('emojiPicker');
    const input=by('userInput');
    if(!picker||!input)return;
    picker.classList.add('role-emoji-panel');
    picker.replaceChildren();
    EMOJI_GROUPS.forEach(([label,items])=>{
      const group=document.createElement('div');
      group.className='role-emoji-group';
      const title=document.createElement('div');
      title.className='role-emoji-label';
      title.textContent=label;
      picker.appendChild(title);
      items.forEach(emoji=>{
        const button=document.createElement('button');
        button.type='button';
        button.textContent=emoji;
        button.setAttribute('aria-label','插入表情'+emoji);
        button.addEventListener('click',()=>{
          input.focus({preventScroll:true});
          const start=Number.isInteger(input.selectionStart)?input.selectionStart:input.value.length;
          const end=Number.isInteger(input.selectionEnd)?input.selectionEnd:start;
          input.setRangeText(emoji,start,end,'end');
          input.dispatchEvent(new Event('input',{bubbles:true}));
        });
        picker.appendChild(button);
      });
      picker.appendChild(group);
    });
  }

  function unwrapCandidate(value){
    if(!value||typeof value!=='object')return value;
    if(value.data&&typeof value.data==='object'&&!Array.isArray(value.data))return value.data;
    if(value.character&&typeof value.character==='object')return value.character;
    if(value.role&&typeof value.role==='object')return value.role;
    return value;
  }

  function field(obj,...keys){
    for(const key of keys){
      const value=obj?.[key];
      if(value!==undefined&&value!==null&&safeText(value)!=='')return value;
    }
    return '';
  }

  function asQuickReplies(value){
    if(Array.isArray(value))return value.filter(item=>typeof item==='string'&&item.trim()).slice(0,12);
    if(typeof value==='string')return value.split(/[\n,，;；|]/).map(v=>v.trim()).filter(Boolean).slice(0,12);
    return undefined;
  }

  function flexibleRole(raw,index,targetId=''){
    const base=unwrapCandidate(raw);
    if(!base||typeof base!=='object'||Array.isArray(base))throw new Error('第'+(index+1)+'个角色格式无法识别。');
    const existing=targetId&&typeof characters!=='undefined'?characters.find(item=>item.id===targetId&&!item.isPreset):null;
    const name=safeText(field(base,'name','char_name','character_name','姓名','名字','角色名','角色名称')||existing?.name);
    let personality=safeText(field(base,'personality','persona','description','system_prompt','prompt','人设','性格','角色设定','描述'));
    const scenario=safeText(field(base,'scenario','background','背景','背景故事'));
    const notes=safeText(field(base,'creator_notes','notes','补充设定','备注'));
    if(!personality)personality=[scenario,notes].filter(Boolean).join('。');
    if(!name)throw new Error('第'+(index+1)+'个角色缺少姓名。');
    if(!personality)throw new Error('“'+name+'”缺少性格或人设描述。');
    let age=Number(field(base,'age','年龄')||existing?.age||24);
    if(!Number.isFinite(age)||age<18||age>100)age=24;
    const genderRaw=safeText(field(base,'gender','sex','性别')||existing?.gender||'unspecified').toLowerCase();
    const gender=['female','女','女性','成年女性'].includes(genderRaw)?'female':['male','男','男性','成年男性'].includes(genderRaw)?'male':'unspecified';
    const tags=field(base,'tags','标签');
    const tag=safeText(field(base,'tag','title','角色标签','标签')||(Array.isArray(tags)?tags.slice(0,2).join(' · '):'')||existing?.tag||'自定义角色');
    const greeting=safeText(field(base,'greeting','first_mes','first_message','opening','开场白','问候语')||existing?.greeting||'你来了。今天想聊什么？');
    const voice=safeText(field(base,'voice','speech_style','style','说话风格','语气')||existing?.voice||'自然聊天，保持角色设定和自己的表达方式。');
    const interests=safeText(field(base,'interests','hobbies','兴趣','爱好')||existing?.interests||'');
    const relationship=safeText(field(base,'relationship','relation','相处方式','关系')||existing?.relationship||'');
    const background=safeText(field(base,'background','scenario','背景','背景故事')||existing?.background||'');
    const avatar=safeText(field(base,'avatar','image','头像')||existing?.avatar||DEFAULT_AVATAR);
    const quickReplies=asQuickReplies(field(base,'quickReplies','quick_replies','alternate_greetings','快捷回复'))||existing?.quickReplies;
    const idRaw=safeText(field(base,'id','character_id','角色ID'));
    const id=existing?.id||(idRaw&&/^[a-z0-9_-]{1,70}$/i.test(idRaw)?(idRaw.startsWith('custom_')?idRaw:'custom_'+idRaw):'custom_'+makeId());
    const role=normalizeCustomCharacter({
      ...existing,...base,id,name,personality,age,gender,tag,greeting,voice,interests,relationship,background,avatar,quickReplies,
      conversation:base.conversation&&typeof base.conversation==='object'?base.conversation:existing?.conversation
    });
    if(!role)throw new Error('“'+name+'”资料不完整，请至少填写姓名和人设。');
    return role;
  }

  function balancedBlocks(text){
    const blocks=[];
    let quote='',escaped=false,lineComment=false,blockComment=false,start=-1,stack=[];
    const closeFor={'{':'}','[':']'};
    for(let i=0;i<text.length;i++){
      const ch=text[i],next=text[i+1];
      if(lineComment){if(ch==='\n')lineComment=false;continue;}
      if(blockComment){if(ch==='*'&&next==='/'){blockComment=false;i++;}continue;}
      if(quote){
        if(escaped){escaped=false;continue;}
        if(ch==='\\'){escaped=true;continue;}
        if(ch===quote)quote='';
        continue;
      }
      if(ch==='/'&&next==='/'){lineComment=true;i++;continue;}
      if(ch==='/'&&next==='*'){blockComment=true;i++;continue;}
      if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
      if(ch==='{'||ch==='['){
        if(!stack.length)start=i;
        stack.push(closeFor[ch]);
        continue;
      }
      if((ch==='}'||ch===']')&&stack.length){
        if(stack.at(-1)!==ch){stack=[];start=-1;continue;}
        stack.pop();
        if(!stack.length&&start>=0){
          blocks.push(text.slice(start,i+1));
          if(blocks.length>=12)break;
          start=-1;
        }
      }
    }
    return blocks;
  }

  function lineRole(text){
    const pairs={};
    text.split(/\r?\n/).forEach(line=>{
      const match=line.match(/^\s*([^:：]{1,20})\s*[:：]\s*(.+?)\s*$/);
      if(match)pairs[match[1].trim()]=match[2].trim();
    });
    return Object.keys(pairs).length>=2?pairs:null;
  }

  function parsedValueToRoles(value,targetId=''){
    let root=value;
    if(root&&typeof root==='object'&&!Array.isArray(root)&&root.data&&root.spec)root=root.data;
    const list=Array.isArray(root)?root:Array.isArray(root?.roles)?root.roles:Array.isArray(root?.characters)?root.characters:[root];
    if(!list.length||list.length>24)throw new Error('一次可添加1到24个角色。');
    if(targetId&&list.length!==1)throw new Error('修改角色时请只使用一个角色。');
    return list.map((item,index)=>flexibleRole(item,index,targetId));
  }

  function parseFriendlyRoleCode(source,targetId=''){
    const text=safeText(source);
    if(!text)throw new Error('请粘贴角色代码或上传角色文件。');
    let firstError=null;
    try{return parseRoleCode(text,targetId);}catch(error){firstError=error;}
    for(const candidate of balancedBlocks(text)){
      try{return parseRoleCode(candidate,targetId);}catch(error){}
      try{return parsedValueToRoles(JSON.parse(candidate),targetId);}catch(error){}
    }
    try{return parsedValueToRoles(JSON.parse(text),targetId);}catch(error){}
    const pairs=lineRole(text);
    if(pairs){
      try{return parsedValueToRoles(pairs,targetId);}catch(error){firstError=error;}
    }
    throw new Error(firstError?.message||'没有识别出角色资料。可以直接粘贴 JSON、JS 对象、角色卡文本，或使用模板。');
  }

  function finishRoleImport(roles,targetId=''){
    commitCustomCharacters(roles,targetId);
    const editor=by('roleCodeEditor');
    if(editor)editor.value='';
    try{sessionStorage.removeItem('liaotian_role_code_draft');sessionStorage.removeItem('liaotian_role_code_target');}catch(error){}
    if(typeof closeDialog==='function')closeDialog('roleCodeModalOverlay');
    if(by('roleCodeEditorStatus'))by('roleCodeEditorStatus').textContent='';
    if(by('roleCodeStatus'))by('roleCodeStatus').textContent='';
  }

  function installRoleCodeFix(){
    const form=by('roleCodeForm');
    const editor=by('roleCodeEditor');
    const toolbar=form?.querySelector('.role-code-toolbar');
    if(!form||!editor||!toolbar)return;
    const upload=by('roleCodeUpload');
    if(upload)upload.accept='.json,.json5,.js,.txt,.role,application/json,text/plain,text/javascript';
    editor.placeholder='直接粘贴角色资料、JSON、JS对象或角色卡文本；也可以上传文件。';
    if(!by('pasteRoleCodeBtn')){
      const paste=document.createElement('button');
      paste.type='button';
      paste.id='pasteRoleCodeBtn';
      paste.className='btn btn-primary';
      paste.textContent='粘贴角色代码';
      paste.addEventListener('click',async()=>{
        const status=by('roleCodeEditorStatus');
        status.textContent='';
        try{
          const text=await navigator.clipboard.readText();
          if(!text.trim())throw new Error('剪贴板里没有角色代码。');
          editor.value=text.slice(0,524288);
          editor.dispatchEvent(new Event('input',{bubbles:true}));
          status.textContent='已粘贴，可以直接生成角色。';
        }catch(error){
          status.textContent='无法读取剪贴板，请长按输入框粘贴。';
          editor.focus();
        }
      });
      toolbar.prepend(paste);
    }
    if(!form.querySelector('.role-code-helper')){
      const helper=document.createElement('div');
      helper.className='role-code-helper';
      helper.textContent='支持本站角色 JSON、常见角色卡 JSON、JS 对象、带说明文字的代码块和“姓名：… / 性格：…”文本。不会执行上传文件里的程序。';
      toolbar.insertAdjacentElement('afterend',helper);
    }
    if(form.dataset.friendlyImport!=='1'){
      form.dataset.friendlyImport='1';
      form.addEventListener('submit',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        const status=by('roleCodeEditorStatus');
        const button=by('generateRoleCodeBtn');
        if(button?.disabled)return;
        status.textContent='';
        if(button)button.disabled=true;
        try{
          const target=typeof roleCodeEditingId==='string'?roleCodeEditingId:'';
          const roles=parseFriendlyRoleCode(editor.value,target);
          finishRoleImport(roles,target);
        }catch(error){
          status.textContent=error.message||'角色代码无法识别。';
        }finally{
          if(button)button.disabled=false;
        }
      },true);
    }
  }

  function patchRenderers(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__role3d){
      const base=renderSidebar;
      const wrapped=function(...args){const result=base.apply(this,args);enhanceRoleCards();return result;};
      wrapped.__role3d=true;
      renderSidebar=wrapped;
    }
    if(typeof renderMessages==='function'&&!renderMessages.__roleExpressions){
      const base=renderMessages;
      const wrapped=function(...args){const result=base.apply(this,args);requestAnimationFrame(decorateMessages);return result;};
      wrapped.__roleExpressions=true;
      renderMessages=wrapped;
    }
    if(typeof openRoleDetails==='function'&&!openRoleDetails.__role3d){
      const base=openRoleDetails;
      const wrapped=function(...args){const result=base.apply(this,args);requestAnimationFrame(decorateRoleDetails);return result;};
      wrapped.__role3d=true;
      openRoleDetails=wrapped;
    }
    if(typeof buildSystemPrompt==='function'&&!buildSystemPrompt.__emojiReady){
      const base=buildSystemPrompt;
      const wrapped=function(...args){
        const prompt=base.apply(this,args);
        return prompt+'\n表情规则：可以在情绪合适时自然使用0到2个常见emoji表达语气；不是每条都必须使用，不要连续堆表情。';
      };
      wrapped.__emojiReady=true;
      buildSystemPrompt=wrapped;
    }
  }

  function boot(){
    if(typeof renderSidebar!=='function'||typeof parseRoleCode!=='function')return setTimeout(boot,80);
    patchRenderers();
    installEmojiPicker();
    installRoleCodeFix();
    enhanceRoleCards();
    decorateMessages();
    window.__ROLE_EXPERIENCE_VERSION=VERSION;
  }

  boot();
})();
