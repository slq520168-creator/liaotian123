/* 120 role story engine: original branching fiction, offline local progress and no synthetic AI replies. */
(function(){
'use strict';
const seeds=Array.isArray(window.LIAOTIAN_STORY_SEEDS)?window.LIAOTIAN_STORY_SEEDS:[];
const stateKey='liaotian_story_progress_v1';
const byId=new Map();
const palette={
 '悬疑':['#19213a','#aa6eab','#ebe0fa'],'惊魂':['#111a24','#b1505c','#eeb4a8'],
 '民俗':['#2b1120','#dba66a','#f3d0a3'],'科幻':['#081e3a','#3ed6d6','#b0dcff'],
 '言情':['#3a1732','#c78baf','#ffe1ec'],'都市':['#221b3a','#a4a9ea','#f6e4f0'],
 '动漫':['#27143e','#e088cf','#ffe3fa'],'古风':['#152b36','#d1ad86','#eae1ca'],
 '奇幻':['#171837','#b4a0ef','#fcddc4'],'冒险':['#1c2937','#c5996d','#f1dabd']
};
const sceneByGenre={
'悬疑':'雨夜城市和暗色霓虹','惊魂':'无人长廊与微弱烛光',
'民俗':'旧城灯笼与雕花屋檐','科幻':'未来天际与蓝色全息光屏',
'言情':'城市豪宅与戏剧性灯光','都市':'温暖公寓与城市街景',
'动漫':'舞台灯光与潮流街区','古风':'山水古院与月色',
'奇幻':'魔法城堡和飘浮荧光','冒险':'海湾或异国城市天际'};
const esc=value=>String(value||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function poster(seed,index){
 const [deep,light,highlight]=palette[seed.genre]||palette['都市'];
 const hairHints=['束发','短发','蓬松卷发','长波浪','高马尾','丸子头','不规则短发','中长发'];
 const hair=seed.look.includes('爆炸')||seed.look.includes('卷发')?'curly':seed.look.includes('丸子')||seed.look.includes('盘发')?'bun':seed.look.includes('马尾')||seed.look.includes('束发')?'pony':seed.look.includes('短发')?'short':'long';
 const poses=['M270 248 C190 290 140 400 156 535 L124 822 L609 822 577 526 C563 392 513 286 428 246Z',
'M268 259 C201 313 197 396 224 518 L132 823 L616 823 537 499 C567 352 507 286 428 248Z',
'M275 260 C192 283 176 433 203 582 L112 826 L604 826 549 538 C559 425 520 316 427 264Z',
'M288 265 C218 287 179 392 155 514 L164 830 L593 830 581 526 C545 414 510 304 427 255Z'];
 const pose=poses[index%poses.length];
 const skin=['#c99070','#e2a788','#8a5946','#e9b794','#b97854','#d59a75'][index%6];
 const hairColor=['#140e21','#a66b3e','#181828','#af5e72','#e8d8c4','#6b305b','#302121'][index%7];
 const dress=['#121b32','#7d355e','#151526','#2b5365','#5e2d45','#385c60'][index%6];
 const flip=index%4===1?'translate(760,0) scale(-1,1)':'';
 let hairPath='';
 if(hair==='short')hairPath='M259 237 Q235 148 335 127 Q455 89 493 215 L460 249 Q457 168 389 175 Q305 154 273 259Z';
 else if(hair==='bun')hairPath='M258 234 Q231 146 326 128 Q457 85 494 219 L481 269 Q465 152 402 168 Q292 150 269 254Z M417 152 Q445 65 507 84 Q568 119 507 167Z';
 else if(hair==='pony')hairPath='M244 242 Q223 125 337 117 Q470 109 509 242 L475 274 Q482 161 389 162 Q290 140 271 274Z M467 158 Q566 131 591 269 Q613 412 573 503 Q555 373 514 316Z';
 else if(hair==='curly')hairPath='M244 260 Q192 218 218 165 Q213 110 274 109 Q308 57 365 91 Q412 41 462 113 Q525 118 541 174 Q570 220 510 284 Q502 194 422 176 Q315 144 262 278Z';
 else hairPath='M238 241 Q222 133 330 109 Q466 89 506 213 Q522 398 532 487 L477 484 Q480 249 438 192 Q310 159 273 261 L265 481 L214 490Z';
 const title=esc(seed.title),fullname=esc(seed.name),place=esc(sceneByGenre[seed.genre]),scene=esc(seed.genre);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 1024" width="760" height="1024">'+
 '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+deep+'"/><stop offset=".6" stop-color="'+light+'"/><stop offset="1" stop-color="#080b19"/></linearGradient>'+
 '<radialGradient id="a"><stop stop-color="'+highlight+'" stop-opacity=".7"/><stop offset="1" stop-color="'+highlight+'" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+dress+'"/><stop offset=".6" stop-color="'+deep+'"/><stop offset="1" stop-color="#05040c"/></linearGradient>'+
 '<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a091a" stop-opacity="0"/><stop offset="1" stop-color="#080817" stop-opacity=".9"/></linearGradient></defs>'+
 '<rect width="760" height="1024" fill="url(#bg)"/>'+
 '<circle cx="'+(index%2?205:545)+'" cy="255" r="340" fill="url(#a)"/>'+
 '<g opacity=".46" stroke="'+highlight+'" stroke-width="2"><path d="M5 708L240 475 347 600 570 295 755 544" fill="none"/><path d="M0 772L202 528 400 699 592 375 760 529" fill="none"/><path d="M0 875L260 730 415 764 570 614 760 682" fill="none"/></g>'+
 '<g opacity=".32" fill="'+highlight+'"><rect x="55" y="490" width="64" height="420"/><rect x="128" y="421" width="56" height="489"/><rect x="612" y="380" width="79" height="560"/><rect x="548" y="510" width="47" height="420"/></g>'+
 '<circle cx="594" cy="150" r="39" stroke="'+highlight+'" stroke-opacity=".74" stroke-width="3" fill="none"/>'+
 '<g transform="'+flip+'"><path d="'+pose+'" fill="url(#cloth)" stroke="'+highlight+'" stroke-width="3"/>'+
 '<path d="M306 268 L337 363 Q378 393 419 365 L452 266" fill="'+skin+'"/>'+
 '<ellipse cx="380" cy="213" rx="104" ry="124" fill="'+skin+'"/>'+
 '<path d="'+hairPath+'" fill="'+hairColor+'"/>'+
 '<path d="M292 214 Q330 194 360 216 M401 216 Q430 196 465 213" fill="none" stroke="#241921" stroke-width="8" stroke-linecap="round"/>'+
 '<circle cx="333" cy="225" r="8" fill="#1b1a27"/><circle cx="432" cy="225" r="8" fill="#1b1a27"/>'+
 '<path d="M380 231 L371 274 388 275 M350 300 Q381 321 417 295" fill="none" stroke="#8d554e" stroke-width="5" stroke-linecap="round"/>'+
 '<path d="M273 374 Q380 433 482 376" fill="none" stroke="'+highlight+'" stroke-opacity=".63" stroke-width="7"/>'+
 '<path d="M281 551 Q386 512 472 551" fill="none" stroke="'+highlight+'" stroke-opacity=".22" stroke-width="13"/></g>'+
 '<rect width="760" height="1024" fill="url(#shade)"/>'+
 '<g font-family="system-ui, Noto Sans CJK SC, sans-serif" fill="'+highlight+'"><text x="43" y="67" font-size="23" letter-spacing="8" font-weight="700">'+scene+'</text><text x="46" y="856" fill="#f7ecff" font-size="48" font-weight="800">'+fullname+'</text><text x="46" y="909" font-size="26" fill="'+highlight+'">'+title+'</text><text x="46" y="956" font-size="20" fill="#ffffff" fill-opacity=".74">'+place+'</text></g></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const traitVoice={
 '悬疑':'谨慎、推理严密。提出猜测时必须指出故事内证据，发现线索不凭空补造。',
 '惊魂':'压抑却克制，利用声音、空间与不可靠记忆制造心理恐惧，不描写血腥或极端暴力。',
 '民俗':'古怪而有温度，区分民俗传说和现实事实，不把迷信当真实科学。',
 '科幻':'理智又富同情，尊重玩家选择，技术只是虚构世界设定。',
 '言情':'成熟而有吸引力，靠具体举动和关系发展推进亲密，不命令、控制或强迫玩家。',
 '都市':'自然有趣，生活细节与情感选择互相影响，尊重边界。',
 '动漫':'个性鲜明，表情与行动生动但不过度装腔，所有角色都是成年人。',
 '古风':'语言雅致易懂，重人情与责任，不强制等级关系。',
 '奇幻':'具有神话气息，世界规则前后保持一致，魔法不作为现实知识。',
 '冒险':'勇敢机警，对旅程的环境和线索保持连续性，尊重玩家安全。'
};
const listed=new Set(PRESET_CHARACTERS.map(x=>x.id));
seeds.forEach((seed,index)=>{
 if(listed.has(seed.id))throw new Error('Story ID already in existing roster '+seed.id);
 listed.add(seed.id);byId.set(seed.id,seed);
 const intro='【'+seed.title+'】'+seed.opening+'。'+seed.name+'低声说：“你来得正好。这里有一件事，我不想一个人面对。”';
 const role={
 id:seed.id,name:seed.name,age:seed.age,gender:seed.gender,isPreset:true,roleKind:'2d',
 category:seed.genre,headline:seed.occupation,tag:seed.genre+' · '+seed.occupation,
 traits:seed.traits,hook:seed.opening,sceneLabel:seed.title,
 avatar:poster(seed,index),avatarIsStoryPoster:true,mark:'✦',greeting:intro,
 personality:seed.age+'岁的'+seed.occupation+'。'+seed.traits.join('、')+'。有独立人格和完整动机。目标：'+seed.stakes,
 voice:traitVoice[seed.genre],background:'虚构舞台：'+(sceneByGenre[seed.genre]||'故事世界')+'。第一幕：'+seed.opening+'。核心线索：'+seed.clue+'。',
 interests:'故事研究、场景探索、人物关系',relationship:'玩家是平等的故事参与者；不替玩家做决定，不能强迫亲密或操纵关系。',
 conversation:{日常:'保持角色生活与独特语气；不重复开场白。',故事:'跟随独立的故事章节与玩家选择逐步推进，先埋线索再揭谜底。',情感:'尊重已建立的信任与边界，不快速强制确立关系。'},
 quickReplies:['这个故事从哪里开始？','先告诉我现在发生了什么','我们一起找第一条线索','你为什么要信任我？']
 };
 PRESET_CHARACTERS.push(role);
});
function load(){
 try{
  const data=JSON.parse(localStorage.getItem(stateKey)||'{}');
  return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
 }catch{return {};}
}
let all=load(),pending=null;
function current(id){
 const val=all[id];
 if(!val||typeof val!=='object')return {chapter:0,trust:0,evidence:0,route:[],ending:''};
 return {chapter:Math.max(0,Math.min(6,Number(val.chapter)||0)),trust:Math.max(-5,Math.min(5,Number(val.trust)||0)),evidence:Math.max(0,Math.min(6,Number(val.evidence)||0)),route:Array.isArray(val.route)?val.route.slice(0,6):[],ending:typeof val.ending==='string'?val.ending:''};
}
function write(id,next){all[id]=next;try{localStorage.setItem(stateKey,JSON.stringify(all));}catch{}}
const stages=[
 {title:'异常来临',describe:s=>'发生了无法解释的事：'+s.opening+'。你要先留下查证，还是让'+s.name+'解释自己的立场？',
  options:s=>['先留在现场仔细核实','先听'+s.name+'解释事情经过']},
 {title:'第一条线索',describe:s=>'你们终于找到了可以核对的事实：'+s.clue+'。它不是传闻，而是现在就能检查的物证。',
  options:s=>['记录并保存这条线索','追查这条线索是谁留下的']},
 {title:'危险的误导',describe:s=>'另一种解释把所有人推向错误方向：'+s.redHerring+'。但此前的物证与这种说法有矛盾。',
  options:s=>['用之前的物证核实传闻','先询问最可能隐瞒事实的人']},
 {title:'信任的考验',describe:s=>'继续深入将付出代价：'+s.stakes+'。'+s.name+'不得不坦承自己的顾虑。',
  options:s=>['相信'+s.name+'，共同承担责任','先独立确认风险，再决定是否行动']},
 {title:'真相浮现',describe:s=>'此前的线索最终能拼出答案：'+s.truth+'。误导并非全部恶意，但代价真实存在。',
  options:s=>['整理全部证据，让真相公开','尽量保护当事人，先私下解决']},
 {title:'最后的抉择',describe:s=>'故事来到终章。真相与信任已不能兼得一切：'+s.stakes+'。你的最后决定会影响结局。',
  options:s=>['坚持公开事实，承担后果','优先守护彼此，寻找更温柔的解决方式']}
];
function description(id){const seed=byId.get(id),s=current(id);if(!seed)return null;
 const chapter=Math.min(s.chapter,5),stage=stages[chapter];return {
 id,title:seed.title,genre:seed.genre,chapter:s.chapter,chapterTitle:s.chapter>=6?'结局':stage.title,
 text:s.chapter>=6?endingText(seed,s):stage.describe(seed),
 choices:s.chapter>=6?[]:stage.options(seed),chapterCount:6,
 trust:s.trust,evidence:s.evidence,ending:s.ending,finished:s.chapter>=6
 };
}
function endingText(seed,progress){
 if(progress.ending==='truth')return '【真相结局】'+seed.truth+'。你们以保存的证据还原了事情的全过程，没有凭空多出最后一刻的关键情报。尽管'+seed.stakes+'，'+seed.name+'仍然决定与玩家共同面对接下来的世界。';
 if(progress.ending==='bond')return '【守护结局】'+seed.truth+'。你们先保护受到影响的人，再选择合适的时机与方式公开。'+seed.name+'记住了你们做过的每一个重要决定。'+seed.stakes+'成为后续故事需要承担的责任。';
 return '【余烬结局】'+seed.truth+'。事情有了答案，但你们没能同时保全证据与信任。'+seed.stakes+'使这段相遇留下余波。'+seed.name+'愿意在下一段故事里继续弥补。';
}
function contextFor(id){
 const seed=byId.get(id);if(!seed)return '';
 const st=current(id),chapter=Math.min(st.chapter,5);
 const intro=[
 '【互动长篇小说世界设定】原创作品《'+seed.title+'》，类型：'+seed.genre+'。人物身份：'+seed.occupation+'。',
 '当前章节：第'+(st.chapter>=6?'六章完结':chapter+1+'章《'+stages[chapter].title+'》')+'。剧情进度由网站保存，不得自行跳过或重置章节。',
 '已知事实：'+seed.opening,
 '第一条物证：'+(chapter>=1?seed.clue:'尚未检查；本章先铺设异常与玩家动机。'),
 '误导与调查矛盾：'+(chapter>=2?seed.redHerring:'尚未调查；不要提前讲出。'),
 '人物面临的风险：'+(chapter>=3?seed.stakes:'此时尚不知全部代价。'),
 '真相：'+(chapter>=4?seed.truth:'尚未揭晓。严禁提前泄露真凶、谜底或直接跳到结局。'),
 '玩家已选路线：'+(st.route.length?st.route.map((r,i)=>'第'+(i+1)+'章：'+r.choice).join('；'):'尚无选择。'),
 '证据值：'+st.evidence+'，信任值：'+st.trust+'。',
 '本章目标：'+(st.chapter>=6?endingText(seed,st):stages[chapter].describe(seed)),
 '回复必须依靠当前可用线索推进，不得机械复述系统文字，不得伪造角色在现实中的行为。尊重玩家自由输入，不能把剧情选择强制塞给玩家。'
 ];
 return intro.join('\n');
}
function commitPending(id,text){
 if(!pending||pending.id!==id||pending.text!==text)return false;
 const seed=byId.get(id);if(!seed){pending=null;return false;}
 const progress=current(id);
 if(progress.chapter>=6||progress.chapter!==pending.chapter){pending=null;return false;}
 const selected=pending.choice;pending=null;
 const choice=stages[progress.chapter].options(seed)[selected];
 const trust=progress.trust+(selected===1?1:0);
 const evidence=progress.evidence+(selected===0?1:0);
 const next={chapter:progress.chapter+1,trust,evidence,route:[...progress.route,{chapter:progress.chapter,choice}].slice(-6),ending:''};
 if(next.chapter===6)next.ending=next.evidence>=4?'truth':next.trust>=4?'bond':'open';
 write(id,next);
 render();
 return true;
}
function sendChoice(id,index){
 const seed=byId.get(id),progress=current(id);
 if(!seed||progress.chapter>=6||![0,1].includes(index))return false;
 if(typeof activeCharacterId==='undefined'||activeCharacterId!==id)return false;
 const input=document.getElementById('userInput'),send=document.getElementById('sendBtn');
 if(!input||!send)return false;
 const choice=stages[progress.chapter].options(seed)[index],msg='【'+seed.title+' · 第'+(progress.chapter+1)+'章选择】'+choice+'。请按这个决定继续故事。';
 pending={id,chapter:progress.chapter,choice:index,text:msg};
 input.value=msg;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 if(send.disabled){pending=null;return false;}
 send.click();
 return true;
}
function activeId(){return typeof activeCharacterId==='string'?activeCharacterId:'';}
function render(){
 const panel=document.getElementById('roleStoryPanel'),toggle=document.getElementById('rdStoryToggle');
 if(!panel||!toggle)return;
 const id=activeId(),story=description(id);
 toggle.hidden=!story;
 if(!story){panel.hidden=true;return;}
 if(panel.hidden)return;
 const h=document.getElementById('roleStoryHeader'),body=document.getElementById('roleStoryBody'),actions=document.getElementById('roleStoryChoices');
 if(!h||!body||!actions)return;
 h.textContent=story.title+' · '+(story.finished?'已完结':(story.chapter+1)+'/6章');
 body.replaceChildren();
 const label=document.createElement('strong');label.textContent=story.chapterTitle;
 const paragraph=document.createElement('p');paragraph.textContent=story.text;
 const progress=document.createElement('p');progress.className='role-story-progress';progress.textContent='调查线索 '+story.evidence+' · 关系信任 '+story.trust+' · 独立进度已保存';
 body.append(label,paragraph,progress);
 actions.replaceChildren();
 for(const [index,option] of story.choices.entries()){
  const btn=document.createElement('button');btn.type='button';btn.className='role-story-choice';
  btn.textContent=(index+1)+'  '+option;
  btn.addEventListener('click',()=>{if(sendChoice(story.id,index))panel.hidden=true;});
  actions.append(btn);
 }
 if(story.finished){
  const reset=document.createElement('button');reset.type='button';reset.className='role-story-replay';reset.textContent='重新体验剧情';
  reset.addEventListener('click',()=>{write(story.id,{chapter:0,trust:0,evidence:0,route:[],ending:''});render();});
  actions.append(reset);
 }
}
function openPanel(){
 const panel=document.getElementById('roleStoryPanel'),btn=document.getElementById('rdStoryToggle');
 if(!panel||!btn)return;
 panel.hidden=!panel.hidden;
 btn.setAttribute('aria-expanded',String(!panel.hidden));
 render();
}
function installUI(){
 const header=document.querySelector('.chat-header .header-actions');
 const main=document.querySelector('.chat-main');
 if(!header||!main||document.getElementById('rdStoryToggle'))return;
 const btn=document.createElement('button');btn.id='rdStoryToggle';btn.type='button';
 btn.className='icon-btn rd-story-toggle';btn.textContent='♧';btn.title='查看角色故事与剧情选项';
 btn.setAttribute('aria-label','打开完整故事章节');btn.setAttribute('aria-expanded','false');
 btn.addEventListener('click',openPanel);header.prepend(btn);
 const panel=document.createElement('aside');panel.id='roleStoryPanel';panel.className='role-story-panel';panel.hidden=true;
 panel.setAttribute('aria-label','独立互动故事章节');
 const title=document.createElement('div');title.className='role-story-title';
 const h=document.createElement('span');h.id='roleStoryHeader';
 const close=document.createElement('button');close.type='button';close.className='role-story-close';close.textContent='×';close.setAttribute('aria-label','关闭剧情');
 close.addEventListener('click',()=>{panel.hidden=true;btn.setAttribute('aria-expanded','false');});
 title.append(h,close);
 const body=document.createElement('div');body.id='roleStoryBody';body.className='role-story-content';
 const actions=document.createElement('div');actions.id='roleStoryChoices';actions.className='role-story-choices';
 panel.append(title,body,actions);main.append(panel);
 const name=document.getElementById('headerName');
 if(name)new MutationObserver(render).observe(name,{childList:true,characterData:true,subtree:true});
 render();
}
document.addEventListener('DOMContentLoaded',installUI,{once:true});
window.RoleStory=Object.freeze({list:()=>seeds.length,has:id=>byId.has(id),description,contextFor,commitPending,choose:sendChoice,render,openPanel,readState:current});
})();