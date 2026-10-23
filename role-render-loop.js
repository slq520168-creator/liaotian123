(() => {
  'use strict';

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function choosePixelRatio(options = {}) {
    const dpr = Math.max(1, finite(options.devicePixelRatio, 1));
    const memory = finite(options.memoryGB, 0);
    const cores = finite(options.cores, 0);
    let cap = 1.5;
    if ((memory > 0 && memory <= 4) || (cores > 0 && cores <= 4)) cap = 1.25;
    if ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 2)) cap = 1;
    return Math.min(dpr, cap);
  }

  function browserQuality() {
    return Object.freeze({
      pixelRatio: choosePixelRatio({
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        memoryGB: typeof navigator !== 'undefined' ? navigator.deviceMemory : 0,
        cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 0
      }),
      shadows: !(
        (typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
      )
    });
  }

  class RealtimeRenderLoop {
    constructor(options = {}) {
      if (typeof options.render !== 'function') throw new TypeError('render callback is required');
      this.render = options.render;
      this.sample = typeof options.sample === 'function' ? options.sample : (() => ({}));
      this.raf = typeof options.raf === 'function' ? options.raf : (callback => requestAnimationFrame(callback));
      this.caf = typeof options.caf === 'function' ? options.caf : (id => cancelAnimationFrame(id));
      this.isVisible = typeof options.isVisible === 'function' ? options.isVisible : (() => true);
      this.running = false;
      this.active = options.active !== false;
      this.frameId = 0;
      this.lastTime = 0;
      this.boundTick = time => this.tick(time);
    }

    tick(time = 0) {
      this.frameId = 0;
      if (!this.running) return;
      if (this.active && this.isVisible()) {
        const now = finite(time, 0);
        const delta = this.lastTime ? Math.max(0, Math.min(100, now - this.lastTime)) : 0;
        this.lastTime = now;
        this.render(this.sample(now), {time: now, delta});
      } else {
        this.lastTime = 0;
      }
      if (this.running) this.frameId = this.raf(this.boundTick);
    }

    start() {
      if (this.running) return this;
      this.running = true;
      this.lastTime = 0;
      this.frameId = this.raf(this.boundTick);
      return this;
    }

    stop() {
      if (!this.running) return this;
      this.running = false;
      if (this.frameId) this.caf(this.frameId);
      this.frameId = 0;
      this.lastTime = 0;
      return this;
    }

    setActive(active) {
      this.active = Boolean(active);
      if (!this.active) this.lastTime = 0;
      return this;
    }
  }

  function createBrowserLoop(render, options = {}) {
    const presence = options.presence || window.RolePresence?.getDefault?.();
    const loop = new RealtimeRenderLoop({
      render,
      sample: time => presence?.frame?.(time) || {},
      isVisible: () => document.visibilityState !== 'hidden' && !document.hidden
    });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' || document.hidden) loop.lastTime = 0;
    };
    document.addEventListener('visibilitychange', onVisibility, {passive:true});
    loop.dispose = () => {
      loop.stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    return loop;
  }

  const api = Object.freeze({choosePixelRatio, browserQuality, RealtimeRenderLoop, createBrowserLoop});
  if (typeof window !== 'undefined') window.RoleRenderLoop = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
