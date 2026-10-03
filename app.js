/**
 * 角色聊天：角色独立历史、真实模型回复与可取消的请求生命周期。
 */
const CHAT_API_URL = (() => {
  try {
    const url = new URL(window.LIAOTIAN_CONFIG?.chatApiUrl || '', location.href);
    if (!window.LIAOTIAN_CONFIG?.chatApiUrl || url.username || url.password) return '';
    if (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return url.href;
  } catch (error) {}
  return '';
})();
const CHAT_LIMITS = Object.freeze({message: 30000, personality: 12000, system: 24000, reply: 30000, history: 12000});
const DEFAULT_AVATAR = 'assets/avatars/nuannuan-portrait.jpg';
const DEFAULT_USER_AVATAR = 'assets/avatars/user.svg';
const MAX_AVATAR_DATA_LENGTH = 180000;
const REQUEST_TIMEOUT_MS = 40000;
const LONG_REQUEST_TIMEOUT_MS = 100000;
let characters = [];
let activeCharacterId = 'nuannuan';
let chatHistories = Object.create(null);
let selectedFormAvatar = DEFAULT_AVATAR;
let userAvatar = DEFAULT_USER_AVATAR;
let roleAvatarUploadVersion = 0;
let userAvatarUploadVersion = 0;
let roleAvatarBusy = false;
let playerProfile = {id: '', name: '', about: ''};
let roleMemories = Object.create(null);
const previousVisits = Object.create(null);
let replyLength = 'auto';
let chatStyle = 'mature';
let lastConnectionWarmAt = 0;
const pendingReplies = new Map();
const replyErrors = new Map();
const byId = id => document.getElementById(id);
const sidebar = byId('sidebar');
const sidebarOverlay = byId('sidebarOverlay');
const presetCharacterList = byId('presetCharacterList');
const customCharacterList = byId('customCharacterList');
const headerAvatar = byId('headerAvatar');
const headerName = byId('headerName');
const headerTag = byId('headerTag');
const messagesContainer = byId('messagesContainer');
const messagesDiv = byId('messages');
const quickRepliesDiv = byId('quickReplies');
const userInput = byId('userInput');
const sendBtn = byId('sendBtn');
const createModalOverlay = byId('createModalOverlay');
const dialogReturnFocus = new Map();
let sidebarReturnFocus = null;
const createRoleForm = byId('createRoleForm');
const presetAvatarPicker = byId('presetAvatarPicker');
const roleAvatarUpload = byId('roleAvatarUpload');
const userAvatarUpload = byId('userAvatarUpload');
const replyStatus = byId('replyStatus');

function readStoredJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('无法读取本机记录：', key);
    return fallback;
  }
}

function safeAvatar(value, fallback = DEFAULT_AVATAR) {
  if (typeof value !== 'string') return fallback;
  const src = value.trim();
  if (src.length <= MAX_AVATAR_DATA_LENGTH && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)) return src;
  if (/^assets\/avatars\/[a-z0-9_-]+\.(svg|jpg|jpeg|png|webp)$/i.test(src)) return src;
  try {
    const url = new URL(src);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch (error) {}
  return fallback;
}

function normalizeCustomCharacter(value) {
  if (!value || typeof value !== 'object' || !/^custom_[a-z0-9_-]+$/i.test(value.id || '')) return null;
  if (!['name', 'tag', 'greeting', 'personality'].every(key => typeof value[key] === 'string' && value[key].trim())) return null;
  return {
    id: value.id, isPreset: false,
    name: value.name.trim().slice(0, 12), tag: value.tag.trim().slice(0, 20),
    greeting: value.greeting.trim().slice(0, 300),
    personality: value.personality.trim().slice(0, CHAT_LIMITS.personality),
    avatar: safeAvatar(value.avatar),
    gender: ['male', 'female', 'unspecified'].includes(value.gender) ? value.gender : 'unspecified',
    age: Number.isFinite(Number(value.age)) && Number(value.age) >= 18 ? Math.min(100, Math.floor(Number(value.age))) : 24,
    voice: typeof value.voice === 'string' && value.voice.trim() ? value.voice.trim().slice(0, 240) : '忠实使用用户设定的性格和说话风格，保持自然、尊重和体贴。',
    interests: typeof value.interests === 'string' ? value.interests.trim().slice(0, 240) : '',
    relationship: typeof value.relationship === 'string' ? value.relationship.trim().slice(0, 300) : '',
    background: typeof value.background === 'string' ? value.background.trim().slice(0, 600) : '',
    conversation: value.conversation && typeof value.conversation === 'object' && !Array.isArray(value.conversation) ? Object.fromEntries(Object.entries(value.conversation).filter(([key, text]) => key.length < 20 && typeof text === 'string').slice(0, 8).map(([key, text]) => [key, text.slice(0, 300)])) : null,
    quickReplies: Array.isArray(value.quickReplies) && value.quickReplies.some(x => typeof x === 'string' && x.trim()) ? value.quickReplies.filter(x => typeof x === 'string' && x.trim()).slice(0, 12).map(x => x.slice(0, 100)) : ['你好，认识一下', '今天想找你聊聊', '说说你喜欢的事', '听听我的心事', '我有件开心的事', '讲一个有意思的小故事']
  };
}

