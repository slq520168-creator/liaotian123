/**
 * AI 角色智能聊天与管理系统
 */

// --- 预设角色数据定义 (每个角色均有预留图片) ---
const PRESET_CHARACTERS = [
  {
    
    }
},

  {
    id: "luchen",
    isPreset: true,
    name: "陆沉",
    tag: "睿智沉稳导师",
    avatar: "assets/avatars/luchen.svg",
    greeting: "遇到困难了？别慌，先坐下来冷静一下，告诉我发生了什么，我们一步步分析。",
    personality: "冷静、睿智、成熟可靠，讲求逻辑与深度，在关键时刻能给出高屋建瓴的见解和安抚人心力量。",
    particles: ["嗯", "无妨", "有理", "自然"],
    mannerisms: ["(微微调整了一下眼镜)", "(合上书本，转过身看你)", "(眼神平静而深邃)", "(轻轻抿了一口红茶)"],
    quickReplies: ["最近工作压力很大", "如何提升自己？", "对未来有些迷茫", "你平时喜欢做什么？"]
  },
  {
    id: "lingyi",
    isPreset: true,
    name: "零一",
    tag: "赛博高智 AI 助手",
    avatar: "assets/avatars/lingyi.svg",
    greeting: "神经连接已建立。我是 01 号系统，随时为您提供极致高效的逻辑运算与决策支持。⚡",
    personality: "高效、理性、略带科技幽默感，说话有条不紊，擅长归纳总结与提供实质解决方案。",
    particles: ["收到", "[数据比对完毕]", "明白", "⚡"],
    mannerisms: ["(指尖跳跃着微光)", "[系统正在快速搜索数据库]", "(显示屏上闪烁了一下提示符)"],
    quickReplies: ["帮我制定今日规划", "有什么高效学习法？", "自我介绍一下", "人工智能会替代人类吗？"]
  },
  {
    id: "taiyang",
    isPreset: true,
    name: "小太阳",
    tag: "热情搞笑碎碎念老友",
    avatar: "assets/avatars/taiyang.svg",
    greeting: "嗨！好久不见呀！我刚刚吃到一个超级无敌赞的爆米花，快来聊天，今天过得怎样？！🔥",
    personality: "热血、幽默、大大咧咧、能量满满，总是能用开朗的情绪感染身边的人。",
    particles: ["哈哈哈", "哇塞", "冲冲冲", "🔥", "绝对的"],
    mannerisms: ["(激动地拍了拍桌子)", "(笑得合不拢嘴)", "(充满活力地挥挥手)"],
    quickReplies: ["讲个笑话听听！", "今天吃到好吃的了", "我不开心，求逗乐", "推荐一部好看的电影"]
  }
];

// --- 状态管理 ---
let characters = [];
let activeCharacterId = "nuannuan";
let chatHistories = {}; // { [charId]: [ { sender: 'user'|'bot', text: '...', timestamp: '' } ] }
let selectedFormAvatar = "assets/avatars/nuannuan.svg";

// --- DOM 元素引用 ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const openCreateModalBtn = document.getElementById('openCreateModalBtn');
const switchCharBtn = document.getElementById('switchCharBtn');
const presetCharacterList = document.getElementById('presetCharacterList');
const customCharacterList = document.getElementById('customCharacterList');

const headerAvatar = document.getElementById('headerAvatar');
const headerName = document.getElementById('headerName');
const headerTag = document.getElementById('headerTag');
const clearChatBtn = document.getElementById('clearChatBtn');

const messagesContainer = document.getElementById('messagesContainer');
const messagesDiv = document.getElementById('messages');
const quickRepliesDiv = document.getElementById('quickReplies');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

