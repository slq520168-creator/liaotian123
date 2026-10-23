(() => {
  'use strict';

  const REQUIRED = Object.freeze([
    'Hips','LeftUpLeg','LeftLeg','RightUpLeg','RightLeg','Spine','Spine1','Spine2','LeftShoulder','RightShoulder'
  ]);
  const LEG_BONES = Object.freeze(['LeftUpLeg','LeftLeg','RightUpLeg','RightLeg']);
  const TORSO_BONES = Object.freeze(['Spine','Spine1','Spine2']);
  const SHOULDER_FACTOR = Object.freeze({
    '偏瘦': .97,
    '匀称': 1,
    '微胖': 1.015,
    '丰满': 1.025,
    '胖': 1.03,
    '健壮': 1.075
  });
  // Rest-pose-preserving identity fallback. These are deliberately small scale changes,
  // never Euler rotations. Dedicated identity morphs take precedence when a complete
  // production asset becomes available.
  const FACE_SCALE = Object.freeze({
    '自然耐看': Object.freeze({x:1,y:1,z:1}),
    '圆脸': Object.freeze({x:1.045,y:.985,z:1.025}),
    '鹅蛋脸': Object.freeze({x:.99,y:1.025,z:1}),
    '方脸': Object.freeze({x:1.04,y:.995,z:1.015}),
    '长脸': Object.freeze({x:.97,y:1.045,z:.995}),
    '成熟脸': Object.freeze({x:1.01,y:1.015,z:1}),
    '甜美脸': Object.freeze({x:1.025,y:.995,z:1.015})
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function walk(root, visit) {
    if (!root || typeof visit !== 'function') return;
    const stack = [root];
    const seen = new Set();
    while (stack.length) {
      const node = stack.pop();
      if (!node || seen.has(node)) continue;
      seen.add(node);
      visit(node);
      const children = Array.isArray(node.children) ? node.children : [];
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
  }

  function collectBones(root) {
    const bones = {};
    walk(root, node => {
      const name = String(node?.name || '');
      if (!name || bones[name]) return;
      if (node?.isBone || REQUIRED.includes(name)) bones[name] = node;
    });
    return bones;
  }

  function supportScore(bones = {}) {
    return REQUIRED.filter(name => bones[name]?.scale && bones[name]?.position).length;
  }

  function proportionPlan(recipe = {}) {
    const height = clamp(recipe.heightCm ?? recipe.height ?? 165, 130, 220);
    const ratio = height / 165;
    const delta = ratio - 1;
    const legScale = clamp(1 + delta * 1.08, .76, 1.37);
    const torsoScale = clamp(1 + delta * .82, .82, 1.28);
    const body = String(recipe.body || '匀称');
    const face = String(recipe.face || '自然耐看');
    const shoulderScale = SHOULDER_FACTOR[body] || 1;
    const headScale = FACE_SCALE[face] || FACE_SCALE['自然耐看'];
    return Object.freeze({heightCm: height, ratio, legScale, torsoScale, shoulderScale, headScale});
  }

  function snapshotBone(node) {
    return Object.freeze({
      scale: Object.freeze({x:Number(node?.scale?.x)||1, y:Number(node?.scale?.y)||1, z:Number(node?.scale?.z)||1}),
      position: Object.freeze({x:Number(node?.position?.x)||0, y:Number(node?.position?.y)||0, z:Number(node?.position?.z)||0})
    });
  }

  function restoreBone(node, base) {
    if (!node || !base) return;
    if (node.scale) {
      node.scale.x = base.scale.x;
      node.scale.y = base.scale.y;
      node.scale.z = base.scale.z;
    }
    if (node.position) {
      node.position.x = base.position.x;
      node.position.y = base.position.y;
      node.position.z = base.position.z;
    }
  }

  function refreshSkeleton(root) {
    walk(root, node => {
      node?.updateMatrix?.();
      node?.skeleton?.update?.();
    });
    root?.updateMatrixWorld?.(true);
  }

  class ProportionRigAdapter {
    constructor(root = null) {
      this.root = null;
      this.bones = {};
      this.base = {};
      this.score = 0;
      if (root) this.attach(root);
    }

    attach(root) {
      this.reset();
      this.root = root || null;
      this.bones = collectBones(this.root);
      this.score = supportScore(this.bones);
      this.base = {};
      for (const [name, bone] of Object.entries(this.bones)) {
        if (bone?.scale && bone?.position) this.base[name] = snapshotBone(bone);
      }
      return this.score;
    }

    supported() {
      return this.score === REQUIRED.length;
    }

    reset() {
      for (const [name, base] of Object.entries(this.base || {})) restoreBone(this.bones?.[name], base);
      if (this.root) refreshSkeleton(this.root);
      return this;
    }

    applySpec(recipe = {}) {
      if (!this.supported()) return Object.freeze({applied:false, reason:'missing-bones'});
      this.reset();
      const plan = proportionPlan(recipe);
      for (const name of LEG_BONES) {
        const bone = this.bones[name];
        const base = this.base[name];
        bone.scale.y = base.scale.y * plan.legScale;
      }
      for (const name of TORSO_BONES) {
        const bone = this.bones[name];
        const base = this.base[name];
        bone.scale.y = base.scale.y * plan.torsoScale;
      }
      for (const name of ['LeftShoulder','RightShoulder']) {
        const bone = this.bones[name];
        const base = this.base[name];
        bone.position.x = base.position.x * plan.shoulderScale;
      }
      const head = this.bones.Head;
      const headBase = this.base.Head;
      if (head?.scale && headBase) {
        head.scale.x = headBase.scale.x * plan.headScale.x;
        head.scale.y = headBase.scale.y * plan.headScale.y;
        head.scale.z = headBase.scale.z * plan.headScale.z;
      }
      refreshSkeleton(this.root);
      return Object.freeze({applied:true, plan});
    }
  }

  const api = Object.freeze({
    REQUIRED, LEG_BONES, TORSO_BONES, SHOULDER_FACTOR, FACE_SCALE,
    walk, collectBones, supportScore, proportionPlan, snapshotBone, restoreBone, refreshSkeleton, ProportionRigAdapter
  });
  if (typeof window !== 'undefined') window.RoleProportionRig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
