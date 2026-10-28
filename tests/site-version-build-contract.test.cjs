const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const config=fs.readFileSync(path.join(root,'config/app.js'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts/build-cloudflare.mjs'),'utf8');

test('Cloudflare build derives update version from the active app build version',()=>{
  const match=config.match(/const version='([^']+)'/);
  assert.ok(match,'config/app.js must expose one active build version');
  assert.match(match[1],/^\d{8}-create3d\d+$/);
  assert.match(build,/const buildVersionMatch=configSource\.match/);
  assert.match(build,/version\.json/);
  assert.match(build,/SITE_VERSION/);
  assert.match(build,/buildVersion/);
});

test('root and html entrypoints are no-store so legacy creator HTML cannot survive a release',()=>{
  assert.match(build,/['"]\/\\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(build,/\/index\.html\\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(build,/\/\*\.html\\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
});
