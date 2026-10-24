(() => {
  'use strict';

  const IDS=Object.freeze(['none','glasses','earrings','necklace','glasses-earrings']);
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
    addMesh(group,THREE,new THREE.TorusGeometry(.052,.0045,8,28),frame,'Glasses_L',[-.057,.078,.084]);
    addMesh(group,THREE,new THREE.TorusGeometry(.052,.0045,8,28),frame,'Glasses_R',[.057,.078,.084]);
    addMesh(group,THREE,new THREE.BoxGeometry(.026,.006,.006),frame,'Glasses_Bridge',[0,.078,.084]);
    addMesh(group,THREE,new THREE.BoxGeometry(.07,.004,.004),frame,'Glasses_Temple_L',[-.104,.078,.043],[0,.58,0]);
    addMesh(group,THREE,new THREE.BoxGeometry(.07,.004,.004),frame,'Glasses_Temple_R',[.104,.078,.043],[0,-.58,0]);
    return group;
  }

  function createEarrings(THREE){
    const group=new THREE.Group();group.name='Accessory_Earrings';
    const metal=material(THREE,0xd8b85a,.92,.16);
    addMesh(group,THREE,new THREE.TorusGeometry(.017,.0034,8,20),metal,'Earring_L',[-.091,.047,.016]);
    addMesh(group,THREE,new THREE.TorusGeometry(.017,.0034,8,20),metal,'Earring_R',[.091,.047,.016]);
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

  function create(THREE,id){
    const key=IDS.includes(id)?id:'none';
    if(key==='none')return null;
    const group=new THREE.Group();group.name=`UnifiedAccessory_${key}`;
    if(key==='glasses'||key==='glasses-earrings')group.add(createGlasses(THREE));
    if(key==='earrings'||key==='glasses-earrings')group.add(createEarrings(THREE));
    if(key==='necklace')group.add(createNecklace(THREE));
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
    target.add(accessory);
    return accessory;
  }

  const api=Object.freeze({IDS,HEAD_NAMES,NECK_NAMES,walk,findBone,createGlasses,createEarrings,createNecklace,create,attach});
  if(typeof window!=='undefined')window.RoleAccessoryGeometry=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
