const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const helper=require('../docs/unified-mobile-qa-return.js');
const diagnostics=require('../role-mobile-qa-diagnostics.js');
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

test('diagnostics expose concrete performance and device failures without weakening thresholds',()=>{
  const result={mobileDevice:false,eligibleForMobilePromotion:false,performancePass:false,avgFps:24.4,p95FrameMs:72.1,contextLosses:1,visibilityInterrupted:true};
  const reasons=diagnostics.diagnose(result);
  assert(reasons.some(reason=>reason.includes('手机或平板')));
  assert(reasons.some(reason=>reason.includes('24.4 FPS')));
  assert(reasons.some(reason=>reason.includes('72.1 ms')));
  assert(reasons.some(reason=>reason.includes('上下文丢失 1 次')));
  assert(reasons.some(reason=>reason.includes('页面进入过后台')));
});

test('diagnostics translate asset-contract failures into usable local reasons',()=>{
  assert.equal(diagnostics.readableError('当前设备没有可用 WebGL2'),'当前设备没有可用 WebGL2');
  assert.equal(diagnostics.readableError('服装没有真实出现在画面中: hoodie (2/24)'),'服装可见性未通过');
  assert.equal(diagnostics.readableError('骨骼合同失败: moved<40'),'骨骼动作合同未通过');
});

test('creator gate model shows last local failure and ready labels',()=>{
  const pending=gate.gateEntryModel({ok:false},{mobileDevice:true,eligibleForMobilePromotion:false,avgFps:21,p95FrameMs:63},diagnostics);
  assert.equal(pending.ready,false);
  assert(pending.hint.includes('21.0 FPS'));
  assert(pending.hint.includes('63.0 ms'));
  assert.equal(gate.gateEntryModel({ok:true,qualification:'device'},null,diagnostics).status,'本机3D已解锁');
  assert.equal(gate.gateEntryModel({ok:true,qualification:'global'},null,diagnostics).status,'3D已正式启用');
});

test('creator gate observer is guarded against rebuilding its own existing row',()=>{
  const source=fs.readFileSync('role-unified-production-gate.js','utf8');
  assert(!source.includes('if(row)row.remove()'));
  assert(source.includes("if(row&&actions&&row.nextSibling===actions)return"));
  assert(source.includes("row?.dataset?.gateKey===model.key"));
});

test('mobile QA page loads diagnostics before return helper without changing QA thresholds',()=>{
  const html=fs.readFileSync('docs/unified-mobile-qa.html','utf8');
  const qa=fs.readFileSync('docs/unified-mobile-qa.mjs','utf8');
  assert(html.indexOf('../role-mobile-qa-diagnostics.js?v=20261025-diag1')<html.indexOf('unified-mobile-qa-return.js?v=20261025-return2'));
  assert(qa.includes('avgFps>=30&&p95<=50&&contextLosses===0&&!visibilityInterrupted'));
  assert(qa.includes("sessionStorage.setItem('liaotian_unified_mobile_qa_v1'"));
});
