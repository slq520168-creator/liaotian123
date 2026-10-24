const test=require('node:test');
const assert=require('node:assert/strict');
const custom=require('../role-unified-custom-chat.js');

const near=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;

test('clothing tint preserves author PBR channels and recomputes from immutable author color',async()=>{
  const THREE=await import('three');
  const root=new THREE.Group();
  const map={name:'cloth_jeans_albedo'},normalMap={name:'cloth_jeans_normal'};
  const material=new THREE.MeshStandardMaterial({color:new THREE.Color(0.09333,0.22887,0.5245),roughness:.85,metalness:0,map,normalMap});
  material.name='Cloth_jeans';
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);root.add(mesh);
  const author=material.color.clone();

  assert.equal(custom.tintModule(root,'#7c2735'),1);
  assert.deepEqual(material.userData.liaotianAuthorBaseColor,[author.r,author.g,author.b]);
  assert.equal(material.map,map);assert.equal(material.normalMap,normalMap);
  assert.equal(material.roughness,.85);assert.equal(material.metalness,0);

  assert.equal(custom.tintModule(root,'#e9e7e4'),1);
  const target=new THREE.Color('#e9e7e4');
  const blend=custom.CLOTHING_TINT_BLEND,keep=1-blend;
  assert.ok(near(material.color.r,author.r*keep+target.r*blend));
  assert.ok(near(material.color.g,author.g*keep+target.g*blend));
  assert.ok(near(material.color.b,author.b*keep+target.b*blend));
  assert.equal(material.map,map);assert.equal(material.normalMap,normalMap);
});

test('different garment author bases remain different under the same selected color',async()=>{
  const THREE=await import('three');
  const make=(name,color)=>{const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:new THREE.Color(...color),roughness:.8,metalness:0});material.name=name;root.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material));return{root,material};};
  const dress=make('Cloth_dress',[.38924,.03528,.06868]);
  const jeans=make('Cloth_jeans',[.09333,.22887,.5245]);
  assert.equal(custom.tintModule(dress.root,'#263957'),1);
  assert.equal(custom.tintModule(jeans.root,'#263957'),1);
  assert.notDeepEqual([dress.material.color.r,dress.material.color.g,dress.material.color.b],[jeans.material.color.r,jeans.material.color.g,jeans.material.color.b]);
});

test('clothing tint fails closed for non-contract material names while hair keeps exact tint path',async()=>{
  const THREE=await import('three');
  const badRoot=new THREE.Group(),bad=new THREE.MeshStandardMaterial({color:'#ffffff'});bad.name='UnknownFabric';badRoot.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),bad));
  assert.equal(custom.tintModule(badRoot,'#242126'),1,'generic non-clothing modules remain available to existing hair path');
  assert.equal(custom.tintClothingMaterial(bad,'#242126'),false,'strict clothing helper rejects non Cloth_* material');

  const hairRoot=new THREE.Group(),hair=new THREE.MeshStandardMaterial({color:'#ffffff'});hair.name='Hair_short04';hairRoot.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),hair));
  assert.equal(custom.tintModule(hairRoot,'#533d2d'),1);
  const exact=new THREE.Color('#533d2d');
  assert.ok(near(hair.color.r,exact.r)&&near(hair.color.g,exact.g)&&near(hair.color.b,exact.b));
});
