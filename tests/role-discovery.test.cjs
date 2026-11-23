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
