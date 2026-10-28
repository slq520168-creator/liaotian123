const test=require('node:test'),assert=require('node:assert/strict'),studio=require('../role-studio-scene.js');
test('studio is bounded true 3D geometry, follows floor level and disposes shared materials once',async()=>{
 const THREE=await import('three'),renderer={scene:new THREE.Scene(),modules:{THREE}};
 const room=studio.ensure(renderer);assert.equal(studio.ensure(renderer),room);
 let meshes=0,triangles=0;const materials=new Set();room.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;materials.add(n.material);assert(!n.material.map);}});
 assert(meshes>15&&meshes<40);assert(triangles<3000);
 const body=new THREE.Mesh(new THREE.BoxGeometry(.5,1.8,.4));body.position.y=.9;studio.fit(renderer,body);assert(Math.abs(room.position.y)<1e-6);
 const counts=new Map();for(const m of materials)m.addEventListener('dispose',()=>counts.set(m,(counts.get(m)||0)+1));studio.dispose(renderer);
 assert.equal(room.parent,null);assert.equal(renderer.__studioScene,null);assert.equal(counts.size,materials.size);for(const count of counts.values())assert.equal(count,1);
});
