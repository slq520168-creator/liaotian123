(() => {
  'use strict';

  const DEFAULT_MAX_CHARS=180;
  const MIN_BREAK_RATIO=.55;
  const BREAK_MARKS=Object.freeze(['。','！','？','!','?','；',';','，',',','、','：',':',' ']);
  const safe=value=>String(value??'').replace(/\s+/g,' ').trim();

  function split(text,maxChars=DEFAULT_MAX_CHARS){
    const source=safe(text);
    if(!source)return [];
    const max=Math.max(48,Math.floor(Number(maxChars)||DEFAULT_MAX_CHARS));
    const chunks=[];
    let rest=source;
    while(rest.length>max){
      const windowText=rest.slice(0,max+1);
      const minBreak=Math.floor(max*MIN_BREAK_RATIO);
      let cut=-1;
      for(const mark of BREAK_MARKS){
        const index=windowText.lastIndexOf(mark);
        if(index>=minBreak)cut=Math.max(cut,index+mark.length);
      }
      if(cut<=0)cut=max;
      const chunk=rest.slice(0,cut).trim();
      if(chunk)chunks.push(chunk);
      rest=rest.slice(cut).trim();
    }
    if(rest)chunks.push(rest);
    return chunks;
  }

  const api=Object.freeze({DEFAULT_MAX_CHARS,split});
  if(typeof window!=='undefined')window.RoleSpeechChunker=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
