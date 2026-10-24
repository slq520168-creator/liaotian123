const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const helper=require('../docs/unified-mobile-qa-return.js');
const gate=require('../role-unified-production-gate.js');

function storage(value){return{getItem(key){return key===helper.RETURN_KEY?value:null;},removeItem(){}};}

test('QA return accepts only same-origin creator targets',()=>{
  const location={href:'https://sirole.vip/docs/unified-mobile-qa.html?return=1',origin:'https://sirole.vip'};
  assert.equal(helper.safeReturnTarget(location,storage('https://sirole.vip/?creator=1')),'https://sirole.vip/?creator=1');
  assert.equal(helper.safeReturnTarget(location,storage('https://evil.example/phish')),'');
});

test('QA return falls back to the same-origin root index when no creator target exists',()=>{
  const location={href:'https://sirole.vip/docs/unified-mobile-qa.html?return=1',origin:'https://sirole.vip'};
  assert.equal(helper.safeReturnTarget(location,storage('')),'https://sirole.vip/index.html');
  assert.equal(helper.shouldReturn(location),true);
  assert.equal(helper.shouldReturn({...location,href:'https://sirole.vip/docs/unified-mobile-qa.html'}),false);
});

test('creator gate has a stable bottom anchor and explicit ready labels',()=>{
  const actions={id:'actions'};
  assert.equal(gate.gateAnchor({querySelector(selector){return selector==='.creator-actions'?actions:null;}}),actions);
  const source=fs.readFileSync('role-unified-production-gate.js','utf8');
  assert(source.includes("'本机3D已解锁'"));
  assert(source.includes("'3D已正式启用'"));
  assert(source.includes("studio.insertBefore(row,actions)"));
});

test('mobile QA page loads the event-driven return helper without changing QA thresholds',()=>{
  const html=fs.readFileSync('docs/unified-mobile-qa.html','utf8');
  const qa=fs.readFileSync('docs/unified-mobile-qa.mjs','utf8');
  assert(html.includes('unified-mobile-qa-return.js?v=20261025-return1'));
  assert(qa.includes('avgFps>=30&&p95<=50&&contextLosses===0&&!visibilityInterrupted'));
  assert(qa.includes("sessionStorage.setItem('liaotian_unified_mobile_qa_v1'"));
});
