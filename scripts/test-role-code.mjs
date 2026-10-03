import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const code = fs.readFileSync(new URL('../role-code.js', import.meta.url), 'utf8');
function slice(start, end) {
  const first = app.indexOf(start), last = app.indexOf(end, first);
  assert(first >= 0 && last > first);
  return app.slice(first, last);
}
const elements = new Map(), storage = new Map(), drafts = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: '', textContent: '', disabled: false, files: [],
    classList: {contains: () => true},
    focus() {this.focused = true;},
    setSelectionRange(start, end) {this.selection = [start, end];}
  });
  return elements.get(id);
}
let generated = 0, executed = 0, quotaExceeded = false;
const context = {
  URL, console,
  DEFAULT_AVATAR: 'assets/avatars/nuannuan-portrait.jpg', MAX_AVATAR_DATA_LENGTH: 180000,
  CHAT_LIMITS: {personality: 12000}, makeId: () => 'generated_' + (++generated),
  characters: [], activeCharacterId: '', chatHistories: Object.create(null),
  roleMemories: Object.create(null), pendingReplies: new Map(), playerProfile: {},
  replyLength: 'auto', chatStyle: 'mature', replyStatus: element('replyStatus'), byId: element,
  localStorage: {setItem(key, value) {if (quotaExceeded) throw new Error('quota'); storage.set(key, value);}},
  sessionStorage: {getItem: key => drafts.get(key) ?? null, setItem: (key, value) => drafts.set(key, value), removeItem: key => drafts.delete(key)},
  closeSidebar() {}, closeDialog() {},
  switchCharacter(id) {
    context.activeCharacterId = id;
    context.chatHistories[id] ||= [{sender: 'bot', text: context.characters.find(char => char.id === id).greeting}];
    context.roleMemories[id] ||= {facts: []};
  },
  probe() {executed++;}
};
vm.createContext(context);
vm.runInContext(slice('function safeAvatar(', '\nfunction loadDataFromStorage(') + slice('function saveDataToStorage(', '\nfunction makeId(') + slice('function commitCustomCharacters(', '\nfunction handleCreateRole(') + code, context);
const plain = value => JSON.parse(JSON.stringify(value));
const parse = source => context.parseRoleCode(source);
const expected = {name: '阿晴', personality: '成熟坦率，喜欢读书。', age: 28};
const literal = "{ name: '阿晴', personality: '成熟坦率，喜欢读书。', age: 28, }";
for (const source of [
  JSON.stringify(expected), literal,
  'export\ndefault\n' + literal + ';',
  'module.exports=' + literal + ';',
  'const role = ' + literal + '; export default role;',
  'let role = ' + literal + '; module . exports = role;',
  'export const role = (' + literal + ');',
  '// 角色资料\n' + literal.replace('personality:', '/* 详细性格 */ personality:'),
  '```javascript\nexport default ' + literal + ';\n```',
  '```json\n' + JSON.stringify(expected, null, 2) + '\n```',
  '\uFEFF' + literal,
  '｛ name：“阿晴”， personality：“成熟坦率，喜欢读书。”， age：28， ｝'
]) {
  const [role] = parse(source);
  assert.deepEqual({name: role.name, personality: role.personality, age: role.age}, expected);
  assert.match(role.id, /^custom_generated_/);
  assert.equal(role.avatar, context.DEFAULT_AVATAR);
}
assert.equal(parse('{name: "阿晴", personality: `第一行\n第二行：她说“你好”，保持原文。` }')[0].personality, '第一行\n第二行：她说“你好”，保持原文。');
assert.equal(parse(String.raw`{name:'阿晴', personality:'\u6210\u719f\n\x41\u{1f642}，\'直接\'，https://example.test/a', age:0x1c}`)[0].personality, "成熟\nA🙂，'直接'，https://example.test/a");
assert.equal(parse('{ roles: [' + literal + ',' + literal.replace('阿晴', '知远') + ',], }').length, 2);
assert.equal(parse(fs.readFileSync(new URL('../roles/new-role.role.json', import.meta.url), 'utf8')).length, 1);
assert.equal(parse(fs.readFileSync(new URL('../roles/preset-roles.json', import.meta.url), 'utf8')).length, 12);

