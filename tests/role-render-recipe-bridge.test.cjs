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

test('missing body rig does not pretend body geometry was applied', () => {
  const renderer={};
  const ok=bridge.applyStructuredRecipe(renderer,{visualRecipe:{body:'胖'}},{forCharacter:char=>char.visualRecipe});
  assert.equal(ok,false); assert.equal(renderer.visualRecipe.body,'胖');
});
