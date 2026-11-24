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
 const base=Array.from({length:20},(_,i)=>({id:'legacy_'+i,isPreset:true}));
 const nodes={};
 const doc={addEventListener:()=>{},getElementById:id=>nodes[id]||null,querySelector:()=>null};
 const win={};
 const context={window:win,PRESET_CHARACTERS:base,document:doc,localStorage:store,console,encodeURIComponent,Math,JSON,Date,Event:class{constructor(type){this.type=type;}},activeCharacterId:'jiangwu'};
 vm.createContext(context);
 for(const file of ['role-story-volume-a.js','role-story-volume-b.js','role-photo-collection.js','role-story-cover-catalog.js','role-story-engine.js'])vm.runInContext(read(file),context,{filename:file});
 return {context,win,base,nodes,store};
}
test('104 original stories enrich 20 existing 2D characters to 124 without duplicate IDs',()=>{
 const {base,win}=fixture();
 assert.equal(base.length,124);
 assert.equal(win.RoleStory.list(),104);
 assert.equal(new Set(base.map(x=>x.id)).size,124);
 const art=new Set(base.slice(20).map(x=>x.avatar));
 assert.equal(art.size,104,'no repeated portrait/poster source');
 assert.ok(base.slice(20).every(x=>x.age>=23&&x.isPreset&&(x.avatar.startsWith('https://images.pexels.com/photos/')||/^assets\/role-portraits\/intl-[a-z0-9]+\.webp$/.test(x.avatar))));
 assert.ok(base.slice(20).every(x=>!x.background.includes('核心线索：')&&!x.personality.includes('目标：')),'opening prompt must not spoil later evidence or sacrifices');
 assert.ok(['悬疑','惊魂','民俗','科幻','言情','都市','动漫','古风','奇幻','冒险'].every(c=>base.some(x=>x.category===c)));
 for(const char of base.slice(20)){const p=win.RoleStory.description(char.id);assert.equal(p.chapterCount,6);assert.equal(p.choices.length,2);assert.ok(p.text.length>30);assert.ok(win.RoleStory.contextFor(char.id).includes(char.name));}
});
test('choices are consumed by the real send path; six chapters persist and can lead to different endings',()=>{
 const {context,win,nodes,store}=fixture();
 const input={value:'',dispatchEvent:()=>{send.disabled=false;}};
 const send={disabled:true,click:()=>{assert.equal(win.RoleStory.commitPending(context.activeCharacterId,input.value),true);send.disabled=true;input.value='';}};
 nodes.userInput=input;nodes.sendBtn=send;
 assert.equal(win.RoleStory.description('jiangwu').chapter,0);
 assert.doesNotMatch(win.RoleStory.contextFor('jiangwu'),/旧楼的匿名守护者/,'secret must not be disclosed before the reveal');
 for(let i=0;i<6;i++){assert.equal(win.RoleStory.choose('jiangwu',0),true);assert.equal(win.RoleStory.description('jiangwu').chapter,i+1);}
 assert.equal(win.RoleStory.description('jiangwu').ending,'truth');
 assert.equal(win.RoleStory.description('jiangwu').choices.length,0);
 assert.equal(JSON.parse(store.getItem('liaotian_story_progress_v1')).jiangwu.route.length,6);
 context.activeCharacterId='muyue';
 for(let i=0;i<6;i++)assert.equal(win.RoleStory.choose('muyue',1),true);
 assert.equal(win.RoleStory.description('muyue').ending,'bond');
 context.activeCharacterId='nanxue';
 for(let i=0;i<6;i++)assert.equal(win.RoleStory.choose('nanxue',i%2),true);
 assert.equal(win.RoleStory.description('nanxue').ending,'open');
 const before=win.RoleStory.description('jiangwu').chapter;
 assert.equal(win.RoleStory.choose('jiangwu',0),false);
 assert.equal(win.RoleStory.description('jiangwu').chapter,before);
 assert.match(read('app.js'),/RoleStory\?\.commitPending/);
 assert.match(read('app.js'),/RoleStory\?\.contextFor/);
 assert.match(read('config/app.js'),/RoleCatalogPolicy/);
});
test('only trusted preset story SVG data URIs may be displayed as chat avatars',()=>{
 const app=read('app.js');
 assert.match(app,/char\.isPreset&&char\.avatarIsStoryPoster&&char\.avatar===src/);
 assert.match(app,/startsWith\('data:image\/svg\+xml;charset=utf-8,'\)/);
 assert.doesNotMatch(app,/return src;\s*\/\/ unsafe SVG/);
});
test('no new server polling, database jobs or fake AI bot responses for story progression',()=>{
 const engine=read('role-story-engine.js'),index=read('index.html'),build=read('scripts/build-cloudflare.mjs');
 assert.doesNotMatch(engine,/setInterval|onSnapshot|supabase|indexedDB/);
 assert.match(engine,/localStorage\.setItem\(stateKey/);
 for(const filename of ['role-story-volume-a.js','role-story-volume-b.js','role-photo-collection.js','role-story-cover-catalog.js','role-story-engine.js','role-story.css']){
   assert.ok(index.includes(filename),'index misses '+filename);
   assert.ok(build.includes("'"+filename+"'"),'build misses '+filename);
 }
 assert.match(read('role-discovery.js'),/data-role-filter/);
 assert.match(index,/data-role-filter="惊魂"/);
 assert.match(index,/data-role-filter="民俗"/);
 assert.match(index,/data-role-filter="言情"/);
 assert.match(index,/data-role-filter="动漫"/);
});

test('no procedural SVG people, 88 distinct photo sources for all generated stories',()=>{
 const engine=read('role-story-engine.js'),catalog=read('role-story-cover-catalog.js');
 const ids=[...catalog.matchAll(/"([a-z][a-z0-9]+)": "https:\/\/images\.pexels\.com\/photos\/(\d+)\//g)];
 assert.equal(ids.length,88);
 assert.equal(new Set(ids.map(x=>x[1])).size,88);
 assert.equal(new Set(ids.map(x=>x[2])).size,88);
 assert.doesNotMatch(engine,/function poster\(|data:image\/svg\+xml/);
 assert.match(engine,/seed\.avatar\|\|coverFor\(seed\)/);
});