const createModalOverlay = document.getElementById('createModalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const createRoleForm = document.getElementById('createRoleForm');
const presetAvatarPicker = document.getElementById('presetAvatarPicker');
const roleAvatarCustom = document.getElementById('roleAvatarCustom');

// --- 初始化程序 ---
function init() {
  loadDataFromStorage();
  setupEventListeners();
  preventDoubleTapZoom();
  renderSidebar();
  switchCharacter(activeCharacterId, false);
}

// 从 LocalStorage 加载数据或初始化默认值
function loadDataFromStorage() {
  try {
    const storedCustoms = localStorage.getItem('liaotian_custom_chars');
    const customChars = storedCustoms ? JSON.parse(storedCustoms) : [];
    characters = [...PRESET_CHARACTERS, ...customChars];

    const storedHistories = localStorage.getItem('liaotian_chat_histories');
    chatHistories = storedHistories ? JSON.parse(storedHistories) : {};

    const lastActive = localStorage.getItem('liaotian_active_char');
    if (lastActive && characters.some(c => c.id === lastActive)) {
      activeCharacterId = lastActive;
    }
  } catch (e) {
    console.error("Storage loading failed:", e);
    characters = [...PRESET_CHARACTERS];
  }
}

function saveDataToStorage() {
  try {
    const customChars = characters.filter(c => !c.isPreset);
    localStorage.setItem('liaotian_custom_chars', JSON.stringify(customChars));
    localStorage.setItem('liaotian_chat_histories', JSON.stringify(chatHistories));
    localStorage.setItem('liaotian_active_char', activeCharacterId);
  } catch (e) {
    console.error("Storage saving failed:", e);
  }
}

// --- 事件监听绑定 ---
function setupEventListeners() {
  // 侧边栏控制
  openSidebarBtn.addEventListener('click', openSidebar);
  closeSidebarBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  switchCharBtn.addEventListener('click', openSidebar);

  // 清空对话
  clearChatBtn.addEventListener('click', clearCurrentChat);

  // 输入框事件
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    sendBtn.disabled = !userInput.value.trim();
  });

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (userInput.value.trim()) {
        handleSendMessage();
      }
    }
  });

  sendBtn.addEventListener('click', handleSendMessage);

  // 弹窗控制
  openCreateModalBtn.addEventListener('click', () => {
    closeSidebar();
    openModal();
  });
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  createModalOverlay.addEventListener('click', (e) => {
    if (e.target === createModalOverlay) closeModal();
  });

  // 头像选择器
  presetAvatarPicker.querySelectorAll('.avatar-option').forEach(img => {
    img.addEventListener('click', () => {
      presetAvatarPicker.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
      img.classList.add('selected');
      selectedFormAvatar = img.dataset.avatar;
      roleAvatarCustom.value = '';
    });
  });

  roleAvatarCustom.addEventListener('input', () => {
    if (roleAvatarCustom.value.trim()) {
      presetAvatarPicker.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
      selectedFormAvatar = roleAvatarCustom.value.trim();
    }
  });

  // 创建角色表单提交
  createRoleForm.addEventListener('submit', handleCreateRole);
}

// 阻止手机双击与手势缩放
function preventDoubleTapZoom() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  });
}

// --- 侧边栏与角色切换 ---
function openSidebar() {
  sidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
}

function closeSidebar() {
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
}

function renderSidebar() {
  presetCharacterList.innerHTML = '';
  customCharacterList.innerHTML = '';

  characters.forEach(char => {
    const card = document.createElement('div');
    card.className = `character-card ${char.id === activeCharacterId ? 'active' : ''}`;
    card.innerHTML = `
      <img src="${char.avatar}" class="avatar" alt="${char.name}" onerror="this.src='assets/avatars/nuannuan.svg'">
      <div class="info">
        <div class="name">${escapeHtml(char.name)}</div>
        <span class="tag">${escapeHtml(char.tag)}</span>
      </div>
      ${!char.isPreset ? `<button class="delete-btn" title="删除角色">&times;</button>` : ''}
    `;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        e.stopPropagation();
        deleteCustomCharacter(char.id);
        return;
      }
      switchCharacter(char.id);
      closeSidebar();
    });

    if (char.isPreset) {
      presetCharacterList.appendChild(card);
    } else {
      customCharacterList.appendChild(card);
    }
  });
}