function loadDataFromStorage() {
  const profile = readStoredJSON('liaotian_player_profile', {});
  playerProfile = {id: typeof profile?.id === 'string' ? profile.id.slice(0, 80) : makeId(), name: typeof profile?.name === 'string' ? profile.name.slice(0, 24) : '', about: typeof profile?.about === 'string' ? profile.about.slice(0, 600) : ''};
  const memories = readStoredJSON('liaotian_role_memories', {});
  roleMemories = Object.create(null);
  const length = readStoredJSON('liaotian_reply_length', 'auto');
  replyLength = ['auto', 'short', 'long'].includes(length) ? length : 'auto';
  const style = readStoredJSON('liaotian_chat_style', 'mature');
  chatStyle = typeof style === 'string' && Object.hasOwn(ROLE_CHAT_STYLES, style) ? style : 'mature';
  try {
    const storedAvatar = localStorage.getItem('liaotian_user_avatar');
    if (storedAvatar) userAvatar = safeAvatar(storedAvatar, DEFAULT_USER_AVATAR);
  } catch (error) {}
  const storedCustoms = readStoredJSON('liaotian_custom_chars', []);
  const seen = new Set(PRESET_CHARACTERS.map(char => char.id));
  const customs = (Array.isArray(storedCustoms) ? storedCustoms : []).map(normalizeCustomCharacter).filter(char => {
    if (!char || seen.has(char.id)) return false;
    seen.add(char.id);
    return true;
  });
  characters = PRESET_CHARACTERS.concat(customs);
  const storedHistories = readStoredJSON('liaotian_chat_histories', {});
  chatHistories = Object.create(null);
  if (storedHistories && typeof storedHistories === 'object' && !Array.isArray(storedHistories)) {
    characters.forEach(char => {
      const history = storedHistories[char.id];
      if (!Array.isArray(history)) return;
      chatHistories[char.id] = history.filter(msg => msg && ['user', 'bot'].includes(msg.sender) && typeof msg.text === 'string').map(msg => ({
        id: typeof msg.id === 'string' ? msg.id : makeId(),
        sender: msg.sender, text: msg.text,
        createdAt: typeof msg.createdAt === 'string' ? msg.createdAt.slice(0, 30) : '',
        timestamp: typeof msg.timestamp === 'string' ? msg.timestamp.slice(0, 20) : ''
      }));
      if (chatHistories[char.id].length && chatHistories[char.id][chatHistories[char.id].length - 1].sender === 'user') {
        replyErrors.set(char.id, {message: '回复未完成，请重试。'});
      }
    });
  }
  characters.forEach(char => {
    roleMemories[char.id] = ROLE_MEMORY.normalize(memories?.[char.id]);
    if (!Object.hasOwn(memories || {}, char.id)) {
      (chatHistories[char.id] || []).filter(msg => msg.sender === 'user').forEach(msg => ROLE_MEMORY.learn(roleMemories[char.id], msg.text, msg.createdAt || ''));
    }
    previousVisits[char.id] = roleMemories[char.id].lastSeen;
  });
  let lastActive = '';
  try { lastActive = localStorage.getItem('liaotian_active_char') || ''; } catch (error) {}
  activeCharacterId = characters.some(char => char.id === lastActive) ? lastActive : PRESET_CHARACTERS[0].id;
}

function saveDataToStorage() {
  try {
    localStorage.setItem('liaotian_custom_chars', JSON.stringify(characters.filter(char => !char.isPreset)));
    localStorage.setItem('liaotian_chat_histories', JSON.stringify(chatHistories));
    localStorage.setItem('liaotian_active_char', activeCharacterId);
    localStorage.setItem('liaotian_player_profile', JSON.stringify(playerProfile));
    localStorage.setItem('liaotian_role_memories', JSON.stringify(roleMemories));
    localStorage.setItem('liaotian_reply_length', JSON.stringify(replyLength));
    localStorage.setItem('liaotian_chat_style', JSON.stringify(chatStyle));
    if (replyStatus.textContent === '空间不足，暂时无法保存。') replyStatus.textContent = '';
    return true;
  } catch (error) {
    replyStatus.textContent = '空间不足，暂时无法保存。';
    return false;
  }
}

function makeId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getCurrentTime() {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

function createAvatar(src, className, name) {
  const img = document.createElement('img');
  img.className = className;
  img.src = safeAvatar(src);
  img.alt = name + '的头像';
  img.decoding = 'async';
  img.onerror = () => {
    img.onerror = null;
    img.src = DEFAULT_AVATAR;
  };
  return img;
}

function updateViewportHeight() {
  const viewport = window.visualViewport;
  const height = viewport ? viewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', Math.round(height) + 'px');
  document.documentElement.style.setProperty('--viewport-top', viewport ? Math.max(0, viewport.offsetTop) + 'px' : '0px');
  const typing = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  document.documentElement.classList.toggle('keyboard-open', typing && height < window.innerHeight - 100);
  syncSidebarLayout();
}

function usesSidebarDrawer() {
  return window.matchMedia('(max-width: 767px)').matches ||
    (document.documentElement.classList.contains('keyboard-open') && window.matchMedia('(max-width: 1199px)').matches);
}

function syncSidebarLayout() {
  const drawer = usesSidebarDrawer();
  if (!drawer) {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    byId('openSidebarBtn').setAttribute('aria-expanded', 'false');
  }
  const drawerOpen = drawer && sidebar.classList.contains('active');
  sidebar.setAttribute('aria-hidden', String(drawer && !drawerOpen));
  sidebar.inert = drawer && !drawerOpen;
  document.querySelector('.chat-main').inert = drawerOpen;
}

function restoreInterfaceFocus(previous) {
  const bounds = previous?.getBoundingClientRect();
  const visible = bounds && bounds.width && bounds.height && bounds.right > 0 && bounds.x < window.innerWidth && bounds.bottom > 0 &&
    bounds.y < window.innerHeight && !previous.closest('[inert]');
  (visible && previous.isConnected ? previous : byId('roleDetailsBtn')).focus({preventScroll: true});
}

function renderChatStyleControl() {
  let group = byId('chatStyleControls');
  if (!group) {
    group = document.createElement('div');
    group.id = 'chatStyleControls';
    group.className = 'chat-tool-group';
    document.querySelector('.chat-tools').insertBefore(group, byId('emojiBtn').nextSibling);
  }
  group.replaceChildren();
  const label = document.createElement('label');
  label.htmlFor = 'chatStyle';
  label.textContent = '风格';
  const select = document.createElement('select');
  select.id = 'chatStyle';
  select.setAttribute('aria-label', '聊天风格');
  Object.entries(ROLE_CHAT_STYLES).forEach(([value, style]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = style.label;
    select.appendChild(option);
  });
  group.append(label, select);
}

function init() {
  renderChatStyleControl();
  loadDataFromStorage();
  setupEventListeners();
  renderAvatarPicker();
  updateUserAvatarPreview();
  byId('replyLength').value = replyLength;
  byId('chatStyle').value = chatStyle;
  renderEmojiPicker();
  switchCharacter(activeCharacterId, false);
  updateViewportHeight();
  saveDataToStorage();
  warmReplyConnection();
  document.addEventListener('visibilitychange', () => {if (!document.hidden) warmReplyConnection();});
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  window.addEventListener('resize', updateViewportHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportHeight);
    window.visualViewport.addEventListener('scroll', updateViewportHeight);
  }
  document.addEventListener('focusin', () => {requestAnimationFrame(updateViewportHeight); setTimeout(updateViewportHeight, 350);});
  document.addEventListener('focusout', () => {requestAnimationFrame(updateViewportHeight); setTimeout(updateViewportHeight, 350);});
}

