(() => {
  'use strict';

  const COMPAT_IDS=Object.freeze([
    'roleName','roleGender','roleAge','roleAvatarPreview','chooseRoleAvatarBtn','roleAvatarUpload','roleAvatarStatus','presetAvatarPicker',
    'roleTag','roleGreeting','rolePersonality','roleVoice','roleInterests','roleRelationship','createRoleStatus','cancelModalBtn','createRoleSubmitBtn'
  ]);

  function removeLegacyCreatorUi() {
    const form=document.getElementById('createRoleForm');
    if(!form)return false;
    const preview=document.getElementById('roleCreator3dPreview');
    const studio=document.getElementById('roleCreatorStudio');
    const builder=document.getElementById('roleBuilder');
    if(!studio)return false;

    let compat=document.getElementById('roleCreatorCompat');
    if(!compat){compat=document.createElement('div');compat.id='roleCreatorCompat';}
    compat.hidden=true;compat.setAttribute('aria-hidden','true');compat.style.setProperty('display','none','important');
    for(const id of COMPAT_IDS){const node=document.getElementById(id);if(node&&node!==compat&&form.contains(node)&&node.parentNode!==compat)compat.appendChild(node);}

    if(builder){builder.hidden=true;builder.setAttribute('aria-hidden','true');builder.style.setProperty('display','none','important');}
    const kept=[preview,studio,builder,compat].filter(Boolean);
    form.replaceChildren(...kept);
    form.classList.add('creator-3d-only');
    const title=document.getElementById('createRoleTitle');if(title)title.textContent='3D 人物大厅';
    return true;
  }

  function patchCreatorCamera() {
    const proto=window.RoleHumanRenderer?.HumanRenderer?.prototype;
    if(!proto?.frameModel||proto.frameModel.__creatorFullBodyFit)return Boolean(proto?.frameModel);
    const base=proto.frameModel;
    const wrapped=function(root,framing='full'){
      const result=base.call(this,root,framing);
      if(this?.container?.id!=='roleCreator3dPreviewCanvas'||!this.camera||!this.modules?.THREE||!root)return result;
      try{
        const THREE=this.modules.THREE,box=new THREE.Box3().setFromObject(root);if(box.isEmpty())return result;
        const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
        const currentDistance=Math.max(.8,Math.abs(this.camera.position.z-center.z)),targetY=center.y-size.y*.03,distance=currentDistance*1.28;
        this.camera.position.set(center.x,targetY,center.z+distance);this.camera.lookAt(center.x,targetY,center.z);
        this.camera.near=Math.max(.01,distance/120);this.camera.far=Math.max(50,distance*12);this.camera.updateProjectionMatrix();
      }catch{}
      return result;
    };
    wrapped.__creatorFullBodyFit=true;proto.frameModel=wrapped;return true;
  }

  function install(){
    removeLegacyCreatorUi();patchCreatorCamera();
    const form=document.getElementById('createRoleForm');
    if(form&&typeof MutationObserver==='function'){
      let queued=false;
      const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;removeLegacyCreatorUi();});});
      observer.observe(form,{childList:true,subtree:false});
    }
    let tries=0;const retry=()=>{removeLegacyCreatorUi();if(patchCreatorCamera())return;if(++tries<80)setTimeout(retry,80);};retry();
  }

  const api=Object.freeze({COMPAT_IDS,removeLegacyCreatorUi,patchCreatorCamera,install});
  if(typeof window!=='undefined')window.RoleCreatorOnlyUI=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})();