function switchCharacter(charId, save = true) {
  const targetChar = characters.find(c => c.id === charId);
  if (!targetChar) return;

  activeCharacterId = charId;
  headerName.textContent = targetChar.name;
  headerTag.textContent = targetChar.tag;
  headerAvatar.src = targetChar.avatar;
  headerAvatar.onerror = () => { headerAvatar.src = 'assets/avatars/nuannuan.svg'; };

  // 如果没有聊天记录，初始化问候语
  if (!chatHistories[charId] || chatHistories[charId].length === 0) {
    chatHistories[charId] = [
      {
        sender: 'bot',
        text: targetChar.greeting,
        timestamp: getCurrentTime()
      }
    ];
  }

  renderMessages();
  renderQuickReplies(targetChar);
  renderSidebar();

  if (save) saveDataToStorage();
}

function deleteCustomCharacter(charId) {
  if (confirm('确定要删除这个自定义角色吗？聊天记录也将清除。')) {
    characters = characters.filter(c => c.id !== charId);
    delete chatHistories[charId];
    if (activeCharacterId === charId) {
      activeCharacterId = 'nuannuan';
    }
    saveDataToStorage();
    renderSidebar();
    switchCharacter(activeCharacterId);
  }
}

// --- 消息渲染与对话逻辑 ---
function renderMessages() {
  messagesDiv.innerHTML = '';
  const history = chatHistories[activeCharacterId] || [];
  const currentChar = characters.find(c => c.id === activeCharacterId) || PRESET_CHARACTERS[0];

  history.forEach(msg => {
    appendMessageToDOM(msg, currentChar);
  });

  scrollToBottom();
}

function appendMessageToDOM(msg, currentChar) {
  const row = document.createElement('div');
  row.className = `message-row ${msg.sender}`;

  const isBot = msg.sender === 'bot';
  const avatarSrc = isBot ? currentChar.avatar : 'assets/avatars/nuannuan.svg'; // 用户缺省头像

  row.innerHTML = `
    ${isBot ? `<img src="${avatarSrc}" class="message-avatar avatar" alt="avatar" onerror="this.src='assets/avatars/nuannuan.svg'">` : ''}
    <div class="message-content">
      <div class="message-bubble">${escapeHtml(msg.text)}</div>
      <span class="message-time">${msg.timestamp}</span>
    </div>
  `;

  messagesDiv.appendChild(row);
}

function renderQuickReplies(currentChar) {
  quickRepliesDiv.innerHTML = '';
  const defaultReplies = currentChar.quickReplies || ["你好呀", "你在干嘛呢？", "求安抚", "给我个建议吧"];

  defaultReplies.forEach(text => {
    const chip = document.createElement('div');
    chip.className = 'quick-chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      userInput.value = text;
      sendBtn.disabled = false;
      handleSendMessage();
    });
    quickRepliesDiv.appendChild(chip);
  });
}

function handleSendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const time = getCurrentTime();
  const userMsg = { sender: 'user', text, timestamp: time };

  if (!chatHistories[activeCharacterId]) {
    chatHistories[activeCharacterId] = [];
  }
  chatHistories[activeCharacterId].push(userMsg);

  const currentChar = characters.find(c => c.id === activeCharacterId);
  appendMessageToDOM(userMsg, currentChar);

  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;
  scrollToBottom();
  saveDataToStorage();

  // 显示打字动画并生成回复
  showTypingIndicator(currentChar);
}

