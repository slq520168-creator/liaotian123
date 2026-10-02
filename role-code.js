/** 上传或编写角色配置：只解析数据，不执行上传文件里的程序。 */
const ROLE_CODE_DRAFT_KEY = 'liaotian_role_code_draft';

function saveRoleCodeDraft() {
  try { sessionStorage.setItem(ROLE_CODE_DRAFT_KEY, byId('roleCodeEditor').value); }
  catch (error) { byId('roleCodeEditorStatus').textContent = '草稿暂时无法保存。'; }
}
function parseRoleCode(source) {
  let text = String(source).replace(/^\uFEFF/, '').trim();
  if (text.startsWith('export default ')) text = text.slice('export default '.length).replace(/;\s*$/, '').trim();
  else if (text.startsWith('module.exports = ')) text = text.slice('module.exports = '.length).replace(/;\s*$/, '').trim();
  let value;
  try { value = JSON.parse(text); } catch (error) { throw new Error('格式不对，请使用角色模板。'); }
  const list = Array.isArray(value) ? value : value && Array.isArray(value.roles) ? value.roles : [value];
  if (!list.length || list.length > 24) throw new Error('一次可添加1到24个角色。');
  return list.map(item => {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim() || typeof item.personality !== 'string' || !item.personality.trim()) throw new Error('请补全角色姓名和性格。');
    if (item.age !== undefined && (!Number.isFinite(Number(item.age)) || Number(item.age) < 18 || Number(item.age) > 100)) throw new Error('角色年龄请填写18到100岁。');
    const id = typeof item.id === 'string' && /^[a-z0-9_-]{1,70}$/i.test(item.id) ? item.id : makeId();
    return normalizeCustomCharacter({
      ...item, id: id.startsWith('custom_') ? id : 'custom_' + id,
      tag: item.tag || '新朋友', greeting: item.greeting || '你来了。今天想聊什么？',
      gender: item.gender || 'unspecified', age: item.age || 24
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

function openRoleCodeEditor() {
  closeSidebar();
  byId('roleCodeStatus').textContent = '';
  byId('roleCodeEditorStatus').textContent = '';
  if (!byId('roleCodeEditor').value.trim()) {
    let draft = '';
    try { draft = sessionStorage.getItem(ROLE_CODE_DRAFT_KEY) || ''; } catch (error) {}
    byId('roleCodeEditor').value = draft || createRoleCodeTemplate();
    saveRoleCodeDraft();
  }
  openDialog('roleCodeModalOverlay');
}

function addRolesFromCode(source) {
  const added = parseRoleCode(source);
  // 完整验证后一次添加，重复导入同一文件不会覆盖原角色的记忆。
  const ids = new Set(characters.map(char => char.id));
  const fresh = added.filter(char => {
    if (!char || ids.has(char.id)) return false;
    ids.add(char.id);
    return true;
  });
  if (!fresh.length) throw new Error('角色已经添加。');
  const previousCharacters = characters;
  const previousActiveId = activeCharacterId;
  characters = characters.concat(fresh);
  switchCharacter(fresh[0].id, false);
  if (!saveDataToStorage()) {
    characters = previousCharacters;
    fresh.forEach(char => {delete chatHistories[char.id]; delete roleMemories[char.id];});
    switchCharacter(previousActiveId, false);
    saveDataToStorage();
    throw new Error('空间不足，角色未保存。');
  }
  closeSidebar();
  closeDialog('roleCodeModalOverlay');
  byId('roleCodeEditor').value = '';
  try { sessionStorage.removeItem(ROLE_CODE_DRAFT_KEY); } catch (error) {}
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
  byId('chooseRoleCodeFileBtn').disabled = true;
  byId('generateRoleCodeBtn').disabled = true;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('角色代码文件最多5MB。');
    addRolesFromCode(await file.text());
  } catch (error) {
    const showingEditor = byId('roleCodeModalOverlay').classList.contains('active');
    (showingEditor ? editorStatus : status).textContent = error.message;
  } finally {
    input.value = '';
    byId('chooseRoleCodeFileBtn').disabled = false;
    byId('generateRoleCodeBtn').disabled = false;
  }
}
