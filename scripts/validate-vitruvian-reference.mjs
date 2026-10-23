import fs from 'node:fs';
import { parseGlb, validateHumanAsset } from './human-glb-contract.mjs';

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/validate-vitruvian-reference.mjs <file.glb>');
  process.exit(2);
}
const bytes = fs.readFileSync(file);
const parsed = parseGlb(bytes);
const json = parsed.json || {};
const result = validateHumanAsset({json, byteLength: parsed.byteLength, tier:'full', license:'CC0', customizableBody:true});
const names = new Set((json.meshes || []).flatMap(mesh => mesh?.extras?.targetNames || []).map(String));
const visemes = ['viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk','viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U'];
const missingVisemes = visemes.filter(name => !names.has(name));
const jawMorphs = ['jawForward','jawLeft','jawOpen','jawRight'];
const missingJawMorphs = jawMorphs.filter(name => !names.has(name));
const nodes = json.nodes || [];
const nodeNames = new Set(nodes.map(node => String(node?.name || '')));
const requiredBones = ['Hips','LeftUpLeg','LeftLeg','RightUpLeg','RightLeg','Spine','Spine1','Spine2','LeftShoulder','RightShoulder','Neck','Head'];
const missingBones = requiredBones.filter(name => !nodeNames.has(name));
const errors = [...result.errors];
if (result.info.bodyMorphCount < 8) errors.push(`精选身体 morph 不完整: ${result.info.bodyMorphCount}/8`);
if (missingVisemes.length) errors.push(`原生 viseme 缺失: ${missingVisemes.join(', ')}`);
if (missingJawMorphs.length) errors.push(`下颌 morph 缺失: ${missingJawMorphs.join(', ')}`);
if (missingBones.length) errors.push(`标准骨骼名缺失: ${missingBones.join(', ')}`);
if (result.info.animations !== 0) errors.push(`结构基准禁止内置动画: ${result.info.animations}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Vitruvian 基准通过：${(parsed.byteLength/1024/1024).toFixed(2)}MB，ARKit ${result.info.arkitCount}/52，身体 ${result.info.bodyMorphCount}，viseme ${visemes.length}，jaw morph ${jawMorphs.length}，skins ${result.info.skins}。`);