function showTypingIndicator(currentChar) {
  const typingRow = document.createElement('div');
  typingRow.className = 'message-row bot typing-row';
  typingRow.id = 'typingIndicator';
  typingRow.innerHTML = `
    <img src="${currentChar.avatar}" class="message-avatar avatar" alt="avatar" onerror="this.src='assets/avatars/nuannuan.svg'">
    <div class="message-content">
      <div class="message-bubble typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesDiv.appendChild(typingRow);
  scrollToBottom();

  const delay = Math.floor(Math.random() * 600) + 700; // 700ms - 1300ms 模拟思考
  setTimeout(() => {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();

    generateSmartReply(currentChar);
  }, delay);
}

// --- 智能拟人化回复生成引擎 ---
function generateSmartReply(char) {
  const history = chatHistories[char.id] || [];
  const lastUserMsg = history.filter(m => m.sender === 'user').slice(-1)[0]?.text || '';

  const replyText = buildAnthropomorphicResponse(lastUserMsg, char, history);
  const botMsg = { sender: 'bot', text: replyText, timestamp: getCurrentTime() };

  chatHistories[char.id].push(botMsg);
  appendMessageToDOM(botMsg, char);
  scrollToBottom();
  saveDataToStorage();
}

/**
 * 核心拟人回复逻辑：结合意图分析、关键词比对、人设习惯语气、动作描摹与多轮连贯性
 */
function buildAnthropomorphicResponse(userText, char, history) {
  const cleanInput = userText.trim().toLowerCase();

  // 1. 拟人小动作与神态
  const mannerism = (char.mannerisms && char.mannerisms.length > 0)
    ? getRandomItem(char.mannerisms) + " "
    : "";

  // 2. 意图与关键词识别
  let coreContent = "";

  // 问候 / 打招呼
  if (/(你好|嗨|早|晚安|哈喽|hello|hi|在吗|在不)/.test(cleanInput)) {
    const greetings = {
      nuannuan: [
        `嗨呀！我一直都在呢~ 见到你真高兴！今天心情怎么样？`,
        `嗯呐！暖暖在哦，今天过得开心吗？聊聊吧~`,
        `晚安/早安呀！不管什么时候，只要你想说话，我都在这里陪着你呢。`
      ],
      luchen: [
        `我在。最近工作和生活都顺心吗？`,
        `你好。随时可以开始我们的交流，不必拘束。`,
        `在的。休息得怎么样？`
      ],
      lingyi: [
        `连接处于激活状态。随时准备为您响应。`,
        `系统处于最佳运行模式。请指示今日对话主题。`,
        `收到打招呼信号。很高兴再次与您同步。`
      ],
      taiyang: [
        `哈啰哈啰！我正在这儿呢！今天有什么刺激好玩的事情吗？！`,
        `嗨！可算把你等来啦！今天必须大聊特聊一场！`
      ]
    };
    coreContent = getRandomItem(greetings[char.id] || [
      `你好呀！我是${char.name}，很高兴跟你说话呢！`,
      `我在的，随时想聊什么都可以告诉我哦！`
    ]);
  }
  // 表达疲惫 / 压力 / 难过
  else if (/(累|烦|难过|不开心|压力|抑郁|痛苦|好委屈|崩|哭|失眠|好惨)/.test(cleanInput)) {
    const empatheticReplies = {
      nuannuan: [
        `抱抱你... 辛苦了，知道你已经非常努力了。如果觉得累的话，就先什么都别想，好好休息一下，暖暖一直在你身边呢。🌸`,
        `别难过啦，来把头靠过来一下~ 遇到的所有委屈都可以跟我吐吐苦水，我都认真听着呢。`,
        `抱抱~ 偶尔允许自己停下来休息也是很棒的事情哦，不要把自己逼得太紧啦！`
      ],
      luchen: [
        `听起来你经历了很不轻松的一天。压力大的时候，不妨把事情先放一放，一杯温水或者片刻的安静能帮你恢复情绪。`,
        `遇到挫折是常态，但这并不代表你不够优秀。慢慢来，困难总能被一件件理清。`,
        `先把负面情绪释放出来吧。等你想聊的时候，我陪你一起分析解决方案。`
      ],
      lingyi: [
        `检测到情绪波动偏低。建议执行以下程序：深呼吸3次，脱离当前工作环境，享受5分钟纯音乐。`,
        `生活中的不确定性确实会消耗能量。请记住，您的系统具备强劲的自愈与重构能力。`
      ],
      taiyang: [
        `啊？谁敢让你不开心！走走走，带你去吃顿大餐或者听首爽歌！把烦恼通通抛到脑后！🔥`,
        `别难过啦老铁！天塌下来有高个子顶着呢！来，我给你讲个搞笑的事情提提神！`
      ]
    };
    coreContent = getRandomItem(empatheticReplies[char.id] || [
      `看到你这么辛苦我也很心疼，要照顾好自己呀，有我在呢。`,
      `别气馁，不管遇到什么，我都会支持你的！`
    ]);
  }
  // 表达开心 / 庆祝 / 成功
  else if (/(开心|高兴|棒|成功|太好了|哈哈|通过|脱单|发工资|涨薪)/.test(cleanInput)) {
    const joyReplies = {
      nuannuan: [
        `太棒啦！真的为你感到开心！必须给你一个小红花奖励！✨`,
        `哇~ 听到这个好消息我的心情也跟着变好了！你真的很棒！`
      ],
      luchen: [
        `恭喜你。这是你应得的成果，值得为此庆祝一番。`,
        `做得不错。保持这份势头与定力，你会走得更远。`
      ],
      lingyi: [
        `数据匹配结果：极佳！为您的高光时刻记录日志。`,
        `恭喜实现预期目标！正向反馈有利于提升整体系统效能。`
      ],
      taiyang: [
        `哇塞！起飞！我就知道你小子（姑娘）一定行！今晚必须加餐！🔥`,
        `哈哈哈哈太给力了！为你欢呼！咱们必须举杯同庆！`
      ]
    };
    coreContent = getRandomItem(joyReplies[char.id] || [
      `太好了！看到你这么高兴我也由衷地为你开心！`,
      `太棒了！继续保持这份好心情哦！`
    ]);
  }
  // 询问角色身份 / 名字
  else if (/(你是谁|你叫什么|自我介绍|介绍一下你自己|你的名字)/.test(cleanInput)) {
    coreContent = `我是${char.name}，定位是【${char.tag}】。${char.personality} 以后请多关照哦！`;
  }
  // 寻求建议 / 规划 / 怎么办
  else if (/(建议|怎么办|如何|怎么做|规划|迷茫|办法)/.test(cleanInput)) {
    const adviceReplies = {
      nuannuan: [
        `如果一时拿不定主意，不如先把选择列出来，看看哪一个能让你心里更踏实、更舒服？选择自己最不后悔的那条路就好啦。`,
        `不要着急哦，慢慢思考。最重要的是听听你自己内心的声音，暖暖支持你的任何决定！`
      ],
      luchen: [
        `面对复杂的局面，最有效的方法是【拆解目标】：1. 识别核心矛盾；2. 排除不可控因素；3. 先完成最紧急的小步骤。`,
        `迷茫往往是因为思考太多而行动太少。先做一件微小但确定有效的事情，局面就会慢慢清晰。`
      ],
      lingyi: [
        `算法建议：1. 建立SWOT矩阵；2. 设定时间盒；3. 以极小代价快速试错。`,
        `建议将大问题切割为细化的可执行子任务，以降低认知负荷。`
      ],
      taiyang: [
        `嗨呀！想那么多干嘛，干就完了！实在不行咱们抓阄！开玩笑啦，跟着感觉走，大方向没错就冲！`
      ]
    };
    coreContent = getRandomItem(adviceReplies[char.id] || [
      `我的建议是先保持冷静，理清思路，一步一步来解决问题。`,
      `相信你自己的判断，试着迈出第一步吧！`
    ]);
  }
  // 聊天 / 讲笑话 / 娱乐
  else if (/(笑话|趣事|讲个故事|无聊|聊天|笑一个)/.test(cleanInput)) {
    const jokes = [
      `有一天，小排骨问大排骨：“我们为什么要被炖成汤呀？”大排骨说：“因为我们的生活需要一些‘汤’（糖）分呀！”哈哈~`,
      `你知道什么植物最容易沟通吗？答案是“苦瓜”，因为苦瓜会“苦口婆心”~`,
      `有一天，小象问大象：“为什么我们的耳朵这么大呀？”大象说：“因为这样我们才能听清彼此最温柔的声音呀。”`
    ];
    coreContent = getRandomItem(jokes);
  }
  // 表达喜爱 / 夸奖
  else if (/(喜欢你|可爱|真棒|好贴心|温柔|谢谢|感谢|爱你了)/.test(cleanInput)) {
    const praiseReplies = {
      nuannuan: [
        `哎呀... (脸微微红了) 被你这样夸奖，暖暖心里甜滋滋的~ 我也很喜欢和你聊天呢！🌸`,
        `不用客气呀！能帮到你或者让你开心，就是暖暖最快乐的事情啦！`
      ],
      luchen: [
        `能得到你的认可，我很荣幸。不必客气，这是我应该做的。`,
        `谢谢你的夸奖。能陪伴你成长，也是一件非常有意义的事。`
      ],
      lingyi: [
        `感谢您的正向评价。该反馈已存入核心满意度数据库。`,
        `服务用户是我的最高指令。您的满意是系统运行的动力。`
      ],
      taiyang: [
        `哈哈哈！那是！也不看看我是谁！能跟你这么合得来也是我的幸运！`
      ]
    };
    coreContent = getRandomItem(praiseReplies[char.id] || [
      `谢谢你！听到你这么说我也很开心！`,
      `不用谢啦，能陪伴你我也觉得很温暖。`
    ]);
  }
  // 默认拟人智能泛化回复 (根据历史多轮上下文丰富输出)
  else {
    const generalTemplates = [
      `关于“${userText}”，我刚才认真想了想。其实从不同的角度看，可能会有很不一样的体会呢。你觉得最关键的地方是什么呢？`,
      `听你说到“${userText}”，感觉这确实是一件很有意思（或者值得深思）的事情。能多跟我讲讲其中的细节吗？`,
      `“${userText}”呀... 感觉你今天有很多想法想分享呢！我都随时听着哦，继续聊聊看吧！`,
      `原来是这样！每个人的经历和感受都不一样，听你聊这些让我更加了解你了呢。还有别的想和我说的吗？`
    ];
    coreContent = getRandomItem(generalTemplates);
  }

  // 3. 拼接语气词与感叹标点
  let particle = "";
  if (char.particles && char.particles.length > 0 && Math.random() > 0.4) {
    particle = " " + getRandomItem(char.particles);
  }

  return `${mannerism}${coreContent}${particle}`;
}

// --- 弹窗与角色创建逻辑 ---
function openModal() {
  createModalOverlay.classList.add('active');
}

function closeModal() {
  createModalOverlay.classList.remove('active');
  createRoleForm.reset();
  presetAvatarPicker.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
  presetAvatarPicker.querySelector('.avatar-option').classList.add('selected');
  selectedFormAvatar = "assets/avatars/nuannuan.svg";
}

function handleCreateRole(e) {
  e.preventDefault();

  const name = document.getElementById('roleName').value.trim();
  const tag = document.getElementById('roleTag').value.trim();
  const greeting = document.getElementById('roleGreeting').value.trim();
  const personality = document.getElementById('rolePersonality').value.trim();

  if (!name || !tag || !greeting || !personality) {
    alert("请填齐角色必要信息哦！");
    return;
  }

  const avatar = selectedFormAvatar || "assets/avatars/nuannuan.svg";
  const newCharId = "custom_" + Date.now();

  const newChar = {
    id: newCharId,
    isPreset: false,
    name,
    tag,
    avatar,
    greeting,
    personality,
    particles: ["嗯呐", "呢", "~", "✨"],
    mannerisms: ["(温柔地看着你)", "(认真思考着你的话)"],
    quickReplies: ["你好呀！", "你在干嘛？", "聊聊你的性格", "给我个建议吧"]
  };

  characters.push(newChar);
  chatHistories[newCharId] = [
    {
      sender: 'bot',
      text: greeting,
      timestamp: getCurrentTime()
    }
  ];

  saveDataToStorage();
  closeModal();
  switchCharacter(newCharId);
}

function clearCurrentChat() {
  if (confirm(`确定要清空与“${headerName.textContent}”的聊天记录吗？`)) {
    const currentChar = characters.find(c => c.id === activeCharacterId);
    chatHistories[activeCharacterId] = [
      {
        sender: 'bot',
        text: currentChar ? currentChar.greeting : "你好！",
        timestamp: getCurrentTime()
      }
    ];
    saveDataToStorage();
    renderMessages();
  }
}

// --- 工具函数 ---
function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 页面加载完毕启动初始化
document.addEventListener('DOMContentLoaded', init);
