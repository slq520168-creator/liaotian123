(() => {
  'use strict';
  // Bridge the step wizard to the existing production 3D preview contract.
  document.addEventListener('click',event=>{
    const choice=event.target?.closest?.('#roleCreatorStudio .cw-card[data-choice]');
    if(!choice)return;
    choice.dataset.key=choice.dataset.choice;
  },true);
  document.addEventListener('input',event=>{
    const slider=event.target;
    if(slider?.matches?.('#roleCreatorStudio input[data-face]'))slider.dataset.faceDetail=slider.dataset.face;
  },true);
})();