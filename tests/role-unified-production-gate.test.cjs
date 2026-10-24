const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const gate=require('../role-unified-production-gate.js');

function manifest(){
  return {
    schema:1,status:'candidate-only',license:'CC0',
    base:{url:'base_body.glb',bytes:9130596},
    modules:{
      hair:{short04:{url:'hair_short04.glb',bytes:1162528}},
      clothing:{
        briefs:{url:'clothing_briefs.glb',bytes:232840},tshirt:{url:'clothing_tshirt.glb',bytes:393364},
        hoodie:{url:'clothing_hoodie.glb',bytes:692092},jeans:{url:'clothing_jeans.glb',bytes:430856},
        shoes:{url:'clothing_shoes.glb',bytes:852980},panties:{url:'clothing_panties.glb',bytes:189600},bra:{url:'clothing_bra.glb',bytes:300072}
      }
    },
    safetyUnderwear:{male:['briefs'],female:['panties','bra']},
    capabilities:{skeleton:true,body:true,faceIdentity:true,expressions:true,visemes:true,hair:true,clothing:true,mobile:false},
    mobile:{validated:false}
  };
}
function proof(m=manifest()){
  const ids=['briefs','tshirt','hoodie','jeans','shoes'];
  const clothingBytes=ids.reduce((sum,id)=>sum+m.modules.clothing[id].bytes,0);
  return {
    schema:1,productionOrigin:'https://sirole.vip',mobileDevice:true,eligibleForMobilePromotion:true,performancePass:true,
    avgFps:48,p95FrameMs:28,contextLosses:0,visibilityInterrupted:false,
    device:{userAgent:'Mobile QA',platform:'iPhone'},
    candidate:{baseBytes:m.base.bytes,hairId:'short04',hairBytes:m.modules.hair.short04.bytes,clothingIds:ids,clothingBytes,
      visualProof:Object.fromEntries(ids.map(id=>[id,{pass:true}])),movedBones:64,expressionHits:{jaw:3,blinkL:3,blinkR:3}}
  };
}
const env={origin:'https://sirole.vip',userAgent:'Mobile QA',platform:'iPhone'};

test('candidate-only manifest never becomes globally production-ready from static budget alone',()=>{
  const result=gate.globalQualification(manifest());
  assert.equal(result.ok,false);assert.ok(result.reasons.includes('status'));assert.ok(result.reasons.includes('capability:mobile'));assert.ok(result.reasons.includes('mobile:validated'));
});

test('real same-device mobile QA can qualify only that device',()=>{
  const m=manifest(),result=gate.deviceQualification(m,proof(m),env);
  assert.equal(result.ok,true);
  const candidate=gate.candidateFrom(m,'device');
  assert.equal(candidate.status,'device-qualified');assert.equal(candidate.capabilities.mobile,true);assert.equal(candidate.capabilities.license,'CC0');
  assert.equal(candidate.descriptor.url,'assets/humans/unified/base_body.glb');
});

test('device proof is rejected after asset, device or visible-clothing mismatch',()=>{
  const m=manifest();
  const wrongDevice=proof(m);wrongDevice.device.userAgent='Other Phone';
  assert.equal(gate.deviceQualification(m,wrongDevice,env).ok,false);
  const wrongAsset=proof(m);wrongAsset.candidate.baseBytes++;
  assert.equal(gate.deviceQualification(m,wrongAsset,env).ok,false);
  const invisible=proof(m);invisible.candidate.visualProof.jeans.pass=false;
  assert.equal(gate.deviceQualification(m,invisible,env).ok,false);
});

test('production candidate still requires explicit global mobile validation',()=>{
  const m=manifest();m.status='production';m.capabilities.mobile=true;m.mobile.validated=true;
  assert.equal(gate.globalQualification(m).ok,true);
  assert.equal(gate.candidateFrom(m,'global').status,'production');
});

test('production config loads the gate but never directly bypasses it with custom chat runtime',()=>{
  const source=fs.readFileSync('config/app.js','utf8');
  assert(source.includes("'role-unified-production-gate.js'"));
  const injected=source.match(/for\(const src of \[([\s\S]*?)\]\)\{/m)?.[1]||'';
  assert(!injected.includes("'role-unified-custom-chat.js'"));
});

test('a verified session QA creates a persistent device-bound certificate that invalidates with assets',()=>{
  const m=manifest(),p=proof(m);
  const cert=gate.certificateFrom(m,p,env);
  assert.equal(gate.certificateQualification(m,cert,env).ok,true);
  const changed=manifest();changed.base.bytes++;
  assert.equal(gate.certificateQualification(changed,cert,env).ok,false);
});
