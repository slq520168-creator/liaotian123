(() => {
  'use strict';

  const VERSION = 1;
  const GENDERS = Object.freeze(['unspecified','male','female']);
  const FACE_DETAILS = Object.freeze({eyeSize:'眼睛大小',eyeSpacing:'眼距',eyeTilt:'眼角',noseBridge:'鼻梁',noseWidth:'鼻翼',lips:'嘴唇',mouthWidth:'嘴宽',chin:'下巴',cheekbones:'颧骨'});
  const BODY_DETAILS = Object.freeze({chestSize:'胸部体积',chestFirmness:'胸部紧实度'});
  const OPTIONS = Object.freeze({
    body:Object.freeze(['偏瘦','匀称','微胖','丰满','胖','健壮']),
    face:Object.freeze(['自然耐看','圆脸','鹅蛋脸','方脸','长脸','成熟脸','甜美脸']),
    skin:Object.freeze(['偏白','自然肤色','小麦肤色','深肤色']),
    hair:Object.freeze(['自然长发','短发','清爽短发','大波浪','卷发','马尾','编发','利落中长发']),
    hairColor:Object.freeze(['自然黑','深棕','栗棕','红棕','金棕','银灰']),
    outfit:Object.freeze(['日常休闲','连帽休闲','居家','成熟优雅','通勤','运动','甜美','性感但自然']),
    outfitColor:Object.freeze(['经典黑','纯白','雾灰','米白','酒红','柔粉','藏蓝','墨绿','焦糖']),
    accessory:Object.freeze(['无','细框眼镜','小耳环','细项链','眼镜+耳环']),
    action:Object.freeze(['自然站立','放松呼吸','专注交流','轻微转身']),
    expression:Object.freeze(['自然','微笑','温柔','认真','俏皮']),
    voiceStyle:Object.freeze(['自然','温柔','成熟','活泼','低沉','清爽']),
    relationship:Object.freeze(['慢慢熟悉','普通朋友','知心朋友','暧昧对象','恋人','伴侣','姐姐/哥哥型陪伴'])
  });
  const EMPTY_FACE_DETAILS=Object.freeze(Object.fromEntries(Object.keys(FACE_DETAILS).map(key=>[key,0])));
  const EMPTY_BODY_DETAILS=Object.freeze(Object.fromEntries(Object.keys(BODY_DETAILS).map(key=>[key,0])));
  const DEFAULTS=Object.freeze({version:VERSION,gender:'unspecified',age:24,heightCm:165,weightJin:110,body:'匀称',bodyDetails:EMPTY_BODY_DETAILS,face:'自然耐看',faceDetails:EMPTY_FACE_DETAILS,skin:'自然肤色',hair:'自然长发',hairColor:'自然黑',outfit:'日常休闲',outfitColor:'经典黑',accessory:'无',action:'自然站立',expression:'自然',voiceStyle:'自然',relationship:'慢慢熟悉',personality:Object.freeze(['自然','有主见']),chat:Object.freeze(['短句自然','少反问','记得细节']),extra:''});

  function clampInt(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;}
  function clampSigned(value){return clampInt(value,-100,100,0);}
  function pick(value,list,fallback){return list.includes(value)?value:fallback;}
  function cleanList(value,max=12){return [...new Set((Array.isArray(value)?value:[]).filter(item=>typeof item==='string').map(item=>item.trim()).filter(Boolean).slice(0,max))].map(item=>item.slice(0,32));}
  function sanitizeDetailMap(value,labels){const source=value&&typeof value==='object'?value:{};return Object.freeze(Object.fromEntries(Object.keys(labels).map(key=>[key,clampSigned(source[key])])));}
  function sanitizeFaceDetails(value={}){return sanitizeDetailMap(value,FACE_DETAILS);}
  function sanitizeBodyDetails(value={}){return sanitizeDetailMap(value,BODY_DETAILS);}
  function sanitize(input={}){
    const personalities=cleanList(input.personality),chats=cleanList(input.chat);
    return Object.freeze({version:VERSION,gender:pick(input.gender,GENDERS,DEFAULTS.gender),age:clampInt(input.age,18,100,DEFAULTS.age),heightCm:clampInt(input.heightCm??input.height,130,220,DEFAULTS.heightCm),weightJin:clampInt(input.weightJin??input.weight,60,500,DEFAULTS.weightJin),body:pick(input.body,OPTIONS.body,DEFAULTS.body),bodyDetails:sanitizeBodyDetails(input.bodyDetails),face:pick(input.face,OPTIONS.face,DEFAULTS.face),faceDetails:sanitizeFaceDetails(input.faceDetails),skin:pick(input.skin,OPTIONS.skin,DEFAULTS.skin),hair:pick(input.hair,OPTIONS.hair,DEFAULTS.hair),hairColor:pick(input.hairColor,OPTIONS.hairColor,DEFAULTS.hairColor),outfit:pick(input.outfit,OPTIONS.outfit,DEFAULTS.outfit),outfitColor:pick(input.outfitColor,OPTIONS.outfitColor,DEFAULTS.outfitColor),accessory:pick(input.accessory,OPTIONS.accessory,DEFAULTS.accessory),action:pick(input.action,OPTIONS.action,DEFAULTS.action),expression:pick(input.expression,OPTIONS.expression,DEFAULTS.expression),voiceStyle:pick(input.voiceStyle??input.voice,OPTIONS.voiceStyle,DEFAULTS.voiceStyle),relationship:pick(input.relationship,OPTIONS.relationship,DEFAULTS.relationship),personality:Object.freeze(personalities.length?personalities:[...DEFAULTS.personality]),chat:Object.freeze(chats.length?chats:[...DEFAULTS.chat]),extra:typeof input.extra==='string'?input.extra.trim().slice(0,400):''});
  }
  function lineValue(lines,prefix){return(lines.find(line=>line.startsWith(prefix))||'').replace(prefix,'').replace(/。$/,'').trim();}
  function parseIdentity(lines){const line=lineValue(lines,'身份：');const gender=/(?:^|[，,])\s*男(?:性)?(?:[，,]|$)/.test(line)?'male':/(?:^|[，,])\s*女(?:性)?(?:[，,]|$)/.test(line)?'female':'unspecified';const age=Number(line.match(/(\d{1,3})\s*岁/)?.[1])||undefined;return{gender,age};}
  function parseDetailLine(lines,prefix,labels){const line=lineValue(lines,prefix),out={};for(const[key,label]of Object.entries(labels)){const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=line.match(new RegExp(`${escaped}([+-]?\\d{1,3})`));if(match)out[key]=clampSigned(match[1]);}return out;}
  function parseFaceDetails(lines){return parseDetailLine(lines,'脸部细节：',FACE_DETAILS);}
  function parseBodyDetails(lines){return parseDetailLine(lines,'身体细节：',BODY_DETAILS);}
  function fromPersonality(text){const value=String(text||''),match=value.match(/【角色自定义设定】\n([\s\S]*?)\n【自定义设定结束】/);if(!match)return null;const lines=match[1].split(/\r?\n/),physical=lines.find(line=>line.startsWith('外形：'))||'',identity=parseIdentity(lines),find=list=>list.find(item=>physical.includes(item));return sanitize({...identity,heightCm:physical.match(/身高(\d+)cm/)?.[1],weightJin:physical.match(/体重(\d+)斤/)?.[1],body:find(OPTIONS.body),bodyDetails:parseBodyDetails(lines),face:find(OPTIONS.face),faceDetails:parseFaceDetails(lines),skin:find(OPTIONS.skin),hair:find(OPTIONS.hair),hairColor:lineValue(lines,'发色：'),outfit:find(OPTIONS.outfit),outfitColor:lineValue(lines,'服装颜色：'),accessory:lineValue(lines,'饰品：'),action:lineValue(lines,'动作：'),expression:lineValue(lines,'表情：'),voiceStyle:lineValue(lines,'语音：'),relationship:lineValue(lines,'初始关系：'),personality:lineValue(lines,'性格：').split('、').filter(Boolean),chat:lineValue(lines,'聊天方式：').split('、').filter(Boolean),extra:lineValue(lines,'用户特别偏好：')});}
  function withCharacterIdentity(char,recipe){return sanitize({...(recipe||{}),gender:GENDERS.includes(char?.gender)?char.gender:recipe?.gender,age:Number.isFinite(Number(char?.age))?Number(char.age):recipe?.age});}
  function forCharacter(char){if(!char||typeof char!=='object')return sanitize();if(char.visualRecipe&&typeof char.visualRecipe==='object')return withCharacterIdentity(char,char.visualRecipe);return withCharacterIdentity(char,fromPersonality(char.personality)||{});}
  function installNormalizer(){if(typeof window==='undefined'||typeof normalizeCustomCharacter!=='function'||normalizeCustomCharacter.__visualRecipe)return false;const base=normalizeCustomCharacter;const wrapped=function(value){const char=base.call(this,value);if(!char)return char;const supplied=value?.visualRecipe&&typeof value.visualRecipe==='object'?value.visualRecipe:null;const parsed=supplied?sanitize(supplied):(fromPersonality(char.personality)||sanitize());char.visualRecipe=withCharacterIdentity(char,parsed);return char;};wrapped.__visualRecipe=true;normalizeCustomCharacter=wrapped;return true;}
  function migrateLoadedCharacters(){if(typeof characters==='undefined'||!Array.isArray(characters))return 0;let changed=0;for(const char of characters){if(!char||char.isPreset)continue;const parsed=char.visualRecipe&&typeof char.visualRecipe==='object'?char.visualRecipe:(fromPersonality(char.personality)||{}),next=withCharacterIdentity(char,parsed);if(JSON.stringify(char.visualRecipe||null)===JSON.stringify(next))continue;char.visualRecipe=next;changed++;}if(changed&&typeof saveDataToStorage==='function')saveDataToStorage();return changed;}

  const api=Object.freeze({VERSION,GENDERS,FACE_DETAILS,BODY_DETAILS,OPTIONS,EMPTY_FACE_DETAILS,EMPTY_BODY_DETAILS,DEFAULTS,clampSigned,sanitizeFaceDetails,sanitizeBodyDetails,sanitize,parseIdentity,parseFaceDetails,parseBodyDetails,fromPersonality,withCharacterIdentity,forCharacter,installNormalizer,migrateLoadedCharacters});
  if(typeof window!=='undefined'){window.RoleVisualRecipe=api;installNormalizer();migrateLoadedCharacters();}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