function warmReplyConnection() {
  if (!CHAT_API_URL || navigator.onLine === false || Date.now() - lastConnectionWarmAt < 300000) return;
  lastConnectionWarmAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  // 只预热连接和函数，不生成回复，也不发送用户资料。
  fetch(CHAT_API_URL, {method: 'OPTIONS', credentials: 'omit', signal: controller.signal}).catch(() => {}).finally(() => clearTimeout(timer));
}

function setupEventListeners() {
  byId('openSidebarBtn').addEventListener('click', openSidebar);
  byId('closeSidebarBtn').addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  byId('switchCharBtn').addEventListener('click', openSidebar);
  byId('clearChatBtn').addEventListener('click', clearCurrentChat);
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    updateComposer();
  });
  userInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      handleSendMessage();
    }
  });
  sendBtn.addEventListener('click', handleSendMessage);
  byId('openCreateModalBtn').addEventListener('click', () => {
    closeSidebar();
    openModal();
  });
  byId('closeModalBtn').addEventListener('click', closeModal);
  byId('cancelModalBtn').addEventListener('click', closeModal);
  createModalOverlay.addEventListener('click', event => {
    if (event.target === createModalOverlay) closeModal();
  });
  document.addEventListener('keydown', event => {
    const dialog = document.querySelector('.modal-overlay.active');
    if (event.key === 'Escape') {
      if (dialog) {
        if (dialog.id === 'createModalOverlay') closeModal();
        else closeDialog(dialog.id);
      } else if (sidebar.classList.contains('active')) closeSidebar();
      else {
        byId('emojiPicker').hidden = true;
        byId('emojiBtn').setAttribute('aria-expanded', 'false');
      }
      event.preventDefault();
    } else if (event.key === 'Tab') {
      const container = dialog || (usesSidebarDrawer() && sidebar.classList.contains('active') ? sidebar : null);
      if (container) {
        const controls = [...container.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
          .filter(item => !item.disabled && !item.hidden && item.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (first && (!container.contains(document.activeElement) || document.activeElement === container.querySelector('.modal') ||
          (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }
  });
  byId('chooseRoleAvatarBtn').addEventListener('click', () => roleAvatarUpload.click());
  roleAvatarUpload.addEventListener('change', handleRoleAvatarUpload);
  byId('changeUserAvatarBtn').addEventListener('click', () => userAvatarUpload.click());
  userAvatarUpload.addEventListener('change', handleUserAvatarUpload);
  createRoleForm.addEventListener('submit', handleCreateRole);
  byId('uploadRoleCodeBtn').addEventListener('click', openRoleCodeEditor);
  byId('chooseRoleCodeFileBtn').addEventListener('click', () => byId('roleCodeUpload').click());
  byId('useRoleCodeTemplateBtn').addEventListener('click', () => {
    byId('roleCodeEditor').value = createRoleCodeTemplate();
    byId('roleCodeEditorStatus').textContent = '';
    saveRoleCodeDraft();
  });
  byId('roleCodeEditor').addEventListener('input', saveRoleCodeDraft);
  byId('closeRoleCodeBtn').addEventListener('click', () => closeDialog('roleCodeModalOverlay'));
  byId('cancelRoleCodeBtn').addEventListener('click', () => closeDialog('roleCodeModalOverlay'));
  byId('roleCodeForm').addEventListener('submit', handleRoleCodeSubmit);
  byId('roleCodeEditor').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      byId('roleCodeForm').requestSubmit();
    }
  });
  byId('roleCodeUpload').addEventListener('change', handleRoleCodeUpload);
  byId('replyLength').addEventListener('change', () => {replyLength = byId('replyLength').value; saveDataToStorage();});
  byId('chatStyle').addEventListener('change', () => {
    const value = byId('chatStyle').value;
    if (!Object.hasOwn(ROLE_CHAT_STYLES, value)) return;
    chatStyle = value;
    const char = characters.find(item => item.id === activeCharacterId);
    renderQuickReplies(char);
    updateComposer();
    saveDataToStorage();
  });
  byId('emojiBtn').addEventListener('click', () => {
    byId('emojiPicker').hidden = !byId('emojiPicker').hidden;
    byId('emojiBtn').setAttribute('aria-expanded', String(!byId('emojiPicker').hidden));
  });
  byId('openMemoryBtn').addEventListener('click', openMemoryModal);
  byId('closeMemoryBtn').addEventListener('click', () => closeDialog('memoryModalOverlay'));
  byId('savePlayerProfileBtn').addEventListener('click', savePlayerProfile);
  byId('saveRolePreferencesBtn').addEventListener('click', saveRolePreferences);
  byId('forgetRoleMemoryBtn').addEventListener('click', forgetRoleMemory);
  byId('saveBackupBtn').addEventListener('click', saveBackup);
  byId('restoreBackupBtn').addEventListener('click', () => byId('backupUpload').click());
  byId('backupUpload').addEventListener('change', restoreBackup);
  byId('roleDetailsBtn').addEventListener('click', openRoleDetails);
  byId('closeRoleDetailsBtn').addEventListener('click', () => closeDialog('roleDetailsOverlay'));
  byId('adjustRoleBtn').addEventListener('click', () => {closeDialog('roleDetailsOverlay'); openMemoryModal();});
  ['memoryModalOverlay', 'roleDetailsOverlay', 'roleCodeModalOverlay'].forEach(id => byId(id).addEventListener('click', event => {if (event.target === byId(id)) closeDialog(id);}));
  window.addEventListener('online', () => {
    replyErrors.forEach((failure, id) => {
      const char = characters.find(item => item.id === id);
      if (failure.offline && char) requestCharacterReply(char);
    });
  });
  window.addEventListener('pagehide', () => {
    pendingReplies.forEach(job => job.controller.abort());
  });
}

function openSidebar() {
  if (!usesSidebarDrawer()) {
    sidebar.querySelector('.character-card.active')?.scrollIntoView({block: 'nearest'});
    return;
  }
  sidebarReturnFocus = document.activeElement;
  sidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
  byId('openSidebarBtn').setAttribute('aria-expanded', 'true');
  syncSidebarLayout();
  byId('closeSidebarBtn').focus({preventScroll: true});
}

function closeSidebar() {
  const wasOpen = sidebar.classList.contains('active');
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
  byId('openSidebarBtn').setAttribute('aria-expanded', 'false');
  syncSidebarLayout();
  if (wasOpen) restoreInterfaceFocus(sidebarReturnFocus);
  sidebarReturnFocus = null;
}

function renderSidebar() {
  presetCharacterList.replaceChildren();
  customCharacterList.replaceChildren();
  byId('presetRoleTitle').textContent = '角色';
  characters.forEach(char => {
    const card = document.createElement('div');
    card.className = 'character-card' + (char.id === activeCharacterId ? ' active' : '');
    card.dataset.characterId = char.id;
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.className = 'character-choice';
    choose.setAttribute('aria-label', '与' + char.name + '聊天');
    choose.setAttribute('aria-pressed', String(char.id === activeCharacterId));
    choose.appendChild(createAvatar(char.avatar, 'avatar', char.name));
    const info = document.createElement('div');
    info.className = 'info';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = char.name;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = char.tag;
    info.append(name, tag);
    choose.appendChild(info);
    choose.addEventListener('click', () => {
      switchCharacter(char.id);
      closeSidebar();
    });
    card.appendChild(choose);
    if (!char.isPreset) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-btn';
      remove.textContent = '×';
      remove.setAttribute('aria-label', '删除' + char.name);
      remove.addEventListener('click', () => deleteCustomCharacter(char.id));
      card.appendChild(remove);
    }
    (char.isPreset ? presetCharacterList : customCharacterList).appendChild(card);
  });
}

function switchCharacter(charId, save = true) {
  const char = characters.find(item => item.id === charId);
  if (!char) return;
  activeCharacterId = charId;
  headerName.textContent = char.name;
  headerTag.textContent = char.tag;
  headerAvatar.onerror = () => {
    headerAvatar.onerror = null;
    headerAvatar.src = DEFAULT_AVATAR;
  };
  headerAvatar.src = safeAvatar(char.avatar);
  headerAvatar.alt = char.name + '的头像';
  if (!chatHistories[charId] || chatHistories[charId].length === 0) {
    chatHistories[charId] = [{id: makeId(), sender: 'bot', text: char.greeting, timestamp: getCurrentTime(), createdAt: new Date().toISOString()}];
  }
  if (!roleMemories[charId]) roleMemories[charId] = ROLE_MEMORY.normalize(null);
  renderMessages();
  renderQuickReplies(char);
  renderSidebar();
  updateComposer();
  if (save) saveDataToStorage();
}

function cancelReply(charId) {
  const job = pendingReplies.get(charId);
  if (job) job.controller.abort();
  pendingReplies.delete(charId);
  replyErrors.delete(charId);
}

function deleteCustomCharacter(charId) {
  const char = characters.find(item => item.id === charId && !item.isPreset);
  if (!char || !confirm('确定删除“' + char.name + '”及其聊天记录吗？')) return;
  cancelReply(charId);
  characters = characters.filter(item => item.id !== charId);
  delete chatHistories[charId];
  delete roleMemories[charId];
  switchCharacter(activeCharacterId === charId ? PRESET_CHARACTERS[0].id : activeCharacterId);
}

function appendMessageToDOM(msg, char) {
  const row = document.createElement('div');
  row.className = 'message-row ' + msg.sender;
  row.dataset.messageId = msg.id || '';
  if (msg.sender === 'bot') {
    row.appendChild(createAvatar(char.avatar, 'message-avatar avatar', char.name));
  } else {
    const avatarButton = document.createElement('button');
    avatarButton.type = 'button';
    avatarButton.className = 'message-avatar-button';
    avatarButton.setAttribute('aria-label', '从相册设置我的头像');
    avatarButton.appendChild(createAvatar(userAvatar, 'message-avatar avatar', '我'));
    avatarButton.addEventListener('click', () => userAvatarUpload.click());
    row.appendChild(avatarButton);
  }
  const content = document.createElement('div');
  content.className = 'message-content';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = msg.text;
  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = msg.timestamp || '';
  content.append(bubble, time);
  row.appendChild(content);
  messagesDiv.appendChild(row);
}

function renderMessages() {
  messagesDiv.replaceChildren();
  const char = characters.find(item => item.id === activeCharacterId);
  if (!char) return;
  (chatHistories[char.id] || []).forEach(msg => appendMessageToDOM(msg, char));
  const job = pendingReplies.get(char.id);
  if (job?.text) appendMessageToDOM({id: 'stream_' + char.id, sender: 'bot', text: job.text}, char);
  else if (job) renderTypingIndicator(char);
  const failure = replyErrors.get(char.id);
  if (failure) {
    if (failure.partial) appendMessageToDOM({sender: 'bot', text: failure.partial}, char);
    const errorRow = document.createElement('div');
    errorRow.className = 'reply-error';
    errorRow.setAttribute('role', 'alert');
    const text = document.createElement('span');
    text.textContent = failure.message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn-outline btn-sm';
    retry.textContent = '重试回复';
    retry.addEventListener('click', () => requestCharacterReply(char));
    errorRow.append(text, retry);
    messagesDiv.appendChild(errorRow);
  }
  scrollToBottom();
}

function renderTypingIndicator(char) {
  const row = document.createElement('div');
  row.className = 'message-row bot typing-row';
  row.setAttribute('role', 'status');
  row.setAttribute('aria-label', char.name + '正在回复');
  row.appendChild(createAvatar(char.avatar, 'message-avatar avatar', char.name));
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble typing-indicator';
  for (let index = 0; index < 3; index++) {
    const dot = document.createElement('span');
    dot.className = 'typing-dot';
    bubble.appendChild(dot);
  }
  row.appendChild(bubble);
  messagesDiv.appendChild(row);
}

function renderQuickReplies(char) {
  quickRepliesDiv.replaceChildren();
  const starters = ROLE_CHAT_STYLES[chatStyle].starters;
  const replies = starters.length ? [...starters, ...(char.quickReplies || []).slice(0, 4)] : char.quickReplies || [];
  [...new Set(replies)].forEach(text => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'quick-chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      if (pendingReplies.has(activeCharacterId)) return;
      userInput.value = text;
      handleSendMessage();
    });
    quickRepliesDiv.appendChild(chip);
  });
}