const broken = "{\n name: '阿晴'\n personality: '成熟坦率'\n}";
assert.throws(() => parse(broken), error => /第3行，第2列：字段之间缺少逗号/.test(error.message) && error.position === broken.indexOf('personality'));
assert.throws(() => parse('```js\n' + broken + '\n```'), /第4行，第2列/);
for (const [source, message] of [
  ['', /请先填写/], ['/* 没有结尾', /注释缺少结尾/],
  ["{name:'阿晴, personality:'性格'}", /第1行/],
  ["{name '阿晴', personality:'性格'}", /缺少冒号/],
  ["{name:'阿晴', personality:}", /字段值/],
  ["{personality:'性格'}", /缺少角色姓名/], ["{name:'阿晴'}", /缺少角色性格/],
  ["{name:'阿晴', personality:'性格', age:17}", /18到100/],
  ["{name:'阿晴', personality:'性格', age:101}", /18到100/],
  [JSON.stringify({name: '阿晴', personality: '字'.repeat(12001)}), /12000/],
  ['[]', /1到24/], [JSON.stringify(Array(25).fill(expected)), /1到24/],
  [' '.repeat(524289), /524288/],
  ['{x:' + '{x:'.repeat(65) + 'null' + '}'.repeat(66), /嵌套层数/],
  ['const role = ' + literal + '; export default other;', /上面定义的角色变量名/],
  [literal + '; probe();', /还有其他内容/],
  ["{name:'阿晴', personality:(probe(), '性格')}", /不支持函数/],
  ["{name:'阿晴', personality:()=>probe()}", /字段值/]
]) assert.throws(() => parse(source), message);
assert.equal(executed, 0);
const protectedData = context.parseRoleData('{__proto__: {polluted: true}, constructor: {prototype: {polluted: true}}}');
assert.equal(Object.getPrototypeOf(protectedData), null);
assert.equal(vm.runInContext('({}).polluted', context), undefined);
assert.equal(parse("{name:'阿晴', personality:'性格', avatar:'javascript:probe()'}")[0].avatar, context.DEFAULT_AVATAR);

// Submit and upload use the same parser and actual save/update transaction.
element('roleCodeEditor').value = "export default { id:'handwritten', name:'阿晴', personality:'成熟坦率', age:28, avatar:'assets/avatars/xuzhixia-portrait.jpg', }";
context.saveRoleCodeDraft();
context.handleRoleCodeSubmit({preventDefault() {}});
assert.equal(context.characters.length, 1);
assert.equal(context.characters[0].id, 'custom_handwritten');
assert.equal(JSON.parse(storage.get('liaotian_custom_chars'))[0].name, '阿晴');
assert.equal(drafts.size, 0);
context.chatHistories.custom_handwritten.push({sender: 'user', text: '我喜欢咖啡'});
context.roleMemories.custom_handwritten.facts.push({text: '喜欢咖啡'});
const history = JSON.stringify(context.chatHistories), memory = JSON.stringify(context.roleMemories);
vm.runInContext("roleCodeEditingId = 'custom_handwritten'", context);
element('roleCodeUpload').files = [{size: 80, text: async () => "module.exports={name:'阿晴·新版', personality:'成熟坦率，认真倾听',}"}];
await context.handleRoleCodeUpload();
assert.equal(context.characters[0].name, '阿晴', '上传先载入编辑框');
assert.match(element('roleCodeEditorStatus').textContent, /检查后点“保存修改”/);
context.handleRoleCodeSubmit({preventDefault() {}});
assert.equal(context.characters[0].id, 'custom_handwritten');
assert.equal(context.characters[0].name, '阿晴·新版');
assert.equal(context.characters[0].avatar, 'assets/avatars/xuzhixia-portrait.jpg');
assert.equal(JSON.stringify(context.chatHistories), history);
assert.equal(JSON.stringify(context.roleMemories), memory);
assert.deepEqual(JSON.parse(storage.get('liaotian_role_memories')), plain(context.roleMemories));

element('roleCodeEditor').value = broken;
context.saveRoleCodeDraft();
context.handleRoleCodeSubmit({preventDefault() {}});
assert.match(element('roleCodeEditorStatus').textContent, /第3行，第2列/);
assert.equal(element('roleCodeEditor').value, broken);
assert.equal(drafts.get('liaotian_role_code_draft'), broken);
assert.deepEqual(element('roleCodeEditor').selection, [broken.indexOf('personality'), broken.indexOf('personality')]);
const before = JSON.stringify(context.characters);
quotaExceeded = true;
assert.throws(() => context.addRolesFromCode(literal), /空间不足/);
assert.equal(JSON.stringify(context.characters), before);
quotaExceeded = false;
assert.throws(() => context.addRolesFromCode("[{id:'same',name:'A',personality:'性格'},{id:'same',name:'B',personality:'性格'}]"), /角色已经存在/);
assert.equal(JSON.stringify(context.characters), before);
console.log('角色代码通过：JSON与手写JS、Markdown、手机标点、多行人设、具体行列提示、程序不执行、上传暂存、保存修改保留记忆及错误回退。');
