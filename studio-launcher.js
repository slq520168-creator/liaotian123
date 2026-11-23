(() => {
  'use strict';
  // The public homepage is the character discovery carousel. The former
  // automatic redirect hid it on every visit, including the installed PWA.
  // The creation studio remains available at /studio/ and ?studio=1.
  if(new URLSearchParams(location.search).get('studio')!=='1')return;
  location.replace(new URL('studio/index.html',location.href).href);
})();
