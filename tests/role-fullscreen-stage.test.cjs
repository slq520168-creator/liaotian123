const test = require('node:test');
const assert = require('node:assert/strict');
const stage = require('../role-fullscreen-stage.js');

test('fullscreen 3D stage is layered under chat instead of occupying message flow', () => {
  assert.match(stage.FULLSCREEN_CSS, /\.chat-main>\.role-human-stage/);
  assert.match(stage.FULLSCREEN_CSS, /position:absolute!important/);
  assert.match(stage.FULLSCREEN_CSS, /\.role-human-stage\.active~\.messages-container/);
  assert.match(stage.FULLSCREEN_CSS, /background:transparent!important/);
  assert.match(stage.FULLSCREEN_CSS, /\.role-human-stage\.active~\.input-container/);
});

test('mountStage moves the renderer stage into chat-main and keeps latest messages visible', () => {
  const oldParent = {};
  const stageNode = {parentElement: oldParent};
  const messages = {scrollTop: 0, scrollHeight: 900};
  const main = {
    prepended: null,
    prepend(node) {
      this.prepended = node;
      node.parentElement = this;
    }
  };
  const doc = {
    querySelector(selector) { return selector === '.chat-main' ? main : null; },
    getElementById(id) { return id === 'messagesContainer' ? messages : id === 'roleHumanStage' ? stageNode : null; }
  };
  let resized = 0;
  const renderer = {stage: stageNode, resize() { resized++; }};
  assert.equal(stage.mountStage(renderer, doc), true);
  assert.equal(main.prepended, stageNode);
  assert.equal(stageNode.parentElement, main);
  assert.equal(messages.scrollTop, 900);
  assert.equal(resized, 1);
});
