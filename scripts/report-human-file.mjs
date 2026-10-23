import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseGlb, inspectHumanDocument } from './human-glb-contract.mjs';

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/report-human-file.mjs <file.glb>');
  process.exit(2);
}
const bytes = fs.readFileSync(file);
const parsed = parseGlb(bytes);
const json = parsed.json || {};
const info = inspectHumanDocument(json, parsed.byteLength);
const nodes = Array.isArray(json.nodes) ? json.nodes : [];
const meshes = Array.isArray(json.meshes) ? json.meshes : [];
const skins = Array.isArray(json.skins) ? json.skins : [];
const nodeName = index => nodes[index]?.name || `#${index}`;

const skeleton = skins.map((skin, index) => ({
  index,
  name: skin?.name || `skin-${index}`,
  skeletonRoot: Number.isInteger(skin?.skeleton) ? nodeName(skin.skeleton) : null,
  jointCount: Array.isArray(skin?.joints) ? skin.joints.length : 0,
  joints: (skin?.joints || []).map(joint => nodeName(joint))
}));

const nodeBindings = nodes.flatMap((node, index) => {
  if (!Number.isInteger(node?.mesh)) return [];
  const mesh = meshes[node.mesh] || {};
  return [{
    nodeIndex: index,
    node: node?.name || `#${index}`,
    meshIndex: node.mesh,
    mesh: mesh?.name || `mesh-${node.mesh}`,
    skinIndex: Number.isInteger(node?.skin) ? node.skin : null,
    skin: Number.isInteger(node?.skin) ? (skins[node.skin]?.name || `skin-${node.skin}`) : null,
    primitiveCount: Array.isArray(mesh?.primitives) ? mesh.primitives.length : 0,
    morphTargetNames: Array.isArray(mesh?.extras?.targetNames) ? mesh.extras.targetNames : []
  }];
});

const report = {
  schema: 2,
  source: {
    repository: process.env.HUMAN_SOURCE_REPO || '',
    commit: process.env.HUMAN_SOURCE_COMMIT || '',
    path: process.env.HUMAN_SOURCE_PATH || '',
    license: process.env.HUMAN_SOURCE_LICENSE || ''
  },
  optimizer: {
    package: '@gltf-transform/cli',
    version: process.env.GLTF_TRANSFORM_VERSION || '',
    compression: process.env.HUMAN_COMPRESSION || '',
    textureCompression: process.env.HUMAN_TEXTURE_COMPRESSION || '',
    textureSize: Number(process.env.HUMAN_TEXTURE_SIZE || 0) || null
  },
  file: {
    name: path.basename(file),
    bytes: bytes.length,
    mebibytes: Number((bytes.length / 1024 / 1024).toFixed(2)),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  },
  gltf: {
    extensionsUsed: json.extensionsUsed || [],
    extensionsRequired: json.extensionsRequired || [],
    nodeCount: nodes.length,
    meshCount: meshes.length,
    skinCount: skins.length
  },
  inspection: {
    meshes: info.meshes,
    skins: info.skins,
    animations: info.animations,
    morphPrimitiveCount: info.morphPrimitiveCount,
    targetNameCount: info.targetNames.length,
    arkitCount: info.arkitCount,
    missingArkit: info.missingArkit,
    bodyMorphCount: info.bodyMorphCount,
    bodyMorphs: info.bodyMorphs,
    targetNames: info.targetNames
  },
  skeleton,
  nodeBindings
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
