const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('anime roles have distinct voices and starters and documented local companion portraits',()=>{
 const roles=vm.runInNewContext(read('roles.js')+'\nORIGINAL_ANIME_ROLES');
 const manifest=JSON.parse(read('assets/role-portraits/anime-original-manifest.json')).assets;
 assert.equal(new Set(roles.map(r=>r.voice)).size,roles.length);
 assert.equal(new Set(roles.map(r=>r.quickReplies.join('|'))).size,roles.length);
 const galleries=roles.filter(r=>r.portraitGallery?.length>1);assert.equal(galleries.length,6);
 for(const r of galleries){const item=manifest.find(x=>x.character===r.id);assert.deepEqual(Array.from(r.portraitGallery),[r.avatar,item.previousPath]);for(const p of r.portraitGallery)assert.ok(fs.statSync(path.join(root,p)).size>0);}
});
test('gallery includes primary portrait and preserves selected path',()=>{
 const s=read('role-discovery.js'),line=s.split('\n').find(l=>l.includes('const photoSources='));
 const photos=vm.runInNewContext(line+'\nphotoSources');assert.deepEqual(Array.from(photos({avatar:'a',portraitGallery:['a','b','c']})),['a','b','c']);
 assert.deepEqual(Array.from(photos({avatar:'a',portraitGallery:['b']})),['a','b']);
 assert.match(s,/photoSources\(char\)\.indexOf\(selectedPath\)/);
});
