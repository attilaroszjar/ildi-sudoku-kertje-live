'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const Col=require('../games/classic-human/coloring.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function component(c0,c1){
  const cells=c0.concat(c1).slice().sort((a,b)=>a-b),colors={};
  c0.forEach(x=>{colors[x]=0;});c1.forEach(x=>{colors[x]=1;});
  return {cells,colors,edges:[],valid:true};
}
function keys(d){return d.eliminations.map(x=>x.cell+':'+x.digit).sort();}

test('multi coloring eliminates a component color that conflicts with both colors of another component',()=>{
  const s=blankState();
  const A=component([cell(0,0)],[cell(8,8)]);
  const B=component([cell(0,4)],[cell(1,1)]);
  const d=Col.multiColorDeductionsForPair(s,5,A,B).find(x=>
    x.explanationData.reason.type==='component-color-impossible'&&
    x.explanationData.reason.component==='A'&&
    x.explanationData.reason.color===0
  );
  assert.ok(d);
  assert.deepEqual(keys(d),[cell(0,0)+':5']);
});

test('multi coloring phase relation eliminates a candidate that sees one guaranteed-true color from either phase',()=>{
  const s=blankState();
  const A=component([cell(0,0)],[cell(8,8)]);
  const B=component([cell(0,4)],[cell(8,4)]);
  const target=cell(0,7);
  const d=Col.multiColorDeductionsForPair(s,5,A,B).find(x=>
    x.explanationData.reason.type==='phase-link'&&
    x.explanationData.reason.relation==='opposite'&&
    x.explanationData.reason.colorPair[0]===0&&
    x.explanationData.reason.colorPair[1]===0&&
    x.eliminations.some(e=>e.cell===target&&e.digit===5)
  );
  assert.ok(d);
  assert.ok(keys(d).includes(target+':5'));
});

test('multi coloring pair engine emits no deduction without inter-component phase constraints',()=>{
  const s=blankState();
  const A=component([cell(0,0)],[cell(0,4)]);
  const B=component([cell(6,1)],[cell(6,5)]);
  assert.equal(Col.multiColorDeductionsForPair(s,5,A,B).length,0);
});

test('multi coloring pair output is deterministic',()=>{
  const s=blankState();
  const A=component([cell(0,0)],[cell(8,8)]);
  const B=component([cell(0,4)],[cell(8,4)]);
  const a=Col.multiColorDeductionsForPair(s,5,A,B).map(C.deductionStateKey);
  const b=Col.multiColorDeductionsForPair(s,5,A,B).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});
