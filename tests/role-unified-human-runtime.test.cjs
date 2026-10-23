const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('../role-unified-human-runtime.js');
const bone=name=>({name});
function skeleton(names){return {bones:names.map(bone)};}
function skinAttribute(values){return {array:Uint16Array.from(values),needsUpdate:false};}
function mesh(names,indices=[0,1,2,0]){return {isSkinnedMesh:true,skeleton:skeleton(names),geometry:{attributes:{skinIndex:skinAttribute(indices)}},bindMatrix:{id:'bind'},bind(target,matrix){this.skeleton=target;this.boundMatrix=matrix;},children:[]};}
function root(children=[]){return {children,added:[],add(value){this.added.push(value);this.children.push(value);}};}

test('bone remap accepts same named skeleton in different order',()=>{const result=runtime.buildBoneRemap(skeleton(['Root','pelvis','spine_01','head']),skeleton(['Root','spine_01','pelvis','head']));assert.equal(result.compatible,true);assert.deepEqual([...result.map],[0,2,1,3]);});
test('rebind remaps skin indices before binding',()=>{const source=mesh(['Root','pelvis','spine_01'],[0,1,2,1]),target=skeleton(['Root','spine_01','pelvis']);const result=runtime.rebindMesh(source,target);assert.equal(result.ok,true);assert.deepEqual([...source.geometry.attributes.skinIndex.array],[0,2,1,2]);});
test('incompatible clothing is rejected',()=>{const contract=runtime.moduleContract(root([mesh(['Root','pelvis','spine_01'])]),root([mesh(['Root','pelvis','alien_bone'])]),[]);assert.equal(contract.ok,false);assert.ok(contract.missingBones.includes('alien_bone'));});
test('reset clears stale mouth/tongue/default morphs before identity is applied',()=>{const m={children:[],morphTargetDictionary:{gender_female:0,tongueOut:1,jawOpen:2},morphTargetInfluences:[0,1,.6]};const result=runtime.applyMorphWeights(root([m]),{gender_female:1},{reset:true});assert.equal(result.applied,true);assert.deepEqual(m.morphTargetInfluences,[1,0,0]);});
test('unsupported morphs are ignored after reset',()=>{const m={children:[],morphTargetDictionary:{gender_female:0,height_tall:1,eyeBlinkLeft:2},morphTargetInfluences:[.2,.3,.4]};runtime.applyMorphWeights(root([m]),{gender_female:1,height_tall:.2,unknown:1},{reset:true});assert.deepEqual(m.morphTargetInfluences,[1,.2,0]);});
test('attachModule shares skeleton and resets module defaults',()=>{const names=['Root','pelvis','spine_01','head'],baseMesh=mesh(names),moduleMesh=mesh(names);moduleMesh.morphTargetDictionary={gender_male:0,face_jaw_width_incr:1,tongueOut:2};moduleMesh.morphTargetInfluences=[0,0,1];const base=root([baseMesh]),module=root([moduleMesh]);const result=runtime.attachModule(base,module,{gender_male:1,face_jaw_width_incr:.5},['gender_male','face_jaw_width_incr']);assert.equal(result.ok,true);assert.equal(moduleMesh.skeleton,baseMesh.skeleton);assert.deepEqual(moduleMesh.morphTargetInfluences,[1,.5,0]);});
test('skeleton offset API refuses to fake success without a real Three matrix state',()=>{const baseMesh=mesh(['Root','pelvis']);const result=runtime.applySkeletonOffsets(root([baseMesh]),{morphs:{gender_female:{pelvis:[0,.1,0]}}},{gender_female:1});assert.equal(result.moved,0);assert.ok(result.missingBones.includes('<matrix state>'));});
