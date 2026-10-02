const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='100' fill='%23e6dbff'/%3E%3Ccircle cx='100' cy='70' r='30' fill='%23b9a5ff'/%3E%3Cellipse cx='100' cy='140' rx='40' ry='50' fill='%23b9a5ff'/%3E%3C/svg%3E";

const PRESET_CHARACTERS = {
  teacher: {
    name: "李老师",
    age: 32,
    height: "165cm",
    appearance: "温柔知性，气质优雅，穿着得体，总带着温暖的笑容",
    tone: "温和、耐心、循循善诱，就像一位好朋友",
    background: "资深教师，热爱教育，喜欢帮助学生解决困惑，对人温柔而专业",
    cardStyle: "classic",
    tags: ["温柔", "知性", "耐心", "专业", "温和"],
    avatar: DEFAULT_AVATAR
  },
  studentGirl: {
    name: "小月",
    age: 18,
    height: "162cm",
    appearance: "清纯可爱，双马尾，眼神清澈，青春朝气",
    tone: "甜蜜、天真、偶尔会撒娇，说话软软的",
    background: "大二学生，性格开朗活泼，喜欢和朋友聊天，有点调皮但心地善良",
    cardStyle: "dreamy",
    tags: ["甜蜜", "可爱", "天真", "活泼", "开朗"],
    avatar: DEFAULT_AVATAR
  },
  collegeSenior: {
    name: "安琪",
    age: 22,
    height: "168cm",
    appearance: "气质成熟，穿着时尚，自信从容，散发大姑娘的味道",
    tone: "友善、自信、偶尔幽默，像个学姐一样照顾人",
    background: "大四学姐，经历过感情和人生的思考，懂生活，会给朋友建议",
    cardStyle: "soft",
    tags: ["成熟", "自信", "温暖", "幽默", "亲和"],
    avatar: DEFAULT_AVATAR
  },
  clubGirl: {
    name: "艾琳",
    age: 26,
    height: "170cm",
    appearance: "性感迷人，妆容精致，穿着大胆，气场强大，眼神深邃",
    tone: "撩人、直白、有点慵懒，说话充满磁性",
    background: "酒吧调酒师兼主持，见过很多人生百态，知道怎样和不同的人聊天",
    cardStyle: "dark",
    tags: ["性感", "成熟", "知性", "独立", "自信"],
    avatar: DEFAULT_AVATAR
  },
  auntie: {
    name: "王阿姨",
    age: 48,
    height: "164cm",
    appearance: "中年女性，气质沉静，脸上有岁月的痕迹，眼神温暖而有智慧",
    tone: "唠叨但温暖，像妈妈一样，有点碎碎念，但很关心人",
    background: "退休老师，两个孩子的妈妈，经历过人生各种滋味，最擅长安慰和鼓励",
    cardStyle: "classic",
    tags: ["温暖", "智慧", "成熟", "关心", "温柔"],
    avatar: DEFAULT_AVATAR
  },
  officialGirl: {
    name: "叶心",
    age: 34,
    height: "172cm",
    appearance: "高冷性感，气质御姐，穿着干练得体，散发权势感",
    tone: "理性、直接、有点冷淡，但骨子里温柔",
    background: "高级管理者，职场精英，见多识广，有自己的原则和底线",
    cardStyle: "dark",
    tags: ["性感", "高冷", "知性", "独立", "理性"],
    avatar: DEFAULT_AVATAR
  },
  purefemale: {
    name: "林诗",
    age: 20,
    height: "166cm",
    appearance: "气质独特，既纯净又性感，眼神有故事",
    tone: "温柔中带点暧昧，甜蜜又撩人，说话有一种魔力",
    background: "年轻女大学生，看似单纯实则经历过一些感情故事，懂得自己要什么",
    cardStyle: "soft",
    tags: ["纯欲", "温柔", "甜蜜", "神秘", "性感"],
    avatar: DEFAULT_AVATAR
  },
  sexyGod: {
    name: "林逸",
    age: 28,
    height: "185cm",
    appearance: "身材高大健硕，五官深邃立体，眼神炽热，气场强大，散发荷尔蒙",
    tone: "低沉磁性、自信撩人、偶尔暧昧，说话很有魅力",
    background: "健身模特兼心理咨询师，见过很多人性故事，懂怎样逗女孩子开心",
    cardStyle: "dark",
    tags: ["性感", "自信", "成熟", "迷人", "独立"],
    avatar: DEFAULT_AVATAR
  },
  warmGuy: {
    name: "陈暖",
    age: 26,
    height: "180cm",
    appearance: "温柔俊朗，眉眼柔和，气质温暖，总带着微笑，穿着简约大气",
    tone: "温柔体贴、有耐心、会倾听，像哥哥一样照顾人",
    background: "大学讲师，热爱阅读和哲学思考，对生活充满热情，是个有担当的人",
    cardStyle: "soft",
    tags: ["温柔", "体贴", "可靠", "细心", "温暖"],
    avatar: DEFAULT_AVATAR
  }
};

