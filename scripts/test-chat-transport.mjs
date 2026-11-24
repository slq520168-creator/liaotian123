import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the actual browser request and reader against controlled network failures.
const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function functionSource(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  assert(first >= 0 && last > first);
  return source.slice(first, last);
}
const functions = [
  functionSource('function warmReplyConnection()', '\nfunction setupEventListeners('),
  functionSource('function formatCharacterReply(', '\nfunction appendMessageToDOM('),
  functionSource('function replyGraphemes(', '\nfunction selectFormAvatar(')
].join('\n');
const char = {id: 'custom_transport', name: '测试角色'};
const messages = [{role: 'system', content: '角色与记忆'}, {role: 'user', content: '下午好'}];
const context = {
  Response, TextDecoder, Uint8Array, AbortController, Error, TypeError,
  setTimeout, clearTimeout, navigator: {onLine: true},
  CHAT_API_URL: 'https://example.test/role-chat-fast', CHAT_LIMITS: {reply: 30000},
  REQUEST_TIMEOUT_MS: 40000, LONG_REQUEST_TIMEOUT_MS: 100000,
  characters: [char], activeCharacterId: char.id, replyLength: 'auto', lastConnectionWarmAt: 0,
  pendingReplies: new Map(), replyErrors: new Map(), previousVisits: {},
  chatHistories: {[char.id]: [{sender: 'user', text: '下午好'}]},
  buildRequestMessages: () => messages,
  renderMessages() {}, updateComposer() {}, saveDataToStorage() {},
  makeId: () => 'reply_id', getCurrentTime: () => '15:00',
  messagesDiv: {querySelector: () => null},
  window: {LIAOTIAN_CONFIG: {chatApiKind: 'role-free'}}
};
vm.createContext(context);
vm.runInContext(functions, context);
function sse(payload, {open = false, stuckCancel = false, splitBytes = false} = {}) {
  const bytes = new TextEncoder().encode(payload);
  return new Response(new ReadableStream({
    start(controller) {
      if (splitBytes) for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      else controller.enqueue(bytes);
      if (!open) controller.close();
    },
    cancel() {if (stuckCancel) return new Promise(() => {});}
  }), {headers: {'content-type': 'text/event-stream'}});
}
async function within(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('完成标记没有结束等待')), 1000);})]);
  } finally {clearTimeout(timer);}
}
const complete = 'data: {"delta":"中文🙂回复"}\n\ndata: {"done":true}\n\n';
let chunks = '';
assert.equal(await within(context.readModelReply(sse(complete, {open: true, stuckCancel: true}), delta => {chunks += delta;})), '中文🙂回复');
assert.equal(chunks, '中文🙂回复');
assert.equal(await context.readModelReply(sse(complete + 'data: {"error":"late_close_error"}\n\n'), () => {}), '中文🙂回复');
assert.equal(await context.readModelReply(sse(complete, {splitBytes: true}), () => {}), '中文🙂回复');
await assert.rejects(context.readModelReply(sse('data: {"delta":"部分回复"}\n\n'), () => {}), /回复中断/);
await assert.rejects(context.readModelReply(sse('data: {"done":true}\n\n'), () => {}), /回复中断/);
await assert.rejects(context.readModelReply(sse('data: {"delta":"部分回复"}\n\ndata: {"error":"reply_unavailable"}\n\n'), () => {}), /回复中断/);
assert.equal(await context.readModelReply(new Response(JSON.stringify({text: 'JSON兼容回复'}), {headers: {'content-type': 'application/json'}}), () => {}), 'JSON兼容回复');

const calls = [];
context.fetch = async (url, options) => {
  calls.push({url, options, body: options.body && JSON.parse(options.body)});
  return calls.length === 1 ? sse('data: {"error":"reply_unavailable"}\n\n') : sse('data: ' + JSON.stringify({delta: '真实回复\n\n第二行'}) + '\n\ndata: {"done":true}\n\n');
};
await context.requestCharacterReply(char);
assert.equal(calls.length, 2, '无内容的服务故障自动重试一次');
for (const [attempt, call] of calls.entries()) {
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers['Content-Type'], 'application/json');
  assert.equal(call.options.headers['X-Client-Key'], undefined);
  assert.equal(call.options.headers.Authorization, undefined);
  assert.equal(call.options.credentials, 'omit');
  assert.deepEqual(call.body.messages, messages);
  assert.equal(call.body.attempt, undefined);
  assert.equal(typeof call.body.max_tokens, 'number');
}
assert.equal(context.chatHistories[char.id].length, 2, '重试不重复插入玩家消息');
assert.equal(context.chatHistories[char.id][1].text, '真实回复\n第二行');
assert.equal(context.replyErrors.size, 0);
assert.equal(context.pendingReplies.size, 0);

