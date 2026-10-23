import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARKIT_52, BODY_CHANNELS } from './human-glb-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = path.join(root, 'scripts/vitruvian-morph-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const errors = [];
const DIRECT = ['viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk','viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U'];

function validateGroup(name, group, expected = null) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    errors.push(`${name} 必须是对象`);
    return;
  }
  if (expected) {
    for (const key of expected) if (!Object.hasOwn(group, key)) errors.push(`${name} 缺少 ${key}`);
    for (const key of Object.keys(group)) if (!expected.includes(key)) errors.push(`${name} 出现未知通道 ${key}`);
  }
  for (const [target, sources] of Object.entries(group)) {
    if (!Array.isArray(sources) || !sources.length) {
      errors.push(`${name}.${target} 必须至少有一个源 morph`);
      continue;
    }
    for (const source of sources) {
      if (!['L2','L3'].includes(source?.level)) errors.push(`${name}.${target} level 非法`);
      if (!/^[A-Za-z0-9_]+$/.test(String(source?.morph || ''))) errors.push(`${name}.${target} morph 名非法`);
      if (!Number.isFinite(Number(source?.weight)) || Number(source.weight) === 0 || Math.abs(Number(source.weight)) > 2) errors.push(`${name}.${target} weight 非法`);
    }
  }
}

if (map.version !== 1) errors.push('map.version 必须为 1');
validateGroup('arkit', map.arkit, ARKIT_52);
const productionBody = Object.keys(map.body || {});
if (productionBody.length < 5) errors.push(`身体通道不足: ${productionBody.length}/至少5`);
for (const name of productionBody) if (!BODY_CHANNELS.includes(name)) errors.push(`未知身体通道 ${name}`);
validateGroup('body', map.body);
validateGroup('visemes', map.visemes, DIRECT);

const allSources = new Map();
for (const group of [map.body, map.arkit, map.visemes]) {
  for (const sources of Object.values(group || {})) {
    for (const source of sources || []) allSources.set(`${source.level}/${source.morph}`, source);
  }
}
if (allSources.size < 40) errors.push(`源 morph 异常偏少: ${allSources.size}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
if (process.argv.includes('--sources')) {
  process.stdout.write([...allSources.keys()].sort().join('\n') + '\n');
} else {
  console.log(`Vitruvian morph map 通过：ARKit ${ARKIT_52.length}/52，身体 ${productionBody.length}，viseme ${DIRECT.length}，源 morph ${allSources.size}。`);
}
