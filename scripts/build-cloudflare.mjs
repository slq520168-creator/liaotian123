import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('dist/',root);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','app.js','memory.js','role-code.js','roles.js','styles.css','manifest.webmanifest','apple-touch-icon.png','favicon.ico','version.json','config','roles','assets','docs']){
 await cp(new URL(name,root),new URL(name,out),{recursive:true});
}
await writeFile(new URL('_headers',out),'/*.html\n  Cache-Control: no-cache\n/version.json\n  Cache-Control: no-store\n/*.js\n  Cache-Control: public, max-age=300, must-revalidate\n');

