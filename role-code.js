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
function parseRoleCode(source, targetId = '') {
  let text = String(source).replace(/^\uFEFF/, '').trim();
  if (text.startsWith('export default ')) text = text.slice('export default '.length).replace(/;\s*$/, '').trim();
  else if (text.startsWith('module.exports = ')) text = text.slice('module.exports = '.length).replace(/;\s*$/, '').trim();
  let value;
  try { value = JSON.parse(text); } catch (error) { throw new Error('格式不对，请使用角色模板。'); }
  const list = Array.isArray(value) ? value : value && Array.isArray(value.roles) ? value.roles : [value];
  if (!list.length || list.length > 24) throw new Error('一次可添加1到24个角色。');
  const existing = targetId ? characters.find(char => char.id === targetId && !char.isPreset) : null;
  if (targetId && !existing) throw new Error('这个自定义角色已不存在，请重新选择。');
  if (targetId && list.length !== 1) throw new Error('修改角色时请只填写一个角色。');
  return list.map(item => {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim() || typeof item.personality !== 'string' || !item.personality.trim()) throw new Error('请补全角色姓名和性格。');
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
  catch (error) { byId('roleCodeEditorStatus').textContent = error.message; }
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
