(() => {
  'use strict';

  const COMPAT_IDS=Object.freeze([
    'roleName','roleGender','roleAge','roleAvatarPreview','chooseRoleAvatarBtn','roleAvatarUpload','roleAvatarStatus','presetAvatarPicker',
    'roleTag','roleGreeting','rolePersonality','roleVoice','roleInterests','roleRelationship','createRoleStatus','cancelModalBtn','createRoleSubmitBtn'
  ]);

  function sameChildren(parent,nodes){
    if(!parent)return false;
    const current=Array.from(parent.childNodes||parent.children||[]);
    return current.length===nodes.length&&current.every((node,index)=>node===nodes[index]);
  }

  function removeLegacyCreatorUi() {
    const form=document.getElementById('createRoleForm');
    if(!form)return false;
    const preview=document.getElementById('roleCreator3dPreview');
    const studio=document.getElementById('roleCreatorStudio');
    const builder=document.getElementById('roleBuilder');
    if(!studio)return false;

    let changed=false;
    let compat=document.getElementById('roleCreatorCompat');
    if(!compat){compat=document.createElement('div');compat.id='roleCreatorCompat';changed=true;}
    if(!compat.hidden){compat.hidden=true;changed=true;}
    if(compat.getAttribute('aria-hidden')!=='true'){compat.setAttribute('aria-hidden','true');changed=true;}
    if(compat.style.getPropertyValue('display')!=='none'||compat.style.getPropertyPriority('display')!=='important'){
      compat.style.setProperty('display','none','important');changed=true;
    }
    for(const id of COMPAT_IDS){
      const node=document.getElementById(id);
      if(node&&node!==compat&&form.contains(node)&&node.parentNode!==compat){compat.appendChild(node);changed=true;}
    }

    if(builder){
      if(!builder.hidden){builder.hidden=true;changed=true;}
      if(builder.getAttribute('aria-hidden')!=='true'){builder.setAttribute('aria-hidden','true');changed=true;}
      if(builder.style.getPropertyValue('display')!=='none'||builder.style.getPropertyPriority('display')!=='important'){
        builder.style.setProperty('display','none','important');changed=true;
      }
    }

    const kept=[preview,document.getElementById('creator3dFeedback'),studio].filter(Boolean);
    if(builder?.parentElement===form)kept.push(builder);
    kept.push(compat);
    if(!sameChildren(form,kept)){form.replaceChildren(...kept);changed=true;}
    if(!form.classList.contains('creator-3d-only')){form.classList.add('creator-3d-only');changed=true;}
    const title=document.getElementById('createRoleTitle');
    const heading=typeof editingCharacterId==='string'&&editingCharacterId?'编辑3D角色':'创建3D角色';
    if(title&&title.textContent!==heading){title.textContent=heading;changed=true;}
    return changed;
  }

  function install(){
    removeLegacyCreatorUi();
    const form=document.getElementById('createRoleForm');
    if(form&&typeof MutationObserver==='function'){
      let queued=false;
      const observer=new MutationObserver(()=>{
        if(queued)return;
        queued=true;
        queueMicrotask(()=>{
          queued=false;
          observer.disconnect();
          removeLegacyCreatorUi();
          observer.observe(form,{childList:true,subtree:false});
        });
      });
      observer.observe(form,{childList:true,subtree:false});
    }
  }

  const api=Object.freeze({COMPAT_IDS,sameChildren,removeLegacyCreatorUi,install});
  if(typeof window!=='undefined')window.RoleCreatorOnlyUI=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})();
