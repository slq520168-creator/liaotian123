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

test('mountStage moves only the primary renderer stage into chat-main and keeps latest messages visible', () => {
  const oldParent = {};
  const stageNode = {id:'roleHumanStage',parentElement: oldParent};
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
  const renderer = {container:null,stage: stageNode, resize() { resized++; }};
  assert.equal(stage.isPrimaryRenderer(renderer,stageNode),true);
  assert.equal(stage.mountStage(renderer, doc), true);
  assert.equal(main.prepended, stageNode);
  assert.equal(stageNode.parentElement, main);
  assert.equal(messages.scrollTop, 900);
  assert.equal(resized, 1);
});

test('creator preview renderer with explicit container is never hijacked by fullscreen stage', () => {
  const previewContainer={id:'roleCreator3dPreviewCanvas'};
  const previewStage={id:'roleHumanStage',parentElement:previewContainer};
  const main={prepended:null,prepend(node){this.prepended=node;node.parentElement=this;}};
  const doc={querySelector(selector){return selector==='.chat-main'?main:null;},getElementById(){return null;}};
  let resized=0;
  const renderer={container:previewContainer,stage:previewStage,resize(){resized++;}};
  assert.equal(stage.isPrimaryRenderer(renderer,previewStage),false);
  assert.equal(stage.mountStage(renderer,doc),false);
  assert.equal(main.prepended,null);
  assert.equal(previewStage.parentElement,previewContainer);
  assert.equal(resized,0);
});

test('non-primary stage ids are not moved even without an explicit renderer container', () => {
  const customStage={id:'roleCreatorPreviewStage',parentElement:{}};
  const main={prepended:null,prepend(node){this.prepended=node;}};
  const doc={querySelector(selector){return selector==='.chat-main'?main:null;},getElementById(){return null;}};
  const renderer={container:null,stage:customStage,resize(){throw new Error('must not resize non-primary stage');}};
  assert.equal(stage.isPrimaryRenderer(renderer,customStage),false);
  assert.equal(stage.mountStage(renderer,doc),false);
  assert.equal(main.prepended,null);
});
