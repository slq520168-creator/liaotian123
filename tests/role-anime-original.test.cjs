const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('original anime portraits are unique local WebP files with real playable personas',()=>{
const catalog=vm.runInNewContext(read('roles.js')+'\nORIGINAL_ANIME_ROLES');
const manifest=JSON.parse(read('assets/role-portraits/anime-original-manifest.json'));
assert.ok(catalog.length>=13);const ids=new Set(),images=new Set();
for(const role of catalog){assert.ok(role.age>=18&&role.personality&&role.greeting);assert.equal(role.category,'动漫');assert.ok(!ids.has(role.id));ids.add(role.id);
const bytes=fs.readFileSync(path.join(root,role.avatar));assert.ok(bytes.length>20000);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');assert.ok(!images.has(sha));images.add(sha);assert.equal(manifest.assets.find(x=>x.path===role.avatar).gitBlob,sha);}
assert.match(read('role-2d-creator.js'),/selectedStyle==='cartoon'\?cartoonTemplates\(\)/);assert.match(read('role-2d-creator.js'),/!c\.animeOriginal/);
});
