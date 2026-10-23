(() => {
  'use strict';

  const STATES = Object.freeze(['idle', 'listening', 'thinking', 'speaking']);
  const VISEMES = Object.freeze([
    'sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','ih','oh','ou'
  ]);

  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function blankVisemes() {
    return Object.fromEntries(VISEMES.map(name => [name, 0]));
  }

  function normalizeCues(cues) {
    if (!Array.isArray(cues)) return [];
    return cues.map((cue, index) => {
      const startMs = Math.max(0, finite(cue?.startMs, finite(cue?.start, 0)));
      const endMs = Math.max(startMs, finite(cue?.endMs, finite(cue?.end, startMs)));
      const viseme = VISEMES.includes(cue?.viseme) ? cue.viseme : '';
      if (!viseme || endMs <= startMs) return null;
      return {startMs, endMs, viseme, index};
    }).filter(Boolean).sort((a, b) => a.startMs - b.startMs || a.index - b.index)
      .map(({startMs, endMs, viseme}) => ({startMs, endMs, viseme}));
  }

  class PresenceController {
    constructor(options = {}) {
      this.state = 'idle';
      this.stateSince = finite(options.now?.(), Date.now());
      this.now = typeof options.now === 'function' ? options.now : () => performance?.now?.() ?? Date.now();
      this.random = typeof options.random === 'function' ? options.random : Math.random;
      this.listeners = new Set();
      this.visemeCues = [];
      this.speechStartedAt = 0;
      this.nextBlinkAt = 0;
      this.blinkStartedAt = -1;
      this.seedBlink(this.stateSince);
    }

    seedBlink(now = this.now()) {
      this.nextBlinkAt = now + 2200 + this.random() * 3600;
    }

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    emit(type = 'state') {
      const detail = {type, state: this.state, at: this.now()};
      this.listeners.forEach(listener => {
        try { listener(detail); } catch (error) {}
      });
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('rolepresencechange', {detail}));
      }
    }

    setState(next) {
      if (!STATES.includes(next)) throw new TypeError(`Unsupported presence state: ${next}`);
      if (this.state === next) return this;
      this.state = next;
      this.stateSince = this.now();
      if (next !== 'speaking') {
        this.visemeCues = [];
        this.speechStartedAt = 0;
      }
      this.emit('state');
      return this;
    }

    idle() { return this.setState('idle'); }
    listen() { return this.setState('listening'); }
    think() { return this.setState('thinking'); }

    speak(options = {}) {
      this.state = 'speaking';
      this.stateSince = this.now();
      this.speechStartedAt = this.stateSince;
      this.visemeCues = normalizeCues(options.visemes || options.cues || []);
      this.emit('state');
      return this;
    }

    setVisemeTimeline(cues) {
      this.visemeCues = normalizeCues(cues);
      if (this.state === 'speaking' && !this.speechStartedAt) this.speechStartedAt = this.now();
      this.emit('visemes');
      return this.visemeCues.slice();
    }

    clearSpeech() {
      this.visemeCues = [];
      this.speechStartedAt = 0;
      return this;
    }

    sampleVisemes(now = this.now()) {
      const weights = blankVisemes();
      if (this.state !== 'speaking' || !this.visemeCues.length || !this.speechStartedAt) return weights;
      const elapsed = Math.max(0, now - this.speechStartedAt);
      const feather = 42;
      for (const cue of this.visemeCues) {
        if (elapsed < cue.startMs - feather || elapsed > cue.endMs + feather) continue;
        const fadeIn = clamp01((elapsed - (cue.startMs - feather)) / feather);
        const fadeOut = clamp01(((cue.endMs + feather) - elapsed) / feather);
        const core = elapsed >= cue.startMs && elapsed <= cue.endMs ? 1 : Math.min(fadeIn, fadeOut);
        weights[cue.viseme] = Math.max(weights[cue.viseme], clamp01(core));
      }
      return weights;
    }

    sampleBlink(now = this.now()) {
      if (this.blinkStartedAt < 0 && now >= this.nextBlinkAt) this.blinkStartedAt = now;
      if (this.blinkStartedAt < 0) return 0;
      const elapsed = now - this.blinkStartedAt;
      const duration = 170;
      if (elapsed >= duration) {
        this.blinkStartedAt = -1;
        this.seedBlink(now);
        return 0;
      }
      const half = duration / 2;
      return elapsed <= half ? clamp01(elapsed / half) : clamp01((duration - elapsed) / half);
    }

    frame(now = this.now()) {
      const elapsed = Math.max(0, now - this.stateSince);
      const speaking = this.state === 'speaking';
      const listening = this.state === 'listening';
      const thinking = this.state === 'thinking';
      const breathAmp = speaking ? 0.0018 : 0.003;
      const motionAmp = speaking ? 0.012 : listening ? 0.007 : thinking ? 0.009 : 0.004;
      return Object.freeze({
        state: this.state,
        visemes: this.sampleVisemes(now),
        blink: this.sampleBlink(now),
        breathing: Math.sin(elapsed / 1150 * Math.PI * 2) * breathAmp,
        headYaw: Math.sin(elapsed / 2600) * motionAmp,
        headPitch: Math.sin(elapsed / 3200 + 0.7) * motionAmp * 0.55,
        gazeX: Math.sin(elapsed / 4100 + 1.2) * (listening ? 0.012 : 0.018),
        gazeY: Math.sin(elapsed / 5100 + 0.4) * 0.008,
        gestureEnergy: speaking ? 0.22 : listening ? 0.06 : thinking ? 0.08 : 0.025
      });
    }
  }

  let defaultController = null;
  const api = Object.freeze({
    STATES, VISEMES, normalizeCues, blankVisemes,
    PresenceController,
    getDefault() {
      if (!defaultController) defaultController = new PresenceController();
      return defaultController;
    }
  });

  if (typeof window !== 'undefined') window.RolePresence = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
