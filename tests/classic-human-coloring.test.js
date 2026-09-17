'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const G=require('../games/classic-human/coloring.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}
function actionKeys(d){return d.eliminations.map(x=>x.cell+':'+x.digit).sort();}

 test('color graph alternates colors across conjugate links',()=>{
  const s=blankState();
  const nodes=[cell(0,0),cell(0,4),cell(4,4),cell(4,2)];
  keepDigitOnlyAt(s,5,nodes);
  const comps=G.components(G.buildGraph(s,5));
  const comp=comps.find(x=>nodes.every(n=>x.cells.includes(n)));
  assert.ok(comp);
  assert.notEqual(comp.colors[nodes[0]],comp.colors[nodes[1]]);
  assert.notEqual(comp.colors[nodes[1]],comp.colors[nodes[2]]);
  assert.notEqual(comp.colors[nodes[2]],comp.colors[nodes[3]]);
});

test('simple coloring color trap eliminates candidate seeing both colors',()=>{
  const s=blankState();
  const chain=[cell(0,0),cell(0,4),cell(4,4),cell(4,2)];
  const target=cell(1,2);
  const guards=[cell(2,1),cell(7,2)];
  keepDigitOnlyAt(s,5,chain.concat([target],guards));
  const d=G.findSimpleColoring(s).find(x=>
    x.explanationData.digit===5&&
    x.explanationData.reason.type==='sees-both-colors'&&
    x.eliminations.some(e=>e.cell===target&&e.digit===5)
  );
  assert.ok(d);
  assert.ok(actionKeys(d).includes(target+':5'));
});

test('simple coloring color wrap eliminates the contradictory color itself',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(0,1),c=cell(1,1),guard=cell(2,2);
  keepDigitOnlyAt(s,6,[a,b,c,guard]);
  const d=G.findSimpleColoring(s).find(x=>
    x.explanationData.digit===6&&x.explanationData.reason.type==='color-conflict'
  );
  assert.ok(d);
  const badColor=d.explanationData.reason.badColor;
  const badMembers=d.explanationData.colors[badColor===0?'zero':'one'];
  assert.deepEqual(actionKeys(d),badMembers.map(x=>x+':6').sort());
  assert.ok(badMembers.includes(a));
  assert.ok(badMembers.includes(c));
});

test('simple coloring emits no deduction without a trap or wrap',()=>{
  const s=blankState();
  const chain=[cell(0,0),cell(0,4),cell(4,4),cell(4,8)];
  keepDigitOnlyAt(s,3,chain);
  assert.equal(G.findSimpleColoring(s).filter(x=>x.explanationData.digit===3).length,0);
});

test('simple coloring output is deterministic',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(0,1),c=cell(1,1),guard=cell(2,2);
  keepDigitOnlyAt(s,6,[a,b,c,guard]);
  const x=G.findSimpleColoring(s).map(C.deductionStateKey);
  const y=G.findSimpleColoring(s).map(C.deductionStateKey);
  assert.deepEqual(x,y);
  assert.ok(x.length>0);
});