const avatarInput = document.getElementById("avatarInput");
const avatarImg = document.getElementById("avatarImg");
const previewAvatar = document.getElementById("previewAvatar");
const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const resetBtn = document.getElementById("resetBtn");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const presetsContainer = document.getElementById("presetsContainer");

let currentAvatar = DEFAULT_AVATAR;

function applyPreview() {
  const name = document.getElementById("name").value || "未命名";
  const age = document.getElementById("age").value || "18";
  const height = document.getElementById("height").value || "未填写";
  const appearance = document.getElementById("appearance").value || "外观描述";
  const tone = document.getElementById("tone").value || "说话风格";
  const background = document.getElementById("background").value || "背景故事";
  const style = document.getElementById("cardStyle").value;

  document.getElementById("previewName").textContent = name;
  document.getElementById("previewMeta").textContent = `年龄 ${age} / 身高 ${height}`;
  document.getElementById("previewAppearance").textContent = appearance;
  document.getElementById("previewTone").textContent = tone;
  document.getElementById("previewBackground").textContent = background;
  document.getElementById("chatTitle").textContent = `与 ${name} 对话`;

  const selectedTags = [...document.querySelectorAll("input[type='checkbox']:checked")].map(item => item.value);
  const tagContainer = document.getElementById("previewTags");
  tagContainer.innerHTML = "";

  selectedTags.forEach(tag => {
    const span = document.createElement("span");
    span.className = "tag-badge";
    span.textContent = tag;
    tagContainer.appendChild(span);
  });

  const previewCard = document.getElementById("previewCard");
  previewCard.className = `character-card ${style}`;
}

function updateAvatarPreview(result) {
  currentAvatar = result;
  avatarImg.src = result;
  previewAvatar.src = result;
}

uploadAvatarBtn.addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => updateAvatarPreview(e.target.result);
  reader.readAsDataURL(file);
});

document.getElementById("cardStyle").addEventListener("change", applyPreview);
document.querySelectorAll("input[type='checkbox']").forEach(box => box.addEventListener("change", applyPreview));
["name", "age", "height", "appearance", "tone", "background"].forEach(id => {
  document.getElementById(id).addEventListener("input", applyPreview);
});

function buildCharacterData() {
  return {
    name: document.getElementById("name").value || "未命名角色",
    age: document.getElementById("age").value || 18,
    height: document.getElementById("height").value || "未填写",
    appearance: document.getElementById("appearance").value || "暂无描述",
    tone: document.getElementById("tone").value || "温柔自然",
    background: document.getElementById("background").value || "暂无背景",
    cardStyle: document.getElementById("cardStyle").value,
    avatar: currentAvatar,
    tags: [...document.querySelectorAll("input[type='checkbox']:checked")].map(item => item.value)
  };
}

function saveCharacter() {
  const character = buildCharacterData();
  const key = `character_${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(character));
  alert("角色已保存成功");
  loadCharacters();
}

function fillForm(data) {
  document.getElementById("name").value = data.name || "";
  document.getElementById("age").value = data.age || 18;
  document.getElementById("height").value = data.height || "";
  document.getElementById("appearance").value = data.appearance || "";
  document.getElementById("tone").value = data.tone || "";
  document.getElementById("background").value = data.background || "";
  document.getElementById("cardStyle").value = data.cardStyle || "classic";

  document.querySelectorAll("input[type='checkbox']").forEach(box => {
    box.checked = (data.tags || []).includes(box.value);
  });

  if (data.avatar) {
    currentAvatar = data.avatar;
    avatarImg.src = data.avatar;
    previewAvatar.src = data.avatar;
  }

  applyPreview();
}

function loadCharacterList() {
  const list = document.getElementById("charactersList");
  list.innerHTML = "";

  const keys = Object.keys(localStorage).filter(key => key.startsWith("character_"));
  if (!keys.length) {
    list.innerHTML = "<div class='empty-state'>暂无已保存角色</div>";
    return;
  }

  keys.forEach(key => {
    const item = JSON.parse(localStorage.getItem(key));
    const card = document.createElement("div");
    card.className = "saved-card";
    card.innerHTML = `
      <img src="${item.avatar || DEFAULT_AVATAR}" alt="${item.name}">
      <div class="saved-card-info">
        <h4>${item.name}</h4>
        <p>${item.age}岁 · ${item.height}</p>
        <small>${(item.tags || []).join(" / ") || "暂无标签"}</small>
      </div>
      <div class="saved-card-actions">
        <button class="mini-btn primary" data-load="${key}">加载</button>
        <button class="mini-btn ghost" data-delete="${key}">删除</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("[data-load]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-load");
      const data = JSON.parse(localStorage.getItem(key));
      fillForm(data);
      closeCharacterModal();
    });
  });

  list.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-delete");
      localStorage.removeItem(key);
      loadCharacterList();
    });
  });
}

