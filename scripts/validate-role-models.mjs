import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/role-models/manifest.json'),'utf8'));
if(manifest.schema!==1||!manifest.models||typeof manifest.models!=='object'||Array.isArray(manifest.models))throw new Error('Invalid role model manifest');
const keys=Object.keys(manifest.models);
if(keys.length>300)throw new Error('Unexpected number of registered role models');
for(const id of keys){
  if(!/^[a-z0-9_-]{1,80}$/i.test(id))throw new Error('Invalid role id');
  const entry=manifest.models[id];
  const expected='assets/role-models/'+id+'.mavatar';
  if(entry?.src!==expected||!['OWNED','CC0','CC-BY-4.0'].includes(entry.license)||!String(entry.author||'').trim())throw new Error('Invalid model metadata: '+id);
  const target=path.join(root,expected);
  if(!fs.existsSync(target))throw new Error('Model missing: '+expected);
  const stat=fs.statSync(target);
  if(stat.size<512||stat.size>30*1024*1024)throw new Error('Model outside safe size range: '+id);
  const fd=fs.openSync(target,'r'),header=Buffer.alloc(4);
  try{fs.readSync(fd,header,0,4,0);}finally{fs.closeSync(fd);}
  if(header.toString('hex')!=='504b0304')throw new Error('Not a ZIP-based .mavatar: '+id);
}
console.log('Role model catalog: '+keys.length+' licensed 2D assets verified');