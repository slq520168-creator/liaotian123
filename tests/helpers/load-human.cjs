const fs=require('node:fs');
// Decode production geometry and skeleton with the actual GLTF loader, without browser-only textures.
module.exports=async function loadHuman(file){
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const {MeshoptDecoder}=await import('meshoptimizer');
 const original=fs.readFileSync(file),length=original.readUInt32LE(12);
 const json=JSON.parse(original.subarray(20,20+length).toString());
 delete json.images;delete json.textures;delete json.materials;
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
 const tail=original.subarray(20+length),out=Buffer.alloc(20+padded.length+tail.length);
 original.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);padded.copy(out,20);tail.copy(out,20+padded.length);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 return (await loader.parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'' )).scene;
};
