(() => {
  'use strict';
  if(new URLSearchParams(location.search).get('legacy')==='1')return;
  const target=new URL('studio/index.html',location.href);
  location.replace(target.href);
})();
