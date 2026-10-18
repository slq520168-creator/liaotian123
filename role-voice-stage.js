(() => {
  const VERSION='20261018-livevoice3';
  const VOICE_PREFIX='liaotian_role_voice_';
  const AUTO_VOICE_KEY='liaotian_voice_auto';
  const ROLE_THEMES={
    nuannuan:['#f28ab2','#7d4766'],linwan:['#b23d69','#54283d'],sutang:['#ff8cac','#8f476d'],xuzhixia:['#6e9bd7','#4d5f8f'],
    yeqingge:['#e35d56','#70343e'],lingyi:['#b28adf','#5f4b82'],luchen:['#6d8fc8','#3f526f'],taiyang:['#f0a54f','#80542f'],
    shenyan:['#7086a8','#3f495d'],guyan:['#9b7a67','#5e4b42'],jiangyu:['#4ca7c8','#32657b'],yunzhou:['#8c7967','#4f493f']
  };
  const by=id=>document.getElementById(id);
  const safe=value=>String(value??'').trim();
  let stage=null,stageEmoji=null;
  let voiceSelect=null,voiceButton=null,micButton=null,voiceNote=null;
  let voices=[];
  let recognition=null;
  let listening=false;
  let speaking=false;
  let voiceAuto=false;
  let emotionTimer=0;
  let resizeObserver=null;

  try{voiceAuto=localStorage.getItem(AUTO_VOICE_KEY)==='1'}catch(error){}

  function themeFor(char){return ROLE_THEMES[char?.id]||(char?.gender==='male'?['#708db5','#465873']:char?.gender==='female'?['#cf7ca0','#75475f']:['#9b7c98','#57465a'])}
  function currentChar(){return typeof characters==='undefined'?null:characters.find(item=>item.id===activeCharacterId)||null}

  function createStage(){
    if(stage)return;
    const main=document.querySelector('.chat-main');
    if(!main)return;
    main.classList.add('role-live-enabled');
    stage=document.createElement('div');
    stage.id='roleLiveStage';
    stage.className='role-live-stage emotion-calm';
    stage.setAttribute('aria-hidden','true');
    stageEmoji=document.createElement('span');
    stageEmoji.className='role-live-emoji';
    const bars=document.createElement('span');
    bars.className='role-live-speech';
    bars.innerHTML='<i></i><i></i><i></i><i></i>';
    stage.append(stageEmoji,bars);
    main.prepend(stage);
    const input=document.querySelector('.input-container');
    if(input&&'ResizeObserver'in window){
      resizeObserver=new ResizeObserver(entries=>{
        const h=Math.ceil(entries[0]?.contentRect?.height||input.getBoundingClientRect().height||178);
        main.style.setProperty('--role-input-height',Math.max(110,h)+'px');
      });
      resizeObserver.observe(input);
    }else if(input){
      main.style.setProperty('--role-input-height',Math.ceil(input.getBoundingClientRect().height||178)+'px');
    }
  }

  function roleImage(char){
    return safeAvatar(char?.bodyImage||char?.fullBody||char?.avatar||DEFAULT_AVATAR);
  }

  function syncStage(){
    createStage();
    const char=currentChar();
    if(!stage||!char)return;
    const [a,b]=themeFor(char);
    stage.style.setProperty('--role-a',a);
    stage.style.setProperty('--role-b',b);
    const src=roleImage(char);
    stage.style.backgroundImage='url('+JSON.stringify(src)+')';
    syncVoiceSelection();
  }

  function detectEmotion(text){
    const value=safe(text);
    if(/❤️|🩷|💕|💞|喜欢|想你|爱你|心动|约会|亲近|抱抱/.test(value))return ['love','❤️'];
    if(/😂|😄|😊|🥰|开心|高兴|太好了|真棒|哈哈|庆祝/.test(value))return ['happy','✨'];
    if(/🥺|😢|😭|难过|委屈|伤心|心疼|失落|别怕/.test(value))return ['sad','🥺'];
    if(/😤|生气|气死|愤怒|讨厌|不爽/.test(value))return ['angry','💢'];
    if(/😳|惊讶|没想到|居然|真的[？?！!]|天啊/.test(value))return ['surprised','😳'];
    if(/🤔|想想|让我想|考虑|琢磨|也许|可能/.test(value))return ['thinking','🤔'];
    return ['calm',''];
  }

  function animateStage(text,forced){
    createStage();
    if(!stage)return;
    clearTimeout(emotionTimer);
    const [emotion,emoji]=forced?[forced,forced==='thinking'?'🤔':'']:detectEmotion(text);
    [...stage.classList].filter(name=>name.startsWith('emotion-')).forEach(name=>stage.classList.remove(name));
    stage.classList.add('emotion-'+emotion);
    stage.classList.remove('show-emoji');
    if(stageEmoji)stageEmoji.textContent=emoji;
    if(emoji){void stage.offsetWidth;stage.classList.add('show-emoji')}
    emotionTimer=setTimeout(()=>{
      if(!stage)return;
      [...stage.classList].filter(name=>name.startsWith('emotion-')).forEach(name=>stage.classList.remove(name));
      stage.classList.add('emotion-calm');
      stage.classList.remove('show-emoji');
    },emotion==='thinking'?4000:3000);
  }

  function voiceKey(){return VOICE_PREFIX+activeCharacterId}
  function getSavedVoice(){try{return localStorage.getItem(voiceKey())||''}catch(error){return ''}}
  function saveVoice(name){try{localStorage.setItem(voiceKey(),name)}catch(error){}}
  function saveVoiceState(){try{localStorage.setItem(AUTO_VOICE_KEY,voiceAuto?'1':'0')}catch(error){}}

  function loadVoices(){
    if(!('speechSynthesis'in window))return;
    voices=speechSynthesis.getVoices().slice().sort((a,b)=>{
      const az=/^zh/i.test(a.lang)?0:1,bz=/^zh/i.test(b.lang)?0:1;
      return az-bz||a.lang.localeCompare(b.lang)||a.name.localeCompare(b.name);
    });
    renderVoices();
  }

  function renderVoices(){
    if(!voiceSelect)return;
    const saved=getSavedVoice();
    voiceSelect.replaceChildren();
    if(!voices.length){
      const option=document.createElement('option');
      option.value='';option.textContent='系统默认';voiceSelect.appendChild(option);return;
    }
    voices.forEach((voice,index)=>{
      const option=document.createElement('option');
      option.value=voice.name;
      option.textContent=(voice.name.length>16?voice.name.slice(0,16)+'…':voice.name)+' · '+voice.lang;
      voiceSelect.appendChild(option);
      if((saved&&voice.name===saved)||(!saved&&index===0))option.selected=true;
    });
  }

  function syncVoiceSelection(){
    if(!voiceSelect)return;
    const saved=getSavedVoice();
    if(saved&&[...voiceSelect.options].some(option=>option.value===saved))voiceSelect.value=saved;
    if(voiceButton){
      voiceButton.classList.toggle('active',voiceAuto);
      voiceButton.textContent=voiceAuto?'🔊 语音开':'🔇 语音关';
      voiceButton.setAttribute('aria-pressed',String(voiceAuto));
    }
  }

  function selectedVoice(){
    if(!voices.length)return null;
    const name=voiceSelect?.value||getSavedVoice();
    return voices.find(voice=>voice.name===name)||voices.find(voice=>/^zh/i.test(voice.lang))||voices[0]||null;
  }

  function cleanSpeech(text){return safe(text).replace(/\([^)]{0,40}\)/g,'').replace(/[\*_#>`~]/g,' ').replace(/\s+/g,' ').slice(0,2400)}

  function stopSpeaking(){
    if('speechSynthesis'in window)speechSynthesis.cancel();
    speaking=false;
    stage?.classList.remove('is-speaking');
    if(voiceNote&&voiceNote.textContent==='正在说话…')voiceNote.textContent='';
  }

  function speak(text,char,preview=false){
    if(!voiceAuto&&!preview)return;
    if(!('speechSynthesis'in window)){if(voiceNote)voiceNote.textContent='当前浏览器没有语音播放功能。';return}
    const content=preview?('你好，我是'+(char?.name||'当前角色')+'。以后可以用这个声音和你聊天。'):cleanSpeech(text);
    if(!content)return;
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(content);
    const voice=selectedVoice();
    if(voice){utterance.voice=voice;utterance.lang=voice.lang}else utterance.lang='zh-CN';
    utterance.rate=1;
    utterance.pitch=char?.gender==='male'?.94:char?.gender==='female'?1.04:1;
    utterance.onstart=()=>{speaking=true;stage?.classList.add('is-speaking');if(voiceNote)voiceNote.textContent='正在说话…'};
    utterance.onend=utterance.onerror=()=>{speaking=false;stage?.classList.remove('is-speaking');if(voiceNote)voiceNote.textContent=''};
    speechSynthesis.speak(utterance);
  }

  function installVoiceControls(){
    const tools=document.querySelector('.chat-tools');
    if(!tools||by('roleVoiceControls'))return;
    const wrap=document.createElement('div');
    wrap.id='roleVoiceControls';wrap.className='role-voice-controls';
    const label=document.createElement('label');
    label.htmlFor='roleVoiceSelect';label.textContent='声音';
    voiceSelect=document.createElement('select');
    voiceSelect.id='roleVoiceSelect';voiceSelect.className='role-voice-select';voiceSelect.setAttribute('aria-label','选择当前角色声音');
    voiceSelect.addEventListener('change',()=>{
      saveVoice(voiceSelect.value);
      if(voiceAuto)speak('',currentChar(),true);
    });
    voiceButton=document.createElement('button');
    voiceButton.type='button';voiceButton.className='role-voice-btn';voiceButton.setAttribute('aria-label','开启或关闭角色语音');
    voiceButton.addEventListener('click',()=>{
      voiceAuto=!voiceAuto;
      saveVoiceState();
      if(!voiceAuto)stopSpeaking();
      syncVoiceSelection();
      if(voiceAuto)speak('',currentChar(),true);
    });
    micButton=document.createElement('button');
    micButton.type='button';micButton.className='role-mic-btn';micButton.textContent='🎙 说话';micButton.setAttribute('aria-label','开始语音输入');
    micButton.addEventListener('click',toggleRecognition);
    wrap.append(label,voiceSelect,voiceButton,micButton);
    tools.appendChild(wrap);
    voiceNote=document.createElement('div');
    voiceNote.className='role-voice-note';voiceNote.setAttribute('role','status');
    tools.insertAdjacentElement('afterend',voiceNote);
    if(!('speechSynthesis'in window)){voiceSelect.disabled=true;voiceButton.disabled=true}
    loadVoices();
    if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=loadVoices;
    syncVoiceSelection();
  }

  function recognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
  function toggleRecognition(){
    const Ctor=recognitionCtor();
    if(!Ctor){if(voiceNote)voiceNote.textContent='当前浏览器不支持语音输入。';return}
    if(listening&&recognition){recognition.stop();return}
    recognition=new Ctor();
    const voice=selectedVoice();
    recognition.lang=voice?.lang||navigator.language||'zh-CN';
    recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;
    recognition.onstart=()=>{listening=true;micButton?.classList.add('active');if(micButton)micButton.textContent='■ 停止';if(voiceNote)voiceNote.textContent='正在听…';animateStage('', 'thinking')};
    recognition.onresult=event=>{
      let final='',interim='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const text=event.results[i][0]?.transcript||'';
        if(event.results[i].isFinal)final+=text;else interim+=text;
      }
      if(interim&&by('userInput')){by('userInput').value=interim;by('userInput').dispatchEvent(new Event('input',{bubbles:true}))}
      if(final&&by('userInput')){
        by('userInput').value=final.trim();
        by('userInput').dispatchEvent(new Event('input',{bubbles:true}));
        setTimeout(()=>{if(by('userInput').value.trim()&&typeof handleSendMessage==='function')handleSendMessage()},120);
      }
    };
    recognition.onerror=event=>{if(voiceNote)voiceNote.textContent=event.error==='not-allowed'?'需要允许麦克风权限才能语音聊天。':'语音没有听清，请再试一次。'};
    recognition.onend=()=>{listening=false;micButton?.classList.remove('active');if(micButton)micButton.textContent='🎙 说话';if(voiceNote&&voiceNote.textContent==='正在听…')voiceNote.textContent=''};
    try{recognition.start()}catch(error){if(voiceNote)voiceNote.textContent='语音输入暂时无法启动。'}
  }

  function patchCharacterSwitch(){
    if(typeof switchCharacter!=='function'||switchCharacter.__liveStage)return;
    const base=switchCharacter;
    const wrapped=function(...args){
      stopSpeaking();
      const result=base.apply(this,args);
      requestAnimationFrame(syncStage);
      return result;
    };
    wrapped.__liveStage=true;
    switchCharacter=wrapped;
  }

  function patchReplies(){
    if(typeof requestCharacterReply!=='function'||requestCharacterReply.__liveVoice)return;
    const base=requestCharacterReply;
    const wrapped=async function(char,...args){
      const before=(chatHistories[char.id]||[]).at(-1)?.id||'';
      animateStage('', 'thinking');
      const result=await base.call(this,char,...args);
      const last=(chatHistories[char.id]||[]).at(-1);
      if(last?.sender==='bot'&&last.id&&last.id!==before){
        animateStage(last.text);
        if(voiceAuto)speak(last.text,char,false);
      }
      return result;
    };
    wrapped.__liveVoice=true;
    requestCharacterReply=wrapped;
  }

  function removeUpdateNotice(){document.querySelectorAll('#siteUpdateNotice,.site-update').forEach(node=>node.remove())}

  function boot(){
    if(typeof characters==='undefined'||typeof switchCharacter!=='function'||typeof requestCharacterReply!=='function')return setTimeout(boot,80);
    removeUpdateNotice();
    patchCharacterSwitch();
    patchReplies();
    createStage();
    installVoiceControls();
    syncStage();
    window.__ROLE_VOICE_STAGE_VERSION=VERSION;
  }

  boot();
})();
