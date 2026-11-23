const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('role discovery is the landing page and uses the existing chat engine', () => {
  const html = read('index.html');
  const script = read('role-discovery.js');
  const css = read('role-discovery.css');
  assert.match(html, /id="roleDiscovery"/);
  assert.match(html, /id="rdHeroPortrait"/);
  assert.match(html, /id="rdHeroVideo"/);
  assert.match(html, /id="rdCharacterGrid"/);
  assert.match(script, /switchCharacter\(char\.id\)/);
  assert.match(script, /new MutationObserver/);
  assert.match(script, /rdFavorite/);
  assert.match(script, /rdPrevious/);
  assert.match(script, /rdNext/);
  assert.match(css, /touch-action:pan-y/);
  assert.match(script, /suppressClickUntil/);
});

test('all 12 existing adults are reachable without deleting custom roles', () => {
  const config = read('config/app.js');
  const roles = read('roles.js');
  for (const id of ['nuannuan','linwan','sutang','xuzhixia','yeqingge','lingyi','luchen','taiyang','shenyan','guyan','jiangyu','yunzhou']) {
    assert.match(config, new RegExp("'"+id+"'|\""+id+"\""));
    assert.match(roles, new RegExp('"id": "' + id + '"'));
  }
  assert.match(config, /normalizeStored3D/);
  assert.match(config, /liaotian_3d_roles_v1/);
});

