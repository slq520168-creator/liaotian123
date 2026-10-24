import * as THREE from '../vendor/three/build/three.module.js';
import {GLTFLoader} from '../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/meshoptimizer/meshopt_decoder.mjs';

const ROOT='../assets/humans/unified/';
const WARMUP_MS=2000;
const SAMPLE_MS=8000;
const statusEl=document.getElementById('status');
const metricsEl=document.getElementById('metrics');
const canvas=document.getElementById('stage');
const runtime=window.RoleUnifiedHumanRuntime;
const quality=window.RoleRenderLoop?.browserQuality?.()||{pixelRatio:1,shadows:false};
const setStatus=(text,state='')=>{statusEl.textContent=text;document.body.dataset.state=state;};
const round=(value,digits=1)=>Number(Number(value||0).toFixed(digits));
const percentile=(values,p)=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1))];};
const isMobileDevice=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'')||((navigator.platform==='MacIntel'||navigator.platform==='MacPPC')&&(navigator.maxTouchPoints||0)>1);
const fetchJson=async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`${path} ${response.status}`);return response.json();};
const largestModule=(group={})=>Object.entries(group).sort((a,b)=>(b[1]?.bytes||0)-(a[1]?.bytes||0))[0]||null;
const requiredModule=(group,id,label)=>{const entry=group?.[id];if(!entry?.url)throw new Error(`候选缺少${label}: ${id}`);return [id,entry];};
const moduleUrl=entry=>`${ROOT}${entry?.[1]?.url||''}`;

function setExpression(root,name,value){
  let hits=0;
  runtime.walk(root,node=>{
    const index=node?.morphTargetDictionary?.[name];
    if(!Number.isInteger(index)||!Array.isArray(node.morphTargetInfluences))return;
    node.morphTargetInfluences[index]=value;
    hits++;
  });
  return hits;
}

function frameScene(camera,root){
  const box=new THREE.Box3().setFromObject(root);
  if(box.isEmpty())throw new Error('统一人体没有可渲染几何体');
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const visible=Math.max(size.y,size.x*1.25);
  const distance=Math.max(.8,visible/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)))*1.16);
  camera.position.set(center.x,center.y,center.z+distance);
  camera.lookAt(center);
  camera.near=Math.max(.01,distance/100);
  camera.far=Math.max(50,distance*10);
  camera.updateProjectionMatrix();
}

