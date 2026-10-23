(() => {
  'use strict';

  const VERSION = 1;
  const OPTIONS = Object.freeze({
    body: Object.freeze(['偏瘦','匀称','微胖','丰满','胖','健壮']),
    face: Object.freeze(['自然耐看','圆脸','鹅蛋脸','方脸','长脸','成熟脸','甜美脸']),
    skin: Object.freeze(['偏白','自然肤色','小麦肤色','深肤色']),
    hair: Object.freeze(['自然长发','短发','大波浪','卷发','马尾','利落中长发']),
    outfit: Object.freeze(['日常休闲','居家','成熟优雅','通勤','运动','甜美','性感但自然']),
    action: Object.freeze(['自然站立','放松呼吸','专注交流','轻微转身']),
    expression: Object.freeze(['自然','微笑','温柔','认真','俏皮']),
    voiceStyle: Object.freeze(['自然','温柔','成熟','活泼','低沉','清爽']),
    relationship: Object.freeze(['慢慢熟悉','普通朋友','知心朋友','暧昧对象','恋人','伴侣','姐姐/哥哥型陪伴'])
  });

  const DEFAULTS = Object.freeze({
    version: VERSION,
    heightCm: 165,
    weightJin: 110,
    body: '匀称',
    face: '自然耐看',
    skin: '自然肤色',
    hair: '自然长发',
    outfit: '日常休闲',
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
  function pick(value, list, fallback) { return list.includes(value) ? value : fallback; }
  function cleanList(value, max = 12) {
    return [...new Set((Array.isArray(value) ? value : []).filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, max))].map(item => item.slice(0, 32));
  }
  function sanitize(input = {}) {
    const personalities = cleanList(input.personality);
    const chats = cleanList(input.chat);
    return Object.freeze({
      version: VERSION,
      heightCm: clampInt(input.heightCm ?? input.height, 130, 220, DEFAULTS.heightCm),
      weightJin: clampInt(input.weightJin ?? input.weight, 60, 500, DEFAULTS.weightJin),
      body: pick(input.body, OPTIONS.body, DEFAULTS.body),
      face: pick(input.face, OPTIONS.face, DEFAULTS.face),
      skin: pick(input.skin, OPTIONS.skin, DEFAULTS.skin),
      hair: pick(input.hair, OPTIONS.hair, DEFAULTS.hair),
      outfit: pick(input.outfit, OPTIONS.outfit, DEFAULTS.outfit),
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

  function fromPersonality(text) {
    const value = String(text || '');
    const match = value.match(/【角色自定义设定】\n([\s\S]*?)\n【自定义设定结束】/);
    if (!match) return null;
    const lines = match[1].split(/\r?\n/);
    const physical = lines.find(line => line.startsWith('外形：')) || '';
    const find = list => list.find(item => physical.includes(item));
    return sanitize({
      heightCm: physical.match(/身高(\d+)cm/)?.[1],
      weightJin: physical.match(/体重(\d+)斤/)?.[1],
      body: find(OPTIONS.body),
      face: find(OPTIONS.face),
      skin: find(OPTIONS.skin),
      hair: find(OPTIONS.hair),
      outfit: find(OPTIONS.outfit),
      action: lineValue(lines, '动作：'),
      expression: lineValue(lines, '表情：'),
      voiceStyle: lineValue(lines, '语音：'),
      relationship: lineValue(lines, '初始关系：'),
      personality: lineValue(lines, '性格：').split('、').filter(Boolean),
      chat: lineValue(lines, '聊天方式：').split('、').filter(Boolean),
      extra: lineValue(lines, '用户特别偏好：')
    });
  }

  function forCharacter(char) {
    if (!char || typeof char !== 'object') return sanitize();
    if (char.visualRecipe && typeof char.visualRecipe === 'object') return sanitize(char.visualRecipe);
    return fromPersonality(char.personality) || sanitize();
  }

  function installNormalizer() {
    if (typeof window === 'undefined' || typeof normalizeCustomCharacter !== 'function' || normalizeCustomCharacter.__visualRecipe) return false;
    const base = normalizeCustomCharacter;
    const wrapped = function(value) {
      const char = base.call(this, value);
      if (!char) return char;
      const supplied = value?.visualRecipe && typeof value.visualRecipe === 'object' ? value.visualRecipe : null;
      const parsed = supplied ? sanitize(supplied) : fromPersonality(char.personality);
      if (parsed) char.visualRecipe = parsed;
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
      if (!char || char.isPreset || char.visualRecipe) continue;
      const parsed = fromPersonality(char.personality);
      if (!parsed) continue;
      char.visualRecipe = parsed;
      changed++;
    }
    if (changed && typeof saveDataToStorage === 'function') saveDataToStorage();
    return changed;
  }

  const api = Object.freeze({VERSION, OPTIONS, DEFAULTS, sanitize, fromPersonality, forCharacter, installNormalizer, migrateLoadedCharacters});
  if (typeof window !== 'undefined') { window.RoleVisualRecipe = api; installNormalizer(); migrateLoadedCharacters(); }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
