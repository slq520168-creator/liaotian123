(() => {
  'use strict';

  const VERSION = 1;
  const GENDERS = Object.freeze(['unspecified','male','female']);
  const FACE_DETAILS = Object.freeze({
    eyeSize:'眼睛大小', eyeSpacing:'眼距', eyeTilt:'眼角', noseBridge:'鼻梁', noseWidth:'鼻翼',
    lips:'嘴唇', mouthWidth:'嘴宽', chin:'下巴', cheekbones:'颧骨'
  });
  const OPTIONS = Object.freeze({
    body: Object.freeze(['偏瘦','匀称','微胖','丰满','胖','健壮']),
    face: Object.freeze(['自然耐看','圆脸','鹅蛋脸','方脸','长脸','成熟脸','甜美脸']),
    skin: Object.freeze(['偏白','自然肤色','小麦肤色','深肤色']),
    hair: Object.freeze(['自然长发','短发','大波浪','卷发','马尾','利落中长发']),
    outfit: Object.freeze(['日常休闲','居家','成熟优雅','通勤','运动','甜美','性感但自然']),
    accessory: Object.freeze(['无','细框眼镜','小耳环','细项链','眼镜+耳环']),
    action: Object.freeze(['自然站立','放松呼吸','专注交流','轻微转身']),
    expression: Object.freeze(['自然','微笑','温柔','认真','俏皮']),
    voiceStyle: Object.freeze(['自然','温柔','成熟','活泼','低沉','清爽']),
    relationship: Object.freeze(['慢慢熟悉','普通朋友','知心朋友','暧昧对象','恋人','伴侣','姐姐/哥哥型陪伴'])
  });
  const EMPTY_FACE_DETAILS = Object.freeze(Object.fromEntries(Object.keys(FACE_DETAILS).map(key=>[key,0])));

  const DEFAULTS = Object.freeze({
    version: VERSION,
    gender: 'unspecified',
    age: 24,
    heightCm: 165,
    weightJin: 110,
    body: '匀称',
    face: '自然耐看',
    faceDetails: EMPTY_FACE_DETAILS,
    skin: '自然肤色',
    hair: '自然长发',
    outfit: '日常休闲',
    accessory: '无',
    action: '自然站立',
    expression: '自然',
    voiceStyle: '自然',
    relationship: '慢慢熟悉',
    personality: Object.freeze(['自然','有主见']),
    chat: Object.freeze(['短句自然','少反问','记得细节']),
    extra: ''
  });

  function clampInt(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  }
  function clampSigned(value){return clampInt(value,-100,100,0);}
  function pick(value, list, fallback) { return list.includes(value) ? value : fallback; }
  function cleanList(value, max = 12) {
    return [...new Set((Array.isArray(value) ? value : []).filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, max))].map(item => item.slice(0, 32));
  }
  function sanitizeFaceDetails(value={}){
    const source=value&&typeof value==='object'?value:{};
    return Object.freeze(Object.fromEntries(Object.keys(FACE_DETAILS).map(key=>[key,clampSigned(source[key])])));
  }
  function sanitize(input = {}) {
    const personalities = cleanList(input.personality);
    const chats = cleanList(input.chat);
    return Object.freeze({
      version: VERSION,
      gender: pick(input.gender, GENDERS, DEFAULTS.gender),
      age: clampInt(input.age, 18, 100, DEFAULTS.age),
      heightCm: clampInt(input.heightCm ?? input.height, 130, 220, DEFAULTS.heightCm),
      weightJin: clampInt(input.weightJin ?? input.weight, 60, 500, DEFAULTS.weightJin),
      body: pick(input.body, OPTIONS.body, DEFAULTS.body),
      face: pick(input.face, OPTIONS.face, DEFAULTS.face),
      faceDetails: sanitizeFaceDetails(input.faceDetails),
      skin: pick(input.skin, OPTIONS.skin, DEFAULTS.skin),
      hair: pick(input.hair, OPTIONS.hair, DEFAULTS.hair),
      outfit: pick(input.outfit, OPTIONS.outfit, DEFAULTS.outfit),
      accessory: pick(input.accessory, OPTIONS.accessory, DEFAULTS.accessory),
      action: pick(input.action, OPTIONS.action, DEFAULTS.action),
      expression: pick(input.expression, OPTIONS.expression, DEFAULTS.expression),
      voiceStyle: pick(input.voiceStyle ?? input.voice, OPTIONS.voiceStyle, DEFAULTS.voiceStyle),
      relationship: pick(input.relationship, OPTIONS.relationship, DEFAULTS.relationship),
      personality: Object.freeze(personalities.length ? personalities : [...DEFAULTS.personality]),
      chat: Object.freeze(chats.length ? chats : [...DEFAULTS.chat]),
      extra: typeof input.extra === 'string' ? input.extra.trim().slice(0, 400) : ''
    });
  }

  function lineValue(lines, prefix) {
    return (lines.find(line => line.startsWith(prefix)) || '').replace(prefix, '').replace(/。$/, '').trim();
  }
  function parseIdentity(lines) {
    const line = lineValue(lines, '身份：');
    const gender = /(?:^|[，,])\s*男(?:性)?(?:[，,]|$)/.test(line) ? 'male' : /(?:^|[，,])\s*女(?:性)?(?:[，,]|$)/.test(line) ? 'female' : 'unspecified';
    const age = Number(line.match(/(\d{1,3})\s*岁/)?.[1]) || undefined;
    return {gender, age};
  }
  function parseFaceDetails(lines){
    const line=lineValue(lines,'脸部细节：');
    const out={};
    for(const [key,label] of Object.entries(FACE_DETAILS)){
      const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const match=line.match(new RegExp(`${escaped}([+-]?\\d{1,3})`));
      if(match)out[key]=clampSigned(match[1]);
    }
    return out;
  }

  function fromPersonality(text) {
    const value = String(text || '');
    const match = value.match(/【角色自定义设定】\n([\s\S]*?)\n【自定义设定结束】/);
    if (!match) return null;
    const lines = match[1].split(/\r?\n/);
    const physical = lines.find(line => line.startsWith('外形：')) || '';
    const identity = parseIdentity(lines);
    const find = list => list.find(item => physical.includes(item));
    return sanitize({
      ...identity,
      heightCm: physical.match(/身高(\d+)cm/)?.[1],
      weightJin: physical.match(/体重(\d+)斤/)?.[1],
      body: find(OPTIONS.body),
      face: find(OPTIONS.face),
      faceDetails: parseFaceDetails(lines),
      skin: find(OPTIONS.skin),
      hair: find(OPTIONS.hair),
      outfit: find(OPTIONS.outfit),
      accessory: lineValue(lines, '饰品：'),
      action: lineValue(lines, '动作：'),
      expression: lineValue(lines, '表情：'),
      voiceStyle: lineValue(lines, '语音：'),
      relationship: lineValue(lines, '初始关系：'),
      personality: lineValue(lines, '性格：').split('、').filter(Boolean),
      chat: lineValue(lines, '聊天方式：').split('、').filter(Boolean),
      extra: lineValue(lines, '用户特别偏好：')
    });
  }

  function withCharacterIdentity(char, recipe) {
    return sanitize({
      ...(recipe || {}),
      gender: GENDERS.includes(char?.gender) ? char.gender : recipe?.gender,
      age: Number.isFinite(Number(char?.age)) ? Number(char.age) : recipe?.age
    });
  }

  function forCharacter(char) {
    if (!char || typeof char !== 'object') return sanitize();
    if (char.visualRecipe && typeof char.visualRecipe === 'object') return withCharacterIdentity(char, char.visualRecipe);
    return withCharacterIdentity(char, fromPersonality(char.personality) || {});
  }

  function installNormalizer() {
    if (typeof window === 'undefined' || typeof normalizeCustomCharacter !== 'function' || normalizeCustomCharacter.__visualRecipe) return false;
    const base = normalizeCustomCharacter;
    const wrapped = function(value) {
      const char = base.call(this, value);
      if (!char) return char;
      const supplied = value?.visualRecipe && typeof value.visualRecipe === 'object' ? value.visualRecipe : null;
      const parsed = supplied ? sanitize(supplied) : (fromPersonality(char.personality) || sanitize());
      char.visualRecipe = withCharacterIdentity(char, parsed);
      return char;
    };
    wrapped.__visualRecipe = true;
    normalizeCustomCharacter = wrapped;
    return true;
  }

  function migrateLoadedCharacters() {
    if (typeof characters === 'undefined' || !Array.isArray(characters)) return 0;
    let changed = 0;
    for (const char of characters) {
      if (!char || char.isPreset) continue;
      const parsed = char.visualRecipe && typeof char.visualRecipe === 'object' ? char.visualRecipe : (fromPersonality(char.personality) || {});
      const next = withCharacterIdentity(char, parsed);
      if (JSON.stringify(char.visualRecipe || null) === JSON.stringify(next)) continue;
      char.visualRecipe = next;
      changed++;
    }
    if (changed && typeof saveDataToStorage === 'function') saveDataToStorage();
    return changed;
  }

  const api = Object.freeze({VERSION, GENDERS, FACE_DETAILS, OPTIONS, EMPTY_FACE_DETAILS, DEFAULTS, clampSigned, sanitizeFaceDetails, sanitize, parseIdentity, parseFaceDetails, fromPersonality, withCharacterIdentity, forCharacter, installNormalizer, migrateLoadedCharacters});
  if (typeof window !== 'undefined') { window.RoleVisualRecipe = api; installNormalizer(); migrateLoadedCharacters(); }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
