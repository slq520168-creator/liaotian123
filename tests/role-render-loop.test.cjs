const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mod = require(path.join('..', 'role-render-loop.js'));

test('pixel ratio is capped at 1.5 on capable devices', () => {
  assert.equal(mod.choosePixelRatio({devicePixelRatio:3, memoryGB:8, cores:8}), 1.5);
});

test('low-end devices fall back to 1.0 DPR', () => {
  assert.equal(mod.choosePixelRatio({devicePixelRatio:3, memoryGB:2, cores:8}), 1);
  assert.equal(mod.choosePixelRatio({devicePixelRatio:3, memoryGB:8, cores:2}), 1);
});

test('mid devices cap at 1.25 DPR', () => {
  assert.equal(mod.choosePixelRatio({devicePixelRatio:3, memoryGB:4, cores:6}), 1.25);
});

test('start is idempotent and creates only one RAF chain', () => {
  let calls = 0, scheduled = [];
  const loop = new mod.RealtimeRenderLoop({
    render: () => { calls++; },
    raf: cb => { scheduled.push(cb); return scheduled.length; },
    caf: () => {}
  });
  loop.start(); loop.start();
  assert.equal(scheduled.length, 1);
  scheduled.shift()(16);
  assert.equal(calls, 1);
  assert.equal(scheduled.length, 1);
});

test('hidden/inactive frames do not render but loop remains resumable', () => {
  let visible = false, renders = 0, queue = [];
  const loop = new mod.RealtimeRenderLoop({
    render: () => { renders++; },
    isVisible: () => visible,
    raf: cb => { queue.push(cb); return queue.length; },
    caf: () => {}
  });
  loop.start();
  queue.shift()(16);
  assert.equal(renders, 0);
  visible = true;
  queue.shift()(32);
  assert.equal(renders, 1);
  loop.setActive(false);
  queue.shift()(48);
  assert.equal(renders, 1);
  loop.setActive(true);
  queue.shift()(64);
  assert.equal(renders, 2);
});

test('stop cancels the active frame and prevents further render', () => {
  let cancelled = 0, queue = [];
  const loop = new mod.RealtimeRenderLoop({
    render: () => { throw new Error('should not render'); },
    raf: cb => { queue.push(cb); return 9; },
    caf: id => { cancelled = id; }
  });
  loop.start();
  loop.stop();
  assert.equal(cancelled, 9);
  queue.shift()(16);
  assert.equal(loop.running, false);
});
