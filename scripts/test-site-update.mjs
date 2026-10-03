import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8')).version;
assert(source.includes("const SITE_VERSION = '" + version + "'"));
for (const file of ['app.js', 'role-code.js']) assert(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes(file + '?v=' + version));
const functions = source.slice(source.indexOf('function restoreUpdateComposer()'), source.indexOf('function warmReplyConnection()'));
const storage = new Map(), elements = new Map(), navigations = [];
let quota = false;
const context = {
  URL, AbortController, Date, setTimeout, clearTimeout,
  SITE_VERSION: version, UPDATE_COMPOSER_KEY: 'liaotian_update_composer',
  ROLE_CODE_DRAFT_KEY: 'liaotian_role_code_draft', ROLE_CODE_TARGET_KEY: 'liaotian_role_code_target', roleCodeEditingId: 'custom_writer',
  lastSiteVersionCheck: 0, checkingSiteVersion: false, navigator: {onLine: true},
  CHAT_LIMITS: {message: 30000}, activeCharacterId: 'custom_writer', pendingReplies: new Map(),
  userInput: {value: '尚未发送的消息'}, updateComposer() {},
  byId: id => elements.get(id),
  sessionStorage: {getItem: key => storage.get(key), setItem(key, value) {if (quota) throw new Error('quota'); storage.set(key, value);}, removeItem: key => storage.delete(key)},
  location: {href: 'https://example.test/?v=old', replace: url => navigations.push(url)},
  document: {
    createElement() {return {children: [], listeners: {}, setAttribute() {}, append(...children) {this.children.push(...children);}, addEventListener(type, callback) {this.listeners[type] = callback;}};},
    querySelector() {return {prepend(element) {elements.set(element.id, element);}};}
  }
};
elements.set('roleCodeModalOverlay', {classList: {contains: () => true}});
elements.set('roleCodeEditor', {value: "{姓名:'阿晴',性格:'手写草稿'}"});
vm.createContext(context); vm.runInContext(functions, context);
const calls = [];
async function check(next) {
  context.lastSiteVersionCheck = 0;
  context.fetch = async (url, options) => {calls.push({url, options}); return new Response(JSON.stringify({version: next}), {headers: {'content-type':'application/json'}});};
  await context.checkSiteVersion();
}
await check(version);
assert(!elements.has('siteUpdateNotice'), '当前版本不打扰聊天');
await check('https://untrusted.test/');
assert(!elements.has('siteUpdateNotice'), '版本字段不能变成外站导航');
await check('next_release');
const notice = elements.get('siteUpdateNotice'), button = notice.children[1];
assert(notice);
assert(calls.every(call => call.options.cache === 'no-store' && call.options.credentials === 'omit' && !call.options.body));
context.pendingReplies.set('custom_writer', {}); button.listeners.click();
assert.equal(navigations.length, 0, '回复进行中不能更新');
context.pendingReplies.clear(); quota = true; button.listeners.click();
assert.equal(navigations.length, 0, '草稿无法保存时不能丢掉输入');
quota = false; button.listeners.click();
assert.equal(navigations[0], 'https://example.test/?v=next_release');
assert.equal(storage.get('liaotian_role_code_draft'), elements.get('roleCodeEditor').value);
assert.equal(storage.get('liaotian_role_code_target'), 'custom_writer');
context.userInput.value = ''; context.restoreUpdateComposer();
assert.equal(context.userInput.value, '尚未发送的消息');
assert(!storage.has('liaotian_update_composer'));
console.log('页面更新通过：版本一致、不跳外站、回复中保护、空间不足留输入、更新前后保留聊天输入与角色代码草稿。');
