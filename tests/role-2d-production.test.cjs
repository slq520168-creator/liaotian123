const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('2D roleplay is the only active runtime; 3D models do not load',()=>{
 const html=read('index.html'),config=read('config/app.js'),build=read('scripts/build-cloudflare.mjs');
 assert.match(config,/LIAOTIAN_3D_ONLY=false/);
 assert.doesNotMatch(config,/window\.addEventListener\('load'/);
 assert.doesNotMatch(html,/src="role-avatar-stage\.js/);
 assert.doesNotMatch(html,/src="studio-bridge\.js/);
 assert.match(read('app.js'),/RoleCatalogPolicy\?\.install/);
 assert.match(build,/assets\/humans/);
 assert.match(build,/await rm\(new URL\(name\+'\/',out\)/);
});
test('16 distinct self-hosted 720px fashion portraits for adult fictional characters',()=>{
 const ids=["sylvie","rosalie","claire","veronica","elena","phoebe","luna","marisol","audrey","vivienne","helene","daphne","arthur","felix","roman","niko"];
 const source=read('role-photo-collection.js'),html=read('index.html'),engine=read('role-story-engine.js');
 const digest=new Set();
 assert.equal(new Set(ids).size,16);
 for(const id of ids){
  const rel='assets/role-portraits/intl-'+id+'.webp';
  assert.ok(source.includes(rel),'missing local photo reference '+id);
  const bytes=fs.readFileSync(path.join(root,rel));
  assert.ok(bytes.length>=15000&&bytes.length<=260000,'invalid webp size for '+id);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  digest.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(digest.size,16,'do not reuse any face photo');
 assert.match(html,/data-role-filter="photo"/);
 assert.match(engine,/seed\.avatar\|\|coverFor\(seed\)/);
 assert.doesNotMatch(engine,/function poster\(/);
 assert.match(html,/128 位角色/);
 assert.match(html,/照片中的人物本人参与聊天/);
});
test('retired character histories and memory are retained, not purged by 2D saves',()=>{
 const app=read('app.js');
 assert.match(app,/Object\.assign\(Object\.create\(null\),storedHistories\)/);
 assert.match(app,/Object\.assign\(Object\.create\(null\),memories\)/);
 assert.match(app,/liaotian_archived_3d_custom_v1/);
 assert.match(app,/localStorage\.setItem\('liaotian_chat_histories', JSON\.stringify\(chatHistories\)\)/);
 assert.doesNotMatch(app,/localStorage\.removeItem\('liaotian_chat_histories'/);
});
