(() => {
  'use strict';
  if(typeof parseRoleCode!=='function'||parseRoleCode.__threeDOnlyCode)return;
  const base=parseRoleCode,START='【角色自定义设定】',END='【自定义设定结束】';
  const aliases={name:['name','姓名','名字','角色名','角色名称'],personality:['personality','description','persona','人设','性格','角色设定'],age:['age','年龄'],gender:['gender','sex','性别'],avatar:['avatar','头像'],tag:['tag','标签'],greeting:['greeting','first_mes','开场白','问候语'],voice:['voice','说话风格','语气'],interests:['interests','hobbies','兴趣','爱好'],relationship:['relationship','relation','关系','相处方式'],background:['background','scenario','背景','背景故事'],quickReplies:['quickReplies','quick_replies','快捷回复']};
  const pick=(obj,keys)=>{for(const k of keys)if(obj&&Object.hasOwn(obj,k)&&obj[k]!=null&&String(obj[k]).trim()!=='')return obj[k];};
  function canonical(raw){const data=raw?.data&&typeof raw.data==='object'&&!Array.isArray(raw.data)?raw.data:raw;if(!data||typeof data!=='object'||Array.isArray(data))return data;const out={...data};for(const[k,keys]of Object.entries(aliases))if(out[k]===undefined){const v=pick(data,keys);if(v!==undefined)out[k]=v;}return out;}
  function recipeFrom(item){const visual=item?.visualRecipe&&typeof item.visualRecipe==='object'?item.visualRecipe:{gender:item?.gender,age:item?.age,heightCm:item?.heightCm??item?.height,weightJin:item?.weightJin??item?.weight,body:item?.body,face:item?.face,faceDetails:item?.faceDetails,skin:item?.skin,hair:item?.hair,hairColor:item?.hairColor,outfit:item?.outfit,outfitColor:item?.outfitColor,accessory:item?.accessory,action:item?.action||'放松呼吸',expression:item?.expression,voiceStyle:item?.voiceStyle,relationship:item?.relationship};return window.RoleVisualRecipe?.sanitize?.(visual)||visual;}
  function block(r){return [START,`身份：${r.gender==='female'?'女':r.gender==='male'?'男':'不指定'}，${r.age||24}岁。`,`外形：身高${r.heightCm||165}cm，体重${r.weightJin||110}斤，${r.body||'匀称'}，${r.face||'自然耐看'}，${r.skin||'自然肤色'}，${r.hair||'自然长发'}，${r.outfit||'日常休闲'}。`,`发色：${r.hairColor||'自然黑'}。`,`服装颜色：${r.outfitColor||'经典黑'}。`,`饰品：${r.accessory||'无'}。`,`动作：${r.action||'放松呼吸'}。`,`表情：${r.expression||'自然'}。`,`语音：${r.voiceStyle||'自然'}。`,`初始关系：${r.relationship||'慢慢熟悉'}。`,END].join('\n');}
  function upgrade(raw){const item=canonical(raw);if(!item||typeof item!=='object'||Array.isArray(item))return item;const r=recipeFrom(item),plain=String(item.personality||item.description||'自然、有主见，像真人一样交流。').replace(/\n*【角色自定义设定】[\s\S]*?【自定义设定结束】\n*/g,'').trim();return {...item,roleKind:'3d',visualRecipe:r,personality:`${plain}\n\n${block(r)}`.slice(0,12000),action:r.action||'放松呼吸',voiceStyle:r.voiceStyle||'自然'};}
  function container(value){if(Array.isArray(value))return value.map(upgrade);if(value?.roles&&Array.isArray(value.roles))return {...value,roles:value.roles.map(upgrade)};if(value?.characters&&Array.isArray(value.characters))return {...value,characters:value.characters.map(upgrade)};if(value?.character)return {...value,character:upgrade(value.character)};if(value?.role)return {...value,role:upgrade(value.role)};return upgrade(value);}
  parseRoleCode=function(source,targetId=''){
    let value;
    try{value=parseRoleData(source);}catch(error){throw error;}
    const upgraded=container(value);
    const result=base(JSON.stringify(upgraded),targetId);
    if(!Array.isArray(result)||result.some(char=>!char||char.roleKind!=='3d'||!char.visualRecipe))throw new Error('角色代码没有生成有效3D角色，请检查3D外形配置。');
    result.forEach(char=>{char.roleKind='3d';char.visualRecipe=window.RoleVisualRecipe?.sanitize?.(char.visualRecipe)||char.visualRecipe;});
    return result;
  };
  parseRoleCode.__threeDOnlyCode=true;
  if(typeof createRoleCodeTemplate==='function')createRoleCodeTemplate=function(){return JSON.stringify({id:'role_'+makeId(),name:'新3D角色',roleKind:'3d',gender:'female',age:24,tag:'3D角色',greeting:'你来了。我们开始吧。',personality:'自然、有主见，像真人一样交流。',visualRecipe:{gender:'female',age:24,heightCm:165,weightJin:110,body:'匀称',face:'自然耐看',skin:'自然肤色',hair:'自然长发',hairColor:'自然黑',outfit:'日常休闲',outfitColor:'经典黑',accessory:'无',action:'放松呼吸',expression:'自然',voiceStyle:'自然',relationship:'慢慢熟悉'}},null,2);};
})();