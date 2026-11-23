(() => {
  'use strict';
  const root = document.getElementById('roleDiscovery');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const FAV_KEY = 'sirole_favorites_v1';
  const VIDEO_URL_RE = /^(?:https:\/\/[^\s]+|\/?(?:assets|media|videos)\/[a-z0-9_.\/-]+\.(?:mp4|webm))$/i;
  const state = {index: 0, filter: 'all', query: '', favorites: new Set(), drag: null, suppressClickUntil: 0};
  try {
    const stored = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    if (Array.isArray(stored)) state.favorites = new Set(stored.filter(id => typeof id === 'string'));
  } catch {}
  const allCharacters = () => typeof characters !== 'undefined' && Array.isArray(characters) ? characters : [];
  const available = () => allCharacters().filter(char => {
    if (!char || !char.id) return false;
    if (state.filter === 'female' && char.gender !== 'female') return false;
    if (state.filter === 'male' && char.gender !== 'male') return false;
    if (state.filter === 'mine' && char.isPreset) return false;
    if (state.filter === 'liked' && !state.favorites.has(char.id)) return false;
    const query = state.query.trim().toLocaleLowerCase();
    return !query || [char.name, char.tag, char.personality, char.interests].some(value => String(value || '').toLocaleLowerCase().includes(query));
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
    if (!showLobby) syncBackdrop();
    closeHistory();
    if (showLobby) {
      render();
      root.scrollTop = 0;
    } else {
      window.__ROLE_HUMAN_RENDERER?.resize?.();
      window.__ROLE_HUMAN_RENDERER?.syncCharacter?.();
    }
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
      text.textContent=error.querySelector('span')?.textContent||'回复暂时失败，请重试。';
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
      $('userInput')?.focus({preventScroll: true});
    });
  }
  function openCreate() {
    switchView(false);
    $('openCreateModalBtn')?.click();
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
  function toggleFavorite() {
    const char = current();
    if (!char) return;
    if (state.favorites.has(char.id)) state.favorites.delete(char.id);
    else state.favorites.add(char.id);
    persistFavorites();
    $('rdFavorite').classList.remove('rd-heart-pop');
    void $('rdFavorite').offsetWidth;
    $('rdFavorite').classList.add('rd-heart-pop');
    if (state.filter === 'liked') {
      state.index = 0;
      render();
    } else {
      renderHero();
      renderGrid();
    }
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
    const heroVideo = $('rdHeroVideo');
    const videoSrc = String(char.previewVideo || char.video || '').trim();
    const hasVideo = VIDEO_URL_RE.test(videoSrc);
    if (heroVideo) {
      if (hasVideo && heroVideo.dataset.source !== videoSrc) {
        heroVideo.dataset.source = videoSrc;
        heroVideo.src = videoSrc;
        heroVideo.load();
      }
      if (!hasVideo) {
        heroVideo.pause();
        heroVideo.removeAttribute('src');
        heroVideo.dataset.source = '';
        heroVideo.load();
      }
      heroVideo.hidden = !hasVideo;
      if (hasVideo) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) heroVideo.pause();
        else heroVideo.play().catch(() => {heroVideo.hidden = true;});
      }
    }
    illustration.alt = char.name + '的角色形象';
    name.textContent = char.name;
    age.textContent = Number(char.age) >= 18 ? String(char.age) : '';
    bio.textContent = String(char.personality || char.greeting || '').replace(/【角色自定义设定】[\s\S]*?【自定义设定结束】/g, '').trim().slice(0, 160);
    tag.textContent = char.tag || '遇见新角色';
    const liked = state.favorites.has(char.id);
    favorite.classList.toggle('is-liked', liked);
    favorite.setAttribute('aria-pressed', String(liked));
    favorite.setAttribute('aria-label', liked ? '取消收藏' + char.name : '收藏' + char.name);
    $('rdStartChat').textContent = '与' + char.name + '开始聊天';
    card.setAttribute('aria-label', '查看' + char.name + '，左右滑动切换角色');
  }
  function renderGrid() {
    const container = $('rdCharacterGrid');
    const list = available();
    const fragment = document.createDocumentFragment();
    for (const char of list) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rd-mini-card' + (char.id === current()?.id ? ' is-current' : '');
      button.setAttribute('aria-label', '选择' + char.name + '，' + (char.tag || '角色'));
      button.dataset.characterId = char.id;
      const portrait = image(char, 'rd-mini-image');
      const shade = document.createElement('span'); shade.className = 'rd-mini-shade';
      const details = document.createElement('span'); details.className = 'rd-mini-details';
      const title = document.createElement('strong'); title.textContent = char.name;
      const roleTag = document.createElement('small'); roleTag.textContent = char.tag || '专属角色';
      details.append(title, roleTag);
      button.append(portrait, shade, details);
      if (state.favorites.has(char.id)) {
        const heart = document.createElement('span');
        heart.className = 'rd-mini-heart';
        heart.textContent = '♥';
        heart.setAttribute('aria-hidden', 'true');
        button.appendChild(heart);
      }
      button.addEventListener('click', () => selectCharacter(char.id));
      fragment.appendChild(button);
    }
    container.replaceChildren(fragment);
    $('rdGridCount').textContent = String(list.length) + ' 位角色';
    $('rdGridEmpty').hidden = list.length > 0;
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
    $('rdHeroVideo').addEventListener('error', event => { event.target.hidden = true; });
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
      const avatarObserver = new MutationObserver(() => { syncBackdrop(); });
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
    const hash = location.hash;
    switchView(hash !== '#chat', false);
    queueReplySync();
  }
  window.RoleDiscovery=Object.freeze({showLobby:()=>switchView(true),openChat:id=>{const char=allCharacters().find(item=>item.id===id);if(char)startChat(char);},refresh:render});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();