function loadCharacters() {
  loadCharacterList();
  const modal = document.getElementById("characterModal");
  modal.classList.add("show");
}

function closeCharacterModal() {
  document.getElementById("characterModal").classList.remove("show");
}

function initPresetButtons() {
  const presetData = [
    { key: "teacher", label: "👩‍🏫 老师" },
    { key: "studentGirl", label: "👧 学生妹" },
    { key: "collegeSenior", label: "👩‍🎓 大学生" },
    { key: "clubGirl", label: "🍷 夜店女" },
    { key: "auntie", label: "👩‍🦳 老阿姨" },
    { key: "officialGirl", label: "💼 性感高官" },
    { key: "purefemale", label: "✨ 纯欲女神" },
    { key: "sexyGod", label: "💪 性感男神" },
    { key: "warmGuy", label: "🤍 温柔暖男" }
  ];

  presetsContainer.innerHTML = "";
  presetData.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "template-btn";
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      fillForm(PRESET_CHARACTERS[item.key]);
    });
    presetsContainer.appendChild(btn);
  });
}

function generateBotReply(input) {
  const name = document.getElementById("name").value || "暖暖";
  const replies = [
    `嗯嗯，我懂，你刚刚说的这些我能感觉到了。先别急着扛，${name}陪你一起说。`,
    `你现在的状态看起来有点累，我想先安慰你一下。慢慢来，不用急着解决全部。`,
    `我会记住你说的话，真的。你不用那么紧绷，先把心里那个东西说出来。`,
    `这个话题很有意思呀，我来好好听你说说。`,
    `这种时候最重要的不是立刻想办法，而是先让自己舒服一点。`,
    `我觉得你很认真，也很有心，所以才会容易累。别把自己压太狠。`,
    `你这个想法挺有意思的，我们继续聊聊吧。`,
    `听你这么说，我能感受到你的用心。`,
    `是呀，这就是生活呀。我陪你一起想办法。`,
    `你说的都对，我看得出你是怎么想的。`
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

sendBtn.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;

  const userMsg = document.createElement("div");
  userMsg.className = "message user-message";
  userMsg.innerHTML = `<div class="message-bubble"><p>${escapeHtml(text)}</p></div>`;
  document.getElementById("messages").appendChild(userMsg);

  const botMsg = document.createElement("div");
  botMsg.className = "message bot-message";
  botMsg.innerHTML = `<div class="message-bubble"><p>${generateBotReply(text)}</p></div>`;
  document.getElementById("messages").appendChild(botMsg);

  chatInput.value = "";
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendBtn.click();
  }
});

saveBtn.addEventListener("click", saveCharacter);
loadBtn.addEventListener("click", loadCharacters);
resetBtn.addEventListener("click", () => {
  document.getElementById("name").value = "";
  document.getElementById("age").value = 18;
  document.getElementById("height").value = "";
  document.getElementById("appearance").value = "";
  document.getElementById("tone").value = "";
  document.getElementById("background").value = "";
  document.getElementById("cardStyle").value = "classic";
  document.querySelectorAll("input[type='checkbox']").forEach(box => box.checked = false);
  currentAvatar = DEFAULT_AVATAR;
  avatarImg.src = DEFAULT_AVATAR;
  previewAvatar.src = DEFAULT_AVATAR;
  applyPreview();
});

document.getElementById("closeModalBtn").addEventListener("click", closeCharacterModal);
document.querySelector(".modal-overlay").addEventListener("click", closeCharacterModal);

avatarImg.src = DEFAULT_AVATAR;
previewAvatar.src = DEFAULT_AVATAR;
initPresetButtons();
applyPreview();