test('full-screen portrait, WebGL canvas and animated reply remain independent of persisted messages', () => {
  const css = read('role-chat-immersive.css');
  const js = read('role-discovery.js');
  const html = read('index.html');
  assert.match(css, /role-chat-immersive.*rd-chat-scene/);
  assert.match(css, /role-chat-immersive.*role-human-stage/);
  assert.match(css, /rd-live-reply/);
  assert.match(html, /id="rdLiveReply"/);
  assert.match(html, /id="rdHistoryToggle"/);
  assert.match(js, /messages\.querySelectorAll\('\.message-row\.bot'\)/);
  assert.match(js, /queueReplySync/);
  assert.match(js, /toggleHistory/);
  assert.match(js, /playVideo\(\$\('rdHeroVideo'\),videoSrc\)/);
  assert.doesNotMatch(js, /localStorage\.removeItem\(['"]liaotian_chat_histories/);
});

test('Cloudflare dist includes discovery assets', () => {
  const build = read('scripts/build-cloudflare.mjs');
  for (const file of ['role-discovery.js', 'role-discovery.css', 'role-chat-immersive.css']) {
    assert.ok(build.includes("'" + file + "'"), file + ' must be included in dist');
  }
});

test('production root no longer redirects every visitor into the old studio', () => {
  const index = read('index.html');
  const launcher = read('studio-launcher.js');
  assert.doesNotMatch(index, /<script[^>]*src="studio-launcher\.js"/);
  assert.match(index, /<body class="role-discovery-open">/);
  assert.match(index, /<section id="roleDiscovery" aria-label="角色发现大厅">/);
  assert.doesNotMatch(index, /id="roleDiscovery"[^>]+hidden/);
  assert.match(launcher, /get\('studio'\)!=='1'/);
  assert.doesNotMatch(launcher, /get\('legacy'\)===('|"?)1/);
});
test('fresh visits always land on the 12-character swipe gallery, never cached chat hash', () => {
  const js = read('role-discovery.js');
  const css = read('role-discovery.css');
  assert.match(js, /switchView\(true, false\)/);
  assert.match(js, /history\.replaceState\(/);
  assert.match(js, /PRESET_CHARACTERS/);
  assert.match(js, /pointerdown/);
  assert.match(js, /pointermove/);
  assert.match(js, /pointerup/);
  assert.doesNotMatch(css, /animation:rdPortraitBreath/);
});

test('real local videos only, no temporary third-party links in role cards',()=>{
 const script=read('role-discovery.js'),html=read('index.html');
 for(const id of ['shenyan','nuannuan','linwan','jiangyu','sutang','xuzhixia','yeqingge','lingyi'])assert.match(script,new RegExp('\\"'+id+'\\"'));
 assert.match(script,/assets\/role-videos\//);
 assert.match(script,/stopVideo/);
 assert.match(script,/playVideo/);
 assert.match(html,/id="rdChatVideo"/);
 assert.doesNotMatch(script,/\.hf\.space\/--replicas/);
});

test('iPhone Safari blocked autoplay can be resumed by a real user gesture', () => {
  const js=read('role-discovery.js'),css=read('role-chat-immersive.css');
  assert.match(js,/error\?\.name==='NotAllowedError'/);
  assert.match(js,/playVideo\(el,el\.dataset\.source,true\)/);
  assert.match(js,/button\.addEventListener\('click'/);
  assert.match(js,/document\.addEventListener\('visibilitychange'/);
  assert.match(js,/if\(document\.body\.classList\.contains\('role-chat-immersive'\)\)playVideo/);
  assert.match(css,/\.rd-video-retry\[hidden\]/);
});
test('eight local role videos have genuine MP4 file signatures', () => {
  for(const id of ['shenyan','nuannuan','linwan','jiangyu','sutang','xuzhixia','yeqingge','lingyi']){
    const bytes=fs.readFileSync(path.join(root,'assets/role-videos',id+'.mp4'));
    assert.ok(bytes.length>2048,id+' is not an empty stub');
    assert.equal(bytes.subarray(4,8).toString('ascii'),'ftyp',id+' is not MP4');
  }
});

test('editorial character catalog has 24 distinct speakable roles and advanced filter controls',()=>{
 const source=read('roles.js'),ui=read('role-discovery.js'),html=read('index.html'),css=read('role-discovery.css');
 const cards=[...source.matchAll(/"id": "(wuyue|tangli|qiaoyu|luoyan|xingye|yinyao|cenmo|sunyu|luxi|yanchuan|suyu|haichao)"/g)];
 assert.equal(new Set(cards.map(x=>x[1])).size,12);
 assert.match(source,/ROLE_DISCOVERY_CARDS/);
 assert.match(ui,/toggleFavoriteFor\(char\)/);
 assert.match(ui,/char\.category/);
 assert.match(ui,/startChat\(char\)/);
 assert.match(css,/rd-mini-traits/);
 for(const category of ['都市','治愈','悬疑','奇幻','古风','科幻','冒险'])assert.ok(html.includes('data-role-filter="'+category+'"'));
 assert.match(read('config/app.js'),/curated=new Set/);
 assert.match(read('config/app.js'),/char\.roleKind=allowed\.has/);
});

test('role gallery displays exactly two cards per row at all widths with legible portraits',()=>{
 const css=read('role-discovery.css'),js=read('role-discovery.js');
 const cols=[...css.matchAll(/\.rd-character-grid\s*\{([^}]+)\}/g)].map(x=>x[1]).filter(x=>x.includes('grid-template-columns'));
 assert.equal(cols.length,1,'prevent conflicting responsive column overrides');
 assert.match(cols[0],/display:grid/,'gallery must be grid even after old styles are consolidated');
 assert.match(cols[0],/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.rd-mini-image\{[^}]*object-fit:cover/s);
 assert.match(css,/\.rd-mini-hook\{[^}]*-webkit-line-clamp:2/s);
 assert.match(js,/char\.traits\|\|\[\]\)\.slice\(0,3\)/);
 assert.match(js,/open\.addEventListener\('click',\(\)=>startChat\(char\)\)/);
 assert.match(js,/favorite\.addEventListener\('click',\(\)=>toggleFavoriteFor\(char\)\)/);
});

test('twelve featured fiction personas use independent locally hosted WebP portraits',()=>{
 const roles=read('roles.js'),discovery=read('role-discovery.js'),html=read('index.html'),app=read('app.js'),fs=require('node:fs'),path=require('node:path');
 const selected=["luoyan","wuyue","yinyao","qiaoyu","tangli","xingye","cenmo","suyu","haichao","luxi","yanchuan","sunyu"];
 const resolved=new Set();
 for(const id of selected){
   const filename='assets/role-portraits/'+id+'.webp';
   assert.ok(roles.includes('"avatar": "'+filename+'"'),id+' must not hotlink old portrait');
   const p=path.join(__dirname,'..',filename);
   const raw=fs.readFileSync(p);
   assert.ok(raw.length>=20000&&raw.length<=150000,id+' must use a nonempty optimized image');
   assert.equal(raw.toString('ascii',0,4),'RIFF');
   assert.equal(raw.toString('ascii',8,12),'WEBP');
   resolved.add(filename);
 }
 assert.equal(resolved.size,12,'no shared placeholder assets');
 assert.match(app,/role-portraits/);
 assert.match(discovery,/FEATURED_RANK/);
 assert.match(html,/data-role-filter="featured"/);
 assert.match(html,/assets\/role-portraits\/luoyan\.webp/);
});

test('international characters return as distinct real role entries without dropping existing twenty-four',()=>{
 const roles=read('roles.js'),config=read('config/app.js'),discovery=read('role-discovery.js'),html=read('index.html');
 const ids=["celeste","amara","isabella","anika","oliver","mateo","noah","idris"];
 const pictures=["https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&h=1200&q=86","https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&h=1200&q=86","https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&h=1200&q=86","https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&h=1200&q=86","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&h=1200&q=86","https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&h=1200&q=86","https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=900&h=1200&q=86","https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=900&h=1200&q=86"];
 assert.equal(ids.length,8);assert.equal(new Set(ids).size,8);assert.equal(new Set(pictures).size,8,'portrait URLs must be unique');
 for(let i=0;i<ids.length;i++){
   assert.match(roles,new RegExp('"id": "'+ids[i]+'"'));
   assert.ok(roles.includes(pictures[i]),'role '+ids[i]+' must have a distinct image');
   assert.ok(config.includes('"'+ids[i]+'"'),'role '+ids[i]+' must survive the existing catalog authority');
 }
 assert.match(roles,/\.\.\.INTERNATIONAL_ROLE_CONFIGS\.map/);
 assert.match(discovery,/state\.filter === 'international'/);
 assert.match(discovery,/char\.countryLabel/);
 assert.match(html,/data-role-filter="international"/);
 assert.match(html,/32 位角色/);
});
