'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const Chains=require('../games/classic-human/chains.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function keys(d){return d.eliminations.map(x=>x.cell+':'+x.digit).sort();}

function buildCanonicalXY(){
  const s=blankState();
  const a=cell(0,0),b=cell(0,4),c=cell(3,4),target=cell(3,0);
  s.restrictMask(a,maskOf(1,2));
  s.restrictMask(b,maskOf(2,3));
  s.restrictMask(c,maskOf(1,3));
  return {s,a,b,c,target};
}

test('XY-Chain finds a bounded bivalue chain with matching endpoint digit',()=>{
  const {s,a,b,c}=buildCanonicalXY();
  const paths=Chains.xyChainPaths(s,a,1,6);
  const p=paths.find(x=>x.cells.join(',')===[a,b,c].join(','));
  assert.ok(p);
  assert.equal(p.digit,1);
  assert.equal(p.length,3);
});

test('XY-Chain eliminates shared endpoint digit from a cell seeing both endpoints',()=>{
  const {s,a,c,target}=buildCanonicalXY();
  const d=Chains.findXYChain(s,{maxCells:6}).find(x=>x.explanationData.startCell===a&&x.explanationData.endCell===c&&x.explanationData.digit===1);
  assert.ok(d);
  assert.equal(d.techniqueId,'xy-chain');
  assert.ok(keys(d).includes(target+':1'));
  assert.equal(d.complexity.chainCells,3);
});

test('XY-Chain near miss has no target elimination when shared endpoint digit is absent',()=>{
  const {s,target}=buildCanonicalXY();
  s.restrictMask(target,C.FULL_MASK&~C.bitForDigit(1));
  const all=Chains.findXYChain(s,{maxCells:6});
  assert.equal(all.some(d=>keys(d).includes(target+':1')),false);
});

test('XY-Chain requires bivalue links and rejects a trivalue middle cell',()=>{
  const {s,a,b}=buildCanonicalXY();
  // Build a fresh state because restrictMask cannot widen a mask.
  const t=blankState(),c=cell(3,4);
  t.restrictMask(a,maskOf(1,2));
  t.restrictMask(b,maskOf(2,3,4));
  t.restrictMask(c,maskOf(1,3));
  assert.equal(Chains.xyChainPaths(t,a,1,6).some(p=>p.cells.includes(b)),false);
});

test('XY-Chain path search enforces a bounded cell count',()=>{
  const {s,a}=buildCanonicalXY();
  assert.throws(()=>Chains.xyChainPaths(s,a,1,13),/maxCells must be 3\.\.12/);
});

test('XY-Chain output is deterministic',()=>{
  const {s}=buildCanonicalXY();
  const x=Chains.findXYChain(s,{maxCells:6}).map(C.deductionStateKey);
  const y=Chains.findXYChain(s,{maxCells:6}).map(C.deductionStateKey);
  assert.deepEqual(x,y);
});
