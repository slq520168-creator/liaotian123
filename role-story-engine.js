/* 120 role story engine: original branching fiction, offline local progress and no synthetic AI replies. */
(function(){
'use strict';
const seeds=Array.isArray(window.LIAOTIAN_STORY_SEEDS)?window.LIAOTIAN_STORY_SEEDS:[];
const stateKey='liaotian_story_progress_v1';
const byId=new Map();
const sceneByGenre={
'悬疑':'雨夜城市和暗色霓虹','惊魂':'无人长廊与微弱烛光',
'民俗':'旧城灯笼与雕花屋檐','科幻':'未来天际与蓝色全息光屏',
'言情':'城市豪宅与戏剧性灯光','都市':'温暖公寓与城市街景',
'动漫':'舞台灯光与潮流街区','古风':'山水古院与月色',
'奇幻':'魔法城堡和飘浮荧光','冒险':'海湾或异国城市天际'};
const ARTWORK_CATALOG=window.LIAOTIAN_STORY_COVERS||{};
function coverFor(seed) {
  const src=ARTWORK_CATALOG[seed.id];
  if(!src||typeof src!=='string')throw Error('Missing role art '+seed.id);
  return src;
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
 avatar:seed.avatar||coverFor(seed),avatarIsStoryPoster:false,storybook:true,
 photoRealistic:Boolean(seed.photoRealistic),region:seed.region||'',countryLabel:seed.countryLabel||'',
 mark:'✦',greeting:intro,
 personality:seed.age+'岁的'+seed.occupation+'。'+seed.traits.join('、')+'。有独立人格、隐秘的过去与完整动机。故事真相与人物代价必须随章节逐步揭示。',
 voice:traitVoice[seed.genre],background:'虚构舞台：'+(sceneByGenre[seed.genre]||'故事世界')+'。第一幕：'+seed.opening+'。后续线索和真相只能按剧情进度揭示，不得在开场泄露。',
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
 const header=document.querySelector('.chat-header .rd-menu-panel')||document.querySelector('.chat-header .header-actions');
 const main=document.querySelector('.chat-main');
 if(!header||!main||document.getElementById('rdStoryToggle'))return;
 const btn=document.createElement('button');btn.id='rdStoryToggle';btn.type='button';
 btn.className='icon-btn rd-story-toggle';btn.textContent='故事章节';btn.title='查看角色故事与剧情选项';
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