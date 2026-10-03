import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
function run(args) {
  const r = spawnSync(process.execPath, args, {stdio: 'inherit'});
  if (r.status !== 0) process.exit(r.status || 1);
}
for (const file of ['config/app.js', 'roles.js', 'memory.js', 'role-code.js', 'app.js']) run(['--check', file]);
for (const file of ['roles/new-role.role.json', 'roles/preset-roles.json']) JSON.parse(fs.readFileSync(file, 'utf8'));
function checkRef(file, target) {
  if (!target || /^(?:https?:|data:|mailto:|#)/.test(target)) return;
  const clean = target.split(/[?#]/)[0];
  const resolved = path.resolve(path.dirname(path.join(root, file)), clean);
  if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) throw new Error(`${file}: missing local reference ${target}`);
}
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), {withFileTypes:true}).flatMap(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
for (const file of walk('.')) {
  if (!/\.(?:md|html)$/.test(file)) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.html')) for (const match of source.matchAll(/(?:src|href)="([^"]+)"/g)) checkRef(file, match[1]);
  else for (const match of source.matchAll(/\]\(([^)\s]+)\)/g)) checkRef(file, match[1]);
}
run(['--disable-warning=ExperimentalWarning', 'scripts/test-chat-contract.mjs']);
run(['scripts/test-chat-transport.mjs']);
run(['scripts/test-role-code.mjs']);
console.log('检查通过：网页脚本、角色JSON、文档及静态资源引用、聊天容量与传输契约、角色代码解析和保存。');