async function main(){
  if(!runtime?.attachModule||!runtime?.applyCandidateState)throw new Error('统一人体 runtime 未加载');
  setStatus('正在读取候选合同…','loading');
  const [manifest,joints]=await Promise.all([
    fetchJson(`${ROOT}unified-human-manifest.json`),
    fetchJson(`${ROOT}base_body.joints.json`)
  ]);
  const required=['skeleton','body','faceIdentity','expressions','visemes','hair','clothing'];
  const missingCaps=required.filter(name=>manifest?.capabilities?.[name]!==true);
  if(missingCaps.length)throw new Error(`候选能力不完整: ${missingCaps.join(',')}`);
  if(manifest?.license!=='CC0')throw new Error('候选资产不是 CC0');
  if(!Array.isArray(manifest?.safetyUnderwear?.male)||!manifest.safetyUnderwear.male.includes('briefs'))throw new Error('候选缺少男角色安全内衣合同');

  const context=canvas.getContext('webgl2',{alpha:true,antialias:quality.pixelRatio<=1.25,powerPreference:'high-performance'});
  if(!context)throw new Error('当前设备没有可用 WebGL2');
  let contextLosses=0;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLosses++;},{passive:false});
  await MeshoptDecoder.ready;
  const renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:quality.pixelRatio<=1.25,powerPreference:'high-performance'});
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=Boolean(quality.shadows);
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xf1edf0);
  const camera=new THREE.PerspectiveCamera(30,1,.01,100);
  scene.add(new THREE.HemisphereLight(0xffffff,0x756d78,2.1));
  const key=new THREE.DirectionalLight(0xffffff,2.3);key.position.set(2.5,4,4);key.castShadow=Boolean(quality.shadows);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffe8ef,1.2);fill.position.set(-3,2,2);scene.add(fill);
  const resize=()=>{const width=Math.max(1,canvas.clientWidth||innerWidth),height=Math.max(1,canvas.clientHeight||Math.round(innerHeight*.72));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};
  addEventListener('resize',resize,{passive:true});resize();

  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
  const hair=largestModule(manifest.modules?.hair);
  const outfit=[
    requiredModule(manifest.modules?.clothing,'briefs','安全内衣'),
    requiredModule(manifest.modules?.clothing,'hoodie','完整上装'),
    requiredModule(manifest.modules?.clothing,'jeans','完整下装'),
    requiredModule(manifest.modules?.clothing,'shoes','鞋')
  ];
  if(!hair)throw new Error('候选头发清单为空');
  setStatus('正在加载统一人体、头发、安全内衣和完整服装套装…','loading');
  const loadStart=performance.now();
  const [baseGltf,hairGltf,...outfitGltfs]=await Promise.all([
    loader.loadAsync(`${ROOT}${manifest.base.url}`),
    loader.loadAsync(moduleUrl(hair)),
    ...outfit.map(entry=>loader.loadAsync(moduleUrl(entry)))
  ]);
  const loadMs=performance.now()-loadStart;
  const base=baseGltf.scene;
  const outfitScenes=outfitGltfs.map(gltf=>gltf.scene);
  const modules=[hairGltf.scene,...outfitScenes];
  const identity={
    gender_male:.78,weight_max:.28,muscle_max:.34,height_tall:.2,
    face_nose_width_incr:.18,face_jaw_width_incr:.18,face_eye_size_incr:.12,
    face_forehead_incr:.08,face_ear_size_decr:.08
  };
  const hairRequired=['gender_female','gender_male','weight_min','weight_max','height_short','height_tall','face_forehead_decr','face_forehead_incr','face_ear_size_decr','face_ear_size_incr'];
  const clothingRequired=['gender_female','gender_male','weight_min','weight_max','height_short','height_tall'];
  runtime.attachModule(base,hairGltf.scene,identity,hairRequired);
  for(const sceneRoot of outfitScenes)runtime.attachModule(base,sceneRoot,identity,clothingRequired);
  const candidateState=runtime.applyCandidateState(base,modules,joints,identity);
  if(!candidateState.morphs?.applied)throw new Error('身份 morph 未实际应用');
  if(candidateState.skeleton?.moved<40||candidateState.skeleton?.missingBones?.length)throw new Error(`骨骼合同失败: ${candidateState.skeleton?.missingBones?.join(',')||'moved<40'}`);
  const visibleOutfit=outfitScenes.map((sceneRoot,index)=>{
    sceneRoot.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(sceneRoot);
    if(box.isEmpty())throw new Error(`服装模块没有可见几何体: ${outfit[index][0]}`);
    const size=box.getSize(new THREE.Vector3());
    if(size.lengthSq()<1e-6)throw new Error(`服装模块尺寸异常: ${outfit[index][0]}`);
    return {id:outfit[index][0],size:[round(size.x,3),round(size.y,3),round(size.z,3)]};
  });
  scene.add(base);base.updateMatrixWorld(true);frameScene(camera,base);resize();
  const expressionHits={jaw:setExpression(base,'jawOpen',0),blinkL:setExpression(base,'eyeBlinkLeft',0),blinkR:setExpression(base,'eyeBlinkRight',0),smileL:setExpression(base,'mouthSmileLeft',0),smileR:setExpression(base,'mouthSmileRight',0)};
  if(expressionHits.jaw<2||expressionHits.blinkL<2||expressionHits.blinkR<2)throw new Error('多网格 ARKit 表情合同未实际连接');

  setStatus('正在执行真实 WebGL2 稳定性采样…','loading');
  const start=performance.now();
  let previous=0,visibilityInterrupted=false;
  const deltas=[];
  const onVisibility=()=>{if(document.hidden)visibilityInterrupted=true;};
  document.addEventListener('visibilitychange',onVisibility,{passive:true});
  await new Promise((resolve,reject)=>{
    const tick=now=>{
      try{
        const elapsed=now-start;
        const phase=elapsed*.004;
        setExpression(base,'jawOpen',.08+Math.max(0,Math.sin(phase))*.34);
        const blink=Math.pow(Math.max(0,Math.sin(phase*.41)),18)*.9;
        setExpression(base,'eyeBlinkLeft',blink);setExpression(base,'eyeBlinkRight',blink);
        const smile=.12+Math.max(0,Math.sin(phase*.23))*.2;
        setExpression(base,'mouthSmileLeft',smile);setExpression(base,'mouthSmileRight',smile);
        renderer.render(scene,camera);
        if(elapsed>=WARMUP_MS&&previous>0)deltas.push(Math.min(1000,Math.max(0,now-previous)));
        previous=now;
        if(elapsed>=WARMUP_MS+SAMPLE_MS)return resolve();
        requestAnimationFrame(tick);
      }catch(error){reject(error);}
    };
    requestAnimationFrame(tick);
  });
  document.removeEventListener('visibilitychange',onVisibility);
  if(deltas.length<60)throw new Error(`有效帧样本不足: ${deltas.length}`);
  const mean=deltas.reduce((sum,value)=>sum+value,0)/deltas.length;
  const avgFps=1000/mean,p95=percentile(deltas,.95),p99=percentile(deltas,.99);
  const mobileDevice=isMobileDevice();
  const performancePass=avgFps>=30&&p95<=50&&contextLosses===0&&!visibilityInterrupted;
  const outfitBytes=outfit.reduce((sum,entry)=>sum+Number(entry?.[1]?.bytes||0),0);
  const result={
    schema:1,
    testedAt:new Date().toISOString(),
    productionOrigin:location.origin,
    manifestStatus:manifest.status,
    manifestMobileValidated:Boolean(manifest.mobile?.validated),
    mobileDevice,
    eligibleForMobilePromotion:Boolean(mobileDevice&&performancePass),
    performancePass,
    avgFps:round(avgFps),p95FrameMs:round(p95),p99FrameMs:round(p99),samples:deltas.length,
    loadMs:round(loadMs),contextLosses,visibilityInterrupted,
    device:{userAgent:navigator.userAgent,platform:navigator.platform||'',touchPoints:navigator.maxTouchPoints||0,devicePixelRatio:window.devicePixelRatio||1,renderPixelRatio:quality.pixelRatio,memoryGB:navigator.deviceMemory||null,cores:navigator.hardwareConcurrency||null,viewport:[innerWidth,innerHeight]},
    candidate:{baseBytes:manifest.base.bytes,hairId:hair[0],hairBytes:hair[1].bytes,clothingId:outfit[0][0],clothingIds:outfit.map(entry=>entry[0]),clothingBytes:outfitBytes,visibleOutfit,movedBones:candidateState.skeleton.moved,appliedJointMorphs:candidateState.skeleton.appliedMorphs,expressionHits},
    rendererInfo:{geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls},
    thresholds:{minAverageFps:30,maxP95FrameMs:50,maxContextLosses:0}
  };
  window.__UNIFIED_MOBILE_QA_RESULT=Object.freeze(result);
  try{sessionStorage.setItem('liaotian_unified_mobile_qa_v1',JSON.stringify(result));}catch{}
  metricsEl.textContent=JSON.stringify(result,null,2);
  setStatus(result.eligibleForMobilePromotion?'真机候选通过：可作为移动端晋级证据':'候选已跑完：未满足移动端晋级条件',result.eligibleForMobilePromotion?'pass':'fail');
}

main().catch(error=>{
  const result={schema:1,testedAt:new Date().toISOString(),mobileDevice:isMobileDevice(),eligibleForMobilePromotion:false,error:String(error?.message||error)};
  window.__UNIFIED_MOBILE_QA_RESULT=Object.freeze(result);
  try{sessionStorage.setItem('liaotian_unified_mobile_qa_v1',JSON.stringify(result));}catch{}
  metricsEl.textContent=JSON.stringify(result,null,2);
  setStatus(`候选 QA 失败：${result.error}`,'fail');
});
