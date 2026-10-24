(() => {
  'use strict';

  const normalizeBone=value=>String(value||'').replace(/^mixamorig[:_]?/i,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const restStates=new WeakMap();
  function walk(root,visit){if(!root||typeof visit!=='function')return;const stack=[root],seen=new Set();while(stack.length){const node=stack.pop();if(!node||seen.has(node))continue;seen.add(node);visit(node);const children=Array.isArray(node.children)?node.children:[];for(let i=children.length-1;i>=0;i--)stack.push(children[i]);}}
  function skinnedMeshes(root){const out=[];walk(root,node=>{if(node?.isSkinnedMesh&&node.skeleton)out.push(node);});return out;}
  function primarySkeleton(root){let best=null;for(const mesh of skinnedMeshes(root)){const count=Array.isArray(mesh.skeleton?.bones)?mesh.skeleton.bones.length:0;if(!best||count>best.count)best={skeleton:mesh.skeleton,mesh,count};}return best?Object.freeze(best):null;}
  function boneIndex(skeleton){const map=new Map();(skeleton?.bones||[]).forEach((bone,index)=>{const raw=String(bone?.name||'');if(raw&&!map.has(raw))map.set(raw,index);const norm=normalizeBone(raw);if(norm&&!map.has(norm))map.set(norm,index);});return map;}
  function buildBoneRemap(sourceSkeleton,targetSkeleton){const target=boneIndex(targetSkeleton),map=[],missing=[];for(const bone of sourceSkeleton?.bones||[]){const raw=String(bone?.name||''),index=target.get(raw)??target.get(normalizeBone(raw));if(!Number.isInteger(index))missing.push(raw||'<unnamed>');map.push(index);}return Object.freeze({map:Object.freeze(map),missing:Object.freeze(missing),compatible:missing.length===0});}
  function remapSkinIndexAttribute(attribute,remap){const values=attribute?.array;if(!values||!Array.isArray(remap)||!remap.length)return false;for(let i=0;i<values.length;i++){const source=Number(values[i]),target=remap[source];if(!Number.isInteger(target))throw new Error(`skin index ${source} has no target bone`);values[i]=target;}attribute.needsUpdate=true;return true;}
  function rebindMesh(mesh,targetSkeleton){if(!mesh?.isSkinnedMesh||!mesh.skeleton||!targetSkeleton)return Object.freeze({ok:false,missing:['<no skeleton>'],remapped:false});if(mesh.skeleton===targetSkeleton)return Object.freeze({ok:true,missing:[],remapped:false});const result=buildBoneRemap(mesh.skeleton,targetSkeleton);if(!result.compatible)return Object.freeze({ok:false,missing:[...result.missing],remapped:false});const skinIndex=mesh.geometry?.attributes?.skinIndex;if(!skinIndex)return Object.freeze({ok:false,missing:['<skinIndex>'],remapped:false});const changed=result.map.some((value,index)=>value!==index);if(changed)remapSkinIndexAttribute(skinIndex,result.map);if(typeof mesh.bind!=='function')return Object.freeze({ok:false,missing:['<bind>'],remapped:changed});mesh.bind(targetSkeleton,mesh.bindMatrix);return Object.freeze({ok:true,missing:[],remapped:changed});}

  function resetMorphWeights(root,preserve=[]){const keep=new Set(preserve||[]);let meshes=0,resets=0;walk(root,node=>{const dictionary=node?.morphTargetDictionary,influences=node?.morphTargetInfluences;if(!dictionary||!influences)return;meshes++;for(const [name,index] of Object.entries(dictionary)){if(keep.has(name)||!Number.isInteger(index)||index<0||index>=influences.length)continue;if(influences[index]!==0){influences[index]=0;resets++;}}});return Object.freeze({meshes,resets});}
  function applyMorphWeights(root,weights={},options={}){if(options?.reset===true)resetMorphWeights(root,options.preserve||[]);let meshes=0,assignments=0;walk(root,node=>{const dictionary=node?.morphTargetDictionary,influences=node?.morphTargetInfluences;if(!dictionary||!influences)return;meshes++;for(const [name,raw] of Object.entries(weights||{})){const index=dictionary[name];if(!Number.isInteger(index)||index<0||index>=influences.length)continue;influences[index]=Math.max(0,Math.min(1,Number(raw)||0));assignments++;}});return Object.freeze({meshes,assignments,applied:assignments>0});}

  function prepareModuleSurface(root,options={}){
    const distance=Math.max(0,Math.min(.012,Number(options.distance)||.004));
    const renderOrder=Math.max(1,Math.min(20,Math.round(Number(options.renderOrder)||4)));
    const bias=Math.max(-8,Math.min(-.25,Number(options.bias)||-2));
    const seenGeometry=new Set(),seenMaterial=new Set();let meshes=0,vertices=0,materials=0;
    walk(root,node=>{
      if(!node?.isMesh)return;
      meshes++;
      node.renderOrder=Math.max(Number(node.renderOrder)||0,renderOrder);
      const geometry=node.geometry,position=geometry?.attributes?.position,normal=geometry?.attributes?.normal;
      if(distance>0&&geometry&&position&&normal&&position.count===normal.count&&!seenGeometry.has(geometry)){
        seenGeometry.add(geometry);
        for(let i=0;i<position.count;i++)position.setXYZ(i,position.getX(i)+normal.getX(i)*distance,position.getY(i)+normal.getY(i)*distance,position.getZ(i)+normal.getZ(i)*distance);
        position.needsUpdate=true;
        geometry.computeBoundingBox?.();geometry.computeBoundingSphere?.();vertices+=position.count;
      }
      const list=Array.isArray(node.material)?node.material:(node.material?[node.material]:[]);
      for(const material of list){
        if(!material||seenMaterial.has(material))continue;
        seenMaterial.add(material);materials++;
        if('polygonOffset'in material){material.polygonOffset=true;material.polygonOffsetFactor=bias;material.polygonOffsetUnits=bias;}
        if('depthTest'in material)material.depthTest=true;
        material.needsUpdate=true;
      }
    });
    return Object.freeze({meshes,vertices,materials,distance,renderOrder,bias});
  }

  function moduleContract(baseRoot,moduleRoot,requiredMorphs=[]){const base=primarySkeleton(baseRoot);if(!base)return Object.freeze({ok:false,reason:'base-skeleton',meshes:0,missingBones:['<base skeleton>'],missingMorphs:[...requiredMorphs]});const meshes=skinnedMeshes(moduleRoot),missingBones=new Set(),missingMorphs=new Set();if(!meshes.length)return Object.freeze({ok:false,reason:'module-skeleton',meshes:0,missingBones:['<module skeleton>'],missingMorphs:[...requiredMorphs]});for(const mesh of meshes){const remap=buildBoneRemap(mesh.skeleton,base.skeleton);remap.missing.forEach(name=>missingBones.add(name));const dictionary=mesh.morphTargetDictionary||{};for(const name of requiredMorphs)if(!(name in dictionary))missingMorphs.add(name);}return Object.freeze({ok:missingBones.size===0&&missingMorphs.size===0,reason:'',meshes:meshes.length,missingBones:Object.freeze([...missingBones]),missingMorphs:Object.freeze([...missingMorphs])});}
  function attachModule(baseRoot,moduleRoot,weights={},requiredMorphs=[]){const contract=moduleContract(baseRoot,moduleRoot,requiredMorphs);if(!contract.ok)throw new Error(`unified module incompatible: bones=${contract.missingBones.join(',')} morphs=${contract.missingMorphs.join(',')}`);const base=primarySkeleton(baseRoot),bindings=[];for(const mesh of skinnedMeshes(moduleRoot)){const result=rebindMesh(mesh,base.skeleton);if(!result.ok)throw new Error(`unified module bind failed: ${result.missing.join(',')}`);bindings.push(result);}const isClothing=!requiredMorphs.some(name=>/^face_/.test(String(name||'')));const surface=isClothing?prepareModuleSurface(moduleRoot):null;const morphs=applyMorphWeights(moduleRoot,weights,{reset:true});if(typeof baseRoot?.add==='function')baseRoot.add(moduleRoot);return Object.freeze({ok:true,bindings:Object.freeze(bindings),morphs,surface,root:moduleRoot});}

  function topRoot(obj){let node=obj;while(node?.parent&&!node.parent.isScene)node=node.parent;return node;}
  function skeletonRestState(mesh){let state=restStates.get(mesh);if(state)return state;const sk=mesh?.skeleton,bones=sk?.bones||[];if(!bones.length)return null;const root=topRoot(mesh);root?.updateMatrixWorld?.(true);const Matrix4=root?.matrixWorld?.constructor;if(typeof Matrix4!=='function')return null;const rootInv=new Matrix4().copy(root.matrixWorld).invert(),byName=new Map();bones.forEach((b,i)=>{byName.set(String(b.name||''),i);byName.set(normalizeBone(b.name),i);});state={root,byName,pos:bones.map(b=>b.position.clone()),world:bones.map(b=>new Matrix4().multiplyMatrices(rootInv,b.matrixWorld)),inv:(sk.boneInverses||[]).map(m=>m.clone()),toParent:bones.map(b=>{if(!b.parent)return new Matrix4();const rel=new Matrix4().multiplyMatrices(rootInv,b.parent.matrixWorld);rel.setPosition(0,0,0);return rel.invert();})};restStates.set(mesh,state);return state;}
  function applySkeletonOffsets(baseRoot,joints,weights={}){const primary=primarySkeleton(baseRoot),mesh=primary?.mesh,sk=primary?.skeleton;if(!mesh||!sk||!joints?.morphs)return Object.freeze({moved:0,missingBones:[],appliedMorphs:0});const state=skeletonRestState(mesh);if(!state)return Object.freeze({moved:0,missingBones:['<matrix state>'],appliedMorphs:0});const bones=sk.bones,Vector=bones[0]?.position?.constructor;if(typeof Vector!=='function')return Object.freeze({moved:0,missingBones:['<vector>'],appliedMorphs:0});const delta=bones.map(()=>new Vector()),missing=new Set();let appliedMorphs=0;for(const [morph,raw] of Object.entries(weights||{})){const w=Math.max(0,Math.min(1,Number(raw)||0));if(!w)continue;const offsets=joints.morphs[morph];if(!offsets)continue;appliedMorphs++;for(const [name,d] of Object.entries(offsets)){const i=state.byName.get(name)??state.byName.get(normalizeBone(name));if(i===undefined){missing.add(name);continue;}delta[i].x+=w*d[0];delta[i].y+=w*d[1];delta[i].z+=w*d[2];}}
    const index=new Map(bones.map((b,i)=>[b,i])),tmp=new Vector();bones.forEach((b,i)=>{const parentIndex=index.get(b.parent);tmp.copy(delta[i]);if(parentIndex!==undefined)tmp.sub(delta[parentIndex]);tmp.applyMatrix4(state.toParent[i]);b.position.copy(state.pos[i]).add(tmp);});state.root?.updateMatrixWorld?.(true);const Matrix4=state.root?.matrixWorld?.constructor;if(typeof Matrix4==='function'&&sk.boneInverses?.length===bones.length){state.worldInv??=state.world.map(w=>w.clone().invert());const m=new Matrix4(),tr=new Matrix4();bones.forEach((b,i)=>{const d=delta[i];tr.makeTranslation(-d.x,-d.y,-d.z);m.copy(state.worldInv[i]).multiply(tr).multiply(state.world[i]).multiply(state.inv[i]);sk.boneInverses[i].copy(m);});}
    return Object.freeze({moved:bones.length,missingBones:Object.freeze([...missing]),appliedMorphs});}

  function applyCandidateState(baseRoot,moduleRoots=[],joints,weights={}){const morphs=applyMorphWeights(baseRoot,weights,{reset:true});const modules=[];for(const moduleRoot of moduleRoots||[])modules.push(applyMorphWeights(moduleRoot,weights,{reset:true}));const skeleton=applySkeletonOffsets(baseRoot,joints,weights);return Object.freeze({morphs,modules:Object.freeze(modules),skeleton});}

  const api=Object.freeze({normalizeBone,walk,skinnedMeshes,primarySkeleton,boneIndex,buildBoneRemap,remapSkinIndexAttribute,rebindMesh,resetMorphWeights,applyMorphWeights,prepareModuleSurface,moduleContract,attachModule,applySkeletonOffsets,applyCandidateState});
  if(typeof window!=='undefined')window.RoleUnifiedHumanRuntime=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
