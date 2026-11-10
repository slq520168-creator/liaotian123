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

  // --- Natural motion target system ---
  // Each micro-motion channel picks random target values and smoothly
  // interpolates toward them over a random duration, then picks a new
  // target. This replaces the old fixed-period Math.sin wave with
  // organic, non-repeating movement.

  function makeTargetChannel(pickNew) {
    return { current: 0, target: 0, from: 0, startMs: 0, durationMs: 1, active: false };
  }

  function tickChannel(ch, now, rng, config) {
    if (!ch.active || now >= ch.startMs + ch.durationMs) {
      ch.from = ch.current;
      ch.target = config.pickTarget(rng);
      ch.startMs = now;
      ch.durationMs = config.minMs + rng() * (config.maxMs - config.minMs);
      ch.active = true;
    }
    const t = clamp01((now - ch.startMs) / ch.durationMs);
    // Smoothstep easing for natural acceleration/deceleration
    const eased = t * t * (3 - 2 * t);
    ch.current = ch.from + (ch.target - ch.from) * eased;
    return ch.current;
  }

  // Breathing: asymmetric inhale (faster) / exhale (slower) with
  // randomized amplitude so each breath feels different.
  function breathe(now, baseAmp, rng, breathState) {
    const cycle = breathState.cycleMs;
    if (cycle <= 0 || now >= breathState.cycleStart + cycle) {
      breathState.cycleStart = now;
      breathState.cycleMs = 2800 + rng() * 1400; // 2.8-4.2s per breath
      breathState.amp = baseAmp * (0.7 + rng() * 0.6); // ±30% amplitude variation
      breathState.inhaleRatio = 0.38 + rng() * 0.12; // inhale ~38-50% of cycle
    }
    const phase = (now - breathState.cycleStart) / breathState.cycleMs;
    const inhaleEnd = breathState.inhaleRatio;
    let value;
    if (phase < inhaleEnd) {
      // Inhale: quick rise using smoothstep
      const t = phase / inhaleEnd;
      value = t * t * (3 - 2 * t);
    } else {
      // Exhale: slow fall using smoothstep
      const t = (phase - inhaleEnd) / (1 - inhaleEnd);
      value = 1 - t * t * (3 - 2 * t);
    }
    return value * breathState.amp;
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
      // Natural motion channels with random target points
      this._chHeadYaw = makeTargetChannel();
      this._chHeadPitch = makeTargetChannel();
      this._chGazeX = makeTargetChannel();
      this._chGazeY = makeTargetChannel();
      this._chMicroSmile = makeTargetChannel();
      this._breathState = { cycleStart: 0, cycleMs: 0, amp: 0, inhaleRatio: 0.42 };
      this.seedBlink(this.stateSince);
    }

    seedBlink(now = this.now()) {
      // Speaking increases blink frequency; idle is more relaxed
      const base = this.state === 'speaking' ? 1400 : 2200;
      const range = this.state === 'speaking' ? 2600 : 3600;
      this.nextBlinkAt = now + base + this.random() * range;
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
      // Re-seed blink timing to match new state's frequency
      this.seedBlink(this.stateSince);
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
      const rng = this.random;

      // Natural breathing: asymmetric inhale/exhale with randomized amplitude
      const breathAmp = speaking ? 0.0018 : listening ? 0.0028 : thinking ? 0.0025 : 0.003;
      const breathing = breathe(now, breathAmp, rng, this._breathState);

      // Random target-point micro motion for head and gaze
      // Each channel picks a new random target every 2-6s and smoothly
      // interpolates toward it, producing organic non-repeating movement.
      const headYaw = tickChannel(this._chHeadYaw, now, rng, {
        minMs: 2000, maxMs: 5500,
        pickTarget: r => (r() - 0.5) * 2 * (speaking ? 0.012 : listening ? 0.007 : thinking ? 0.009 : 0.004)
      });
      const headPitch = tickChannel(this._chHeadPitch, now, rng, {
        minMs: 2500, maxMs: 6000,
        pickTarget: r => (r() - 0.5) * 2 * (speaking ? 0.007 : listening ? 0.004 : thinking ? 0.005 : 0.0025)
      });
      const gazeX = tickChannel(this._chGazeX, now, rng, {
        minMs: 1500, maxMs: 4500,
        pickTarget: r => (r() - 0.5) * 2 * (listening ? 0.012 : 0.018)
      });
      const gazeY = tickChannel(this._chGazeY, now, rng, {
        minMs: 1800, maxMs: 5000,
        pickTarget: r => (r() - 0.5) * 2 * 0.008
      });

      // Subtle micro-smile that drifts in and out naturally
      const microSmile = tickChannel(this._chMicroSmile, now, rng, {
        minMs: 4000, maxMs: 9000,
        pickTarget: r => r() * (speaking ? 0.04 : listening ? 0.025 : 0.015)
      });

      return Object.freeze({
        state: this.state,
        visemes: this.sampleVisemes(now),
        blink: this.sampleBlink(now),
        breathing,
        headYaw,
        headPitch,
        gazeX,
        gazeY,
        microSmile,
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
