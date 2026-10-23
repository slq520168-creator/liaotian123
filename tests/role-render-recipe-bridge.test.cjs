const test = require('node:test');
const assert = require('node:assert/strict');
const bridge = require('../role-render-recipe-bridge.js');

test('stored visual recipe is preferred through recipe API', () => {
  const wanted={heightCm:181,body:'丰满'};
  const api={forCharacter:()=>wanted};
  assert.equal(bridge.recipeForCharacter({visualRecipe:wanted},api),wanted);
});

test('body rig receives structured recipe object', () => {
  let received=null;
  const renderer={bodyRig:{applySpec:value=>{received=value; return true;}}};
  const recipe={heightCm:188,weightJin:180,body:'健壮'};
  const ok=bridge.applyStructuredRecipe(renderer,{visualRecipe:recipe},{forCharacter:char=>char.visualRecipe});
  assert.equal(ok,true); assert.equal(received,recipe); assert.equal(renderer.visualRecipe,recipe);
});

test('appearance rig is created for current root and receives the same recipe', () => {
  const calls=[];
  class Adapter {
    constructor(root,face){this.root=root;this.face=face;}
    applySpec(recipe){calls.push(recipe);return {applied:true,hair:true};}
  }
  const root={id:'root'};
  const face={id:'face'};
  const renderer={root,faceRig:{mesh:face}};
  const recipe={face:'圆脸',skin:'小麦肤色',hair:'短发',outfit:'运动'};
  const ok=bridge.applyStructuredRecipe(renderer,{visualRecipe:recipe},{forCharacter:char=>char.visualRecipe},{AppearanceRigAdapter:Adapter});
  assert.equal(ok,true); assert.equal(renderer.appearanceRig.root,root); assert.equal(renderer.appearanceRig.face,face);
  assert.equal(calls[0],recipe); assert.equal(renderer.appearanceResult.hair,true);
});

test('appearance adapter is replaced when renderer root changes', () => {
  let resets=0;
  const old={root:{id:'old'},reset(){resets++;}};
  class Adapter { constructor(root){this.root=root;} applySpec(){return {applied:false};} }
  const renderer={root:{id:'new'},appearanceRig:old};
  bridge.applyStructuredRecipe(renderer,{visualRecipe:{face:'自然耐看'}},{forCharacter:char=>char.visualRecipe},{AppearanceRigAdapter:Adapter});
  assert.equal(resets,1); assert.equal(renderer.appearanceRig.root.id,'new');
});

test('missing real geometry does not pretend recipe was applied', () => {
  class Adapter { constructor(root){this.root=root;} applySpec(){return {applied:false,face:false,skin:false,hair:false,outfit:false};} }
  const renderer={root:{}};
  const ok=bridge.applyStructuredRecipe(renderer,{visualRecipe:{body:'胖',face:'圆脸'}},{forCharacter:char=>char.visualRecipe},{AppearanceRigAdapter:Adapter});
  assert.equal(ok,false); assert.equal(renderer.visualRecipe.body,'胖'); assert.equal(renderer.appearanceResult.applied,false);
});
