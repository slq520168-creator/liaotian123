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
  const roleTraits=char=>Array.isArray(char?.traits)?char.traits.filter(x=>typeof x==='string'):[];
  const FEATURED_IDS=["neon_rina","jazz_zelia","city_selene","stage_rose","vivienne","rosalie","sylvie","elena","daphne","veronica","claire","phoebe","audrey","helene","luna","marisol","arthur","felix","roman","niko","jiangwu","muyue","yinling","shuangye","yinxuan","lanqi","qingshu","beihan","amara","luoyan","wuyue","xingye","haichao","yinyao","luojue","huajin","qiyun","celeste","maya","viala","tangli","anika"];
  const FEATURED_RANK=new Map(FEATURED_IDS.map((id,i)=>[id,i]));
  const available = () => allCharacters().filter(char => {
    if (!char || !char.id || char.portraitDraft===true) return false;
    if (['都市','治愈','悬疑','奇幻','古风','科幻','冒险','惊魂','民俗','言情','动漫'].includes(state.filter) && char.category !== state.filter) return false;
    if (state.filter === 'featured' && !FEATURED_RANK.has(char.id)) return false;
    if (state.filter === 'stories' && !window.RoleStory?.has?.(char.id)) return false;
    if (state.filter === 'international' && char.region !== 'international') return false;
    if (state.filter === 'photo' && !char.photoRealistic) return false;
    if (state.filter === 'female' && char.gender !== 'female') return false;
    if (state.filter === 'male' && char.gender !== 'male') return false;
    if (state.filter === 'mine' && char.isPreset) return false;
    if (state.filter === 'recent' && !(typeof chatHistories!=='undefined'&&(chatHistories[char.id]||[]).some(x=>x.sender==='user'))) return false;
    if (state.filter === 'liked' && !state.favorites.has(char.id)) return false;
    const query = state.query.trim().toLocaleLowerCase();
    return !query || [char.name,char.latinName,char.countryLabel,char.region,char.tag,char.personality,char.interests,char.background,char.category,char.headline,char.hook,char.sceneLabel,...roleTraits(char)].some(value=>String(value||'').toLocaleLowerCase().includes(query));
  }).sort((a,b)=>{
    if(state.filter==='recent')return String((typeof chatHistories!=='undefined'&&chatHistories[b.id]?.at(-1)?.createdAt)||'').localeCompare(String((typeof chatHistories!=='undefined'&&chatHistories[a.id]?.at(-1)?.createdAt)||''));
    if(state.filter==='mine'||state.filter==='liked')return 0;
    return (FEATURED_RANK.get(a.id)??99)-(FEATURED_RANK.get(b.id)??99);
  });
  // Never replace failed character art with the same unrelated face.
  // A failed transformed Pexels request retries that very character's original photo only.
  function setRolePortrait(img, char) {
    const url = String(char?.avatar || '');
    img.alt = char.name + '的角色立绘';
    img.dataset.roleId = String(char.id);
    img.classList.toggle('rd-full-body-art',char.illustratedFullBody===true);
    img.onerror = () => {
      if(img.dataset.imageRetried !== 'yes' && /^https:\/\/images\.pexels\.com\/photos\/\d+\/pexels-photo-\d+\.jpeg\?/i.test(url)){
        img.dataset.imageRetried = 'yes';
        img.src = url.split('?')[0] + '?auto=compress&cs=tinysrgb&w=800';
        return;
      }
      img.onerror = null;
      img.hidden = true;
      img.closest('.rd-mini-card, .rd-card')?.classList.add('rd-portrait-unavailable');
    };
    if(url) img.src=url;else{img.removeAttribute('src');img.hidden=true;img.closest('.rd-mini-card, .rd-card')?.classList.add('rd-portrait-unavailable');}
  }
  const image = (char, className, eager = false) => {
    const img = document.createElement('img');
    img.className = className;
    img.loading = eager ? 'eager' : 'lazy';
    if(eager)img.fetchPriority='high';
    img.decoding = 'async';
    setRolePortrait(img,char);
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
  let galleryScroll=0;
  function switchView(showLobby, updateHistory = true) {
    if(!showLobby&&!root.hidden)galleryScroll=root.scrollTop;
    if(showLobby)closeCardPreview();
    root.hidden = !showLobby;
    document.body.classList.toggle('role-discovery-open', showLobby);
    document.body.classList.toggle('role-chat-immersive', !showLobby);
    window.RoleAvatarStage?.setActive?.(!showLobby);
    if (!showLobby){stopVideo($('rdHeroVideo'));syncBackdrop();}
    else stopVideo($('rdChatVideo'));
    closeHistory();
    if (showLobby) {
      render();
      root.scrollTop = galleryScroll;
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
    const src=char.avatar||'';
    if(cover.dataset.roleId!==String(char.id)||cover.getAttribute('src')!==src){cover.dataset.roleId=String(char.id);cover.hidden=!src;if(src)cover.src=src;else cover.removeAttribute('src');}
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
    document.body.classList.remove('rd-history-open','rd-scene-only');
    const btn = $('rdHistoryToggle');
    if (btn) { btn.setAttribute('aria-pressed','false'); btn.setAttribute('aria-label','切换沉浸模式');btn.textContent='沉浸模式'; }
  }
  function toggleHistory() {
    const open = !document.body.classList.toggle('rd-scene-only');
    const btn = $('rdHistoryToggle');
    if (btn) { btn.setAttribute('aria-pressed', String(!open)); btn.setAttribute('aria-label', open ? '切换沉浸模式' : '返回完整聊天'); btn.textContent=open?'沉浸模式':'完整聊天'; }
    if (open) { const box = $('messagesContainer'); if (box) box.scrollTop = box.scrollHeight; }
  }
  function startChat(char,openStory=false) {
    if (!char) return;
    closeCardPreview();
    switchView(false);
    if (typeof switchCharacter === 'function') switchCharacter(char.id);
    syncBackdrop();
    if(openStory&&window.RoleStory?.has?.(char.id)){const panel=$('roleStoryPanel');if(panel?.hidden)window.RoleStory.openPanel();else window.RoleStory.render();}
    requestAnimationFrame(()=>{const box=$('messagesContainer');if(box)box.scrollTop=box.scrollHeight;});
    if (typeof closeSidebar === 'function') closeSidebar();
    requestAnimationFrame(() => {
      window.__ROLE_HUMAN_RENDERER?.resize?.();
      if (!openStory&&matchMedia('(pointer:fine)').matches) $('userInput')?.focus({preventScroll: true});
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
    const id=current()?.id;
    $('rdCharacterGrid').querySelectorAll('[data-character-id]').forEach(card=>card.classList.toggle('is-current',card.dataset.characterId===id));
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
    if(state.filter==='liked'){state.index=0;render();return;}
    renderHero();
    const button=[...$('rdCharacterGrid').querySelectorAll('[data-character-id]')].find(card=>card.dataset.characterId===char.id)?.querySelector('.rd-mini-fav');
    if(button){const liked=state.favorites.has(char.id);button.classList.toggle('is-liked',liked);button.setAttribute('aria-pressed',String(liked));button.setAttribute('aria-label',(liked?'取消收藏':'收藏')+char.name);button.textContent=liked?'♥':'♡';}
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
      illustration.hidden = false;
      illustration.classList.remove('rd-art-retry');
      illustration.closest('.rd-card')?.classList.remove('rd-portrait-unavailable');
      delete illustration.dataset.imageRetried;
      setRolePortrait(illustration,char);
    }
    const videoSrc = roleVideo(char);
    playVideo($('rdHeroVideo'),videoSrc);
    illustration.alt = char.name + '的角色形象';
    name.textContent = char.name;
    age.textContent = Number(char.age) >= 18 ? String(char.age) : '';
    bio.textContent = String(char.hook || char.personality || char.greeting || '').replace(/【角色自定义设定】[\s\S]*?【自定义设定结束】/g,'').trim().slice(0,140);
    const heroScene=$('rdHeroScene'),heroTraits=$('rdHeroTraits');
    if(heroScene)heroScene.textContent=char.sceneLabel || char.headline || '';
    if(heroTraits)heroTraits.replaceChildren(...roleTraits(char).slice(0,3).map(value=>{const item=document.createElement('span');item.textContent=value;return item;}));
    tag.textContent = char.tag || '遇见新角色';
    const liked = state.favorites.has(char.id);
    favorite.classList.toggle('is-liked', liked);
    favorite.setAttribute('aria-pressed', String(liked));
    favorite.setAttribute('aria-label', liked ? '取消收藏' + char.name : '收藏' + char.name);
    $('rdStartChat').textContent = '与' + char.name + '开始聊天';
    card.setAttribute('aria-label', '查看' + char.name + '，左右滑动切换角色');
  }
  const COLOR_BY_CATEGORY=Object.freeze({'都市':'#e0a7cb','治愈':'#b0e2c6','悬疑':'#a2b1dc','奇幻':'#d3a8f7','古风':'#e7c38b','科幻':'#87c4e8','冒险':'#eac28d'});
  let activeCardPreview=null;
  function closeCardPreview(restoreFocus=false){
    const card=activeCardPreview;activeCardPreview=null;
    if(!card)return;
    card.classList.remove('is-preview');
    const trigger=card.querySelector('.rd-mini-open'),panel=card.querySelector('.rd-mini-preview');
    if(panel)panel.hidden=true;
    trigger?.setAttribute('aria-expanded','false');
    if(restoreFocus&&card.isConnected)trigger?.focus({preventScroll:true});
  }
  function toggleCardPreview(card){
    if(activeCardPreview===card){closeCardPreview(true);return;}
    closeCardPreview();
    activeCardPreview=card;
    card.classList.add('is-preview');
    card.querySelector('.rd-mini-preview').hidden=false;
    card.querySelector('.rd-mini-open').setAttribute('aria-expanded','true');
  }
  function storyFor(char){return window.RoleStory?.has?.(char.id)?window.RoleStory.description(char.id):null;}
  function storyProgress(story){return story.finished?'已完结':story.chapter?'继续 · 第'+(story.chapter+1)+'章':'六章互动故事';}
  function renderGrid() {
    const container=$('rdCharacterGrid'),list=available(),currentId=current()?.id,fragment=document.createDocumentFragment();
    if(!container)return;
    closeCardPreview();
    let renderOrder=0;
    for(const char of list){
      const story=storyFor(char);
      const card=document.createElement('article');
      card.className='rd-mini-card'+(char.id===currentId?' is-current':'');
      card.dataset.characterId=char.id;if(story)card.dataset.story='chaptered';
      card.style.setProperty('--rd-accent',COLOR_BY_CATEGORY[char.category]||'#cbb2f8');
      const open=document.createElement('button');
      open.type='button';open.className='rd-mini-open';
      open.setAttribute('aria-label','预览'+char.name+'：'+(char.headline||char.tag||'角色'));
      open.setAttribute('aria-expanded','false');
      open.appendChild(image(char,'rd-mini-image',renderOrder++<4));
      const shade=document.createElement('span');shade.className='rd-mini-shade';open.append(shade);
      if(story){
        const category=document.createElement('span');category.className='rd-mini-category';
        category.textContent=story.genre+' · '+storyProgress(story);open.append(category);
      }
      const info=document.createElement('span');info.className='rd-mini-details';
      const title=document.createElement('span');title.className='rd-mini-title';
      const name=document.createElement('strong');name.textContent=char.name;title.append(name);
      const age=Number(char.age);if(Number.isFinite(age)&&age>=18){const label=document.createElement('span');label.className='rd-mini-age';label.textContent=String(age);title.append(label);}
      const role=document.createElement('span');role.className='rd-mini-role';role.textContent=story?story.title:char.headline||char.tag||'自定义角色';
      const hook=document.createElement('span');hook.className='rd-mini-hook';
      hook.textContent=String(char.hook||char.greeting||char.personality||'').replace(/【角色自定义设定】[\s\S]*?【自定义设定结束】/g,'').trim().slice(0,88);
      info.append(title,role,hook);open.append(info);
      open.addEventListener('click',()=>toggleCardPreview(card));
      const panel=document.createElement('div');panel.className='rd-mini-preview';panel.hidden=true;
      const speech=document.createElement('p');speech.className='rd-mini-opening';
      // Opening text comes from the character's saved greeting or current chapter, never a fabricated live reply.
      speech.textContent=String(story?story.chapterTitle+' · '+story.text:char.greeting||char.hook||char.personality||'').slice(0,180);
      panel.append(speech);
      const chat=document.createElement('button');chat.type='button';chat.className='rd-mini-enter';
      chat.textContent=story?(story.finished?'查看结局':story.chapter?'继续故事':'开始故事'):'开始聊天';
      chat.addEventListener('click',()=>startChat(char,Boolean(story)));panel.append(chat);
      if(story){const normal=document.createElement('button');normal.type='button';normal.className='rd-mini-chat-secondary';normal.textContent='自由聊天';normal.addEventListener('click',()=>startChat(char));panel.append(normal);}
      const favorite=document.createElement('button');
      favorite.type='button';favorite.className='rd-mini-fav'+(state.favorites.has(char.id)?' is-liked':'');
      favorite.setAttribute('aria-label',(state.favorites.has(char.id)?'取消收藏':'收藏')+char.name);
      favorite.setAttribute('aria-pressed',String(state.favorites.has(char.id)));
      favorite.textContent=state.favorites.has(char.id)?'♥':'♡';
      favorite.addEventListener('click',()=>toggleFavoriteFor(char));
      const preview=document.createElement('button');preview.type='button';preview.className='rd-photo-button rd-mini-photo';preview.textContent='⤢';preview.setAttribute('aria-label','查看'+char.name+'完整图片');preview.addEventListener('click',()=>openPhoto(char));
      card.append(open,panel,favorite,preview);
      if(roleVideo(char)){
        const play=document.createElement('button');play.type='button';play.className='rd-mini-video';play.textContent='▶';
        play.setAttribute('aria-label','播放'+char.name+'的视频');play.addEventListener('click',()=>{openPhoto(char);if($('rdPhotoDialog')?.open&&photoRole===char)togglePhotoVideo();});
        card.append(play);
      }
      fragment.append(card);
    }
    container.replaceChildren(fragment);
    if($('rdGridCount'))$('rdGridCount').textContent=list.length+(state.filter==='stories'?' 部故事':' 位角色');
    if($('rdGridEmpty'))$('rdGridEmpty').hidden=list.length>0;
  }
  function render() { renderGrid(); renderHero(); }
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
      if(card.hasPointerCapture&&card.setPointerCapture&&!card.hasPointerCapture(event.pointerId))card.setPointerCapture(event.pointerId);
      card.style.transition = 'none';
      card.style.transform = 'translateX(' + Math.max(-90, Math.min(90, dx * 0.45)) + 'px) rotate(' + Math.max(-7, Math.min(7, dx * 0.045)) + 'deg)';
    });
    const finish = event => {
      const drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      state.drag = null;
      if(card.hasPointerCapture?.(event.pointerId))card.releasePointerCapture?.(event.pointerId);
      if (drag.moved) state.suppressClickUntil = Date.now() + 360;
      card.style.transition = '';
      card.style.transform = '';
      const dx = event.clientX - drag.x;
      if (event.type==='pointerup' && drag.moved && Math.abs(dx) > 58) selectIndex(state.index + (dx < 0 ? 1 : -1));
    };
    card.addEventListener('pointerup', finish);
    card.addEventListener('pointercancel', finish);
    card.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); selectIndex(state.index + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); selectIndex(state.index - 1); }
      if (event.key === 'Enter') { event.preventDefault(); startChat(current()); }
    });
  }
  let photoRole=null,photoResume=null,photoIndex=0;
  function openPhoto(char,selectedPath=null){
    if(!char)return;
    const dialog=$('rdPhotoDialog'),img=$('rdFullPhoto'),video=$('rdFullVideo');
    if(!dialog||!img||!video||typeof dialog.showModal!=='function')return;
    photoRole=char;photoIndex=Math.max(0,Array.isArray(char.portraitGallery)?char.portraitGallery.indexOf(selectedPath):0);photoResume=root.hidden?'rdChatVideo':'rdHeroVideo';$(photoResume)?.pause();
    $('rdPhotoName').textContent=char.name;
    $('rdPhotoError').hidden=Boolean(char.avatar);
    img.hidden=!char.avatar;img.alt=char.name+'完整人物图片';
    img.onerror=()=>{img.hidden=true;$('rdPhotoError').hidden=false;};
    if(char.avatar)img.src=char.portraitGallery?.[photoIndex]||char.avatar;else img.removeAttribute('src');
    video.hidden=true;const gallery=Array.isArray(char.portraitGallery)&&char.portraitGallery.length>1;
    $('rdPhotoMode').hidden=!gallery&&!roleVideo(char);
    $('rdPhotoMode').textContent=gallery?'下一张 · '+(photoIndex+1)+'/'+char.portraitGallery.length:'播放视频';
    $('rdPhotoChat').hidden=root.hidden&&typeof activeCharacterId!=='undefined'&&activeCharacterId===char.id;
    dialog.showModal();
  }
  function togglePhotoVideo(){
    if(Array.isArray(photoRole?.portraitGallery)&&photoRole.portraitGallery.length>1){
      const gallery=photoRole.portraitGallery,img=$('rdFullPhoto');
      photoIndex=(photoIndex+1)%gallery.length;
      img.hidden=false;$('rdPhotoError').hidden=true;
      img.src=gallery[photoIndex];
      $('rdPhotoMode').textContent='下一张 · '+(photoIndex+1)+'/'+gallery.length;
      return;
    }
    const v=$('rdFullVideo'),img=$('rdFullPhoto'),btn=$('rdPhotoMode'),url=roleVideo(photoRole);
    if(!url)return;
    if(!v.hidden){v.onerror=null;v.pause();v.hidden=true;v.removeAttribute('src');v.load();img.hidden=!img.naturalWidth;$('rdPhotoError').hidden=!img.hidden;btn.textContent='播放视频';return;}
    v.src=url;v.hidden=false;img.hidden=true;$('rdPhotoError').hidden=true;btn.textContent='查看图片';
    v.onerror=()=>{if(!v.hidden)togglePhotoVideo();};
    v.play().catch(()=>{/* native video controls remain available */});
  }
  function closePhoto(){
    const v=$('rdFullVideo'),img=$('rdFullPhoto');v.onerror=null;v.pause();v.hidden=true;v.removeAttribute('src');v.load();img.onerror=null;img.removeAttribute('src');photoRole=null;
    if(photoResume==='rdHeroVideo'&&!root.hidden)renderHero();
    if(photoResume==='rdChatVideo'&&root.hidden)syncBackdrop();
    photoResume=null;
  }
  function boot() {
    // Render the existing catalog before optional media controls can affect startup.
    renderGrid();
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
    $('rdHeroPhoto')?.addEventListener('click',()=>openPhoto(current()));
    $('rdChatPhoto')?.addEventListener('click',()=>openPhoto(allCharacters().find(char=>char.id===activeCharacterId)));
    $('rdPhotoClose')?.addEventListener('click',()=>$('rdPhotoDialog').close());
    $('rdPhotoDialog')?.addEventListener('close',closePhoto);
    $('rdPhotoChat')?.addEventListener('click',()=>{const char=photoRole;$('rdPhotoDialog').close();if(char)startChat(char);});
    $('rdPhotoMode')?.addEventListener('click',togglePhotoVideo);
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
    root.addEventListener('pointerdown',event=>{if(activeCardPreview&&!activeCardPreview.contains(event.target))closeCardPreview();});
    root.addEventListener('keydown',event=>{if(event.key==='Escape'&&activeCardPreview){event.preventDefault();closeCardPreview(true);}});
    $('rdSearch').addEventListener('input', event => {
      state.query = event.target.value;
      state.index = 0;
      render();
    });
    root.querySelectorAll('[data-role-filter]').forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.roleFilter)));
    $('rdGoHome')?.addEventListener('click', () => switchView(true));
    $('rdHistoryToggle').addEventListener('click', toggleHistory);
    const menu=$('rdChatMenu');
    menu?.addEventListener('click',event=>{if(event.target.closest('button'))menu.open=false;});
    document.addEventListener('pointerdown',event=>{if(menu?.open&&!menu.contains(event.target))menu.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector('summary')?.focus();}});
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
    $('rdChatCover').addEventListener('error',e=>{e.target.hidden=true;});
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
  window.RoleDiscovery=Object.freeze({showLobby:()=>switchView(true),openChat:id=>{const char=allCharacters().find(item=>item.id===id);if(char)startChat(char);},openPortrait:(id,src)=>{const char=allCharacters().find(item=>item.id===id);if(char&&(char.avatar===src||char.portraitGallery?.includes(src)))openPhoto(char,src);},refresh:render});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();