'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');

function m(ds){return ds.reduce((x,d)=>x|C.bitForDigit(d),0);}
function state(overrides){
  const s=new S.ClassicHumanState('.'.repeat(81));
  for(let i=0;i<81;i++)s.masks[i]=m([9]);
  for(const [r,c,ds] of overrides)s.masks[C.cellIndex(r,c)]=m(ds);
  return s;
}
const fixtures=[
  {name:'type2',overrides:[[0,0,[1,2]],[0,3,[1,2]],[1,0,[1,2,3]],[1,3,[1,2,3]],[1,6,[3,9]]]},
  {name:'type4',overrides:[[0,0,[1,2]],[0,3,[1,2]],[1,0,[1,2,3]],[1,3,[1,2,4]]]},
  {name:'hidden',overrides:[[0,0,[1,2]],[0,3,[1,2,5]],[1,0,[1,2,6]],[1,3,[1,2,4]]]}
];
for(const f of fixtures){
  test('extended unique rectangle '+f.name+' remains fail-closed without allowUniqueness',()=>{
    const s=state(f.overrides);
    assert.equal(H.findNext(s,{techniques:['unique-rectangle']}),null);
    const d=H.findNext(s,{techniques:['unique-rectangle'],allowUniqueness:true});
    assert.ok(d);assert.equal(d.techniqueId,'unique-rectangle');
  });
}

test('unique-rectangle contract keeps requiresUniqueness metadata',()=>{
  assert.equal(C.TECHNIQUES['unique-rectangle'].requiresUniqueness,true);
  const finder=H.FINDERS.find(x=>x.id==='unique-rectangle');
  assert.ok(finder);assert.equal(finder.requiresUniqueness,true);
});
