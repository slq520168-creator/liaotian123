(() => {
  'use strict';

  const form = document.getElementById('createRoleForm');
  const personality = document.getElementById('rolePersonality');
  const roleTag = document.getElementById('roleTag');
  const greeting = document.getElementById('roleGreeting');
  const voice = document.getElementById('roleVoice');
  const relationship = document.getElementById('roleRelationship');
  const modal = document.getElementById('createModalOverlay');
  const openCreateButton = document.getElementById('openCreateModalBtn');
  if (!form || !personality || !modal) return;

  const START = '【角色自定义设定】';
  const END = '【自定义设定结束】';
  const SPEC_RE = /\n*【角色自定义设定】\n[\s\S]*?\n【自定义设定结束】\n*/g;

  const defaults = Object.freeze({
    height: '165', weight: '110', body: '匀称', face: '自然耐看', skin: '自然肤色', hair: '自然长发', outfit: '日常休闲',
    relationship: '慢慢熟悉', personality: ['自然', '有主见'], chat: ['短句自然', '少反问', '记得细节'], extra: ''
  });

  const personalityOptions = ['温柔', '成熟', '活泼', '高冷', '黏人', '傲娇', '幽默', '害羞', '主动', '会照顾人', '自然', '有主见'];
  const chatOptions = ['短句自然', '主动找话题', '少反问', '记得细节', '适度吃醋', '会叫昵称', '少量表情', '不说教'];

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function injectStyles() {
    if (document.getElementById('roleBuilderStyles')) return;
    const style = document.createElement('style');
    style.id = 'roleBuilderStyles';
    style.textContent = `
      .role-builder{grid-column:1/-1;border:1px solid rgba(224,92,132,.22);border-radius:16px;background:linear-gradient(180deg,rgba(255,247,250,.98),rgba(255,255,255,.98));padding:14px;margin:2px 0 4px}
      .role-builder h3{margin:0 0 4px;font-size:16px;color:#34262d}.role-builder-intro{margin:0 0 12px;color:#75636c;font-size:13px;line-height:1.5}
      .role-builder-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.role-builder-field{display:flex;flex-direction:column;gap:5px;min-width:0}
      .role-builder-field.full{grid-column:1/-1}.role-builder-field label{font-size:13px;font-weight:650;color:#58464f}.role-builder-field input,.role-builder-field select,.role-builder-field textarea{width:100%;box-sizing:border-box}
      .role-builder-chips{display:flex;flex-wrap:wrap;gap:7px}.role-builder-chip{border:1px solid rgba(92,72,82,.18);background:#fff;border-radius:999px;padding:7px 11px;font-size:13px;line-height:1;cursor:pointer;color:#51414a}
      .role-builder-chip[aria-pressed="true"]{background:#2e2930;color:#fff;border-color:#2e2930}.role-builder-preview{margin-top:12px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid rgba(92,72,82,.12);font-size:13px;line-height:1.55;color:#5c4a53}
      .role-builder-preview b{color:#30252a}.role-builder-unit{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px}.role-builder-unit span{font-size:12px;color:#8a7780;white-space:nowrap}
      @media(max-width:560px){.role-builder{padding:12px}.role-builder-grid{grid-template-columns:1fr}.role-builder-field.full{grid-column:auto}.role-builder-chip{padding:8px 10px}}
    `;
    document.head.appendChild(style);
  }

  function chipGroup(name, values, selected) {
    return `<div class="role-builder-chips" data-builder-group="${escapeHtml(name)}">${values.map(value => `<button type="button" class="role-builder-chip" data-builder-value="${escapeHtml(value)}" aria-pressed="${selected.includes(value) ? 'true' : 'false'}">${escapeHtml(value)}</button>`).join('')}</div>`;
  }

  function buildPanel() {
    const panel = document.createElement('section');
    panel.className = 'role-builder';
    panel.id = 'roleBuilder';
    panel.innerHTML = `
      <h3>设计你真正喜欢的角色</h3>
      <p class="role-builder-intro">不是套用默认美女。身高、体重、体型、脸型、风格、性格和相处方式都由你定；以后这个角色按同一设定聊天。</p>
      <div class="role-builder-grid">
        <div class="role-builder-field"><label for="rbHeight">身高</label><div class="role-builder-unit"><input id="rbHeight" type="number" min="130" max="220" inputmode="numeric" value="${defaults.height}"><span>cm</span></div></div>
        <div class="role-builder-field"><label for="rbWeight">体重</label><div class="role-builder-unit"><input id="rbWeight" type="number" min="60" max="500" inputmode="numeric" value="${defaults.weight}"><span>斤</span></div></div>
        <div class="role-builder-field"><label for="rbBody">体型</label><select id="rbBody"><option>偏瘦</option><option selected>匀称</option><option>微胖</option><option>丰满</option><option>胖</option><option>健壮</option></select></div>
        <div class="role-builder-field"><label for="rbFace">脸型/感觉</label><select id="rbFace"><option selected>自然耐看</option><option>圆脸</option><option>鹅蛋脸</option><option>方脸</option><option>长脸</option><option>成熟脸</option><option>甜美脸</option></select></div>
        <div class="role-builder-field"><label for="rbSkin">肤色</label><select id="rbSkin"><option>偏白</option><option selected>自然肤色</option><option>小麦肤色</option><option>深肤色</option></select></div>
        <div class="role-builder-field"><label for="rbHair">发型</label><select id="rbHair"><option selected>自然长发</option><option>短发</option><option>大波浪</option><option>卷发</option><option>马尾</option><option>利落中长发</option></select></div>
        <div class="role-builder-field"><label for="rbOutfit">穿衣风格</label><select id="rbOutfit"><option selected>日常休闲</option><option>居家</option><option>成熟优雅</option><option>通勤</option><option>运动</option><option>甜美</option><option>性感但自然</option></select></div>
        <div class="role-builder-field"><label for="rbRelation">你们的初始关系</label><select id="rbRelation"><option selected>慢慢熟悉</option><option>普通朋友</option><option>知心朋友</option><option>暧昧对象</option><option>恋人</option><option>伴侣</option><option>姐姐/哥哥型陪伴</option></select></div>
        <div class="role-builder-field full"><label>性格（可多选）</label>${chipGroup('personality', personalityOptions, defaults.personality)}</div>
        <div class="role-builder-field full"><label>聊天方式（可多选）</label>${chipGroup('chat', chatOptions, defaults.chat)}</div>
        <div class="role-builder-field full"><label for="rbExtra">你还想要什么</label><textarea id="rbExtra" rows="2" maxlength="400" placeholder="例如：我就喜欢180斤、圆脸、很有生活感的人；别像客服，也别每句话都问我问题。"></textarea></div>
      </div>
      <div class="role-builder-preview" id="rbPreview" aria-live="polite"></div>
    `;
    const avatarGroup = [...form.children].find(el => el.querySelector?.('#roleAvatarPreview'));
    form.insertBefore(panel, avatarGroup || form.children[2] || null);
    return panel;
  }

  const panel = buildPanel();
  injectStyles();
  if (openCreateButton) openCreateButton.innerHTML = '<span class="icon">+</span> '+(window.LIAOTIAN_3D_ONLY?'创建3D角色':'设计我的角色');

  const ids = id => document.getElementById(id);
  const controls = {
    height: ids('rbHeight'), weight: ids('rbWeight'), body: ids('rbBody'), face: ids('rbFace'), skin: ids('rbSkin'), hair: ids('rbHair'), outfit: ids('rbOutfit'), relation: ids('rbRelation'), extra: ids('rbExtra')
  };

  function selected(group) {
    return [...panel.querySelectorAll(`[data-builder-group="${group}"] .role-builder-chip[aria-pressed="true"]`)].map(btn => btn.dataset.builderValue);
  }

  function setSelected(group, values) {
    const wanted = new Set(values || []);
    panel.querySelectorAll(`[data-builder-group="${group}"] .role-builder-chip`).forEach(btn => btn.setAttribute('aria-pressed', String(wanted.has(btn.dataset.builderValue))));
  }

  function clampNumber(input, min, max, fallback) {
    const n = Number(input.value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function currentSpec() {
    return {
      height: clampNumber(controls.height, 130, 220, Number(defaults.height)),
      weight: clampNumber(controls.weight, 60, 500, Number(defaults.weight)),
      body: controls.body.value,
      face: controls.face.value,
      skin: controls.skin.value,
      hair: controls.hair.value,
      outfit: controls.outfit.value,
      relationship: controls.relation.value,
      personality: selected('personality'),
      chat: selected('chat'),
      extra: controls.extra.value.trim().slice(0, 400)
    };
  }

  function specBlock(spec) {
    const lines = [
      START,
      `外形：身高${spec.height}cm，体重${spec.weight}斤，${spec.body}，${spec.face}，${spec.skin}，${spec.hair}，${spec.outfit}。`,
      `性格：${spec.personality.length ? spec.personality.join('、') : '自然、有主见'}。`,
      `初始关系：${spec.relationship}。`,
      `聊天方式：${spec.chat.length ? spec.chat.join('、') : '短句自然、少反问、记得细节'}。`,
      spec.extra ? `用户特别偏好：${spec.extra}` : '',
      '保持外形与人设一致，不擅自把体型、年龄感、性格或关系改成平台默认模板。',
      END
    ].filter(Boolean);
    return lines.join('\n');
  }

  function stripSpec(text) {
    return String(text || '').replace(SPEC_RE, '\n').trim();
  }

  function parseSpec(text) {
    const match = String(text || '').match(/【角色自定义设定】\n([\s\S]*?)\n【自定义设定结束】/);
    if (!match) return null;
    const bodyLine = match[1].split('\n').find(line => line.startsWith('外形：')) || '';
    const personalityLine = match[1].split('\n').find(line => line.startsWith('性格：')) || '';
    const relationLine = match[1].split('\n').find(line => line.startsWith('初始关系：')) || '';
    const chatLine = match[1].split('\n').find(line => line.startsWith('聊天方式：')) || '';
    const extraLine = match[1].split('\n').find(line => line.startsWith('用户特别偏好：')) || '';
    const height = bodyLine.match(/身高(\d+)cm/)?.[1];
    const weight = bodyLine.match(/体重(\d+)斤/)?.[1];
    const body = ['偏瘦','匀称','微胖','丰满','胖','健壮'].find(v => bodyLine.includes(v));
    const face = ['自然耐看','圆脸','鹅蛋脸','方脸','长脸','成熟脸','甜美脸'].find(v => bodyLine.includes(v));
    const skin = ['偏白','自然肤色','小麦肤色','深肤色'].find(v => bodyLine.includes(v));
    const hair = ['自然长发','短发','大波浪','卷发','马尾','利落中长发'].find(v => bodyLine.includes(v));
    const outfit = ['日常休闲','居家','成熟优雅','通勤','运动','甜美','性感但自然'].find(v => bodyLine.includes(v));
    const rel = relationLine.replace(/^初始关系：/, '').replace(/。$/, '');
    const ps = personalityLine.replace(/^性格：/, '').replace(/。$/, '').split('、').filter(Boolean);
    const cs = chatLine.replace(/^聊天方式：/, '').replace(/。$/, '').split('、').filter(Boolean);
    return {height, weight, body, face, skin, hair, outfit, relationship: rel, personality: ps, chat: cs, extra: extraLine.replace(/^用户特别偏好：/, '')};
  }

  function resetBuilder() {
    controls.height.value = defaults.height; controls.weight.value = defaults.weight;
    controls.body.value = defaults.body; controls.face.value = defaults.face; controls.skin.value = defaults.skin;
    controls.hair.value = defaults.hair; controls.outfit.value = defaults.outfit; controls.relation.value = defaults.relationship;
    controls.extra.value = defaults.extra;
    setSelected('personality', defaults.personality); setSelected('chat', defaults.chat);
    renderPreview();
  }

  function loadBuilderFromPersonality() {
    const parsed = parseSpec(personality.value);
    resetBuilder();
    if (!parsed) return;
    if (parsed.height) controls.height.value = parsed.height;
    if (parsed.weight) controls.weight.value = parsed.weight;
    if (parsed.body) controls.body.value = parsed.body;
    if (parsed.face) controls.face.value = parsed.face;
    if (parsed.skin) controls.skin.value = parsed.skin;
    if (parsed.hair) controls.hair.value = parsed.hair;
    if (parsed.outfit) controls.outfit.value = parsed.outfit;
    if ([...controls.relation.options].some(o => o.value === parsed.relationship)) controls.relation.value = parsed.relationship;
    controls.extra.value = parsed.extra || '';
    if (parsed.personality?.length) setSelected('personality', parsed.personality);
    if (parsed.chat?.length) setSelected('chat', parsed.chat);
    renderPreview();
  }

  function renderPreview() {
    const spec = currentSpec();
    const preview = ids('rbPreview');
    preview.innerHTML = `<b>当前角色：</b>${escapeHtml(spec.height)}cm · ${escapeHtml(spec.weight)}斤 · ${escapeHtml(spec.body)} · ${escapeHtml(spec.face)} · ${escapeHtml(spec.relationship)}<br><b>性格：</b>${escapeHtml(spec.personality.join('、') || '自然')}　<b>聊天：</b>${escapeHtml(spec.chat.join('、') || '自然')}`;
  }

  function naturalGreeting(spec) {
    if (spec.relationship === '恋人' || spec.relationship === '伴侣') return '你来了。过来陪我聊会儿，今天过得怎么样？';
    if (spec.relationship === '暧昧对象') return '终于来了。我刚好有点想找你说话。';
    if (spec.relationship === '姐姐/哥哥型陪伴') return '来了就好。今天想轻松聊聊，还是有件事想跟我说？';
    return '嗨，先认识一下吧。你不用想太多，想聊什么就直接说。';
  }

  panel.addEventListener('click', event => {
    const chip = event.target.closest('.role-builder-chip');
    if (!chip) return;
    chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    renderPreview();
  });
  panel.addEventListener('input', renderPreview);
  panel.addEventListener('change', renderPreview);

  form.addEventListener('submit', () => {
    if(window.LIAOTIAN_3D_ONLY)return;
    const spec = currentSpec();
    controls.height.value = String(spec.height); controls.weight.value = String(spec.weight);
    const base = stripSpec(personality.value) || `${spec.personality.join('、') || '自然、有主见'}，有自己的生活和判断，按用户明确设定自然相处。`;
    personality.value = `${base}\n\n${specBlock(spec)}`.slice(0, 12000);
    if (!roleTag.value.trim()) roleTag.value = `${spec.personality[0] || '自然'} · ${spec.relationship}`.slice(0, 20);
    if (!greeting.value.trim()) greeting.value = naturalGreeting(spec);
    if (!voice.value.trim()) voice.value = `${spec.chat.join('、') || '自然聊天'}，像真人口语，不用客服腔和模板安慰。`.slice(0, 240);
    if (!relationship.value.trim()) relationship.value = `${spec.relationship}，关系按真实聊天自然发展，记住用户明确说过的偏好。`.slice(0, 300);
  }, {capture: true});

  const observer = new MutationObserver(() => {
    if(window.LIAOTIAN_3D_ONLY)return;
    if (!modal.classList.contains('active')) return;
    requestAnimationFrame(loadBuilderFromPersonality);
  });
  observer.observe(modal, {attributes: true, attributeFilter: ['class']});

  resetBuilder();
})();
