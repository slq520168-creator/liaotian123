const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const MIB = 1024 * 1024;

export const ARKIT_52 = Object.freeze([
  'browDownLeft','browDownRight','browInnerUp','browOuterUpLeft','browOuterUpRight',
  'cheekPuff','cheekSquintLeft','cheekSquintRight','eyeBlinkLeft','eyeBlinkRight',
  'eyeLookDownLeft','eyeLookDownRight','eyeLookInLeft','eyeLookInRight','eyeLookOutLeft','eyeLookOutRight',
  'eyeLookUpLeft','eyeLookUpRight','eyeSquintLeft','eyeSquintRight','eyeWideLeft','eyeWideRight',
  'jawForward','jawLeft','jawOpen','jawRight','mouthClose','mouthDimpleLeft','mouthDimpleRight',
  'mouthFrownLeft','mouthFrownRight','mouthFunnel','mouthLeft','mouthLowerDownLeft','mouthLowerDownRight',
  'mouthPressLeft','mouthPressRight','mouthPucker','mouthRight','mouthRollLower','mouthRollUpper',
  'mouthShrugLower','mouthShrugUpper','mouthSmileLeft','mouthSmileRight','mouthStretchLeft','mouthStretchRight',
  'mouthUpperUpLeft','mouthUpperUpRight','noseSneerLeft','noseSneerRight','tongueOut'
]);

export const BODY_CHANNELS = Object.freeze([
  'heightShort','heightTall','bodyThin','bodyHeavy','bodyMuscular','chestFull','waistNarrow','waistWide','hipsWide','shouldersWide','legsLong'
]);

export const MAX_BYTES = Object.freeze({portrait: 8 * MIB, upper: 14 * MIB, full: 20 * MIB});
export const ALLOWED_LICENSES = Object.freeze(['CC0', 'MIT', 'OWNED']);

const normalize = value => String(value || '').replace(/^blendShape\d*\./i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

export function parseGlb(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buffer.length < 20) throw new Error('GLB 文件过短');
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error('不是有效 GLB');
  if (buffer.readUInt32LE(4) !== 2) throw new Error('只接受 glTF 2.0 GLB');
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length) throw new Error('GLB 长度字段不一致');
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) throw new Error('GLB chunk 越界');
    if (type === GLB_JSON_CHUNK) {
      const text = buffer.subarray(start, end).toString('utf8').replace(/\u0000+$/g, '').trimEnd();
      return {json: JSON.parse(text), byteLength: buffer.length};
    }
    offset = end;
  }
  throw new Error('GLB 缺少 JSON chunk');
}

export function collectTargetNames(json = {}) {
  const names = [];
  for (const mesh of json.meshes || []) {
    const extras = mesh?.extras || {};
    for (const name of extras.targetNames || []) names.push(String(name));
  }
  return names;
}

export function inspectHumanDocument(json = {}, byteLength = 0) {
  const targetNames = collectTargetNames(json);
  const normalized = new Set(targetNames.map(normalize));
  const arkit = ARKIT_52.filter(name => normalized.has(normalize(name)));
  const body = BODY_CHANNELS.filter(name => normalized.has(normalize(name)));
  const morphPrimitiveCount = (json.meshes || []).flatMap(mesh => mesh?.primitives || []).filter(primitive => Array.isArray(primitive?.targets) && primitive.targets.length > 0).length;
  return Object.freeze({
    byteLength: Number(byteLength) || 0,
    meshes: (json.meshes || []).length,
    skins: (json.skins || []).length,
    animations: (json.animations || []).length,
    morphPrimitiveCount,
    targetNames: Object.freeze(targetNames),
    arkitCount: arkit.length,
    arkit: Object.freeze(arkit),
    missingArkit: Object.freeze(ARKIT_52.filter(name => !normalized.has(normalize(name)))),
    bodyMorphCount: body.length,
    bodyMorphs: Object.freeze(body)
  });
}

export function validateHumanAsset({json, byteLength = 0, tier = 'full', license = '', customizableBody = false} = {}) {
  const info = inspectHumanDocument(json || {}, byteLength);
  const errors = [];
  if (!Object.hasOwn(MAX_BYTES, tier)) errors.push(`未知资产档位: ${tier}`);
  if (!ALLOWED_LICENSES.includes(String(license).toUpperCase())) errors.push(`许可证不允许进入正式站: ${license || '未填写'}`);
  if (info.meshes < 1) errors.push('缺少 mesh');
  if (info.morphPrimitiveCount < 1) errors.push('缺少 morph target 几何');
  if (info.arkitCount !== ARKIT_52.length) errors.push(`ARKit morph 不完整: ${info.arkitCount}/${ARKIT_52.length}`);
  if ((tier === 'upper' || tier === 'full') && info.skins < 1) errors.push(`${tier} 资产缺少骨骼 skin`);
  if (customizableBody && info.bodyMorphCount < 5) errors.push(`可定制身体 morph 不足: ${info.bodyMorphCount}/至少5`);
  const max = MAX_BYTES[tier];
  if (max && info.byteLength > max) errors.push(`文件过大: ${(info.byteLength / MIB).toFixed(2)}MB > ${(max / MIB).toFixed(0)}MB`);
  return Object.freeze({ok: errors.length === 0, errors: Object.freeze(errors), info});
}

export function validateManifest(manifest = {}) {
  const errors = [];
  if (manifest.version !== 1) errors.push('manifest.version 必须为 1');
  if (!manifest.characters || typeof manifest.characters !== 'object' || Array.isArray(manifest.characters)) errors.push('manifest.characters 必须是对象');
  for (const [id, tiers] of Object.entries(manifest.characters || {})) {
    if (!id.trim()) errors.push('角色 id 不能为空');
    if (!tiers || typeof tiers !== 'object') { errors.push(`${id}: 资产档位必须是对象`); continue; }
    for (const [tier, entry] of Object.entries(tiers)) {
      if (!Object.hasOwn(MAX_BYTES, tier)) errors.push(`${id}: 未知档位 ${tier}`);
      if (!entry?.url || !String(entry.url).startsWith('assets/humans/')) errors.push(`${id}/${tier}: url 必须位于 assets/humans/`);
      if (!ALLOWED_LICENSES.includes(String(entry?.license || '').toUpperCase())) errors.push(`${id}/${tier}: 缺少允许的许可证`);
      if (!entry?.source) errors.push(`${id}/${tier}: 缺少 source`);
    }
  }
  return Object.freeze({ok: errors.length === 0, errors: Object.freeze(errors)});
}
