import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
const list=Object.entries({"shenyan":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/35e122b8c1d741c98bd96f232bca394bbec3323b7c3d61b3254ee1299467a1a4/tmp217_76op.mp4","nuannuan":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/c6a806c1e98e8417db8148a345143b7e8afb5627c8d82fd40d67fd22e1bd9431/tmp573nnxo1.mp4","linwan":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/7e5d6f0b36e662fdc852852480411ac9370fb0aa9d938143159b48876dfdad1d/tmpzf38_hqs.mp4","jiangyu":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/107e9ce625264a73ab2e7e77f4f0b210cf624b53e7a6d6ad72ff79b2a2e42f26/tmpakx6vrqo.mp4","sutang":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/21bc625786645ae97fff2750bacbc49dfe962a9c742963ac14e8d28f75abcc53/tmp5zbmu3fl.mp4","xuzhixia":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/9f078deb24f8e5c122061b8b63b5396f16920ba87da97973ccb7fd62421c11c4/tmp8gnv5xzp.mp4","yeqingge":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/b50215c426d7b30acf438b56b58d0a52ffd27eeabe5961219f352ce79e48f938/tmpqepuk_ei.mp4","lingyi":"https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/--replicas/88d5m/gradio_api/file=/tmp/gradio/5dc6d7d7c0d112bf12d31dc8992bb6c6ffdf7cd5923d21f3dc5b97ddc2cb34f6/tmp5zo39qlw.mp4"});
const dir=new URL('../assets/role-videos/',import.meta.url);
await mkdir(dir,{recursive:true});
let added=0,failed=0;
for(const [id,url] of list){
 const dst=new URL(id+'.mp4',dir);
 if(await stat(dst).then(x=>x.size>2048).catch(()=>false))continue;
 try{
  const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{accept:'video/mp4'}});
  if(!r.ok||!r.body)throw Error('HTTP '+r.status);
  const len=Number(r.headers.get('content-length')||'0');
  if(len>18000000)throw Error('Video too large');
  const reader=r.body.getReader(),chunks=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>18000000){await reader.cancel();throw Error('Video exceeds 18 MB');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  if(size<2048||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw Error('Not a playable MP4');
  await writeFile(dst,bytes);console.log('Downloaded',id,Math.round(size/1024)+' KB');added++;
 }catch(e){failed++;console.log('Missing',id,e.message);}
}
console.log('Role videos:',added,'added,',failed,'unavailable; no fake replacements');
