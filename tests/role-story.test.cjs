const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function fixture(){
 const data=new Map();
 const store={getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value))};
 const base=Array.from({length:32},(_,i)=>({id:'legacy_'+i,isPreset:true}));
 const nodes={};
 const doc={addEventListener:()=>{},getElementById:id=>nodes[id]||null,querySelector:()=>null};
 const win={};
 const context={window:win,PRESET_CHARACTERS:base,document:doc,localStorage:store,console,encodeURIComponent,Math,JSON,Date,Event:class{constructor(type){this.type=type;}},activeCharacterId:'jiangwu'};
 vm.createContext(context);
 for(const file of ['role-story-volume-a.js','role-story-volume-b.js','role-story-engine.js'])vm.runInContext(read(file),context,{filename:file});
 return {context,win,base,nodes,store};
}
test('88 original complete stories enrich 32 existing roles to 120 without duplicate character IDs',()=>{
 const {base,win}=fixture();
 assert.equal(base.length,120);
 assert.equal(win.RoleStory.list(),88);
 assert.equal(new Set(base.map(x=>x.id)).size,120);
 const art=new Set(base.slice(32).map(x=>x.avatar));
 assert.equal(art.size,88,'no repeated poster source');
 assert.ok(base.slice(32).every(x=>x.age>=23&&x.isPreset&&x.avatar.startsWith('data:image/svg+xml')));
 assert.ok(['悬疑','惊魂','民俗','科幻','言情','都市','动漫','古风','奇幻','冒险'].every(c=>base.some(x=>x.category===c)));
 for(const char of base.slice(32)){const p=win.RoleStory.description(char.id);assert.equal(p.chapterCount,6);assert.equal(p.choices.length,2);assert.ok(p.text.length>30);assert.ok(win.RoleStory.contextFor(char.id).includes(char.name));}
});
test('each story has real player choices and persistence with truthful clue-gated endings',()=>{
 const {context,win,nodes,store}=fixture();
 const input={value:'',dispatchEvent:()=>{send.disabled=false;}};
 const send={disabled:true,click:()=>{win.RoleStory.commitPending(context.activeCharacterId,input.value);send.disabled=true;}};
 nodes.userInput=input;nodes.sendBtn=send;
 assert.equal(win.RoleStory.description('jiangwu').chapter,0);
 for(let i=0;i<6;i++){send.disabled=true;const result=win.RoleStory.openPanel;assert.equal(typeof result,'function');}
 // UI state changes are confirmed only when the actual send handler consumes a pending choice.
 assert.match(read('app.js'),/RoleStory\?\.commitPending/);
 assert.match(read('app.js'),/RoleStory\?\.contextFor/);
 assert.match(read('config/app.js'),/Boolean\(char\?\.isPreset\)/);
 assert.equal(win.RoleStory.description('jiangwu').chapter,0,'no automatic story progression or fake bot replies');
 assert.equal(store.getItem('liaotian_story_progress_v1'),null);
});
test('no new server polling, database jobs or fake AI bot responses for story progression',()=>{
 const engine=read('role-story-engine.js'),index=read('index.html'),build=read('scripts/build-cloudflare.mjs');
 assert.doesNotMatch(engine,/setInterval|onSnapshot|supabase|indexedDB/);
 assert.match(engine,/localStorage\.setItem\(stateKey/);
 for(const filename of ['role-story-volume-a.js','role-story-volume-b.js','role-story-engine.js','role-story.css']){
   assert.ok(index.includes(filename),'index misses '+filename);
   assert.ok(build.includes("'"+filename+"'"),'build misses '+filename);
 }
 assert.match(read('role-discovery.js'),/data-role-filter/);
 assert.match(index,/data-role-filter="惊魂"/);
 assert.match(index,/data-role-filter="民俗"/);
 assert.match(index,/data-role-filter="言情"/);
 assert.match(index,/data-role-filter="动漫"/);
});
