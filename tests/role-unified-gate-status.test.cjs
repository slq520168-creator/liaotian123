const test=require('node:test');
const assert=require('node:assert/strict');
const chatMode=require('../role-chat-mode.js');
const unified=require('../role-unified-custom-chat.js');

function withWindow(value,run){
  const had=Object.prototype.hasOwnProperty.call(global,'window');
  const previous=global.window;
  global.window=value;
  try{return run(value);}finally{if(had)global.window=previous;else delete global.window;}
}
function customChar(){return {id:'custom_gate_test',isPreset:false};}

test('directly loading unified custom runtime cannot bypass the production gate',()=>{
  withWindow({},()=>{
    const char=customChar();
    assert.equal(unified.gateQualification(),'');
    assert.equal(unified.decorate(char),false);
    assert.equal(char.humanAsset,undefined);
    assert.equal(char.humanAssetStatus,undefined);
    assert.equal(chatMode.isProductionReady(char),false);
  });
});

test('real device qualification maps to device-qualified and is accepted only while that gate is valid',()=>{
  withWindow({__ROLE_UNIFIED_PRODUCTION_GATE_RESULT:{ok:true,qualification:'device'}},win=>{
    const char=customChar();
    assert.equal(unified.decorate(char),true);
    assert.equal(char.humanAssetId,'unified-charactercreator');
    assert.equal(char.humanAssetStatus,'device-qualified');
    assert.equal(char.humanAssetQualification,'device');
    assert.equal(chatMode.isProductionReady(char),true);
    win.__ROLE_UNIFIED_PRODUCTION_GATE_RESULT={ok:false,qualification:'device'};
    assert.equal(chatMode.isProductionReady(char),false);
  });
});

test('globally validated qualification maps to production status',()=>{
  withWindow({__ROLE_UNIFIED_PRODUCTION_GATE_RESULT:{ok:true,qualification:'global'}},()=>{
    const char=customChar();
    assert.equal(unified.decorate(char),true);
    assert.equal(char.humanAssetStatus,'production');
    assert.equal(char.humanAssetQualification,'global');
    assert.equal(chatMode.isProductionReady(char),true);
  });
});

test('unknown qualification stays closed instead of inventing a usable status',()=>{
  withWindow({__ROLE_UNIFIED_PRODUCTION_GATE_RESULT:{ok:true,qualification:'static-budget'}},()=>{
    const char=customChar();
    assert.equal(unified.statusForQualification('static-budget'),'unified-static');
    assert.equal(unified.decorate(char),false);
    assert.equal(chatMode.isProductionReady(char),false);
  });
});
