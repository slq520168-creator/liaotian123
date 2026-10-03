import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real handler against controlled upstreams. No network or account needed.
const source = fs.readFileSync(process.env.LIAOTIAN_CHAT_SOURCE || new URL('../supabase/functions/role-chat-fast/index.ts', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, '');
let handler;
const requests = [];
const sandbox = {
  Response, Request, Headers, ReadableStream, TextEncoder, TextDecoder,
  AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
  console: { log() {}, warn() {} },
  Deno: { serve(fn) { handler = fn; } },
  fetch: async (url, options) => {
    requests.push({url, ...JSON.parse(options.body)});
    return new Response(JSON.stringify({choices: [{message: {content: '收到完整内容。'}, finish_reason: 'stop'}]}), {headers: {'content-type': 'application/json'}});
  }
};
vm.runInNewContext(stripTypeScriptTypes(source), sandbox);
const user = '长文正文。'.repeat(4900) + '全文尾部标记';
const system = '人设细节。'.repeat(3500) + '人设尾部标记';
const history = Array.from({length: 19}, (_, i) => ({role: i % 2 ? 'assistant' : 'user', content: '往事'.repeat(1500)}));
async function post(body, contentType = 'text/plain;charset=UTF-8') {
  return handler(new Request('https://example.test/role-chat-fast', {method: 'POST', headers: {'content-type': contentType}, body: JSON.stringify(body)}));
}
const health = await handler(new Request('https://example.test/role-chat-fast'));
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), {ok: true});
assert.equal(health.headers.get('access-control-allow-origin'), '*');
assert.equal(health.headers.get('cache-control'), 'no-store');
assert.equal(requests.length, 0, '连接检查不得请求模型');
const preflight = await handler(new Request('https://example.test/role-chat-fast', {method: 'OPTIONS'}));
assert.equal(preflight.status, 204);
assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
assert.equal((await handler(new Request('https://example.test/role-chat-fast', {method: 'DELETE'}))).status, 405);
const result = await post({client: 'liaotian123', stream: true, max_tokens: 6000, messages: [{role: 'system', content: system}, ...history, {role: 'user', content: user}]});
const stream = await result.text();
assert.equal(result.status, 200);
assert.match(stream, /"done":true/);
assert.equal(requests.length, 4);
for (const request of requests) {
  assert.equal(request.max_tokens, 6000);
  assert.equal(request.messages[0].content, system);
  assert.equal(request.messages.at(-1).content, user);
  assert(request.messages.slice(1, -1).reduce((n, m) => n + m.content.length, 0) <= 12000);
}
requests.length = 0;
await post({messages: [{role: 'system', content: system}, {role: 'user', content: user}]}, 'application/json').then(r => r.text());
assert(requests.filter(r => Array.isArray(r.messages)).every(r => r.max_tokens === 180 && r.messages[0].content.length === 6000 && r.messages.at(-1).content.length === 1600));
requests.length = 0;
const rejected = await post({client: 'liaotian123', messages: [{role: 'system', content: '正常人设'}, {role: 'user', content: '字'.repeat(30001)}]});
assert.equal(rejected.status, 400);
assert.equal(requests.length, 0);
// 上游在完成标记之后仍不关连接，甚至取消清理也挂起：转发必须正常结束。
sandbox.fetch = async () => new Response(new ReadableStream({
  start(controller) {controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"完整真实回复"}}]}\n\ndata: [DONE]\n\n'));},
  cancel() {return new Promise(() => {});}
}), {headers: {'content-type': 'text/event-stream'}});
let deadline;
try {
  const completed = await Promise.race([
    post({client: 'liaotian123', stream: true, messages: [{role: 'system', content: '正常人设'}, {role: 'user', content: '下午好'}]}).then(r => r.text()),
    new Promise((_, reject) => {deadline = setTimeout(() => reject(new Error('完成后的连接清理阻塞了回复')), 1000);})
  ]);
  assert.match(completed, /完整真实回复/);
  assert.match(completed, /"done":true/);
  assert.doesNotMatch(completed, /"error"/);
} finally {clearTimeout(deadline);}
// The fastest provider emits a token then loses the connection. A slower complete
// response must win, without exposing or storing the incomplete prefix.
const diagnostics = [];
sandbox.console.log = (...args) => diagnostics.push(args.join(' '));
sandbox.console.warn = (...args) => diagnostics.push(args.join(' '));
const signals = [];
sandbox.fetch = async (url, options) => {
  signals.push(options.signal);
  if (url.includes('cehpoint')) return new Response('data: {"choices":[{"delta":{"content":"不能保存的半段"}}]}\n\n', {headers: {'content-type': 'text/event-stream'}});
  if (url.includes('vireonix')) {
    await new Promise(resolve => setTimeout(resolve, 8));
    return new Response(JSON.stringify({choices: [{message: {content: '慢一点但完整的真实答复'}, finish_reason: 'stop'}]}), {headers: {'content-type': 'application/json'}});
  }
  return new Response('{"error":"busy"}', {status: 429});
};
const failover = await post({client: 'liaotian123', stream: true, messages: [{role: 'system', content: '私密人设测试标记'}, {role: 'user', content: '普通测试消息标记'}]}).then(r => r.text());
assert.match(failover, /慢一点但完整的真实答复/);
assert.match(failover, /"done":true/);
assert.doesNotMatch(failover, /不能保存的半段|"error"/);
assert(signals.every(signal => signal.aborted), '回复完成后取消其他请求');
assert(diagnostics.some(line => line.startsWith('role_chat_complete ')));
assert(diagnostics.every(line => !/私密人设测试标记|普通测试消息标记|慢一点但完整的真实答复/.test(line)), '诊断不包含人设或聊天正文');

// An upstream boundary response is real model content, not a transport failure.
sandbox.fetch = async () => new Response(JSON.stringify({choices: [{message: {content: '我不能替你决定，但可以陪你认真讨论相处边界。'}, finish_reason: 'stop'}]}), {headers: {'content-type': 'application/json'}});
const boundary = await post({client: 'liaotian123', stream: true, messages: [{role: 'system', content: '自然聊天'}, {role: 'user', content: '我们都是成年人，聊聊恋爱中的边界。'}]}).then(r => r.text());
assert.match(boundary, /我不能替你决定/);
assert.match(boundary, /"done":true/);

// All paths fail: emit a retryable error only, with safe provider diagnostics.
diagnostics.length = 0;
sandbox.fetch = async (url) => url.includes('cehpoint') ? new Response('data: {"choices":[{"delta":{"content":"半句"}}]}\n\n', {headers: {'content-type': 'text/event-stream'}}) : new Response('busy', {status: 503});
const unavailable = await post({client: 'liaotian123', stream: true, messages: [{role: 'system', content: '私密人设测试标记'}, {role: 'user', content: '普通测试消息标记'}]}).then(r => r.text());
assert.match(unavailable, /"error":"reply_unavailable"/);
assert.doesNotMatch(unavailable, /"delta"|"done":true/);
assert(diagnostics.some(line => /role_chat_failed/.test(line) && /stream_incomplete/.test(line) && /http_503/.test(line)));
assert(diagnostics.every(line => !/私密人设测试标记|普通测试消息标记|半句/.test(line)));
console.log('聊天契约通过：容量、旧入口、连接检查、完成后结束、首段断流切换完整线路、真实边界答复、全部失败诊断不含聊天正文。');
