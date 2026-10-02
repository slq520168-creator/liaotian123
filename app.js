/**
 * 角色聊天：角色独立历史、真实模型回复与可取消的请求生命周期。
 */
const CHAT_API_URL = 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast';
const DEFAULT_AVATAR = 'assets/avatars/nuannuan.svg';
const REQUEST_TIMEOUT_MS = 30000;
let characters = [];
let activeCharacterId = 'nuannuan';
let chatHistories = Object.create(null);
let selectedFormAvatar = 'assets/avatars/nuannuan.jpg';
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
const createRoleForm = byId('createRoleForm');
const presetAvatarPicker = byId('presetAvatarPicker');
const roleAvatarCustom = byId('roleAvatarCustom');
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

function safeAvatar(value) {
  if (typeof value !== 'string') return DEFAULT_AVATAR;
  const src = value.trim();
  if (/^assets\/avatars\/[a-z0-9_-]+\.(svg|jpg|jpeg|png|webp)$/i.test(src)) return src;
  try {
    const url = new URL(src);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch (error) {}
  return DEFAULT_AVATAR;
}

function normalizeCustomCharacter(value) {
  if (!value || typeof value !== 'object' || !/^custom_[a-z0-9_-]+$/i.test(value.id || '')) return null;
  if (!['name', 'tag', 'greeting', 'personality'].every(key => typeof value[key] === 'string' && value[key].trim())) return null;
  return {
    id: value.id, isPreset: false,
    name: value.name.trim().slice(0, 12), tag: value.tag.trim().slice(0, 20),
    greeting: value.greeting.trim().slice(0, 300),
    personality: value.personality.trim().slice(0, 3000),
    avatar: safeAvatar(value.avatar),
    gender: ['male', 'female', 'unspecified'].includes(value.gender) ? value.gender : 'unspecified',
    age: Number.isFinite(Number(value.age)) && Number(value.age) >= 18 ? Math.min(100, Math.floor(Number(value.age))) : 24,
    voice: '忠实使用用户设定的性格和说话风格，保持自然、尊重和体贴。',
    quickReplies: ['你好，认识一下', '今天想找你聊聊', '说说你喜欢的事', '听听我的心事']
  };
}

function loadDataFromStorage() {
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
        timestamp: typeof msg.timestamp === 'string' ? msg.timestamp.slice(0, 20) : ''
      }));
      if (chatHistories[char.id].length && chatHistories[char.id][chatHistories[char.id].length - 1].sender === 'user') {
        replyErrors.set(char.id, {message: '上次回复未完成，你的消息还在，可以重试。'});
      }
    });
  }
  let lastActive = '';
  try { lastActive = localStorage.getItem('liaotian_active_char') || ''; } catch (error) {}
  activeCharacterId = characters.some(char => char.id === lastActive) ? lastActive : PRESET_CHARACTERS[0].id;
}

function saveDataToStorage() {
  try {
    localStorage.setItem('liaotian_custom_chars', JSON.stringify(characters.filter(char => !char.isPreset)));
    localStorage.setItem('liaotian_chat_histories', JSON.stringify(chatHistories));
    localStorage.setItem('liaotian_active_char', activeCharacterId);
  } catch (error) {
    replyStatus.textContent = '本机记录空间不足，当前聊天仍可继续；刷新前请留意记录是否保存。';
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
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', Math.round(height) + 'px');
}

function init() {
  loadDataFromStorage();
  setupEventListeners();
  renderAvatarPicker();
  switchCharacter(activeCharacterId, false);
  updateViewportHeight();
  window.addEventListener('resize', updateViewportHeight);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', updateViewportHeight);
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
    if (event.key === 'Escape') {
      closeModal();
      closeSidebar();
    }
  });
  roleAvatarCustom.addEventListener('input', () => {
    if (roleAvatarCustom.value.trim()) {
      presetAvatarPicker.querySelectorAll('.avatar-option').forEach(img => img.classList.remove('selected'));
      selectedFormAvatar = safeAvatar(roleAvatarCustom.value);
    } else {
      selectFormAvatar(PRESET_CHARACTERS[0].avatar);
    }
  });
  createRoleForm.addEventListener('submit', handleCreateRole);
  window.addEventListener('pagehide', () => {
    pendingReplies.forEach(job => job.controller.abort());
  });
}

function openSidebar() {
  sidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
  byId('openSidebarBtn').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
  byId('openSidebarBtn').setAttribute('aria-expanded', 'false');
}

function renderSidebar() {
  presetCharacterList.replaceChildren();
  customCharacterList.replaceChildren();
  byId('presetRoleTitle').textContent = '预设角色 · ' + PRESET_CHARACTERS.filter(char => char.gender === 'female').length + ' 女 / ' + PRESET_CHARACTERS.filter(char => char.gender === 'male').length + ' 男';
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
    chatHistories[charId] = [{id: makeId(), sender: 'bot', text: char.greeting, timestamp: getCurrentTime()}];
  }
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
  switchCharacter(activeCharacterId === charId ? PRESET_CHARACTERS[0].id : activeCharacterId);
}

