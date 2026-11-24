(() => {
  'use strict';
  const root = document.getElementById('roleDiscovery');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const FAV_KEY = 'sirole_favorites_v1';
  // No retired 3D MP4 clips; only explicit real character videos.
  const roleVideo=char=>char&&typeof char.video==='string'&&/^https:\/\/[^\s]{1,900}$/i.test(char.video)?char.video:'';
  const videoFailed=new Set();
  function hideVideoReplay(el){
    const parent=el?.parentElement,button=parent?.querySelector('.rd-video-retry');
    if(button)button.hidden=true;
    if(parent?.classList.contains('rd-chat-scene'))parent.setAttribute('aria-hidden','true');
  }
  function showVideoReplay(el){
    const parent=el?.parentElement;
    if(!parent)return;
    let button=parent.querySelector('.rd-video-retry');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='rd-video-retry';
      button.textContent='▶ 播放视频';
      button.setAttribute('aria-label','播放当前角色的真实动态视频');
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        playVideo(el,el.dataset.source,true);
      });
      parent.appendChild(button);
    }
    button.hidden=false;
    if(parent.classList.contains('rd-chat-scene'))parent.removeAttribute('aria-hidden');
  }
  function stopVideo(el){
    if(!el)return;
    el._playVersion=(el._playVersion||0)+1;
    el._playPending=false;
    const hadSource=Boolean(el.dataset.source||el.hasAttribute('src'));
    el.pause();el.hidden=true;
    if(hadSource){el.removeAttribute('src');el.dataset.source='';el.load();}
    hideVideoReplay(el);
  }
  function playVideo(el,url,userGesture=false){
    if(!el)return;
    if(userGesture&&url)videoFailed.delete(url);
    const enable=Boolean(url&&!videoFailed.has(url)&&(userGesture||!matchMedia('(prefers-reduced-motion: reduce)').matches));
    if(!enable){stopVideo(el);return;}
    if(el.dataset.source!==url){
      el._playVersion=(el._playVersion||0)+1;
      el._playPending=false;
      el.dataset.source=url;
      el.src=url;
      el.load();
      el.hidden=true;
      hideVideoReplay(el);
    }
    if(document.hidden){el.pause();el.hidden=true;return;}
    if(!el.paused&&el.readyState>=2){el.hidden=false;hideVideoReplay(el);return;}
    if(el._playPending&&!userGesture)return;
    const version=el._playVersion=(el._playVersion||0)+1;
    el._playPending=true;
    Promise.resolve(el.play()).then(()=>{
      if(el._playVersion!==version||el.dataset.source!==url)return;
      if(!el.paused&&!document.hidden){el.hidden=false;hideVideoReplay(el);}
    }).catch(error=>{
      if(el._playVersion!==version||el.dataset.source!==url)return;
      el.hidden=true;
      if(error?.name==='NotAllowedError'&&!document.hidden)showVideoReplay(el);
    }).finally(()=>{if(el._playVersion===version)el._playPending=false;});
  }
  const state = {index: 0, filter: 'all', query: '', favorites: new Set(), drag: null, suppressClickUntil: 0};
  try {
    const stored = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    if (Array.isArray(stored)) state.favorites = new Set(stored.filter(id => typeof id === 'string'));
  } catch {}
  const allCharacters = () => {
    // The first frame must show real preset roles even if the chat boot is still loading.
    if (typeof characters !== 'undefined' && Array.isArray(characters) && characters.length) return characters;
    return typeof PRESET_CHARACTERS !== 'undefined' && Array.isArray(PRESET_CHARACTERS) ? PRESET_CHARACTERS : [];
  };
  const FEATURED_IDS=["vivienne","rosalie","sylvie","elena","daphne","veronica","claire","phoebe","audrey","helene","luna","marisol","arthur","felix","roman","niko","jiangwu","muyue","yinling","shuangye","yinxuan","lanqi","qingshu","beihan","amara","luoyan","wuyue","xingye","haichao","yinyao","luojue","huajin","qiyun","celeste","maya","viala","tangli","anika"];
  const FEATURED_RANK=new Map(FEATURED_IDS.map((id,i)=>[id,i]));
  const available = () => allCharacters().filter(char => {
    if (!char || !char.id) return false;
    if (['都市','治愈','悬疑','奇幻','古风','科幻','冒险','惊魂','民俗','言情','动漫'].includes(state.filter) && char.category !== state.filter) return false;
    if (state.filter === 'featured' && !FEATURED_RANK.has(char.id)) return false;
    if (state.filter === 'international' && char.region !== 'international') return false;
    if (state.filter === 'photo' && !char.photoRealistic) return false;
    if (state.filter === 'female' && char.gender !== 'female') return false;
    if (state.filter === 'male' && char.gender !== 'male') return false;
    if (state.filter === 'mine' && char.isPreset) return false;
    if (state.filter === 'recent' && !(typeof chatHistories!=='undefined'&&(chatHistories[char.id]||[]).some(x=>x.sender==='user'))) return false;
    if (state.filter === 'liked' && !state.favorites.has(char.id)) return false;
    const query = state.query.trim().toLocaleLowerCase();
    return !query || [char.name,char.latinName,char.countryLabel,char.region,char.tag,char.personality,char.interests,char.background,char.category,char.headline,char.hook,char.sceneLabel,...(char.traits||[])].some(value=>String(value||'').toLocaleLowerCase().includes(query));
  }).sort((a,b)=>{
    if(state.filter==='recent')return String((typeof chatHistories!=='undefined'&&chatHistories[b.id]?.at(-1)?.createdAt)||'').localeCompare(String((typeof chatHistories!=='undefined'&&chatHistories[a.id]?.at(-1)?.createdAt)||''));
    if(state.filter==='mine'||state.filter==='liked')return 0;
    return (FEATURED_RANK.get(a.id)??99)-(FEATURED_RANK.get(b.id)??99);
  });
  const image = (char, className, eager = false) => {
    const img = document.createElement('img');
    img.className = className;
    img.src = char.avatar || 'assets/avatars/nuannuan-portrait.jpg';
    img.alt = char.name + '的角色立绘';
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.onerror = () => {
      img.onerror = null;
      img.src = 'assets/avatars/nuannuan-portrait.jpg';
    };
    return img;
  };
  const current = () => {
    const list = available();
    if (!list.length) return null;
    state.index = (state.index % list.length + list.length) % list.length;
    return list[state.index];
  };
  const persistFavorites = () => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...state.favorites])); } catch {}
  };
  function setFilter(filter) {
    state.filter = filter;
    state.index = 0;
    root.querySelectorAll('[data-role-filter]').forEach(btn => {
      const active = btn.dataset.roleFilter === filter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    render();
  }
  function switchView(showLobby, updateHistory = true) {
    root.hidden = !showLobby;
    document.body.classList.toggle('role-discovery-open', showLobby);
    document.body.classList.toggle('role-chat-immersive', !showLobby);
    window.RoleAvatarStage?.setActive?.(!showLobby);
    if (!showLobby){stopVideo($('rdHeroVideo'));syncBackdrop();}
    else stopVideo($('rdChatVideo'));
    closeHistory();
    if (showLobby) {
      render();
      root.scrollTop = 0;
    } else {
      window.__ROLE_HUMAN_RENDERER?.resize?.();
      window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();
    }
    if(!showLobby)window.RoleStory?.render?.();
    if (updateHistory) {
      const target = showLobby ? '#discover' : '#chat';
      if (location.hash !== target) history.pushState({siroleView: showLobby ? 'discover' : 'chat'}, '', target);
    }
  }
  function syncBackdrop() {
    const char = allCharacters().find(item => typeof activeCharacterId !== 'undefined' && item.id === activeCharacterId);
    const cover = $('rdChatCover');
    if (!cover || !char) return;
    const src = char.avatar || 'assets/avatars/nuannuan-portrait.jpg';
    if (cover.getAttribute('src') !== src) cover.setAttribute('src', src);
    cover.alt = '';
    const name = $('rdReplyName');
    if (name) name.textContent = char.name;
    window.RoleAvatarStage?.setCharacter?.(char);
    if(document.body.classList.contains('role-chat-immersive'))playVideo($('rdChatVideo'),roleVideo(char));
    else stopVideo($('rdChatVideo'));
    queueReplySync();
  }
  let replyFrame = 0;
  function queueReplySync() {
    if (replyFrame) return;
    replyFrame = requestAnimationFrame(() => { replyFrame = 0; syncReply(); });
  }
  function syncReply() {
    const messages = $('messages');
    const live = $('rdLiveReply');
    const text = $('rdReplyText');
    if (!messages || !live || !text) return;
    const botRows = messages.querySelectorAll('.message-row.bot');
    const last = botRows[botRows.length - 1];
    const isTyping = last?.classList.contains('typing-row');
    const nextText = isTyping ? '' : (last?.querySelector('.message-bubble')?.textContent || '').trim();
    const identity = String(typeof activeCharacterId !== 'undefined' ? activeCharacterId : '') + ':' + String(last?.dataset.messageId || '') + ':' + nextText;
    if (live.dataset.replyKey !== identity) {
      const prev = live.dataset.replyKey || '';
      live.dataset.replyKey = identity;
      text.textContent = nextText;
      if (prev) { live.classList.remove('rd-reply-enter'); void live.offsetWidth; live.classList.add('rd-reply-enter'); }
    }
    live.hidden = !last;
    live.classList.toggle('rd-is-typing', Boolean(isTyping));
    if (!isTyping && nextText) window.RoleAvatarStage?.setReply?.(nextText);
    const error=messages.querySelector('.reply-error');
    const retry=$('rdReplyRetry');
    if(retry){retry.hidden=!error;}
    if(error){
      live.hidden=false;
      live.classList.remove('rd-is-typing');
      text.textContent='回复没有完成，可以重试。';
    }
  }
  function closeHistory() {
    document.body.classList.remove('rd-history-open');
    const btn = $('rdHistoryToggle');
    if (btn) { btn.setAttribute('aria-pressed','false'); btn.setAttribute('aria-label','查看对话记录'); }
  }
  function toggleHistory() {
    const open = document.body.classList.toggle('rd-history-open');
    const btn = $('rdHistoryToggle');
    if (btn) { btn.setAttribute('aria-pressed', String(open)); btn.setAttribute('aria-label', open ? '关闭对话记录' : '查看对话记录'); }
    if (open) { const box = $('messagesContainer'); if (box) box.scrollTop = box.scrollHeight; }
  }
  function startChat(char) {
    if (!char) return;
    switchView(false);
    if (typeof switchCharacter === 'function') switchCharacter(char.id);
    syncBackdrop();
    if (typeof closeSidebar === 'function') closeSidebar();
    requestAnimationFrame(() => {
      window.__ROLE_HUMAN_RENDERER?.resize?.();
      if (matchMedia('(pointer:fine)').matches) $('userInput')?.focus({preventScroll: true});
    });
  }
  function openCreate() {
    // Keep the discovery page in place under the 2D editor. Cancel returns to the same card.
    if(window.Role2DCreator?.open?.()!==true)$('openCreateModalBtn')?.click();
  }
  function selectIndex(next, animate = true) {
    const list = available();
    if (!list.length) return;
    state.index = (next % list.length + list.length) % list.length;
    if (animate) {
      const card = $('rdHeroCard');
      card.classList.remove('rd-enter');
      void card.offsetWidth;
      card.classList.add('rd-enter');
    }
    renderHero();
    renderGrid();
  }
  function selectCharacter(id) {
    const index = available().findIndex(char => char.id === id);
    if (index < 0) return;
    selectIndex(index);
    root.scrollTo({top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  function toggleFavoriteFor(char){
    if(!char)return;
    if(state.favorites.has(char.id))state.favorites.delete(char.id);
    else state.favorites.add(char.id);
    persistFavorites();
    if(state.filter==='liked')state.index=0;
    render();
  }
  function toggleFavorite(){
    const char=current();
    if(!char)return;
    toggleFavoriteFor(char);
    const target=$('rdFavorite');
    target?.classList.remove('rd-heart-pop');
    if(target){void target.offsetWidth;target.classList.add('rd-heart-pop');}
  }
  function renderHero() {
    const char = current();
    const card = $('rdHeroCard');
    const illustration = $('rdHeroPortrait');
    const name = $('rdHeroName');
    const age = $('rdHeroAge');
    const bio = $('rdHeroBio');
    const tag = $('rdHeroTag');
    const favorite = $('rdFavorite');
    const empty = $('rdHeroEmpty');
    card.hidden = !char;
    empty.hidden = Boolean(char);
    $('rdHeroControls').hidden = !char;
    $('rdStartChat').disabled = !char;
    $('rdDeckCounter').textContent = char ? String(state.index + 1).padStart(2, '0') + ' / ' + String(available().length).padStart(2, '0') : '00 / 00';
    if (!char) return;
    if (illustration.dataset.charId !== String(char.id)) {
      illustration.dataset.charId = String(char.id);
      illustration.src = char.avatar || 'assets/avatars/nuannuan-portrait.jpg';
    }
    const videoSrc = roleVideo(char);
    playVideo($('rdHeroVideo'),videoSrc);
    illustration.alt = char.name + '的角色形象';
    name.textContent = char.name;
    age.textContent = Number(char.age) >= 18 ? String(char.age) : '';
    bio.textContent = String(char.hook || char.personality || char.greeting || '').replace(/【角色自定义设定】[\s\S]*?【自定义设定结束】/g,'').trim().slice(0,140);
    const heroScene=$('rdHeroScene'),heroTraits=$('rdHeroTraits');
    if(heroScene)heroScene.textContent=char.sceneLabel || char.headline || '';
    if(heroTraits)heroTraits.replaceChildren(...(char.traits||[]).slice(0,3).map(value=>{const item=document.createElement('span');item.textContent=value;return item;}));
    tag.textContent = char.tag || '遇见新角色';
    const liked = state.favorites.has(char.id);
    favorite.classList.toggle('is-liked', liked);
    favorite.setAttribute('aria-pressed', String(liked));
    favorite.setAttribute('aria-label', liked ? '取消收藏' + char.name : '收藏' + char.name);
    $('rdStartChat').textContent = '与' + char.name + '开始聊天';
    card.setAttribute('aria-label', '查看' + char.name + '，左右滑动切换角色');
  }
  const COLOR_BY_CATEGORY=Object.freeze({'都市':'#e0a7cb','治愈':'#b0e2c6','悬疑':'#a2b1dc','奇幻':'#d3a8f7','古风':'#e7c38b','科幻':'#87c4e8','冒险':'#eac28d'});
  function renderGrid() {
    const container=$('rdCharacterGrid'),list=available(),currentId=current()?.id,fragment=document.createDocumentFragment();

    for(const char of list){
      const card=document.createElement('article');
      card.className='rd-mini-card'+(char.id===currentId?' is-current':'');
      card.dataset.characterId=char.id;if(char.storybook)card.dataset.story='chaptered';
      card.style.setProperty('--rd-accent',COLOR_BY_CATEGORY[char.category]||'#cbb2f8');
      const open=document.createElement('button');
      open.type='button';open.className='rd-mini-open';
      open.setAttribute('aria-label','与'+char.name+'开始聊天：'+(char.headline||char.tag||'角色')+'，'+(char.traits||[]).join('、'));
      open.appendChild(image(char,'rd-mini-image'));
      const shade=document.createElement('span');shade.className='rd-mini-shade';open.append(shade);
      const category=document.createElement('span');category.className='rd-mini-category';
      category.textContent=(char.mark||'✦')+' '+(char.countryLabel ? char.countryLabel+' · '+(char.category||'故事') : (char.category||'原创'))+(char.storybook?' · 6章':'');open.append(category);
      if(roleVideo(char)){
        const video=document.createElement('span');video.className='rd-mini-video';video.textContent='▶';
        video.setAttribute('aria-label','可播放角色视频');open.append(video);
      }
      const info=document.createElement('span');info.className='rd-mini-details';
      const role=document.createElement('span');role.className='rd-mini-role';role.textContent=char.headline||char.tag||'自定义角色';
      const name=document.createElement('strong');name.textContent=char.name;
      const traits=document.createElement('span');traits.className='rd-mini-traits';
      for(const trait of (char.traits||[]).slice(0,3)){const chip=document.createElement('i');chip.textContent=trait;traits.append(chip);}
      const hook=document.createElement('span');hook.className='rd-mini-hook';
      hook.textContent=String(char.hook||char.greeting||char.personality||'').replace(/【角色自定义设定】[\s\S]*?【自定义设定结束】/g,'').trim().slice(0,65);
      const enter=document.createElement('span');enter.className='rd-mini-enter';enter.textContent='进入聊天  ›';enter.setAttribute('aria-hidden','true');
      info.append(role,name,traits,hook,enter);open.append(info);
      open.addEventListener('click',()=>startChat(char));
      const favorite=document.createElement('button');
      favorite.type='button';favorite.className='rd-mini-fav'+(state.favorites.has(char.id)?' is-liked':'');
      favorite.setAttribute('aria-label',(state.favorites.has(char.id)?'取消收藏':'收藏')+char.name);
      favorite.setAttribute('aria-pressed',String(state.favorites.has(char.id)));
      favorite.textContent=state.favorites.has(char.id)?'♥':'♡';
      favorite.addEventListener('click',()=>toggleFavoriteFor(char));
      card.append(open,favorite);fragment.append(card);
    }
    container.replaceChildren(fragment);
    $('rdGridCount').textContent=list.length+' 位角色';
    $('rdGridEmpty').hidden=list.length>0;

  }
  function render() { renderHero(); renderGrid(); }
  function attachGestures() {
    const card = $('rdHeroCard');
    card.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      state.drag = {id: event.pointerId, x: event.clientX, y: event.clientY, moved: false};
    });
    card.addEventListener('pointermove', event => {
      const drag = state.drag;
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) <= 7 || Math.abs(dx) < Math.abs(dy)) return;
      drag.moved = true;
      card.style.transition = 'none';
      card.style.transform = 'translateX(' + Math.max(-90, Math.min(90, dx * 0.45)) + 'px) rotate(' + Math.max(-7, Math.min(7, dx * 0.045)) + 'deg)';
    });
    const finish = event => {
      const drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      state.drag = null;
      if (drag.moved) state.suppressClickUntil = Date.now() + 360;
      card.style.transition = '';
      card.style.transform = '';
      const dx = event.clientX - drag.x;
      if (drag.moved && Math.abs(dx) > 58) selectIndex(state.index + (dx < 0 ? 1 : -1));
    };
    card.addEventListener('pointerup', finish);
    card.addEventListener('pointercancel', finish);
    card.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); selectIndex(state.index + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); selectIndex(state.index - 1); }
      if (event.key === 'Enter') { event.preventDefault(); startChat(current()); }
    });
  }
  function boot() {
    for(const key of ['rdHeroVideo','rdChatVideo']){
      const video=$(key);
      video?.addEventListener('error',event=>{if(event.target.dataset.source)videoFailed.add(event.target.dataset.source);stopVideo(event.target);});
      video?.addEventListener('playing',()=>{
        if(video.dataset.source&&!document.hidden){video.hidden=false;hideVideoReplay(video);}
      });
    }
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){
        for(const key of ['rdHeroVideo','rdChatVideo']){
          const video=$(key);
          if(!video)continue;
          video._playVersion=(video._playVersion||0)+1;
          video._playPending=false;
          video.pause();video.hidden=true;hideVideoReplay(video);
        }
      }else if(!root.hidden)renderHero();
      else syncBackdrop();
    });
    $('rdHeroPortrait').addEventListener('error', event => {
      if (event.target.src.endsWith('/nuannuan-portrait.jpg')) return;
      event.target.src = 'assets/avatars/nuannuan-portrait.jpg';
    });
    $('rdPrevious').addEventListener('click', () => selectIndex(state.index - 1));
    $('rdNext').addEventListener('click', () => selectIndex(state.index + 1));
    $('rdFavorite').addEventListener('click', toggleFavorite);
    $('rdStartChat').addEventListener('click', () => startChat(current()));
    $('rdCreateRole').addEventListener('click', openCreate);
    $('rdCreateEmpty').addEventListener('click', openCreate);
    $('rdHeroCard').addEventListener('click', event => {
      if (state.drag || Date.now() < state.suppressClickUntil || event.target.closest('button')) return;
      startChat(current());
    });
    $('rdSearch').addEventListener('input', event => {
      state.query = event.target.value;
      state.index = 0;
      render();
    });
    root.querySelectorAll('[data-role-filter]').forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.roleFilter)));
    $('rdGoHome')?.addEventListener('click', () => switchView(true));
    $('rdHistoryToggle').addEventListener('click', toggleHistory);
    const scene=$('rdScene');
    if(scene){
      scene.value=window.RoleChatActions?.scene?.()||'default';
      scene.addEventListener('change',()=>{window.RoleChatActions?.setScene?.(scene.value);document.body.dataset.roleScene=scene.value;});
    }
    $('rdRegenerate')?.addEventListener('click',()=>{if(window.RoleChatActions?.regenerate?.())closeHistory();});
    $('rdShare')?.addEventListener('click',async()=>{
      const char=window.RoleChatActions?.activeCharacter?.(),history=window.RoleChatActions?.history?.()||[];
      if(!char||!history.length)return;
      const transcript=char.name+' · 角色聊天\n\n'+history.map(x=>(x.sender==='user'?'我':char.name)+'：'+x.text).join('\n\n');
      try{if(navigator.share)await navigator.share({title:char.name+' · 角色聊天',text:transcript.slice(0,16000)});else await navigator.clipboard?.writeText(transcript);}catch(e){if(e?.name!=='AbortError')console.warn('分享未完成');}
    });
    $('rdSave')?.addEventListener('click',()=>{
      const char=window.RoleChatActions?.activeCharacter?.(),history=window.RoleChatActions?.history?.()||[];
      if(!char||!history.length)return;
      const transcript=char.name+' · 角色聊天\n\n'+history.map(x=>(x.sender==='user'?'我':char.name)+'：'+x.text).join('\n\n');
      const url=URL.createObjectURL(new Blob([transcript],{type:'text/plain;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download='角色聊天-'+char.name+'.txt';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    });
    $('rdReplyRetry')?.addEventListener('click',()=>{
      const btn=$('messages')?.querySelector('.reply-error button');
      if(btn)btn.click();
    });
    const messages = $('messages');
    if (messages && typeof MutationObserver === 'function') {
      const replyObserver = new MutationObserver(queueReplySync);
      replyObserver.observe(messages, {childList: true, characterData: true, subtree: true});
    }
    const avatar = $('headerAvatar');
    if (avatar && typeof MutationObserver === 'function') {
      const avatarObserver = new MutationObserver(() => { syncBackdrop();const s=$('rdScene');if(s){s.value=window.RoleChatActions?.scene?.()||'default';document.body.dataset.roleScene=s.value;} });
      avatarObserver.observe(avatar, {attributes: true, attributeFilter: ['src']});
    }
    $('rdChatCover').addEventListener('error', e => {
      if (!e.target.src.endsWith('/nuannuan-portrait.jpg')) e.target.src = 'assets/avatars/nuannuan-portrait.jpg';
    });
    attachGestures();
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'icon-btn rd-chat-back';
    back.textContent = '‹';
    back.title = '返回角色大厅';
    back.setAttribute('aria-label', '返回角色大厅');
    back.addEventListener('click', () => switchView(true));
    const header = document.querySelector('.chat-header');
    if (header) header.insertBefore(back, header.firstChild);
    const switchBtn = $('switchCharBtn');
    if (switchBtn) {
      switchBtn.textContent = '角色大厅';
      switchBtn.addEventListener('click', event => {
        event.stopImmediatePropagation();
        switchView(true);
      }, true);
    }
    window.addEventListener('popstate', () => {
      if (location.hash === '#chat') switchView(false, false);
      else switchView(true, false);
    });
    const list = $('customCharacterList');
    if (list && typeof MutationObserver === 'function') {
      let previous = '';
      const observer = new MutationObserver(() => {
        const signature = allCharacters().map(char => char.id + ':' + char.name + ':' + char.avatar).join('|');
        if (signature === previous) return;
        previous = signature;
        if (!root.hidden) render();
      });
      previous = allCharacters().map(char => char.id + ':' + char.name + ':' + char.avatar).join('|');
      observer.observe(list, {childList: true});
    }
    // A fresh visit must always open the swipeable character gallery.
    // Old sessions may have persisted #chat in the URL; don't resume that view.
    switchView(true, false);
    if (location.hash !== '#discover') history.replaceState({siroleView: 'discover'}, '', location.pathname + location.search + '#discover');
    queueReplySync();
  }
  window.RoleDiscovery=Object.freeze({showLobby:()=>switchView(true),openChat:id=>{const char=allCharacters().find(item=>item.id===id);if(char)startChat(char);},refresh:render});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();