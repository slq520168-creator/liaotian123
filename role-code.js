/** 上传或编写角色配置：只解析数据，不执行上传文件里的程序。 */
const ROLE_CODE_DRAFT_KEY = 'liaotian_role_code_draft';
const ROLE_CODE_TARGET_KEY = 'liaotian_role_code_target';
let roleCodeEditingId = '';

function saveRoleCodeDraft() {
  try {
    sessionStorage.setItem(ROLE_CODE_DRAFT_KEY, byId('roleCodeEditor').value);
    sessionStorage.setItem(ROLE_CODE_TARGET_KEY, roleCodeEditingId);
  }
  catch (error) { byId('roleCodeEditorStatus').textContent = '草稿暂时无法保存。'; }
}
// Read data literals only. Never evaluate the submitted JavaScript.
function parseRoleData(source) {
  let text = String(source ?? '').replace(/^\uFEFF/, ' ');
  if (text.length > 524288) throw new Error('角色代码最多524288字符，请精简后生成。');
  if (!text.trim()) throw new Error('请先填写或粘贴角色代码。');
  const fence = text.match(/^(\s*```(?:json5?|javascript|js)?[^\S\r\n]*\r?\n)([\s\S]*?)(\r?\n?```\s*)$/i);
  if (fence) text = fence[1].replace(/[^\r\n]/g, ' ') + fence[2] + fence[3].replace(/[^\r\n]/g, ' ');
  let position = 0;
  const quotes = {'"': '"', "'": "'", '`': '`', '“': '”', '”': '”', '‘': '’', '’': '’'};
  const punctuation = {'：': ':', '，': ',', '；': ';', '｛': '{', '｝': '}', '［': '[', '］': ']'};
  function fail(message, at = position) {
    const lines = text.slice(0, at).split(/\r\n?|\n/);
    const error = new Error('第' + lines.length + '行，第' + (lines.at(-1).length + 1) + '列：' + message);
    error.position = at;
    throw error;
  }
  function skip() {
    while (position < text.length) {
      if (/\s/.test(text[position])) {position++; continue;}
      if (text.startsWith('//', position)) {
        position += 2;
        while (position < text.length && !/[\r\n]/.test(text[position])) position++;
        continue;
      }
      if (text.startsWith('/*', position)) {
        const end = text.indexOf('*/', position + 2);
        if (end < 0) fail('注释缺少结尾 */。');
        position = end + 2;
        continue;
      }
      break;
    }
  }
  function take(symbol) {
    skip();
    if ((punctuation[text[position]] || text[position]) !== symbol) return false;
    position++;
    return true;
  }
  function expect(symbol, message) {if (!take(symbol)) fail(message);}
  function identifier() {
    skip();
    const match = text.slice(position).match(/^[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*/u);
    if (!match) fail('字段名请写成 name 或 "name" 这样的形式。');
    position += match[0].length;
    return match[0];
  }
  function word(value) {
    skip();
    const match = text.slice(position).match(/^[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*/u);
    if (match?.[0] !== value) return false;
    position += value.length;
    return true;
  }
  function string() {
    const start = position, endQuote = quotes[text[position++]];
    let out = '';
    while (position < text.length) {
      const character = text[position++];
      if (character === endQuote) return out;
      if (character !== '\\') {out += character; continue;}
      if (position >= text.length) fail('字符串末尾的反斜杠后缺少内容。');
      const escape = text[position++];
      const escapes = {n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0'};
      if (Object.hasOwn(escapes, escape)) {out += escapes[escape]; continue;}
      if (escape === '\n' || escape === '\r') {
        if (escape === '\r' && text[position] === '\n') position++;
        continue;
      }
      if (escape === 'u' || escape === 'x') {
        if (escape === 'u' && text[position] === '{') {
          const match = text.slice(position).match(/^\{([0-9a-f]{1,6})\}/i);
          if (!match || parseInt(match[1], 16) > 0x10ffff) fail('Unicode转义不完整，请检查 \\u{...}。');
          out += String.fromCodePoint(parseInt(match[1], 16)); position += match[0].length;
        } else {
          const length = escape === 'u' ? 4 : 2, hex = text.slice(position, position + length);
          if (hex.length !== length || !/^[0-9a-f]+$/i.test(hex)) fail('字符转义不完整，请检查 \\u 或 \\x 后的数字。');
          out += String.fromCharCode(parseInt(hex, 16)); position += length;
        }
        continue;
      }
      out += escape;
    }
    fail('字符串缺少结尾' + endQuote + '。', start);
  }
  function value(depth = 0) {
    skip();
    if (depth > 64) fail('嵌套层数太多，请简化角色数据。');
    if (Object.hasOwn(quotes, text[position])) return string();
    if (take('{')) {
      const object = Object.create(null);
      if (take('}')) return object;
      while (true) {
        skip();
        const key = Object.hasOwn(quotes, text[position]) ? string() : identifier();
        expect(':', '字段名后缺少冒号，例如 name: "小雨"。');
        object[key] = value(depth + 1);
        if (take('}')) return object;
        expect(',', '字段之间缺少逗号，或缺少结尾 }。');
        if (take('}')) return object;
      }
    }
    if (take('[')) {
      const array = [];
      if (take(']')) return array;
      while (true) {
        array.push(value(depth + 1));
        if (take(']')) return array;
        expect(',', '数组项之间缺少逗号，或缺少结尾 ]。');
        if (take(']')) return array;
      }
    }
    if (take('(')) {
      const inner = value(depth + 1);
      expect(')', '缺少结尾 )。');
      return inner;
    }
    for (const [literal, result] of [['true', true], ['false', false], ['null', null]]) if (word(literal)) return result;
    const number = text.slice(position).match(/^[+-]?(?:0[xX][0-9a-f]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/i);
    if (number) {
      position += number[0].length;
      const result = /^[+-]?0x/i.test(number[0]) ? parseInt(number[0], 16) : Number(number[0]);
      if (!Number.isFinite(result)) fail('数字太大，请填写普通数字。');
      return result;
    }
    fail(position === text.length ? '代码没有写完，请补上字段值或结尾括号。' : '字段值请直接填写文字、数字、数组或对象，不支持函数和计算表达式。');
  }
  function finish() {
    take(';'); skip();
    if (position < text.length) fail('角色数据后还有其他内容，请只保留这一份角色配置。');
  }
  function declaration() {
    const name = identifier();
    expect('=', '角色变量名后缺少 =。');
    const result = value();
    take(';');
    if (word('export')) {
      if (!word('default') || identifier() !== name) fail('export default 后请填写上面定义的角色变量名。');
    } else if (word('module')) {
      expect('.', '请使用 module.exports = 角色变量名。');
      if (!word('exports')) fail('请使用 module.exports = 角色变量名。');
      expect('=', 'module.exports 后缺少 =。');
      if (identifier() !== name) fail('module.exports 后请填写上面定义的角色变量名。');
    }
    finish();
    return result;
  }
  if (word('export')) {
    if (word('default')) {const result = value(); finish(); return result;}
    if (word('const') || word('let') || word('var')) return declaration();
    fail('export 后请写 default 或角色变量声明。');
  }
  if (word('const') || word('let') || word('var')) return declaration();
  if (word('module')) {
    expect('.', '请使用 module.exports = {...}。');
    if (!word('exports')) fail('请使用 module.exports = {...}。');
    expect('=', 'module.exports 后缺少 =。');
  }
  const result = value();
  finish();
  return result;
}

function canonicalRoleData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  // Common character-card exports keep the editable fields under data.
  const data = value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : value;
  const role = {...data};
  const aliases = {
    name: ['姓名', '名字', '角色名', '角色名称'], personality: ['性格', '人设', '角色设定', 'description', 'persona'],
    age: ['年龄'], gender: ['性别'], avatar: ['头像'], tag: ['标签'],
    greeting: ['开场白', '问候语', 'first_mes'], voice: ['说话风格', '语气'],
    interests: ['兴趣', '爱好'], relationship: ['相处方式', '关系'],
    background: ['背景', '背景故事', 'scenario'], quickReplies: ['快捷回复']
  };
  for (const [key, alternatives] of Object.entries(aliases)) {
    if (role[key] !== undefined) continue;
    const alias = alternatives.find(name => Object.hasOwn(data, name));
    if (alias) role[key] = data[alias];
  }
  const gender = typeof role.gender === 'string' ? role.gender.trim().toLowerCase() : role.gender;
  if (['女', '女性', '成年女性', 'female'].includes(gender)) role.gender = 'female';
  else if (['男', '男性', '成年男性', 'male'].includes(gender)) role.gender = 'male';
  if (typeof role.age === 'string' && /^\d+\s*岁$/.test(role.age.trim())) role.age = Number(role.age.trim().replace(/\s*岁$/, ''));
  return role;
}

function parseRoleCode(source, targetId = '') {
  const value = parseRoleData(source);
  const list = Array.isArray(value) ? value : Array.isArray(value?.roles) ? value.roles : Array.isArray(value?.characters) ? value.characters : [value?.character || value?.role || value];
  if (!list.length || list.length > 24) throw new Error('一次可添加1到24个角色。');
  const existing = targetId ? characters.find(char => char.id === targetId && !char.isPreset) : null;
  if (targetId && !existing) throw new Error('这个自定义角色已不存在，请重新选择。');
  if (targetId && list.length !== 1) throw new Error('修改角色时请只填写一个角色。');
  return list.map((raw, index) => {
    const item = canonicalRoleData(raw);
    const label = list.length > 1 ? '第' + (index + 1) + '个角色：' : '';
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(label + '请用 { ... } 填写角色配置。');
    if (typeof item.name !== 'string' || !item.name.trim()) throw new Error(label + '缺少角色姓名，请填写 name: "角色姓名"。');
    if (typeof item.personality !== 'string' || !item.personality.trim()) throw new Error(label + '缺少角色性格，请填写 personality: "性格与人设"。');
    if (item.personality.trim().length > CHAT_LIMITS.personality) throw new Error('角色性格最多12000字，请精简后生成。');
    if (item.age !== undefined && (!Number.isFinite(Number(item.age)) || Number(item.age) < 18 || Number(item.age) > 100)) throw new Error('角色年龄请填写18到100岁。');
    const id = typeof item.id === 'string' && /^[a-z0-9_-]{1,70}$/i.test(item.id) ? item.id : makeId();
    return normalizeCustomCharacter({
      ...existing, ...item, id: existing?.id || (id.startsWith('custom_') ? id : 'custom_' + id),
      tag: item.tag || existing?.tag || '新朋友', greeting: item.greeting || existing?.greeting || '你来了。今天想聊什么？',
      gender: item.gender || existing?.gender || 'unspecified', age: item.age || existing?.age || 24
    });
  });
}

function createRoleCodeTemplate() {
  return JSON.stringify({
    id: 'role_' + makeId(), name: '新角色', gender: 'female', age: 24,
    tag: '温柔开朗', avatar: DEFAULT_AVATAR,
    greeting: '你来啦。今天想和我聊什么？',
    personality: '24岁成年女性，温柔、开朗，有自己的兴趣和生活。认真听对方说话，慢慢熟悉后主动关心。',
    voice: '自然口语，有温度，长短文和表情都能接话。',
    interests: '音乐、旅行、做饭', relationship: '像熟悉的朋友，记住对方的名字和偏好。',
    quickReplies: ['今天想找你聊聊', '说说你的兴趣', '给我讲一个故事']
  }, null, 2);
}

function setRoleCodeTarget(targetId, source) {
  const existing = characters.find(char => char.id === targetId && !char.isPreset);
  roleCodeEditingId = existing?.id || '';
  byId('roleCodeTarget').value = roleCodeEditingId;
  byId('roleCodeTargetHint').textContent = existing ? '修改姓名、人设或头像后保存，聊天和记忆会保留。' : '粘贴自己的角色代码，或使用模板后生成新角色。';
  byId('generateRoleCodeBtn').textContent = existing ? '保存修改' : '生成角色';
  byId('generateRoleCodeBtn').title = (existing ? '保存修改' : '生成角色') + '（Ctrl/Cmd + Enter）';
  const {isPreset, ...data} = existing || {};
  byId('roleCodeEditor').value = source !== undefined ? source : existing ? JSON.stringify(data, null, 2) : createRoleCodeTemplate();
  byId('roleCodeEditor').scrollTop = 0;
  byId('roleCodeEditorStatus').textContent = '';
  saveRoleCodeDraft();
}

function renderRoleCodeControls() {
  const form = byId('roleCodeForm');
  let controls = byId('roleCodeTargetControls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'roleCodeTargetControls';
    form.insertBefore(controls, form.firstChild);
  }
  controls.className = 'form-group';
  controls.replaceChildren();
  const label = document.createElement('label');
  label.htmlFor = 'roleCodeTarget'; label.textContent = '操作角色';
  const select = document.createElement('select');
  select.id = 'roleCodeTarget';
  const add = document.createElement('option');
  add.value = ''; add.textContent = '添加新角色'; select.appendChild(add);
  characters.filter(char => !char.isPreset).forEach(char => {
    const option = document.createElement('option');
    option.value = char.id; option.textContent = '修改：' + char.name; select.appendChild(option);
  });
  select.addEventListener('change', () => setRoleCodeTarget(select.value));
  const hint = document.createElement('p');
  hint.id = 'roleCodeTargetHint'; hint.className = 'form-hint';
  controls.append(label, select, hint);
  const toolbar = form.querySelector('.role-code-toolbar');
  let clear = byId('clearRoleCodeBtn');
  if (!clear) {
    clear = document.createElement('button');
    clear.type = 'button'; clear.id = 'clearRoleCodeBtn'; clear.className = 'btn btn-outline'; clear.textContent = '清空代码';
    toolbar.insertBefore(clear, toolbar.querySelector('.template-link'));
  }
  clear.onclick = () => {
    byId('roleCodeEditor').value = '';
    byId('roleCodeEditorStatus').textContent = '';
    saveRoleCodeDraft();
    byId('roleCodeEditor').focus();
  };
  byId('roleCodeEditor').wrap = 'soft';
  byId('roleCodeEditor').placeholder = "例如 { 姓名: '小雨', 性格: '成熟坦率，喜欢读书' }；也支持 name/personality、JSON 和 JS 对象";
}

function useRoleCodeTemplate() {
  const template = JSON.parse(createRoleCodeTemplate());
  if (roleCodeEditingId) template.id = roleCodeEditingId;
  byId('roleCodeEditor').value = JSON.stringify(template, null, 2);
  byId('roleCodeEditorStatus').textContent = '';
  saveRoleCodeDraft();
}

function openRoleCodeEditor(targetId) {
  closeSidebar();
  byId('roleCodeStatus').textContent = '';
  byId('roleCodeEditorStatus').textContent = '';
  let draft = null, draftTarget = '';
  try {
    draft = sessionStorage.getItem(ROLE_CODE_DRAFT_KEY);
    draftTarget = sessionStorage.getItem(ROLE_CODE_TARGET_KEY) || '';
  } catch (error) {}
  const selected = typeof targetId === 'string' ? targetId : draftTarget;
  const valid = !selected || characters.some(char => char.id === selected && !char.isPreset);
  renderRoleCodeControls();
  setRoleCodeTarget(valid ? selected : '', valid && selected === draftTarget && draft !== null ? draft : undefined);
  openDialog('roleCodeModalOverlay');
}

function addRolesFromCode(source) {
  const added = parseRoleCode(source, roleCodeEditingId);
  commitCustomCharacters(added, roleCodeEditingId);
  closeSidebar();
  closeDialog('roleCodeModalOverlay');
  byId('roleCodeEditor').value = '';
  roleCodeEditingId = '';
  try { sessionStorage.removeItem(ROLE_CODE_DRAFT_KEY); sessionStorage.removeItem(ROLE_CODE_TARGET_KEY); } catch (error) {}
  byId('roleCodeEditorStatus').textContent = '';
  byId('roleCodeStatus').textContent = '';
}

function handleRoleCodeSubmit(event) {
  event.preventDefault();
  if (byId('generateRoleCodeBtn').disabled) return;
  byId('roleCodeEditorStatus').textContent = '';
  try { addRolesFromCode(byId('roleCodeEditor').value); }
  catch (error) {
    byId('roleCodeEditorStatus').textContent = error.message;
    if (Number.isInteger(error.position)) {
      const editor = byId('roleCodeEditor');
      editor.focus();
      editor.setSelectionRange(error.position, error.position);
    }
  }
}

async function handleRoleCodeUpload() {
  const input = byId('roleCodeUpload');
  const file = input.files[0];
  if (!file) return;
  const status = byId('roleCodeStatus');
  const editorStatus = byId('roleCodeEditorStatus');
  status.textContent = '';
  editorStatus.textContent = '';
  const controls = ['chooseRoleCodeFileBtn', 'generateRoleCodeBtn', 'roleCodeTarget', 'roleCodeEditor', 'useRoleCodeTemplateBtn', 'clearRoleCodeBtn'].map(byId).filter(Boolean);
  controls.forEach(control => {control.disabled = true;});
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('角色代码文件最多5MB。');
    const source = await file.text();
    if (source.length > 524288) throw new Error('角色代码最多524288字符，请精简后上传。');
    byId('roleCodeEditor').value = source;
    saveRoleCodeDraft();
    editorStatus.textContent = roleCodeEditingId ? '文件已载入，检查后点“保存修改”。' : '文件已载入，检查后点“生成角色”。';
  } catch (error) {
    const showingEditor = byId('roleCodeModalOverlay').classList.contains('active');
    (showingEditor ? editorStatus : status).textContent = error.message;
  } finally {
    input.value = '';
    controls.forEach(control => {control.disabled = false;});
  }
}
