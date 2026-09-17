'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const G=require('../games/classic-human/coloring.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function cell(r,c){return C.cellIndex(r,c);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
}
function snapshot(s){return {grid:s.cloneGrid(),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.map(C.deductionStateKey)};}
function component(c0,c1){
  const cells=c0.concat(c1).slice().sort((a,b)=>a-b),colors={};
  c0.forEach(x=>{colors[x]=0;});c1.forEach(x=>{colors[x]=1;});
  return {cells,colors,edges:[],valid:true};
}

test('simple coloring real conjugate graph produces only same-digit eliminations and applies safely',()=>{
  const s=blankState();
  const chain=[cell(0,0),cell(0,4),cell(4,4),cell(4,2)],target=cell(1,2),guards=[cell(2,1),cell(7,2)];
  keepDigitOnlyAt(s,5,chain.concat([target],guards));
  const before=snapshot(s);
  const d=G.findSimpleColoring(s).find(x=>x.explanationData.digit===5&&x.eliminations.some(e=>e.cell===target&&e.digit===5));
  assert.ok(d);
  assert.equal(d.techniqueId,'simple-coloring');
  assert.ok(d.eliminations.length>0);
  assert.ok(d.eliminations.every(e=>e.digit===5));
  assert.deepEqual(snapshot(s),before);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('simple coloring rejects a conjugate chain with neither trap nor wrap',()=>{
  const s=blankState();
  const chain=[cell(0,0),cell(0,4),cell(4,4),cell(4,8)];
  keepDigitOnlyAt(s,3,chain);
  assert.equal(G.findSimpleColoring(s).some(x=>x.explanationData.digit===3),false);
});

test('simple coloring is deterministic and preserved under digit relabeling',()=>{
  function run(digit){
    const s=blankState();
    const chain=[cell(0,0),cell(0,4),cell(4,4),cell(4,2)],target=cell(1,2),guards=[cell(2,1),cell(7,2)];
    keepDigitOnlyAt(s,digit,chain.concat([target],guards));
    return G.findSimpleColoring(s).filter(x=>x.explanationData.digit===digit).map(x=>({cells:x.eliminations.map(e=>e.cell).sort((a,b)=>a-b),digit:x.explanationData.digit,reason:x.explanationData.reason.type}));
  }
  const a=run(5),b=run(5),c=run(8);
  assert.deepEqual(a,b);
  assert.ok(a.length>0&&c.length>0);
  assert.deepEqual(a.map(x=>({cells:x.cells,reason:x.reason})),c.map(x=>({cells:x.cells,reason:x.reason})));
});

test('multi coloring pair engine only eliminates the impossible component color',()=>{
  const s=blankState();
  const A=component([cell(0,0)],[cell(8,8)]),B=component([cell(0,4)],[cell(1,1)]);
  const before=snapshot(s);
  const ds=G.multiColorDeductionsForPair(s,5,A,B);
  const d=ds.find(x=>x.explanationData.reason.type==='component-color-impossible'&&x.explanationData.reason.component==='A'&&x.explanationData.reason.color===0);
  assert.ok(d);
  assert.deepEqual(d.eliminations,[{cell:cell(0,0),digit:5}]);
  assert.deepEqual(snapshot(s),before);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('multi coloring rejects unrelated components and invalid components',()=>{
  const s=blankState();
  const A=component([cell(0,0)],[cell(0,4)]),B=component([cell(6,1)],[cell(6,5)]);
  assert.deepEqual(G.multiColorDeductionsForPair(s,5,A,B),[]);
  assert.deepEqual(G.multiColorDeductionsForPair(s,5,Object.assign({},A,{valid:false}),B),[]);
  assert.deepEqual(G.multiColorDeductionsForPair(s,5,A,Object.assign({},B,{valid:false})),[]);
});

test('multi coloring pair deductions are deterministic and digit-label invariant',()=>{
  function run(digit){
    const s=blankState();
    const A=component([cell(0,0)],[cell(8,8)]),B=component([cell(0,4)],[cell(1,1)]);
    return G.multiColorDeductionsForPair(s,digit,A,B).map(x=>({cells:x.eliminations.map(e=>e.cell).sort((a,b)=>a-b),reason:x.explanationData.reason}));
  }
  assert.deepEqual(run(5),run(5));
  assert.deepEqual(run(5),run(8));
});

test('full solver can isolate simple coloring and respects explicit technique selection',()=>{
  const s=blankState();
  const chain=[cell(0,0),cell(0,4),cell(4,4),cell(4,2)],target=cell(1,2),guards=[cell(2,1),cell(7,2)];
  keepDigitOnlyAt(s,5,chain.concat([target],guards));
  const d=H.findNext(s,{techniques:['simple-coloring']});
  assert.ok(d);
  assert.equal(d.techniqueId,'simple-coloring');
  assert.ok(d.eliminations.some(e=>e.cell===target&&e.digit===5));
});
