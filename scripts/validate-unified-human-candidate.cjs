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
    if (type === 0x4E4F534A) return JSON.parse(b.subarray(off, off + len).toString('utf8').replace(/\u0000+$/, ''));
    off += len;
  }
  throw new Error(`${file}: missing JSON chunk`);
}

function meshTargetNames(mesh) {
  const names = new Set((mesh?.extras?.targetNames || []).map(String));
  for (const primitive of mesh?.primitives || []) for (const name of primitive?.extras?.targetNames || []) names.add(String(name));
  return [...names];
}
function collectTargetNames(gltf) {
  const out = new Set();
  for (const mesh of gltf?.meshes || []) for (const name of meshTargetNames(mesh)) out.add(name);
  return out;
}
function assertMorphContract(gltf, required, label = 'candidate') {
  if (!(gltf?.skins || []).length) throw new Error(`${label} has no skin`);
  const names = collectTargetNames(gltf);
  const missing = [...required].filter(name => !names.has(name));
  if (missing.length) throw new Error(`${label} missing required morphs: ${missing.join(', ')}`);
  return names;
}
function assertDefaultMorphsZero(gltf, label = 'candidate') {
  const bad = [];
  for (const mesh of gltf.meshes || []) {
    const names = meshTargetNames(mesh);
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
  if (bad.length) throw new Error(`${label} has non-zero default morph weights: ${bad.slice(0, 20).join(', ')}`);
}

const BODY_PRIMARY = [
  'gender_female','gender_male','age_child','age_old',
  'weight_min','weight_max','muscle_min','muscle_max',
  'height_short','height_tall','proportions_ideal','proportions_uncommon'
];
const BREAST_PRIMARY = ['breast_cup_min','breast_cup_max','breast_firm_min','breast_firm_max'];
const BREAST_DETAILS = [
  'bdet_breast_dist_decr','bdet_breast_dist_incr','bdet_breast_point_decr','bdet_breast_point_incr',
  'bdet_breast_height_decr','bdet_breast_height_incr'
];
const FACE_STEMS = ['nose_width','nose_length','nose_height','jaw_width','chin','cheekbones','eye_size','eye_spacing','eye_tilt','lips','mouth_width','ear_size','forehead'];
const FACE_IDENTITY = FACE_STEMS.flatMap(stem => [`face_${stem}_decr`,`face_${stem}_incr`]);
const ARKIT = [
  'browDownLeft','browDownRight','browInnerUp','browOuterUpLeft','browOuterUpRight','cheekPuff','cheekSquintLeft','cheekSquintRight',
  'eyeBlinkLeft','eyeBlinkRight','eyeLookDownLeft','eyeLookDownRight','eyeLookInLeft','eyeLookInRight','eyeLookOutLeft','eyeLookOutRight',
  'eyeLookUpLeft','eyeLookUpRight','eyeSquintLeft','eyeSquintRight','eyeWideLeft','eyeWideRight','jawForward','jawLeft','jawOpen','jawRight',
  'mouthClose','mouthDimpleLeft','mouthDimpleRight','mouthFrownLeft','mouthFrownRight','mouthFunnel','mouthLeft','mouthLowerDownLeft','mouthLowerDownRight',
  'mouthPressLeft','mouthPressRight','mouthPucker','mouthRight','mouthRollLower','mouthRollUpper','mouthShrugLower','mouthShrugUpper','mouthSmileLeft',
  'mouthSmileRight','mouthStretchLeft','mouthStretchRight','mouthUpperUpLeft','mouthUpperUpRight','noseSneerLeft','noseSneerRight','tongueOut'
];
const VISEMES = ['viseme_sil','viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk','viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U'];
const CORRECTIVE_PAIRS = [
  [['gender_female','gender_male'],['age_child','age_old']],
  [['weight_min','weight_max'],['muscle_min','muscle_max']],
  [['gender_female','gender_male'],['muscle_min','muscle_max']],
  [['gender_female','gender_male'],['weight_min','weight_max']],
  [['breast_cup_min','breast_cup_max'],['breast_firm_min','breast_firm_max']],
  [['breast_cup_min','breast_cup_max'],['age_child','age_old']],
  [['breast_cup_min','breast_cup_max'],['muscle_min','muscle_max']],
  [['breast_firm_min','breast_firm_max'],['age_child','age_old']]
];
const CORRECTIVES = CORRECTIVE_PAIRS.flatMap(([a,b]) => a.flatMap(x => b.map(y => `corr_${x}__${y}`)));
const REQUIRED_JOINT_MORPHS = [...BODY_PRIMARY, ...BREAST_PRIMARY, ...CORRECTIVES];
const BASE_REQUIRED_MORPHS = [...BODY_PRIMARY, ...BREAST_PRIMARY, ...BREAST_DETAILS, ...FACE_IDENTITY, ...ARKIT, ...VISEMES, ...CORRECTIVES];
const HAIR = ['short02','bob02','long01','ponytail01','braid01','short04','bob01','afro01'];
const CLOTHING = ['dress','jeans','tshirt','hoodie','jacket','skirt','shorts','shoes'];
const HAIR_REQUIRED_MORPHS = ['gender_female','gender_male','weight_min','weight_max','height_short','height_tall','face_forehead_decr','face_forehead_incr','face_ear_size_decr','face_ear_size_incr'];
const CLOTHING_REQUIRED_MORPHS = ['gender_female','gender_male','weight_min','weight_max','height_short','height_tall'];

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
      if (!Array.isArray(xyz) || xyz.length !== 3 || xyz.some(v => !Number.isFinite(Number(v)))) throw new Error(`joints sidecar ${name}/${bone} has invalid offset`);
    }
  }
}

