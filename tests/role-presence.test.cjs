const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const presenceApi = require(path.join('..', 'role-presence.js'));

function makeClock(start = 1000) {
  let now = start;
  return { now: () => now, set: value => { now = value; }, add: value => { now += value; } };
}

test('idle starts with every viseme at zero', () => {
  const clock = makeClock();
  const controller = new presenceApi.PresenceController({now: clock.now, random: () => .5});
  const frame = controller.frame();
  assert.equal(frame.state, 'idle');
  assert.ok(Object.values(frame.visemes).every(value => value === 0));
});

test('speaking without real timing data never invents mouth movement', () => {
  const clock = makeClock();
  const controller = new presenceApi.PresenceController({now: clock.now, random: () => .5});
  controller.speak({visemes: []});
  clock.add(500);
  assert.equal(controller.state, 'speaking');
  assert.ok(Object.values(controller.frame().visemes).every(value => value === 0));
});

test('real viseme timeline drives only declared cues', () => {
  const clock = makeClock();
  const controller = new presenceApi.PresenceController({now: clock.now, random: () => .5});
  controller.speak({visemes: [
    {startMs: 100, endMs: 220, viseme: 'PP'},
    {startMs: 220, endMs: 420, viseme: 'aa'}
  ]});
  clock.add(160);
  const first = controller.frame().visemes;
  assert.ok(first.PP > .9);
  assert.equal(first.aa, 0);
  clock.add(170);
  const second = controller.frame().visemes;
  assert.ok(second.aa > .9);
});

test('ending speech returns to idle and clears all visemes', () => {
  const clock = makeClock();
  const controller = new presenceApi.PresenceController({now: clock.now, random: () => .5});
  controller.speak({visemes: [{startMs:0,endMs:500,viseme:'aa'}]});
  clock.add(100);
  assert.ok(controller.frame().visemes.aa > 0);
  controller.idle();
  const frame = controller.frame();
  assert.equal(frame.state, 'idle');
  assert.ok(Object.values(frame.visemes).every(value => value === 0));
});

test('listen interrupts speech and clears queued articulation', () => {
  const clock = makeClock();
  const controller = new presenceApi.PresenceController({now: clock.now, random: () => .5});
  controller.speak({visemes: [{startMs:0,endMs:500,viseme:'PP'}]});
  controller.listen();
  assert.equal(controller.state, 'listening');
  assert.deepEqual(controller.visemeCues, []);
  assert.ok(Object.values(controller.frame().visemes).every(value => value === 0));
});

test('bad or unknown cues are rejected instead of mapped to fake visemes', () => {
  assert.deepEqual(presenceApi.normalizeCues([
    {startMs:0,endMs:100,viseme:'made-up'},
    {startMs:100,endMs:100,viseme:'PP'},
    {startMs:120,endMs:240,viseme:'FF'}
  ]), [{startMs:120,endMs:240,viseme:'FF'}]);
});

test('micro movement frame stays subtle and bounded', () => {
  const clock = makeClock();
  const controller = new presenceApi.PresenceController({now: clock.now, random: () => .5});
  controller.listen();
  clock.add(1400);
  const frame = controller.frame();
  assert.ok(Math.abs(frame.headYaw) <= .02);
  assert.ok(Math.abs(frame.headPitch) <= .02);
  assert.ok(Math.abs(frame.gazeX) <= .03);
  assert.ok(Math.abs(frame.gazeY) <= .02);
  assert.ok(frame.blink >= 0 && frame.blink <= 1);
});
