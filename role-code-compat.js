(() => {
  if (typeof parseRoleCode !== 'function' || parseRoleCode.__externalCompat) return;
  const baseParseRoleCode = parseRoleCode;
  const pick = (obj, keys) => {
    for (const key of keys) {
      if (obj && Object.hasOwn(obj, key) && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
    }
    return undefined;
  };
  const aliases = {
    name: ['name','char_name','character_name','title','姓名','名字','角色名','角色名称'],
    personality: ['personality','description','persona','char_persona','character_persona','system_prompt','systemPrompt','prompt','instructions','definition','character_definition','role_description','性格','人设','角色设定','人物设定'],
    age: ['age','年龄'], gender: ['gender','sex','性别'],
    avatar: ['avatar','avatar_url','image','image_url','portrait','头像'],
    tag: ['tag','tags','标签'], greeting: ['greeting','first_mes','first_message','char_greeting','opening','开场白','问候语'],
    voice: ['voice','speech_style','speaking_style','style','说话风格','语气'],
    interests: ['interests','hobbies','兴趣','爱好'], relationship: ['relationship','relation','相处方式','关系'],
    background: ['background','scenario','world_scenario','backstory','背景','背景故事'],
    quickReplies: ['quickReplies','quick_replies','starters','快捷回复']
  };

  function unwrap(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data;
    if (!pick(raw, aliases.name) && raw.character && typeof raw.character === 'object') return raw.character;
    if (!pick(raw, aliases.name) && raw.role && typeof raw.role === 'object') return raw.role;
    return raw;
  }

  function mapRole(raw) {
    const data = unwrap(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const out = Object.create(null);
    for (const [key, keys] of Object.entries(aliases)) {
      const value = pick(data, keys);
      if (value !== undefined) out[key] = value;
    }
    const creatorNotes = pick(data, ['creator_notes','creatorNotes','notes','备注']);
    const example = pick(data, ['mes_example','example_dialogue','examples','示例对话']);
    if (!out.personality) {
      const parts = [out.background, creatorNotes, example].filter(value => typeof value === 'string' && value.trim());
      if (parts.length) out.personality = parts.join('\n');
    }
    if (!out.personality && out.name) out.personality = '按照上传的角色资料自然聊天，保持角色一致，不使用客服口吻。';
    if (Array.isArray(out.tag)) out.tag = out.tag.slice(0,3).join(' · ');
    if (!out.quickReplies) {
      const alternate = pick(data, ['alternate_greetings','alternateGreetings']);
      if (Array.isArray(alternate)) out.quickReplies = alternate.slice(0,12);
    }
    if (pick(data,['id','character_id','角色ID']) !== undefined) out.id = pick(data,['id','character_id','角色ID']);
    return out;
  }

  function mapContainer(raw) {
    if (Array.isArray(raw)) return raw.map(mapRole);
    if (!raw || typeof raw !== 'object') return raw;
    if (Array.isArray(raw.roles)) return {roles: raw.roles.map(mapRole)};
    if (Array.isArray(raw.characters)) return {characters: raw.characters.map(mapRole)};
    return mapRole(raw);
  }

  function parsePlainText(source) {
    const text = String(source ?? '').replace(/^\uFEFF/,'').trim();
    if (!text || /^[\[{]/.test(text)) return null;
    const lines = text.split(/\r?\n/);
    const data = Object.create(null);
    let current = '';
    const keyMap = new Map(Object.entries(aliases).flatMap(([canonical, names]) => names.map(name => [name.toLowerCase(), canonical])));
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const heading = line.match(/^#{1,3}\s*(.+)$/);
      if (heading && !data.name) {data.name = heading[1].trim(); continue;}
      const match = line.match(/^([^:：]{1,32})[:：]\s*(.*)$/);
      if (match) {
        const canonical = keyMap.get(match[1].trim().toLowerCase());
        if (canonical) {
          current = canonical;
          data[canonical] = match[2].trim();
          continue;
        }
      }
      if (current && typeof data[current] === 'string') data[current] += '\n' + line;
      else if (!data.personality) data.personality = line;
      else data.personality += '\n' + line;
    }
    if (!data.name) {
      const first = lines.map(line => line.trim()).find(Boolean) || '';
      if (first && first.length <= 24) data.name = first.replace(/^[-*#\s]+/,'').slice(0,12);
    }
    if (!data.personality && data.name) data.personality = '按照上传的角色资料自然聊天，保持角色一致。';
    return data.name ? data : null;
  }

  const wrapped = function(source, targetId='') {
    try { return baseParseRoleCode(source, targetId); }
    catch (originalError) {
      let parsed;
      try { parsed = typeof parseRoleData === 'function' ? parseRoleData(source) : null; } catch (error) {}
      if (parsed) {
        try { return baseParseRoleCode(JSON.stringify(mapContainer(parsed)), targetId); } catch (error) {}
      }
      const loose = parsePlainText(source);
      if (loose) {
        try { return baseParseRoleCode(JSON.stringify(loose), targetId); } catch (error) {}
      }
      throw originalError;
    }
  };
  wrapped.__externalCompat = true;
  parseRoleCode = wrapped;
})();
