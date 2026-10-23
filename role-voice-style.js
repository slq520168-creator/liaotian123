(() => {
  'use strict';
  const PROFILES = Object.freeze({
    '自然': Object.freeze({rate:1,pitchDelta:0}),
    '温柔': Object.freeze({rate:.95,pitchDelta:.05}),
    '成熟': Object.freeze({rate:.94,pitchDelta:-.04}),
    '活泼': Object.freeze({rate:1.08,pitchDelta:.08}),
    '低沉': Object.freeze({rate:.92,pitchDelta:-.10}),
    '清爽': Object.freeze({rate:1.03,pitchDelta:.03})
  });
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  function currentCharacter(){
    if(typeof characters==='undefined'||typeof activeCharacterId==='undefined') return null;
    return characters.find(item=>item.id===activeCharacterId)||null;
  }
  function styleFor(char){
    const apiRecipe=typeof window!=='undefined'?window.RoleVisualRecipe?.forCharacter?.(char):null;
    const recipe=apiRecipe||char?.visualRecipe||{};
    return PROFILES[recipe.voiceStyle]?recipe.voiceStyle:'自然';
  }
  function profileFor(char){ return PROFILES[styleFor(char)]||PROFILES['自然']; }
  function apply(utterance,char=currentCharacter()){
    if(!utterance||utterance.__creatorPreview) return utterance;
    const profile=profileFor(char);
    utterance.rate=clamp(profile.rate,.7,1.3);
    utterance.pitch=clamp((Number(utterance.pitch)||1)+profile.pitchDelta,.65,1.35);
    return utterance;
  }
  function install(){
    if(typeof window==='undefined'||!window.speechSynthesis?.speak) return false;
    const synth=window.speechSynthesis;
    if(synth.speak.__creatorVoiceStyle) return true;
    const base=synth.speak.bind(synth);
    const wrapped=function(utterance){ return base(apply(utterance)); };
    wrapped.__creatorVoiceStyle=true;
    try { synth.speak=wrapped; } catch(error) { return false; }
    return synth.speak===wrapped;
  }
  const api=Object.freeze({PROFILES,styleFor,profileFor,apply,install});
  if(typeof window!=='undefined'){
    window.RoleVoiceStyle=api;
    if(!install()) setTimeout(install,120);
  }
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
