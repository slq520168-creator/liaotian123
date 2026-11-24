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

test('retired 3D cards are inactive while their conversation histories remain safe',()=>{
 const config=read('config/app.js'),roles=read('roles.js'),app=read('app.js'),index=read('index.html');
 const ids=["nuannuan","linwan","sutang","xuzhixia","yeqingge","lingyi","luchen","taiyang","shenyan","guyan","jiangyu","yunzhou"];
 for(const id of ids)assert.ok(config.includes('"'+id+'"')&&roles.includes('"id": "'+id+'"'));
 assert.match(config,/LIAOTIAN_3D_ONLY=false/);
 assert.match(config,/PRESET_CHARACTERS\.splice\(i,1\)/);
 assert.match(app,/RoleCatalogPolicy\?\.install/);
 assert.match(app,/liaotian_archived_3d_custom_v1/);
 assert.doesNotMatch(index,/src="role-avatar-stage\.js/);
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

test('custom HTTPS character videos stay supported without retired 3D clips',()=>{
 const js=read('role-discovery.js'),html=read('index.html');
 assert.match(js,/typeof char\.video==='string'/);
 assert.match(js,/playVideo/);
 assert.match(js,/stopVideo/);
 assert.match(html,/id="rdChatVideo"/);
 assert.doesNotMatch(js,/assets\/role-videos\//);
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
 assert.match(css,/rd-mini-title/);
 for(const category of ['都市','治愈','悬疑','奇幻','古风','科幻','冒险'])assert.ok(html.includes('data-role-filter="'+category+'"'));
 assert.match(read('config/app.js'),/RoleCatalogPolicy/);
 assert.match(read('config/app.js'),/char\.roleKind='2d'/);
});

test('role gallery displays exactly two cards per row at all widths with legible portraits',()=>{
 const css=read('role-discovery.css'),js=read('role-discovery.js');
 const cols=[...css.matchAll(/\.rd-character-grid\s*\{([^}]+)\}/g)].map(x=>x[1]).filter(x=>x.includes('grid-template-columns'));
 assert.equal(cols.length,1,'prevent conflicting responsive column overrides');
 assert.match(cols[0],/display:grid/,'gallery must be grid even after old styles are consolidated');
 assert.match(cols[0],/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.rd-mini-image\{[^}]*object-fit:cover/s);
 assert.match(css,/\.rd-mini-hook\{[^}]*-webkit-line-clamp:2/s);
 assert.match(js,/open\.addEventListener\('click',\(\)=>toggleCardPreview\(card\)\)/);
 assert.match(js,/chat\.addEventListener\('click',\(\)=>startChat\(char,Boolean\(story\)\)\)/);
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


test('international characters have eight self-hosted, uniquely sourced WebP portraits and working catalog entries',()=>{
 const source=read('roles.js'),config=read('config/app.js'),discovery=read('role-discovery.js'),html=read('index.html');
 const ids=["celeste","amara","isabella","anika","oliver","mateo","noah","idris"];
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const digests=new Set();
 for(const id of ids){
   const filename='assets/role-portraits/'+id+'.webp';
   assert.match(source,new RegExp('"id": "'+id+'"'));
   assert.ok(source.includes('"avatar": "'+filename+'"'),id+' must have a self-hosted image');
   assert.ok(!config.includes('"'+id+'"'),'retired 3D registry must exclude '+id);
   const bytes=fs.readFileSync(path.join(__dirname,'..',filename));
   assert.ok(bytes.length>20000&&bytes.length<200000,id+' image empty, blurred or oversized');
   assert.equal(bytes.toString('ascii',0,4),'RIFF',id+' WebP RIFF');
   assert.equal(bytes.toString('ascii',8,12),'WEBP',id+' WebP signature');
   digests.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(digests.size,ids.length,'no character images reuse a stock placeholder');
 assert.doesNotMatch(source,/images\.unsplash\.com/,'no hotlinked images in role catalog');
 assert.match(source,/\.\.\.INTERNATIONAL_ROLE_CONFIGS\.map/);
 assert.match(discovery,/state\.filter === 'international'/);
 assert.match(discovery,/char\.countryLabel/);
 assert.match(html,/data-role-filter="international"/);
 assert.match(html,/129 位角色/);
});

test('all characters are rendered, no batching, and all source images have unique identities',()=>{
 const ui=read('role-discovery.js'),html=read('index.html'),engine=read('role-story-engine.js');
 assert.match(ui,/for\(const char of list\)/);
 assert.doesNotMatch(ui,/visibleCount|gridScope|gridObserver/);
 assert.doesNotMatch(html,/rdLoadMore|显示更多角色/);
 assert.match(html,/role-story-cover-catalog\.js/);
 assert.doesNotMatch(engine,/function poster\(/);
});

test('premium role cards show full portrait composition with safe independent image failure handling',()=>{
 const ui=read('role-discovery.js'),css=read('role-discovery.css'),config=read('config/app.js');
 assert.match(ui,/for\(const char of list\)/,'all characters must remain rendered');
 assert.doesNotMatch(ui,/visibleCount|gridObserver|gridScope|rdLoadMore/,'no pagination or hidden cards');
 assert.match(ui,/setRolePortrait\(img,char\)/);
 assert.match(ui,/img\.dataset\.imageRetried/);
 assert.match(ui,/rd-portrait-unavailable/);
 assert.doesNotMatch(ui,/img\.src = 'assets\/avatars\/nuannuan-portrait\.jpg';/,'failed remote photos cannot become the same fallback face');
 assert.match(ui,/renderOrder\+\+<4/,'visible images load without waiting for scroll');
 assert.match(css,/aspect-ratio:9\/16/);
 assert.match(css,/\.rd-portrait-unavailable/);
 assert.match(config,/const version='20\d{6}-role2d\d+';/,'build version must advance without changing feature tests');
});


test('gallery startup and sizing are independent of optional media viewer',()=>{
 const ui=read('role-discovery.js'),css=read('role-discovery.css');
 assert.match(ui,/function boot\(\) \{[\s\S]*?renderGrid\(\);[\s\S]*?\$\('rdHeroPhoto'\)\?\.addEventListener/);
 assert.match(ui,/function render\(\) \{ renderGrid\(\); renderHero\(\); \}/);
 assert.match(ui,/Array\.isArray\(char\?\.traits\)/);
 assert.match(css,/min-height:clamp\(294px,82vw,352px\);aspect-ratio:9\/16/);
 assert.match(css,/\.rd-photo-dialog:not\(\[open\]\)\{display:none\}/);
});

test('card preview, true video playback and saved story progress use existing character data',()=>{
 const ui=read('role-discovery.js'),html=read('index.html'),css=read('role-discovery.css');
 assert.match(html,/data-role-filter="stories"/);
 assert.match(ui,/window\.RoleStory\.description\(char\.id\)/);
 assert.match(ui,/window\.RoleStory\.openPanel\(\)/);
 assert.match(ui,/galleryScroll=root\.scrollTop/);
 assert.match(ui,/root\.scrollTop = galleryScroll/);
 assert.match(ui,/if\(roleVideo\(char\)\)\{/);
 assert.match(ui,/togglePhotoVideo\(\)/);
 assert.match(css,/\.rd-mini-preview\[hidden\]\{display:none\}/);
 assert.match(ui,/speech\.textContent=String\(story\?story\.chapterTitle/);
});
