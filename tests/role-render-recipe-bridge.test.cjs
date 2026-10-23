const test = require('node:test');
const assert = require('node:assert/strict');
const bridge = require('../role-render-recipe-bridge.js');

test('stored visual recipe is preferred and gets stable identity key', () => {
  const wanted={heightCm:181,body:'丰满'};
  const api={forCharacter:()=>wanted};
  const out=bridge.recipeForCharacter({id:'custom_alice',visualRecipe:wanted},api);
  assert.equal(out.heightCm,181); assert.equal(out.body,'丰满'); assert.equal(out.identityKey,'custom_alice');
});

test('body rig receives structured recipe object with identity key', () => {
  let received=null;
  const renderer={bodyRig:{applySpec:value=>{received=value; return true;}}};
  const recipe={heightCm:188,weightJin:180,body:'健壮'};
  const ok=bridge.applyStructuredRecipe(renderer,{id:'custom_bob',visualRecipe:recipe},{forCharacter:char=>char.visualRecipe});
  assert.equal(ok,true); assert.equal(received.identityKey,'custom_bob'); assert.equal(renderer.visualRecipe.identityKey,'custom_bob');
});

test('appearance rig receives the same identity-bearing recipe', () => {
  const calls=[];
  class Adapter { constructor(root,face){this.root=root;this.face=face;} applySpec(recipe){calls.push(recipe);return {applied:true,hair:true};} }
  const root={id:'root'}, face={id:'face'};
  const renderer={root,faceRig:{mesh:face}};
  const recipe={face:'圆脸',skin:'小麦肤色',hair:'短发',outfit:'运动'};
  const ok=bridge.applyStructuredRecipe(renderer,{id:'custom_face_a',visualRecipe:recipe},{forCharacter:char=>char.visualRecipe},{AppearanceRigAdapter:Adapter});
  assert.equal(ok,true); assert.equal(renderer.appearanceRig.root,root); assert.equal(renderer.appearanceRig.face,face);
  assert.equal(calls[0].identityKey,'custom_face_a'); assert.equal(renderer.appearanceResult.hair,true);
});

test('real skeleton proportion adapter receives height/body recipe without replacing body morph rig', () => {
  const calls=[];
  class ProportionAdapter { constructor(root){this.root=root;} applySpec(recipe){calls.push(recipe);return {applied:true,plan:{height:recipe.height}};} }
  let bodyCalls=0;
  const renderer={root:{id:'human'},bodyRig:{applySpec(){bodyCalls++;return false;}}};
  const recipe={height:190,weight:180,body:'健壮'};
  const ok=bridge.applyStructuredRecipe(renderer,{id:'custom_c',visualRecipe:recipe},{forCharacter:char=>char.visualRecipe},null,{ProportionRigAdapter:ProportionAdapter});
  assert.equal(ok,true); assert.equal(calls[0].identityKey,'custom_c'); assert.equal(bodyCalls,1); assert.equal(renderer.proportionResult.plan.height,190);
});

test('missing real geometry does not pretend recipe was applied', () => {
  class Adapter { constructor(root){this.root=root;} applySpec(){return {applied:false,face:false,skin:false,hair:false,outfit:false};} }
  const renderer={root:{}};
  const ok=bridge.applyStructuredRecipe(renderer,{id:'custom_d',visualRecipe:{body:'胖',face:'圆脸'}},{forCharacter:char=>char.visualRecipe},{AppearanceRigAdapter:Adapter});
  assert.equal(ok,false); assert.equal(renderer.visualRecipe.body,'胖'); assert.equal(renderer.visualRecipe.identityKey,'custom_d'); assert.equal(renderer.appearanceResult.applied,false);
});
