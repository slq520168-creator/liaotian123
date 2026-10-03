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
  functionSource('async function requestCharacterReply(', '\nfunction selectFormAvatar(')
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
  messagesDiv: {querySelector: () => null}
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
  assert.equal(call.options.headers['Content-Type'], 'text/plain;charset=UTF-8');
  assert.equal(call.options.credentials, 'omit');
  assert.deepEqual(call.body.messages, messages);
  assert.equal(call.body.attempt, attempt);
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
console.log('聊天传输通过：完成后不等断连、迟到错误、UTF-8分块、无内容重试、部分回复保护、JSON兼容与无预检发送。');
