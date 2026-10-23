import {access,cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url),out=new URL('dist/',root);
const runtimeJs=[
  'role-experience.js',
  'role-presence.js',
  'role-visual-recipe.js',
  'role-face-rig.js',
  'role-direct-viseme-rig.js',
  'role-render-loop.js',
  'role-body-rig.js',
  'role-proportion-rig.js',
  'role-appearance-rig.js',
  'role-meshopt-support.js',
  'role-human-manifest.js',
  'role-asset-policy.js',
  'role-human-renderer.js',
  'role-fullscreen-stage.js',
  'role-render-recipe-bridge.js',
  'role-voice-stage.js',
  'role-code-compat.js',
  'role-persistence.js',
  'role-builder.js',
  'role-custom-visual.js'
];
const staticEntries=[
  'index.html','app.js','memory.js','role-code.js','roles.js','styles.css',
  ...runtimeJs,
  'role-experience.css','role-voice-stage.css','chat-compact-ui.css',
  'manifest.webmanifest','apple-touch-icon.png','favicon.ico','version.json',
  'config','roles','assets','docs'
];

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const name of staticEntries){
  await cp(new URL(name,root),new URL(name,out),{recursive:true});
}

const configSource=await readFile(new URL('config/app.js',root),'utf8');
const referencedRuntime=[...configSource.matchAll(/['"](role-[a-z0-9-]+\.js)['"]/gi)].map(match=>match[1]);
for(const name of referencedRuntime){
  await access(new URL(name,out));
}

await writeFile(new URL('_headers',out),
  '/*.html\n  Cache-Control: no-cache\n'+
  '/version.json\n  Cache-Control: no-store\n'+
  '/config/app.js\n  Cache-Control: no-store\n'+
  '/*.js\n  Cache-Control: public, max-age=300, must-revalidate\n'+
  '/*.css\n  Cache-Control: public, max-age=300, must-revalidate\n'
);