function appendMessageToDOM(msg, char) {
  const row = document.createElement('div');
  row.className = 'message-row ' + msg.sender;
  row.dataset.messageId = msg.id || '';
  if (msg.sender === 'bot') row.appendChild(createAvatar(char.avatar, 'message-avatar avatar', char.name));
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
  if (pendingReplies.has(char.id)) renderTypingIndicator(char);
  const failure = replyErrors.get(char.id);
  if (failure) {
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
  (char.quickReplies || []).forEach(text => {
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
  replyStatus.textContent = busy ? headerName.textContent + '正在回复…' : '';
  userInput.placeholder = '给' + headerName.textContent + '发送消息…';
}

function handleSendMessage() {
  const text = userInput.value.trim();
  const char = characters.find(item => item.id === activeCharacterId);
  if (!text || !char || pendingReplies.has(char.id)) return;
  if (text.length > 1600) {
    replyStatus.textContent = '这段消息有些长，请分成几段发送（每段最多 1600 字）。';
    return;
  }
  chatHistories[char.id].push({id: makeId(), sender: 'user', text: text, timestamp: getCurrentTime()});
  userInput.value = '';
  userInput.style.height = 'auto';
  replyErrors.delete(char.id);
  saveDataToStorage();
  requestCharacterReply(char);
}

function buildSystemPrompt(char) {
  const gender = char.gender === 'male' ? '成年男性' : char.gender === 'female' ? '成年女性' : '成年角色';
  return ROLE_CHAT_RULES.join('\n') + '\n当前角色：' + char.name + '，' + char.age + '岁，' + gender +
    '。\n性格：' + char.personality + '\n说话风格：' + char.voice +
    (char.interests ? '\n兴趣：' + char.interests : '') +
    '\n口吻参考（仅展示说话方式，不是发生过的聊天，不照搬）：' +
    '\n对方：“饭又做糊了。” 自然接话：“这锅今晚是想抢主角了。”' +
    '\n对方：“今天好累，只想随便聊聊。” 自然接话：“行，今天那些烦人的事先不聊。跟你待会儿。”' +
    '\n对方：“朋友说我想太多，听了很烦。” 自然接话：“好好的心事被一句话打发，换我也会不舒服。”' +
    '\n本轮先接对方这句话。普通陪聊用一两句短话，通常不超过六十字；只有对方问具体问题或要详细内容才展开。用户没有求建议就不指导生活，也不用追问来凑回复。直接输出角色说的话。';
}

function buildRequestMessages(char) {
  return [{role: 'system', content: buildSystemPrompt(char)}].concat(
    (chatHistories[char.id] || []).slice(-20).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text.slice(0, 1600)
    }))
  );
}

async function requestCharacterReply(char) {
  if (pendingReplies.has(char.id) || !characters.some(item => item.id === char.id)) return;
  const controller = new AbortController();
  const job = {controller: controller, timedOut: false};
  pendingReplies.set(char.id, job);
  replyErrors.delete(char.id);
  if (activeCharacterId === char.id) {
    renderMessages();
    updateComposer();
  }
  const timer = setTimeout(() => {
    job.timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages: buildRequestMessages(char)}),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store'
    });
    if (!response.ok) {
      const message = response.status === 429 ? '回复请求较多，请稍后重试。' : '这次回复没有连上，请重试。';
      throw new Error(message);
    }
    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('这次回复格式不完整，请重试。');
    }
    if (!data || typeof data !== 'object') throw new Error('这次没有收到有效回复，请重试。');
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text || data.error || data.ok === false) throw new Error('这次没有收到有效回复，请重试。');
    if (pendingReplies.get(char.id) !== job || !chatHistories[char.id]) return;
    chatHistories[char.id].push({id: makeId(), sender: 'bot', text: text.slice(0, 12000), timestamp: getCurrentTime()});
    saveDataToStorage();
  } catch (error) {
    if (pendingReplies.get(char.id) !== job) return;
    if (error.name === 'AbortError' && !job.timedOut) return;
    replyErrors.set(char.id, {
      message: job.timedOut ? '回复超时了，你的消息已保留，可以重试。' :
        error instanceof TypeError ? '网络暂时没连上，你的消息已保留，可以重试。' : error.message
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

function selectFormAvatar(src) {
  selectedFormAvatar = src;
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
      roleAvatarCustom.value = '';
      selectFormAvatar(char.avatar);
    });
    presetAvatarPicker.appendChild(button);
  });
  selectFormAvatar(selectedFormAvatar);
}

function openModal() {
  createModalOverlay.classList.add('active');
  createModalOverlay.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  createModalOverlay.classList.remove('active');
  createModalOverlay.setAttribute('aria-hidden', 'true');
  createRoleForm.reset();
  selectFormAvatar(PRESET_CHARACTERS[0].avatar);
}

function handleCreateRole(event) {
  event.preventDefault();
  const avatarText = roleAvatarCustom.value.trim();
  if (avatarText && safeAvatar(avatarText) === DEFAULT_AVATAR) {
    roleAvatarCustom.setCustomValidity('请填写可访问的 HTTPS 图片链接。');
    roleAvatarCustom.reportValidity();
    roleAvatarCustom.addEventListener('input', () => roleAvatarCustom.setCustomValidity(''), {once: true});
    return;
  }
  const char = normalizeCustomCharacter({
    id: 'custom_' + makeId(),
    name: byId('roleName').value, tag: byId('roleTag').value,
    greeting: byId('roleGreeting').value, personality: byId('rolePersonality').value,
    gender: byId('roleGender').value, age: byId('roleAge').value,
    avatar: selectedFormAvatar
  });
  if (!char) return;
  characters.push(char);
  chatHistories[char.id] = [{id: makeId(), sender: 'bot', text: char.greeting, timestamp: getCurrentTime()}];
  closeModal();
  switchCharacter(char.id);
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