function updateComposer() {
  const busy = pendingReplies.has(activeCharacterId);
  sendBtn.disabled = busy || !userInput.value.trim();
  sendBtn.setAttribute('aria-label', busy ? '等待角色回复' : '发送消息');
  quickRepliesDiv.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  replyStatus.textContent = '';
  userInput.placeholder = '给' + headerName.textContent + '发送消息…';
}

function handleSendMessage() {
  const text = userInput.value.trim();
  const char = characters.find(item => item.id === activeCharacterId);
  if (!text || !char || pendingReplies.has(char.id)) return;
  if (text.length > CHAT_LIMITS.message) {
    replyStatus.textContent = '每条消息最多30000字，请分段发送。';
    return;
  }
  if (!CHAT_API_URL) {
    replyStatus.textContent = '聊天接口未配置，请联系站点维护者。';
    return;
  }
  const createdAt = new Date().toISOString();
  chatHistories[char.id].push({id: makeId(), sender: 'user', text: text, timestamp: getCurrentTime(), createdAt});
  ROLE_MEMORY.learn(roleMemories[char.id], text, createdAt);
  const named = text.match(/(?:我叫|我的名字是|叫我)[“「"']?([^，。！？、\s”」"']{1,24})/);
  if (named && !/^(?:如果|假如|假设)/.test(text)) {
    const name = named[1].split(/今年|今天|最近|已经|正在|喜欢|来自/)[0];
    if (name && name.length <= 12) playerProfile.name = name;
  }
  userInput.value = '';
  userInput.style.height = 'auto';
  replyErrors.delete(char.id);
  saveDataToStorage();
  requestCharacterReply(char);
}

function buildSystemPrompt(char) {
  const gender = char.gender === 'male' ? '成年男性' : char.gender === 'female' ? '成年女性' : '成年角色';
  const scenes = char.conversation && typeof char.conversation === 'object' ?
    Object.entries(char.conversation).filter(([, value]) => typeof value === 'string').map(([key, value]) => key + '：' + value).join('\n') : ROLE_REPLY_SCENES.join('\n');
  const base = ROLE_CHAT_RULES.join('\n') + '\n当前角色：' + char.name + '，' + char.age + '岁，' + gender +
    '。\n性格：' + char.personality + '\n说话风格：' + char.voice +
    (char.interests ? '\n兴趣：' + char.interests : '') +
    (char.background ? '\n角色背景（虚构设定）：' + char.background : '') +
    (char.relationship ? '\n相处方式：' + char.relationship : '') +
    '\n不同情境的接话方式（用来理解性格，不是固定回复，不要照着念）：\n' + scenes +
    '\n本轮顺着对方正在聊的事接话。变化措辞和节奏，直接输出角色说的话，不复述这些规则。';
  const latest = (chatHistories[char.id] || []).filter(msg => msg.sender === 'user').at(-1)?.text || '';
  const memory = ROLE_MEMORY.prompt(roleMemories[char.id] || ROLE_MEMORY.normalize(null), playerProfile, latest, previousVisits[char.id]);
  const lengthRule = replyLength === 'short' && !/长文|长一点|多写|详细|完整|故事|展开/.test(latest) ? '本轮一到两句自然接话，优先快而贴切；用户明确要故事、长文时仍要完整。' : replyLength === 'long' ? '本轮认真长聊，按对方需要展开具体细节，可分自然段。对方指定篇幅时尽量满足，尽量有结尾；没有指定篇幅时按内容自然决定，不硬凑字数，不套清单。' : '普通闲聊可短到一句或两三句；要故事、长文、解释时完整展开。只发表情也要懂得接情绪，可用文字和少量贴切表情回应。';
  const lastBot = (chatHistories[char.id] || []).filter(msg => msg.sender === 'bot').at(-1)?.text || '';
  const preferences = roleMemories[char.id]?.preferences.join(' ') || '';
  const noQuestion = /(?:不要|别|少|不用).{0,16}(?:追问|反问|问号|问题)/.test(preferences) || /[？?]\s*$/.test(lastBot) && !/[？?]\s*$/.test(latest);
  const styleRule = '\n当前聊天风格：' + ROLE_CHAT_STYLES[chatStyle].label + '。\n' + ROLE_CHAT_STYLES[chatStyle].rules.join('\n');
  return (base + styleRule + '\n' + lengthRule + (noQuestion ? '\n本轮不要追加追问或以问号收尾，直接接住对方说的内容。' : '') + memory.slice(0, 4000)).slice(0, CHAT_LIMITS.system);
}

function buildRequestMessages(char) {
  const history = (chatHistories[char.id] || []).slice(-20);
  const latestUser = history.findLastIndex(msg => msg.sender === 'user');
  const recent = [];
  let budget = CHAT_LIMITS.history;
  for (let i = history.length - 1; i >= 0; i--) {
    const full = i === latestUser;
    const content = history[i].text.slice(0, full ? CHAT_LIMITS.message : Math.min(1600, budget));
    if (!content) continue;
    if (!full) budget -= content.length;
    recent.unshift({role: history[i].sender === 'user' ? 'user' : 'assistant', content});
  }
  return [{role: 'system', content: buildSystemPrompt(char)}, ...recent];
}

async function requestCharacterReply(char) {
  if (pendingReplies.has(char.id) || !characters.some(item => item.id === char.id)) return;
  const controller = new AbortController();
  const latest = (chatHistories[char.id] || []).filter(msg => msg.sender === 'user').at(-1)?.text || '';
  const longRequest = replyLength === 'long' || /长文|长一点|多写|详细|完整|故事|展开/.test(latest);
  const job = {controller, timedOut: false, text: '', messages: buildRequestMessages(char), maxTokens: longRequest ? 6000 : replyLength === 'short' ? 180 : 300};
  pendingReplies.set(char.id, job);
  replyErrors.delete(char.id);
  if (activeCharacterId === char.id) {
    renderMessages();
    updateComposer();
  }
  const timer = setTimeout(() => {
    job.timedOut = true;
    controller.abort();
  }, longRequest ? LONG_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  try {
    let text = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (navigator.onLine === false) throw new TypeError('offline');
        const response = await fetch(CHAT_API_URL, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({messages: job.messages, client: 'liaotian123', max_tokens: job.maxTokens, stream: true, attempt}),
          signal: controller.signal, credentials: 'omit', cache: 'no-store'
        });
        if (!response.ok) {
          const error = new Error(response.status === 429 ? '暂时无法回复，请稍后重试。' : '暂时没连上，请重试。');
          error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
          throw error;
        }
        text = await readModelReply(response, delta => {
          if (pendingReplies.get(char.id) !== job) return;
          job.text = (job.text + delta).slice(0, CHAT_LIMITS.reply);
          if (activeCharacterId !== char.id) return;
          const bubble = messagesDiv.querySelector('[data-message-id="stream_' + char.id + '"] .message-bubble');
          if (bubble) {bubble.textContent = job.text; scrollToBottom();}
          else renderMessages();
        });
        break;
      } catch (error) {
        if (attempt || job.text || controller.signal.aborted || navigator.onLine === false || !(error.retryable || error instanceof TypeError)) throw error;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    if (!text.trim()) throw new Error('没有收到回复，请重试。');
    if (pendingReplies.get(char.id) !== job || !chatHistories[char.id]) return;
    chatHistories[char.id].push({id: makeId(), sender: 'bot', text: text.trim().slice(0, CHAT_LIMITS.reply), timestamp: getCurrentTime(), createdAt: new Date().toISOString()});
    previousVisits[char.id] = '';
    saveDataToStorage();
  } catch (error) {
    if (pendingReplies.get(char.id) !== job) return;
    if (error.name === 'AbortError' && !job.timedOut) return;
    replyErrors.set(char.id, {
      partial: job.text,
      offline: navigator.onLine === false,
      message: navigator.onLine === false ? '网络已断开。' : job.timedOut ? '回复超时，请重试。' :
        error instanceof TypeError ? '网络未连接，请重试。' : error.message
    });
  } finally {
    clearTimeout(timer);
    if (pendingReplies.get(char.id) === job) {
      pendingReplies.delete(char.id);
      if (activeCharacterId === char.id) {
        renderMessages();
        updateComposer();
      }
    }
  }
}

async function readModelReply(response, onDelta) {
  if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    let data;
    try { data = await response.json(); } catch (error) { throw new Error('回复中断，请重试。'); }
    if (!data || typeof data.text !== 'string' || !data.text.trim() || data.error || data.ok === false) throw new Error('没有收到回复，请重试。');
    if (data.text.length > CHAT_LIMITS.reply) throw new Error('回复过长，请分段继续聊。');
    return data.text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '', complete = false;
  function consume(line) {
    if (!line.startsWith('data:')) return;
    const raw = line.slice(5).trim();
    if (!raw) return;
    let event;
    try { event = JSON.parse(raw); } catch (error) { throw new Error('回复中断，请重试。'); }
    if (event.error) {
      const error = new Error('暂时没连上，请重试。');
      error.retryable = !text;
      throw error;
    }
    if (typeof event.delta === 'string') {
      if (text.length + event.delta.length > CHAT_LIMITS.reply) throw new Error('回复过长，请分段继续聊。');
      text += event.delta;
      onDelta(event.delta);
    }
    if (event.done === true) complete = true;
  }
  try {
    while (true) {
      const part = await reader.read();
      buffer += decoder.decode(part.value || new Uint8Array(), {stream: !part.done});
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(consume);
      if (part.done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!complete || !text.trim()) throw new Error('回复中断，请重试。');
    return text;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

function selectFormAvatar(src) {
  roleAvatarUploadVersion++;
  roleAvatarBusy = false;
  byId('createRoleSubmitBtn').disabled = false;
  byId('chooseRoleAvatarBtn').disabled = false;
  selectedFormAvatar = safeAvatar(src);
  byId('roleAvatarPreview').src = selectedFormAvatar;
  byId('roleAvatarStatus').textContent = '';
  presetAvatarPicker.querySelectorAll('.avatar-option').forEach(img => {
    img.classList.toggle('selected', img.dataset.avatar === src);
  });
}

function renderAvatarPicker() {
  presetAvatarPicker.replaceChildren();
  PRESET_CHARACTERS.forEach(char => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'avatar-picker-button';
    button.setAttribute('aria-label', '使用' + char.name + '的头像');
    const img = createAvatar(char.avatar, 'avatar-option', char.name);
    img.dataset.avatar = char.avatar;
    button.appendChild(img);
    button.addEventListener('click', () => {
      roleAvatarUpload.value = '';
      selectFormAvatar(char.avatar);
    });
    presetAvatarPicker.appendChild(button);
  });
  selectFormAvatar(selectedFormAvatar);
}

function openModal() {
  openDialog('createModalOverlay');
}

function closeModal() {
  closeDialog('createModalOverlay');
  createRoleForm.reset();
  selectFormAvatar(PRESET_CHARACTERS[0].avatar);
}

function handleCreateRole(event) {
  event.preventDefault();
  if (roleAvatarBusy) return;
  const char = normalizeCustomCharacter({
    id: 'custom_' + makeId(),
    name: byId('roleName').value, tag: byId('roleTag').value,
    greeting: byId('roleGreeting').value, personality: byId('rolePersonality').value,
    gender: byId('roleGender').value, age: byId('roleAge').value,
    voice: byId('roleVoice').value, interests: byId('roleInterests').value,
    relationship: byId('roleRelationship').value,
    avatar: selectedFormAvatar
  });
  if (!char) return;
  characters.push(char);
  chatHistories[char.id] = [{id: makeId(), sender: 'bot', text: char.greeting, timestamp: getCurrentTime()}];
  closeModal();
  switchCharacter(char.id);
}

async function readAlbumAvatar(file) {
  if (!file || (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name)) || file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    throw new Error('请选择相册里的照片。');
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('这张照片超过20MB，请换一张较小的照片。');
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('照片无法读取，请换一张。'));
      img.src = objectUrl;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error('照片没有有效尺寸，请重新选择。');
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('手机暂时无法处理照片，请重试。');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 384, 384);
    context.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 384, 384);
    let result = canvas.toDataURL('image/jpeg', 0.86);
    if (result.length > MAX_AVATAR_DATA_LENGTH) result = canvas.toDataURL('image/jpeg', 0.65);
    if (result.length > MAX_AVATAR_DATA_LENGTH || !result.startsWith('data:image/jpeg;base64,')) throw new Error('照片处理失败，请换一张照片重试。');
    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function handleRoleAvatarUpload() {
  const file = roleAvatarUpload.files[0];
  if (!file) return;
  const version = ++roleAvatarUploadVersion;
  roleAvatarBusy = true;
  byId('createRoleSubmitBtn').disabled = true;
  byId('roleAvatarStatus').textContent = '';
  byId('chooseRoleAvatarBtn').disabled = true;
  try {
    const avatar = await readAlbumAvatar(file);
    if (version !== roleAvatarUploadVersion) return;
    selectFormAvatar(avatar);
  } catch (error) {
    if (version === roleAvatarUploadVersion) byId('roleAvatarStatus').textContent = error.message;
  } finally {
    if (version === roleAvatarUploadVersion) {
      roleAvatarBusy = false;
      byId('createRoleSubmitBtn').disabled = false;
    }
    byId('chooseRoleAvatarBtn').disabled = false;
    roleAvatarUpload.value = '';
  }
}

function updateUserAvatarPreview() {
  byId('userAvatarPreview').src = userAvatar;
}

function renderEmojiPicker() {
  const picker = byId('emojiPicker');
  ['😊', '🥰', '😘', '😏', '😎', '😂', '🥺', '😢', '😤', '❤️', '💕', '🤗', '🫶', '👍', '🌹', '✨'].forEach(emoji => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = emoji; button.setAttribute('aria-label', '插入表情' + emoji);
    button.addEventListener('click', () => {
      userInput.setRangeText(emoji, userInput.selectionStart, userInput.selectionEnd, 'end');
      userInput.dispatchEvent(new Event('input'));
      userInput.focus();
    });
    picker.appendChild(button);
  });
}

function openDialog(id) {
  const overlay = byId(id);
  if (!overlay.classList.contains('active')) dialogReturnFocus.set(id, document.activeElement);
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.querySelector('.app-container').inert = true;
  const dialog = overlay.querySelector('.modal');
  dialog.tabIndex = -1;
  dialog.focus({preventScroll: true});
}

function closeDialog(id) {
  const overlay = byId(id);
  if (!overlay.classList.contains('active')) return;
  overlay.classList.remove('active');
  const otherDialog = document.querySelector('.modal-overlay.active');
  document.querySelector('.app-container').inert = !!otherDialog;
  if (otherDialog) otherDialog.querySelector('.modal').focus({preventScroll: true});
  else restoreInterfaceFocus(dialogReturnFocus.get(id));
  overlay.setAttribute('aria-hidden', 'true');
  dialogReturnFocus.delete(id);
}

function openMemoryModal() {
  closeSidebar();
  byId('playerName').value = playerProfile.name;
  byId('playerAbout').value = playerProfile.about;
  const char = characters.find(item => item.id === activeCharacterId);
  byId('rolePreferencesLabel').textContent = '希望' + char.name + '怎么和你相处';
  byId('rolePreferences').value = '';
  byId('memoryStatus').textContent = '';
  renderMemoryFacts();
  openDialog('memoryModalOverlay');
}

function renderMemoryFacts() {
  const box = byId('memoryFacts');
  box.replaceChildren();
  const memory = roleMemories[activeCharacterId];
  const entries = memory.facts.map((fact, index) => ({text: fact.text, key: 'facts', index})).concat(memory.preferences.map((text, index) => ({text, key: 'preferences', index})));
  byId('forgetRoleMemoryBtn').hidden = entries.length === 0;
  entries.slice(-25).forEach(entry => {
    const row = document.createElement('div'); row.className = 'memory-fact';
    const text = document.createElement('span'); text.textContent = entry.text;
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'tool-btn'; remove.textContent = '忘掉';
    remove.addEventListener('click', () => {memory[entry.key].splice(entry.index, 1); saveDataToStorage(); renderMemoryFacts();});
    row.append(text, remove); box.appendChild(row);
  });
}

function savePlayerProfile() {
  playerProfile.name = byId('playerName').value.trim().slice(0, 24);
  playerProfile.about = byId('playerAbout').value.trim().slice(0, 600);
  const saved = saveDataToStorage();
  byId('memoryStatus').textContent = saved ? '' : '空间不足，资料未保存。';
  if (saved) closeDialog('memoryModalOverlay');
}

function saveRolePreferences() {
  const value = byId('rolePreferences').value.trim();
  if (!value) return;
  const memory = roleMemories[activeCharacterId];
  memory.preferences.push(value.slice(0, 600));
  memory.preferences = memory.preferences.slice(-16);
  const saved = saveDataToStorage(); renderMemoryFacts();
  byId('rolePreferences').value = '';
  byId('memoryStatus').textContent = saved ? '' : '空间不足，偏好未保存。';
  if (saved) closeDialog('memoryModalOverlay');
}

function forgetRoleMemory() {
  if (!confirm('清除这个角色的记忆？')) return;
  roleMemories[activeCharacterId] = ROLE_MEMORY.normalize(null);
  previousVisits[activeCharacterId] = '';
  saveDataToStorage(); renderMemoryFacts();
}

function openRoleDetails() {
  const char = characters.find(item => item.id === activeCharacterId);
  byId('roleDetailsTitle').textContent = char.name + '的人设';
  const box = byId('roleDetailsContent'); box.replaceChildren();
  box.appendChild(createAvatar(char.avatar, 'avatar', char.name));
  [char.tag + ' · ' + char.age + '岁', '聊天风格：' + ROLE_CHAT_STYLES[chatStyle].label, char.isPreset ? char.personality.split('。')[0] + '。' : char.personality, char.background, char.interests ? '爱好：' + char.interests : ''].filter(Boolean).forEach(text => {
    const p = document.createElement('p'); p.textContent = text; box.appendChild(p);
  });
  openDialog('roleDetailsOverlay');
}

function buildBackup() {
  return {format: 'liaotian123-backup', version: 1, savedAt: new Date().toISOString(), profile: playerProfile, userAvatar, chatStyle, characters: characters.filter(char => !char.isPreset), histories: chatHistories, memories: roleMemories};
}

async function saveBackup() {
  const contents = JSON.stringify(buildBackup(), null, 2);
  const name = 'liaotian123-' + new Date().toISOString().slice(0, 10) + '-backup.json';
  const file = new File([contents], name, {type: 'application/json'});
  const status = byId('memoryStatus');
  status.textContent = '';
  if (navigator.canShare?.({files: [file]})) {
    try {
      await navigator.share({files: [file], title: '记忆备份'});
      return;
    } catch (error) {if (error.name === 'AbortError') return;}
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function restoreBackup() {
  const input = byId('backupUpload'), file = input.files[0], status = byId('memoryStatus');
  if (!file) return;
  status.textContent = '';
  try {
    if (file.size > 15 * 1024 * 1024) throw new Error('备份文件不能超过15MB。');
    const backup = JSON.parse(await file.text());
    if (!backup || backup.format !== 'liaotian123-backup' || backup.version !== 1 || !Array.isArray(backup.characters) || !backup.histories || typeof backup.histories !== 'object') throw new Error('备份文件格式不对。');
    const imported = backup.characters.map(normalizeCustomCharacter);
    if (imported.some(char => !char)) throw new Error('备份中的角色资料不完整。');
    if (pendingReplies.size) throw new Error('请等回复结束再恢复记忆。');
    const all = characters.concat(imported.filter(char => !characters.some(old => old.id === char.id)));
    all.forEach(char => {
      const incoming = backup.histories[char.id];
      if (Array.isArray(incoming)) {
        const ids = new Set();
        chatHistories[char.id] = incoming.concat(chatHistories[char.id] || []).filter(msg => {
          if (!msg || typeof msg.text !== 'string' || !['bot', 'user'].includes(msg.sender) || typeof msg.id !== 'string' || ids.has(msg.id)) return false;
          ids.add(msg.id); return true;
        }).map(msg => ({id: msg.id, sender: msg.sender, text: msg.text.slice(0, CHAT_LIMITS.message), timestamp: String(msg.timestamp || '').slice(0, 20), createdAt: String(msg.createdAt || '').slice(0, 30)}));
      }
      const incomingMemory = ROLE_MEMORY.normalize(backup.memories?.[char.id]);
      const old = roleMemories[char.id] || ROLE_MEMORY.normalize(null);
      const seen = new Set();
      incomingMemory.facts = incomingMemory.facts.concat(old.facts).filter(fact => {if (seen.has(fact.text)) return false; seen.add(fact.text); return true;}).slice(-80);
      incomingMemory.preferences = [...new Set(incomingMemory.preferences.concat(old.preferences))].slice(-16);
      if (old.lastSeen > incomingMemory.lastSeen) incomingMemory.lastSeen = old.lastSeen;
      incomingMemory.visits = Math.max(incomingMemory.visits, old.visits);
      roleMemories[char.id] = incomingMemory; previousVisits[char.id] = incomingMemory.lastSeen;
    });
    characters = all;
    if (backup.profile && typeof backup.profile === 'object') playerProfile = {id: typeof backup.profile.id === 'string' ? backup.profile.id.slice(0, 80) : playerProfile.id, name: String(backup.profile.name || '').slice(0, 24), about: String(backup.profile.about || '').slice(0, 600)};
    userAvatar = safeAvatar(backup.userAvatar, DEFAULT_USER_AVATAR);
    if (typeof backup.chatStyle === 'string' && Object.hasOwn(ROLE_CHAT_STYLES, backup.chatStyle)) chatStyle = backup.chatStyle;
    byId('chatStyle').value = chatStyle;
    try {localStorage.setItem('liaotian_user_avatar', userAvatar);} catch (error) {}
    updateUserAvatarPreview(); switchCharacter(activeCharacterId); openMemoryModal();
    closeDialog('memoryModalOverlay');
  } catch (error) {status.textContent = error instanceof SyntaxError ? '备份文件格式不对。' : error.message;}
  finally {input.value = '';}
}

async function handleUserAvatarUpload() {
  const file = userAvatarUpload.files[0];
  if (!file) return;
  const version = ++userAvatarUploadVersion;
  const status = byId('avatarUploadStatus');
  status.textContent = '';
  byId('changeUserAvatarBtn').disabled = true;
  try {
    const avatar = await readAlbumAvatar(file);
    if (version !== userAvatarUploadVersion) return;
    userAvatar = avatar;
    updateUserAvatarPreview();
    renderMessages();
    try {
      localStorage.setItem('liaotian_user_avatar', userAvatar);
    } catch (error) {
      status.textContent = '空间不足，头像未保存。';
    }
  } catch (error) {
    if (version === userAvatarUploadVersion) status.textContent = error.message;
  } finally {
    if (version === userAvatarUploadVersion) byId('changeUserAvatarBtn').disabled = false;
    userAvatarUpload.value = '';
  }
}

function clearCurrentChat() {
  const char = characters.find(item => item.id === activeCharacterId);
  if (!char || !confirm('确定要清空与“' + char.name + '”的聊天记录吗？')) return;
  cancelReply(char.id);
  chatHistories[char.id] = [{id: makeId(), sender: 'bot', text: char.greeting, timestamp: getCurrentTime()}];
  saveDataToStorage();
  renderMessages();
  updateComposer();
}

function scrollToBottom() {
  requestAnimationFrame(() => { messagesContainer.scrollTop = messagesContainer.scrollHeight; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
else init();
