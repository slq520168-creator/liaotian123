import {access,cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url),out=new URL('dist/',root);
const runtimeJs=[
  'role-experience.js','role-presence.js','role-visual-recipe.js','role-unified-human-recipe.js','role-unified-human-runtime.js','role-accessory-geometry.js','role-face-rig.js','role-direct-viseme-rig.js','role-render-loop.js','role-body-rig.js','role-proportion-rig.js','role-appearance-rig.js',
  'role-meshopt-support.js','role-human-manifest.js','role-asset-policy.js','role-human-asset-capability.js','role-human-renderer.js','role-safe-skeleton-motion.js','role-natural-pose.js','role-fullscreen-stage.js','role-render-recipe-bridge.js',
  'role-chat-mode.js','role-voice-stage.js','role-voice-style.js','role-code-compat.js','role-persistence.js','role-builder.js','role-eye-color.js','role-creator-studio.js','role-creator-identity.js','role-creator-3d-preview.js','role-creator-animated-presets.js','role-custom-visual.js','role-mobile-qa-diagnostics.js','role-unified-custom-chat.js','role-unified-production-gate.js'
];
const staticEntries=[
  'index.html','app.js','memory.js','role-code.js','roles.js','styles.css',...runtimeJs,
  'role-experience.css','role-voice-stage.css','chat-compact-ui.css','manifest.webmanifest','apple-touch-icon.png','favicon.ico','version.json','config','roles','assets','docs'
];

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const name of staticEntries)await cp(new URL(name,root),new URL(name,out),{recursive:true});

const threeSource=new URL('node_modules/three/',root);
const threeOut=new URL('vendor/three/',out);
await mkdir(new URL('build/',threeOut),{recursive:true});
await mkdir(new URL('examples/jsm/loaders/',threeOut),{recursive:true});
await mkdir(new URL('examples/jsm/utils/',threeOut),{recursive:true});
for(const name of ['three.module.js','three.core.js'])await cp(new URL(`build/${name}`,threeSource),new URL(`build/${name}`,threeOut));
await cp(new URL('LICENSE',threeSource),new URL('LICENSE',threeOut));

async function copyThreeAddon(path){
  let source=await readFile(new URL(path,threeSource),'utf8');
  source=source.replace(/from\s+['"]three['"]/g,"from '../../../build/three.module.js'");
  await writeFile(new URL(path,threeOut),source);
}
for(const path of ['examples/jsm/loaders/GLTFLoader.js','examples/jsm/utils/BufferGeometryUtils.js','examples/jsm/utils/SkeletonUtils.js'])await copyThreeAddon(path);

const meshoptOut=new URL('vendor/meshoptimizer/',out);
await mkdir(meshoptOut,{recursive:true});
await cp(new URL('node_modules/meshoptimizer/meshopt_decoder.mjs',root),new URL('meshopt_decoder.mjs',meshoptOut));
try{await cp(new URL('node_modules/meshoptimizer/LICENSE.md',root),new URL('LICENSE.md',meshoptOut));}catch{}

const configSource=await readFile(new URL('config/app.js',root),'utf8');
const referencedRuntime=[...configSource.matchAll(/['"](role-[a-z0-9-]+\.js)['"]/gi)].map(match=>match[1]);
for(const name of referencedRuntime)await access(new URL(name,out));
for(const path of ['vendor/three/build/three.module.js','vendor/three/build/three.core.js','vendor/three/examples/jsm/loaders/GLTFLoader.js','vendor/three/examples/jsm/utils/BufferGeometryUtils.js','vendor/three/examples/jsm/utils/SkeletonUtils.js','vendor/meshoptimizer/meshopt_decoder.mjs'])await access(new URL(path,out));

await writeFile(new URL('_headers',out),
  '/*.html\n  Cache-Control: no-cache\n'+
  '/version.json\n  Cache-Control: no-store\n'+
  '/config/app.js\n  Cache-Control: no-store\n'+
  '/vendor/*\n  Cache-Control: public, max-age=300, must-revalidate\n'+
  '/*.js\n  Cache-Control: public, max-age=300, must-revalidate\n'+
  '/*.css\n  Cache-Control: public, max-age=300, must-revalidate\n'
);
