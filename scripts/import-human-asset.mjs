import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseGlb, validateHumanAsset, validateManifest, ALLOWED_LICENSES } from './human-glb-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIERS = new Set(['portrait', 'upper', 'full']);
const CLI_VERSION = '4.5.1';

function fail(message) {
  throw new Error(message);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const out = {optimize: true, customizableBody: false, scale: 1, y: 0, rotationY: 0};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--no-optimize') { out.optimize = false; continue; }
    if (token === '--customizable-body') { out.customizableBody = true; continue; }
    if (!token.startsWith('--')) fail(`未知参数: ${token}`);
    const key = token.slice(2);
    const value = argv[++i];
    if (value === undefined || String(value).startsWith('--')) fail(`${token} 缺少值`);
    out[key] = value;
  }
  return out;
}

function cleanId(value) {
  const id = String(value || '').trim();
  if (!/^[a-z0-9_-]{1,80}$/i.test(id)) fail('id 只能包含字母、数字、下划线和短横线');
  return id;
}

function numeric(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeOptions(raw = {}) {
  const input = path.resolve(String(raw.input || ''));
  if (!raw.input || !fs.existsSync(input) || !fs.statSync(input).isFile()) fail('必须提供存在的 --input GLB 文件');
  const id = cleanId(raw.id);
  const tier = String(raw.tier || '').trim();
  if (!TIERS.has(tier)) fail('--tier 必须是 portrait / upper / full');
  const license = String(raw.license || '').trim().toUpperCase();
  if (!ALLOWED_LICENSES.includes(license)) fail(`--license 只允许 ${ALLOWED_LICENSES.join(' / ')}`);
  const source = String(raw.source || '').trim();
  if (!source) fail('必须提供 --source 记录资产来源');
  return Object.freeze({
    input,
    id,
    tier,
    license,
    source: source.slice(0, 500),
    optimize: raw.optimize !== false,
    customizableBody: Boolean(raw.customizableBody),
    scale: Math.max(0.05, Math.min(20, numeric(raw.scale, 1))),
    y: Math.max(-10, Math.min(10, numeric(raw.y, 0))),
    rotationY: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, numeric(raw.rotationY, 0)))
  });
}

function runOptimizer(input, output) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = [
    'exec', '--yes', `--package=@gltf-transform/cli@${CLI_VERSION}`, '--',
    'gltf-transform', 'optimize', input, output,
    '--compress', 'meshopt',
    '--texture-compress', 'webp'
  ];
  const result = spawnSync(npm, args, {stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`glTF Transform 优化失败，退出码 ${result.status}`);
}

export function inspectFile(file, options) {
  const bytes = fs.readFileSync(file);
  const parsed = parseGlb(bytes);
  const result = validateHumanAsset({
    json: parsed.json,
    byteLength: parsed.byteLength,
    tier: options.tier,
    license: options.license,
    customizableBody: options.customizableBody
  });
  return Object.freeze({bytes, parsed, result});
}

export function manifestEntry(options, byteLength, info) {
  return Object.freeze({
    url: `assets/humans/${options.id}-${options.tier}.glb`,
    license: options.license,
    source: options.source,
    customizableBody: options.customizableBody,
    scale: options.scale,
    y: options.y,
    rotationY: options.rotationY,
    framing: options.tier === 'portrait' ? 'portrait' : 'full',
    minMorphTargets: 52,
    bytes: byteLength,
    arkitMorphs: info.arkitCount,
    bodyMorphs: info.bodyMorphCount,
    compression: options.optimize ? `gltf-transform@${CLI_VERSION}:meshopt+webp` : 'source'
  });
}

export function writeManifest(options, entry, manifestPath = path.join(root, 'assets/humans/manifest.json')) {
  const current = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  current.version = 1;
  current.characters ||= {};
  current.characters[options.id] ||= {};
  current.characters[options.id][options.tier] = entry;
  const orderedCharacters = Object.fromEntries(
    Object.keys(current.characters).sort().map(id => [
      id,
      Object.fromEntries(['portrait', 'upper', 'full'].filter(tier => current.characters[id]?.[tier]).map(tier => [tier, current.characters[id][tier]]))
    ])
  );
  current.characters = orderedCharacters;
  const checked = validateManifest(current);
  if (!checked.ok) fail(`manifest 更新后不合格:\n${checked.errors.join('\n')}`);
  fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2) + '\n');
  return current;
}

export function importHumanAsset(rawOptions) {
  const options = normalizeOptions(rawOptions);
  const humansDir = path.join(root, 'assets/humans');
  fs.mkdirSync(humansDir, {recursive: true});
  const output = path.join(humansDir, `${options.id}-${options.tier}.glb`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'liaotian-human-'));
  const candidate = path.join(tempDir, 'candidate.glb');
  try {
    if (options.optimize) runOptimizer(options.input, candidate);
    else fs.copyFileSync(options.input, candidate);
    const inspected = inspectFile(candidate, options);
    if (!inspected.result.ok) fail(`真人资产验收失败:\n${inspected.result.errors.join('\n')}`);
    fs.copyFileSync(candidate, output);
    const entry = manifestEntry(options, inspected.parsed.byteLength, inspected.result.info);
    writeManifest(options, entry);
    return Object.freeze({output, entry, info: inspected.result.info});
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }
}

function usage() {
  return [
    '用法:',
    'node scripts/import-human-asset.mjs --input avatar.glb --id nuannuan --tier full --license CC0 --source "来源说明" --customizable-body',
    '',
    '默认先用 glTF Transform 4.5.1 做 Meshopt + WebP 优化，再执行正式资产合同验收。',
    '只有验收通过才会写入 assets/humans/ 和 manifest.json。'
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs();
    if (args.help || args.h) {
      console.log(usage());
    } else {
      const result = importHumanAsset(args);
      console.log(`真人资产已导入: ${path.relative(root, result.output)}`);
      console.log(`ARKit ${result.info.arkitCount}/52，身体 morph ${result.info.bodyMorphCount}，${(result.info.byteLength / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.error(error?.message || error);
    console.error('\n' + usage());
    process.exit(1);
  }
}