function assertModuleContracts(root) {
  let count = 0;
  for (const id of HAIR) {
    const file = path.join(root, `hair_${id}.glb`);
    if (!fs.existsSync(file) || fs.statSync(file).size <= 0) throw new Error(`missing unified module: hair_${id}.glb`);
    const gltf = readGlbJson(file);
    assertDefaultMorphsZero(gltf, `hair_${id}.glb`);
    assertMorphContract(gltf, HAIR_REQUIRED_MORPHS, `hair_${id}.glb`);
    count++;
  }
  for (const id of CLOTHING) {
    const file = path.join(root, `clothing_${id}.glb`);
    if (!fs.existsSync(file) || fs.statSync(file).size <= 0) throw new Error(`missing unified module: clothing_${id}.glb`);
    const gltf = readGlbJson(file);
    assertDefaultMorphsZero(gltf, `clothing_${id}.glb`);
    assertMorphContract(gltf, CLOTHING_REQUIRED_MORPHS, `clothing_${id}.glb`);
    count++;
  }
  return count;
}
function assertModuleDefaultsZero(root) { return assertModuleContracts(root); }

function main(argv = process.argv.slice(2)) {
  const root = argv[0] || 'output';
  const glbPath = path.join(root, 'base_body.glb');
  const jointsPath = path.join(root, 'base_body.joints.json');
  const gltf = readGlbJson(glbPath);
  const joints = JSON.parse(fs.readFileSync(jointsPath, 'utf8'));
  assertDefaultMorphsZero(gltf, 'base_body.glb');
  const names = assertMorphContract(gltf, BASE_REQUIRED_MORPHS, 'base_body.glb');
  assertJointsContract(joints);
  const moduleCount = assertModuleContracts(root);
  console.log(JSON.stringify({
    ok:true,
    defaultMorphsZero:true,
    moduleDefaultMorphsZero:true,
    moduleCount,
    targetNameCount:names.size,
    arkitCount:ARKIT.filter(name=>names.has(name)).length,
    visemeCount:VISEMES.filter(name=>names.has(name)).length,
    jointMorphCount:Object.keys(joints.morphs).length,
    requiredJointMorphCount:REQUIRED_JOINT_MORPHS.length
  }, null, 2));
}

if (require.main === module) main();
module.exports = {
  readGlbJson, meshTargetNames, collectTargetNames, assertMorphContract, assertDefaultMorphsZero,
  assertJointsContract, assertModuleContracts, assertModuleDefaultsZero,
  BODY_PRIMARY, BREAST_PRIMARY, BREAST_DETAILS, FACE_IDENTITY, ARKIT, VISEMES, CORRECTIVES,
  REQUIRED_JOINT_MORPHS, BASE_REQUIRED_MORPHS, HAIR, CLOTHING, HAIR_REQUIRED_MORPHS, CLOTHING_REQUIRED_MORPHS
};
