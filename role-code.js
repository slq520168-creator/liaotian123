/** 单独上传角色配置：只解析数据，不执行上传文件里的程序。 */
function parseRoleCode(source) {
  let text = String(source).replace(/^\uFEFF/, '').trim();
  if (text.startsWith('export default ')) text = text.slice('export default '.length).replace(/;\s*$/, '').trim();
  else if (text.startsWith('module.exports = ')) text = text.slice('module.exports = '.length).replace(/;\s*$/, '').trim();
  let value;
  try { value = JSON.parse(text); } catch (error) { throw new Error('角色代码格式不对。请使用“下载角色模板”里的JSON格式，也支持 export default 后接同样的JSON。'); }
  const list = Array.isArray(value) ? value : value && Array.isArray(value.roles) ? value.roles : [value];
  if (!list.length || list.length > 24) throw new Error('一次可添加1到24个角色。');
  return list.map(item => {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim() || typeof item.personality !== 'string' || !item.personality.trim()) throw new Error('每个角色都需要 name（姓名）和 personality（人设）。');
    if (item.age !== undefined && (!Number.isFinite(Number(item.age)) || Number(item.age) < 18 || Number(item.age) > 100)) throw new Error('角色年龄请填写18到100岁。');
    const id = typeof item.id === 'string' && /^[a-z0-9_-]{1,70}$/i.test(item.id) ? item.id : makeId();
    return normalizeCustomCharacter({
      ...item, id: id.startsWith('custom_') ? id : 'custom_' + id,
      tag: item.tag || '新朋友', greeting: item.greeting || '你来了。今天想聊什么？',
      gender: item.gender || 'unspecified', age: item.age || 24
    });
  });
}

async function handleRoleCodeUpload() {
  const input = byId('roleCodeUpload');
  const file = input.files[0];
  if (!file) return;
  const status = byId('roleCodeStatus');
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('角色代码文件最多5MB。');
    const added = parseRoleCode(await file.text());
    // 完整验证后一次添加，重复导入同一文件不会覆盖原角色的记忆。
    const ids = new Set(characters.map(char => char.id));
    const fresh = added.filter(char => {
      if (!char || ids.has(char.id)) return false;
      ids.add(char.id);
      return true;
    });
    if (!fresh.length) throw new Error('这些角色已经添加过了；换一个id可以创建另一个角色。');
    characters.push(...fresh);
    status.textContent = '已添加' + fresh.length + '个角色，可直接聊天。';
    switchCharacter(fresh[0].id);
    closeSidebar();
  } catch (error) { status.textContent = error.message; }
  finally { input.value = ''; }
}
