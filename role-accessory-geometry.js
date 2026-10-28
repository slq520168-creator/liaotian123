(() => {
  'use strict';

  const IDS=Object.freeze(['none','glasses','earrings','necklace','glasses-earrings','elf-ears','horns','halo','antennae']);
  const HEAD_NAMES=Object.freeze(['head']);
  const NECK_NAMES=Object.freeze(['neck_01','neck']);

  function walk(root,visit){
    if(!root||typeof visit!=='function')return;
    const stack=[root],seen=new Set();
    while(stack.length){
      const node=stack.pop();
      if(!node||seen.has(node))continue;
      seen.add(node);visit(node);
      for(let i=(node.children?.length||0)-1;i>=0;i--)stack.push(node.children[i]);
    }
  }

  function findBone(root,names){
    const wanted=new Set((names||[]).map(name=>String(name).toLowerCase()));
    let found=null;
    walk(root,node=>{
      if(found)return;
      const name=String(node?.name||'').toLowerCase();
      if(wanted.has(name)&&(node?.isBone||node?.type==='Bone'))found=node;
    });
    return found;
  }

  function material(THREE,color,metalness=.72,roughness=.24){
    return new THREE.MeshStandardMaterial({color,metalness,roughness});
  }

  function addMesh(parent,THREE,geometry,mat,name,position=null,rotation=null){
    const mesh=new THREE.Mesh(geometry,mat);
    mesh.name=name;
    mesh.castShadow=false;mesh.receiveShadow=false;
    if(position)mesh.position.set(position[0],position[1],position[2]);
    if(rotation)mesh.rotation.set(rotation[0],rotation[1],rotation[2]);
    parent.add(mesh);
    return mesh;
  }

  function createGlasses(THREE){
    const group=new THREE.Group();group.name='Accessory_Glasses';
    const frame=material(THREE,0x2a2528,.82,.2);
    addMesh(group,THREE,new THREE.TorusGeometry(.024,.0016,8,28),frame,'Glasses_L',[-.031,0,0]);
    addMesh(group,THREE,new THREE.TorusGeometry(.024,.0016,8,28),frame,'Glasses_R',[.031,0,0]);
    addMesh(group,THREE,new THREE.BoxGeometry(.014,.0025,.003),frame,'Glasses_Bridge',[0,.003,0]);
    addMesh(group,THREE,new THREE.BoxGeometry(.002,.002,.075),frame,'Glasses_Temple_L',[-.056,0,-.036]);
    addMesh(group,THREE,new THREE.BoxGeometry(.002,.002,.075),frame,'Glasses_Temple_R',[.056,0,-.036]);
    return group;
  }

  function createEarrings(THREE){
    const group=new THREE.Group();group.name='Accessory_Earrings';
    const metal=material(THREE,0xd8b85a,.92,.16);
    addMesh(group,THREE,new THREE.TorusGeometry(.008,.0015,8,20),metal,'Earring_L',[-.075,0,0]);
    addMesh(group,THREE,new THREE.TorusGeometry(.008,.0015,8,20),metal,'Earring_R',[.075,0,0]);
    return group;
  }

  function createNecklace(THREE){
    const group=new THREE.Group();group.name='Accessory_Necklace';
    const metal=material(THREE,0xd5b25b,.9,.18);
    const points=[
      new THREE.Vector3(-.085,-.005,.052),
      new THREE.Vector3(-.052,-.055,.073),
      new THREE.Vector3(0,-.096,.086),
      new THREE.Vector3(.052,-.055,.073),
      new THREE.Vector3(.085,-.005,.052)
    ];
    const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
    addMesh(group,THREE,new THREE.TubeGeometry(curve,18,.0032,6,false),metal,'Necklace_Chain');
    addMesh(group,THREE,new THREE.SphereGeometry(.011,12,8),metal,'Necklace_Pendant',[0,-.108,.087]);
    return group;
  }

  function createFantasy(THREE,id){
    const group=new THREE.Group();group.name='Accessory_Fantasy';
    const skin=material(THREE,0xd7a17f,0,.75);skin.name='Skin';
    const dark=material(THREE,0x382330,.18,.5),gold=material(THREE,0xffcc69,.6,.25);
    if(id==='halo'){
      gold.emissive.set(0xffb84d);gold.emissiveIntensity=.65;
      addMesh(group,THREE,new THREE.TorusGeometry(.10,.006,8,48),gold,'Halo',[0,.20,-.025],[Math.PI/2,0,0]);
    }
    for(const side of [-1,1]){
      if(id==='elf-ears'){
        const ear=addMesh(group,THREE,new THREE.ConeGeometry(.025,.105,12),skin,`ElfEar_${side}`,[side*.10,-.025,-.065],[0,0,-side*.85]);
        ear.scale.z=.36;
      }
      if(id==='horns'){
        const horn=addMesh(group,THREE,new THREE.ConeGeometry(.024,.13,16),dark,`Horn_${side}`,[side*.065,.13,-.06],[0,0,-side*.28]);
        horn.castShadow=true;
      }
      if(id==='antennae'){
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.04,.08,-.06),new THREE.Vector3(side*.06,.16,-.05),new THREE.Vector3(side*.09,.20,-.02)]);
        addMesh(group,THREE,new THREE.TubeGeometry(curve,12,.003,6,false),dark,`Antenna_${side}`);
        addMesh(group,THREE,new THREE.SphereGeometry(.013,12,8),gold,`AntennaTip_${side}`,[side*.09,.20,-.02]);
      }
    }
    return group;
  }

  function create(THREE,id){
    const key=IDS.includes(id)?id:'none';
    if(key==='none')return null;
    const group=new THREE.Group();group.name=`UnifiedAccessory_${key}`;
    if(key==='glasses'||key==='glasses-earrings')group.add(createGlasses(THREE));
    if(key==='earrings'||key==='glasses-earrings')group.add(createEarrings(THREE));
    if(key==='necklace')group.add(createNecklace(THREE));
    if(['elf-ears','horns','halo','antennae'].includes(key))group.add(createFantasy(THREE,key));
    return group;
  }

  function attach(root,THREE,id){
    const key=IDS.includes(id)?id:'none';
    if(key==='none')return null;
    if(!root||!THREE?.Group||!THREE?.Mesh)return null;
    const target=key==='necklace'?findBone(root,NECK_NAMES):findBone(root,HEAD_NAMES);
    if(!target)return null;
    const accessory=create(THREE,key);
    if(!accessory)return null;
    const fitted=fit(root,accessory,THREE);
    if(fitted&&typeof target.attach==='function'){root.add(accessory);root.updateMatrixWorld?.(true);target.attach(accessory);}
    else target.add(accessory);
    return accessory;
  }

  function eyeBounds(root,THREE){
    if(!root?.matrixWorld||!THREE?.Box3||!THREE?.Matrix4)return null;
    root.updateMatrixWorld?.(true);
    const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),box=new THREE.Box3(),point=new THREE.Vector3();
    walk(root,node=>{
      if(!node?.isMesh||!node.geometry?.attributes?.position)return;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      if(!materials.some(item=>/^(Eye|Iris|Cornea)$/.test(String(item?.name||''))))return;
      for(let i=0;i<node.geometry.attributes.position.count;i++){
        if(node.getVertexPosition)node.getVertexPosition(i,point);else point.fromBufferAttribute(node.geometry.attributes.position,i);
        point.applyMatrix4(node.matrixWorld).applyMatrix4(inverse);box.expandByPoint(point);
      }
    });
    return box.isEmpty()?null:box;
  }

  function fit(root,accessory,THREE){
    const box=eyeBounds(root,THREE);if(!box)return false;
    const center=box.getCenter(new THREE.Vector3()),width=box.max.x-box.min.x;
    const glasses=accessory.getObjectByName('Accessory_Glasses');
    if(glasses){glasses.position.set(center.x,center.y,box.max.z+.005);glasses.scale.setScalar(Math.max(.7,Math.min(1.3,width*1.45/.112)));}
    const earrings=accessory.getObjectByName('Accessory_Earrings');
    if(earrings){earrings.position.set(center.x,center.y-.045,box.max.z-.065);earrings.scale.setScalar(Math.max(.7,Math.min(1.3,width/.09)));}
    const fantasy=accessory.getObjectByName('Accessory_Fantasy');
    if(fantasy){fantasy.position.set(center.x,center.y,box.max.z);fantasy.scale.setScalar(Math.max(.8,Math.min(1.2,width/.09)));}
    const necklace=accessory.getObjectByName('Accessory_Necklace');
    if(necklace)necklace.position.set(center.x,center.y-.14,box.max.z-.05);
    return true;
  }

  const api=Object.freeze({IDS,HEAD_NAMES,NECK_NAMES,walk,findBone,createGlasses,createEarrings,createNecklace,createFantasy,create,attach,eyeBounds,fit});
  if(typeof window!=='undefined')window.RoleAccessoryGeometry=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
