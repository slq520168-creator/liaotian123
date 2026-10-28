(() => {
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
 function wave(x,y,z,amount){const t=clamp((1.53-y)/.28),a=amount*.018*t;return [x+Math.sign(x||1)*Math.sin((1.53-y)*30)*a,y,z+Math.cos((1.53-y)*28)*a];}
 function curl(root,amount){root.traverse(mesh=>{const g=mesh.geometry,p=g?.attributes?.position;if(!mesh.isMesh||!p)return;const original=p.array.slice();
  for(const target of g.morphAttributes.position||[])for(let i=0;i<p.count;i++){const x=original[i*3],y=original[i*3+1],z=original[i*3+2],base=wave(x,y,z,amount),next=wave(x+target.getX(i),y+target.getY(i),z+target.getZ(i),amount);target.setXYZ(i,next[0]-base[0],next[1]-base[1],next[2]-base[2]);}
  for(let i=0;i<p.count;i++)p.setXYZ(i,...wave(original[i*3],original[i*3+1],original[i*3+2],amount));p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 });}
 function bindGeometry(THREE,geometry,template,name){
  const source=template.geometry.attributes.position,position=geometry.attributes.position,nearest=[];
  for(let i=0;i<position.count;i++){let best=Infinity,index=0;for(let j=0;j<source.count;j++){const d=(position.getX(i)-source.getX(j))**2+(position.getY(i)-source.getY(j))**2+(position.getZ(i)-source.getZ(j))**2;if(d<best){best=d;index=j;}}nearest.push(index);}
  const head=template.skeleton.bones.findIndex(b=>b.name.toLowerCase()==='head');if(head<0)throw new Error('发型缺少头部骨骼');
  const indices=new Uint16Array(position.count*4),weights=new Float32Array(position.count*4);for(let i=0;i<position.count;i++){indices[i*4]=head;weights[i*4]=1;}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  geometry.morphTargetsRelative=true;geometry.morphAttributes.position=(template.geometry.morphAttributes.position||[]).map(target=>{const attr=new THREE.Float32BufferAttribute(new Float32Array(position.count*3),3);attr.name=target.name;for(let i=0;i<position.count;i++){const j=nearest[i];attr.setXYZ(i,target.getX(j),target.getY(j),target.getZ(j));}return attr;});
  const sourceMaterial=Array.isArray(template.material)?template.material[0]:template.material;
  const material=new THREE.MeshStandardMaterial({color:sourceMaterial.color,roughness:.75});material.name='Hair_Styled';
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=name;mesh.bind(template.skeleton,template.bindMatrix);mesh.morphTargetDictionary={...template.morphTargetDictionary};return mesh;
 }
 function apply(root,THREE,style,amount=0){if(!root||!THREE)return root;if(style==='waves'||style==='custom')curl(root,style==='waves'?1:clamp(amount/100));
  if(!['bangs','buns'].includes(style))return root;let template=null;root.traverse(n=>{if(!template&&n.isSkinnedMesh)template=n;});if(!template)throw new Error('发型网格不可用');
  if(style==='buns')for(const side of [-1,1]){const geometry=new THREE.SphereGeometry(.052,20,12);geometry.scale(1,1,.85);geometry.translate(side*.095,1.65,-.025);root.add(bindGeometry(THREE,geometry,template,`Hair_Bun_${side}`));}
  if(style==='bangs')for(let i=-4;i<=4;i++){const x=i*.014,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,1.65,.07),new THREE.Vector3(x*.95,1.61,.115),new THREE.Vector3(x*.9,1.57+Math.abs(i)*.003,.13)]);root.add(bindGeometry(THREE,new THREE.TubeGeometry(curve,10,.009,6,false),template,`Hair_Fringe_${i}`));}
  return root;
 }
 const api=Object.freeze({wave,curl,bindGeometry,apply});if(typeof window!=='undefined')window.RoleHairStyling=api;if(typeof module!=='undefined')module.exports=api;
})();
