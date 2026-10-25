import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const configSource = fs.readFileSync(new URL('../config/app.js', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('./build-cloudflare.mjs', import.meta.url), 'utf8');
const voiceSource = fs.readFileSync(new URL('../role-voice-stage.js', import.meta.url), 'utf8');
const versionMatch = configSource.match(/const version='([^']+)'/);
assert(versionMatch, 'config/app.js 必须提供唯一生产版本');
const version = versionMatch[1];
assert(buildSource.includes("const buildVersionMatch=configSource.match"), 'Cloudflare 构建必须从 config/app.js 读取版本');
assert(buildSource.includes("writeFile(new URL('version.json',out)"), '部署版 version.json 必须由生产版本生成');
assert(buildSource.includes('const SITE_VERSION ='), '部署版 app.js 必须同步 SITE_VERSION');
assert(buildSource.includes("const indexOut=new URL('index.html',out)"), '部署版 index.html 必须统一静态资源版本');
assert(!configSource.includes('#siteUpdateNotice,.site-update'), '生产配置不能隐藏更新提示');
assert(!voiceSource.includes("querySelectorAll('#siteUpdateNotice,.site-update')"), '语音模块不能删除更新提示');

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
console.log('页面更新通过：单一生产版本、提示可见、不跳外站、回复中保护、更新前后保留输入与角色代码草稿。');
