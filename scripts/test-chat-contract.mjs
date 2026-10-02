import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real handler against controlled upstreams. No network or account needed.
const source = fs.readFileSync(new URL('../supabase/functions/role-chat-fast/index.ts', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, '');
let handler;
const requests = [];
const sandbox = {
  Response, Request, Headers, ReadableStream, TextEncoder, TextDecoder,
  AbortController, setTimeout, clearTimeout,
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
async function post(body) {
  return handler(new Request('https://example.test/role-chat-fast', {method: 'POST', body: JSON.stringify(body)}));
}
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
await post({messages: [{role: 'system', content: system}, {role: 'user', content: user}]}).then(r => r.text());
assert(requests.filter(r => Array.isArray(r.messages)).every(r => r.max_tokens === 180 && r.messages[0].content.length === 6000 && r.messages.at(-1).content.length === 1600));
requests.length = 0;
const rejected = await post({client: 'liaotian123', messages: [{role: 'system', content: '正常人设'}, {role: 'user', content: '字'.repeat(30001)}]});
assert.equal(rejected.status, 400);
assert.equal(requests.length, 0);
console.log('聊天契约通过：长文末尾、人设末尾、上下文预算、旧入口兼容、超限拒绝。');
