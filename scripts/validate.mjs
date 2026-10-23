import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseGlb, validateHumanAsset, validateManifest } from './human-glb-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
function run(args) {
  const r = spawnSync(process.execPath, args, {stdio: 'inherit'});
  if (r.status !== 0) process.exit(r.status || 1);
}
for (const file of [
  'config/app.js', 'roles.js', 'memory.js', 'role-code.js', 'role-experience.js',
  'role-presence.js', 'role-visual-recipe.js', 'role-face-rig.js', 'role-render-loop.js', 'role-body-rig.js', 'role-appearance-rig.js',
  'role-human-manifest.js', 'role-asset-policy.js', 'role-human-renderer.js', 'role-render-recipe-bridge.js', 'role-voice-stage.js',
  'role-code-compat.js', 'role-persistence.js', 'role-builder.js', 'app.js'
]) run(['--check', file]);
for (const file of ['roles/new-role.role.json', 'roles/preset-roles.json']) JSON.parse(fs.readFileSync(file, 'utf8'));

const humanManifestPath = path.join(root, 'assets/humans/manifest.json');
const humanManifest = JSON.parse(fs.readFileSync(humanManifestPath, 'utf8'));
const manifestResult = validateManifest(humanManifest);
if (!manifestResult.ok) throw new Error(`真人资产 manifest 不合格:\n${manifestResult.errors.join('\n')}`);
for (const [id, tiers] of Object.entries(humanManifest.characters || {})) {
  for (const [tier, entry] of Object.entries(tiers || {})) {
    const assetPath = path.join(root, entry.url);
    if (!fs.existsSync(assetPath)) throw new Error(`${id}/${tier}: 缺少正式真人资产 ${entry.url}`);
    const bytes = fs.readFileSync(assetPath);
    const parsed = parseGlb(bytes);
    const result = validateHumanAsset({json: parsed.json, byteLength: parsed.byteLength, tier, license: entry.license, customizableBody: Boolean(entry.customizableBody)});
    if (!result.ok) throw new Error(`${id}/${tier}: 真人资产不合格:\n${result.errors.join('\n')}`);
  }
}
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
run(['scripts/test-site-update.mjs']);
console.log('检查通过：网页脚本、3D真人资产合同、运行时manifest、真实外观rig、角色JSON、静态资源、聊天契约、角色代码与站点更新。');