calls.length = 0;
context.chatHistories[char.id] = [{sender: 'user', text: '下午好'}];
context.fetch = async (url, options) => {calls.push({url, options}); return sse('data: {"delta":"真实部分"}\n\ndata: {"error":"reply_unavailable"}\n\n');};
await context.requestCharacterReply(char);
assert.equal(calls.length, 1);
assert.equal(context.chatHistories[char.id].length, 1, '中断内容不得当作完整答复保存');
assert.equal(context.replyErrors.get(char.id).partial, '真实部分');
assert.equal(context.replyErrors.get(char.id).message, '回复中断，请重试。');
assert.equal(context.pendingReplies.size, 0);

calls.length = 0;
context.fetch = async (url, options) => {calls.push({url, options}); return new Response('{"ok":true}');};
context.warmReplyConnection();
assert.equal(calls.length, 1);
assert.equal(calls[0].options.method, 'GET');
assert.equal(calls[0].options.body, undefined, '连接检查不发送玩家资料');
assert.equal(calls[0].options.headers, undefined);
context.window.LIAOTIAN_CONFIG = {chatApiKind: 'role-free'};
calls.length = 0;
context.chatHistories[char.id] = [{sender: 'user', text: '下午好'}];
context.fetch = async (url, options) => {
  calls.push({url, options, body: options.body && JSON.parse(options.body)});
  return Response.json({choices: [{message: {role: 'assistant', content: '免费接口实际回复'}}]});
};
await context.requestCharacterReply(char);
assert.equal(calls.length, 1);
assert.equal(calls[0].options.headers.Authorization, undefined);
assert.equal(calls[0].options.headers.apikey, undefined);
assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
assert.equal(calls[0].options.headers['X-Client-Key'], undefined);
assert.equal(calls[0].body.kind, undefined);
assert.deepEqual(calls[0].body.messages, messages);
assert.equal(context.chatHistories[char.id][1].text, '免费接口实际回复');
assert.equal(context.replyErrors.size, 0);
for (const status of [402, 429]) {
  calls.length = 0;
  context.chatHistories[char.id] = [{sender: 'user', text: '下午好'}];
  context.fetch = async (url, options) => {
    calls.push({url, options});
    return Response.json({error: 'free_provider_unavailable'}, {status, headers: {'retry-after': '90'}});
  };
  await context.requestCharacterReply(char);
  assert.equal(calls.length, 1, '免费额度和冷却错误不得自动重试或切换服务');
  assert.equal(context.chatHistories[char.id].length, 1);
  assert.match(context.replyErrors.get(char.id).message, status === 429 ? /90 秒/ : /不会调用收费接口/);
}
calls.length = 0;
context.warmReplyConnection();
assert.equal(calls.length, 0, '免费服务不使用不支持的 GET 预热');
context.fetch = async () => Response.json({error:'model_unavailable'},{status:503});
await context.requestCharacterReply(char);
assert.equal(context.chatHistories[char.id].length,1,'模型不可用时不保存虚假回复');
assert.match(context.replyErrors.get(char.id).message,/暂时没连上/);
await assert.rejects(context.readModelReply(Response.json({choices: []}), () => {}), /没有收到回复/);
// Exercise real presentation logic without network or a browser DOM.
const full = '你好吗？👩‍👩‍👧‍👦 好呀。';
assert.equal(context.replyGraphemes(full).join(''), full);
assert(context.replyGraphemes(full).includes('👩‍👩‍👧‍👦'), 'ZWJ emoji stays intact');
const displayed = [];
const bubble = {set textContent(value) {displayed.push(value);}};
context.document = {hidden:false};
context.messagesContainer = {scrollHeight:100,scrollTop:0,clientHeight:100};
context.messagesDiv.querySelector = () => bubble;
context.scrollToBottom = () => {};
const job = {controller:new AbortController(),text:'',finalMessageId:'test'};
context.pendingReplies.set(char.id,job);
await context.revealCharacterReply(char,job,full);
assert(displayed.length > 2 && displayed[0] !== full, 'reply must display progressively');
assert.equal(displayed.at(-1),full);
displayed.length=0;
context.window.matchMedia = () => ({matches:true});
await context.revealCharacterReply(char,job,full);
assert.equal(displayed.length,0,'reduced motion skips animation');
delete context.window.matchMedia;
context.activeCharacterId='another';
await context.revealCharacterReply(char,job,full);
assert.equal(displayed.length,0,'other character is never updated');
context.pendingReplies.delete(char.id);
console.log('聊天传输通过：真实JSON接口、流式兼容、渐进呈现、完整表情、冷却不重试、失败无虚假回复。');
