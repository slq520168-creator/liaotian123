const test=require('node:test');
const assert=require('node:assert/strict');
const attach=require('../role-runtime-performance-attach.js');

test('existing primary renderer is attached immediately when engine and loop already exist',()=>{
  const instance={renderer:{},loop:{}};
  let calls=0;
  const win={RoleRuntimePerformanceBudget:{attach(value){calls++;assert.equal(value,instance);return {ok:true};}},__ROLE_HUMAN_RENDERER:instance};
  assert.equal(attach.attachExisting(win),true);
  assert.equal(calls,1);
});

test('existing renderer attachment stays closed until engine and loop are both available',()=>{
  let calls=0;
  const win={RoleRuntimePerformanceBudget:{attach(){calls++;return {};}} ,__ROLE_HUMAN_RENDERER:{renderer:{},loop:null}};
  assert.equal(attach.attachExisting(win),false);assert.equal(calls,0);
  win.__ROLE_HUMAN_RENDERER.loop={};
  assert.equal(attach.attachExisting(win),true);assert.equal(calls,1);
});

test('missing performance API never pretends attachment succeeded',()=>{
  assert.equal(attach.attachExisting({__ROLE_HUMAN_RENDERER:{renderer:{},loop:{}}}),false);
});
