(() => {
  'use strict';
  // Authored displacement fields in the CC0 CharacterCreator's meter-space bind pose.
  // The same field is applied to body, clothes, hair and joint centers.
  const FIELDS=Object.freeze({waistSize:'腰围',hipSize:'髋宽',gluteVolume:'臀部体积',shoulderWidth:'肩宽',legVolume:'腿部丰满',legLength:'腿长'});
  const NAMES=Object.freeze(Object.keys(FIELDS).flatMap(key=>[`shape_${key}_min`,`shape_${key}_max`]));
  const prepared=new WeakSet(),jointCache=new WeakMap();
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const bell=(center,width,y)=>Math.exp(-Math.pow((y-center)/width,2)*2);
  function delta(key,x,y,z){
    switch(key){
      case'waistSize':{const w=bell(1.04,.17,y)*(1-smooth(.22,.32,Math.abs(x)));return [x*.22*w,0,(z+.015)*.16*w];}
      case'hipSize':return [x*.20*bell(.86,.20,y)*(1-smooth(.27,.34,Math.abs(x))),0,0];
      case'gluteVolume':return [0,0,-.035*bell(.82,.16,y)*(1-smooth(-.025,.035,z))*(1-smooth(.19,.29,Math.abs(x)))];
      case'shoulderWidth':{const side=Math.sign(x),arm=smooth(.20,.31,Math.abs(x)),shoulder=bell(1.32,.16,y);return [side*.028*Math.max(arm,shoulder*smooth(.025,.16,Math.abs(x))),0,0];}
      case'legVolume':{const w=bell(.55,.35,y),center=Math.sign(x)*(.105+Math.max(0,.86-y)*.085);return [(x-center)*.20*w,0,(z-.02)*.20*w];}
      case'legLength':return [0,.13*clamp(y-.07,0,.82),0];
      default:return [0,0,0];
    }
  }
  function walk(root,fn){root?.traverse?.(fn);}
  function prepare(root){
    let meshes=0,vertices=0;
    walk(root,mesh=>{
      const g=mesh.geometry,p=g?.attributes?.position;
      if(!mesh.isMesh||!p||!g.morphTargetsRelative||!mesh.morphTargetDictionary)return;
      if(prepared.has(mesh))return;
      const oldDictionary={...mesh.morphTargetDictionary},oldWeights=[...mesh.morphTargetInfluences];
      const entries=g.morphAttributes.position||[];
      // Clone before extending: GLTF primitives can share buffer geometry.
      mesh.geometry=g.clone();const geometry=mesh.geometry;
      const start=entries.length;geometry.morphAttributes.position=[...entries];
      const normal=g.attributes.normal,normalTargets=[...(g.morphAttributes.normal||[])];
      const normalEnabled=normal&&normalTargets.length===start;
      let index=start;
      for(const key of Object.keys(FIELDS))for(const sign of [-1,1]){
        const target=p.clone();target.name=`shape_${key}_${sign<0?'min':'max'}`;
        const normalTarget=normalEnabled?normal.clone():null;
        for(let i=0;i<p.count;i++){
          const x=p.getX(i),y=p.getY(i),z=p.getZ(i),d=delta(key,x,y,z);target.setXYZ(i,sign*d[0],sign*d[1],sign*d[2]);
          if(normalTarget){
            // Inverse-transpose Jacobian, preserving original smooth surface normals.
            const h=.0001,dx=delta(key,x+h,y,z),dy=delta(key,x,y+h,z),dz=delta(key,x,y,z+h);
            const a=1+sign*(dx[0]-d[0])/h,b=sign*(dy[0]-d[0])/h,c=sign*(dz[0]-d[0])/h;
            const e=sign*(dx[1]-d[1])/h,f=1+sign*(dy[1]-d[1])/h,j=sign*(dz[1]-d[1])/h;
            const k=sign*(dx[2]-d[2])/h,l=sign*(dy[2]-d[2])/h,m=1+sign*(dz[2]-d[2])/h;
            const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
            const vx=(f*m-j*l)*nx+(j*k-e*m)*ny+(e*l-f*k)*nz;
            const vy=(c*l-b*m)*nx+(a*m-c*k)*ny+(b*k-a*l)*nz;
            const vz=(b*j-c*f)*nx+(c*e-a*j)*ny+(a*f-b*e)*nz,length=Math.hypot(vx,vy,vz)||1;
            normalTarget.setXYZ(i,vx/length-nx,vy/length-ny,vz/length-nz);
          }
        }
        geometry.morphAttributes.position.push(target);if(normalTarget)normalTargets.push(normalTarget);
        oldDictionary[target.name]=index++;
      }
      if(normalEnabled)geometry.morphAttributes.normal=normalTargets;
      mesh.updateMorphTargets();mesh.morphTargetDictionary=oldDictionary;
      oldWeights.forEach((w,i)=>mesh.morphTargetInfluences[i]=w);
      geometry.computeBoundingBox();geometry.computeBoundingSphere();prepared.add(mesh);meshes++;vertices+=p.count;
    });
    return {meshes,vertices};
  }
  function extendJoints(joints){
    if(!joints?.bones||!joints?.morphs)return joints;if(jointCache.has(joints))return jointCache.get(joints);
    const morphs={...joints.morphs};for(const key of Object.keys(FIELDS))for(const sign of [-1,1]){
      const offsets={};for(const [name,p] of Object.entries(joints.bones))offsets[name]=delta(key,...p).map(x=>x*sign);
      morphs[`shape_${key}_${sign<0?'min':'max'}`]=offsets;
    }
    const result={...joints,morphs};jointCache.set(joints,result);return result;
  }
  const api=Object.freeze({FIELDS,NAMES,delta,prepare,extendJoints});
  if(typeof window!=='undefined')window.RoleParametricMorphs=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
