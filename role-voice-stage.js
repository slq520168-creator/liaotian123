(() => {
  'use strict';
  const VERSION = '20261023-presence1';
  const VOICE_PREFIX = 'liaotian_role_voice_';
  const AUTO_VOICE_KEY = 'liaotian_voice_auto';
  const by = id => document.getElementById(id);
  const safe = value => String(value ?? '').trim();
  const presence = window.RolePresence?.getDefault?.() || null;

  let voiceSelect = null, voiceButton = null, micButton = null, voiceNote = null;
  let voices = [], recognition = null, listening = false, voiceAuto = false;
  let queuedVisemes = [];
  try { voiceAuto = localStorage.getItem(AUTO_VOICE_KEY) === '1'; } catch (error) {}

  function currentChar() {
    return typeof characters === 'undefined' ? null : characters.find(item => item.id === activeCharacterId) || null;
  }

  function voiceKey() { return VOICE_PREFIX + activeCharacterId; }
  function getSavedVoice() { try { return localStorage.getItem(voiceKey()) || ''; } catch (error) { return ''; } }
  function saveVoice(name) { try { localStorage.setItem(voiceKey(), name); } catch (error) {} }
  function saveVoiceState() { try { localStorage.setItem(AUTO_VOICE_KEY, voiceAuto ? '1' : '0'); } catch (error) {} }

  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = speechSynthesis.getVoices().slice().sort((a, b) => {
      const az = /^zh/i.test(a.lang) ? 0 : 1, bz = /^zh/i.test(b.lang) ? 0 : 1;
      return az - bz || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
    });
    renderVoices();
  }

  function renderVoices() {
    if (!voiceSelect) return;
    const saved = getSavedVoice();
    voiceSelect.replaceChildren();
    if (!voices.length) {
      const option = document.createElement('option');
      option.value = ''; option.textContent = '系统默认'; voiceSelect.appendChild(option); return;
    }
    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = (voice.name.length > 16 ? voice.name.slice(0, 16) + '…' : voice.name) + ' · ' + voice.lang;
      voiceSelect.appendChild(option);
      if ((saved && voice.name === saved) || (!saved && index === 0)) option.selected = true;
    });
  }

  function syncVoiceSelection() {
    if (!voiceSelect) return;
    const saved = getSavedVoice();
    if (saved && [...voiceSelect.options].some(option => option.value === saved)) voiceSelect.value = saved;
    if (voiceButton) {
      voiceButton.classList.toggle('active', voiceAuto);
      voiceButton.textContent = voiceAuto ? '🔊开' : '🔇关';
      voiceButton.setAttribute('aria-pressed', String(voiceAuto));
    }
  }

  function selectedVoice() {
    if (!voices.length) return null;
    const name = voiceSelect?.value || getSavedVoice();
    return voices.find(voice => voice.name === name) || voices.find(voice => /^zh/i.test(voice.lang)) || voices[0] || null;
  }

  function cleanSpeech(text) {
    return safe(text).replace(/\([^)]{0,40}\)/g, '').replace(/[\*_#>`~]/g, ' ').replace(/\s+/g, ' ').slice(0, 2400);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    presence?.idle();
    queuedVisemes = [];
    if (voiceNote?.textContent === '正在说话…') voiceNote.textContent = '';
  }

  function takeVisemes() {
    const cues = queuedVisemes;
    queuedVisemes = [];
    return cues;
  }

  // Only a real speech aligner may feed these cues. Browser TTS boundary events are deliberately
  // not converted into fake phonemes/visemes.
  window.setRoleVisemeTimeline = cues => {
    const normalized = window.RolePresence?.normalizeCues?.(cues) || [];
    queuedVisemes = normalized;
    if (presence?.state === 'speaking') presence.setVisemeTimeline(normalized);
    return normalized.length;
  };

  function speak(text, char, preview = false) {
    if (!voiceAuto && !preview) return;
    if (!('speechSynthesis' in window)) {
      if (voiceNote) voiceNote.textContent = '当前浏览器没有语音播放功能。';
      return;
    }
    const content = preview ? ('你好，我是' + (char?.name || '当前角色') + '。以后可以用这个声音和你聊天。') : cleanSpeech(text);
    if (!content) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    const voice = selectedVoice();
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; } else utterance.lang = 'zh-CN';
    utterance.rate = 1;
    utterance.pitch = char?.gender === 'male' ? .94 : char?.gender === 'female' ? 1.04 : 1;
    utterance.onstart = () => {
      presence?.speak({visemes: takeVisemes()});
      if (voiceNote) voiceNote.textContent = '正在说话…';
    };
    utterance.onend = utterance.onerror = () => {
      presence?.idle();
      queuedVisemes = [];
      if (voiceNote) voiceNote.textContent = '';
    };
    speechSynthesis.speak(utterance);
  }

  function installVoiceControls() {
    const tools = document.querySelector('.chat-tools');
    if (!tools || by('roleVoiceControls')) return;
    const wrap = document.createElement('div');
    wrap.id = 'roleVoiceControls'; wrap.className = 'role-voice-controls';
    const label = document.createElement('label');
    label.htmlFor = 'roleVoiceSelect'; label.textContent = '声音';
    voiceSelect = document.createElement('select');
    voiceSelect.id = 'roleVoiceSelect'; voiceSelect.className = 'role-voice-select'; voiceSelect.setAttribute('aria-label', '选择当前角色声音');
    voiceSelect.addEventListener('change', () => {
      saveVoice(voiceSelect.value);
      if (voiceAuto) speak('', currentChar(), true);
    });
    voiceButton = document.createElement('button');
    voiceButton.type = 'button'; voiceButton.className = 'role-voice-btn'; voiceButton.setAttribute('aria-label', '开启或关闭角色语音');
    voiceButton.addEventListener('click', () => {
      voiceAuto = !voiceAuto; saveVoiceState();
      if (!voiceAuto) stopSpeaking();
      syncVoiceSelection();
      if (voiceAuto) speak('', currentChar(), true);
    });
    micButton = document.createElement('button');
    micButton.type = 'button'; micButton.className = 'role-mic-btn'; micButton.textContent = '🎙 说话'; micButton.setAttribute('aria-label', '开始语音输入');
    micButton.addEventListener('click', toggleRecognition);
    wrap.append(label, voiceSelect, voiceButton, micButton);
    tools.appendChild(wrap);
    voiceNote = document.createElement('div');
    voiceNote.className = 'role-voice-note'; voiceNote.setAttribute('role', 'status');
    tools.insertAdjacentElement('afterend', voiceNote);
    if (!('speechSynthesis' in window)) { voiceSelect.disabled = true; voiceButton.disabled = true; }
    loadVoices();
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = loadVoices;
    syncVoiceSelection();
  }

  function recognitionCtor() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }
  function toggleRecognition() {
    const Ctor = recognitionCtor();
    if (!Ctor) { if (voiceNote) voiceNote.textContent = '当前浏览器不支持语音输入。'; return; }
    if (listening && recognition) { recognition.stop(); return; }
    stopSpeaking();
    recognition = new Ctor();
    const voice = selectedVoice();
    recognition.lang = voice?.lang || navigator.language || 'zh-CN';
    recognition.interimResults = true; recognition.continuous = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      listening = true; presence?.listen(); micButton?.classList.add('active');
      if (micButton) micButton.textContent = '■ 停止'; if (voiceNote) voiceNote.textContent = '正在听…';
    };
    recognition.onresult = event => {
      let final = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) final += text; else interim += text;
      }
      if (interim && by('userInput')) { by('userInput').value = interim; by('userInput').dispatchEvent(new Event('input', {bubbles:true})); }
      if (final && by('userInput')) {
        by('userInput').value = final.trim(); by('userInput').dispatchEvent(new Event('input', {bubbles:true}));
        setTimeout(() => { if (by('userInput').value.trim() && typeof handleSendMessage === 'function') handleSendMessage(); }, 120);
      }
    };
    recognition.onerror = event => { if (voiceNote) voiceNote.textContent = event.error === 'not-allowed' ? '需要允许麦克风权限才能语音聊天。' : '语音没有听清，请再试一次。'; };
    recognition.onend = () => {
      listening = false; presence?.idle(); micButton?.classList.remove('active');
      if (micButton) micButton.textContent = '🎙 说话'; if (voiceNote?.textContent === '正在听…') voiceNote.textContent = '';
    };
    try { recognition.start(); } catch (error) { presence?.idle(); if (voiceNote) voiceNote.textContent = '语音输入暂时无法启动。'; }
  }

  function patchCharacterSwitch() {
    if (typeof switchCharacter !== 'function' || switchCharacter.__liveStage) return;
    const base = switchCharacter;
    const wrapped = function(...args) {
      stopSpeaking();
      return base.apply(this, args);
    };
    wrapped.__liveStage = true; switchCharacter = wrapped;
  }

  function patchReplies() {
    if (typeof requestCharacterReply !== 'function' || requestCharacterReply.__liveVoice) return;
    const base = requestCharacterReply;
    const wrapped = async function(char, ...args) {
      const before = (chatHistories[char.id] || []).at(-1)?.id || '';
      presence?.think();
      try {
        const result = await base.call(this, char, ...args);
        const last = (chatHistories[char.id] || []).at(-1);
        if (last?.sender === 'bot' && last.id && last.id !== before) {
          if (voiceAuto) speak(last.text, char, false); else presence?.idle();
        } else presence?.idle();
        return result;
      } catch (error) {
        presence?.idle();
        throw error;
      }
    };
    wrapped.__liveVoice = true; requestCharacterReply = wrapped;
  }

  function removeLegacyFakeStage() {
    document.getElementById('roleLiveStage')?.remove();
    document.querySelector('.chat-main')?.classList.remove('role-live-enabled');
  }

  function boot() {
    if (typeof characters === 'undefined' || typeof switchCharacter !== 'function' || typeof requestCharacterReply !== 'function') return setTimeout(boot, 80);
    document.querySelectorAll('#siteUpdateNotice,.site-update').forEach(node => node.remove());
    removeLegacyFakeStage();
    patchCharacterSwitch(); patchReplies(); installVoiceControls();
    presence?.idle();
    window.__ROLE_VOICE_STAGE_VERSION = VERSION;
  }

  boot();
})();
