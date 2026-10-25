(() => {
  'use strict';
  const BASES=Object.freeze([
    Object.freeze({id:'female_soft',label:'女 · 甜美',gender:'female',age:24,heightCm:164,weightJin:104,body:'匀称',face:'甜美脸',skin:'偏白',hair:'自然长发',hairColor:'深棕',outfit:'甜美',outfitColor:'柔粉',accessory:'小耳环',action:'放松呼吸',expression:'微笑',voiceStyle:'温柔'}),
    Object.freeze({id:'female_mature',label:'女 · 成熟',gender:'female',age:30,heightCm:168,weightJin:118,body:'丰满',face:'成熟脸',skin:'自然肤色',hair:'大波浪',hairColor:'栗棕',outfit:'成熟优雅',outfitColor:'酒红',accessory:'细项链',action:'专注交流',expression:'温柔',voiceStyle:'成熟'}),
    Object.freeze({id:'female_sport',label:'女 · 运动',gender:'female',age:26,heightCm:170,weightJin:122,body:'健壮',face:'鹅蛋脸',skin:'小麦肤色',hair:'马尾',hairColor:'自然黑',outfit:'运动',outfitColor:'纯白',accessory:'无',action:'轻微转身',expression:'自然',voiceStyle:'活泼'}),
    Object.freeze({id:'female_tall',label:'女 · 高挑',gender:'female',age:27,heightCm:176,weightJin:112,body:'偏瘦',face:'长脸',skin:'自然肤色',hair:'利落中长发',hairColor:'红棕',outfit:'通勤',outfitColor:'藏蓝',accessory:'细框眼镜',action:'自然站立',expression:'认真',voiceStyle:'清爽'}),
    Object.freeze({id:'male_clean',label:'男 · 清爽',gender:'male',age:25,heightCm:176,weightJin:132,body:'匀称',face:'自然耐看',skin:'自然肤色',hair:'清爽短发',hairColor:'自然黑',outfit:'日常休闲',outfitColor:'藏蓝',accessory:'无',action:'放松呼吸',expression:'自然',voiceStyle:'清爽'}),
    Object.freeze({id:'male_mature',label:'男 · 成熟',gender:'male',age:32,heightCm:179,weightJin:148,body:'健壮',face:'成熟脸',skin:'小麦肤色',hair:'短发',hairColor:'深棕',outfit:'通勤',outfitColor:'经典黑',accessory:'细框眼镜',action:'专注交流',expression:'认真',voiceStyle:'成熟'}),
    Object.freeze({id:'male_athletic',label:'男 · 健壮',gender:'male',age:28,heightCm:183,weightJin:166,body:'健壮',face:'方脸',skin:'小麦肤色',hair:'短发',hairColor:'自然黑',outfit:'运动',outfitColor:'雾灰',accessory:'无',action:'轻微转身',expression:'自然',voiceStyle:'低沉'}),
    Object.freeze({id:'male_tall',label:'男 · 高挑',gender:'male',age:27,heightCm:187,weightJin:146,body:'偏瘦',face:'长脸',skin:'自然肤色',hair:'清爽短发',hairColor:'栗棕',outfit:'连帽休闲',outfitColor:'墨绿',accessory:'细项链',action:'自然站立',expression:'自然',voiceStyle:'自然'})
  ]);
  const BY_ID=Object.freeze(Object.fromEntries(BASES.map(item=>[item.id,item])));
  const IDS=Object.freeze(BASES.map(item=>item.id));
  const APPEARANCE_KEYS=Object.freeze(['hair','hairColor','outfit','outfitColor','accessory','action','expression','voiceStyle','relationship']);
  function get(id){return BY_ID[id]||BASES[0];}
  function apply(id,overrides={}){const base=get(id);return {...base,...overrides,baseId:base.id};}
  function materialize(id,overrides={}){const base=get(id),out={...base,baseId:base.id};for(const key of APPEARANCE_KEYS)if(overrides&&overrides[key]!=null)out[key]=overrides[key];return out;}
  function geometrySignature(base){const item=typeof base==='string'?get(base):base;return JSON.stringify([item.gender,item.age,item.heightCm,item.weightJin,item.body,item.face,item.skin]);}
  const api=Object.freeze({BASES,BY_ID,IDS,APPEARANCE_KEYS,get,apply,materialize,geometrySignature});
  if(typeof window!=='undefined')window.Role3DBases=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
