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
const info = inspectHumanDocument(parsed.json, parsed.byteLength);
const report = {
  schema: 1,
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
  }
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
