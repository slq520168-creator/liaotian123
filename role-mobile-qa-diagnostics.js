(() => {
  'use strict';

  const QA_KEY='liaotian_unified_mobile_qa_v1';
  const number=value=>Number.isFinite(Number(value))?Number(value):null;
  const unique=values=>[...new Set(values.filter(Boolean))];

  function readableError(value=''){
    const text=String(value||'').trim();
    if(!text)return'';
    const rules=[
      [/没有可用 WebGL2/i,'当前设备没有可用 WebGL2'],
      [/服装没有真实出现在画面中/i,'服装可见性未通过'],
      [/安全内衣没有真实遮住身体/i,'安全内衣可见性未通过'],
      [/服装表面防穿模处理未生效/i,'服装防穿模处理未通过'],
      [/服装模块没有可见几何体|服装模块尺寸异常/i,'服装几何体异常'],
      [/骨骼合同失败|moved<40/i,'骨骼动作合同未通过'],
      [/ARKit表情合同|ARKit 表情合同/i,'面部表情合同未通过'],
      [/有效帧样本不足/i,'性能采样帧数不足'],
      [/候选能力不完整/i,'3D候选能力合同不完整'],
      [/候选资产不是 CC0/i,'3D候选许可证未通过'],
      [/runtime 未加载/i,'3D运行时未加载'],
      [/joint sidecar|joints/i,'骨骼校正数据异常']
    ];
    for(const [pattern,label] of rules)if(pattern.test(text))return label;
    return text.length>80?`${text.slice(0,77)}…`:text;
  }

  function diagnose(result){
    if(!result||typeof result!=='object'||Array.isArray(result))return Object.freeze([]);
    const reasons=[];
    if(result.error)reasons.push(readableError(result.error));
    if(result.mobileDevice===false)reasons.push('当前测试没有识别为手机或平板');
    const fps=number(result.avgFps);if(fps!==null&&fps<30)reasons.push(`平均帧率 ${fps.toFixed(1)} FPS，要求 ≥30`);
    const p95=number(result.p95FrameMs);if(p95!==null&&p95>50)reasons.push(`P95 帧耗时 ${p95.toFixed(1)} ms，要求 ≤50`);
    const losses=number(result.contextLosses);if(losses!==null&&losses>0)reasons.push(`WebGL 上下文丢失 ${Math.round(losses)} 次，要求 0 次`);
    if(result.visibilityInterrupted===true)reasons.push('验收期间页面进入过后台或被隐藏');
    const moved=number(result.candidate?.movedBones);if(moved!==null&&moved<40)reasons.push(`有效骨骼仅 ${Math.round(moved)}，要求 ≥40`);
    const hits=result.candidate?.expressionHits;
    if(hits&&typeof hits==='object'){
      const jaw=number(hits.jaw),blinkL=number(hits.blinkL),blinkR=number(hits.blinkR);
      if((jaw!==null&&jaw<2)||(blinkL!==null&&blinkL<2)||(blinkR!==null&&blinkR<2))reasons.push('多网格面部表情没有完整连接');
    }
    const proof=result.candidate?.visualProof;
    if(proof&&typeof proof==='object'){
      const failed=Object.entries(proof).filter(([,metric])=>metric?.pass===false).map(([id])=>id);
      if(failed.length)reasons.push(`服装像素可见性未通过：${failed.join('、')}`);
    }
    if(result.eligibleForMobilePromotion===false&&!reasons.length)reasons.push('未满足本机3D晋级条件，请重新验收');
    return Object.freeze(unique(reasons));
  }

  function summary(result,max=3){
    const reasons=diagnose(result);if(!reasons.length)return'';
    const limit=Math.max(1,Math.min(6,Number(max)||3));
    const shown=reasons.slice(0,limit).join('；');
    return reasons.length>limit?`${shown}；另有 ${reasons.length-limit} 项未通过`:shown;
  }

  function read(storage){
    if(!storage?.getItem)return null;
    try{const raw=storage.getItem(QA_KEY);return raw?JSON.parse(raw):null;}catch{return null;}
  }

  const api=Object.freeze({QA_KEY,readableError,diagnose,summary,read});
  if(typeof window!=='undefined')window.RoleMobileQaDiagnostics=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
