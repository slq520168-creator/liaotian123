#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function readGlbJson(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${file}: not GLB`);
  let off = 12;
  while (off + 8 <= b.length) {
    const len = b.readUInt32LE(off);
    const type = b.readUInt32LE(off + 4);
    off += 8;
    if (type === 0x4E4F534A) {
      return JSON.parse(b.subarray(off, off + len).toString('utf8').replace(/\u0000+$/, ''));
    }
    off += len;
  }
  throw new Error(`${file}: missing JSON chunk`);
}

function targetNames(mesh) {
  return (mesh?.extras?.targetNames || []).map(String);
}

function assertDefaultMorphsZero(gltf) {
  const bad = [];
  for (const mesh of gltf.meshes || []) {
    const names = targetNames(mesh);
    const weights = Array.isArray(mesh.weights) ? mesh.weights : [];
    if (weights.length && weights.length !== names.length) {
      bad.push(`${mesh.name || '<mesh>'}: weights=${weights.length} targetNames=${names.length}`);
      continue;
    }
    for (let i = 0; i < weights.length; i++) {
      const value = Number(weights[i]) || 0;
      if (Math.abs(value) > 1e-7) bad.push(`${mesh.name || '<mesh>'}:${names[i] || i}=${value}`);
    }
  }
  if (bad.length) throw new Error(`candidate has non-zero default morph weights: ${bad.slice(0, 20).join(', ')}`);
}

const PRIMARY = [
  'gender_female','gender_male','age_child','age_old',
  'weight_min','weight_max','muscle_min','muscle_max',
  'height_short','height_tall','proportions_ideal','proportions_uncommon'
];
const CORRECTIVE_PAIRS = [
  [['gender_female','gender_male'],['age_child','age_old']],
  [['weight_min','weight_max'],['muscle_min','muscle_max']],
  [['gender_female','gender_male'],['muscle_min','muscle_max']],
  [['gender_female','gender_male'],['weight_min','weight_max']]
];
const CORRECTIVES = CORRECTIVE_PAIRS.flatMap(([a,b]) => a.flatMap(x => b.map(y => `corr_${x}__${y}`)));
const REQUIRED_JOINT_MORPHS = [...PRIMARY, ...CORRECTIVES];

function assertJointsContract(joints) {
  if (!joints || joints.version !== 1 || !joints.bones || !joints.morphs) throw new Error('invalid joints sidecar contract');
  const boneNames = Object.keys(joints.bones);
  if (boneNames.length < 40) throw new Error(`joints sidecar has too few bones: ${boneNames.length}`);
  const missing = REQUIRED_JOINT_MORPHS.filter(name => !(name in joints.morphs));
  if (missing.length) throw new Error(`joints sidecar missing driven morphs: ${missing.join(', ')}`);
  for (const name of REQUIRED_JOINT_MORPHS) {
    const offsets = joints.morphs[name];
    if (!offsets || typeof offsets !== 'object') throw new Error(`joints sidecar morph ${name} is invalid`);
    for (const [bone, xyz] of Object.entries(offsets)) {
      if (!joints.bones[bone]) throw new Error(`joints sidecar ${name} references unknown bone ${bone}`);
      if (!Array.isArray(xyz) || xyz.length !== 3 || xyz.some(v => !Number.isFinite(Number(v)))) {
        throw new Error(`joints sidecar ${name}/${bone} has invalid offset`);
      }
    }
  }
}

function main(argv = process.argv.slice(2)) {
  const root = argv[0] || 'output';
  const glbPath = path.join(root, 'base_body.glb');
  const jointsPath = path.join(root, 'base_body.joints.json');
  const gltf = readGlbJson(glbPath);
  const joints = JSON.parse(fs.readFileSync(jointsPath, 'utf8'));
  assertDefaultMorphsZero(gltf);
  assertJointsContract(joints);
  console.log(JSON.stringify({ok:true,defaultMorphsZero:true,jointMorphCount:Object.keys(joints.morphs).length,requiredJointMorphCount:REQUIRED_JOINT_MORPHS.length}, null, 2));
}

if (require.main === module) main();
module.exports = {readGlbJson,assertDefaultMorphsZero,assertJointsContract,PRIMARY,CORRECTIVES,REQUIRED_JOINT_MORPHS};
